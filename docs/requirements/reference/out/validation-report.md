# Validation report: Larkspur Pay

Profile `larkspur-pay.profile.yaml`, seed 20261125, as of 2026-11-25. Result: **PASS**

## Checks
| Check | Result | Detail |
|---|---|---|
| Exactly one Company | Pass |  |
| Every unit's parent is the level directly above | Pass |  |
| Every person's unit exists | Pass |  |
| Every manager exists and is active | Pass |  |
| No manager loops | Pass |  |
| The CEO is the only active person without a manager | Pass | E10001 |
| Every GRC role is filled by an active person | Pass |  |
| Site, country and time zone agree | Pass |  |
| Active headcount per site matches the profile (±2) | Pass | LP-ARL-01 55/55, LP-DEN-HQ 230/230, LP-DUB-01 70/70, LP-LON-01 40/40, LP-MNL-01 55/55, LP-NYC-01 50/50 |
| Total active headcount is 500 (±2) | Pass | 500 |
| Larkspur Federal staff work in US locations | Pass |  |
| No Manila person has federal access | Pass |  |
| Everyone with a role on a federal application has federal access | Pass |  |
| No Manila person is linked to a federal application | Pass |  |
| Every owner is an active person | Pass |  |
| Application regulatory scope covers its data types | Pass |  |
| Vendors with Restricted data are at least High tier | Pass |  |
| Terminated people have a termination date after their hire date | Pass |  |
| Terminated people own nothing | Pass |  |
| Hire dates are not before the site opened | Pass |  |
| Work emails are unique and use .example domains | Pass |  |
| Asset match keys are unique | Pass |  |
| Phone numbers are fictional (555-0100 + ext., Ofcom drama range, or undiallable) | Pass |  |

## Counts
| File | Rows |
|---|---|
| `application_roles.csv` | 385 |
| `applications.csv` | 40 |
| `assets.csv` | 633 |
| `business_functions.csv` | 10 |
| `business_units.csv` | 51 |
| `data_types.csv` | 12 |
| `facilities_buildings.csv` | 6 |
| `facilities_secure_areas.csv` | 11 |
| `facilities_sites.csv` | 6 |
| `group_members.csv` | 107 |
| `groups.csv` | 7 |
| `links_application_asset.csv` | 76 |
| `links_application_data_type.csv` | 59 |
| `links_application_service.csv` | 44 |
| `links_application_vendor.csv` | 26 |
| `links_asset_data_type.csv` | 48 |
| `links_business_function_service.csv` | 11 |
| `links_service_data_type.csv` | 11 |
| `links_service_product.csv` | 9 |
| `links_vendor_data_type.csv` | 50 |
| `people.csv` | 634 |
| `people_hr.csv` | 634 |
| `products.csv` | 3 |
| `services.csv` | 8 |
| `vendors.csv` | 61 |

## People
- Active (incl. on leave): 500; on leave: 6; contractors: 5
- Terminated (kept): 116 — 2024: 40, 2025: 40, 2026: 36
- Vendor contacts: 18
- Named positions: 115

| Site | Active |
|---|---|
| LP-ARL-01 | 55 |
| LP-DEN-HQ | 230 |
| LP-DUB-01 | 70 |
| LP-LON-01 | 40 |
| LP-MNL-01 | 55 |
| LP-NYC-01 | 50 |

| Division | Active |
|---|---|
| Operations | 124 |
| Technology | 111 |
| Sales and Marketing | 72 |
| Larkspur Federal | 50 |
| Security | 44 |
| Finance | 30 |
| People | 22 |
| Product | 20 |
| Risk | 12 |
| Legal | 8 |
| Internal Audit | 5 |
| Executive Office | 2 |
