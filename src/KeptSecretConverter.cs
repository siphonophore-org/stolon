using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Siphonophore.Stolon;

/// <summary>
/// Writes a secret setting as <see cref="SecretProtector.KeptSentinel"/>, or empty when none is set, so no JSON the server sends carries it.
/// Only <see cref="SecretJson.ServerCopyOptions"/> write the stored value, for copies kept on the server.
/// </summary>
/// <remarks>
/// Put <c>[JsonConverter(typeof(KeptSecretConverter))]</c> on a <see cref="string"/> property. A value read in is taken as it is, and <c>null</c> reads as empty,
/// so a save that sends the kept sentinel back can keep the stored secret through <see cref="SecretProtector.ResolveIncoming(string?, string?)"/>.
/// </remarks>
public sealed class KeptSecretConverter : JsonConverter<string>
{
    /// <inheritdoc />
    public override bool HandleNull => true;

    /// <inheritdoc />
    public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => reader.TokenType == JsonTokenType.Null ? string.Empty : reader.GetString();

    /// <inheritdoc />
    public override void Write(Utf8JsonWriter writer, string? value, JsonSerializerOptions options)
    {
        ArgumentNullException.ThrowIfNull(writer);
        ArgumentNullException.ThrowIfNull(options);
        if (SecretJson.IsServerCopy(options))
        {
            writer.WriteStringValue(value ?? string.Empty);
            return;
        }

        writer.WriteStringValue(SecretProtector.HasSecret(value) ? SecretProtector.KeptSentinel : string.Empty);
    }
}
