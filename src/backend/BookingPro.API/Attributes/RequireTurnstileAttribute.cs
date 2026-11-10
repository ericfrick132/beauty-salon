using System.Collections;
using System.Reflection;
using System.Text.RegularExpressions;
using BookingPro.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace BookingPro.API.Attributes
{
    /// <summary>
    /// Exige un token de Cloudflare Turnstile (header <c>X-Turnstile-Token</c>) en los logins y altas web.
    /// Solo a pedidos de navegador (traen <c>Origin</c> o <c>Sec-Fetch-Site</c>): las apps nativas
    /// (URLSession / OkHttp) y los llamados de servidor a servidor (sales-hub) no mandan esos headers
    /// y siguen como antes. Las cuentas de prueba <c>eric.frick+…@efcloud.tech</c> quedan exentas para
    /// poder verificar en vivo con Playwright. Sin <c>Turnstile:SecretKey</c> no hace nada.
    /// </summary>
    [AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
    public sealed class RequireTurnstileAttribute : Attribute, IAsyncActionFilter
    {
        public const string HeaderName = "X-Turnstile-Token";
        private static readonly Regex TestAccount = new(@"^eric\.frick\+[^@\s]+@efcloud\.tech$",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var http = context.HttpContext;
            var verifier = http.RequestServices.GetRequiredService<ITurnstileVerifier>();
            if (!verifier.Configured || !IsBrowser(http.Request) || HasTestAccount(context.ActionArguments.Values))
            {
                await next();
                return;
            }

            var token = http.Request.Headers[HeaderName].FirstOrDefault();
            var ok = !string.IsNullOrWhiteSpace(token)
                && await verifier.VerifyAsync(token, ClientIp(http.Request), http.RequestAborted);
            if (!ok)
            {
                var log = http.RequestServices.GetRequiredService<ILogger<RequireTurnstileAttribute>>();
                log.LogWarning("Turnstile {Result} en {Path} (token={HasToken}, ua={UA})",
                    verifier.Enforce ? "bloqueó" : "habría bloqueado", http.Request.Path,
                    !string.IsNullOrWhiteSpace(token), http.Request.Headers.UserAgent.ToString());
                if (verifier.Enforce)
                {
                    // Mismo formato de error que el resto de los controllers ({ success, message, errors }).
                    context.Result = new ObjectResult(new
                    {
                        success = false,
                        message = "No pudimos verificar que seas una persona. Recargá la página y probá de nuevo.",
                        errors = new[] { "captcha_required" },
                    })
                    { StatusCode = StatusCodes.Status403Forbidden };
                    return;
                }
            }
            await next();
        }

        private static bool IsBrowser(HttpRequest req) =>
            !string.IsNullOrEmpty(req.Headers["Sec-Fetch-Site"].FirstOrDefault())
            || !string.IsNullOrEmpty(req.Headers.Origin.FirstOrDefault());

        private static string? ClientIp(HttpRequest req)
        {
            foreach (var h in new[] { "CF-Connecting-IP", "DO-Connecting-IP", "X-Forwarded-For" })
            {
                var v = req.Headers[h].FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(v)) return v.Split(',')[0].Trim();
            }
            return req.HttpContext.Connection.RemoteIpAddress?.ToString();
        }

        /// <summary>Busca un email de prueba en los argumentos (string suelto o propiedad string de un DTO).</summary>
        private static bool HasTestAccount(IEnumerable<object?> args)
        {
            foreach (var arg in args)
            {
                if (arg is null) continue;
                if (arg is string s) { if (TestAccount.IsMatch(s.Trim())) return true; continue; }
                if (arg is IEnumerable) continue;
                foreach (var p in arg.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
                {
                    if (p.PropertyType != typeof(string) || p.GetIndexParameters().Length > 0) continue;
                    if (p.GetValue(arg) is string v && TestAccount.IsMatch(v.Trim())) return true;
                }
            }
            return false;
        }
    }
}
