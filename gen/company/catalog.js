/* Module: data types, vendors (and their contacts), products, services, business functions. */
(() => {
  const contract = (ctx, code) => {
    const r = ctx.rng("contract", code);
    let start = COMPANY.randDate(r, "2016-01-01", "2025-06-30");
    while (COMPANY.addDays(start, 365 * 3) < ctx.AS_OF) start = COMPANY.addDays(start, 365 * 3);
    const end = COMPANY.addDays(start, 365 * 3);
    return [start, end, COMPANY.addDays(end, -90)];
  };

  COMPANY.register({
    id: "catalog", title: "Data types, vendors and services", requires: ["org"],
    description: "Data types, vendors with contacts and contracts, products, business services and business functions",
    files: ["data_types.csv", "vendors.csv", "products.csv", "services.csv", "business_functions.csv",
            "links_vendor_data_type.csv", "links_service_product.csv", "links_service_data_type.csv", "links_business_function_service.csv"],
    build(ctx) {
      const { P, DTYPES } = ctx;
      /* Vendor contacts: one per Critical or High vendor (people records, not employees) */
      for (const v of P.vendors) {
        if (!["Critical", "High"].includes(v.tier)) continue;
        const r = ctx.rng("vcontact", v.code);
        const [first, last] = COMPANY.personName(r, ["US", "IE", "GB", "PH"].includes(v.country) ? v.country : "US");
        const stem = v.name.toLowerCase().split(" (")[0].replace(/[^a-z0-9]/g, "").slice(0, 20);
        const owner = ctx.byPos[v.owner][0];
        ctx.vendorContacts.push({ id: `VC-${v.code.slice(2)}`, kind: "vendor_contact", first, last, preferred: "",
          email: COMPANY.emailFor(ctx, first, last, `${stem}.example`), phone: "", title: `Account Manager, ${v.name}`,
          unit: owner.unit, manager: null, site: "", position: "", country: v.country || "US", state: "", city: "", region: "", tz: "",
          status: "active", hire: null, term: null, leave_start: null, expected_return: null, vendor: v.code });
      }
      for (const t of P.data_types) ctx.owners.push({ id: ctx.pid(t.steward), what: `steward of ${t.name}` });
      for (const v of P.vendors) ctx.owners.push({ id: ctx.pid(v.owner), what: `owner of ${v.code}` });
      for (const v of P.vendors) for (const k of v.data || []) if (!DTYPES[k]) throw new Error(`Vendor ${v.code}: unknown data type ${k}`);
    },
    write(ctx) {
      const { P, DTYPES, SVC } = ctx;
      const dt = k => DTYPES[k].name;
      COMPANY.table(ctx, "data_types.csv", ["name", "category", "classification", "regulatory_tags", "data_steward_employee_id"],
        P.data_types.map(t => ({ name: t.name, category: t.category, classification: t.classification, regulatory_tags: t.regulatory_tags, data_steward_employee_id: ctx.pid(t.steward) })));
      ctx.vendorRows = P.vendors.map(v => {
        const [cs, ce, cr] = contract(ctx, v.code);
        return { vendor_code: v.code, name: v.name, website_domain: v.domain, vendor_type: v.type, tier: v.tier, status: "Active",
          relationship_owner_employee_id: ctx.pid(v.owner), business_units_using: v.units || [], data_types_accessed: (v.data || []).map(dt),
          system_access: !!v.system_access, country: v.country || "", contract_start: cs, contract_end: ce, renewal_notice_date: cr,
          name_is_real_company: !v.fictional, note: v.note || "" };
      });
      COMPANY.table(ctx, "vendors.csv", Object.keys(ctx.vendorRows[0]), ctx.vendorRows);
      COMPANY.table(ctx, "products.csv", ["product_key", "name", "business_unit_code", "owner_employee_id", "status", "markets", "revenue_supported", "rto_hours", "customer_facing"],
        (P.products || []).map(p => ({ product_key: p.key, name: p.name, business_unit_code: p.unit, owner_employee_id: ctx.pid(p.owner), status: "Active",
          markets: p.markets, revenue_supported: p.revenue, rto_hours: p.rto_hours, customer_facing: p.customer_facing })));
      COMPANY.table(ctx, "services.csv", ["service_key", "name", "service_type", "business_units_served", "owner_employee_id", "customers", "status", "rto_hours"],
        (P.services || []).map(s => ({ service_key: s.key, name: s.name, service_type: s.type, business_units_served: s.units, owner_employee_id: ctx.pid(s.owner),
          customers: s.customers, status: "Active", rto_hours: s.rto_hours })));
      COMPANY.table(ctx, "business_functions.csv", ["name", "business_unit_code", "criticality"],
        (P.business_functions || []).map(b => ({ name: b.name, business_unit_code: b.unit, criticality: b.criticality })));
      const product = k => (P.products.find(p => p.key === k) || { name: k }).name;
      COMPANY.table(ctx, "links_vendor_data_type.csv", ["vendor_code", "data_type"], P.vendors.flatMap(v => (v.data || []).map(k => [v.code, dt(k)])));
      COMPANY.table(ctx, "links_service_product.csv", ["service", "product"], (P.services || []).flatMap(s => (s.products || []).map(k => [s.name, product(k)])));
      COMPANY.table(ctx, "links_service_data_type.csv", ["service", "data_type"], (P.services || []).flatMap(s => (s.data || []).map(k => [s.name, dt(k)])));
      COMPANY.table(ctx, "links_business_function_service.csv", ["business_function", "service"], (P.business_functions || []).flatMap(b => (b.services || []).map(k => [b.name, SVC[k].name])));
    },
    checks(ctx) {
      const bad = ctx.P.vendors.filter(v => (v.data || []).some(k => ctx.DTYPES[k].classification === "Restricted") && !["Critical", "High"].includes(v.tier)).map(v => v.code);
      COMPANY.check(ctx, "Vendors with Restricted data are at least High tier", !bad.length, bad.join(", "));
    },
  });
})();
