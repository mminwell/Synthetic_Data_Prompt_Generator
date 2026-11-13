# Bundled libraries

These are loaded on demand by `gen/common.js`. They're vendored so the site has no runtime dependencies and works offline.

| File | Source | License |
|---|---|---|
| `faker-core.js` | [@faker-js/faker](https://github.com/faker-js/faker) 10.6.0 (`Faker`, `en`, `base`), bundled with esbuild | MIT |
| `faker-locales/*.js` | @faker-js/faker 10.6.0 locale data, trimmed to `person`, `location`, `phone_number` and `metadata` | MIT |
| `any-ascii.js` | [any-ascii](https://github.com/anyascii/anyascii), used to romanize non-Latin names and addresses | ISC |
| `xlsx.mini.min.js` | [SheetJS Community Edition](https://sheetjs.com) 0.18.5 (`xlsx` on npm), used for Excel downloads | Apache-2.0 |
