/* Module: assets (cloud, secure zone, clinic, network gear, laptops) and their links. */
(() => {
  const { slug, randDate, addDays } = COMPANY;
  const PATCHED = new Set(["Virtual machine", "Container cluster", "Database", "Laptop", "Workstation", "Firewall", "Switch", "Wireless controller", "Server"]);
  const LEVELS = ["Internal", "Confidential", "Restricted"];

  COMPANY.register({
    id: "assets", title: "Assets (CMDB)", requires: ["applications", "facilities"],
    description: "Cloud clusters, services, databases, buckets, keys, secure-zone hosts, network gear and laptops",
    files: ["assets.csv", "links_application_asset.csv", "links_asset_data_type.csv"],
    build(ctx) {
      const { P, DTYPES, RULES, AS_OF } = ctx, A = RULES.assets;
      const assets = ctx.assets = [], linkApp = [], linkDt = [];
      let ipn = 0;
      const owner = k => k ? ctx.pid(k) : "";
      const add = (r, o) => {
        const { name, ci, env, hosting, ownerKey, source, acct = null, location = "", os = "", software = "", manufacturer = "", model = "",
          serial = "", services = [], classification = "", install = null, eol = null, hostname = null, lifecycle = "In use", resourceType = null } = o;
        const id = `CI${assets.length + 100001}`;
        let cloud = "", prov = "", acctId = "", region = "";
        if (acct) {
          [, acctId, region] = RULES.accounts[acct];
          cloud = `arn:${acct === "gov" ? "aws-us-gov" : "aws"}:${resourceType}:${region}:${acctId}:${slug(name)}`;
          prov = acct === "gov" ? "AWS GovCloud (US)" : "AWS";
        }
        let ip = "";
        if (!["Storage bucket", "Encryption key"].includes(ci)) { ipn++; ip = `10.${RULES.ip_blocks[acct] ?? 60}.${Math.floor(ipn / 250) % 250}.${ipn % 250 + 2}`; }
        const a = { source_system: source, source_id: id, cloud_resource_id: cloud, name, asset_type: ci, environment: env,
          hostname: hostname !== null ? hostname : (acct ? "" : slug(name).slice(0, 40)), ip_addresses: ip, os, software, manufacturer, model,
          serial_number: serial, hosting_type: hosting, cloud_provider: prov, cloud_account: acctId, cloud_region: region, location,
          technical_owner: owner(ownerKey), assigned_to: "", services_supported: services, data_classification: classification, lifecycle_status: lifecycle,
          install_date: install || randDate(r, "2019-01-01", addDays(AS_OF, -60)), end_of_life_date: eol || "", last_patched_date: "",
          discovery_source: source, last_seen: lifecycle === "In use" ? AS_OF : "" };
        if (lifecycle === "In use" && PATCHED.has(ci)) a.last_patched_date = addDays(AS_OF, -r.range(3, 45));
        assets.push(a);
        return a;
      };

      /* Shared platform */
      let r = ctx.rng("assets");
      const shared = {};
      for (const [acct, c] of Object.entries(A.shared_clusters))
        shared[acct] = add(r, { name: c.name, ci: "Container cluster", env: c.env, hosting: "Cloud", ownerKey: acct === "gov" ? A.federal_owner : A.platform_owner,
          source: "AWS Config", acct, software: "Amazon EKS 1.31", resourceType: "eks", services: c.services });
      for (const acct of ["us", "eu", "gov"]) {
        const region = RULES.accounts[acct][2];
        add(r, { name: `alb-public-${region}`, ci: "Load balancer", env: "Production", hosting: "Cloud", ownerKey: acct === "gov" ? A.federal_owner : A.platform_owner, source: "AWS Config", acct, resourceType: "elasticloadbalancing" });
        add(r, { name: `kms-data-key-${region}`, ci: "Encryption key", env: "Production", hosting: "Cloud", ownerKey: acct === "gov" ? A.federal_owner : A.security_owner, source: "AWS Config", acct, resourceType: "kms", classification: "Restricted" });
      }
      /* Per in-house application: service, database (+ EU copy), bucket */
      for (const a of P.applications) {
        if (!a.hosting.startsWith("Built")) continue;
        const fed = !!a.federal, acct = fed ? "gov" : "us", own = fed ? A.federal_owner : A.platform_owner, data = a.data || [];
        const cls = data.length ? data.map(k => DTYPES[k].classification).reduce((m, c) => LEVELS.indexOf(c) > LEVELS.indexOf(m) ? c : m) : "Internal";
        const svc = a.services || [];
        const base = { env: "Production", hosting: "Cloud", ownerKey: own, source: "AWS Config", services: svc, classification: cls };
        const dep = add(ctx.rng("svc", a.id), { ...base, name: `${slug(a.name)}-service`, ci: "Container service", acct, resourceType: "eks" });
        linkApp.push([a.id, dep.source_id], [a.id, shared[fed ? "gov" : "us"].source_id]);
        if (data.some(k => !["code", "logs"].includes(k))) {
          const db = add(ctx.rng("db", a.id), { ...base, name: `rds-${slug(a.name).slice(0, 30)}`, ci: "Database", acct, resourceType: "rds", software: "Amazon Aurora PostgreSQL 16" });
          linkApp.push([a.id, db.source_id]);
          for (const k of data) linkDt.push([db.source_id, DTYPES[k].name]);
          if (data.includes("eu")) {
            const dbe = add(ctx.rng("dbeu", a.id), { ...base, name: `rds-${slug(a.name).slice(0, 27)}-eu`, ci: "Database", acct: "eu", resourceType: "rds", software: "Amazon Aurora PostgreSQL 16" });
            linkApp.push([a.id, dbe.source_id], [a.id, shared.eu.source_id]);
            linkDt.push([dbe.source_id, DTYPES.eu.name]);
          }
        }
        if (A.bucket_apps.includes(a.id)) {
          const b = add(ctx.rng("s3", a.id), { ...base, name: `s3-${slug(a.name).slice(0, 30)}`, ci: "Storage bucket", acct, resourceType: "s3" });
          linkApp.push([a.id, b.source_id]);
          for (const k of data) linkDt.push([b.source_id, DTYPES[k].name]);
        }
      }
      /* SWIFT secure zone and operator terminals */
      const S = A.swift;
      if (S && P.applications.some(a => a.id === S.app)) {
        const sz = ctx.rng("swift");
        for (const [nm, os] of [["swift-customer-connector", "Red Hat Enterprise Linux 9"], ["swift-jump-server", "Windows Server 2022"]]) {
          const x = add(sz, { name: nm, ci: "Virtual machine", env: "Production", hosting: "Cloud", ownerKey: S.owner, source: "AWS Config", acct: "swift", resourceType: "ec2", os, services: [S.service], classification: "Restricted" });
          linkApp.push([S.app, x.source_id]); linkDt.push([x.source_id, DTYPES[S.data_type].name]);
        }
        for (let i = 0; i < S.terminals; i++) {
          const t = add(sz, { name: `SWIFT operator terminal ${i + 1}`, ci: "Workstation", env: "Production", hosting: "On-premises", ownerKey: S.owner, source: "ServiceNow",
            location: S.room, os: "Windows 11 Enterprise", manufacturer: "Dell", model: "OptiPlex 7020", serial: `SWT${sz.range(1e6, 1e7)}`,
            hostname: `nyc-swift-op${String(i + 1).padStart(2, "0")}`, services: [S.service], classification: "Restricted" });
          linkDt.push([t.source_id, DTYPES[S.data_type].name]);
        }
      }
      /* Clinic workstation */
      const C = A.clinic;
      if (C && P.applications.some(a => a.id === C.app)) {
        const cw = add(ctx.rng("clinic"), { name: "Clinic workstation", ci: "Workstation", env: "Production", hosting: "On-premises", ownerKey: A.it_owner, source: "ServiceNow",
          location: C.room, os: "Windows 11 Enterprise", manufacturer: "Dell", model: "OptiPlex 7020", serial: C.serial, hostname: "den-clinic-ws01", classification: "Restricted" });
        linkApp.push([C.app, cw.source_id]); linkDt.push([cw.source_id, DTYPES[C.data_type].name]);
      }
      /* Network gear at every site, in its network closet */
      for (const sid of Object.keys(ctx.SITES)) {
        const closet = (P.secure_areas || []).find(sa => sa.site === sid && sa.type === "Network closet");
        const nr = ctx.rng("net", sid), short = sid.split("-")[1].toLowerCase();
        for (const [ci, mfr, mdl] of [["Firewall", "Palo Alto Networks", "PA-440"], ["Switch", "Cisco", "Catalyst 9300"], ["Switch", "Cisco", "Catalyst 9200"], ["Switch", "Cisco", "Catalyst 9200"], ["Wireless controller", "Cisco", "Catalyst 9800-L"]])
          add(nr, { name: `${short}-${slug(ci)}`, ci, env: "Production", hosting: "On-premises", ownerKey: A.it_owner, source: "ServiceNow", location: closet ? closet.id : sid,
            manufacturer: mfr, model: mdl, serial: `${mfr.slice(0, 3).toUpperCase()}${nr.range(1e7, 1e8)}`, hostname: `${short}-${slug(ci)}-${String(nr.range(1, 9)).padStart(2, "0")}`,
            services: ["svc_corp_it"].filter(k => ctx.SVC[k]), eol: "2030-12-31" });
      }
      /* Laptops: one per active or on-leave person, some retired ones for leavers, spares */
      for (const p of ctx.people) {
        const lr = ctx.rng("laptop", p.id);
        const mac = lr() < (A.mac_share_divisions[ctx.divisionOf(p.unit)] ?? A.mac_share);
        if (p.status === "terminated" && lr() > A.retired_laptop_share) continue;
        const l = add(lr, { name: `Laptop ${p.id}`, ci: "Laptop", env: "Corporate", hosting: "Endpoint", ownerKey: A.it_owner, source: mac ? "Jamf" : "Microsoft Intune",
          location: p.site, os: mac ? "macOS 15" : "Windows 11 Enterprise", manufacturer: mac ? "Apple" : "Dell", model: mac ? "MacBook Pro 14-inch" : "Latitude 7450",
          serial: `${mac ? "C02" : "DL"}${lr.range(1e7, 1e8)}`, hostname: `lp-${p.id.toLowerCase()}`, lifecycle: p.status === "terminated" ? "Retired" : "In use", classification: "Confidential" });
        l.assigned_to = p.id;
      }
      for (let i = 0; i < A.spare_laptops; i++) {
        const sr = ctx.rng("spare", i);
        add(sr, { name: `Spare laptop ${i + 1}`, ci: "Laptop", env: "Corporate", hosting: "Endpoint", ownerKey: A.it_owner, source: "Jamf", location: A.spare_site,
          os: "macOS 15", manufacturer: "Apple", model: "MacBook Pro 14-inch", serial: `C02${sr.range(1e7, 1e8)}`, hostname: "", lifecycle: "In stock" });
      }
      const key = x => x.join("\u0000");
      const dedupeSort = arr => [...new Map(arr.map(x => [key(x), x])).values()].sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
      ctx.assetLinksApp = dedupeSort(linkApp);
      ctx.assetLinksDt = dedupeSort(linkDt);
    },
    write(ctx) {
      const cols = ["source_system", "source_id", "cloud_resource_id", "serial_number", "hostname", "name", "asset_type", "environment", "ip_addresses",
        "os", "software", "manufacturer", "model", "hosting_type", "cloud_provider", "cloud_account", "cloud_region", "location",
        "technical_owner", "assigned_to", "services_supported", "data_classification", "lifecycle_status", "install_date",
        "end_of_life_date", "last_patched_date", "discovery_source", "last_seen"];
      COMPANY.table(ctx, "assets.csv", cols, ctx.assets.map(a => ({ ...a, services_supported: a.services_supported.map(k => ctx.SVC[k].name) })));
      COMPANY.table(ctx, "links_application_asset.csv", ["application_source_id", "asset_source_id"], ctx.assetLinksApp);
      COMPANY.table(ctx, "links_asset_data_type.csv", ["asset_source_id", "data_type"], ctx.assetLinksDt);
    },
    checks(ctx) {
      const k1 = ctx.assets.map(a => `${a.source_system}|${a.source_id}`), cloud = ctx.assets.map(a => a.cloud_resource_id).filter(Boolean);
      COMPANY.check(ctx, "Asset match keys are unique", new Set(k1).size === k1.length && new Set(cloud).size === cloud.length);
    },
  });
})();
