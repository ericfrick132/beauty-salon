using System;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace BookingPro.API.Utilities
{
    /// <summary>
    /// Token para que el cliente final (sin cuenta) consulte el estado de SU turno desde la
    /// reserva pública. Es un HMAC-SHA256 de tenant + id del turno con una clave derivada de
    /// Jwt:Key: no se puede adivinar ni sacar del id, y no requiere guardar nada en la base.
    /// </summary>
    public static class BookingStatusToken
    {
        private const string Purpose = "booking-status-v1";

        public static string Create(IConfiguration configuration, Guid tenantId, Guid bookingId)
        {
            using var hmac = new HMACSHA256(GetKey(configuration));
            var mac = hmac.ComputeHash(Encoding.UTF8.GetBytes($"{Purpose}:{tenantId:N}:{bookingId:N}"));
            return Convert.ToBase64String(mac).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        }

        public static bool IsValid(IConfiguration configuration, Guid tenantId, Guid bookingId, string? token)
        {
            if (string.IsNullOrWhiteSpace(token)) return false;
            var expected = Encoding.ASCII.GetBytes(Create(configuration, tenantId, bookingId));
            var given = Encoding.ASCII.GetBytes(token.Trim());
            return CryptographicOperations.FixedTimeEquals(expected, given);
        }

        private static byte[] GetKey(IConfiguration configuration)
        {
            var jwtKey = configuration["Jwt:Key"];
            if (string.IsNullOrEmpty(jwtKey))
                throw new InvalidOperationException("JWT Key not configured");
            // Clave propia para este uso, derivada de Jwt:Key (no se reutiliza la misma clave tal cual).
            return SHA256.HashData(Encoding.UTF8.GetBytes($"{Purpose}|{jwtKey}"));
        }
    }
}
