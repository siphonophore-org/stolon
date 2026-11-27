using System;
using System.IO;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Siphonophore.Stolon.Tests;

/// <summary>Verifies that <see cref="ProtectedJsonFileStore{T}"/> keeps one value encrypted in an owner only file.</summary>
public sealed class ProtectedJsonFileStoreTests : IDisposable
{
    private readonly string _dir = Path.Join(Path.GetTempPath(), "stolon-protected-" + Guid.NewGuid().ToString("N"));
    private readonly SecretProtector _secrets = new("test.purpose", NullLogger.Instance, new EphemeralDataProtectionProvider());

    public ProtectedJsonFileStoreTests() => Directory.CreateDirectory(_dir);

    private sealed class Secrets
    {
        public string Password { get; set; } = string.Empty;

        public int Count { get; set; }
    }

    public void Dispose()
    {
        if (Directory.Exists(_dir))
        {
            Directory.Delete(_dir, true);
        }
    }

    private string PathFor(string name) => Path.Join(_dir, name);

    /// <summary>
    /// A saved value is encrypted on disk and loads back.
    /// True: the file never holds the secret in plain text, and the value survives a restart.
    /// False: the secret would be readable in the file, or lost.
    /// </summary>
    [Fact]
    public void Save_ThenLoad_EncryptsAndRoundTrips()
    {
        var path = PathFor("secrets.json");

        new ProtectedJsonFileStore<Secrets>(path, _secrets).Save(new Secrets { Password = "hunter2", Count = 3 });
        var loaded = new ProtectedJsonFileStore<Secrets>(path, _secrets).Load();

        var text = File.ReadAllText(path);
        Assert.StartsWith("enc:v1:", text, StringComparison.Ordinal);
        Assert.DoesNotContain("hunter2", text, StringComparison.Ordinal);
        Assert.Equal("hunter2", loaded.Password);
        Assert.Equal(3, loaded.Count);
    }

    /// <summary>
    /// The file is private to its owner.
    /// True: another account on the host cannot read it.
    /// False: the file would be readable by the group or others.
    /// </summary>
    [Fact]
    public void Save_WritesOwnerOnlyFile()
    {
        var path = PathFor("secrets.json");

        new ProtectedJsonFileStore<Secrets>(path, _secrets).Save(new Secrets { Password = "x" });

        if (!OperatingSystem.IsWindows())
        {
            Assert.Equal(UnixFileMode.UserRead | UnixFileMode.UserWrite, File.GetUnixFileMode(path));
        }
    }

    /// <summary>
    /// A file of plain JSON reads.
    /// True: a store takes over a file written before it, and the next save encrypts it.
    /// False: existing secrets would be lost on the switch.
    /// </summary>
    [Fact]
    public void Load_PlainJsonFile_Reads()
    {
        var path = PathFor("plain.json");
        File.WriteAllText(path, "{\"Password\":\"old\",\"Count\":1}");
        var store = new ProtectedJsonFileStore<Secrets>(path, _secrets);

        var loaded = store.Load();
        store.Update(s => s.Count++);

        Assert.Equal("old", loaded.Password);
        Assert.StartsWith("enc:v1:", File.ReadAllText(path), StringComparison.Ordinal);
        Assert.Equal(2, store.Load().Count);
    }

    /// <summary>
    /// A file another key encrypted reads as a fresh value.
    /// True: a lost key ring starts fresh instead of failing every read.
    /// False: the load would throw.
    /// </summary>
    [Fact]
    public void Load_OtherKey_ReturnsFresh()
    {
        var path = PathFor("other.json");
        var other = new SecretProtector("test.purpose", NullLogger.Instance, new EphemeralDataProtectionProvider());
        new ProtectedJsonFileStore<Secrets>(path, other).Save(new Secrets { Password = "x" });

        var loaded = new ProtectedJsonFileStore<Secrets>(path, _secrets).Load();

        Assert.Equal(string.Empty, loaded.Password);
    }

    /// <summary>
    /// Without Data Protection the JSON is written in plain text, still owner only.
    /// True: a host with no provider still keeps the file private and readable.
    /// False: the save would fail, or the file would be open to others.
    /// </summary>
    [Fact]
    public void Save_NoProvider_PlainButOwnerOnly()
    {
        var path = PathFor("noprovider.json");
        var plain = new SecretProtector("test.purpose", NullLogger.Instance);

        new ProtectedJsonFileStore<Secrets>(path, plain).Save(new Secrets { Password = "p" });

        Assert.Contains("\"Password\": \"p\"", File.ReadAllText(path), StringComparison.Ordinal);
        if (!OperatingSystem.IsWindows())
        {
            Assert.Equal(UnixFileMode.UserRead | UnixFileMode.UserWrite, File.GetUnixFileMode(path));
        }
    }

    /// <summary>
    /// UpdateIf saves only when the mutation says so.
    /// True: a check that changes nothing leaves the file alone.
    /// False: every check would rewrite the file.
    /// </summary>
    [Fact]
    public void UpdateIf_False_DoesNotWrite()
    {
        var path = PathFor("updateif.json");
        var store = new ProtectedJsonFileStore<Secrets>(path, _secrets);

        var saved = store.UpdateIf(_ => false);

        Assert.False(saved);
        Assert.False(File.Exists(path));
    }

    /// <summary>
    /// A missing path or protector throws.
    /// True: a caller bug is caught at construction.
    /// False: it would fail later, on the first save.
    /// </summary>
    [Fact]
    public void Constructor_BadArguments_Throw()
    {
        Assert.ThrowsAny<ArgumentException>(() => new ProtectedJsonFileStore<Secrets>(string.Empty, _secrets));
        Assert.Throws<ArgumentNullException>(() => new ProtectedJsonFileStore<Secrets>(PathFor("x.json"), null!));
    }
}
