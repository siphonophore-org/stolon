using System;
using Microsoft.Extensions.Logging;

namespace Siphonophore.Stolon;

/// <summary>
/// A <see cref="JsonFileStore{T}"/> for secrets. The whole JSON is encrypted with a <see cref="SecretProtector"/>, and the file is private to the account the server runs as.
/// </summary>
/// <remarks>
/// The file is written through <see cref="AtomicFile"/> with <c>ownerOnly</c>, on every OS. A file of plain JSON reads too, so a store can take over a file written before it.
/// When the protector has no Data Protection provider the JSON is written in plain text, still owner only.
/// A file that cannot be decrypted, such as after the key ring was lost, reads as a fresh value, and the next save replaces it.
/// </remarks>
/// <typeparam name="T">The stored type. It must round-trip through JSON and have a public parameterless constructor.</typeparam>
public sealed class ProtectedJsonFileStore<T>
    where T : class, new()
{
    private readonly JsonFileStore<T> _file;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProtectedJsonFileStore{T}"/> class.
    /// </summary>
    /// <param name="path">The absolute path of the backing file. Its directory is created on the first save.</param>
    /// <param name="secrets">The protector that encrypts and decrypts the JSON.</param>
    /// <param name="logger">An optional logger for an unreadable file.</param>
    public ProtectedJsonFileStore(string path, SecretProtector secrets, ILogger? logger = null)
    {
        ArgumentException.ThrowIfNullOrEmpty(path);
        ArgumentNullException.ThrowIfNull(secrets);
        _file = new JsonFileStore<T>(path, logger, ownerOnly: true, seal: secrets.Protect, open: secrets.Unprotect);
    }

    /// <summary>
    /// Loads and decrypts the stored value, or a new <typeparamref name="T"/> when the file is absent, empty, unreadable, or cannot be decrypted.
    /// </summary>
    /// <returns>The stored value, or a fresh instance.</returns>
    public T Load() => _file.Load();

    /// <summary>
    /// Encrypts and persists <paramref name="value"/> in an owner only file, creating the parent directory if needed.
    /// </summary>
    /// <remarks>An I/O failure is not caught. The temp file is removed and the exception propagates.</remarks>
    /// <param name="value">The value to store.</param>
    public void Save(T value) => _file.Save(value);

    /// <summary>
    /// Loads the value, applies <paramref name="mutate"/>, and saves the result under one lock.
    /// </summary>
    /// <param name="mutate">The mutation to apply to the loaded value.</param>
    /// <returns>The mutated value that was saved.</returns>
    public T Update(Action<T> mutate) => _file.Update(mutate);

    /// <summary>
    /// Loads the value, applies <paramref name="mutate"/>, and saves only when it returns <c>true</c>, all under one lock.
    /// </summary>
    /// <param name="mutate">The mutation. It returns <c>true</c> to persist the change.</param>
    /// <returns>Whether the value was saved.</returns>
    public bool UpdateIf(Func<T, bool> mutate) => _file.UpdateIf(mutate);
}
