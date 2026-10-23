using Amazon.S3;
using Amazon.S3.Model;

namespace BookingPro.API.Services
{
    public interface IObjectStorageService
    {
        /// <summary>Sube un objeto y devuelve su URL pública. key relativo (ej. "tenants/{id}/logo.png").</summary>
        Task<string> UploadAsync(string key, Stream content, string contentType, CancellationToken ct = default);
        /// <summary>Borra un objeto por su URL pública (no-op si no es del bucket).</summary>
        Task DeleteAsync(string url, CancellationToken ct = default);
        /// <summary>True si hay storage remoto configurado (Spaces). Si no, el caller cae a un fallback (base64 / error).</summary>
        bool IsConfigured { get; }
    }

    /// <summary>
    /// DigitalOcean Spaces (S3-compatible). Config por sección "Spaces":
    /// Bucket, ServiceUrl, PublicBaseUrl, AccessKey, SecretKey (van como env vars,
    /// no al repo). Si falta config, IsConfigured=false y el caller usa fallback.
    /// Mismo patrón que los proyectos hermanos (Zoro / ConstructionManager).
    /// </summary>
    public sealed class SpacesStorageService : IObjectStorageService, IDisposable
    {
        private readonly IAmazonS3? _s3;
        private readonly string _bucket = "";
        private readonly string _publicBaseUrl = "";
        private readonly ILogger<SpacesStorageService> _logger;

        public bool IsConfigured => _s3 != null;

        public SpacesStorageService(IConfiguration configuration, ILogger<SpacesStorageService> logger)
        {
            _logger = logger;
            var section = configuration.GetSection("Spaces");
            var bucket = section["Bucket"];
            var serviceUrl = section["ServiceUrl"];
            var accessKey = section["AccessKey"];
            var secretKey = section["SecretKey"];

            if (string.IsNullOrWhiteSpace(bucket) || string.IsNullOrWhiteSpace(serviceUrl) ||
                string.IsNullOrWhiteSpace(accessKey) || string.IsNullOrWhiteSpace(secretKey))
            {
                _logger.LogWarning("Spaces no configurado (faltan Spaces:Bucket/ServiceUrl/AccessKey/SecretKey). Storage remoto deshabilitado.");
                return;
            }

            _bucket = bucket;
            // PublicBaseUrl virtual-hosted: https://{bucket}.{region}.digitaloceanspaces.com
            _publicBaseUrl = (section["PublicBaseUrl"] ?? $"{serviceUrl.TrimEnd('/')}/{_bucket}").TrimEnd('/');

            var config = new AmazonS3Config
            {
                ServiceURL = serviceUrl,
                ForcePathStyle = false,
                SignatureVersion = "4",
            };
            _s3 = new AmazonS3Client(accessKey, secretKey, config);
        }

        public async Task<string> UploadAsync(string key, Stream content, string contentType, CancellationToken ct = default)
        {
            if (_s3 == null) throw new InvalidOperationException("Spaces no está configurado.");
            key = key.TrimStart('/');
            var request = new PutObjectRequest
            {
                BucketName = _bucket,
                Key = key,
                InputStream = content,
                ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
                CannedACL = S3CannedACL.PublicRead,
                DisablePayloadSigning = true,
            };
            await _s3.PutObjectAsync(request, ct);
            var url = $"{_publicBaseUrl}/{key}";
            _logger.LogInformation("Spaces upload: {Key} -> {Url}", key, url);
            return url;
        }

        public async Task DeleteAsync(string url, CancellationToken ct = default)
        {
            if (_s3 == null || string.IsNullOrWhiteSpace(url)) return;
            var basePrefix = _publicBaseUrl + "/";
            if (!url.StartsWith(basePrefix, StringComparison.OrdinalIgnoreCase)) return; // no es nuestro
            var key = url[basePrefix.Length..];
            try
            {
                await _s3.DeleteObjectAsync(new DeleteObjectRequest { BucketName = _bucket, Key = key }, ct);
            }
            catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { /* ya no existe */ }
        }

        public void Dispose() => _s3?.Dispose();
    }
}
