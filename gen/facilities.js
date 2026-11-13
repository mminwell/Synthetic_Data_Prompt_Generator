/* Facilities generator: sites -> buildings -> floors -> spaces.
   Desks and offices are assigned to employees from the HR generator (same HR settings + seed),
   so the two files line up. Same settings + seed => same output. */
const FAC_GEN = (() => {
  const SQFT = 10.7639;
  /* [min area sq ft, max area sq ft, capacity fn, amenities] */
  const TYPE = {
    "Desk": [50, 80, () => 1, ["Dual monitors", "Docking station", "Sit-stand desk"]],
    "Private office": [100, 200, R => R.int(1, 2), ["Monitor", "Whiteboard", "Guest chair"]],
    "Meeting room": [150, 600, (R, a) => Math.max(4, Math.min(20, Math.round(a / 25))), ["Display", "Video conferencing", "Whiteboard", "Speakerphone"]],
    "Phone booth": [25, 40, () => 1, ["Acoustic panels", "Power outlet"]],
    "Collaboration area": [200, 800, (R, a) => Math.max(6, Math.min(30, Math.round(a / 30))), ["Whiteboard", "Display", "Soft seating"]],
    "Lab": [300, 1200, R => R.int(4, 12), ["ESD flooring", "Test benches", "Fume hood"]],
    "Storage / support": [60, 400, () => 0, ["Shelving", "Badge access"]],
    "Server room": [300, 2000, () => 0, ["Raised floor", "Fire suppression", "UPS", "Precision cooling"]],
  };
  const ROOMS = "Aspen Birch Cedar Cypress Elm Juniper Linden Maple Oak Pine Redwood Sequoia Spruce Willow Alder Hawthorn Summit Ridge Canyon Mesa Harbor Delta Fjord Glacier Lagoon Meadow Prairie Tundra Atlas Comet Nova Orbit Pulsar Quasar Vega Lyra Orion Polaris Sirius".split(" ");
  const BWORD = [["North", "South", "East", "West", "Central", "Park", "River", "Summit", "Harbor", "Union", "Market", "Granite"], ["Tower", "Building", "Plaza", "House", "Centre", "Commons", "Court", "Place"]];
  const LANDLORD = [["Harborview", "Granite", "Northgate", "Bluestone", "Cedarline", "Ironbridge", "Silverline", "Kestrel", "Aldergrove", "Westmark", "Brightwater", "Stonehaven"], ["Properties", "Realty", "Estates", "Holdings", "Real Estate Partners", "Property Group"]];
  const PRIME = /^(new york|san francisco|london|tokyo|zurich|geneva|singapore|hong kong|paris|sydney)$/i;

  async function generate(S) {
    const R = GEN.rng(S.seed ^ 0x5F3759DF), today = GEN.d(S.asof);
    await GEN.prepare(S.countries.map(c => GEN.meta(c.cc).locale || "en"));
    const fk = {}; S.countries.forEach(c => { fk[c.cc] = GEN.faker(GEN.meta(c.cc).locale, (S.seed ^ GEN.hash("fac" + c.cc)) >>> 0); });
    const types = S.siteTypes.length ? S.siteTypes : ["Office"];
    const primary = S.countries.some(c => c.cc === S.primary) ? S.primary : S.countries[0].cc;
    const sqm = cc => S.area === "m²" || (S.area === "local" && cc !== "US");
    const unit = cc => sqm(cc) ? "m²" : "sq ft";
    const toUnit = (cc, sqft) => sqm(cc) ? Math.round(sqft / SQFT) : Math.round(sqft);

    /* employees from the HR generator, for assignments and facility managers */
    let emps = [];
    if (S.hr && S.hr.countries.length) { try { emps = (await HR_GEN.generate(S.hr)).rows.filter(e => e.employment_status === "Active" || e.employment_status === "On Leave"); } catch (e) { emps = []; } }
    const taken = new Set(); let shortfall = 0;

    /* 1. sites */
    const sites = [];
    S.countries.forEach(c => {
      const list = c.sites.length ? c.sites : [{ id: `LOC-${c.cc}-${cityCode(GEN.meta(c.cc).capital || c.cc)}`, city: GEN.meta(c.cc).capital || GEN.meta(c.cc).name }];
      list.forEach((s, i) => {
        const hq = c.cc === primary && i === 0;
        const type = hq && types.includes("Headquarters") ? "Headquarters" : types.includes("Office") || types.includes("Headquarters") ? "Office" : types[0];
        sites.push({ id: s.id, cc: c.cc, city: s.city, type, hq, weight: hq ? 3 : i === 0 ? 2 : 1.4 });
      });
    });
    const addSite = (cc, id, city, type, weight) => { if (!sites.some(s => s.id === id)) sites.push({ id, cc, city, type, hq: false, weight, special: true }); };
    if (types.includes("Data Center")) {
      const byRegion = {}; S.countries.forEach(c => { const r = GEN.meta(c.cc).region; if (!byRegion[r] || c.count > byRegion[r].count) byRegion[r] = c; });
      Object.values(byRegion).forEach(c => addSite(c.cc, `LOC-${c.cc}-DC1`, sites.find(s => s.cc === c.cc).city, "Data Center", 0));
    }
    if (types.includes("Warehouse")) addSite(primary, `LOC-${primary}-WH1`, sites.find(s => s.cc === primary).city, "Warehouse", 0);
    if (types.includes("Lab")) addSite(primary, `LOC-${primary}-LAB1`, sites.find(s => s.cc === primary).city, "Lab", 0);
    if (types.includes("Coworking")) { const small = [...S.countries].sort((a, b) => a.count - b.count)[0]; const s = sites.filter(x => x.cc === small.cc && !x.special).pop(); if (s && !s.hq) s.type = "Coworking"; }

    /* 2. how many spaces each site gets (country totals are exact) */
    S.countries.forEach(c => {
      const cs = sites.filter(s => s.cc === c.cc);
      const special = cs.filter(s => s.special), normal = cs.filter(s => !s.special);
      let left = c.count;
      special.forEach(s => { s.n = Math.min(left, s.type === "Data Center" ? Math.max(4, Math.round(c.count * 0.05)) : Math.max(3, Math.round(c.count * 0.03))); left -= s.n; });
      const k = apportion(left, normal.map(s => s.weight)); normal.forEach((s, i) => s.n = k[i]);
    });

    /* 3. space types and occupancy across all office spaces, matching the mix exactly */
    const officeN = sites.filter(s => !["Data Center", "Warehouse", "Lab"].includes(s.type)).reduce((a, s) => a + s.n, 0);
    const bag = (mix, n) => { const k = apportion(n, mix.map(m => m[1])); return R.shuffle(mix.flatMap((m, i) => Array(k[i]).fill(m[0]))); };
    const typeBag = bag(S.spaceMix, officeN), occBag = bag(S.occMix, S.n);

    const out = { sites: [], buildings: [], floors: [], spaces: [] }, flat = [];
    for (const site of sites) {
      if (!site.n) continue;
      const cc = site.cc, m = GEN.meta(cc), f = fk[cc], loc = m.locale || "en", pl = GEN.place(cc, site.city);
      const isOffice = !["Data Center", "Warehouse", "Lab"].includes(site.type);
      const name = site.type === "Headquarters" ? GEN.siteName(pl.city, true) : site.type === "Office" || site.type === "Coworking" ? GEN.siteName(pl.city, false) + (site.type === "Coworking" ? " (Coworking)" : "") : `${pl.city} ${site.type}`;
      /* staff at this site */
      const here = emps.filter(e => e.location_id === site.id), inCountry = emps.filter(e => e.work_country_code === cc);
      const fmPool = (here.length ? here : inCountry).filter(e => ["Operations", "People (HR)", "IT"].includes(e.department));
      const fm = fmPool.length ? R.pick(fmPool).employee_id : "";
      /* lease */
      const owned = site.type === "Headquarters" ? R.chance(0.4) : site.type === "Data Center" ? R.chance(0.3) : site.type === "Coworking" ? false : R.chance(0.12);
      let lease = { ownership_type: owned ? "Owned" : "Leased", landlord_name: "", lease_start_date: "", lease_end_date: "", annual_rent_amount: "", rent_currency: "", renewal_option: "" };
      const opened = GEN.between(R, GEN.addDays(today, -365 * 12), GEN.addDays(today, -400));
      if (!owned) {
        const term = site.type === "Coworking" ? R.int(1, 3) : R.int(5, 15);
        let start = opened, end = GEN.addMonths(start, term * 12);
        while (end < GEN.addDays(today, 30)) { start = end; end = GEN.addMonths(start, term * 12); }
        if (R.chance(0.15)) end = GEN.between(R, GEN.addDays(today, 60), GEN.addDays(today, 540));
        const cur = GEN.FX[m.currency] ? m.currency : "USD";
        lease = { ownership_type: "Leased", landlord_name: site.type === "Coworking" ? `${R.pick(LANDLORD[0])} Workspace` : `${R.pick(LANDLORD[0])} ${R.pick(LANDLORD[1])}`, lease_start_date: GEN.iso(start), lease_end_date: GEN.iso(end), annual_rent_amount: 0, rent_currency: cur, renewal_option: R.chance(0.7) ? "Y" : "N", _rate: 45 * GEN.colFor(cc) * (PRIME.test(pl.city) ? 1.6 : 1) * GEN.FX[cur] };
      }
      const siteRow = { site_id: site.id, site_name: name, site_type: site.type, region: m.region, country_code: cc, address_line1: GEN.street(R, cc, loc, f, pl.city), city: pl.city, state_province: pl.state, postal_code: GEN.postal(R, cc, pl.key, f), time_zone: pl.tz, site_status: "Active", ...lease, created_at: GEN.stamp(R, opened), updated_at: GEN.stamp(R, GEN.between(R, GEN.addDays(today, -200), today)) };
      out.sites.push(siteRow);

      /* buildings */
      const nb = Math.max(1, Math.min(site.n, S.bps === "exactly 1" || !isOffice ? 1 : S.bps === "1–4" ? (site.hq ? R.int(3, 4) : R.int(1, 2)) : (site.hq ? 2 : R.int(1, 2))));
      const per = apportion(site.n, Array(nb).fill(1));
      let siteSqft = 0;
      for (let b = 0; b < nb; b++) {
        const bid = `${site.id}-B${b + 1}`, perFloor = isOffice ? R.int(28, 60) : R.int(8, 20);
        const usedFloors = Math.max(1, Math.ceil(per[b] / perFloor)), tower = isOffice && /^(new york|chicago|san francisco|london|tokyo|toronto|mexico city|sydney|singapore|hong kong|shanghai|seoul)$/i.test(pl.city);
        const total = usedFloors + (tower ? R.int(6, 30) : R.int(0, 3)), base = total - usedFloors > 0 ? R.int(1, total - usedFloors + 1) : 1;
        const cert = R.chance(0.35) ? "None" : cc === "US" || cc === "CA" ? R.pick(["LEED Certified", "LEED Silver", "LEED Gold", "LEED Platinum"]) : cc === "JP" ? R.pick(["CASBEE A", "CASBEE S"]) : m.region === "EMEA" ? R.pick(["BREEAM Good", "BREEAM Very Good", "BREEAM Excellent"]) : R.pick(["LEED Silver", "LEED Gold"]);
        const bRow = { building_id: bid, site_id: site.id, building_name: nb === 1 && !isOffice ? `${pl.city} ${site.type}` : `${R.pick(BWORD[0])} ${R.pick(BWORD[1])}`, year_built: R.int(1968, today.getUTCFullYear() - 2), total_floors: total, gross_area: 0, area_unit: unit(cc), certification: cert, created_at: siteRow.created_at, updated_at: GEN.stamp(R, GEN.between(R, GEN.addDays(today, -200), today)) };
        out.buildings.push(bRow);
        const fl = apportion(per[b], Array(usedFloors).fill(1));
        let bSqft = 0;
        for (let i = 0; i < usedFloors; i++) {
          const num = base + i, fid = `${bid}-F${String(num).padStart(2, "0")}`;
          const fRow = { floor_id: fid, building_id: bid, floor_number: num, floor_area: 0, created_at: siteRow.created_at, updated_at: bRow.updated_at };
          out.floors.push(fRow);
          const hood = S.depts.length ? R.pick(S.depts) : "Operations";
          let fSqft = 0, roomIx = R.int(0, ROOMS.length - 1);
          for (let k = 0; k < fl[i]; k++) {
            const t = site.type === "Data Center" ? (k % 4 === 3 ? "Storage / support" : "Server room") : site.type === "Warehouse" ? (k % 3 === 2 ? "Desk" : "Storage / support") : site.type === "Lab" ? (k % 3 === 2 ? "Desk" : "Lab") : typeBag.pop() || "Desk";
            const [lo, hi, cap, am] = TYPE[t], sqft = R.int(lo, hi), seq = 100 + k + 1;
            fSqft += sqft;
            let occ = occBag.pop() || "Occupied";
            let assigned = "", dept = hood;
            if (occ === "Occupied" && (t === "Desk" || t === "Private office") && emps.length) {
              const pool = (here.length ? here : inCountry).filter(e => !taken.has(e.employee_id) && (t === "Private office" ? /^(M|E)/.test(e.job_level) || R.chance(0.2) : e.work_arrangement !== "Remote"));
              const best = pool.filter(e => e.department === hood);
              const e = (best.length && R.chance(0.7) ? R.pick(best) : pool.length ? R.pick(pool) : null);
              if (e) { assigned = e.employee_id; dept = e.department; taken.add(assigned); } else { occ = "Reserved"; shortfall++; }
            }
            const shared = ["Meeting room", "Phone booth", "Collaboration area"].includes(t);
            const name = t === "Meeting room" || t === "Collaboration area" ? ROOMS[roomIx++ % ROOMS.length] : t === "Phone booth" ? `PB-${num}.${String(k + 1).padStart(2, "0")}` : `${num}.${seq}`;
            const util = occ === "Under renovation" ? 0 : shared ? R.int(30, 85) : occ === "Occupied" ? R.int(45, 95) : R.int(0, 25);
            const sRow = {
              space_id: `${fid}-${seq}`, floor_id: fid, space_name: name, space_type: t, capacity: cap(R, sqft), area: toUnit(cc, sqft),
              bookable: shared || (t === "Desk" && !assigned) ? "Y" : "N", occupancy_status: occ, amenities: R.shuffle([...am]).slice(0, R.int(1, Math.min(3, am.length))).join("; "),
              assigned_employee_id: assigned, department: shared || t === "Server room" ? "" : dept, cost_center: shared || t === "Server room" ? "" : `CC-${CC[dept] || 3100}`,
              facility_manager_employee_id: fm, last_inspection_date: GEN.iso(GEN.between(R, GEN.addDays(today, -360), GEN.addDays(today, -5))),
              next_maintenance_date: GEN.iso(GEN.between(R, GEN.addDays(today, 7), GEN.addDays(today, 270))), utilization_percent: util,
              created_at: siteRow.created_at, updated_at: GEN.stamp(R, GEN.between(R, GEN.addDays(today, -120), today)),
            };
            out.spaces.push(sRow);
            flat.push({ ...siteRow, ...bRow, ...fRow, ...sRow });
          }
          const fa = Math.round(fSqft * R.uniform(1.25, 1.4)); fRow.floor_area = toUnit(cc, fa); bSqft += fa;
        }
        const ga = Math.round(bSqft * (total / usedFloors) * R.uniform(0.95, 1.05)); bRow.gross_area = toUnit(cc, ga); siteSqft += bSqft;
      }
      if (siteRow.ownership_type === "Leased") { siteRow.annual_rent_amount = GEN.roundMoney(siteSqft * siteRow._rate); }
      delete siteRow._rate;
    }
    /* flat rows carry the final floor / building / rent figures */
    const idx = o => Object.fromEntries(o.map(r => [r[Object.keys(r)[0]], r]));
    const S2 = idx(out.sites), B2 = idx(out.buildings), F2 = idx(out.floors);
    const SP = idx(out.spaces);
    flat.forEach(r => { Object.assign(r, S2[r.site_id], B2[r.building_id], F2[r.floor_id], SP[r.space_id]); });
    return { table: "spaces", pk: "space_id", rows: flat, tables: out, extraNote: emps.length ? `${taken.size.toLocaleString()} desks and offices are assigned to employees from the HR page (its current settings and seed), so the two files match.${shortfall ? ` ${shortfall} desks or offices marked Occupied had no one left at their site to assign, so they show as Reserved.` : ""}` : "" };
  }
  return { generate };
})();
