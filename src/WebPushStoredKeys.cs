namespace Siphonophore.Stolon;

/// <summary>
/// The VAPID keys as a plugin stores them, with the contact the push services see, for <see cref="JsonWebPushStore"/>.
/// </summary>
/// <param name="PublicKey">The public key, base64url, empty when none is stored.</param>
/// <param name="ProtectedPrivateKey">The private key as <see cref="WebPushKeys.ProtectPrivateKey(SecretProtector)"/> gives it, empty when none is stored.</param>
/// <param name="Contact">The contact set for the push services, or <c>null</c>. See <see cref="WebPushKeys.ContactFor(string?, string?)"/>.</param>
/// <param name="ServerUrl">The server's address, used for the contact when none is set, or <c>null</c>.</param>
public sealed record WebPushStoredKeys(string PublicKey, string ProtectedPrivateKey, string? Contact = null, string? ServerUrl = null);
