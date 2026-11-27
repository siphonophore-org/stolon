using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.Logging;

namespace Siphonophore.Stolon;

/// <summary>
/// A ready made <see cref="INotifyHeldStore"/> that keeps held messages in a JSON file, with a cap per user and an age past which a message is dropped.
/// </summary>
public sealed class JsonNotifyHeldStore : INotifyHeldStore
{
    /// <summary>The most messages kept for one user by default, so someone who never signs in does not grow the file without end.</summary>
    public const int DefaultMaxPerUser = 50;

    private readonly JsonFileStore<List<NotifyHeldMessage>> _file;
    private readonly int _maxPerUser;
    private readonly TimeSpan _maxAge;
    private readonly TimeProvider _time;
    private readonly Func<NotifyHeldMessage, bool>? _isStillDue;

    /// <summary>
    /// Initializes a new instance of the <see cref="JsonNotifyHeldStore"/> class.
    /// </summary>
    /// <param name="path">The absolute path of the file the messages are kept in.</param>
    /// <param name="maxPerUser">The most messages kept for one user, where the oldest go first. <see cref="DefaultMaxPerUser"/> by default.</param>
    /// <param name="maxAge">How long a message is kept for a user who does not come online. <see cref="DefaultMaxAge"/> when <c>null</c>.</param>
    /// <param name="logger">An optional logger for an unreadable file.</param>
    /// <param name="time">The clock a message's age is read against, or <c>null</c> for the system clock.</param>
    /// <param name="isStillDue">Decides whether a held message is still worth showing, or <c>null</c> to show every one.</param>
    public JsonNotifyHeldStore(
        string path,
        int maxPerUser = DefaultMaxPerUser,
        TimeSpan? maxAge = null,
        ILogger? logger = null,
        TimeProvider? time = null,
        Func<NotifyHeldMessage, bool>? isStillDue = null)
    {
        ArgumentException.ThrowIfNullOrEmpty(path);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(maxPerUser);
        var age = maxAge ?? DefaultMaxAge;
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(age, TimeSpan.Zero, nameof(maxAge));
        _file = new JsonFileStore<List<NotifyHeldMessage>>(path, logger);
        _maxPerUser = maxPerUser;
        _maxAge = age;
        _time = time ?? TimeProvider.System;
        _isStillDue = isStillDue;
    }

    /// <summary>Gets how long a message is kept by default, 30 days.</summary>
    public static TimeSpan DefaultMaxAge { get; } = TimeSpan.FromDays(30);

    /// <inheritdoc />
    public void Hold(NotifyHeldMessage message)
    {
        ArgumentNullException.ThrowIfNull(message);
        var cutoff = Cutoff();
        _file.Update(list =>
        {
            list.RemoveAll(m => m.CreatedUtc < cutoff || m.Id == message.Id);
            list.Add(message);
            var mine = list.Where(m => m.UserId == message.UserId).OrderBy(m => m.CreatedUtc).ToList();
            foreach (var old in mine.Take(Math.Max(0, mine.Count - _maxPerUser)))
            {
                list.Remove(old);
            }
        });
    }

    /// <inheritdoc />
    public IReadOnlyList<NotifyHeldMessage> Take(Guid userId)
    {
        var cutoff = Cutoff();
        var taken = new List<NotifyHeldMessage>();
        _file.UpdateIf(list =>
        {
            taken = list.Where(m => m.UserId == userId).OrderBy(m => m.CreatedUtc).ToList();
            return list.RemoveAll(m => m.UserId == userId || m.CreatedUtc < cutoff) > 0;
        });
        return taken.Where(m => m.CreatedUtc >= cutoff).ToList();
    }

    /// <inheritdoc />
    public bool IsStillDue(NotifyHeldMessage message) => _isStillDue?.Invoke(message) ?? true;

    /// <summary>
    /// Counts the messages held for each user.
    /// </summary>
    /// <returns>The count by user.</returns>
    public IReadOnlyDictionary<Guid, int> Counts() => _file.Load().GroupBy(m => m.UserId).ToDictionary(g => g.Key, g => g.Count());

    /// <summary>
    /// Drops every held message.
    /// </summary>
    /// <returns>How many were dropped.</returns>
    public int Clear() => RemoveWhere(_ => true);

    /// <summary>
    /// Drops the messages held about one subject, such as a request that was removed.
    /// </summary>
    /// <param name="subject">The subject the messages were held with. A blank subject drops nothing.</param>
    /// <returns>How many were dropped.</returns>
    public int RemoveSubject(string subject)
        => string.IsNullOrWhiteSpace(subject) ? 0 : RemoveWhere(m => string.Equals(m.Subject, subject, StringComparison.Ordinal));

    /// <summary>
    /// Drops the messages held for a user, such as one who was deleted.
    /// </summary>
    /// <param name="userId">The Jellyfin user.</param>
    /// <returns>How many were dropped.</returns>
    public int RemoveUser(Guid userId) => RemoveWhere(m => m.UserId == userId);

    private DateTime Cutoff() => _time.GetUtcNow().UtcDateTime - _maxAge;

    private int RemoveWhere(Predicate<NotifyHeldMessage> match)
    {
        var removed = 0;
        _file.UpdateIf(list =>
        {
            removed = list.RemoveAll(match);
            return removed > 0;
        });
        return removed;
    }
}
