---
type: handoff
status: Ready for the generator project
updated: 2026-11-25
---
# Generator Handoff: profile-driven Synthetic Data Generator

**For:** the agent working on `mminwell/Synthetic_Data_Prompt_Generator` (live at sdpg-alpha.vercel.app).
**Goal:** turn the generator from three separate pages (HR, Facilities, CMDB) into a tool that builds a **whole fictional company from one profile file**, repeatably, with output that loads straight into the GRC platform.

Read these first, in this order:
1. `Synthetic Company Requirements.md`: what a company profile holds (Part 1) and the output contract (Part 2).
2. `larkspur-pay.profile.yaml`: the first real profile. It is the main test case.
3. `reference/generate.py` and `reference/out/`: a working reference implementation and its output (all checks pass). Port its logic; don't redesign it.

Propose a plan before changing code.

## 1. Decisions already made
- **Stay static.** No backend, no database, no LLM. Everything runs in the browser, as today.
  - Linking roles is rules, not intelligence. Named positions carry `reports_to`. Generated staff report to their unit head, or to auto-created team leads (one per 8 generated staff at a site). Consistency rules run as checks after generation.
  - Profiles are saved by downloading and uploading the profile file (YAML or JSON), plus browser storage for convenience.
  - Output goes to the GRC platform as a .zip of CSVs through its import page. There is no direct database push.
  - Optional later: an LLM button that drafts a profile from a plain-English description. Not part of this work.
- **Profile first.** The profile is the input; pages edit the profile. The existing HR, Facilities and CMDB pages can stay as "quick datasets" for one-off use.
- **Repeatable.** The same profile and seed must give the same output on every run and machine. Use an independent random stream per item (the reference hashes seed + item key), so adding one person doesn't reshuffle everyone else.
- **Clearly fictional.**
  - Emails use `.example` domains only.
  - Phone numbers: US 555-0100 plus extensions; UK Ofcom drama numbers (020 7946 0xxx); elsewhere an undiallable main line plus extensions.
  - Street addresses are invented.
  - Every download includes a README saying the data is synthetic.
  - Real product and vendor names are allowed for realism (AWS, Okta, Workday). Banks and professional-services firms (auditors, law firms, staffing, facilities providers) are fictional. Each vendor row has `name_is_real_company`.

## 2. What the current app has, and what to reuse
| Keep and reuse | Why |
|---|---|
| Static page, no build step, bundled libraries in `vendor/` | Works offline; simple deployment on Vercel |
| `gen/common.js`: seeded random numbers, names by locale, addresses, phones, IDs, file writers (CSV, Excel, SQL, JSON, Markdown) | Same needs; add the phone rules above |
| `data/countries.js` | Country, currency, time zone, locale per site |
| `gen/cmdb.js` relationship logic (always points down the stack, no cycles) | Basis for assets and their links |
| Birchline styling, sidebar and routing in `index.html` | Same look |

| Gap | What's needed |
|---|---|
| Fixed list of 10 generic departments with weighted random headcounts | A business hierarchy from the profile: Company › Division › Business unit › Department (strict levels, pass-through units), headcount per unit per site |
| No named roles | Named positions with titles, unit, site and `reports_to` (about 115 at Larkspur, covering every GRC module role) |
| Profile holds only name, domain, countries, offices, site IDs, ID range, cost centers | The full profile in `larkspur-pay.profile.yaml` |
| No vendors, applications as their own records, data types, secure areas, products, services, business functions, groups | New generators (see the reference) |
| Profile and HR details mixed | Separate `people.csv` (profile) and `people_hr.csv` (restricted HR details) |
| Three pages to line up by hand | One "Generate company" producing a .zip of all files plus a validation report |
| No consistency checks | The 23 checks in the reference `validation-report.md` |

## 3. Generation pipeline (follow the reference order)
1. **Load and check the profile.** Reject stray empty values: an unquoted comma in YAML silently splits a value; the reference caught this.
2. **Business units** from `units`.
3. **Named positions** in reporting order (managers first), with `count` for small teams.
4. **Generated staff** per unit and site = headcount − named positions there:
   - titles from the unit's `ladders` (junior titles more common)
   - one team lead per 8 staff
   - about 4% contractors in Technology, Operations, and Sales and Marketing
5. **Leavers:** `annual_leaver_rate` × headcount for each year from `history_start` to `as_of`. They are kept with status Terminated, a termination date after their hire date, and they own nothing.
6. **People on leave:** a handful, with leave dates.
7. **Vendor contacts:** one per Critical or High vendor, with employment type "Vendor contact" and a `.example` email at the vendor's domain stem.
8. **Groups:** for example Security operations, Clinic staff, SWIFT operators, and **Federal access (US persons)**, which is everyone in Larkspur Federal or Arlington plus named Denver roles that touch federal systems.
9. **Data types, vendors, products, services, business functions** from the profile.
10. **Applications and application roles:**
    - Regulatory scope comes from data types (`regulations_by_data_type`), plus SOC 1 for financially significant systems, SOC 2 for customer-facing ones, and NYDFS for internet-facing payroll.
    - Roles: business owner, technical owner, data owner, security contact, privacy contact, access approver, vendor manager, continuity coordinator, disaster recovery lead, executive sponsor.
11. **Assets:**
    - cloud clusters, services, databases, buckets, load balancers and keys per in-house application
    - the SWIFT secure zone and operator terminals
    - the clinic workstation
    - network gear in every site's network closet
    - a laptop per active person, some retired laptops, spares
12. **Link files**, then the **validation report** and **README**.

## 4. Output files
Exactly the files and columns in `reference/out/` (column headers are the contract; the GRC platform's Foundation import maps from them):

`business_units` · `facilities_sites` · `facilities_buildings` · `facilities_secure_areas` · `people` · `people_hr` · `groups` · `group_members` · `data_types` · `vendors` · `products` · `services` · `business_functions` · `applications` · `application_roles` · `assets` · `links_application_service` · `links_application_asset` · `links_application_data_type` · `links_application_vendor` · `links_asset_data_type` · `links_vendor_data_type` · `links_service_product` · `links_service_data_type` · `links_business_function_service` · `validation-report.md` · `README.md`

**Format:**
- UTF-8 CSV with one header row.
- ISO dates.
- `|` between multiple values in a cell.
- `Yes`/`No` for booleans.
- An empty cell means no value.

**Match keys:**
- People: employee ID, then contractor ID, then work email.
- Units: unit code.
- Vendors: vendor code, then domain.
- Applications: source ID.
- Assets: source system + source ID, then cloud resource ID, then serial number, then hostname.

## 5. Interface
- **Home:** "Build a company" (primary) and "Quick datasets" (the existing pages).
- **Company builder:**
  - **Steps, each with defaults:** Basics · Locations · Leadership and named roles · Headcount by unit and site · Applications · Vendors · Data types · Facilities and secure areas · History.
  - **Profile files:** upload or download the profile at any point, and start from the Larkspur Pay example.
  - **Generate:** shows the validation report first. Failures link to the step to fix, and nothing downloads while a check fails. Then a preview tab per file, then **Download .zip**. Optionally an Excel workbook with one sheet per file.
- **Accessibility:** Birchline styling, keyboard-accessible, and works offline.

## 6. Phases
| Phase | Scope | Done when |
|---|---|---|
| 1 | Port the reference pipeline to JavaScript; load `larkspur-pay.profile.yaml`; generate the .zip and validation report | Larkspur generates in the browser, all 23 checks pass, file and column names match the reference, row counts within ±2% of the reference |
| 2 | Company builder steps over the profile; upload and download the profile | A new company can be built from defaults in under 10 minutes; editing a value and regenerating changes only what it should |
| 3 | Table editors for applications, vendors and positions; import those from CSV | Larkspur's lists can be edited in the page instead of the YAML |
| 4 | GRC history files (risks, policies and statements, controls and tests, findings, incidents, assessments), once the GRC platform's import templates exist | Larkspur's 2024–2026 history (audits, the four incidents, the federal monitoring gap) loads into the GRC platform |
| Later | Optional LLM helper to draft a profile from a description | — |

## 7. Acceptance tests
- Same profile + seed → byte-identical files (run twice and compare).
- Changing the seed changes names and IDs but keeps every count and every check passing.
- The validation report shows all checks passing for Larkspur. Each check has a test that breaks it on purpose (for example, a Manila person given a role on Larkspur Federal must fail "No Manila person is linked to a federal application").
- No email outside `.example` domains; no phone number outside the fictional ranges.
- The Larkspur .zip loads through the GRC platform's Foundation import with no errors (once that import exists). Until then, compare against `reference/out/`.

## 8. Known gotchas
- **YAML:** values containing commas must be quoted (e.g. `title: "Director, Security GRC"`).
- **Executives sit in their division unit** (e.g. the CFO in Finance), not in a business unit under it.
- **Larkspur Federal is its own division.** Its 50 people are counted there, not in Technology, Operations or Sales and Marketing.
- **Unit heads and facility managers** reference people. The GRC import loads people first, then sets these in a second pass.
- **Real vendor names:** keep `name_is_real_company` accurate, and never generate findings that look like real statements about a real company outside the synthetic files.
