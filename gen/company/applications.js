/* Module: applications, application roles and their links. */
(() => {
  COMPANY.appRegs = (ctx, a) => {
    const REGS = ctx.P.regulations_by_data_type || {};
    let regs = [];
    for (const k of a.data || []) regs = regs.concat(REGS[k] || []);
    if (a.fin_sig) regs.push("SOC 1");
    if (a.kind === "product" || (["External", "Both"].includes(a.users) && a.kind !== "corporate")) regs.push("SOC 2");
    if ((a.data || []).includes("payroll") && a.internet_facing) regs.push("NYDFS Part 500");
    return COMPANY.uniq(regs);
  };
  const countries = a => a.federal ? ["US"] : (a.data || []).includes("eu") ? ["US", "IE", "GB"] : ["US"];
  const HOST = { "Built in-house (cloud)": "Cloud (built in-house)", "Built in-house (GovCloud)": "Cloud (built in-house, GovCloud)", SaaS: "SaaS" };
  const CATEGORY = { product: "Customer-facing product", platform: "Internal platform component", corporate: "Corporate system" };

  COMPANY.register({
    id: "applications", title: "Applications", requires: ["catalog"],
    description: "Applications with regulatory scope and impact, and who holds each role on them",
    files: ["applications.csv", "application_roles.csv", "links_application_service.csv", "links_application_data_type.csv", "links_application_vendor.csv"],
    build(ctx) {
      const { P, DTYPES, VENDORS, UNITS, RULES } = ctx, R = RULES.app_roles;
      const roles = ctx.appRoles = [];
      const add = (a, role, key) => roles.push({ application_source_id: a.id, application: a.name, role, person_id: ctx.pid(key) });
      for (const a of P.applications) {
        const inhouse = a.hosting.startsWith("Built"), fed = !!a.federal, data = a.data || [];
        for (const k of data) if (!DTYPES[k]) throw new Error(`Application ${a.id}: unknown data type ${k}`);
        add(a, "Business owner", a.owner);
        add(a, "Technical owner", a.tech);
        const restricted = data.filter(k => DTYPES[k].classification === "Restricted");
        add(a, "Data owner", restricted.length ? DTYPES[restricted[0]].steward : a.owner);
        add(a, "Security contact", fed ? R.security_federal : inhouse ? R.security_inhouse : R.security_saas);
        if (data.length) add(a, "Privacy contact", data.includes("phi") ? R.privacy_phi : fed ? R.privacy_default : data.includes("eu") ? R.privacy_eu : R.privacy_default);
        add(a, "Access approver", a.owner);
        if (a.vendor) add(a, "Vendor manager", VENDORS[a.vendor].owner);
        add(a, "Continuity coordinator", R.continuity);
        add(a, "Disaster recovery lead", fed ? R.dr_federal : inhouse ? R.dr_inhouse : R.dr_saas);
        add(a, "Executive sponsor", UNITS[ctx.divisionOf(ctx.byPos[a.owner][0].unit)].head);
      }
      for (const r of roles) ctx.owners.push({ id: r.person_id, what: `${r.role} of ${r.application_source_id}` });
    },
    write(ctx) {
      const { P, DTYPES, VENDORS, SVC, RULES } = ctx;
      const rows = P.applications.map(a => {
        const inhouse = a.hosting.startsWith("Built"), data = a.data || [];
        const storage = a.hosting === "Built in-house (cloud)" ? ["AWS us-west-2"].concat(data.includes("eu") ? ["AWS eu-west-1"] : [])
          : a.federal ? ["AWS GovCloud (US) us-gov-west-1"] : [a.vendor ? `Vendor: ${VENDORS[a.vendor].name}` : "Vendor"];
        return { source_id: a.id, name: a.name, application_category: CATEGORY[a.kind], business_owner_employee_id: ctx.pid(a.owner),
          hosting_model: HOST[a.hosting], vendor_code: a.vendor || "", internet_facing: a.internet_facing, users: a.users, sign_in_method: a.sign_in,
          source: RULES.source_name, code_repository: inhouse ? `GitHub Enterprise: ${RULES.code_org}/${COMPANY.slug(a.name)}` : "",
          environments: inhouse ? ["Production", "Staging", "Development"] : ["Production"], lifecycle_status: "Production",
          data_types_handled: data.map(k => DTYPES[k].name), revenue_supported: a.revenue, cost_of_outage_per_day: a.outage,
          users_affected: a.users_affected, records_held: a.records, data_storage_locations: storage, countries_and_regions: countries(a),
          regulatory_scope: COMPANY.appRegs(ctx, a), financially_significant: !!a.fin_sig, customer_facing: a.kind === "product",
          contractual_commitments: a.contractual || "", rto_hours: a.rto, rpo_hours: a.rpo, maximum_tolerable_downtime_hours: a.mtd,
          reputational_impact: a.reputational, larkspur_federal: !!a.federal };
      });
      COMPANY.table(ctx, "applications.csv", Object.keys(rows[0]), rows);
      COMPANY.table(ctx, "application_roles.csv", ["application_source_id", "application", "role", "person_id"], ctx.appRoles);
      COMPANY.table(ctx, "links_application_service.csv", ["application_source_id", "service"], P.applications.flatMap(a => (a.services || []).map(s => [a.id, SVC[s].name])));
      COMPANY.table(ctx, "links_application_data_type.csv", ["application_source_id", "data_type"], P.applications.flatMap(a => (a.data || []).map(k => [a.id, DTYPES[k].name])));
      COMPANY.table(ctx, "links_application_vendor.csv", ["application_source_id", "vendor_code"], P.applications.filter(a => a.vendor).map(a => [a.id, a.vendor]));
    },
    checks(ctx) {
      const { P, RULES, byId } = ctx;
      const fedApps = new Set(P.applications.filter(a => a.federal).map(a => a.id));
      const fedGroup = ctx.groups[RULES.federal_group] || new Set();
      const onFed = ctx.appRoles.filter(r => fedApps.has(r.application_source_id));
      let bad = COMPANY.uniq(onFed.filter(r => !fedGroup.has(r.person_id)).map(r => r.person_id));
      COMPANY.check(ctx, "Everyone with a role on a federal application has federal access", !bad.length, bad.join(", "));
      bad = COMPANY.uniq(onFed.filter(r => byId[r.person_id].site === RULES.restricted_site).map(r => r.person_id));
      COMPANY.check(ctx, "No Manila person is linked to a federal application", !bad.length, bad.join(", "));
      bad = P.applications.filter(a => { const scope = new Set(COMPANY.appRegs(ctx, a)); return (a.data || []).some(k => ((P.regulations_by_data_type || {})[k] || []).some(x => !scope.has(x))); }).map(a => a.id);
      COMPANY.check(ctx, "Application regulatory scope covers its data types", !bad.length, bad.join(", "));
    },
  });
})();
