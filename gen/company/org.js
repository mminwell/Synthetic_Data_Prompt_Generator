/* Module: company hierarchy and people (reference steps 2-6 and 8). */
(() => {
  const { date, addDays, randDate, pyRound, sortStr, uniq, check } = COMPANY;

  const PH_FIRST = ["Maria", "Jose", "Mark", "John Paul", "Angelica", "Kristine", "Jericho", "Rhea", "Paolo", "Carlo",
    "Joy", "Grace", "Jasmine", "Miguel", "Bea", "Nicole", "Ramon", "Patricia", "Joshua", "Camille",
    "Andrea", "Christian", "Daniel", "Erika", "Francis", "Gabrielle", "Hazel", "Ivan", "Janine", "Kevin",
    "Lorraine", "Marvin", "Noel", "Olivia", "Pia", "Rafael", "Sheila", "Tristan", "Vincent", "Ysabel"];
  const PH_LAST = ["Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "Garcia", "Mendoza", "Torres", "Tomas", "Andrada",
    "Castillo", "Flores", "Villanueva", "Ramos", "Castro", "Rivera", "Aquino", "Navarro", "Salazar",
    "Mercado", "Dela Cruz", "De Leon", "Gonzales", "Domingo", "Lopez", "Fernandez", "Aguilar", "Pascual",
    "Manalo", "Soriano", "Dizon", "Valdez", "Gutierrez", "Sison", "Lim", "Tan", "Go", "Lacson",
    "Panganiban", "Macaraeg"];

  /* Names (fictional; common names only) */
  const fakers = {};
  COMPANY.personName = (r, country) => {
    if (country === "PH") return [r.choice(PH_FIRST), r.choice(PH_LAST)];
    const loc = COMPANY.LOCALE[country] || "en_US";
    const f = fakers[loc] || (fakers[loc] = GEN.faker(loc, 1));
    f.seed(r.below(1 << 30));
    return [f.person.firstName(), f.person.lastName()];
  };
  COMPANY.emailFor = (ctx, first, last, domain = ctx.DOMAIN) => {
    const clean = s => COMPANY.fold(s).toLowerCase().replace(/[^a-z]/g, "");
    const base = clean(first.toLowerCase().split(/\s+/)[0]) + "." + clean(last);
    let e = `${base}@${domain}`, n = 2;
    while (ctx.usedEmails.has(e)) e = `${base}${n++}@${domain}`;
    ctx.usedEmails.add(e);
    return e;
  };
  /* Fictional phone numbers: US main line 555-0100 + extension; UK Ofcom drama range; else an undiallable main number + extension. */
  const phoneFor = (ctx, site) => {
    const n = ctx.ext[site] = (ctx.ext[site] || 0) + 1;
    const main = ctx.RULES.phone_main[site];
    if (main === null || (main === undefined && ctx.SITES[site].country === "GB")) return `+44 20 7946 0${String(n).padStart(3, "0")}`;
    if (main === undefined) throw new Error(`No main phone line for site ${site} (add it to generator_rules.phone_main)`);
    return `${main} ext. ${2000 + n}`;
  };
  COMPANY.jobLevel = title => {
    const t = title.toLowerCase();
    if (t.startsWith("chief") || t.startsWith("general counsel") || t.startsWith("president")) return "E1";
    if (t.startsWith("vice president") || t.includes("deputy general counsel")) return "M4";
    if (t.startsWith("director") || t.startsWith("head of") || t.includes("chief audit")) return "M3";
    if (t.includes("manager") || t.includes("lead") || t.startsWith("clinic physician") || t.includes("officer")) return t.includes("senior") ? "M2" : "M1";
    if (t.startsWith("senior") || t.includes("staff ") || t.includes("principal") || t.includes("architect")) return "IC3";
    if (t.endsWith(" i") || t.includes("coordinator") || t.includes("assistant") || t.includes("representative")) return "IC1";
    return "IC2";
  };

  const build = ctx => {
    const { P, CO, SITES, UNITS, POS, AS_OF, HIST, RULES } = ctx;
    const people = ctx.people = [];
    const byPos = ctx.byPos = {};
    ctx.usedEmails = new Set(); ctx.ext = {};
    let nextEmp = 10001, nextCon = 20001;
    ctx.pid = key => { if (!byPos[key]) throw new Error(`No one holds position "${key}"`); return byPos[key][0].id; };

    const makePerson = (r, { title, unit, site, manager = null, position = "", kind = "full_time", status = "active", hireFrom = null, hireTo = null, term = null }) => {
      const s = SITES[site];
      if (!s) throw new Error(`Unknown site ${site} (${title})`);
      if (!UNITS[unit]) throw new Error(`Unknown unit ${unit} (${title})`);
      const [first, last] = COMPANY.personName(r, s.country);
      const id = kind === "contractor" ? `C${nextCon++}` : `E${nextEmp++}`;
      const opened = date(s.opened);
      hireFrom = hireFrom && date(hireFrom) > opened ? date(hireFrom) : opened;
      hireTo = hireTo ? date(hireTo) : addDays(AS_OF, -30);
      const hire = randDate(r, hireFrom, hireTo);
      const p = {
        id, kind, first, last, preferred: "", email: COMPANY.emailFor(ctx, first, last),
        phone: status === "active" ? phoneFor(ctx, site) : "", title, unit, manager, site, position,
        country: s.country, state: s.state, city: s.city, region: s.region, tz: s.time_zone,
        status, hire, term, leave_start: null, expected_return: null,
      };
      people.push(p);
      if (position) (byPos[position] = byPos[position] || []).push(p);
      return p;
    };

    /* 1. Named positions, managers first */
    const depth = (k, seen = []) => {
      if (!POS[k]) throw new Error(`Position "${seen[seen.length - 1]}" reports to unknown position "${k}"`);
      const rt = POS[k].reports_to;
      if (!rt) return 0;
      if (seen.includes(rt) || rt === k) throw new Error(`Reporting loop in positions at ${k}`);
      return 1 + depth(rt, [...seen, k]);
    };
    const keys = Object.keys(POS).map(k => [depth(k), k]).sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0)).map(x => x[1]);
    for (const key of keys) {
      const spec = POS[key];
      for (let i = 0; i < Number(spec.count || 1); i++) {
        const r = ctx.rng("pos", key, i);
        const span = { E1: [CO.founded, 2019], M4: [2014, 2022], M3: [2015, 2023] }[COMPANY.jobLevel(spec.title)];
        makePerson(r, { title: spec.title, unit: spec.unit, site: spec.site, position: key,
          manager: spec.reports_to ? byPos[spec.reports_to][0].id : null,
          hireFrom: span ? `${span[0]}-01-01` : null, hireTo: span ? `${span[1]}-12-31` : null });
      }
    }
    ctx.headOf = code => {
      let u = UNITS[code];
      for (;;) {
        if (u.head && byPos[u.head]) return byPos[u.head][0];
        if (!u.parent) throw new Error(`No head found for unit ${code}`);
        u = UNITS[u.parent];
      }
    };

    /* 2. Generated staff per unit and site: headcount minus named positions */
    const named = {};
    for (const p of people) named[`${p.unit}|${p.site}`] = (named[`${p.unit}|${p.site}`] || 0) + 1;
    for (const [code, u] of Object.entries(UNITS)) {
      for (const [site, n] of Object.entries(u.headcount || {})) {
        const fill = n - (named[`${code}|${site}`] || 0);
        if (fill < 0) throw new Error(`${code} at ${site}: ${named[`${code}|${site}`]} named positions exceed headcount ${n}`);
        if (fill === 0) continue;
        const ladder = (P.ladders || {})[code] || [`${u.name} Specialist`];
        const head = ctx.headOf(code);
        const leads = [];
        const nLeads = Math.floor(fill / RULES.staff_per_lead);
        for (let i = 0; i < nLeads; i++)
          leads.push(makePerson(ctx.rng("lead", code, site, i), { title: `Team Lead, ${u.name}`, unit: code, site, manager: head.id, hireTo: addDays(AS_OF, -400) }));
        for (let i = 0; i < fill - nLeads; i++) {
          const r = ctx.rng("staff", code, site, i);
          const kind = r() < (CO.contractor_share || 0) && RULES.contractor_divisions.includes(ctx.divisionOf(code)) ? "contractor" : "full_time";
          const title = ladder[Math.min(Math.floor(Math.pow(r(), 1.4) * ladder.length), ladder.length - 1)];
          makePerson(r, { title, unit: code, site, kind, manager: leads.length ? leads[i % leads.length].id : head.id });
        }
      }
    }
    const activeCount = people.length;

    /* 3. Leavers: annual rate across generated (non-named) roles, kept as Terminated */
    const fillSlots = people.filter(p => !p.position && !p.title.startsWith("Team Lead"));
    for (let year = +HIST.slice(0, 4); year <= +AS_OF.slice(0, 4); year++) {
      const yearEnd = `${year}-12-31` < AS_OF ? `${year}-12-31` : AS_OF;
      const frac = (COMPANY.daysBetween(`${year}-01-01`, yearEnd) + 1) / 365;
      const n = pyRound(activeCount * CO.annual_leaver_rate * frac);
      for (let i = 0; i < n; i++) {
        const r = ctx.rng("leaver", year, i);
        const like = r.choice(fillSlots);   /* held a similar job in the same team */
        const term = randDate(r, `${year}-01-01`, yearEnd);
        makePerson(r, { title: like.title, unit: like.unit, site: like.site, manager: like.manager, kind: like.kind,
          status: "terminated", hireTo: addDays(term, -60), term });
      }
    }

    /* 4. A few people on leave */
    const r = ctx.rng("leave");
    for (const p of r.sample(fillSlots.filter(p => p.status === "active"), RULES.on_leave_count)) {
      p.status = "on_leave";
      p.leave_start = randDate(r, addDays(AS_OF, -60), addDays(AS_OF, -5));
      p.expected_return = addDays(p.leave_start, r.choice([42, 84, 112]));
    }

    /* 5. Groups */
    const groups = ctx.groups = {};
    for (const [g, rule] of Object.entries(RULES.groups)) {
      const m = new Set();
      for (const p of people) {
        if (p.status === "terminated") continue;
        if ((rule.units || []).includes(p.unit) || (rule.divisions || []).includes(ctx.divisionOf(p.unit)) || (rule.sites || []).includes(p.site)) m.add(p.id);
      }
      for (const k of rule.positions || []) if (byPos[k]) m.add(byPos[k][0].id);
      groups[g] = m;
    }
    ctx.vendorContacts = [];
  };

  const write = ctx => {
    const { CO, SITES, UNITS, RULES } = ctx;
    COMPANY.table(ctx, "business_units.csv",
      ["unit_code", "name", "level", "parent_unit_code", "pass_through", "head_employee_id", "legal_entities", "primary_site_id", "status"],
      Object.entries(UNITS).map(([c, u]) => {
        const hc = Object.entries(u.headcount || {});
        let primary = RULES.default_site, best = -1;
        for (const [s, n] of hc) if (n > best) { best = n; primary = s; }
        const ents = sortStr(uniq(hc.map(([s]) => CO.legal_entities[SITES[s].country])));
        return { unit_code: c, name: u.name, level: { company: "Company", division: "Division", business_unit: "Business unit", department: "Department" }[u.level] || u.level,
          parent_unit_code: u.parent || "", pass_through: !!u.pass_through, head_employee_id: ctx.headOf(c).id,
          legal_entities: ents.length ? ents : [CO.legal_entities.US], primary_site_id: primary, status: "Active" };
      }));

    const all = ctx.allPeople = ctx.people.concat(ctx.vendorContacts);
    const STATUS = { active: "Active", on_leave: "On leave", terminated: "Terminated", pending_start: "Pending start" };
    COMPANY.table(ctx, "people.csv",
      ["employee_id", "contractor_id", "legal_first_name", "legal_last_name", "preferred_name", "work_email", "work_phone", "job_title",
       "business_unit_code", "manager_employee_id", "site_id", "work_country", "work_state", "work_city", "work_region", "time_zone",
       "delegate_employee_id", "employment_status"],
      all.map(p => ({ employee_id: p.kind !== "contractor" ? p.id : "", contractor_id: p.kind === "contractor" ? p.id : "",
        legal_first_name: p.first, legal_last_name: p.last, preferred_name: p.preferred, work_email: p.email, work_phone: p.phone,
        job_title: p.title, business_unit_code: p.unit, manager_employee_id: p.manager || "", site_id: p.site, work_country: p.country,
        work_state: p.state, work_city: p.city, work_region: p.region, time_zone: p.tz, delegate_employee_id: "", employment_status: STATUS[p.status] })));
    const EMP = { full_time: "Full-time", contractor: "Contractor", vendor_contact: "Vendor contact" };
    COMPANY.table(ctx, "people_hr.csv",
      ["employee_id", "contractor_id", "employment_type", "job_level", "job_family", "cost_center", "legal_entity", "vendor_code",
       "hire_date", "termination_date", "leave_start", "expected_return"],
      all.map(p => { const vc = p.kind === "vendor_contact"; return {
        employee_id: p.kind !== "contractor" ? p.id : "", contractor_id: p.kind === "contractor" ? p.id : "", employment_type: EMP[p.kind],
        job_level: vc ? "" : COMPANY.jobLevel(p.title), job_family: UNITS[ctx.divisionOf(p.unit)].name, cost_center: vc ? "" : `CC-${p.unit}`,
        legal_entity: vc ? "" : (CO.legal_entities[p.country] || ""), vendor_code: p.vendor || "", hire_date: p.hire, termination_date: p.term,
        leave_start: p.leave_start, expected_return: p.expected_return }; }));

    const gnames = sortStr(Object.keys(ctx.groups).filter(g => ctx.groups[g].size));
    COMPANY.table(ctx, "groups.csv", ["group_name", "description"], gnames.map(g => ({ group_name: g, description: RULES.groups[g].description })));
    COMPANY.table(ctx, "group_members.csv", ["group_name", "employee_id"], gnames.flatMap(g => sortStr([...ctx.groups[g]]).map(m => ({ group_name: g, employee_id: m }))));
  };

  const checks = ctx => {
    const { UNITS, SITES, RULES, people } = ctx;
    const byId = ctx.byId = Object.fromEntries(ctx.allPeople.map(p => [p.id, p]));
    const active = people.filter(p => p.status !== "terminated");
    const units = Object.entries(UNITS);
    check(ctx, "Exactly one Company", units.filter(([, u]) => u.level === "company").length === 1);
    const NEXT = { division: "company", business_unit: "division", department: "business_unit" };
    let bad = units.filter(([, u]) => u.level !== "company" && !(UNITS[u.parent] && UNITS[u.parent].level === NEXT[u.level])).map(([c]) => c);
    check(ctx, "Every unit's parent is the level directly above", !bad.length, bad.join(", "));
    check(ctx, "Every person's unit exists", ctx.allPeople.every(p => UNITS[p.unit]));
    bad = people.filter(p => p.manager && (!byId[p.manager] || byId[p.manager].status === "terminated")).map(p => p.id);
    check(ctx, "Every manager exists and is active", !bad.length, bad.slice(0, 5).join(", "));
    const loops = [];
    for (const p of people) {
      const seen = new Set(); let cur = p;
      while (cur && cur.manager) { if (seen.has(cur.id)) { loops.push(p.id); break; } seen.add(cur.id); cur = byId[cur.manager]; }
    }
    check(ctx, "No manager loops", !loops.length, loops.slice(0, 5).join(", "));
    const noMgr = active.filter(p => !p.manager).map(p => p.id);
    check(ctx, "The CEO is the only active person without a manager", noMgr.length === 1 && ctx.byPos[RULES.ceo] && noMgr[0] === ctx.pid(RULES.ceo), noMgr.join(", "));
    const missing = RULES.grc_positions.filter(k => !(ctx.byPos[k] && ctx.byPos[k][0].status === "active"));
    check(ctx, "Every GRC role is filled by an active person", !missing.length, missing.join(", "));
    bad = people.filter(p => p.site && (SITES[p.site].country !== p.country || SITES[p.site].time_zone !== p.tz)).map(p => p.id);
    check(ctx, "Site, country and time zone agree", !bad.length, bad.slice(0, 5).join(", "));
    const siteCounts = {}, targets = {};
    for (const p of active) siteCounts[p.site] = (siteCounts[p.site] || 0) + 1;
    for (const u of Object.values(UNITS)) for (const [s, n] of Object.entries(u.headcount || {})) targets[s] = (targets[s] || 0) + n;
    ctx.siteCounts = siteCounts;
    const ts = sortStr(Object.keys(targets));
    check(ctx, "Active headcount per site matches the profile (±2)", ts.every(s => Math.abs((siteCounts[s] || 0) - targets[s]) <= 2), ts.map(s => `${s} ${siteCounts[s] || 0}/${targets[s]}`).join(", "));
    const total = active.length, target = Object.values(targets).reduce((a, b) => a + b, 0);
    check(ctx, `Total active headcount is ${target} (±2)`, Math.abs(total - target) <= 2, String(total));
    const fedDivs = RULES.groups[RULES.federal_group]?.divisions || [];
    check(ctx, "Larkspur Federal staff work in US locations", people.filter(p => fedDivs.includes(ctx.divisionOf(p.unit))).every(p => SITES[p.site].country === "US"));
    const fed = ctx.groups[RULES.federal_group] || new Set();
    bad = [...fed].filter(i => byId[i].site === RULES.restricted_site);
    check(ctx, "No Manila person has federal access", !bad.length, bad.join(", "));
    const term = people.filter(p => p.status === "terminated");
    bad = term.filter(p => !(p.term && p.term > p.hire)).map(p => p.id);
    check(ctx, "Terminated people have a termination date after their hire date", !bad.length, bad.slice(0, 5).join(", "));
    bad = people.filter(p => p.hire < COMPANY.date(SITES[p.site].opened)).map(p => p.id);
    check(ctx, "Hire dates are not before the site opened", !bad.length, bad.slice(0, 5).join(", "));
    const emails = ctx.allPeople.map(p => p.email);
    bad = emails.filter(e => !/\.example$/.test(e));
    check(ctx, "Work emails are unique and use .example domains", new Set(emails).size === emails.length && !bad.length, bad.slice(0, 5).join(", "));
    bad = ctx.allPeople.map(p => p.phone).filter(x => x && !COMPANY.fictionalPhone(x));
    check(ctx, "Phone numbers are fictional (555-0100 + ext., Ofcom drama range, or undiallable)", !bad.length, bad.slice(0, 5).join(", "));
  };
  COMPANY.fictionalPhone = x => /555-0100 ext\. \d+$/.test(x) || /^\+44 20 7946 0\d{3}$/.test(x) || / 000 0100 ext\. \d+$/.test(x) || / 0000 0100 ext\. \d+$/.test(x);

  COMPANY.register({
    id: "org", title: "Company hierarchy and people",
    description: "Business units, named roles, staff, leavers, people on leave, HR details and groups",
    files: ["business_units.csv", "people.csv", "people_hr.csv", "groups.csv", "group_members.csv"],
    build, write, checks,
  });
})();
