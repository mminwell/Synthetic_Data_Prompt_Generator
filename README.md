# Synthetic Data Prompt Generator

A static web page that generates realistic, entirely fictional test data right in the browser. Pick the fields, countries and mix you want, click **Generate data**, preview it and download CSV, Excel, SQL (PostgreSQL), JSON or Markdown. **Generate prompt** opens a ready-made prompt for any LLM (ChatGPT, Claude, Gemini, …) instead.

Data types:

- **HR data**: employees with jobs, a real org chart, offices, pay in local currency, leave and compliance fields
- **Facilities data**: sites, buildings, floors and spaces with leases, capacity, occupancy and desk assignments
- **CMDB data**: servers, VMs, databases, apps, network gear and business services with owners, lifecycle dates and dependencies

An optional **shared company profile** (company name, email domain, countries, offices, site IDs, employee ID range and cost centers) is written into every prompt, so datasets generated separately still line up with each other.

Generation is seeded: the same settings and seed always produce the same data. Nothing leaves the browser.

| Data type | In-browser generator | Prompt |
|---|---|---|
| HR | Yes | Yes |
| Facilities | Coming next | Yes |
| CMDB | Coming next | Yes |

## Project structure

```
index.html            Layout, styles, shared engine (country picker, field lists, prompt builder, generate/preview/download)
data/countries.js     Every country/territory: name, region, currency, phone code, capital, time zone, Faker locale
types/*.js            One file per data type: fields, mixes, rules, prompt text
gen/common.js         Generator helpers: seeded random numbers, names, addresses, phones, IDs, pay, file formats
gen/hr.js             HR generator
vendor/               Bundled libraries, loaded only when needed (see vendor/README.md)
```

There's no build step. Open `index.html` in a browser to run it locally. Libraries are bundled in `vendor/`, so it works offline too.

Pay uses illustrative exchange rates and cost-of-labor factors in `gen/common.js` (`GEN.FX`, `GEN.COL`), not live rates. Currencies without a rate are paid in USD.

## Adding a data type

1. Copy one of the files in `types/` (e.g. `types/cmdb.js`) and rename the config object.
2. Edit its `id`, titles, `mixes`, `checks`, field `groups`, `rules` and `lines()` prompt text.
3. Add a `<script src="types/your-type.js"></script>` tag to `index.html` and include the object in the `[HR, FAC, CMDB]` list near the bottom.
4. Optional: add a generator in `gen/your-type.js` exposing `generate(settings)` that returns `{ table, pk, rows }`, and set `YOURTYPE.gen = ...` next to `HR.gen = HR_GEN` in `index.html`. Without one, the page offers only the prompt.

The sidebar link, home-page card and page sections are all generated from the config.

## Deploying on Vercel

1. In Vercel, choose **Add New → Project** and import this repository.
2. Set the framework preset to **Other**. Leave the build command and output directory empty.
3. Deploy. Every push to `main` redeploys automatically.
