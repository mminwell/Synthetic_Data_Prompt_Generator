---
type: requirements
status: Draft complete
updated: 2026-11-25
---
# Synthetic Company Requirements

Requirements for the synthetic data generator, written so its output loads straight into the GRC platform. Two parts:

1. **Company profile.** A short interview (with defaults) that defines a fictional company. Everything else is derived from it.
2. **Output contract.** What the generator must produce: files, columns, match keys and consistency rules, taken from the [[Foundation Build Document]] so the GRC platform stays the source of truth for the data shape.

The first company, **Larkspur Pay**, is also the seed data for the GRC dev database.

## Part 1 — Company profile: Larkspur Pay

### Basics
| Item | Value |
|---|---|
| Name | Larkspur Pay (checked: no real company by that name) |
| Email domain | `larkspurpay.example` (reserved, can never be real) |
| Business | Payroll and payments software for small and mid-sized businesses, plus a Public Sector edition for defense contractors and government agencies |
| Products | Larkspur Payroll · Larkspur Payments · Larkspur Federal (Public Sector edition) |
| Founded | 2012 (Dublin office 2018, Public Sector edition 2020) |
| Ownership | Private, private-equity backed (no SOX or SEC reporting) |
| Revenue | About $120M a year |
| Customers | About 9,000 business customers paying about 1.2 million employees; about 40 federal and defense customers |
| Headcount | About 500 |

### Locations
| Site | Role | People (approx.) |
|---|---|---|
| Denver, Colorado, US | Headquarters; on-site clinic | 230 |
| New York, New York, US | Finance and sales; supports the New York money transmitter licence | 50 |
| Arlington, Virginia, US | Public Sector team | 55 |
| Dublin, Ireland | EU headquarters (lead GDPR authority: Ireland) | 70 |
| London, United Kingdom | UK sales and support | 40 |
| Manila, Philippines | Customer support and payroll operations | 55 |

### Why each regulation applies
| Regulation or framework | Because |
|---|---|
| GLBA (Privacy and Safeguards Rules) | Financial services to businesses and their employees; nonpublic personal information |
| State money transmitter licences; NYDFS Part 500 | Moves payroll and payment funds; licensed in New York |
| Bank Secrecy Act / anti-money laundering | Money services business |
| PCI DSS | Card payments through Larkspur Payments |
| SWIFT Customer Security Programme (CSCF v2026, architecture A4) | New York treasury sends cross-border payroll funding (EUR, GBP, PHP) over SWIFT; annual attestation with independent assessment |
| SOC 1 and SOC 2 | Customers rely on it for payroll and financial reporting |
| NIST SP 800-171, CMMC Level 2, DFARS cyber clauses | Larkspur Federal handles controlled unclassified information (CUI) for defense contractors |
| FedRAMP Moderate | Larkspur Federal runs in a government cloud environment for agencies |
| HIPAA | On-site clinic in Denver keeps medical records (healthcare provider); the company health plan holds employee health information |
| GDPR, UK GDPR | Dublin and London offices; EU and UK customers and employees |
| Philippine Data Privacy Act | Manila staff and processing; transfers from the EU need safeguards |
| US state privacy laws (e.g. California) | Customers' employees and Larkspur staff in many states |

### Leadership
```
Board of Directors
├─ Audit Committee ── Internal Audit (administratively to the CFO)
└─ Risk Committee ─── CRO and CSO report directly

CEO
├─ Chief Financial Officer
├─ Chief Operating Officer
├─ Chief Technology Officer
├─ Chief Product Officer
├─ Chief Risk Officer ── enterprise risk, compliance, privacy
├─ Chief Security Officer (CSO) ── cyber, operational risk, physical security
├─ General Counsel
├─ Chief Human Resources Officer ── includes the on-site clinic
└─ Chief Revenue Officer
```
- **CSO vs CISO:** the CSO is the overall security executive (cyber, operational risk, physical security and resilience) and reports to the CEO and the Board risk committee. The CISO runs the technology side under the CSO and is the designated CISO for NYDFS Part 500. Security GRC reports to the CSO, outside the CISO's line, so the CISO's controls are tested independently.
- **Clinic:** under the Chief Human Resources Officer, in Denver: 1 physician, 2 nurses, 1 medical assistant.

### Risk, security and audit organizations
```
Chief Risk Officer                                      (12)
├─ VP, Enterprise Risk (strategic and financial risk)
│   └─ 2 risk analysts / assessors
├─ VP, Compliance (Chief Compliance Officer)
│   ├─ BSA/AML Officer
│   ├─ 1 compliance analyst (money transmitter licensing, regulatory exams)
│   └─ 1 EU compliance analyst (Dublin)
└─ Chief Privacy Officer
    ├─ EU Data Protection Officer (Dublin)
    ├─ HIPAA Privacy Officer (Denver)
    └─ 1 privacy analyst (privacy impact assessments, individual rights requests)

Chief Security Officer (CSO)                            (44)
├─ CISO (designated CISO for NYDFS)
│   ├─ Security architecture and engineering (6)
│   ├─ Security operations: SOC, threat hunting, incident response (10)
│   ├─ Application security: code review, pen testing (5)
│   └─ Identity and access management (2)
├─ Director, Security GRC (also HIPAA Security Officer)
│   └─ 5 analysts: security policies and standards, control testing,
│      security risk, FedRAMP and CMMC programs, audit support
├─ VP, Operational Risk
│   ├─ 2 operational risk analysts
│   ├─ 2 compliance analysts: PCI DSS, SOC reports, regulatory change
│   └─ Director, Third-Party Risk
│       └─ 2 third-party risk analysts
└─ VP, Physical Security & Resilience
    ├─ 2 physical security specialists
    └─ Director, Business Continuity & Disaster Recovery
        └─ 1 BC/DR analyst

Chief Audit Executive (to the Board Audit Committee)    (5)
├─ IT Audit Manager
├─ 2 auditors
└─ 1 audit data analyst
(outside firms perform the SOC, PCI and FedRAMP assessments)
```

### Which roles use which GRC modules
| Module | Main users at Larkspur Pay |
|---|---|
| Governance | Director, Security GRC (security policies and standards); Chief Privacy Officer (privacy policies); VP Compliance; CSO and CRO as approvers; every employee for attestations |
| Risk | VP Enterprise Risk and analysts (strategic, financial, enterprise); VP Operational Risk and analysts (operational); CSO and CRO as approvers; business unit heads as risk owners |
| Controls | Director, Security GRC and analysts (library, testing); control owners across IT, engineering and operations; Internal Audit |
| Findings & Issues | Internal Audit; security GRC; application security (pen test and code review findings); external auditors' findings logged by compliance |
| Compliance | Operational risk compliance analysts (PCI DSS, SOC reports, regulatory change); VP Compliance (licensing, BSA/AML); Director Security GRC (FedRAMP, CMMC) |
| Assessments | Third-party risk (vendor); privacy (PIA); application security (code review, pen test); BC/DR (business continuity, disaster recovery); physical security (facility); security operations (threat hunting) |
| Foundation | HR (people), IT and engineering (applications, assets), facilities (sites), procurement (vendors) |
| Administration | GRC platform admins in Security GRC |

### Headcount by department
| Division (leader) | People | Sites |
|---|---|---|
| Operations (Chief Operating Officer): customer support 66, payroll and payment operations 40, corporate IT 14, workplace 4 | 124 | Denver 57 · Manila 46 · Dublin 12 · London 9 |
| Technology (Chief Technology Officer): engineering 86, infrastructure and SRE 25 | 111 | Denver 81 · Dublin 30 |
| Sales and Marketing (Chief Revenue Officer): sales, marketing, customer success | 72 | New York 25 · London 30 · Denver 10 · Dublin 7 |
| Larkspur Federal (President, Larkspur Federal): federal sales, engineering and operations, support | 50 | Arlington |
| Security (Chief Security Officer) | 44 | Denver 27 · Dublin 6 · Manila 5 · Arlington 4 · New York 2 |
| Finance (Chief Financial Officer) | 30 | New York 18 · Denver 10 · Dublin 2 |
| People incl. the clinic (Chief Human Resources Officer) | 22 | Denver 14 · Manila 4 · Dublin 3 · London 1 |
| Product (Chief Product Officer) | 20 | Denver 14 · Dublin 6 |
| Risk (Chief Risk Officer) | 12 | Denver 7 · New York 3 · Dublin 2 |
| Legal (General Counsel) | 8 | Denver 3 · New York 2 · Dublin 2 · Arlington 1 |
| Internal Audit | 5 | Denver |
| Executive Office | 2 | Denver |
| **Total** | **500** | Denver 230 · Dublin 70 · Arlington 55 · Manila 55 · New York 50 · London 40 |

"CRO" always means Chief Risk Officer; the sales leader is always written out as Chief Revenue Officer. Larkspur Federal's 50 people are counted in their own division, so Operations, Technology, and Sales and Marketing are smaller than in the first draft.

### Security operations coverage
Security operations (10 people) follows the sun for 24x7 coverage: Denver 3, Dublin 2, Manila 4, Arlington 1.
- Manila analysts must not access Larkspur Federal systems (US persons only), so federal monitoring outside Arlington hours relies on Denver on-call staff. This is a **known gap**, seeded as a risk in the register.

### Larkspur Federal
Larkspur Federal is its own **division** in the business hierarchy, based in Arlington (50 people), led by the President, Larkspur Federal, who reports to the CEO: federal sales, federal engineering and operations, and federal support. Arlington also hosts security, legal and physical security staff from other divisions. Everyone in Arlington must be a US person; it has its own applications and assets in the government cloud environment and handles CUI. This exercises business-unit scoping in the GRC platform (e.g. risks and controls visible only to the federal division and company-wide roles).

### Technology
- **Cloud:** AWS. Commercial products in us-west-2 (primary) and us-east-2 (recovery); EU customer data in eu-west-1 (Ireland). Larkspur Federal in AWS GovCloud (US).
- **Names:** real products and technology vendors are used for realism. Everything recorded about them (tiers, scores, findings, contracts, incidents) is fictional. Banks and professional-services firms (auditors, law firms, staffing, facilities providers, the health plan administrator) are fictional, so no real firm appears to audit, advise or bank for Larkspur Pay.

### Applications (about 40)
**Customer-facing products and services (5)**
| Application | Notes |
|---|---|
| Larkspur Payroll | Web app for employers: payroll runs, tax filing, year-end forms |
| Larkspur Payments | Invoice payments, card acceptance, ACH collections |
| Larkspur Federal | Payroll for defense contractors and agencies, in GovCloud; CUI |
| Employee mobile app | Pay stubs, tax forms, direct deposit changes for customers' employees |
| Public API and partner integrations | Accounting and HR system connectors |

**Internal platform components (15)**
Payroll calculation engine · Tax filing service · Funds movement and ACH origination · Card processing gateway · Ledger and reconciliation · Customer onboarding and KYB/KYC · Fraud detection · Billing · Customer admin console · Data warehouse (Snowflake) · Notification service (email, SMS) · Document service (pay stubs, W-2s) · Customer identity service · Federal CUI document vault (GovCloud) · Internal support console

**Corporate systems (20)**
| System | Use |
|---|---|
| Workday | HR system of record (people, HR details) |
| Greenhouse | Recruiting |
| NetSuite | Finance and accounting |
| Salesforce | CRM |
| Zendesk | Customer support |
| Okta | Workforce identity and SSO |
| Microsoft 365 | Email, documents |
| Slack | Messaging |
| Jira and Confluence | Engineering work tracking, wiki |
| GitHub Enterprise | Source code |
| ServiceNow | IT service management and CMDB |
| Jamf | Mac device management |
| CrowdStrike Falcon | Endpoint detection and response |
| Splunk | SIEM and logging |
| Wiz | Cloud security posture |
| Proofpoint | Email security |
| KnowBe4 | Security awareness training |
| athenahealth | Clinic electronic health records (PHI) |
| Verkada | Physical access control and cameras |
| DocuSign | Contracts and e-signatures |

### Key vendors (about 60 in total)
| Tier | Vendors |
|---|---|
| Critical (5) | AWS (incl. GovCloud) · Front Range National Bank (fictional sponsor bank) · Adyen (card processing) · Okta · Plaid (bank account verification) |
| High (12) | Workday · Salesforce · Zendesk · Microsoft · Snowflake · GitHub · CrowdStrike · Splunk · athenahealth · Checkr (background checks) · Twilio (SMS and voice) · Manila office facilities provider |
| Medium (~20) and Low (~23) | Generated: other SaaS tools, consultants, office suppliers, the health plan administrator, outside audit firms, legal counsel, recruiters, travel |

### Facilities and secure areas
Each site is a Facility in Foundation (Site › Building › Secure area). No data centers: production runs in AWS.

| Secure area | Site | Purpose and controls |
|---|---|---|
| Clinic records room | Denver | Paper medical records and the clinic workstation; HIPAA physical safeguards; clinic staff only |
| CUI room | Arlington | Federal work and CUI; US persons only; badge plus PIN; visitor log |
| SWIFT operations room | New York | Dedicated SWIFT operator terminals and jump server access (SWIFT secure zone); treasury operators only; badge plus PIN; cameras |
| SOC room | Denver | Security operations; security staff only |
| SOC room | Manila | Security operations (follow-the-sun shift); no access to federal systems |
| Network closet | Every site | Comms equipment; IT and facilities only |

### History (2024–2026)
Three years of history so trends, reviews and repeat findings can be tested.
- **Audits and assessments:** SOC 1 and SOC 2 Type II each year; PCI DSS assessment each year; FedRAMP annual assessment each year since authorization; SWIFT CSP attestation each year; a 2025 NYDFS examination with findings; internal audits on the Internal Audit plan.
- **Governance:** policy and standard versions with revision history; annual reviews; exceptions, some expired.
- **Risk:** risk register with score changes over three years, including the federal monitoring gap.

**Incidents**
| Year | Incident | What it exercises |
|---|---|---|
| 2024 | Payroll redirect fraud: a phished customer admin changed employees' direct deposit; funds lost | Findings on MFA and change alerts; risk re-scoring; customer notification |
| 2025 | Vendor breach at the background-check provider exposed applicant data, including EU applicants | Third-party risk; GDPR 72-hour notification; vendor reassessment |
| 2025 | Lost clinic laptop (encrypted) | HIPAA four-factor assessment concluding low probability of compromise; no notification, decision documented |
| 2026 | Ransomware attempt stopped by EDR in Manila; no payment | NYDFS 72-hour assessment; incident review; control effectiveness |

### Data types
| Data type | Held in | Classification | Rules |
|---|---|---|---|
| Customers' employee payroll data (SSN, bank account, pay, tax withholding) | Larkspur Payroll, payroll engine, document service, data warehouse | Restricted | GLBA nonpublic personal information; state privacy laws |
| Customer business (KYB) data, including beneficial owners' IDs | Onboarding and KYB/KYC | Restricted | BSA/AML |
| Cardholder data | Adyen (Larkspur stores tokens only, never full card numbers) | Restricted | PCI DSS |
| CUI (federal customers' payroll records and contracts) | Larkspur Federal, federal CUI document vault | Restricted | NIST SP 800-171, CMMC, DFARS |
| Employee personal data (HR) | Workday | Confidential | All sites; GDPR for Dublin and London staff; Philippine Data Privacy Act for Manila |
| Employee health information (PHI) | athenahealth (clinic), health plan administrator | Restricted | HIPAA |
| EU and UK personal data | eu-west-1, Dublin and London systems | Confidential or Restricted | GDPR, UK GDPR |
| Applicant and background-check data | Greenhouse, Checkr | Confidential | FCRA, GDPR |
| SWIFT payment messages | SWIFT secure zone | Restricted | SWIFT CSP |
| Source code | GitHub Enterprise | Confidential | Intellectual property |
| Security logs | Splunk | Confidential | Contain personal data |
| Financial reporting data | NetSuite | Confidential | SOC 1 |

### Files
In `GRC Platform/Larkspur Pay/`:
- `larkspur-pay.profile.yaml`: this profile in machine-readable form (the generator's input)
- `Generator Handoff.md`: instructions for the generator project
- `reference/generate.py`: the reference generator; `reference/out/`: the generated Larkspur Pay files, validation report and README

## Part 2 — Output contract
The generator's output must load into the GRC platform through Foundation's spreadsheet import (Foundation 5.8) without manual fixes. The [[Foundation Build Document]] is the source of truth for fields; where this section and that document differ, that document wins and this one gets updated.

### 2.1 Inputs
- **Company profile file** (YAML or JSON): everything in Part 1, in machine-readable form. Each value has a default, so a new company needs only the answers that differ.
- **Seed** (a number). The same profile and seed must always produce byte-identical output, so tests can rely on it.

### 2.2 Files
UTF-8 CSV, one header row, ISO 8601 dates (`2026-11-25`), multi-value cells separated by `|`, empty cell for no value. One file per area, in load order:

| # | File | Contents | Match key (for re-import without duplicates) |
|---|---|---|---|
| 1 | `business_units.csv` | Unit code, name, level (Company, Division, Business unit, Department), parent unit code, pass-through, head (employee ID), legal entities, primary site ID, status | Unit code |
| 2 | `facilities_sites.csv` | Site ID, name, site type, address, city, state/province, postal code, country, region, time zone, ownership, landlord, lease end, facility manager, business units present, status | Site ID |
| 3 | `facilities_buildings.csv` | Building ID, site ID, name, floors, area | Building ID |
| 4 | `facilities_secure_areas.csv` | Area ID, name, building ID, area type, access control, area owner | Area ID |
| 5 | `people.csv` | Profile only: employee ID or contractor ID, legal first and last name, preferred name, work email, work phone, job title, business unit code, manager (employee ID), site ID, work country, state, city, region, time zone, delegate, employment status | Employee ID, then contractor ID, then work email |
| 6 | `people_hr.csv` | Restricted HR details, kept separate: ID, employment type, job level, job family, cost center, legal entity, vendor code (vendor contacts), hire date, termination date, leave dates | Same as people |
| 7 | `groups.csv`, `group_members.csv` | Groups (e.g. "Security operations", "Clinic staff") and members | Group name; group + person |
| 8 | `data_types.csv` | Name, category, classification, regulatory tags, data steward | Name |
| 9 | `vendors.csv` | Vendor code, name, website domain, vendor type, tier (Critical, High, Medium, Low), status, relationship owner, business units using, data types accessed, system access, country, contract start, end and renewal | Vendor code, then website domain |
| 10 | `products.csv`, `services.csv`, `business_functions.csv` | Per Foundation, with impact profiles for products and services | Record code |
| 11 | `applications.csv` | Per Foundation, including impact profile columns, data types handled, vendor, hosting model, internet-facing, users, sign-in method, lifecycle | Record code, then source ID |
| 12 | `application_roles.csv` | Application, role (business owner, technical owner, data owner, security contact, privacy contact, …), person | Application + role + person |
| 13 | `assets.csv` | Per Foundation (asset type, environment, hosting, cloud provider/account/region, lifecycle, …) | The ordered asset keys: source system + source ID, then cloud resource ID, then serial number, then hostname |
| 14 | `links_*.csv` | One file per Foundation relationship (application–service, application–asset, asset–data type, vendor–data type, person–site, …) | Both ends |

Later phases add GRC files (risks, policies and statements, controls and tests, findings, incidents, assessments) once those modules' import templates exist. The history in Part 1 is the content they will carry.

### 2.3 Consistency rules (the generator must check these and fail if any is broken)
- **Hierarchy:** exactly one Company; every unit's parent is the level directly above (pass-through units where a level is skipped); no cycles.
- **People:**
  - Every person belongs to a unit that exists.
  - Every manager exists and is active.
  - No manager loops.
  - The CEO is the only active person without a manager.
  - Job titles match the org charts in Part 1, and every GRC role in "Which roles use which GRC modules" is filled by an active person.
- **Locations:** each person's site, country, city and time zone agree; headcount per site and department matches Part 1 within ±2.
- **Larkspur Federal:** its staff are US persons in US locations; no Manila person is linked to a federal application, asset or secure area.
- **Ownership:** every application, vendor, data type, site and secure area has an owner who is an active person; terminated people own nothing.
- **Data and regulation:** an application's regulatory scope covers the regulations of its data types (e.g. PHI → HIPAA); a vendor's tier is at least High if it accesses Restricted data (STD-0003 5.3).
- **Leavers:** about 8% of people per year are terminated, with termination dates after hire dates; terminated people stay in the files (Terminated is the end state).
- **History:** dates fall in 2024–2026 and in a sensible order (an assessment after the vendor's onboarding, a finding after its audit).

### 2.4 Clearly fictional
- **Emails:** only `@larkspurpay.example` (and `.example` domains for vendor contacts).
- **Phone numbers:**
  - US: 555-0100 to 555-0199.
  - UK: Ofcom drama numbers.
  - Elsewhere: a format that cannot be dialled.
- **People:** names built from common first and last names; never public figures.
- **Addresses:** real cities with invented street addresses.
- **Labels:** every file carries a header comment or companion README saying the data is synthetic.
- **Vendors:** real names, with the fictional sponsor bank; all scores, findings and contract terms are invented.

### 2.5 Outputs besides the files
- **Validation report:** counts per file and site, and the result of every rule in 2.3.
- **Profile echo:** the resolved profile (answers plus defaults) used for the run, so any output can be reproduced.
