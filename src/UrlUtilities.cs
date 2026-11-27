using System;
using System.Diagnostics.CodeAnalysis;

namespace Siphonophore.Stolon;

/// <summary>
/// Checks URLs a user typed or a peer sent before a plugin uses them.
/// </summary>
public static class UrlUtilities
{
    /// <summary>
    /// Reads text as an absolute http or https URL with a host and no user name or password.
    /// Use it on a configured address before a request is made to it.
    /// </summary>
    /// <remarks>
    /// The scheme is matched in any case. Whitespace around the text is ignored by the URI parser, and a relative URL, another scheme, and an empty host are refused.
    /// This checks the shape only, so pair it with <see cref="SsrfGuard"/> when the address must not be on a private network.
    /// </remarks>
    /// <param name="value">The text to read.</param>
    /// <param name="uri">The parsed URL when the result is <c>true</c>, otherwise <c>null</c>.</param>
    /// <returns><c>true</c> when the text is an acceptable URL, otherwise <c>false</c>.</returns>
    public static bool TryGetHttpUri(string? value, [NotNullWhen(true)] out Uri? uri)
    {
        uri = null;
        if (string.IsNullOrWhiteSpace(value) || !Uri.TryCreate(value, UriKind.Absolute, out var parsed))
        {
            return false;
        }

        if ((parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps)
            || parsed.UserInfo.Length > 0
            || string.IsNullOrEmpty(parsed.Host))
        {
            return false;
        }

        uri = parsed;
        return true;
    }

    /// <summary>
    /// Checks whether two server addresses name the same server, by scheme, host, port, and path, ignoring case and a trailing slash.
    /// </summary>
    /// <remarks>A default port matches the same port written out, so <c>https://a</c> matches <c>https://a:443/</c>. Text that is not an absolute URL is compared as text, trimmed, with case and a trailing slash ignored.</remarks>
    /// <param name="a">The first address.</param>
    /// <param name="b">The address compared with it.</param>
    /// <returns><c>true</c> when they name the same server, otherwise <c>false</c>.</returns>
    public static bool SameServer(string? a, string? b)
    {
        var left = (a ?? string.Empty).Trim();
        var right = (b ?? string.Empty).Trim();
        if (Uri.TryCreate(left, UriKind.Absolute, out var ua) && Uri.TryCreate(right, UriKind.Absolute, out var ub))
        {
            return string.Equals(ua.Scheme, ub.Scheme, StringComparison.OrdinalIgnoreCase)
                && string.Equals(ua.Host, ub.Host, StringComparison.OrdinalIgnoreCase)
                && ua.Port == ub.Port
                && string.Equals(ua.AbsolutePath.TrimEnd('/'), ub.AbsolutePath.TrimEnd('/'), StringComparison.OrdinalIgnoreCase);
        }

        return string.Equals(left.TrimEnd('/'), right.TrimEnd('/'), StringComparison.OrdinalIgnoreCase);
    }
}
