using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace Siphonophore.Stolon;

/// <summary>
/// Finds the web client files a hosted page links, its favicon and its Material Icons face, and for the web client shell its
/// stylesheets, fonts, and logo. Their names are content hashed.
/// </summary>
/// <remarks>
/// Each is read from the web client's <c>index.html</c> and its stylesheets. The answer is kept until <c>index.html</c> changes.
/// </remarks>
internal static partial class WebClientAssets
{
    // The route stylesheets of the screens the shell's markup copies: search, an item's details, and an item list.
    private static readonly string[] RouteStyles = ["search", "itemDetails", "list"];

    // What marks each numbered stylesheet the shell needs: the site rules with the root and phone font sizes, the app layout's
    // details banner, and the text area. Each loads with screens the shell does not stand in for.
    private static readonly string[][] ChunkMarkers =
    [
        ["html{font-size:", ".layout-mobile{font-size:"],
        [".itemBackdrop:before{"],
        [".emby-textarea{"]
    ];

    private static readonly object Gate = new();
    private static Found? _found;
    private static WebClientShellAssets? _shell;

    /// <summary>
    /// Reads the favicon address and the icon face of the web client in a folder.
    /// </summary>
    /// <param name="webPath">The web client's folder.</param>
    /// <returns>The favicon address relative to the web folder, or <c>null</c>, and the icon face CSS with addresses under <c>web/</c>, or empty.</returns>
    internal static (string? FaviconHref, string IconFace) For(string? webPath)
    {
        try
        {
            if (string.IsNullOrEmpty(webPath) || !Directory.Exists(webPath))
            {
                return (null, string.Empty);
            }

            var root = Path.GetFullPath(webPath);
            var index = Path.Join(root, "index.html");
            var stamp = File.Exists(index) ? File.GetLastWriteTimeUtc(index).Ticks : 0L;
            lock (Gate)
            {
                if (_found is { } kept && kept.Root == root && kept.Stamp == stamp)
                {
                    return (kept.FaviconHref, kept.IconFace);
                }
            }

            var html = stamp == 0L ? string.Empty : File.ReadAllText(index);
            var found = new Found(root, stamp, FaviconHref(root, html), IconFace(root, html));
            lock (Gate)
            {
                _found = found;
            }

            return (found.FaviconHref, found.IconFace);
        }
        catch (IOException)
        {
            return (null, string.Empty);
        }
        catch (UnauthorizedAccessException)
        {
            return (null, string.Empty);
        }
    }

    /// <summary>
    /// Reads what the web client shell links from the web client in a folder.
    /// </summary>
    /// <param name="webPath">The web client's folder.</param>
    /// <returns>The shell's assets, or <see cref="WebClientShellAssets.None"/> when there is no web client.</returns>
    internal static WebClientShellAssets Shell(string? webPath)
    {
        try
        {
            if (string.IsNullOrEmpty(webPath) || !Directory.Exists(webPath))
            {
                return WebClientShellAssets.None;
            }

            var root = Path.GetFullPath(webPath);
            var index = Path.Join(root, "index.html");
            if (!File.Exists(index))
            {
                return WebClientShellAssets.None;
            }

            var stamp = File.GetLastWriteTimeUtc(index).Ticks;
            lock (Gate)
            {
                if (_shell is { } kept && kept.Root == root && kept.Stamp == stamp)
                {
                    return kept;
                }
            }

            var html = File.ReadAllText(index);
            var found = new WebClientShellAssets(root, stamp, Stylesheets(root, html), Fonts(root), IndexStyle(html), LogoHref(root), Fingerprint(html));
            lock (Gate)
            {
                _shell = found;
            }

            return found;
        }
        catch (IOException)
        {
            return WebClientShellAssets.None;
        }
        catch (UnauthorizedAccessException)
        {
            return WebClientShellAssets.None;
        }
    }

    /// <summary>
    /// Lists the stylesheets the shell links, relative to the web folder: the ones <c>index.html</c> links, in its order, then the
    /// numbered ones the shell needs, found by what they hold, then the route stylesheets of search, details, and lists.
    /// </summary>
    /// <param name="root">The web client's folder, as a full path.</param>
    /// <param name="indexHtml">The web client's <c>index.html</c>.</param>
    /// <returns>The addresses, each once.</returns>
    internal static IReadOnlyList<string> Stylesheets(string root, string indexHtml)
    {
        var list = new List<string>();
        foreach (var href in StylesheetPattern().Matches(indexHtml).Select(link => link.Groups[1].Value))
        {
            var query = href.IndexOf('?', StringComparison.Ordinal);
            if (Inside(root, query < 0 ? href : href[..query]) is not null)
            {
                list.Add(href);
            }
        }

        var wanted = new string?[ChunkMarkers.Length];
        var chunks = Directory.EnumerateFiles(root, "*.css")
            .Select(Path.GetFileName)
            .OfType<string>()
            .Where(name => ChunkPattern().IsMatch(name))
            .Order(StringComparer.Ordinal);
        foreach (var name in chunks)
        {
            var css = File.ReadAllText(Path.Join(root, name));
            for (var i = 0; i < ChunkMarkers.Length; i++)
            {
                if (wanted[i] is null && Array.TrueForAll(ChunkMarkers[i], marker => css.Contains(marker, StringComparison.Ordinal)))
                {
                    wanted[i] = name;
                }
            }

            if (Array.TrueForAll(wanted, w => w is not null))
            {
                break;
            }
        }

        list.AddRange(wanted.OfType<string>());
        list.AddRange(RouteStyles
            .Select(route => Directory.EnumerateFiles(root, route + ".*.css")
                .Select(Path.GetFileName)
                .OfType<string>()
                .Where(name => RoutePattern().IsMatch(name))
                .Order(StringComparer.Ordinal)
                .FirstOrDefault())
            .OfType<string>());

        return list.Distinct(StringComparer.Ordinal).ToList();
    }

    /// <summary>
    /// Finds the web client's Noto Sans faces and its font stacks, with each relative address moved under <c>web/</c>. Its other faces
    /// are left out, since they make the stylesheet that holds them a megabyte.
    /// </summary>
    /// <param name="root">The web client's folder, as a full path.</param>
    /// <returns>The rules, or empty when no stylesheet holds them.</returns>
    internal static string Fonts(string root)
    {
        foreach (var css in Directory.EnumerateFiles(root, "*.css").Order(StringComparer.Ordinal).Select(File.ReadAllText)
            .Where(css => css.Contains("font-family:Noto Sans;", StringComparison.Ordinal)))
        {
            var rules = NotoFacePattern().Matches(css).Select(m => FontUrlPattern().Replace(m.Value, u => IsRelative(u.Groups[2].Value)
                ? "url(" + u.Groups[1].Value + "web/" + u.Groups[2].Value + u.Groups[1].Value + ")"
                : u.Value));
            var stacks = FontStackPattern().Matches(css).Select(m => m.Value);
            return string.Join('\n', rules.Concat(stacks));
        }

        return string.Empty;
    }

    /// <summary>
    /// Reads the rules the web client's <c>index.html</c> carries in its own style block, such as <c>.hide</c> and the layout helpers.
    /// </summary>
    /// <param name="indexHtml">The web client's <c>index.html</c>.</param>
    /// <returns>The rules, or empty.</returns>
    internal static string IndexStyle(string indexHtml)
    {
        var open = indexHtml.IndexOf("<style>", StringComparison.OrdinalIgnoreCase);
        if (open < 0)
        {
            return string.Empty;
        }

        var start = open + "<style>".Length;
        var close = indexHtml.IndexOf("</style>", start, StringComparison.OrdinalIgnoreCase);
        return close < 0 ? string.Empty : indexHtml[start..close];
    }

    /// <summary>
    /// Picks the mark the web client's app bar shows, its transparent icon, or its touch icon when it has none.
    /// </summary>
    /// <param name="root">The web client's folder, as a full path.</param>
    /// <returns>The address relative to the web folder, or <c>null</c>.</returns>
    internal static string? LogoHref(string root)
    {
        foreach (var pattern in new[] { "icon-transparent*.png", "touchicon.*png" })
        {
            var file = Directory.EnumerateFiles(root, pattern).Select(Path.GetFileName).OfType<string>().Order(StringComparer.Ordinal).FirstOrDefault();
            if (file is not null)
            {
                return file;
            }
        }

        return null;
    }

    /// <summary>
    /// A short fingerprint of a web client build, from its <c>index.html</c>, which names every bundle by its content hash.
    /// </summary>
    /// <param name="indexHtml">The web client's <c>index.html</c>.</param>
    /// <returns>Twelve hex digits.</returns>
    internal static string Fingerprint(string indexHtml) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(indexHtml)), 0, 6).ToLowerInvariant();

    /// <summary>
    /// Picks the favicon the web client's page links, or the first <c>favicon*.ico</c> in its folder.
    /// </summary>
    /// <param name="root">The web client's folder, as a full path.</param>
    /// <param name="indexHtml">The web client's <c>index.html</c>.</param>
    /// <returns>The address relative to the web folder, or <c>null</c> when none exists inside it.</returns>
    internal static string? FaviconHref(string root, string indexHtml)
    {
        var match = IconLinkPattern().Match(indexHtml);
        if (match.Success && Inside(root, match.Groups[1].Value) is { } linked)
        {
            return linked;
        }

        foreach (var file in Directory.EnumerateFiles(root, "favicon*.ico"))
        {
            return Path.GetFileName(file);
        }

        return null;
    }

    /// <summary>
    /// Finds the <c>@font-face</c> rule for Material Icons in the stylesheets the web client's page links, with each relative address moved under <c>web/</c>.
    /// </summary>
    /// <param name="root">The web client's folder, as a full path.</param>
    /// <param name="indexHtml">The web client's <c>index.html</c>.</param>
    /// <returns>The rule, or empty when no linked stylesheet holds one.</returns>
    internal static string IconFace(string root, string indexHtml)
    {
        foreach (var href in StylesheetPattern().Matches(indexHtml).Select(link => link.Groups[1].Value))
        {
            var query = href.IndexOf('?', StringComparison.Ordinal);
            if (Inside(root, query < 0 ? href : href[..query]) is not { } file)
            {
                continue;
            }

            var face = IconFacePattern().Match(File.ReadAllText(Path.Join(root, file)));
            if (!face.Success)
            {
                continue;
            }

            var folder = Path.GetDirectoryName(file)?.Replace(Path.DirectorySeparatorChar, '/') ?? string.Empty;
            var prefix = "web/" + (folder.Length > 0 ? folder + "/" : string.Empty);
            return FontUrlPattern().Replace(face.Value, m => IsRelative(m.Groups[2].Value)
                ? "url(" + m.Groups[1].Value + prefix + m.Groups[2].Value + m.Groups[1].Value + ")"
                : m.Value);
        }

        return string.Empty;
    }

    // An address the web client's page links, as a path relative to its folder, when it names a file inside it.
    private static string? Inside(string root, string href)
    {
        if (!IsRelative(href))
        {
            return null;
        }

        var rootPrefix = root.EndsWith(Path.DirectorySeparatorChar) ? root : root + Path.DirectorySeparatorChar;
        var candidate = Path.GetFullPath(Path.Join(root, href.Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar)));
        return candidate.StartsWith(rootPrefix, StringComparison.Ordinal) && File.Exists(candidate)
            ? candidate[rootPrefix.Length..]
            : null;
    }

    private static bool IsRelative(string href) =>
        href.Length > 0
        && !href.StartsWith('/')
        && !href.StartsWith('#')
        && !href.Contains(':', StringComparison.Ordinal);

    [GeneratedRegex("rel=\"(?:shortcut )?icon\"[^>]*href=\"([^\"]+)\"", RegexOptions.IgnoreCase)]
    private static partial Regex IconLinkPattern();

    [GeneratedRegex("<link[^>]*href=\"([^\"]+\\.css(?:\\?[^\"]*)?)\"", RegexOptions.IgnoreCase)]
    private static partial Regex StylesheetPattern();

    [GeneratedRegex("@font-face\\s*\\{[^}]*font-family:\\s*[\"']?Material Icons[\"']?\\s*;[^}]*\\}", RegexOptions.IgnoreCase)]
    private static partial Regex IconFacePattern();

    [GeneratedRegex("url\\(([\"']?)([^\"')]+)[\"']?\\)")]
    private static partial Regex FontUrlPattern();

    [GeneratedRegex("^[0-9]+\\.[0-9a-f]+\\.css$")]
    private static partial Regex ChunkPattern();

    [GeneratedRegex("^[A-Za-z]+\\.[0-9a-f]+\\.css$")]
    private static partial Regex RoutePattern();

    [GeneratedRegex("@font-face\\{[^}]*font-family:Noto Sans;[^}]*\\}")]
    private static partial Regex NotoFacePattern();

    [GeneratedRegex("html(?:\\[lang\\|=[A-Za-z-]+\\])?\\{font-family:[^}]*\\}")]
    private static partial Regex FontStackPattern();

    private sealed record Found(string Root, long Stamp, string? FaviconHref, string IconFace);
}

/// <summary>
/// What the web client shell links from the installed web client, read by <see cref="WebClientAssets.Shell"/>.
/// </summary>
/// <param name="Root">The web client's folder, as a full path, or empty.</param>
/// <param name="Stamp">When its <c>index.html</c> was last written, in ticks.</param>
/// <param name="Stylesheets">The stylesheets to link, relative to the web folder, in order.</param>
/// <param name="Fonts">The Noto Sans faces and font stacks, with addresses under <c>web/</c>.</param>
/// <param name="IndexStyle">The rules <c>index.html</c> carries in its own style block.</param>
/// <param name="LogoHref">The app bar's mark, relative to the web folder, or <c>null</c>.</param>
/// <param name="Fingerprint">The build's fingerprint, or empty.</param>
internal sealed record WebClientShellAssets(string Root, long Stamp, IReadOnlyList<string> Stylesheets, string Fonts, string IndexStyle, string? LogoHref, string Fingerprint)
{
    /// <summary>Gets the answer for a server with no web client.</summary>
    internal static WebClientShellAssets None { get; } = new(string.Empty, 0L, [], string.Empty, string.Empty, null, string.Empty);
}
