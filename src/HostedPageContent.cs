using System;
using System.IO;
using System.Reflection;

namespace Siphonophore.Stolon;

/// <summary>
/// What a <see cref="HostedPage"/> serves inside its frame, an HTML fragment read once on first use.
/// </summary>
public sealed class HostedPageContent
{
    private readonly Lazy<string> _html;

    private HostedPageContent(Func<string> read)
    {
        _html = new Lazy<string>(read);
    }

    /// <summary>Gets content with nothing in it, for a page whose gate holds a screen.</summary>
    internal static HostedPageContent Empty { get; } = new(() => string.Empty);

    /// <summary>Gets the fragment, read on first use.</summary>
    internal string Html => _html.Value;

    /// <summary>
    /// Content from a Stolon template, or any embedded resource whose name ends in <c>.Templates.&lt;name&gt;.html</c>.
    /// </summary>
    /// <param name="name">The template name, as <see cref="TemplateLoader.Load"/> takes it.</param>
    /// <returns>The content.</returns>
    public static HostedPageContent Template(string name)
    {
        ArgumentException.ThrowIfNullOrEmpty(name);
        return new HostedPageContent(() => TemplateLoader.Load(name));
    }

    /// <summary>
    /// Content from an HTML fragment the plugin embeds in its assembly.
    /// </summary>
    /// <param name="assembly">The assembly that embeds the fragment, usually the plugin's.</param>
    /// <param name="resourceName">The resource's full name, or its end after a dot, such as <c>Web.invite.html</c>.</param>
    /// <returns>The content.</returns>
    public static HostedPageContent Resource(Assembly assembly, string resourceName)
    {
        ArgumentNullException.ThrowIfNull(assembly);
        ArgumentException.ThrowIfNullOrEmpty(resourceName);
        return new HostedPageContent(() => ReadResource(assembly, resourceName));
    }

    private static string ReadResource(Assembly assembly, string resourceName)
    {
        var names = assembly.GetManifestResourceNames();
        var name = Array.Find(names, n => string.Equals(n, resourceName, StringComparison.Ordinal))
            ?? Array.Find(names, n => n.EndsWith("." + resourceName, StringComparison.Ordinal))
            ?? throw new InvalidOperationException("Embedded page content not found: " + resourceName);
        using var stream = assembly.GetManifestResourceStream(name)
            ?? throw new InvalidOperationException("Embedded page content stream was null: " + resourceName);
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
