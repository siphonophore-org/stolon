# Notifications

The types that send an update to Discord, a webhook, a Jellyfin user's devices, and a browser through web push. [Notifications](../../Notifications.md) walks through setting them up, with a full example.

## StolonNotifier

Sends a `NotifyMessage` to each `NotifyDestination` in that place's format, previews what each would get, holds Jellyfin messages for a device to come online, and keeps web push subscriptions. Register it with `AddBaseNotifier`, and take it in a constructor.

```csharp
_notifier.Send(config.Destinations, message);

var result = await _notifier.SendAsync(destination, message, cancellationToken).ConfigureAwait(false);
var preview = StolonNotifier.Preview(destination, message);
```

**Gotchas**

* A failed send is a `NotifyResult` with a sentence, never an exception. Only the caller's cancelled token throws.
* A list skips a destination that is off. One destination is sent to whether it is on or not, for a test.
* At most `MaxConcurrentSends`, which is 4, destinations are sent to at once across the plugin.
* A failure that may pass, such as no answer, 429, or 503, is tried again up to two times, with a wait that grows. A refused address is never tried again.
* Posts go through the factory's `HttpClientName` client, which `AddBaseNotifier` registers to follow no redirect, so a redirect comes back as the answer and a webhook's headers never reach another host.
* Posts use `StolonHttp`'s own check by default, which reaches the local network. Set `WebhookGuard` for a strict guard, such as `SsrfGuard.PublicOnly`.
* A web push goes through `PushGuard`, `SsrfGuard.PublicOnly` by default. A test may set `SsrfGuard.Disabled` to reach a stand in push service.
* A Jellyfin message shows for `MessageTimeoutMs`, 15 seconds.

## NotifyMessage

One update, written once for every channel. The title and text may hold `{name}` placeholders from `Values`, filled for each channel with its escaping. See [Placeholders and Escaping](../../Notifications.md#placeholders-and-escaping).

```csharp
var message = new NotifyMessage
{
    Title = "Available: {title}",
    Text = "{title} is in the library.",
    Values = { ["title"] = "Dune (2021)" },
    Recipients = { requesterId }
};
```

**Gotchas**

* `ImageUrl`, `ThumbnailUrl`, `LinkUrl`, and a destination's `AvatarUrl` must be absolute http or https addresses. Any other is left out.
* `Data` comes first in a webhook's JSON, in its order, and a key it sets is not set again from the message. It also fills a custom body's placeholders as JSON.
* `Timestamp` is written in UTC with a trailing Z.
* A web push keeps a relative `LinkUrl`, which the worker resolves against its scope.
* `PlainKeys` names the values a Discord custom body sends as given. The title and text escape every value for Discord.
* `Recipients` is who the Jellyfin and web push channels reach. `OneDevice`, `Hold`, and `Subject` shape a Jellyfin message, and `Tag` and `TimeToLive` a web push.

## NotifyField

One name and value of a message, shown as a Discord embed field and listed in a webhook's `fields`. A field whose value is blank is left out.

```csharp
message.Fields.Add(new NotifyField("Notes", note, Inline: false));
```

## NotifyChannel

The kind of place a destination is: `Discord`, `Webhook`, `Jellyfin`, or `WebPush`.

## NotifyDestination

One place messages go, kept in the plugin's configuration. A plugin may derive from it to add its own settings.

```csharp
NotifyDestination.ResolveSecrets(incoming, stored, _secrets);
var forPage = Copy(stored);
forPage.HideSecrets();
```

**Gotchas**

* `Url` and `Headers` are stored encrypted through `ResolveSecrets`. The page posts `SecretProtector.KeptSentinel` to keep them.
* The headers stay only while the address is the same, so a stored token never follows a webhook somewhere new.
* An encrypted value copied from another destination or server is refused, and stored as empty.
* The Jellyfin and web push channels keep no address or headers.
* `Username` is the name a Discord post comes from, "Jellyfin" when blank.

## NotifyResult

What sending to one destination did: whether it worked, a sentence in the language of the call path, the status an address answered, how many devices showed it, and how many recipients it was held for.

```csharp
var said = string.Join(" ", results.Select(r => r.Message));
```

## NotifyPreview

What one destination would get, from `StolonNotifier.Preview`, for a page to draw with the [Notify Preview](../web/notify-preview.md). A post has its method, content type, and body, a Discord post its data too, a Jellyfin message its header and text, and a web push its payload before encryption. `Error` says why nothing would be sent.

## NotifyTemplate

The text rules every channel shares. `Fill` fills placeholders, `RenderBody` fills a custom body, `ParseHeaders` reads webhook headers, and `EscapeDiscord`, `StripMarkup`, and `Clip` make text safe and short.

```csharp
var line = NotifyTemplate.Fill("{title} for {user}", values, NotifyTemplate.EscapeDiscord);
var headers = NotifyTemplate.ParseHeaders(text) ?? throw new FormatException();
```

**Gotchas**

* `ParseHeaders` returns `null` when any line is not a header, so a post never goes without one it needs.
* `RenderBody` leaves out every key whose value comes out empty in a JSON body, including inside an inserted JSON value.

## NotifyHeldMessage

A Jellyfin message an `INotifyHeldStore` keeps, with who it is for, its header and text, when it was held, whether it shows on one device, and the plugin's `Subject`.

## INotifyHeldStore

Where the plugin keeps held Jellyfin messages, such as a table in its database. `StolonNotifier` decides what to hold and when to show it. See [Held Messages](../../Notifications.md#held-messages).

**Gotchas**

* `Take` must remove what it returns, so two devices that connect at once never show a message twice.
* A message that cannot be shown is held again through `Hold`.

## JsonNotifyHeldStore

A ready made `INotifyHeldStore` that keeps held messages in a JSON file. It keeps at most `maxPerUser` messages for one user, 50 by default, dropping the oldest, and drops a message older than `maxAge`, 30 days by default.

```csharp
services.AddSingleton<INotifyHeldStore>(sp => new JsonNotifyHeldStore(
    Path.Join(sp.GetRequiredService<IApplicationPaths>().PluginConfigurationsPath, "MyPlugin.Held.json")));
```

**Gotchas**

* `Counts`, `Clear`, `RemoveSubject`, and `RemoveUser` are for the plugin's own pages and cleanup, such as dropping the messages about a request that was removed.
* `isStillDue` decides whether a held message is still worth showing. Without it every message is.
* A cap or age of zero or less throws.

## NotifyHeldWatcher

A hosted service that shows held messages as soon as one of their recipient's devices that can show messages starts a session or reports what it can do. `AddBaseNotifier` registers it.

## WebPushKeys

The server's VAPID key pair, which signs every web push. Generate it once, keep the private key encrypted, and read it back for the `IWebPushStore`.

```csharp
var keys = WebPushKeys.Generate();
config.PushPublicKey = keys.PublicKey;
config.PushPrivateKey = keys.ProtectPrivateKey(_secrets);
```

**Gotchas**

* `FromStored` returns `null` when the two keys are missing or do not form a pair, which stops every web push.
* The contact is a `mailto:` or https address, else the server's https address, else `https://jellyfin.org`.
* A new pair makes every browser's subscription invalid, since each was made with the old public key.

## WebPushEncryption

Encrypts a payload for one subscription as RFC 8291 sets out, in one `aes128gcm` record. `StolonNotifier` calls it, so a plugin needs it only to send a push of its own.

**Gotchas**

* A payload is at most `MaxPlaintextLength`, 3993 octets.
* A key that is not valid throws `ArgumentException`.

## WebPushSubscription

One browser that signed up for a user's web push. `TryCreate` checks what a page sent, and `StolonNotifier.Subscribe` calls it.

**Gotchas**

* The endpoint must be an absolute https address with no user info, at most 2048 characters.
* The label loses control characters and is cut to 100 characters.

## IWebPushStore

Where the plugin keeps its VAPID keys and its users' subscriptions. `StolonNotifier` reads the keys and subscriptions, saves a subscription a page sends, and removes one a push service answers 404 or 410 for.

## JsonWebPushStore

A ready made `IWebPushStore` that keeps the subscriptions in a JSON file, and the VAPID keys wherever the plugin's two delegates put them, such as the public key in the configuration and the private key in a `ProtectedJsonFileStore`. It makes a key pair the first time one is needed.

```csharp
var store = new JsonWebPushStore(
    Path.Join(paths.PluginConfigurationsPath, "MyPlugin.Push.json"),
    secrets,
    () => new WebPushStoredKeys(config.PushPublicKey, secretsFile.Load().PushPrivateKey, config.PushContact, config.ServerUrl),
    keys => { config.PushPublicKey = keys.PublicKey; secretsFile.Update(s => s.PushPrivateKey = keys.ProtectedPrivateKey); });
```

**Gotchas**

* New keys are made only when the protector can encrypt, so `GetKeys` never stores a private key in plain text. Without a provider it returns `null`.
* The keys are checked to pair once, then kept until a value `readKeys` returns changes.
* `ResetKeys` makes a new pair and forgets every subscription, since a browser signed up with the old key cannot get a web push signed with the new one.
* `RemoveUser` forgets a deleted user's browsers. `All` lists every subscription, oldest first.

## WebPushStoredKeys

The VAPID keys as a plugin stores them, with the contact and the server address, which `JsonWebPushStore` reads and saves through its delegates. The private key is the encrypted value `WebPushKeys.ProtectPrivateKey` gives.

## WebPushWorker

The service worker script that shows a web push and opens its address on a click. Serve it with `Serve` and load it with `importScripts` from the plugin's own service worker, or copy `Script`. See [The Service Worker](../../Notifications.md#the-service-worker).
