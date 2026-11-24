<img src="https://raw.githubusercontent.com/siphonophore-org/siphonophore/main/brand/stolon/logo.svg" alt="Stolon" width="96" align="left">

Shared configuration page components and C# helpers for Jellyfin plugins, delivered as the `Siphonophore.Stolon` NuGet package on GitHub Packages. The source and assets are compiled into each plugin at build time, so a plugin stays a single DLL with nothing extra to ship.

<br clear="left">

## Documentation

Usage, translations, every C# helper, every web component, and how a release works are covered in the **[Stolon documentation](https://siphonophore-org.github.io/stolon/)**.

## Package

```xml
<PackageReference Include="Siphonophore.Stolon" Version="12.4.0" />
```

## License

[GNU General Public License v3.0](LICENSE). A plugin built with Stolon is distributed under the same terms.

## Acknowledgements

The translations a plugin inherits come from [Jellyfin](https://jellyfin.org): the web client's strings from [jellyfin-web](https://github.com/jellyfin/jellyfin-web) and the server's from [jellyfin](https://github.com/jellyfin/jellyfin), written by Jellyfin's translators on [Weblate](https://translate.jellyfin.org). Stolon takes them from the Jellyfin release named in `jellyfin.json` and ships them under their own license, the GNU General Public License v2.0 or later, in the package's `jellyfin/LICENSE`.

<a href="https://github.com/siphonophore-org"><img src="https://raw.githubusercontent.com/siphonophore-org/siphonophore/main/brand/siphonophore/banner.svg" alt="Part of the Siphonophore project" width="100%"></a>
