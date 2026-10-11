# JS Map Selector

[JS Map Selector](https://github.com/Javaabu/js-map-selector) provides helpful JavaScript functionalities that you can use to display Google Maps inputs using a simple data attribute API.

```html
<div data-map-selector="true"
     data-lat="7.084013"
     data-lng="72.926863"
     data-disabled="true"
>
    <div class="map-selector-map bg-light rounded"></div>
</div>
```

Live demos are available at [https://javaabu.github.io/js-map-selector](https://javaabu.github.io/js-map-selector/).

## Hosting the demos on GitHub Pages

The Pages workflow publishes the examples and package source whenever their files
change on `main`. No dependency installation or bundler is needed.

1. In the repository's **Settings → Pages**, select **GitHub Actions** as the source.
2. In **Settings → Secrets and variables → Actions**, add a repository secret named
   `GOOGLE_MAPS_API_KEY` containing the browser API key used by the demos.
3. In Google Cloud, allow `https://javaabu.github.io/*` in that key's website
   restrictions and restrict it to the APIs the demos use (Maps JavaScript API and
   Places API). Keep the project's billing and required APIs enabled. Browser
   referrers can omit the path, so use the origin wildcard rather than restricting
   it to `/js-map-selector/`. See [Google's API key guidance](https://developers.google.com/maps/api-security-best-practices).
4. Push the workflow to `main`, or run **Deploy demos to GitHub Pages** manually
   from the **Actions** tab after updating the secret.

The demo menu is at `https://javaabu.github.io/js-map-selector/`, with the
individual demos under `/js-map-selector/examples/`. The API key is written into
the published JavaScript and is visible to visitors; the secret keeps it out of
Git, while Google's website and API restrictions control its use.

To build locally, run `GOOGLE_MAPS_API_KEY=your-browser-key npm run build:pages`,
then serve `_site/` with a static HTTP server. The output is ignored by Git.
For development directly from `examples/`, copy `examples/api-key.js.example` to
`examples/api-key.js` and supply your browser key there.

## Documentation

You'll find the documentation on [https://docs.javaabu.com/js-map-selector](https://docs.javaabu.com/js-map-selector).

Find yourself stuck using the package? Found a bug? Do you have general questions or suggestions for improving this package? Feel free to create an [issue](../../issues) on GitHub, we'll try to address it as soon as possible.

If you've found a bug regarding security please mail [info@javaabu.com](mailto:info@javaabu.com) instead of using the issue tracker.


## Changelog

Please see [CHANGELOG](CHANGELOG.md) for more information what has changed recently.

## Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

## Security

If you discover any security related issues, please email [info@javaabu.com](mailto:info@javaabu.com) instead of using the issue tracker.

## Credits

- [Javaabu Pvt. Ltd.](https://github.com/javaabu)
- [Arushad Ahmed (@dash8x)](http://arushad.com)
- [All Contributors](../../contributors)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.

