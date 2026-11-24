# Releasing

How a version of Stolon is released and how a plugin picks it up.

## Versions

A version is `<jellyfin>.<X>`, such as `12.4.0`. `<jellyfin>` is the Jellyfin version Stolon targets, set in `jellyfin.json`, and `X` counts the releases for it, from `0`. A new Jellyfin version starts `X` over at `0`. The version is computed by the workflow and never written into the repository.

A version that already exists on GitHub Packages or as a tag is refused, never skipped.

## Move to Another Jellyfin Release

`jellyfin.json` names the Jellyfin version and the tags of jellyfin-web and jellyfin that the strings come from. `npm run strings:bump` changes it, checks each tag exists, fetches the strings, and lists the US English keys that were added, removed, or reworded.

| To | Run |
| :--- | :--- |
| Take the strings from a patch release | `npm run strings:bump -- v12.4.1` |
| Move one source | `npm run strings:bump -- --web v12.4.1` or `--server v12.4.1` |
| Target a new Jellyfin version, and start its releases at `.0` | `npm run strings:bump -- --jellyfin 12.5` |

A plugin that declares a key a bump removed fails its build with `STOL007` once it moves to that Stolon. See [Translations](Translations.md#diagnostics).

## Start a Release

Open the repository's **Actions** tab, select **Release**, and choose **Run workflow** on `main`. A run from any other branch does nothing. Leave the version blank to release the next `X`, or type one such as `12.4.3` to override it. One run does everything, in this order.

1. Computes the version and checks it against GitHub Packages and the repository's tags.
2. Bundles the CSS and JavaScript with `scripts/bundle.sh`, which type checks the TypeScript, builds the typings, and fetches Jellyfin's strings at the tags in `jellyfin.json`.
3. Checks the bundle against its golden copy, the typings against their test, and the docs with `node scripts/build-docs.mjs --check`.
4. Runs the JavaScript tests, then the C# tests, which also check the CSS for its older-engine fallbacks.
5. Packs `Siphonophore.Stolon` with the version, the translations task, and Jellyfin's strings.
6. Tags `v<version>` and creates the GitHub release with generated notes and the package attached.
7. Pushes the package to the organization's GitHub Packages feed.

The tag and the release come first, so every published version has both. If a run fails after tagging, run it again on the same commit. It runs the checks again, keeps the tag and the release, and pushes the package.

The push uses the run's own `GITHUB_TOKEN` with `packages: write`, so no key is stored.

## Test Before a Release

* Bundle and run the same checks the workflow runs.

    ```bash
    bash scripts/bundle.sh && node scripts/check-bundle.mjs && bash scripts/check-types.sh && node scripts/build-docs.mjs --check
    ```

* Run the C# tests.

    ```bash
    dotnet test Siphonophore.Stolon.Tests/Siphonophore.Stolon.Tests.csproj -c Release
    ```

* Run the JavaScript tests.

    ```bash
    node --import ./Siphonophore.Stolon.Tests/js/register.mjs --test Siphonophore.Stolon.Tests/js/*.test.mjs
    ```

* Make a local package, versioned as the next release with a dev suffix such as `12.4.1-dev.20261120153000`, to build a plugin against before the release.

    ```bash
    bash scripts/pack.sh
    ```

## Raise Stolon in a Plugin

Change the `PackageReference` version in the plugin's project file.

```xml
<PackageReference Include="Siphonophore.Stolon" Version="12.4.0" />
```

Build the plugin with no warnings, run its tests, and open its pages. Never commit a plugin against an unreleased package.
