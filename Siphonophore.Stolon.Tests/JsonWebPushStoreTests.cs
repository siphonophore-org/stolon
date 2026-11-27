using System;
using System.IO;
using System.Linq;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Siphonophore.Stolon.Tests;

/// <summary>Verifies that <see cref="JsonWebPushStore"/> makes and keeps the VAPID keys through its delegates and keeps the subscriptions in a file.</summary>
public sealed class JsonWebPushStoreTests : IDisposable
{
    private static readonly Guid Alice = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Bob = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private readonly string _dir = Path.Join(Path.GetTempPath(), "stolon-push-" + Guid.NewGuid().ToString("N"));
    private readonly SecretProtector _secrets = new("test.purpose", NullLogger.Instance, new EphemeralDataProtectionProvider());
    private WebPushStoredKeys _stored = new(string.Empty, string.Empty, "mailto:admin@example.com");
    private int _reads;
    private int _saves;

    public JsonWebPushStoreTests() => Directory.CreateDirectory(_dir);

    public void Dispose()
    {
        if (Directory.Exists(_dir))
        {
            Directory.Delete(_dir, true);
        }
    }

    private JsonWebPushStore Store(SecretProtector? secrets = null)
        => new(Path.Join(_dir, "push.json"), secrets ?? _secrets, () => { _reads++; return _stored; }, k => { _saves++; _stored = k; });

    private static WebPushSubscription Subscription(Guid user, string endpoint, int day = 1)
        => new(user, endpoint, "p", "a", "label", new DateTime(2026, 1, day, 0, 0, 0, DateTimeKind.Utc));

    /// <summary>
    /// The first GetKeys makes a pair and stores it through the delegate, encrypted, with the contact kept.
    /// True: web push works with no setup, and the private key is never stored in plain text.
    /// False: no keys would exist, or the private key would be stored readable.
    /// </summary>
    [Fact]
    public void GetKeys_NoneStored_MakesAndSaves()
    {
        var keys = Store().GetKeys();

        Assert.NotNull(keys);
        Assert.Equal(1, _saves);
        Assert.Equal(keys.PublicKey, _stored.PublicKey);
        Assert.True(SecretProtector.IsProtected(_stored.ProtectedPrivateKey));
        Assert.Equal("mailto:admin@example.com", _stored.Contact);
        Assert.Equal("mailto:admin@example.com", keys.Contact);
    }

    /// <summary>
    /// Stored keys are read once and kept until a stored value changes.
    /// True: a burst of pushes checks the pair once, and a new contact is seen.
    /// False: every push would check the pair again, or a change would be missed.
    /// </summary>
    [Fact]
    public void GetKeys_Cached_UntilStoredChanges()
    {
        var store = Store();
        var first = store.GetKeys();

        var again = store.GetKeys();
        _stored = _stored with { Contact = "mailto:other@example.com" };
        var changed = store.GetKeys();

        Assert.Same(first, again);
        Assert.NotSame(first, changed);
        Assert.Equal("mailto:other@example.com", changed!.Contact);
        Assert.Equal(1, _saves);
    }

    /// <summary>
    /// Without Data Protection no keys are made.
    /// True: a private key is never stored in plain text by GetKeys.
    /// False: a plain private key would be stored.
    /// </summary>
    [Fact]
    public void GetKeys_NoProvider_MakesNone()
    {
        var keys = Store(new SecretProtector("test.purpose", NullLogger.Instance)).GetKeys();

        Assert.Null(keys);
        Assert.Equal(0, _saves);
    }

    /// <summary>
    /// ResetKeys makes a new pair and forgets every subscription.
    /// True: no browser is left signed up with a key that can no longer sign.
    /// False: the old key would stay, or old subscriptions would fail every push.
    /// </summary>
    [Fact]
    public void ResetKeys_NewPairAndNoSubscriptions()
    {
        var store = Store();
        var before = store.GetKeys()!;
        store.Save(Subscription(Alice, "https://push.example/1"));
        store.Save(Subscription(Bob, "https://push.example/2"));

        var removed = store.ResetKeys();

        Assert.Equal(2, removed);
        Assert.Empty(store.All());
        Assert.NotEqual(before.PublicKey, store.GetKeys()!.PublicKey);
    }

    /// <summary>
    /// Save replaces a subscription with the same endpoint, and the lists filter by user and sort by age.
    /// True: a browser that signs up again is kept once.
    /// False: a browser would get each push twice.
    /// </summary>
    [Fact]
    public void Save_SameEndpoint_ReplacesAndLists()
    {
        var store = Store();
        store.Save(Subscription(Alice, "https://push.example/1", day: 3));
        store.Save(Subscription(Bob, "https://push.example/2", day: 1));
        store.Save(Subscription(Alice, "https://push.example/1", day: 5));

        Assert.Single(store.GetSubscriptions(Alice));
        Assert.Equal(new[] { "https://push.example/2", "https://push.example/1" }, store.All().Select(s => s.Endpoint));
    }

    /// <summary>
    /// Remove and RemoveUser forget what they name.
    /// True: a gone endpoint and a deleted user leave nothing behind.
    /// False: pushes would keep going to them.
    /// </summary>
    [Fact]
    public void Remove_ForgetsEndpointAndUser()
    {
        var store = Store();
        store.Save(Subscription(Alice, "https://push.example/1"));
        store.Save(Subscription(Alice, "https://push.example/2"));
        store.Save(Subscription(Bob, "https://push.example/3"));

        store.Remove("https://push.example/3");
        var removed = store.RemoveUser(Alice);

        Assert.Equal(2, removed);
        Assert.Empty(store.All());
    }

    /// <summary>
    /// A missing delegate throws.
    /// True: a caller bug is caught at construction.
    /// False: it would fail on the first push.
    /// </summary>
    [Fact]
    public void Constructor_MissingDelegate_Throws()
    {
        var path = Path.Join(_dir, "x.json");

        Assert.Throws<ArgumentNullException>(() => new JsonWebPushStore(path, _secrets, null!, _ => { }));
        Assert.Throws<ArgumentNullException>(() => new JsonWebPushStore(path, _secrets, () => _stored, null!));
    }
}
