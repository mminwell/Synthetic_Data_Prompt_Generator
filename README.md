# Synthetic Data Prompt Generator

A static web page that builds detailed prompts for any LLM (ChatGPT, Claude, Gemini, …) to generate realistic, entirely fictional test data. Pick the fields, countries and mix you want, then copy the finished prompt.

Data types:

- **HR data**: employees with jobs, a real org chart, offices, pay in local currency, leave and compliance fields
- **Facilities data**: sites, buildings, floors and spaces with leases, capacity, occupancy and desk assignments
- **CMDB data**: servers, VMs, databases, apps, network gear and business services with owners, lifecycle dates and dependencies

An optional **shared company profile** (company name, email domain, countries, offices, site IDs, employee ID range and cost centers) is written into every prompt, so datasets generated separately still line up with each other.

Nothing leaves the browser. The page only builds text for you to copy.

## Project structure

```
index.html          Layout, styles, shared engine (country picker, field lists, prompt builder)
data/countries.js   Every country/territory: name, region, currency, phone code
types/hr.js         HR data type: fields, mixes, rules, prompt text
types/facilities.js Facilities data type
types/cmdb.js       CMDB data type
```

There's no build step and no dependencies. Open `index.html` in a browser to run it locally.

## Adding a data type

1. Copy one of the files in `types/` (e.g. `types/cmdb.js`) and rename the config object.
2. Edit its `id`, titles, `mixes`, `checks`, field `groups`, `rules` and `lines()` prompt text.
3. Add a `<script src="types/your-type.js"></script>` tag to `index.html` and include the object in the `[HR, FAC, CMDB]` list near the bottom.

The sidebar link, home-page card and page sections are all generated from the config.

## Deploying on Vercel

1. In Vercel, choose **Add New → Project** and import this repository.
2. Set the framework preset to **Other**. Leave the build command and output directory empty.
3. Deploy. Every push to `main` redeploys automatically.
