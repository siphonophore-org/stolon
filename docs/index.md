# Jellyfin Plugin Stolon

Shared configuration page components and C# helpers for Jellyfin plugins, delivered as the `Siphonophore.Stolon` NuGet package. The source and assets are compiled into each plugin at build time, so a plugin stays a single DLL with nothing extra to ship.

## What It Provides

* **C# components.** A plugin base class, scheduled tasks, outbound HTTP, retry and backoff, secrets at rest, the activity log, paging, SQLite versioning, and text and file helpers. See [C# Components](components/csharp/index.md).
* **Translations.** A plugin declares the Jellyfin strings it uses and adds its own for the rest, and the build checks that no string is said twice. See [Translations](Translations.md).
* **Notifications.** One message goes to Discord, a webhook, a Jellyfin user's devices, and a browser through web push, each in its own format, with a preview of each. See [Notifications](Notifications.md).
* **Web components.** Dialogs, tables, card lists, selectors, badges, steps, and the page lifecycle every configuration page repeats, built on `stolon-` classes and `--stolon-` tokens. They are written in TypeScript and ship as one ES module with typings for the editor, and fields on a config page validate with no extra code. See [Web Components](components/web/index.md).

## Where to Go

| To | Read |
| :--- | :--- |
| Add Stolon to a plugin | [Using Stolon](Usage.md) |
| Use Jellyfin's strings and add the plugin's own | [Translations](Translations.md) |
| Send updates to Discord, webhooks, Jellyfin, and browsers | [Notifications](Notifications.md) |
| Find a C# helper | [C# Components](components/csharp/index.md) |
| Find a page component | [Web Components](components/web/index.md) |
| Release Stolon or raise it in a plugin | [Releasing](Releasing.md) |
| Add or change a component | [Start Here](https://github.com/siphonophore-org/stolon/blob/main/starthere.md) |
