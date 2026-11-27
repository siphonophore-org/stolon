using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;

namespace Siphonophore.Stolon.Tests;

/// <summary>Verifies that <see cref="KeptSecretConverter"/> never writes a secret except through <see cref="SecretJson.ServerCopyOptions"/>, and that <see cref="SecretJson.Copy{T}"/> copies whole.</summary>
public sealed class KeptSecretConverterTests
{
    private sealed class Settings
    {
        [JsonConverter(typeof(KeptSecretConverter))]
        public string Password { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public List<string> Tags { get; set; } = new();
    }

    /// <summary>
    /// A stored secret is written as the kept sentinel in ordinary JSON.
    /// True: a config page sees that a secret is set, never the secret.
    /// False: the encrypted value or the plain secret would reach the browser.
    /// </summary>
    [Fact]
    public void Write_DefaultOptions_WritesKeptSentinel()
    {
        var json = JsonSerializer.Serialize(new Settings { Password = "enc:v1:abc", Name = "n" });

        Assert.Contains(SecretProtector.KeptSentinel, json, StringComparison.Ordinal);
        Assert.DoesNotContain("enc:v1:abc", json, StringComparison.Ordinal);
    }

    /// <summary>
    /// An empty secret is written as empty, so the page shows no placeholder.
    /// True: a missing secret looks missing.
    /// False: the page would claim a secret is set.
    /// </summary>
    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void Write_NoSecret_WritesEmpty(string? password)
    {
        var json = JsonSerializer.Serialize(new Settings { Password = password! });

        Assert.Contains("\"Password\":\"\"", json, StringComparison.Ordinal);
    }

    /// <summary>
    /// The server copy options write the stored value.
    /// True: a copy kept on the server keeps its secrets.
    /// False: a copy would lose every secret to the sentinel.
    /// </summary>
    [Fact]
    public void Write_ServerCopyOptions_WritesStoredValue()
    {
        var json = JsonSerializer.Serialize(new Settings { Password = "enc:v1:abc" }, SecretJson.ServerCopyOptions);

        Assert.Contains("enc:v1:abc", json, StringComparison.Ordinal);
    }

    /// <summary>
    /// Options copied from the server copy options keep the mark.
    /// True: a caller can add a setting without losing the secrets.
    /// False: the copied options would write the sentinel.
    /// </summary>
    [Fact]
    public void Write_CopiedServerOptions_KeepTheMark()
    {
        var options = new JsonSerializerOptions(SecretJson.ServerCopyOptions) { WriteIndented = true };

        var json = JsonSerializer.Serialize(new Settings { Password = "enc:v1:abc" }, options);

        Assert.True(SecretJson.IsServerCopy(options));
        Assert.Contains("enc:v1:abc", json, StringComparison.Ordinal);
    }

    /// <summary>
    /// A value read in is taken as it is, and null reads as empty.
    /// True: a posted sentinel reaches ResolveIncoming, and a null clears.
    /// False: the sentinel would be dropped or null would throw.
    /// </summary>
    [Theory]
    [InlineData("{\"Password\":\"__JPK_SECRET_KEPT__\"}", SecretProtector.KeptSentinel)]
    [InlineData("{\"Password\":\"new\"}", "new")]
    [InlineData("{\"Password\":null}", "")]
    public void Read_TakesValueAsItIs(string json, string expected)
    {
        var settings = JsonSerializer.Deserialize<Settings>(json)!;

        Assert.Equal(expected, settings.Password);
    }

    /// <summary>
    /// Ordinary options are not a server copy.
    /// True: only the marked options write secrets.
    /// False: every JSON would carry secrets.
    /// </summary>
    [Fact]
    public void IsServerCopy_OrdinaryOptions_False()
    {
        Assert.False(SecretJson.IsServerCopy(new JsonSerializerOptions()));
        Assert.False(SecretJson.IsServerCopy(JsonSerializerOptions.Default));
    }

    /// <summary>
    /// The shared server copy options are read only.
    /// True: no caller can change how every copy is written.
    /// False: one caller's change would reach every other.
    /// </summary>
    [Fact]
    public void ServerCopyOptions_AreReadOnly()
    {
        Assert.True(SecretJson.ServerCopyOptions.IsReadOnly);
        Assert.Throws<InvalidOperationException>(() => SecretJson.ServerCopyOptions.WriteIndented = true);
    }

    /// <summary>
    /// A copy keeps its secrets and shares no list with the original.
    /// True: a caller can hold the copy outside the lock.
    /// False: a change to the copy would reach the stored value, or the secret would be lost.
    /// </summary>
    [Fact]
    public void Copy_KeepsSecretsAndSharesNothing()
    {
        var original = new Settings { Password = "enc:v1:abc", Name = "n", Tags = { "a" } };

        var copy = SecretJson.Copy(original);
        copy.Tags.Add("b");

        Assert.Equal("enc:v1:abc", copy.Password);
        Assert.Equal("n", copy.Name);
        Assert.Single(original.Tags);
        Assert.NotSame(original, copy);
    }

    /// <summary>
    /// A null value throws.
    /// True: a caller bug is caught at the call.
    /// False: a null would turn into a fresh value without notice.
    /// </summary>
    [Fact]
    public void Copy_Null_Throws()
    {
        Assert.Throws<ArgumentNullException>(() => SecretJson.Copy<Settings>(null!));
    }
}
