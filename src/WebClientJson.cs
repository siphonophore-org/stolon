using System.Text.Json;
using Jellyfin.Extensions.Json;

namespace Siphonophore.Stolon;

/// <summary>
/// JSON options that read what the web client posts as Jellyfin reads a plugin configuration, such as a Guid written without dashes.
/// </summary>
public static class WebClientJson
{
    /// <summary>
    /// Gets Jellyfin's default JSON options with property names matched in any case. They are read only.
    /// </summary>
    /// <remarks>Copy them with <c>new JsonSerializerOptions(WebClientJson.Options)</c> to add a converter.</remarks>
    public static JsonSerializerOptions Options { get; } = Build();

    private static JsonSerializerOptions Build()
    {
        var options = new JsonSerializerOptions(JsonDefaults.Options) { PropertyNameCaseInsensitive = true };
        options.MakeReadOnly(populateMissingResolver: true);
        return options;
    }
}
