using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Siphonophore.Stolon;

/// <summary>
/// The JSON options of a server copy, the one JSON that writes a <see cref="KeptSecretConverter"/> setting's stored value, and a whole copy made through them.
/// </summary>
public static class SecretJson
{
    /// <summary>
    /// Gets the JSON options of a server copy. They alone write a secret setting's stored value, where any other JSON writes the kept sentinel.
    /// </summary>
    /// <remarks>They are read only. Never send JSON written with them to a browser. Copy them with <c>new JsonSerializerOptions(SecretJson.ServerCopyOptions)</c> to add settings, which keeps the mark.</remarks>
    public static JsonSerializerOptions ServerCopyOptions { get; } = BuildServerCopyOptions();

    /// <summary>
    /// Copies a value whole through JSON, secrets included, so a caller can hold it outside the configuration lock without sharing a list a save is changing.
    /// </summary>
    /// <typeparam name="T">The type of the value. It must round-trip through JSON.</typeparam>
    /// <param name="value">The value to copy.</param>
    /// <returns>An independent copy, or a new <typeparamref name="T"/> when the JSON reads back as <c>null</c>.</returns>
    public static T Copy<T>(T value)
        where T : class, new()
    {
        ArgumentNullException.ThrowIfNull(value);
        return JsonSerializer.Deserialize<T>(JsonSerializer.Serialize(value, ServerCopyOptions), ServerCopyOptions) ?? new T();
    }

    /// <summary>
    /// Checks whether JSON options are a server copy's, by the mark <see cref="ServerCopyOptions"/> carry.
    /// </summary>
    /// <param name="options">The options a converter was given.</param>
    /// <returns><c>true</c> when they carry the mark, otherwise <c>false</c>.</returns>
    public static bool IsServerCopy(JsonSerializerOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);
        foreach (var converter in options.Converters)
        {
            if (converter is ServerCopyMark)
            {
                return true;
            }
        }

        return false;
    }

    private static JsonSerializerOptions BuildServerCopyOptions()
    {
        var options = new JsonSerializerOptions { Converters = { new ServerCopyMark() } };
        options.MakeReadOnly(populateMissingResolver: true);
        return options;
    }

    // Converts only its own type, which nothing serializes. Options that carry it never share cached metadata with other options, so the mark reaches every converter.
    private sealed class ServerCopyMark : JsonConverter<ServerCopyMark>
    {
        public override ServerCopyMark Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            => throw new NotSupportedException();

        public override void Write(Utf8JsonWriter writer, ServerCopyMark value, JsonSerializerOptions options)
            => throw new NotSupportedException();
    }
}
