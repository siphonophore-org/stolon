using System;
using System.IO;
using Xunit;

namespace Siphonophore.Stolon.Tests;

/// <summary>Verifies that <see cref="WebClientAssets"/> finds the web client's hashed favicon and icon face, and only inside its folder.</summary>
public sealed class WebClientAssetsTests : IDisposable
{
    private const string Face = "@font-face{font-display:block;font-family:Material Icons;font-style:normal;src:local(\"x\"),url(MaterialIcons-Regular.ab.woff2) format(\"woff2\"),url('https://cdn.example/a.woff') format(\"woff\")}";

    private readonly string _dir = Path.Combine(Path.GetTempPath(), "stolon-webclient-" + Guid.NewGuid().ToString("N"));

    public WebClientAssetsTests() => Directory.CreateDirectory(_dir);

    public void Dispose()
    {
        if (Directory.Exists(_dir))
        {
            Directory.Delete(_dir, true);
        }
    }

    /// <summary>
    /// The favicon the web client's page links is used, as a path inside its folder.
    /// True: a hosted page shows the server's own icon.
    /// False: the tab would show no icon.
    /// </summary>
    [Fact]
    public void FaviconHref_UsesTheLinkedIcon()
    {
        File.WriteAllText(Path.Combine(_dir, "favicon.12.ico"), "x");

        Assert.Equal("favicon.12.ico", WebClientAssets.FaviconHref(_dir, "<link rel=\"shortcut icon\" href=\"favicon.12.ico\">"));
    }

    /// <summary>
    /// A link outside the folder is refused, and the first favicon in the folder is used instead.
    /// True: a crafted page cannot point a hosted page outside the web client.
    /// False: the page would link a file the server does not serve.
    /// </summary>
    [Fact]
    public void FaviconHref_RefusesALinkOutsideTheFolder()
    {
        File.WriteAllText(Path.Combine(_dir, "favicon.ico"), "x");

        Assert.Equal("favicon.ico", WebClientAssets.FaviconHref(_dir, "<link rel=\"icon\" href=\"../secret.ico\">"));
        var empty = Directory.CreateDirectory(Path.Combine(_dir, "empty")).FullName;
        Assert.Null(WebClientAssets.FaviconHref(empty, "<link rel=\"icon\" href=\"https://example.com/x.ico\">"));
    }

    /// <summary>
    /// The icon face is found in a linked stylesheet, with relative addresses moved under web/ and others kept.
    /// True: the hosted page loads the icon font from the web client.
    /// False: icons would show as their names.
    /// </summary>
    [Fact]
    public void IconFace_FindsTheFaceAndMovesItsAddresses()
    {
        File.WriteAllText(Path.Combine(_dir, "1133.ab.css"), ".x{color:red}" + Face + ".material-icons{font-family:Material Icons}");

        var face = WebClientAssets.IconFace(_dir, "<link href=\"main.css?v=1\" rel=\"stylesheet\"><link href=\"1133.ab.css?v=1\" rel=\"stylesheet\">");

        Assert.StartsWith("@font-face{", face, StringComparison.Ordinal);
        Assert.Contains("url(web/MaterialIcons-Regular.ab.woff2)", face, StringComparison.Ordinal);
        Assert.Contains("url('https://cdn.example/a.woff')", face, StringComparison.Ordinal);
        Assert.DoesNotContain(".material-icons", face, StringComparison.Ordinal);
    }

    /// <summary>
    /// A web client with no icon face, or no folder, gives nothing.
    /// True: the page renders without icons rather than failing.
    /// False: a missing web client would throw on every page.
    /// </summary>
    [Fact]
    public void For_MissingFolderGivesNothing()
    {
        var found = WebClientAssets.For(Path.Combine(_dir, "missing"));

        Assert.Null(found.FaviconHref);
        Assert.Equal(string.Empty, found.IconFace);
        Assert.Equal(string.Empty, WebClientAssets.IconFace(_dir, "<link href=\"none.css\" rel=\"stylesheet\">"));
    }

    /// <summary>
    /// The answer is read again once index.html changes.
    /// True: a web client update reaches the page without a restart.
    /// False: the page would link files the update removed.
    /// </summary>
    [Fact]
    public void For_ReadsAgainWhenIndexChanges()
    {
        var index = Path.Combine(_dir, "index.html");
        File.WriteAllText(Path.Combine(_dir, "favicon.a.ico"), "x");
        File.WriteAllText(Path.Combine(_dir, "favicon.b.ico"), "x");
        File.WriteAllText(index, "<link rel=\"icon\" href=\"favicon.a.ico\">");
        File.SetLastWriteTimeUtc(index, new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        Assert.Equal("favicon.a.ico", WebClientAssets.For(_dir).FaviconHref);

        File.WriteAllText(index, "<link rel=\"icon\" href=\"favicon.b.ico\">");
        File.SetLastWriteTimeUtc(index, new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc));

        Assert.Equal("favicon.b.ico", WebClientAssets.For(_dir).FaviconHref);
    }
}
