using System.Security.Cryptography;
using System.Text;
using BC = BCrypt.Net.BCrypt;

namespace BookingPro.API.Services.Security
{
    public static class PasswordHasher
    {
        private const string LegacySalt = "BookingProSalt2024";

        public static string Hash(string password, int workFactor = 12)
        {
            return BC.HashPassword(password, workFactor);
        }

        public static (bool Valid, bool IsLegacy) Verify(string password, string hash)
        {
            if (string.IsNullOrEmpty(hash)) return (false, false);

            // Detect BCrypt by prefix
            if (hash.StartsWith("$2"))
            {
                var ok = BC.Verify(password, hash);
                return (ok, false);
            }

            // Legacy SHA256 + fixed salt (Base64)
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password + LegacySalt));
            var legacyBase64 = Convert.ToBase64String(bytes);
            return (legacyBase64 == hash, true);
        }
    }
}

