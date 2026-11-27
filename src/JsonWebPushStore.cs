using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.Logging;

namespace Siphonophore.Stolon;

/// <summary>
/// A ready made <see cref="IWebPushStore"/> that keeps the subscriptions in a JSON file and the VAPID keys wherever the plugin's delegates put them.
/// It makes a key pair the first time one is needed.
/// </summary>
/// <remarks>
/// The keys are checked to pair once, then kept in memory until a value the delegates return changes.
/// New keys are made only when the protector can encrypt, so a private key is never stored in plain text by <see cref="GetKeys"/>.
/// </remarks>
public sealed class JsonWebPushStore : IWebPushStore
{
    private readonly SecretProtector _secrets;
    private readonly Func<WebPushStoredKeys> _readKeys;
    private readonly Action<WebPushStoredKeys> _saveKeys;
    private readonly JsonFileStore<List<WebPushSubscription>> _file;
    private readonly object _lock = new();
    private (WebPushStoredKeys Stored, WebPushKeys? Keys)? _kept;

    /// <summary>
    /// Initializes a new instance of the <see cref="JsonWebPushStore"/> class.
    /// </summary>
    /// <param name="path">The absolute path of the file the subscriptions are kept in.</param>
    /// <param name="secrets">The protector that encrypts the private key.</param>
    /// <param name="readKeys">Reads the stored keys and contact, such as from the configuration and a <see cref="ProtectedJsonFileStore{T}"/>.</param>
    /// <param name="saveKeys">Stores a new key pair. It receives the public key, the encrypted private key, and the contact last read.</param>
    /// <param name="logger">An optional logger for an unreadable file.</param>
    public JsonWebPushStore(string path, SecretProtector secrets, Func<WebPushStoredKeys> readKeys, Action<WebPushStoredKeys> saveKeys, ILogger? logger = null)
    {
        ArgumentException.ThrowIfNullOrEmpty(path);
        ArgumentNullException.ThrowIfNull(secrets);
        ArgumentNullException.ThrowIfNull(readKeys);
        ArgumentNullException.ThrowIfNull(saveKeys);
        _secrets = secrets;
        _readKeys = readKeys;
        _saveKeys = saveKeys;
        _file = new JsonFileStore<List<WebPushSubscription>>(path, logger);
    }

    /// <inheritdoc />
    public WebPushKeys? GetKeys()
    {
        var stored = Read();
        lock (_lock)
        {
            if (_kept is { } kept && kept.Stored == stored)
            {
                return kept.Keys;
            }

            var keys = WebPushKeys.FromStored(stored.PublicKey, stored.ProtectedPrivateKey, _secrets, stored.Contact, stored.ServerUrl);
            if (keys is null && _secrets.IsAvailable)
            {
                return MakeKeys(stored);
            }

            _kept = (stored, keys);
            return keys;
        }
    }

    /// <summary>
    /// Makes a new VAPID key pair and forgets every subscription, since a browser signed up with the old key cannot get a web push signed with the new one.
    /// </summary>
    /// <returns>How many subscriptions were forgotten.</returns>
    public int ResetKeys()
    {
        lock (_lock)
        {
            MakeKeys(Read());
        }

        var removed = 0;
        _file.UpdateIf(list =>
        {
            removed = list.Count;
            list.Clear();
            return removed > 0;
        });
        return removed;
    }

    /// <summary>
    /// Lists every subscription.
    /// </summary>
    /// <returns>The subscriptions, oldest first.</returns>
    public IReadOnlyList<WebPushSubscription> All() => _file.Load().OrderBy(s => s.CreatedUtc).ToList();

    /// <inheritdoc />
    public IReadOnlyList<WebPushSubscription> GetSubscriptions(Guid userId) => _file.Load().Where(s => s.UserId == userId).ToList();

    /// <inheritdoc />
    public void Save(WebPushSubscription subscription)
    {
        ArgumentNullException.ThrowIfNull(subscription);
        _file.Update(list =>
        {
            list.RemoveAll(s => string.Equals(s.Endpoint, subscription.Endpoint, StringComparison.Ordinal));
            list.Add(subscription);
        });
    }

    /// <inheritdoc />
    public void Remove(string endpoint)
        => _file.UpdateIf(list => list.RemoveAll(s => string.Equals(s.Endpoint, endpoint, StringComparison.Ordinal)) > 0);

    /// <summary>
    /// Forgets every subscription of a user, such as one who was deleted.
    /// </summary>
    /// <param name="userId">The Jellyfin user.</param>
    /// <returns>How many subscriptions were forgotten.</returns>
    public int RemoveUser(Guid userId)
    {
        var removed = 0;
        _file.UpdateIf(list =>
        {
            removed = list.RemoveAll(s => s.UserId == userId);
            return removed > 0;
        });
        return removed;
    }

    private WebPushStoredKeys Read()
    {
        var stored = _readKeys() ?? new WebPushStoredKeys(string.Empty, string.Empty);
        return stored with { PublicKey = stored.PublicKey ?? string.Empty, ProtectedPrivateKey = stored.ProtectedPrivateKey ?? string.Empty };
    }

    // Called under _lock.
    private WebPushKeys MakeKeys(WebPushStoredKeys last)
    {
        var made = WebPushKeys.Generate(last.Contact, last.ServerUrl);
        _saveKeys(last with { PublicKey = made.PublicKey, ProtectedPrivateKey = made.ProtectPrivateKey(_secrets) });
        var stored = Read();
        var keys = WebPushKeys.FromStored(stored.PublicKey, stored.ProtectedPrivateKey, _secrets, stored.Contact, stored.ServerUrl) ?? made;
        _kept = (stored, keys);
        return keys;
    }
}
