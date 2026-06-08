using Microsoft.AspNetCore.Mvc;

namespace BookingPro.API.Controllers;

// Sirve el blog SEO/GEO en este dominio /blog/* proxeando al feed central de
// sales-hub (que genera y administra el contenido). El canonical apunta a este
// dominio. La ruta /blog -> backend se enruta en el ingress de DO (igual que /api).
[ApiController]
[Route("blog")]
public class BlogController : ControllerBase
{
    private const string Feed = "https://api.sales.efcloud.tech/blog-feed/turnospro";
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(15) };

    [HttpGet]
    public Task<IActionResult> Index(CancellationToken ct) => Proxy("", ct);

    [HttpGet("sitemap.xml")]
    public Task<IActionResult> Sitemap(CancellationToken ct) => Proxy("/sitemap.xml", ct);

    [HttpGet("{slug}")]
    public Task<IActionResult> Article(string slug, CancellationToken ct) => Proxy("/" + slug, ct);

    private static async Task<IActionResult> Proxy(string sub, CancellationToken ct)
    {
        try
        {
            var resp = await Http.GetAsync(Feed + sub, ct);
            var body = await resp.Content.ReadAsStringAsync(ct);
            var ctype = resp.Content.Headers.ContentType?.ToString() ?? "text/html; charset=utf-8";
            return new ContentResult { Content = body, ContentType = ctype, StatusCode = (int)resp.StatusCode };
        }
        catch
        {
            return new ContentResult { Content = "Blog no disponible.", ContentType = "text/plain; charset=utf-8", StatusCode = 502 };
        }
    }
}
