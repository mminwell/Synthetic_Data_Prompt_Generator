/* HR employee generator. Same settings + seed => same employees. */
const HR_GEN = (() => {
  const DCODE = { Engineering: "ENG", Product: "PRD", IT: "IT", Sales: "SLS", Marketing: "MKT", "Customer Success": "CS", Operations: "OPS", Finance: "FIN", "People (HR)": "PPL", Legal: "LGL" };
  const FAMILY = { Engineering: "Engineering", Product: "Product", IT: "Information Technology", Sales: "Sales", Marketing: "Marketing", "Customer Success": "Customer Success", Operations: "Operations", Finance: "Finance", "People (HR)": "Human Resources", Legal: "Legal" };
  const LABEL = d => d === "People (HR)" ? "People" : d;
  const IC = {
    Engineering: ["Software Engineer I", "Software Engineer II", "Senior Software Engineer", "Staff Software Engineer", "Principal Software Engineer"],
    Product: ["Associate Product Manager", "Product Manager", "Senior Product Manager", "Group Product Manager", "Principal Product Manager"],
    IT: ["IT Support Specialist", "Systems Administrator", "Senior Systems Engineer", "IT Architect", "Principal IT Architect"],
    Sales: ["Sales Development Rep", "Account Executive", "Senior Account Executive", "Enterprise Account Executive", "Strategic Account Director"],
    Marketing: ["Marketing Coordinator", "Marketing Specialist", "Senior Marketing Manager", "Principal Product Marketer", "Principal Brand Strategist"],
    "Customer Success": ["Support Specialist", "Customer Success Manager", "Senior Customer Success Manager", "Principal CSM", "Principal Solutions Consultant"],
    Operations: ["Operations Coordinator", "Operations Analyst", "Senior Operations Analyst", "Operations Program Lead", "Principal Program Manager"],
    Finance: ["Accounting Clerk", "Financial Analyst", "Senior Financial Analyst", "Finance Lead", "Principal Controller"],
    "People (HR)": ["People Coordinator", "HR Generalist", "Senior HR Business Partner", "Principal HR Business Partner", "Principal Total Rewards Lead"],
    Legal: ["Paralegal", "Corporate Counsel", "Senior Corporate Counsel", "Lead Counsel", "Principal Counsel"],
  };
  const MGR = { M1: "Manager", M2: "Senior Manager", M3: "Director", M4: "Vice President" };
  const BASE = { IC0: 48000, IC1: 68000, IC2: 92000, IC3: 125000, IC4: 160000, IC5: 195000, M1: 140000, M2: 170000, M3: 205000, M4: 260000, E1: 340000 };
  const FMULT = { Engineering: 1.12, Product: 1.08, IT: 0.92, Sales: 0.88, Marketing: 0.95, "Customer Success": 0.82, Operations: 0.85, Finance: 0.97, "People (HR)": 0.9, Legal: 1.1 };
  const BONUS = { IC0: 0, IC1: 5, IC2: 8, IC3: 10, IC4: 12, IC5: 15, M1: 12, M2: 15, M3: 20, M4: 25, E1: 50 };
  const RANK = { IC0: 0, IC1: 1, IC2: 2, IC3: 3, IC4: 4, IC5: 5, M1: 4, M2: 5, M3: 6, M4: 7, E1: 8 };
  const DEPT_W = { Engineering: 26, Product: 8, IT: 5, Sales: 16, Marketing: 8, "Customer Success": 10, Operations: 8, Finance: 8, "People (HR)": 6, Legal: 5 };
  const TILT = { IN: { Engineering: 1.8, IT: 2.5, Sales: 0.2, Marketing: 0.3 }, JP: { Sales: 2.5, Engineering: 0.5 }, MX: { "Customer Success": 2.5, Engineering: 1.2 }, GB: { Sales: 1.6, Marketing: 1.3 }, DE: { Sales: 1.6 }, CA: { Engineering: 1.4 }, PH: { "Customer Success": 3 }, PL: { Engineering: 1.6 } };
  const FREQ = { US: "Biweekly", CA: "Biweekly", AU: "Fortnightly", MX: "Semi-monthly", PH: "Semi-monthly", CO: "Semi-monthly" };
  const HOURS = { GB: 37.5, IN: 45, MX: 48, FR: 35, CO: 47 };
  const PROB = { US: 0, GB: 6, CA: 3, DE: 6, IN: 6, MX: 1, JP: 3, FR: 3 };
  const TERM = [["Resignation - New Opportunity", "Voluntary", 30], ["Resignation - Relocation", "Voluntary", 10], ["Resignation - Personal", "Voluntary", 12], ["Retirement", "Voluntary", 4], ["Layoff / Position Eliminated", "Involuntary", 10], ["Performance", "Involuntary", 8]];
  const LEAVE = [["Parental Leave", 40, 84, 180], ["Medical Leave", 30, 21, 90], ["Personal Leave", 12, 14, 45], ["Sabbatical", 8, 28, 42], ["Family Care Leave", 10, 14, 84]];
  const RACE = [["White", 55], ["Hispanic or Latino", 17], ["Asian", 12], ["Black or African American", 10], ["Two or More Races", 3], ["Native Hawaiian or Other Pacific Islander", 0.5], ["American Indian or Alaska Native", 0.5], ["Decline to state", 2]];

  function auth(R, cc, today) {
    const r = R(), exp = (a, b) => GEN.iso(GEN.between(R, GEN.addDays(today, a), GEN.addDays(today, b)));
    const V = {
      US: [[0.07, "H-1B", 60, 1050, "Y"], [0.09, "F-1 OPT", 30, 600, "Y"], [0.17, "Permanent Resident"]],
      GB: [[0.12, "Skilled Worker Visa", 120, 1500, "Y"], [0.25, "Settled Status (EU)"]],
      CA: [[0.1, "Work Permit", 60, 1100, "Y"], [0.25, "Permanent Resident"]],
      DE: [[0.15, "EU Blue Card", 200, 1300, "Y"], [0.35, "EU Citizen (Freedom of Movement)"]],
      JP: [[0.12, "Engineer/Specialist in Humanities Visa", 60, 1600, "Y"]],
      MX: [[0.05, "Temporary Resident (Work)", 60, 1100, "Y"]],
    }[cc] || [[0.03, "Work Permit", 60, 1100, "Y"], [0.08, "Permanent Resident"]];
    for (const [p, type, a, b, s] of V) if (r < p) return { type, exp: a ? exp(a, b) : "", sponsor: s || "N" };
    return { type: "Citizen", exp: "", sponsor: "N" };
  }

  async function generate(S) {
    const R = GEN.rng(S.seed), today = GEN.d(S.asof);
    const locales = S.countries.map(c => GEN.meta(c.cc).locale || "en");
    await GEN.prepare(locales);
    const fk = {}; S.countries.forEach(c => { fk[c.cc] = GEN.faker(GEN.meta(c.cc).locale, S.seed ^ GEN.hash(c.cc)); });
    const depts = S.depts.length ? S.depts : ["Operations"];
    const primary = S.countries.some(c => c.cc === S.primary) ? S.primary : S.countries[0].cc;
    const sitesOf = cc => { const c = S.countries.find(x => x.cc === cc); return c.sites.length ? c.sites : [{ id: `LOC-${cc}-${cityCode(GEN.meta(cc).capital || cc)}`, city: GEN.meta(cc).capital || GEN.meta(cc).name }]; };

    /* 1. slots per country, leaders in the home country */
    const slots = [];
    S.countries.forEach(c => { for (let i = 0; i < c.count; i++) slots.push({ cc: c.cc }); });
    const emps = [];
    const takeSlot = () => { let i = slots.findIndex(s => s.cc === primary); if (i < 0) i = 0; return slots.splice(i, 1)[0]; };
    if (slots.length) emps.push(Object.assign(takeSlot(), { dept: depts.includes("Operations") ? "Operations" : depts[0], level: "E1", title: "Chief Executive Officer", mgr: true }));
    depts.forEach(d => { if (slots.length) emps.push(Object.assign(takeSlot(), { dept: d, level: "M4", title: `VP, ${LABEL(d)}`, mgr: true })); });
    slots.forEach(s => {
      const t = TILT[s.cc] || {}, away = s.cc !== primary;
      s.dept = R.w(depts.map(d => [d, DEPT_W[d] * (t[d] || 1) * (away && ["Legal", "Finance", "People (HR)"].includes(d) ? 0.4 : 1)]));
    });
    const groups = {};
    slots.forEach(s => (groups[s.cc + "|" + s.dept] = groups[s.cc + "|" + s.dept] || []).push(s));
    Object.values(groups).forEach(m => {
      R.shuffle(m); const n = m.length, nm = n >= 3 ? Math.round(n / 7) : 0, nd = n >= 14 ? 1 : 0;
      m.forEach((s, j) => {
        if (j < nd) Object.assign(s, { level: "M3", title: `Director, ${LABEL(s.dept)}`, mgr: true });
        else if (j < nd + nm) { const l = R.pick(["M1", "M1", "M2"]); Object.assign(s, { level: l, title: `${MGR[l]}, ${LABEL(s.dept)}`, mgr: true }); }
        else { const l = R.w([["IC1", 18], ["IC2", 32], ["IC3", 30], ["IC4", 14], ["IC5", 6]]); Object.assign(s, { level: l, title: IC[s.dept][+l[2] - 1], mgr: false }); }
        emps.push(s);
      });
    });

    /* 2. status and employment type, matching the requested mix */
    const pick = (mix, n) => { const k = apportion(n, mix.map(m => m[1])); return mix.map((m, i) => [m[0], k[i]]); };
    const ics = R.shuffle(emps.filter(e => !e.mgr)), leaders = emps.filter(e => e.mgr);
    emps.forEach(e => { e.type = "Full-time"; e.status = "Active"; });
    let pool = [...ics];
    pick(S.types, emps.length).filter(t => t[0] !== "Full-time").forEach(([t, k]) => { for (let i = 0; i < k && pool.length; i++) { const e = pool.shift(); e.type = t; if (t === "Intern") { e.level = "IC0"; e.title = `${LABEL(e.dept)} Intern`; } } });
    pool = R.shuffle([...ics]);
    const st = pick(S.status, emps.length), leaveN = (st.find(s => s[0] === "On Leave") || [0, 0])[1];
    st.filter(s => s[0] === "Terminated" || s[0] === "Pending Start").forEach(([s, k]) => { for (let i = 0; i < k && pool.length; i++) pool.shift().status = s; });
    const leavePool = R.shuffle([...pool, ...leaders.filter(l => l.level !== "E1")]);
    for (let i = 0; i < leaveN && leavePool.length; i++) leavePool.shift().status = "On Leave";

    /* 3. hire dates */
    const founded = GEN.addDays(today, -Math.round(14 * 365.25));
    const start = {}; S.countries.forEach(c => { start[c.cc] = c.cc === primary ? founded : GEN.between(R, GEN.addDays(founded, 730), GEN.addDays(today, -1460)); });
    emps.forEach(e => {
      const lo = start[e.cc];
      if (e.level === "E1") e.hire = founded;
      else if (e.status === "Pending Start") e.hire = GEN.between(R, GEN.addDays(today, 7), GEN.addDays(today, 60));
      else if (e.type === "Intern" || e.type === "Temporary") e.hire = GEN.between(R, GEN.addDays(today, -520), GEN.addDays(today, -40));
      else if (e.type === "Contractor") e.hire = GEN.between(R, GEN.addDays(today, -1050), GEN.addDays(today, -20));
      else { const hi = ["M3", "M4"].includes(e.level) ? GEN.addDays(today, -1060) : GEN.addDays(today, -12); const a = GEN.between(R, lo, hi < lo ? lo : hi), b = GEN.between(R, lo, hi < lo ? lo : hi); e.hire = R.chance(0.6) ? (a > b ? a : b) : a; }
      e.hire = GEN.monday(e.hire);
    });
    emps.sort((a, b) => (["E1", "M4"].includes(b.level) ? RANK[b.level] : 0) - (["E1", "M4"].includes(a.level) ? RANK[a.level] : 0) || a.hire - b.hire);
    emps.forEach((e, i) => { e.id = `EMP-${10001 + i}`; });

    /* 4. managers */
    const live = m => m.status === "Active" || m.status === "On Leave";
    const byDept = {}; emps.forEach(e => (byDept[e.dept] = byDept[e.dept] || []).push(e));
    emps.forEach(e => {
      if (e.level === "E1") { e.mgrId = ""; return; }
      if (e.level === "M4") { e.mgrId = emps[0].id; return; }
      const c = (byDept[e.dept] || []).filter(m => m.mgr && live(m) && m !== e && (!e.mgr || RANK[m.level] > RANK[e.level]));
      const same = l => c.filter(m => m.cc === e.cc && l.includes(m.level));
      const pool = e.mgr ? (e.level !== "M3" && same(["M3"]).length ? same(["M3"]) : c.filter(m => m.level === "M4"))
        : (same(["M1", "M2"]).length ? same(["M1", "M2"]) : same(["M3"]).length ? same(["M3"]) : c.filter(m => m.level === "M3").length ? c.filter(m => m.level === "M3") : c.filter(m => m.level === "M4"));
      e.mgrId = pool.length ? R.pick(pool).id : emps[0].id;
    });

    /* 5. everything else */
    const used = new Set(), rows = [];
    for (const e of emps) {
      const cc = e.cc, m = GEN.meta(cc), f = fk[cc], loc = m.locale || "en";
      const gender = R.w([["Female", 47], ["Male", 49], ["Non-binary", 1.5], ["Prefer not to say", 2.5]]);
      const nm = e.level === "E1" && cc === "US" ? { first: "Dana", middle: "Marie", last: "Whitfield", local: "" } : GEN.name(R, cc, loc, f, gender === "Female" || (gender !== "Male" && R.chance(0.5)));
      const preferred = GEN.NICK[nm.first] && R.chance(0.5) ? GEN.NICK[nm.first] : nm.first;
      const minAge = { IC0: 19, IC1: 22, IC2: 24, IC3: 27, IC4: 30, IC5: 33, M1: 29, M2: 32, M3: 35, M4: 38, E1: 45 }[e.level];
      let dob = GEN.addDays(e.hire, -Math.round((R.int(minAge, e.level === "IC0" ? 23 : minAge + 20) + R()) * 365.25));
      if (GEN.years(dob, today) > 65) dob = GEN.addDays(today, -Math.round(R.int(55, 64) * 365.25 + R.int(0, 364)));

      /* where they work and live */
      const sites = sitesOf(cc);
      const isHQsite = s => cc === primary && s === sites[0];
      let site, remote = false;
      if (e.level === "E1") site = sitesOf(primary)[0];
      else if (e.level === "M4") site = R.chance(0.7) ? sites[0] : R.pick(sites);
      else { remote = R.chance(S.remotePct / 100); site = R.w(sites.map((s, i) => [s, [3, 2, 1.5][i] || 1])); }
      let work = GEN.place(cc, site.city), home, arrangement;
      if (remote) {
        arrangement = "Remote";
        home = cc === "US" ? GEN.place("US", R.pick(GEN.US_REMOTE)) : GEN.homePlace(R, cc, R.pick(sites).city);
      } else {
        arrangement = R.w(cc === "JP" ? [["Onsite", 57], ["Hybrid", 43]] : [["Onsite", 33], ["Hybrid", 67]]);
        home = GEN.homePlace(R, cc, site.city);
      }
      const tz = remote ? home.tz : work.tz;

      /* contact */
      const sf = GEN.slug(preferred.split(" ")[0]) || "user", sl = GEN.slug(nm.last.split(" ")[0]) || "staff";
      let email = `${sf}.${sl}@${S.domain}`, k = 2; while (used.has(email)) email = `${sf}.${sl}${k++}@${S.domain}`; used.add(email);
      const pemail = `${sf}${R.pick([".", "_", ""])}${sl}${R.chance(0.5) ? R.int(1, 99) : ""}@${R.pick(["example.com", "example.net", "example.org"])}`;

      /* pay */
      const hourly = ["Intern", "Contractor", "Temporary"].includes(e.type) || (cc === "US" && e.level === "IC1" && ["Customer Success", "Operations", "IT"].includes(e.dept) && R.chance(0.7));
      const fte = e.type === "Part-time" ? 0.5 : 1;
      const hours = fte === 0.5 ? 20 : (HOURS[cc] || 40);
      let cur = m.currency; const rate = GEN.FX[cur]; if (!rate) cur = "USD";
      let usd = (e.level === "E1" ? BASE.E1 : BASE[e.level] * (FMULT[e.dept] || 1)) * R.uniform(0.9, 1.12);
      if (cc === "US" && /^(san francisco|new york)$/i.test(site.city)) usd *= 1.12;
      if (e.type === "Contractor") usd *= 1.25;
      const localAnnual = usd * GEN.colFor(cc) * (GEN.FX[cur] || 1);
      const amount = hourly ? (["JPY", "KRW", "IDR", "VND", "COP"].includes(cur) ? GEN.roundMoney(localAnnual / 2080) : Math.round(localAnnual / 2080 * 100) / 100) : GEN.roundMoney(localAnnual * fte);
      const annualLocal = hourly ? amount * hours * 52 : amount;
      let freq = FREQ[cc] || "Monthly"; if (cc === "US" && R.chance(0.2)) freq = "Semi-monthly"; if (e.type === "Contractor") freq = "Monthly";
      let payEff = GEN.between(R, GEN.addDays(today, -680), GEN.addDays(today, -220)); if (payEff < e.hire) payEff = e.hire;
      let bonus = ["Contractor", "Intern", "Temporary"].includes(e.type) ? 0 : BONUS[e.level];
      if (e.dept === "Sales" && /^IC[1-5]$/.test(e.level)) bonus = 0;

      /* time off, probation, notice */
      const ten = Math.max(0, GEN.years(e.hire, today));
      let pto = e.type === "Contractor" ? 0 : ({ US: 15 + (ten >= 3 ? 5 : 0) + (ten >= 7 ? 5 : 0), GB: 25, CA: ten >= 5 ? 20 : 15, DE: e.mgr ? 30 : 28, IN: 21, MX: Math.min(12 + 2 * Math.floor(ten), 20), JP: Math.min(10 + Math.floor(ten), 20), FR: 25, ES: 22, IT: 22, NL: 25, SE: 25, AU: 20, BR: 30 }[cc] ?? 20);
      if (e.type === "Part-time") pto = Math.round(pto / 2);
      if (["Intern", "Temporary"].includes(e.type) && cc === "US") pto = 0;
      const ptoBal = e.status === "Terminated" || e.status === "Pending Start" ? 0 : Math.round(R.uniform(0, pto) * 2) / 2;
      let pm = PROB[cc] ?? 3; if (cc === "MX" && e.mgr) pm = 6;
      const probation = pm && ["Full-time", "Part-time"].includes(e.type) ? GEN.iso(GEN.addMonths(e.hire, pm)) : "";
      let notice = ({ US: "", GB: ["IC0", "IC1", "IC2"].includes(e.level) ? 30 : ["IC3", "IC4", "M1"].includes(e.level) ? 60 : 90, CA: 14, DE: e.mgr ? 90 : 30, IN: e.mgr ? 90 : 60, MX: "", JP: 30 }[cc] ?? 30);
      if (["Contractor", "Intern", "Temporary"].includes(e.type) && notice !== "") notice = cc === "US" ? "" : 14;
      let [idType, idNum] = GEN.nationalId(R, cc);
      if (e.type === "Contractor" && cc === "US") { idType = "EIN"; idNum = `9${R.digits(1)}-${R.digits(7)}`; }
      const wa = auth(R, cc, today);

      /* termination, leave, emergency contact */
      let term = { date: "", reason: "", type: "", rehire: "" };
      if (e.status === "Terminated") {
        const lo = GEN.addDays(e.hire, 60), hi = GEN.addDays(today, -3);
        const t = ["Contractor", "Temporary", "Intern"].includes(e.type) ? ["End of Contract", "Involuntary"] : R.w(TERM.map(x => [x, x[2]]));
        term = { date: GEN.iso(GEN.between(R, lo < hi ? lo : GEN.addDays(hi, -2), hi)), reason: t[0], type: t[1], rehire: t[0] === "Performance" ? "N" : "Y" };
      }
      let leave = { type: "", start: "", ret: "" };
      if (e.status === "On Leave") {
        const L = R.w(LEAVE.map(x => [x, x[1]])), s = GEN.between(R, GEN.addDays(today, -90), GEN.addDays(today, -3));
        let r = GEN.addDays(s, R.int(L[2], L[3])); if (r <= today) r = GEN.addDays(today, R.int(7, 40));
        leave = { type: L[0], start: GEN.iso(s), ret: GEN.iso(r) };
      }
      const ecRel = R.w([["Spouse", 40], ["Partner", 15], ["Parent", 25], ["Sibling", 15], ["Friend", 5]]);
      const ec = GEN.name(R, cc, loc, f, R.chance(0.5));
      const ecLast = ["Parent", "Sibling"].includes(ecRel) || (ecRel === "Spouse" && R.chance(0.6)) ? nm.last : ec.last;

      const created = GEN.addDays(e.hire, -R.int(10, 35));
      let upd = [created, payEff, GEN.between(R, GEN.addDays(today, -300), today)].reduce((a, b) => (a > b ? a : b));
      if (term.date && GEN.d(term.date) > upd) upd = GEN.d(term.date);
      if (leave.start && GEN.d(leave.start) > upd) upd = GEN.d(leave.start);
      if (upd > today) upd = today;
      const us = cc === "US";

      rows.push({
        employee_id: e.id, legal_first_name: nm.first, legal_middle_name: nm.middle, legal_last_name: nm.last, preferred_name: preferred, local_script_name: nm.local,
        date_of_birth: GEN.iso(dob), gender, pronouns: { Female: "she/her", Male: "he/him", "Non-binary": "they/them" }[gender] || "",
        personal_email: pemail, personal_phone: GEN.phone(R, cc, home.area), work_email: email,
        work_phone: e.mgr || ["Sales", "Customer Success"].includes(e.dept) || R.chance(0.3) ? GEN.phone(R, cc, work.area || home.area) : "",
        hire_date: GEN.iso(e.hire), employment_status: e.status, employment_type: e.type,
        flsa_status: us && e.type !== "Contractor" ? (hourly || e.level === "IC0" ? "Non-exempt" : "Exempt") : "",
        fte, standard_weekly_hours: hours,
        job_title: e.title, job_code: `${DCODE[e.dept]}-${e.level}`, job_level: e.level, job_family: FAMILY[e.dept], department: e.dept, cost_center: `CC-${CC[e.dept]}`, manager_id: e.mgrId,
        location_id: remote ? `LOC-${cc}-REMOTE` : site.id, location_name: remote ? `Remote – ${m.name}` : GEN.siteName(work.city, isHQsite(site)),
        region: m.region, work_country_code: cc, work_city: remote ? "" : work.city, work_state_province: remote ? home.state : work.state,
        work_arrangement: arrangement, time_zone: tz, legal_entity: GEN.entity(S.company, cc),
        home_address_line1: GEN.street(R, cc, loc, f, home.city), home_address_line2: GEN.line2(R, cc, f), home_city: home.city, home_state_province: home.state,
        home_postal_code: GEN.postal(R, cc, home.key, f), home_country_code: cc,
        pay_type: hourly ? "Hourly" : "Salary", base_pay_amount: amount, pay_currency: cur, pay_frequency: freq, pay_effective_date: GEN.iso(payEff),
        annual_base_usd_equiv: Math.round(annualLocal / (GEN.FX[cur] || 1)), bonus_target_percent: bonus, commission_eligible: e.dept === "Sales" && e.level !== "IC0" && e.type === "Full-time" ? "Y" : "N",
        pto_annual_allowance_days: pto, pto_balance_days: ptoBal, probation_end_date: probation, notice_period_days: notice,
        national_id_type: idType, national_id_number: idNum, work_authorization_type: wa.type, work_authorization_expiry: wa.exp, sponsorship_required: wa.sponsor,
        termination_date: term.date, termination_reason: term.reason, termination_type: term.type, rehire_eligible: term.rehire,
        leave_type: leave.type, leave_start_date: leave.start, leave_expected_return_date: leave.ret,
        emergency_contact_name: `${ec.first} ${ecLast}`, emergency_contact_relationship: ecRel, emergency_contact_phone: GEN.phone(R, cc, home.area),
        race_ethnicity: us ? R.w(RACE) : "", veteran_status: us ? R.w([["Not a protected veteran", 90], ["Protected veteran", 6], ["Decline to state", 4]]) : "",
        disability_status: us ? R.w([["No", 85], ["Yes", 6], ["Decline to state", 9]]) : "",
        created_at: GEN.stamp(R, created), updated_at: GEN.stamp(R, upd),
      });
    }
    rows.sort((a, b) => a.employee_id.localeCompare(b.employee_id));
    return { table: "employees", pk: "employee_id", rows };
  }
  return { generate };
})();
