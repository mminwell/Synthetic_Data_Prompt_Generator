#!/usr/bin/env python3
"""Reference generator: company profile (YAML) + seed -> Foundation import CSVs.

Usage:  python generate.py ../larkspur-pay.profile.yaml out/
Needs:  pip install pyyaml faker==37.4.0   (pinned: same inputs -> same output)

This is the reference implementation for the Synthetic Data Generator project.
Its logic is deliberately plain (rules, no AI) so it can be ported to the
browser. See "Generator Handoff.md".
"""
import csv
import datetime as dt
import hashlib
import math
import os
import random
import re
import sys
from collections import Counter, defaultdict

import yaml
from faker import Faker

D = dt.date

# ---------------------------------------------------------------------------
# Load
# ---------------------------------------------------------------------------
PROFILE_PATH = sys.argv[1] if len(sys.argv) > 1 else "profile.yaml"
OUT = sys.argv[2] if len(sys.argv) > 2 else "out"
P = yaml.safe_load(open(PROFILE_PATH, encoding="utf-8"))

def _check_profile(x, path="profile"):
    """Catch YAML slips such as an unquoted comma that splits a value into a stray key."""
    if isinstance(x, dict):
        for k, v in x.items():
            if v is None:
                raise SystemExit(f"Profile error at {path}/{k}: empty value (quote values that contain commas)")
            _check_profile(v, f"{path}/{k}")
    elif isinstance(x, list):
        for i, v in enumerate(x):
            _check_profile(v, f"{path}[{i}]")
_check_profile(P)
SEED = int(P.get("seed", 1))
rng = random.Random(SEED)
CO = P["company"]
AS_OF = CO["as_of"] if isinstance(CO["as_of"], D) else D.fromisoformat(str(CO["as_of"]))
HIST = CO["history_start"] if isinstance(CO["history_start"], D) else D.fromisoformat(str(CO["history_start"]))
DOMAIN = CO["email_domain"]

SITES = {s["id"]: s for s in P["sites"]}
UNITS = {u["code"]: u for u in P["units"]}
POS = P["positions"]
DTYPES = {d["key"]: d for d in P["data_types"]}
VENDORS = {v["code"]: v for v in P["vendors"]}

def d(x):
    return x if isinstance(x, D) else D.fromisoformat(str(x))

def sub_rng(*parts):
    """Independent, stable random stream per item, so adding one record
    does not reshuffle everything after it."""
    h = hashlib.sha256(("|".join(map(str, (SEED,) + parts))).encode()).hexdigest()
    return random.Random(int(h[:16], 16))

def rand_date(r, start, end):
    start, end = d(start), d(end)
    if end <= start:
        return start
    return start + dt.timedelta(days=r.randrange((end - start).days + 1))

# ---------------------------------------------------------------------------
# Names (fictional; common names only)
# ---------------------------------------------------------------------------
FAKERS = {}
for loc in ("en_US", "en_IE", "en_GB"):
    f = Faker(loc)
    f.seed_instance(SEED)
    FAKERS[loc] = f
LOCALE = {"US": "en_US", "IE": "en_IE", "GB": "en_GB"}
PH_FIRST = ["Maria", "Jose", "Mark", "John Paul", "Angelica", "Kristine", "Jericho", "Rhea", "Paolo", "Carlo",
            "Joy", "Grace", "Jasmine", "Miguel", "Bea", "Nicole", "Ramon", "Patricia", "Joshua", "Camille",
            "Andrea", "Christian", "Daniel", "Erika", "Francis", "Gabrielle", "Hazel", "Ivan", "Janine", "Kevin",
            "Lorraine", "Marvin", "Noel", "Olivia", "Pia", "Rafael", "Sheila", "Tristan", "Vincent", "Ysabel"]
PH_LAST = ["Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "Garcia", "Mendoza", "Torres", "Tomas", "Andrada",
           "Castillo", "Flores", "Villanueva", "Ramos", "Castro", "Rivera", "Aquino", "Navarro", "Salazar",
           "Mercado", "Dela Cruz", "De Leon", "Gonzales", "Domingo", "Lopez", "Fernandez", "Aguilar", "Pascual",
           "Manalo", "Soriano", "Dizon", "Valdez", "Gutierrez", "Sison", "Lim", "Tan", "Go", "Lacson",
           "Panganiban", "Macaraeg"]

def person_name(r, country):
    if country == "PH":
        return r.choice(PH_FIRST), r.choice(PH_LAST)
    f = FAKERS[LOCALE.get(country, "en_US")]
    f.seed_instance(r.randrange(1 << 30))
    return f.first_name(), f.last_name()

USED_EMAILS = set()

def email_for(first, last, domain=DOMAIN):
    base = re.sub(r"[^a-z]", "", first.lower().split()[0]) + "." + re.sub(r"[^a-z]", "", last.lower())
    e, n = f"{base}@{domain}", 2
    while e in USED_EMAILS:
        e, n = f"{base}{n}@{domain}", n + 1
    USED_EMAILS.add(e)
    return e

# Fictional phone numbers: US main line 555-0100 with extensions; UK Ofcom
# drama range; IE and PH use an undiallable main number with extensions.
PHONE_MAIN = {"LP-DEN-HQ": "+1 303-555-0100", "LP-NYC-01": "+1 212-555-0100", "LP-ARL-01": "+1 703-555-0100",
              "LP-DUB-01": "+353 1 000 0100", "LP-LON-01": None, "LP-MNL-01": "+63 2 0000 0100"}
EXT = Counter()

def phone_for(site_id):
    EXT[site_id] += 1
    if site_id == "LP-LON-01":
        return f"+44 20 7946 0{EXT[site_id]:03d}"
    return f"{PHONE_MAIN[site_id]} ext. {2000 + EXT[site_id]}"

# ---------------------------------------------------------------------------
# Business units
# ---------------------------------------------------------------------------
def division_of(code):
    u = UNITS[code]
    while u["level"] not in ("division", "company"):
        u = UNITS[u["parent"]]
    return u["code"]

def ancestors(code):
    out, u = [], UNITS[code]
    while u.get("parent"):
        out.append(u["parent"])
        u = UNITS[u["parent"]]
    return out

COST_CENTER = {c: f"CC-{c}" for c in UNITS}

# ---------------------------------------------------------------------------
# People
# ---------------------------------------------------------------------------
people = []          # active and terminated employees/contractors
by_pos = {}          # position key -> person
next_emp = [10001]
next_con = [20001]

def new_id(kind):
    if kind == "contractor":
        v = next_con[0]; next_con[0] += 1
        return f"C{v}"
    v = next_emp[0]; next_emp[0] += 1
    return f"E{v}"

def job_level(title):
    t = title.lower()
    if t.startswith("chief") or t.startswith("general counsel") or t.startswith("president"):
        return "E1"
    if t.startswith("vice president") or "deputy general counsel" in t:
        return "M4"
    if t.startswith("director") or t.startswith("head of") or "chief audit" in t:
        return "M3"
    if "manager" in t or "lead" in t or t.startswith("clinic physician") or "officer" in t:
        return "M2" if "senior" in t else "M1"
    if t.startswith("senior") or "staff " in t or "principal" in t or "architect" in t:
        return "IC3"
    if t.endswith(" i") or "coordinator" in t or "assistant" in t or "representative" in t:
        return "IC1"
    return "IC2"

def make_person(r, *, title, unit, site, manager=None, position=None, kind="full_time",
                status="active", hire_from=None, hire_to=None, term_date=None):
    country = SITES[site]["country"]
    first, last = person_name(r, country)
    pid = new_id("contractor" if kind == "contractor" else "employee")
    s = SITES[site]
    opened = d(s["opened"])
    hire_from = max(d(hire_from), opened) if hire_from else opened
    hire_to = d(hire_to) if hire_to else AS_OF - dt.timedelta(days=30)
    hire = rand_date(r, hire_from, hire_to)
    p = {
        "id": pid, "kind": kind, "first": first, "last": last, "preferred": "",
        "email": email_for(first, last), "phone": phone_for(site) if status == "active" else "",
        "title": title, "unit": unit, "manager": manager, "site": site, "position": position or "",
        "country": country, "state": s["state"], "city": s["city"], "region": s["region"], "tz": s["time_zone"],
        "status": status, "hire": hire, "term": term_date, "leave_start": None, "expected_return": None,
    }
    people.append(p)
    if position:
        by_pos.setdefault(position, []).append(p)
    return p

# 1. Named positions, in an order where managers come first.
def pos_depth(k, seen=()):
    rt = POS[k].get("reports_to")
    if not rt:
        return 0
    if rt in seen:
        raise SystemExit(f"Reporting loop in positions at {k}")
    return 1 + pos_depth(rt, seen + (k,))

for key in sorted(POS, key=lambda k: (pos_depth(k), k)):
    spec = POS[key]
    for i in range(int(spec.get("count", 1))):
        r = sub_rng("pos", key, i)
        lvl = job_level(spec["title"])
        # senior people tend to have been here longer
        span = {"E1": (CO["founded"], 2019), "M4": (2014, 2022), "M3": (2015, 2023)}.get(lvl)
        hf, ht = (f"{span[0]}-01-01", f"{span[1]}-12-31") if span else (None, None)
        mgr = by_pos[spec["reports_to"]][0]["id"] if spec.get("reports_to") else None
        make_person(r, title=spec["title"], unit=spec["unit"], site=spec["site"], manager=mgr, position=key,
                    hire_from=hf, hire_to=ht)

def head_of(code):
    """Person heading a unit (walks up if the head position is not set)."""
    u = UNITS[code]
    while True:
        if u.get("head") and u["head"] in by_pos:
            return by_pos[u["head"]][0]
        u = UNITS[u["parent"]]

# 2. Generated staff per unit and site: headcount minus named positions.
named_count = Counter((p["unit"], p["site"]) for p in people)
for code, u in UNITS.items():
    for site, n in (u.get("headcount") or {}).items():
        fill = n - named_count[(code, site)]
        if fill < 0:
            raise SystemExit(f"{code} at {site}: {named_count[(code, site)]} named positions exceed headcount {n}")
        if fill == 0:
            continue
        ladder = P["ladders"].get(code) or [f"{u['name']} Specialist"]
        head = head_of(code)
        leads = []
        n_leads = fill // 8
        for i in range(n_leads):
            r = sub_rng("lead", code, site, i)
            leads.append(make_person(r, title=f"Team Lead, {u['name']}", unit=code, site=site, manager=head["id"],
                                     hire_to=AS_OF - dt.timedelta(days=400)))
        for i in range(fill - n_leads):
            r = sub_rng("staff", code, site, i)
            kind = "contractor" if r.random() < CO.get("contractor_share", 0) and division_of(code) in ("TEC", "OPS", "REV") else "full_time"
            title = ladder[min(int(r.random() ** 1.4 * len(ladder)), len(ladder) - 1)]
            mgr = leads[i % len(leads)]["id"] if leads else head["id"]
            make_person(r, title=title, unit=code, site=site, manager=mgr, kind=kind)

ACTIVE_COUNT = sum(1 for p in people if p["status"] == "active")

# 3. Leavers: annual rate across generated (non-named) roles, kept as Terminated.
fill_slots = [p for p in people if not p["position"] and not p["title"].startswith("Team Lead")]
for year in range(HIST.year, AS_OF.year + 1):
    year_end = min(D(year, 12, 31), AS_OF)
    frac = ((year_end - D(year, 1, 1)).days + 1) / 365
    n_leavers = round(ACTIVE_COUNT * CO["annual_leaver_rate"] * frac)
    for i in range(n_leavers):
        r = sub_rng("leaver", year, i)
        like = r.choice(fill_slots)  # leaver held a similar job in the same team
        term = rand_date(r, D(year, 1, 1), year_end)
        p = make_person(r, title=like["title"], unit=like["unit"], site=like["site"], manager=like["manager"],
                        kind=like["kind"], status="terminated", hire_to=term - dt.timedelta(days=60), term_date=term)

# 4. A few people on leave.
r = sub_rng("leave")
for p in r.sample([p for p in fill_slots if p["status"] == "active"], 6):
    p["status"] = "on_leave"
    p["leave_start"] = rand_date(r, AS_OF - dt.timedelta(days=60), AS_OF - dt.timedelta(days=5))
    p["expected_return"] = p["leave_start"] + dt.timedelta(days=r.choice([42, 84, 112]))

# 5. Vendor contacts (people records, not employees).
vendor_contacts = {}
for code, v in VENDORS.items():
    if v["tier"] not in ("Critical", "High"):
        continue
    r = sub_rng("vcontact", code)
    country = v.get("country", "US") if v.get("country") in ("US", "IE", "GB", "PH") else "US"
    first, last = person_name(r, country)
    stem = re.sub(r"[^a-z0-9]", "", v["name"].lower().split(" (")[0])[:20]
    owner = by_pos[v["owner"]][0]
    vc = {"id": f"VC-{code[2:]}", "kind": "vendor_contact", "first": first, "last": last, "preferred": "",
          "email": email_for(first, last, f"{stem}.example"), "phone": "", "title": f"Account Manager, {v['name']}",
          "unit": owner["unit"], "manager": None, "site": "", "position": "", "country": v.get("country", "US"),
          "state": "", "city": "", "region": "", "tz": "", "status": "active", "hire": None, "term": None,
          "leave_start": None, "expected_return": None, "vendor": code}
    vendor_contacts[code] = vc

def pid(key):
    return by_pos[key][0]["id"]

# ---------------------------------------------------------------------------
# Groups
# ---------------------------------------------------------------------------
groups = defaultdict(set)
for p in people:
    if p["status"] == "terminated":
        continue
    if p["unit"] == "SEC-CYB-OPS":
        groups["Security operations"].add(p["id"])
    if p["unit"] == "PPL-CLN":
        groups["Clinic staff"].add(p["id"])
    if p["unit"] == "FIN-TRS-SWF":
        groups["SWIFT operators"].add(p["id"])
    if p["position"] in ("ceo", "cfo", "coo", "cto", "cpdo", "cro", "cso", "gc", "chro", "crevo", "fed_president"):
        groups["Executive leadership team"].add(p["id"])
    if division_of(p["unit"]) == "FED" or p["site"] == "LP-ARL-01":
        groups["Federal access (US persons)"].add(p["id"])
for k in ("secgrc_dir", "grc_policy"):
    groups["GRC platform administrators"].add(pid(k))
for k in ("cso", "cro", "ceo", "cfo", "gc"):
    groups["Risk committee attendees"].add(pid(k))
# Denver staff who hold roles on federal systems must be US persons too.
for k in ("cso", "ciso", "soc_mgr", "ir_lead", "threat_hunter", "seceng_dir", "secgrc_dir", "iam_mgr",
          "appsec_mgr", "sre_head", "bcdr_dir", "bcdr_analyst", "privacy_analyst", "cpo_privacy", "it_dir", "vp_physres"):
    groups["Federal access (US persons)"].add(pid(k))

# ---------------------------------------------------------------------------
# Applications, roles, links
# ---------------------------------------------------------------------------
REGS = P["regulations_by_data_type"]

def app_regs(a):
    regs = []
    for k in a.get("data", []):
        regs += REGS.get(k, [])
    if a.get("fin_sig"):
        regs.append("SOC 1")
    if a["kind"] == "product" or a.get("users") in ("External", "Both") and a["kind"] != "corporate":
        regs.append("SOC 2")
    if "payroll" in a.get("data", []) and a.get("internet_facing"):
        regs.append("NYDFS Part 500")
    out = []
    for x in regs:
        if x not in out:
            out.append(x)
    return out

def app_countries(a):
    c = ["US"]
    if "eu" in a.get("data", []):
        c += ["IE", "GB"]
    if a.get("federal"):
        c = ["US"]
    return c

app_roles = []
def add_role(app, role, key):
    app_roles.append({"application_source_id": app["id"], "application": app["name"], "role": role, "person_id": pid(key)})

for a in P["applications"]:
    inhouse = a["hosting"].startswith("Built")
    fed = bool(a.get("federal"))
    add_role(a, "Business owner", a["owner"])
    add_role(a, "Technical owner", a["tech"])
    restricted = [k for k in a.get("data", []) if DTYPES[k]["classification"] == "Restricted"]
    add_role(a, "Data owner", DTYPES[restricted[0]]["steward"] if restricted else a["owner"])
    add_role(a, "Security contact", "fedramp_pm" if fed else ("appsec_mgr" if inhouse else "seceng_dir"))
    privacy = "hipaa_po" if "phi" in a.get("data", []) else ("privacy_analyst" if fed else ("dpo" if "eu" in a.get("data", []) else "privacy_analyst"))
    if a.get("data"):
        add_role(a, "Privacy contact", privacy)
    add_role(a, "Access approver", a["owner"])
    if a.get("vendor"):
        add_role(a, "Vendor manager", VENDORS[a["vendor"]]["owner"])
    add_role(a, "Continuity coordinator", "bcdr_analyst")
    add_role(a, "Disaster recovery lead", "fed_eng_dir" if fed else ("sre_head" if inhouse else "it_dir"))
    add_role(a, "Emergency contact", "fed_eng_dir" if fed else ("sre_head" if inhouse else "it_dir"))
    exec_key = UNITS[division_of(by_pos[a["owner"]][0]["unit"])]["head"]
    add_role(a, "Executive sponsor", exec_key)

# ---------------------------------------------------------------------------
# Assets
# ---------------------------------------------------------------------------
assets = []
asset_links_app = []
asset_links_dt = []

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

ACCOUNTS = {"us": ("lp-prod-us", "100000000101", "us-west-2"), "eu": ("lp-prod-eu", "100000000102", "eu-west-1"),
            "dr": ("lp-dr-us", "100000000103", "us-east-2"), "gov": ("lp-federal-prod", "100000000201", "us-gov-west-1"),
            "sec": ("lp-security", "100000000104", "us-west-2"), "swift": ("lp-swift-securezone", "100000000105", "us-east-2")}
ipn = [0]

def private_ip(r, block):
    ipn[0] += 1
    return f"10.{block}.{(ipn[0] // 250) % 250}.{ipn[0] % 250 + 2}"

def add_asset(r, *, name, ci_class, env, hosting, owner_key, source, acct=None, location="", os_="", software="",
              manufacturer="", model="", serial="", services=(), classification="", install=None, eol=None, hostname=None,
              lifecycle="In use", resource_type=None):
    aid = f"CI{len(assets) + 100001}"
    cloud_id = ""
    prov = acct_id = region = ""
    if acct:
        alias, acct_id, region = ACCOUNTS[acct]
        part = "aws-us-gov" if acct == "gov" else "aws"
        cloud_id = f"arn:{part}:{resource_type}:{region}:{acct_id}:{slug(name)}"
        prov = "AWS GovCloud (US)" if acct == "gov" else "AWS"
    a = {"source_system": source, "source_id": aid, "cloud_resource_id": cloud_id, "name": name,
         "asset_type": ci_class, "environment": env, "hostname": hostname if hostname is not None else (slug(name)[:40] if not acct else ""),
         "ip_addresses": private_ip(r, {"us": 10, "eu": 20, "dr": 30, "gov": 40, "sec": 11, "swift": 50}.get(acct, 60)) if ci_class not in ("Storage bucket", "Encryption key") else "",
         "os": os_, "software": software, "manufacturer": manufacturer, "model": model, "serial_number": serial,
         "hosting_type": hosting, "cloud_provider": prov, "cloud_account": acct_id, "cloud_region": region,
         "location": location, "technical_owner": pid(owner_key) if owner_key else "", "services_supported": "|".join(services),
         "data_classification": classification, "cost_center": "", "lifecycle_status": lifecycle,
         "install_date": install or rand_date(r, "2019-01-01", AS_OF - dt.timedelta(days=60)),
         "end_of_life_date": eol or "", "last_patched_date": "", "discovery_source": source,
         "last_seen": AS_OF if lifecycle == "In use" else ""}
    if lifecycle == "In use" and ci_class in ("Virtual machine", "Container cluster", "Database", "Laptop", "Workstation", "Firewall", "Switch", "Wireless controller", "Server"):
        a["last_patched_date"] = AS_OF - dt.timedelta(days=r.randrange(3, 45))
    assets.append(a)
    return a

SVC = {s["key"]: s for s in P["services"]}
r = sub_rng("assets")
# Shared platform
shared = {
    "us": add_asset(r, name="eks-prod-us-west-2", ci_class="Container cluster", env="Production", hosting="Cloud", owner_key="sre_head", source="AWS Config", acct="us", software="Amazon EKS 1.31", resource_type="eks", services=["svc_payroll", "svc_cards", "svc_ess"]),
    "eu": add_asset(r, name="eks-prod-eu-west-1", ci_class="Container cluster", env="Production", hosting="Cloud", owner_key="sre_head", source="AWS Config", acct="eu", software="Amazon EKS 1.31", resource_type="eks", services=["svc_payroll", "svc_support"]),
    "dr": add_asset(r, name="eks-dr-us-east-2", ci_class="Container cluster", env="Disaster recovery", hosting="Cloud", owner_key="sre_head", source="AWS Config", acct="dr", software="Amazon EKS 1.31", resource_type="eks", services=["svc_payroll", "svc_cards"]),
    "gov": add_asset(r, name="eks-federal-us-gov-west-1", ci_class="Container cluster", env="Production", hosting="Cloud", owner_key="fed_eng_dir", source="AWS Config", acct="gov", software="Amazon EKS 1.31", resource_type="eks", services=["svc_federal"]),
}
for acct in ("us", "eu", "gov"):
    add_asset(r, name=f"alb-public-{ACCOUNTS[acct][2]}", ci_class="Load balancer", env="Production", hosting="Cloud", owner_key="fed_eng_dir" if acct == "gov" else "sre_head", source="AWS Config", acct=acct, resource_type="elasticloadbalancing")
    add_asset(r, name=f"kms-data-key-{ACCOUNTS[acct][2]}", ci_class="Encryption key", env="Production", hosting="Cloud", owner_key="fed_eng_dir" if acct == "gov" else "seceng_dir", source="AWS Config", acct=acct, resource_type="kms", classification="Restricted")
for a in P["applications"]:
    if not a["hosting"].startswith("Built"):
        continue
    fed = bool(a.get("federal"))
    acct = "gov" if fed else "us"
    owner = "fed_eng_dir" if fed else "sre_head"
    cls = max((DTYPES[k]["classification"] for k in a.get("data", [])), key=lambda c: ["Internal", "Confidential", "Restricted"].index(c), default="Internal")
    svc = a.get("services", [])
    dep = add_asset(sub_rng("svc", a["id"]), name=f"{slug(a['name'])}-service", ci_class="Container service", env="Production", hosting="Cloud", owner_key=owner, source="AWS Config", acct=acct, resource_type="eks", services=svc, classification=cls)
    asset_links_app.append((a["id"], dep["source_id"]))
    asset_links_app.append((a["id"], shared["gov" if fed else "us"]["source_id"]))
    if a.get("data") and set(a["data"]) - {"code", "logs"}:
        db = add_asset(sub_rng("db", a["id"]), name=f"rds-{slug(a['name'])[:30]}", ci_class="Database", env="Production", hosting="Cloud", owner_key=owner, source="AWS Config", acct=acct, resource_type="rds", software="Amazon Aurora PostgreSQL 16", services=svc, classification=cls)
        asset_links_app.append((a["id"], db["source_id"]))
        for k in a["data"]:
            asset_links_dt.append((db["source_id"], DTYPES[k]["name"]))
        if "eu" in a["data"]:
            dbe = add_asset(sub_rng("dbeu", a["id"]), name=f"rds-{slug(a['name'])[:27]}-eu", ci_class="Database", env="Production", hosting="Cloud", owner_key=owner, source="AWS Config", acct="eu", resource_type="rds", software="Amazon Aurora PostgreSQL 16", services=svc, classification=cls)
            asset_links_app.append((a["id"], dbe["source_id"]))
            asset_links_dt.append((dbe["source_id"], DTYPES["eu"]["name"]))
            asset_links_app.append((a["id"], shared["eu"]["source_id"]))
    if a["id"] in ("APP-017", "APP-019"):
        b = add_asset(sub_rng("s3", a["id"]), name=f"s3-{slug(a['name'])[:30]}", ci_class="Storage bucket", env="Production", hosting="Cloud", owner_key=owner, source="AWS Config", acct=acct, resource_type="s3", services=svc, classification=cls)
        asset_links_app.append((a["id"], b["source_id"]))
        for k in a["data"]:
            asset_links_dt.append((b["source_id"], DTYPES[k]["name"]))
# SWIFT secure zone (architecture A4) and operator terminals in New York
sz = sub_rng("swift")
for nm, cls_ in (("swift-customer-connector", "Virtual machine"), ("swift-jump-server", "Virtual machine")):
    x = add_asset(sz, name=nm, ci_class=cls_, env="Production", hosting="Cloud", owner_key="swift_mgr", source="AWS Config", acct="swift", resource_type="ec2", os_="Red Hat Enterprise Linux 9" if "connector" in nm else "Windows Server 2022", services=["svc_funds"], classification="Restricted")
    asset_links_app.append(("APP-008", x["source_id"]))
    asset_links_dt.append((x["source_id"], DTYPES["swift"]["name"]))
for i in range(3):
    t = add_asset(sz, name=f"SWIFT operator terminal {i + 1}", ci_class="Workstation", env="Production", hosting="On-premises", owner_key="swift_mgr", source="ServiceNow", location="LP-NYC-01-SA01", os_="Windows 11 Enterprise", manufacturer="Dell", model="OptiPlex 7020", serial=f"SWT{sz.randrange(10**6, 10**7)}", hostname=f"nyc-swift-op{i + 1:02d}", services=["svc_funds"], classification="Restricted")
    asset_links_dt.append((t["source_id"], DTYPES["swift"]["name"]))
# Clinic workstation
cw = add_asset(sub_rng("clinic"), name="Clinic workstation", ci_class="Workstation", env="Production", hosting="On-premises", owner_key="it_dir", source="ServiceNow", location="LP-DEN-HQ-SA01", os_="Windows 11 Enterprise", manufacturer="Dell", model="OptiPlex 7020", serial="CLN4410782", hostname="den-clinic-ws01", classification="Restricted")
asset_links_app.append(("APP-038", cw["source_id"]))
asset_links_dt.append((cw["source_id"], DTYPES["phi"]["name"]))
# Network gear at every site, in its network closet
for sid in SITES:
    closet = next(sa["id"] for sa in P["secure_areas"] if sa["site"] == sid and sa["type"] == "Network closet")
    nr = sub_rng("net", sid)
    short = sid.split("-")[1].lower()
    owner = "phys_arl" if sid == "LP-ARL-01" else "it_dir"
    for ci, mfr, mdl in (("Firewall", "Palo Alto Networks", "PA-440"), ("Switch", "Cisco", "Catalyst 9300"), ("Switch", "Cisco", "Catalyst 9200"), ("Switch", "Cisco", "Catalyst 9200"), ("Wireless controller", "Cisco", "Catalyst 9800-L")):
        add_asset(nr, name=f"{short}-{slug(ci)}", ci_class=ci, env="Production", hosting="On-premises", owner_key="it_dir", source="ServiceNow", location=closet, manufacturer=mfr, model=mdl, serial=f"{mfr[:3].upper()}{nr.randrange(10**7, 10**8)}", hostname=f"{short}-{slug(ci)}-{nr.randrange(1, 9):02d}", services=["svc_corp_it"], eol=D(2030, 12, 31))
# Laptops: one per active or on-leave person, plus some retired ones for leavers.
# Every detail comes from md5("larkspur-pay:laptop:<person ID>") so a database
# seed can rebuild exactly the same laptops from the people (see build_seed.py).
def hexint(h, a, b):
    return int(h[a:b], 16)

for p in people:
    h = hashlib.md5(f"larkspur-pay:laptop:{p['id']}".encode()).hexdigest()
    term = p["status"] == "terminated"
    if term and hexint(h, 2, 4) / 255 > 0.2:
        continue
    mac = hexint(h, 0, 2) / 255 < (0.35 if division_of(p["unit"]) == "FIN" else 0.85)
    install = min(max(p["hire"], D(2021, 1, 1)) + dt.timedelta(days=hexint(h, 12, 16) % 365), AS_OF - dt.timedelta(days=30))
    assets.append({
        "source_system": "Jamf" if mac else "Microsoft Intune", "source_id": f"LT-{p['id']}", "cloud_resource_id": "",
        "name": f"Laptop {p['id']}", "asset_type": "Laptop", "environment": "Corporate", "hostname": f"lp-{p['id'].lower()}",
        "ip_addresses": f"10.60.{hexint(h, 18, 20)}.{hexint(h, 20, 22) % 250 + 2}",
        "os": "macOS 15" if mac else "Windows 11 Enterprise", "software": "", "manufacturer": "Apple" if mac else "Dell",
        "model": "MacBook Pro 14-inch" if mac else "Latitude 7450",
        "serial_number": ("C02" if mac else "DL") + str(hexint(h, 4, 12) % 10**8).zfill(8),
        "hosting_type": "Endpoint", "cloud_provider": "", "cloud_account": "", "cloud_region": "", "location": p["site"],
        "technical_owner": pid("it_dir"), "assigned_to": p["id"], "services_supported": "", "data_classification": "Confidential",
        "cost_center": "", "lifecycle_status": "Retired" if term else "In use", "install_date": install, "end_of_life_date": "",
        "last_patched_date": "" if term else AS_OF - dt.timedelta(days=hexint(h, 16, 18) % 42 + 3),
        "discovery_source": "Jamf" if mac else "Microsoft Intune", "last_seen": "" if term else AS_OF})
for i in range(15):
    sr = sub_rng("spare", i)
    add_asset(sr, name=f"Spare laptop {i + 1}", ci_class="Laptop", env="Corporate", hosting="Endpoint", owner_key="it_dir", source="Jamf", location="LP-DEN-HQ", os_="macOS 15", manufacturer="Apple", model="MacBook Pro 14-inch", serial=f"C02{sr.randrange(10**7, 10**8)}", hostname="", lifecycle="In stock")


# ---------------------------------------------------------------------------
# Foundation value lists (docs/design/foundation.md 5.3). Output uses these
# exact values so the GRC platform's import accepts every row.
# ---------------------------------------------------------------------------
def site_type(t):
    return {"Headquarters": "Headquarters", "Data center": "Data center", "Colocation": "Colocation",
            "Warehouse": "Warehouse", "Lab": "Lab", "Coworking": "Coworking"}.get(t, "Office")

def ownership(o):
    return o if o in ("Owned", "Leased", "Colocation") else "Leased"

def area_type(t):
    return t if t in ("Server room", "Data hall", "Network closet", "Vault", "Records room") else "Other"

def access_control(text):
    t = text.lower()
    out = [v for k, v in (("badge", "Badge"), ("biometric", "Biometric"), ("key", "Key"), ("escort", "Escort required"),
                          ("camera", "Camera"), ("pin", "PIN")) if k in t]
    return out or ["Badge"]

def vendor_type(t):
    t = t.lower()
    if "event" in t:
        return "Services"
    if any(k in t for k in ("hardware", "reseller")):
        return "Hardware"
    if any(k in t for k in ("auditor", "assessment organization", "counsel")):
        return "Consulting"
    if any(k in t for k in ("cloud infrastructure", "data platform", "cdn", "hosting")):
        return "Cloud/hosting"
    if any(k in t for k in ("saas", "identity", "security", "siem", "management", "tool", "health records", "conferencing",
                            "alerting", "training", "whiteboard", "scheduling", "video", "writing", "design", "access control")):
        return "Software"
    return "Services"

CATEGORY = {"payroll": "Financial", "kyb": "Financial", "card": "Payment card", "cui": "Other", "hr": "Employee",
            "phi": "Health", "eu": "Personal", "applicant": "Employee", "swift": "Financial", "code": "Intellectual property",
            "logs": "Other", "finrep": "Financial"}

def sign_in(s_):
    s_ = s_.lower()
    if "okta" in s_:
        return ["SSO", "MFA"]
    if "customer identity" in s_ or "vendor accounts" in s_:
        return ["Local accounts", "MFA"]
    return ["Other"]

def cap_range(v):
    return v[:1].upper() + v[1:] if v else v

def user_ranges(a):
    v = cap_range(a["users_affected"])
    if a["users"] == "Internal":
        return v, "None"
    return "Under 1,000", v

ASSET_TYPE = {"Container cluster": "Cloud resource", "Container service": "Cloud resource", "Load balancer": "Cloud resource",
              "Encryption key": "Cloud resource", "Storage bucket": "Storage", "Database": "Database",
              "Virtual machine": "Virtual machine", "Workstation": "Workstation", "Laptop": "Workstation",
              "Firewall": "Network device", "Switch": "Network device", "Wireless controller": "Network device"}
ENVIRONMENT = {"Production": "Production", "Disaster recovery": "DR", "Corporate": "Production"}
HOSTING_TYPE = {"Cloud": "Public cloud", "On-premises": "On-premises", "Endpoint": "On-premises"}
LIFECYCLE = {"In use": "Operational", "Retired": "Retired", "In stock": "Non-operational"}
DISCOVERY = {"Jamf": "Agent", "Microsoft Intune": "Agent", "AWS Config": "Cloud API", "ServiceNow": "Manual"}

# ---------------------------------------------------------------------------
# Write files
# ---------------------------------------------------------------------------
os.makedirs(OUT, exist_ok=True)

def fmt(v):
    if v is None:
        return ""
    if isinstance(v, bool):
        return "Yes" if v else "No"
    if isinstance(v, (list, tuple)):
        return "|".join(fmt(x) for x in v)
    return str(v)

def write(name, header, rows):
    with open(os.path.join(OUT, name), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(header)
        for row in rows:
            w.writerow([fmt(row.get(h)) if isinstance(row, dict) else fmt(x) for h, x in zip(header, row if not isinstance(row, dict) else header)])
    return len(rows)

counts = {}
counts["business_units.csv"] = write("business_units.csv",
    ["unit_code", "name", "level", "parent_unit_code", "pass_through", "head_employee_id", "legal_entities", "primary_site_id", "status"],
    [{"unit_code": c, "name": u["name"], "level": u["level"].replace("_", " ").title().replace("Business Unit", "Business unit"),
      "parent_unit_code": u.get("parent", ""), "pass_through": bool(u.get("pass_through")),
      "head_employee_id": head_of(c)["id"],
      "legal_entities": sorted({CO["legal_entities"][SITES[s]["country"]] for s in (u.get("headcount") or {})}) or [CO["legal_entities"]["US"]],
      "primary_site_id": max((u.get("headcount") or {"LP-DEN-HQ": 0}).items(), key=lambda kv: kv[1])[0],
      "status": "Active"} for c, u in UNITS.items()])

counts["facilities_sites.csv"] = write("facilities_sites.csv",
    ["site_id", "name", "site_type", "address", "city", "state_province", "postal_code", "country", "region", "time_zone", "ownership", "landlord_or_provider", "lease_end_date", "facility_manager_employee_id", "business_units_present", "status"],
    [{"site_id": s["id"], "name": s["name"], "site_type": site_type(s["type"]), "address": s["building"], "city": s["city"],
      "state_province": s["state"], "postal_code": s["postal_code"], "country": s["country"], "region": s["region"],
      "time_zone": s["time_zone"], "ownership": ownership(s["ownership"]), "landlord_or_provider": s["landlord"], "lease_end_date": s["lease_end"],
      "facility_manager_employee_id": pid(s["facility_manager"]),
      "business_units_present": sorted({p["unit"] for p in people if p["site"] == s["id"] and p["status"] != "terminated"}),
      "status": "Active"} for s in P["sites"]])

counts["facilities_buildings.csv"] = write("facilities_buildings.csv",
    ["building_id", "site_id", "name", "floors", "area_sqft"],
    [{"building_id": f"{s['id']}-B1", "site_id": s["id"], "name": s["building"], "floors": s["floors"], "area_sqft": s["area_sqft"]} for s in P["sites"]])

counts["facilities_secure_areas.csv"] = write("facilities_secure_areas.csv",
    ["area_id", "name", "building_id", "area_type", "access_control", "area_owner_employee_id", "purpose"],
    [{"area_id": a["id"], "name": a["name"], "building_id": f"{a['site']}-B1", "area_type": area_type(a["type"]), "access_control": access_control(a["access_control"]),
      "area_owner_employee_id": pid(a["owner"]), "purpose": a["purpose"]} for a in P["secure_areas"]])

all_people = people + list(vendor_contacts.values())
STATUS = {"active": "Active", "on_leave": "On leave", "terminated": "Terminated", "pending_start": "Pending start"}
counts["people.csv"] = write("people.csv",
    ["employee_id", "contractor_id", "legal_first_name", "legal_last_name", "preferred_name", "work_email", "work_phone", "job_title",
     "business_unit_code", "manager_employee_id", "site_id", "work_country", "work_state", "work_city", "work_region", "time_zone",
     "delegate_employee_id", "employment_status"],
    [{"employee_id": p["id"] if p["kind"] not in ("contractor",) else "", "contractor_id": p["id"] if p["kind"] == "contractor" else "",
      "legal_first_name": p["first"], "legal_last_name": p["last"], "preferred_name": p["preferred"], "work_email": p["email"],
      "work_phone": p["phone"], "job_title": p["title"], "business_unit_code": p["unit"], "manager_employee_id": p["manager"] or "",
      "site_id": p["site"], "work_country": p["country"], "work_state": p["state"], "work_city": p["city"], "work_region": p["region"],
      "time_zone": p["tz"], "delegate_employee_id": "", "employment_status": STATUS[p["status"]]} for p in all_people])

EMP_TYPE = {"full_time": "Full-time", "contractor": "Contractor", "vendor_contact": "Vendor contact"}
counts["people_hr.csv"] = write("people_hr.csv",
    ["employee_id", "contractor_id", "employment_type", "job_level", "job_family", "cost_center", "legal_entity", "vendor_code",
     "hire_date", "termination_date", "leave_start", "expected_return"],
    [{"employee_id": p["id"] if p["kind"] != "contractor" else "", "contractor_id": p["id"] if p["kind"] == "contractor" else "",
      "employment_type": EMP_TYPE[p["kind"]], "job_level": job_level(p["title"]) if p["kind"] != "vendor_contact" else "",
      "job_family": UNITS[division_of(p["unit"])]["name"], "cost_center": COST_CENTER[p["unit"]] if p["kind"] != "vendor_contact" else "",
      "legal_entity": CO["legal_entities"].get(p["country"], "") if p["kind"] != "vendor_contact" else "",
      "vendor_code": p.get("vendor", ""), "hire_date": p["hire"], "termination_date": p["term"],
      "leave_start": p["leave_start"], "expected_return": p["expected_return"]} for p in all_people])

counts["groups.csv"] = write("groups.csv", ["group_name", "description"],
    [{"group_name": g, "description": {
        "Security operations": "Security operations analysts across Denver, Dublin, Manila and Arlington",
        "Clinic staff": "On-site clinic staff (HIPAA workforce)",
        "SWIFT operators": "Treasury staff allowed into the SWIFT operations room and secure zone",
        "Executive leadership team": "CEO and direct reports",
        "Federal access (US persons)": "People allowed to access Larkspur Federal systems and the CUI room",
        "GRC platform administrators": "Administrators of the GRC platform",
        "Risk committee attendees": "Management attendees of the Board Risk Committee"}[g]} for g in sorted(groups)])
counts["group_members.csv"] = write("group_members.csv", ["group_name", "employee_id"],
    [{"group_name": g, "employee_id": m} for g in sorted(groups) for m in sorted(groups[g])])

counts["data_types.csv"] = write("data_types.csv", ["name", "category", "classification", "regulatory_tags", "data_steward_employee_id"],
    [{"name": t["name"], "category": CATEGORY[t["key"]], "classification": t["classification"], "regulatory_tags": t["regulatory_tags"],
      "data_steward_employee_id": pid(t["steward"])} for t in P["data_types"]])

def contract(code):
    r = sub_rng("contract", code)
    start = rand_date(r, "2016-01-01", "2025-06-30")
    while start + dt.timedelta(days=365 * 3) < AS_OF:
        start = start + dt.timedelta(days=365 * 3)
    end = start + dt.timedelta(days=365 * 3)
    return start, end, end - dt.timedelta(days=90)

vrows = []
for v in P["vendors"]:
    cs, ce, cr = contract(v["code"])
    vrows.append({"vendor_code": v["code"], "name": v["name"], "website_domain": v["domain"], "vendor_type": vendor_type(v["type"]), "description": v["type"], "tier": v["tier"],
                  "status": "Active", "relationship_owner_employee_id": pid(v["owner"]), "business_units_using": v.get("units", []),
                  "data_types_accessed": [DTYPES[k]["name"] for k in v.get("data", [])], "system_access": bool(v.get("system_access")),
                  "country": v.get("country", ""), "contract_start": cs, "contract_end": ce, "renewal_notice_date": cr,
                  "name_is_real_company": not v.get("fictional", False), "note": v.get("note", "")})
counts["vendors.csv"] = write("vendors.csv", list(vrows[0].keys()), vrows)

counts["products.csv"] = write("products.csv", ["product_key", "name", "business_unit_code", "owner_employee_id", "status", "markets", "revenue_supported", "rto_hours", "customer_facing"],
    [{"product_key": p["key"], "name": p["name"], "business_unit_code": p["unit"], "owner_employee_id": pid(p["owner"]), "status": "Live",
      "markets": p["markets"], "revenue_supported": p["revenue"], "rto_hours": p["rto_hours"], "customer_facing": p["customer_facing"]} for p in P["products"]])
counts["services.csv"] = write("services.csv", ["service_key", "name", "service_type", "business_units_served", "owner_employee_id", "customers", "status", "rto_hours"],
    [{"service_key": s["key"], "name": s["name"], "service_type": "Technology service" if s["type"] == "Internal service" else s["type"], "business_units_served": s["units"], "owner_employee_id": pid(s["owner"]),
      "customers": s["customers"], "status": "Live", "rto_hours": s["rto_hours"]} for s in P["services"]])
counts["business_functions.csv"] = write("business_functions.csv", ["name", "business_unit_code", "criticality"],
    [{"name": b["name"], "business_unit_code": b["unit"], "criticality": b["criticality"]} for b in P["business_functions"]])

HOST = {"Built in-house (cloud)": "Cloud (built in-house)", "Built in-house (GovCloud)": "Cloud (built in-house, GovCloud)", "SaaS": "SaaS"}
arows = []
for a in P["applications"]:
    inhouse = a["hosting"].startswith("Built")
    internal_u, external_u = user_ranges(a)
    arows.append({"source_id": a["id"], "name": a["name"], "application_category": {"product": "Customer-facing product", "platform": "Internal platform component", "corporate": "Corporate system"}[a["kind"]],
                  "business_owner_employee_id": pid(a["owner"]), "hosting_model": "SaaS" if a["hosting"] == "SaaS" else "Cloud (our account)",
                  "vendor_code": a.get("vendor", ""), "internet_facing": a["internet_facing"], "users": a["users"],
                  "sign_in_methods": sign_in(a["sign_in"]), "source": "SaaS" if a["hosting"] == "SaaS" else "Built in-house",
                  "code_repository": f"https://github.example/larkspur/{slug(a['name'])}" if inhouse else "",
                  "environments": (["Production", "Staging", "Development"] + ([] if a.get("federal") else ["DR"])) if inhouse else ["Production"],
                  "lifecycle_status": "Live", "data_types_handled": [DTYPES[k]["name"] for k in a.get("data", [])],
                  "data_classification": max((DTYPES[k]["classification"] for k in a.get("data", [])), key=lambda c: ["Public", "Internal", "Confidential", "Restricted"].index(c), default="Internal"),
                  "revenue_supported": cap_range(a["revenue"]), "cost_of_outage_per_day": cap_range(a["outage"]),
                  "internal_users": internal_u, "external_users": external_u, "records_held": cap_range(a["records"]),
                  "data_storage_locations": (["AWS us-west-2"] + (["AWS eu-west-1"] if "eu" in a.get("data", []) else [])) if a["hosting"] == "Built in-house (cloud)" else (["AWS GovCloud (US) us-gov-west-1"] if a.get("federal") else [f"Vendor: {VENDORS[a['vendor']]['name']}" if a.get('vendor') else "Vendor"]),
                  "countries_and_regions": app_countries(a), "regulatory_scope": app_regs(a), "financially_significant": bool(a.get("fin_sig")),
                  "customer_facing": a["kind"] == "product", "contractual_commitments": bool(a.get("contractual")), "contractual_note": a.get("contractual", ""),
                  "rto_hours": a["rto"], "rpo_hours": a["rpo"], "maximum_tolerable_downtime_hours": a["mtd"], "reputational_impact": a["reputational"],
                  "larkspur_federal": bool(a.get("federal"))})
counts["applications.csv"] = write("applications.csv", list(arows[0].keys()), arows)
counts["application_roles.csv"] = write("application_roles.csv", ["application_source_id", "application", "role", "person_id"], app_roles)

ahead = ["source_system", "source_id", "cloud_resource_id", "serial_number", "hostname", "name", "asset_type", "environment", "ip_addresses",
         "os", "software", "manufacturer", "model", "hosting_type", "cloud_provider", "cloud_account", "cloud_region", "location",
         "technical_owner", "assigned_to", "services_supported", "data_classification", "lifecycle_status", "install_date",
         "end_of_life_date", "last_patched_date", "discovery_source", "last_seen"]
for a in assets:
    a.setdefault("assigned_to", "")
    a["asset_type"] = ASSET_TYPE[a["asset_type"]]
    a["environment"] = ENVIRONMENT[a["environment"]]
    a["hosting_type"] = HOSTING_TYPE[a["hosting_type"]]
    a["lifecycle_status"] = LIFECYCLE[a["lifecycle_status"]]
    a["discovery_source"] = DISCOVERY[a["source_system"]]
    a["services_supported"] = "|".join(SVC[k]["name"] for k in a["services_supported"].split("|") if k) if a["services_supported"] else ""
counts["assets.csv"] = write("assets.csv", ahead, assets)

# Links
links = {
    "links_application_service.csv": (["application_source_id", "service"], [(a["id"], SVC[s]["name"]) for a in P["applications"] for s in a.get("services", [])]),
    "links_application_asset.csv": (["application_source_id", "asset_source_id"], sorted(set(asset_links_app))),
    "links_application_data_type.csv": (["application_source_id", "data_type"], [(a["id"], DTYPES[k]["name"]) for a in P["applications"] for k in a.get("data", [])]),
    "links_application_vendor.csv": (["application_source_id", "vendor_code"], [(a["id"], a["vendor"]) for a in P["applications"] if a.get("vendor")]),
    "links_asset_data_type.csv": (["asset_source_id", "data_type"], sorted(set(asset_links_dt))),
    "links_vendor_data_type.csv": (["vendor_code", "data_type"], [(v["code"], DTYPES[k]["name"]) for v in P["vendors"] for k in v.get("data", [])]),
    "links_service_product.csv": (["service", "product"], [(s["name"], next(p["name"] for p in P["products"] if p["key"] == k)) for s in P["services"] for k in s.get("products", [])]),
    "links_service_data_type.csv": (["service", "data_type"], [(s["name"], DTYPES[k]["name"]) for s in P["services"] for k in s.get("data", [])]),
    "links_business_function_service.csv": (["business_function", "service"], [(b["name"], SVC[k]["name"]) for b in P["business_functions"] for k in b.get("services", [])]),
}
for name, (hdr, rows) in links.items():
    counts[name] = write(name, hdr, [dict(zip(hdr, r)) for r in rows])

# ---------------------------------------------------------------------------
# Validation (Part 2.3)
# ---------------------------------------------------------------------------
results = []
def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))

byid = {p["id"]: p for p in all_people}
active = [p for p in people if p["status"] != "terminated"]
companies = [u for u in UNITS.values() if u["level"] == "company"]
check("Exactly one Company", len(companies) == 1)
NEXT = {"division": "company", "business_unit": "division", "department": "business_unit"}
bad = [c for c, u in UNITS.items() if u["level"] != "company" and UNITS[u["parent"]]["level"] != NEXT[u["level"]]]
check("Every unit's parent is the level directly above", not bad, ", ".join(bad))
check("Every person's unit exists", all(p["unit"] in UNITS for p in all_people))
bad = [p["id"] for p in people if p["manager"] and (p["manager"] not in byid or byid[p["manager"]]["status"] == "terminated")]
check("Every manager exists and is active", not bad, ", ".join(bad[:5]))
loops = []
for p in people:
    seen, cur = set(), p
    while cur["manager"]:
        if cur["id"] in seen:
            loops.append(p["id"]); break
        seen.add(cur["id"]); cur = byid[cur["manager"]]
check("No manager loops", not loops)
nomgr = [p["id"] for p in active if not p["manager"]]
check("The CEO is the only active person without a manager", nomgr == [pid("ceo")], ", ".join(nomgr))
grc_keys = ["cro", "vp_erm", "vp_compliance", "bsa_officer", "cpo_privacy", "dpo", "hipaa_po", "privacy_analyst", "cso", "ciso",
            "secgrc_dir", "grc_policy", "grc_ctltest", "fedramp_pm", "cmmc_analyst", "vp_oprisk", "cmp_pci", "cmp_regchange", "tprm_dir",
            "tprm_analyst", "vp_physres", "bcdr_dir", "bcdr_analyst", "cae", "it_audit_mgr", "auditor", "soc_mgr", "threat_hunter",
            "appsec_mgr", "pentester", "erm_analyst", "oprisk_analyst"]
check("Every GRC role is filled by an active person", all(k in by_pos and by_pos[k][0]["status"] == "active" for k in grc_keys))
mismatch = [p["id"] for p in people if p["site"] and (SITES[p["site"]]["country"] != p["country"] or SITES[p["site"]]["time_zone"] != p["tz"])]
check("Site, country and time zone agree", not mismatch)
site_counts = Counter(p["site"] for p in people if p["status"] != "terminated")
targets = Counter()
for u in UNITS.values():
    for s, n in (u.get("headcount") or {}).items():
        targets[s] += n
check("Active headcount per site matches the profile (±2)", all(abs(site_counts[s] - targets[s]) <= 2 for s in targets),
      ", ".join(f"{s} {site_counts[s]}/{targets[s]}" for s in sorted(targets)))
check("Total active headcount is 500 (±2)", abs(sum(site_counts.values()) - 500) <= 2, str(sum(site_counts.values())))
fed_group = groups["Federal access (US persons)"]
check("Larkspur Federal staff work in US locations", all(SITES[p["site"]]["country"] == "US" for p in people if division_of(p["unit"]) == "FED"))
check("No Manila person has federal access", not any(byid[i]["site"] == "LP-MNL-01" for i in fed_group))
fed_apps = {a["id"] for a in P["applications"] if a.get("federal")}
bad = [r_["person_id"] for r_ in app_roles if r_["application_source_id"] in fed_apps and r_["person_id"] not in fed_group]
check("Everyone with a role on a federal application has federal access", not bad, ", ".join(bad))
REQUIRED_ROLES = {"Technical owner", "Data owner", "Security contact", "Emergency contact"}
have = defaultdict(set)
for r_ in app_roles:
    have[r_["application_source_id"]].add(r_["role"])
check("Every application has the required roles (technical owner, data owner, security contact, emergency contact)",
      all(REQUIRED_ROLES <= have[a["id"]] for a in P["applications"]))
check("No Manila person is linked to a federal application", not any(byid[r_["person_id"]]["site"] == "LP-MNL-01" for r_ in app_roles if r_["application_source_id"] in fed_apps))
owners = [r_["person_id"] for r_ in app_roles] + [x["relationship_owner_employee_id"] for x in vrows] + \
         [pid(t["steward"]) for t in P["data_types"]] + [pid(s["facility_manager"]) for s in P["sites"]] + [pid(a["owner"]) for a in P["secure_areas"]]
check("Every owner is an active person", all(byid[o]["status"] == "active" for o in owners))
bad = []
for a in P["applications"]:
    scope = set(app_regs(a))
    for k in a.get("data", []):
        if not set(REGS.get(k, [])) <= scope:
            bad.append(a["id"])
check("Application regulatory scope covers its data types", not bad, ", ".join(bad))
bad = [v["code"] for v in P["vendors"] if any(DTYPES[k]["classification"] == "Restricted" for k in v.get("data", [])) and v["tier"] not in ("Critical", "High")]
check("Vendors with Restricted data are at least High tier", not bad, ", ".join(bad))
term = [p for p in people if p["status"] == "terminated"]
check("Terminated people have a termination date after their hire date", all(p["term"] and p["term"] > p["hire"] for p in term))
bad = [o for o in owners if byid[o]["status"] == "terminated"]
check("Terminated people own nothing", not bad)
check("Hire dates are not before the site opened", all(p["hire"] >= d(SITES[p["site"]]["opened"]) for p in people))
emails = [p["email"] for p in all_people]
check("Work emails are unique and use .example domains", len(emails) == len(set(emails)) and all(e.endswith(".example") for e in emails))
keys1 = [(a["source_system"], a["source_id"]) for a in assets]
check("Asset match keys are unique", len(keys1) == len(set(keys1)) and len([a["cloud_resource_id"] for a in assets if a["cloud_resource_id"]]) == len({a["cloud_resource_id"] for a in assets if a["cloud_resource_id"]}))
phones = [p["phone"] for p in all_people if p["phone"]]
check("Phone numbers are fictional (555-0100 + ext., Ofcom drama range, or undiallable)", all(("555-0100" in x) or x.startswith("+44 20 7946 0") or " 000 " in x or " 0000 " in x for x in phones))

ok = all(r_[1] for r_ in results)
leavers_by_year = Counter(p["term"].year for p in term)
with open(os.path.join(OUT, "validation-report.md"), "w", encoding="utf-8") as f:
    f.write(f"# Validation report: {CO['name']}\n\nProfile `{os.path.basename(PROFILE_PATH)}`, seed {SEED}, as of {AS_OF}. Result: **{'PASS' if ok else 'FAIL'}**\n\n")
    f.write("## Checks\n| Check | Result | Detail |\n|---|---|---|\n")
    for n, passed, det in results:
        f.write(f"| {n} | {'Pass' if passed else '**Fail**'} | {det} |\n")
    f.write("\n## Counts\n| File | Rows |\n|---|---|\n")
    for k in sorted(counts):
        f.write(f"| `{k}` | {counts[k]} |\n")
    f.write("\n## People\n")
    f.write(f"- Active (incl. on leave): {len(active)}; on leave: {sum(p['status']=='on_leave' for p in people)}; contractors: {sum(p['kind']=='contractor' and p['status']!='terminated' for p in people)}\n")
    f.write(f"- Terminated (kept): {len(term)} — " + ", ".join(f"{y}: {n}" for y, n in sorted(leavers_by_year.items())) + "\n")
    f.write(f"- Vendor contacts: {len(vendor_contacts)}\n- Named positions: {sum(len(v) for v in by_pos.values())}\n\n")
    f.write("| Site | Active |\n|---|---|\n" + "".join(f"| {s} | {site_counts[s]} |\n" for s in sorted(site_counts)))
    div_counts = Counter(UNITS[division_of(p['unit'])]['name'] for p in active)
    f.write("\n| Division | Active |\n|---|---|\n" + "".join(f"| {k} | {v} |\n" for k, v in sorted(div_counts.items(), key=lambda kv: -kv[1])))

with open(os.path.join(OUT, "README.md"), "w", encoding="utf-8") as f:
    f.write(f"""# {CO['name']}: synthetic data

**Everything in these files is fictional.** {CO['name']} does not exist. People, emails (`.example` domains), phone numbers,
addresses, IDs and history are invented. Real product and vendor names (e.g. AWS, Okta, Workday) are used for realism only:
tiers, contracts, scores and any findings about them are invented. Vendors marked `name_is_real_company = No` are fictional.

Generated by `generate.py` from `{os.path.basename(PROFILE_PATH)}` with seed {SEED}, as of {AS_OF}. Same profile and seed give the same files.

Load order for the GRC platform's Foundation import: business_units, facilities_sites, facilities_buildings,
facilities_secure_areas, people, people_hr, groups, group_members, data_types, vendors, products, services,
business_functions, applications, application_roles, assets, then the links_* files.
`business_units.head_employee_id` and `facilities_sites.facility_manager_employee_id` refer to people: load them after people
or as a second pass.

See validation-report.md for the checks.
""")

print(("PASS" if ok else "FAIL"), {k: counts[k] for k in sorted(counts)})
for n, passed, det in results:
    if not passed:
        print("FAIL:", n, det)
