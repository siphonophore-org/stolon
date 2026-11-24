using System;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;

namespace Siphonophore.Stolon;

/// <summary>
/// Finds the web client files a hosted page links, its favicon and its Material Icons face, whose names are content hashed.
/// </summary>
/// <remarks>
/// Both are read from the web client's <c>index.html</c> and the stylesheets it links. The answer is kept until <c>index.html</c> changes.
/// </remarks>
internal static partial class WebClientAssets
{
    private static readonly object Gate = new();
    private static Found? _found;

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

    private sealed record Found(string Root, long Stamp, string? FaviconHref, string IconFace);
}
