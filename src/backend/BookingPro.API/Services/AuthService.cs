using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using BookingPro.API.Data;
using BookingPro.API.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using BookingPro.API.Models.Enums;
using BookingPro.API.Models.Common;

namespace BookingPro.API.Services
{
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ITenantService _tenantService;
        private readonly ISubscriptionService _subscriptionService;

        public AuthService(
            ApplicationDbContext context, 
            IConfiguration configuration,
            ITenantService tenantService,
            ISubscriptionService subscriptionService)
        {
            _context = context;
            _configuration = configuration;
            _tenantService = tenantService;
            _subscriptionService = subscriptionService;
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
        {
            try
            {
                var tenantId = Guid.Parse(_tenantService.GetCurrentTenantId());
                var user = await GetUserByEmailAsync(loginDto.Email, tenantId);

                if (user == null)
                {
                    return new AuthResponseDto
                    {
                        Success = false,
                        Message = "Credenciales inválidas"
                    };
                }

                // Verify with BCrypt, fallback to legacy SHA256; migrate on success
                var (valid, legacy) = Services.Security.PasswordHasher.Verify(loginDto.Password, user.PasswordHash);
                if (!valid)
                {
                    return new AuthResponseDto
                    {
                        Success = false,
                        Message = "Credenciales inválidas"
                    };
                }

                // If legacy, rehash with BCrypt and persist
                if (legacy)
                {
                    user.PasswordHash = Services.Security.PasswordHasher.Hash(loginDto.Password);
                    await _context.SaveChangesAsync();
                }

                if (!user.IsActive)
                {
                    return new AuthResponseDto
                    {
                        Success = false,
                        Message = "Usuario inactivo"
                    };
                }

                // Actualizar último login
                user.LastLogin = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                var token = GenerateJwtToken(user);
                var expiresAt = DateTime.UtcNow.AddHours(24);

                return new AuthResponseDto
                {
                    Success = true,
                    Token = token,
                    User = MapToUserDto(user),
                    Message = "Login exitoso",
                    ExpiresAt = expiresAt
                };
            }
            catch (Exception ex)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = $"Error durante el login: {ex.Message}"
                };
            }
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
        {
            try
            {
                var tenantId = Guid.Parse(_tenantService.GetCurrentTenantId());
                
                // Verificar si el usuario ya existe
                var existingUser = await GetUserByEmailAsync(registerDto.Email, tenantId);
                if (existingUser != null)
                {
                    return new AuthResponseDto
                    {
                        Success = false,
                        Message = "El usuario ya existe"
                    };
                }

                // Crear nuevo usuario
                var user = new User
                {
                    TenantId = tenantId,
                    Email = registerDto.Email,
                    PasswordHash = Services.Security.PasswordHasher.Hash(registerDto.Password),
                    FirstName = registerDto.FirstName,
                    LastName = registerDto.LastName,
                    Role = registerDto.Role,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                // If this is a tenant admin registration, create trial subscription
                if (user.Role == UserRole.Admin.ToString().ToLower())
                {
                    try
                    {
                        await _subscriptionService.CreateTrialSubscriptionAsync(tenantId);
                    }
                    catch (Exception ex)
                    {
                        // Log but don't fail registration if trial creation fails
                        Console.WriteLine($"Warning: Failed to create trial subscription for tenant {tenantId}: {ex.Message}");
                    }
                }

                var token = GenerateJwtToken(user);
                var expiresAt = DateTime.UtcNow.AddHours(24);

                return new AuthResponseDto
                {
                    Success = true,
                    Token = token,
                    User = MapToUserDto(user),
                    Message = "Registro exitoso",
                    ExpiresAt = expiresAt
                };
            }
            catch (Exception ex)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = $"Error durante el registro: {ex.Message}"
                };
            }
        }

        public string GenerateJwtToken(User user)
        {
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured"));
            var tokenHandler = new JwtSecurityTokenHandler();

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new(ClaimTypes.Email, user.Email),
                new(ClaimTypes.Role, user.Role),
                new("tenant_id", user.TenantId.ToString()),
                new("first_name", user.FirstName ?? ""),
                new("last_name", user.LastName ?? "")
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(24),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
                Issuer = _configuration["Jwt:Issuer"],
                Audience = _configuration["Jwt:Audience"]
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public Task<bool> ValidateTokenAsync(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured"));

                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ClockSkew = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                return Task.FromResult(true);
            }
            catch
            {
                return Task.FromResult(false);
            }
        }

        public async Task<User?> GetUserByEmailAsync(string email, Guid tenantId)
        {
            return await _context.Users
                .FirstOrDefaultAsync(u => u.Email == email && u.TenantId == tenantId);
        }

        public async Task<ServiceResult<string>> GeneratePasswordResetTokenAsync(string email)
        {
            try
            {
                // Resolve tenant from context
                var tenantId = Guid.Parse(_tenantService.GetCurrentTenantId());
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email && u.TenantId == tenantId);

                // Do not reveal existence; but if not found, still return Ok message (no token)
                if (user == null)
                {
                    return ServiceResult<string>.Ok(string.Empty, "If the email exists, a reset link was sent");
                }

                // Create a short-lived JWT token with purpose claim
                var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured"));
                var tokenHandler = new JwtSecurityTokenHandler();

                var claims = new List<Claim>
                {
                    new("uid", user.Id.ToString()),
                    new("tenant_id", user.TenantId.ToString()),
                    new("prp", "pwd_reset")
                };

                var tokenDescriptor = new SecurityTokenDescriptor
                {
                    Subject = new ClaimsIdentity(claims),
                    Expires = DateTime.UtcNow.AddMinutes(60),
                    SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
                    Issuer = _configuration["Jwt:Issuer"],
                    Audience = _configuration["Jwt:Audience"]
                };

                var token = tokenHandler.CreateToken(tokenDescriptor);
                var resetToken = tokenHandler.WriteToken(token);

                // TODO: send email with link containing token. For now, return token.
                return ServiceResult<string>.Ok(resetToken, "Reset token generated");
            }
            catch (Exception ex)
            {
                return ServiceResult<string>.Fail($"Error generating reset token: {ex.Message}");
            }
        }

        public async Task<ServiceResult<bool>> ResetPasswordAsync(string token, string newPassword)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured"));

                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ClockSkew = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                var jwt = (JwtSecurityToken)validatedToken;
                var purpose = jwt.Claims.FirstOrDefault(c => c.Type == "prp")?.Value;
                if (purpose != "pwd_reset")
                {
                    return ServiceResult<bool>.Fail("Token inválido");
                }

                var userIdStr = jwt.Claims.First(c => c.Type == "uid").Value;
                var tenantIdStr = jwt.Claims.First(c => c.Type == "tenant_id").Value;

                if (!Guid.TryParse(userIdStr, out var userId) || !Guid.TryParse(tenantIdStr, out var tenantId))
                {
                    return ServiceResult<bool>.Fail("Token inválido");
                }

                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.TenantId == tenantId);
                if (user == null)
                {
                    return ServiceResult<bool>.Fail("Usuario no encontrado");
                }

                user.PasswordHash = Services.Security.PasswordHasher.Hash(newPassword);
                await _context.SaveChangesAsync();

                return ServiceResult<bool>.Ok(true, "Password updated");
            }
            catch (SecurityTokenExpiredException)
            {
                return ServiceResult<bool>.Fail("Token expirado");
            }
            catch (Exception ex)
            {
                return ServiceResult<bool>.Fail($"Error resetting password: {ex.Message}");
            }
        }

        // Password hashing now centralized in Services.Security.PasswordHasher

        private UserDto MapToUserDto(User user)
        {
            return new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = user.Role,
                IsActive = user.IsActive,
                LastLogin = user.LastLogin,
                CreatedAt = user.CreatedAt
            };
        }
    }
}
