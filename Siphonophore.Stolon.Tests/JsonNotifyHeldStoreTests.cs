using System;
using System.IO;
using System.Linq;
using Xunit;

namespace Siphonophore.Stolon.Tests;

/// <summary>Verifies that <see cref="JsonNotifyHeldStore"/> holds messages per user, with a cap and an age limit.</summary>
public sealed class JsonNotifyHeldStoreTests : IDisposable
{
    private static readonly Guid Alice = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Bob = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private readonly string _dir = Path.Join(Path.GetTempPath(), "stolon-held-" + Guid.NewGuid().ToString("N"));
    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 1, 10, 12, 0, 0, TimeSpan.Zero));

    public JsonNotifyHeldStoreTests() => Directory.CreateDirectory(_dir);

    public void Dispose()
    {
        if (Directory.Exists(_dir))
        {
            Directory.Delete(_dir, true);
        }
    }

    private JsonNotifyHeldStore Store(int maxPerUser = JsonNotifyHeldStore.DefaultMaxPerUser, TimeSpan? maxAge = null)
        => new(Path.Join(_dir, "held.json"), maxPerUser, maxAge, time: _time);

    private NotifyHeldMessage Message(Guid user, int minutesAgo = 0, string subject = "")
        => new(Guid.NewGuid(), user, "h", "t", _time.GetUtcNow().UtcDateTime.AddMinutes(-minutesAgo), Subject: subject);

    /// <summary>
    /// Take returns a user's messages oldest first and removes them.
    /// True: a device that comes online sees each message once, in order.
    /// False: a second device would see them again, or another user's would show.
    /// </summary>
    [Fact]
    public void Take_ReturnsOldestFirstAndRemoves()
    {
        var store = Store();
        var newer = Message(Alice, 1);
        var older = Message(Alice, 5);
        store.Hold(newer);
        store.Hold(older);
        store.Hold(Message(Bob));

        var taken = store.Take(Alice);

        Assert.Equal(new[] { older.Id, newer.Id }, taken.Select(m => m.Id));
        Assert.Empty(store.Take(Alice));
        Assert.Single(store.Take(Bob));
    }

    /// <summary>
    /// Holding past the cap drops the user's oldest.
    /// True: someone who never signs in cannot grow the file without end.
    /// False: the file would grow forever, or the newest would be dropped.
    /// </summary>
    [Fact]
    public void Hold_PastCap_DropsOldest()
    {
        var store = Store(maxPerUser: 2);
        var oldest = Message(Alice, 3);
        store.Hold(oldest);
        store.Hold(Message(Alice, 2));
        store.Hold(Message(Alice, 1));
        store.Hold(Message(Bob, 9));

        var counts = store.Counts();

        Assert.Equal(2, counts[Alice]);
        Assert.Equal(1, counts[Bob]);
        Assert.DoesNotContain(store.Take(Alice), m => m.Id == oldest.Id);
    }

    /// <summary>
    /// A message older than the age limit is never taken.
    /// True: a stale message does not show weeks later.
    /// False: a message from long ago would show.
    /// </summary>
    [Fact]
    public void Take_PastMaxAge_Dropped()
    {
        var store = Store(maxAge: TimeSpan.FromHours(1));
        store.Hold(Message(Alice, 30));
        _time.Advance(TimeSpan.FromHours(2));

        Assert.Empty(store.Take(Alice));
    }

    /// <summary>
    /// Holding a message with the same id replaces it.
    /// True: a retried hold does not show twice.
    /// False: the message would be held twice.
    /// </summary>
    [Fact]
    public void Hold_SameId_Replaces()
    {
        var store = Store();
        var message = Message(Alice);
        store.Hold(message);
        store.Hold(message with { Text = "second" });

        var taken = store.Take(Alice);

        Assert.Equal("second", Assert.Single(taken).Text);
    }

    /// <summary>
    /// RemoveSubject, RemoveUser, and Clear drop what they name and say how many.
    /// True: a removed request or user leaves nothing behind.
    /// False: a removed subject's messages would still show.
    /// </summary>
    [Fact]
    public void Remove_DropsAndCounts()
    {
        var store = Store();
        store.Hold(Message(Alice, subject: "r1"));
        store.Hold(Message(Bob, subject: "r1"));
        store.Hold(Message(Bob, subject: "r2"));
        store.Hold(Message(Alice, subject: "r3"));

        Assert.Equal(0, store.RemoveSubject(" "));
        Assert.Equal(2, store.RemoveSubject("r1"));
        Assert.Equal(1, store.RemoveUser(Alice));
        Assert.Equal(1, store.Clear());
        Assert.Empty(store.Counts());
    }

    /// <summary>
    /// IsStillDue asks the given delegate, and is true without one.
    /// True: a plugin can drop a reminder whose subject is done.
    /// False: every held message would show, or none would.
    /// </summary>
    [Fact]
    public void IsStillDue_UsesDelegate()
    {
        var message = Message(Alice, subject: "done");
        INotifyHeldStore plain = Store();
        INotifyHeldStore picky = new JsonNotifyHeldStore(Path.Join(_dir, "p.json"), isStillDue: m => m.Subject != "done");

        Assert.True(plain.IsStillDue(message));
        Assert.False(picky.IsStillDue(message));
    }

    /// <summary>
    /// A cap or age of zero or less throws.
    /// True: a store that would drop everything is caught at construction.
    /// False: every message would be dropped on hold.
    /// </summary>
    [Fact]
    public void Constructor_BadLimits_Throw()
    {
        var path = Path.Join(_dir, "x.json");

        Assert.Throws<ArgumentOutOfRangeException>(() => new JsonNotifyHeldStore(path, maxPerUser: 0));
        Assert.Throws<ArgumentOutOfRangeException>(() => new JsonNotifyHeldStore(path, maxAge: TimeSpan.Zero));
    }
}
