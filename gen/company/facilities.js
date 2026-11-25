/* Module: facilities (sites, buildings, secure areas) from the profile. */
(() => {
  COMPANY.register({
    id: "facilities", title: "Facilities", requires: ["org"],
    description: "Sites, buildings and secure areas, with facility managers and area owners",
    files: ["facilities_sites.csv", "facilities_buildings.csv", "facilities_secure_areas.csv"],
    build(ctx) {
      for (const s of ctx.P.sites) ctx.owners.push({ id: ctx.pid(s.facility_manager), what: `facility manager of ${s.id}` });
      for (const a of ctx.P.secure_areas || []) ctx.owners.push({ id: ctx.pid(a.owner), what: `owner of ${a.id}` });
    },
    write(ctx) {
      const { P } = ctx;
      COMPANY.table(ctx, "facilities_sites.csv",
        ["site_id", "name", "site_type", "address", "city", "state_province", "postal_code", "country", "region", "time_zone", "ownership", "landlord_or_provider", "lease_end_date", "facility_manager_employee_id", "business_units_present", "status"],
        P.sites.map(s => ({ site_id: s.id, name: s.name, site_type: s.type, address: s.building, city: s.city, state_province: s.state,
          postal_code: s.postal_code, country: s.country, region: s.region, time_zone: s.time_zone, ownership: s.ownership,
          landlord_or_provider: s.landlord, lease_end_date: s.lease_end, facility_manager_employee_id: ctx.pid(s.facility_manager),
          business_units_present: COMPANY.sortStr(COMPANY.uniq(ctx.people.filter(p => p.site === s.id && p.status !== "terminated").map(p => p.unit))),
          status: "Active" })));
      COMPANY.table(ctx, "facilities_buildings.csv", ["building_id", "site_id", "name", "floors", "area_sqft"],
        P.sites.map(s => ({ building_id: `${s.id}-B1`, site_id: s.id, name: s.building, floors: s.floors, area_sqft: s.area_sqft })));
      COMPANY.table(ctx, "facilities_secure_areas.csv", ["area_id", "name", "building_id", "area_type", "access_control", "area_owner_employee_id", "purpose"],
        (P.secure_areas || []).map(a => ({ area_id: a.id, name: a.name, building_id: `${a.site}-B1`, area_type: a.type, access_control: a.access_control,
          area_owner_employee_id: ctx.pid(a.owner), purpose: a.purpose })));
    },
  });
})();
