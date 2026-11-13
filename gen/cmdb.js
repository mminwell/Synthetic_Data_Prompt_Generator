/* CMDB generator: configuration items and the relationships between them.
   Owners come from the HR generator; on-premises gear sits in the same data-center
   and office site IDs the Facilities generator uses. Same settings + seed => same output. */
const CMDB_GEN = (() => {
  const ENV = { Production: "prd", Staging: "stg", Test: "tst", Development: "dev", "Disaster recovery": "dr" };
  const OS = [["Windows Server 2022", "2022", "2031-10-14", 22], ["Windows Server 2019", "2019", "2029-01-09", 14], ["Windows Server 2025", "2025", "2034-10-10", 6], ["Red Hat Enterprise Linux", "9.4", "2032-05-31", 20], ["Red Hat Enterprise Linux", "8.10", "2029-05-31", 10], ["Ubuntu Server", "24.04 LTS", "2029-05-31", 12], ["Ubuntu Server", "22.04 LTS", "2027-06-01", 8], ["SUSE Linux Enterprise Server", "15 SP6", "2031-07-31", 3], ["Windows Server 2012 R2", "2012 R2", "2023-10-10", 3], ["CentOS Linux", "7.9", "2024-06-30", 2]];
  const HW = { "Physical server": [["Dell", "PowerEdge R650"], ["Dell", "PowerEdge R760"], ["HPE", "ProLiant DL380 Gen10"], ["HPE", "ProLiant DL380 Gen11"], ["Lenovo", "ThinkSystem SR650 V3"]],
    "Network device": [["Cisco", "Catalyst 9300", "sw"], ["Cisco", "Catalyst 9500", "core"], ["Cisco", "Nexus 93180YC-FX", "sw"], ["Juniper", "EX4300", "sw"], ["Palo Alto Networks", "PA-3220", "fw"], ["Arista", "7050X3", "sw"], ["Cisco", "ISR 4451", "rtr"], ["Aruba", "9240 Controller", "wlc"]],
    "Storage": [["NetApp", "AFF A400", "nas"], ["NetApp", "AFF A250", "nas"], ["Dell", "PowerStore 1200T", "san"], ["Pure Storage", "FlashArray//X50", "san"]],
    "Load balancer": [["F5", "BIG-IP i5800"], ["F5", "BIG-IP i7800"], ["Citrix", "ADC MPX 8900"]] };
  const HV = { esx: [["VMware ESXi", "8.0 U3", "2027-10-11", 7], ["VMware ESXi", "7.0 U3", "2025-04-02", 2]], hv: [["Windows Server 2022", "2022 (Hyper-V)", "2031-10-14", 6], ["Windows Server 2019", "2019 (Hyper-V)", "2029-01-09", 3]], kvm: [["Red Hat Enterprise Linux", "9.4 (KVM)", "2032-05-31", 5], ["Ubuntu Server", "24.04 LTS (KVM)", "2029-05-31", 3]] };
  const DB = [["PostgreSQL", "16.4", "pg"], ["PostgreSQL", "15.8", "pg"], ["Microsoft SQL Server", "2022", "sql"], ["Microsoft SQL Server", "2019", "sql"], ["Oracle Database", "19c", "ora"], ["MySQL", "8.0.39", "my"], ["MongoDB", "7.0", "mongo"], ["Redis", "7.2", "redis"]];
  const CLOUD = {
    AWS: { vm: ["m6i.large", "m6i.xlarge", "c6i.2xlarge", "r6i.xlarge", "t3.medium"], db: "Amazon RDS for PostgreSQL", lb: "AWS Application Load Balancer", paas: ["Amazon EKS 1.30", "Amazon S3", "Amazon SQS", "AWS Lambda", "Amazon ElastiCache"], def: ["us-east-1", "eu-west-1", "ap-southeast-1", "sa-east-1"],
      r: { US: ["us-east-1", "us-west-2"], CA: ["ca-central-1"], GB: ["eu-west-2"], DE: ["eu-central-1"], FR: ["eu-west-3"], IE: ["eu-west-1"], IN: ["ap-south-1"], JP: ["ap-northeast-1"], KR: ["ap-northeast-2"], SG: ["ap-southeast-1"], AU: ["ap-southeast-2"], BR: ["sa-east-1"], MX: ["mx-central-1"], SE: ["eu-north-1"], CH: ["eu-central-2"], AE: ["me-central-1"], IL: ["il-central-1"], ES: ["eu-south-2"], IT: ["eu-south-1"], ZA: ["af-south-1"] } },
    Azure: { vm: ["Standard_D2s_v5", "Standard_D4s_v5", "Standard_E4s_v5", "Standard_F8s_v2", "Standard_B2ms"], db: "Azure SQL Database", lb: "Azure Application Gateway", paas: ["Azure Kubernetes Service 1.30", "Azure Blob Storage", "Azure Service Bus", "Azure Functions", "Azure App Service"], def: ["eastus", "westeurope", "southeastasia", "brazilsouth"],
      r: { US: ["eastus", "westus2"], CA: ["canadacentral"], GB: ["uksouth"], DE: ["germanywestcentral"], FR: ["francecentral"], IE: ["northeurope"], IN: ["centralindia"], JP: ["japaneast"], KR: ["koreacentral"], SG: ["southeastasia"], AU: ["australiaeast"], BR: ["brazilsouth"], MX: ["mexicocentral"], SE: ["swedencentral"], CH: ["switzerlandnorth"], AE: ["uaenorth"], IL: ["israelcentral"], ES: ["spaincentral"], IT: ["italynorth"], ZA: ["southafricanorth"] } },
    "Google Cloud": { vm: ["n2-standard-2", "n2-standard-4", "e2-standard-4", "c3-standard-8", "n2-highmem-4"], db: "Cloud SQL for PostgreSQL", lb: "Google Cloud Load Balancing", paas: ["Google Kubernetes Engine 1.30", "Cloud Storage", "Pub/Sub", "Cloud Run", "Memorystore for Redis"], def: ["us-central1", "europe-west1", "asia-southeast1", "southamerica-east1"],
      r: { US: ["us-central1", "us-east1"], CA: ["northamerica-northeast1"], GB: ["europe-west2"], DE: ["europe-west3"], FR: ["europe-west9"], IE: ["europe-west1"], IN: ["asia-south1"], JP: ["asia-northeast1"], KR: ["asia-northeast3"], SG: ["asia-southeast1"], AU: ["australia-southeast1"], BR: ["southamerica-east1"], MX: ["northamerica-south1"], SE: ["europe-north1"], CH: ["europe-west6"], AE: ["me-central1"], IL: ["me-west1"], ES: ["europe-southwest1"], IT: ["europe-west8"], ZA: ["africa-south1"] } },
    "Oracle Cloud": { vm: ["VM.Standard.E4.Flex", "VM.Standard.E5.Flex", "VM.Standard3.Flex"], db: "Oracle Autonomous Database", lb: "OCI Load Balancer", paas: ["OCI Container Engine for Kubernetes", "OCI Object Storage", "OCI Streaming", "OCI Functions"], def: ["us-ashburn-1", "eu-frankfurt-1", "ap-singapore-1", "sa-saopaulo-1"],
      r: { US: ["us-ashburn-1", "us-phoenix-1"], CA: ["ca-toronto-1"], GB: ["uk-london-1"], DE: ["eu-frankfurt-1"], FR: ["eu-paris-1"], IN: ["ap-mumbai-1"], JP: ["ap-tokyo-1"], KR: ["ap-seoul-1"], SG: ["ap-singapore-1"], AU: ["ap-sydney-1"], BR: ["sa-saopaulo-1"], MX: ["mx-queretaro-1"], SE: ["eu-stockholm-1"], CH: ["eu-zurich-1"], AE: ["me-dubai-1"], IL: ["il-jerusalem-1"], ES: ["eu-madrid-1"], IT: ["eu-milan-1"], ZA: ["af-johannesburg-1"] } },
  };
  const APPS = ["Customer Portal", "Order Management", "Payroll API", "HR Self-Service", "Billing Engine", "Inventory Service", "Identity Provider", "Data Warehouse ETL", "Analytics Dashboard", "Mobile Backend", "Support Ticketing", "Document Management", "Pricing Service", "Notification Service", "Search Service", "Reporting Service", "Expense Management", "CRM Integration", "Logistics Tracker", "Partner Portal", "Contract Management", "Forecasting Service", "Asset Tracker", "Learning Portal"];
  const STACK = [["Java 21 / Spring Boot", "3.3"], [".NET", "8.0"], ["Node.js", "20 LTS"], ["Python 3.12 / Django", "5.0"], ["Go", "1.22"], ["Ruby on Rails", "7.1"]];
  const SAAS = ["Microsoft 365", "Salesforce Sales Cloud", "Workday HCM", "ServiceNow ITSM", "Slack", "Zoom Workplace", "Atlassian Jira", "GitHub Enterprise Cloud", "Okta Workforce Identity", "DocuSign", "Zendesk", "Box"];
  const BSN = ["Online Ordering", "Payroll", "Customer Support", "Corporate Email & Collaboration", "Finance & Accounting", "HR Services", "Sales CRM", "Analytics & Reporting", "Identity & Access", "E-commerce", "Supply Chain", "Billing & Invoicing", "Partner Management", "Employee Learning"];
  const ROLE = { "Virtual machine": ["web", "app", "api", "k8s", "etl", "mq", "file", "ad", "mon", "jump"], "Physical server": ["esx", "hv", "kvm", "bkp"], "Database": ["db"], "Load balancer": ["lb"] };
  const SUPPORT = { "Virtual machine": "IT – Server Infrastructure", "Physical server": "IT – Server Infrastructure", "Database": "IT – Database Administration", "Network device": "IT – Network Operations", "Storage": "IT – Storage & Backup", "Load balancer": "IT – Network Operations", "Cloud resource (PaaS)": "Cloud Platform Engineering", "Application": "Application Support", "Business service": "Service Management Office" };

  async function generate(S) {
    const R = GEN.rng(S.seed ^ 0x2C1B3C6D), today = GEN.d(S.asof);
    const primary = S.countries.some(c => c.cc === S.primary) ? S.primary : S.countries[0].cc;
    const clouds = S.clouds.length ? S.clouds : ["AWS"];
    const pattern = (S.hostPattern || "site-env-role-nn").split(",")[0].trim() || "site-env-role-nn";

    /* owners from HR */
    let emps = [];
    if (S.hr && S.hr.countries.length) { try { emps = (await HR_GEN.generate(S.hr)).rows.filter(e => e.employment_status === "Active" || e.employment_status === "On Leave"); } catch (e) { emps = []; } }
    const techies = emps.filter(e => ["IT", "Engineering"].includes(e.department));
    const owner = (cc, depts) => { const p = (depts ? emps.filter(e => depts.includes(e.department)) : techies), here = p.filter(e => e.work_country_code === cc); return (here.length ? R.pick(here) : p.length ? R.pick(p) : null)?.employee_id || ""; };

    /* sites: offices from the shared list + one data center per region (same IDs as Facilities) */
    const offices = {}; S.countries.forEach(c => { offices[c.cc] = c.sites.length ? c.sites : [{ id: `LOC-${c.cc}-${cityCode(GEN.meta(c.cc).capital || c.cc)}`, city: GEN.meta(c.cc).capital || c.cc }]; });
    const dcOf = {}, byRegion = {};
    S.countries.forEach(c => { const r = GEN.meta(c.cc).region; if (!byRegion[r] || c.count > byRegion[r].count) byRegion[r] = c; });
    S.countries.forEach(c => { const hub = byRegion[GEN.meta(c.cc).region]; dcOf[c.cc] = { id: `LOC-${hub.cc}-DC1`, cc: hub.cc, city: offices[hub.cc][0].city }; });
    const siteIdx = {}; let si = 0; const sIdx = id => siteIdx[id] ?? (siteIdx[id] = ++si);

    /* 1. CI slots with class, country, environment */
    const bag = (mix, n) => { const k = apportion(n, mix.map(m => m[1])); return R.shuffle(mix.flatMap((m, i) => Array(k[i]).fill(m[0]))); };
    const slots = []; S.countries.forEach(c => { for (let i = 0; i < c.count; i++) slots.push({ cc: c.cc }); });
    const clsBag = bag(S.clsMix, slots.length), envBag = bag(S.envMix, slots.length);
    slots.forEach(s => { s.cls = clsBag.pop(); });
    /* business services are production; hand out the rest of the environments */
    slots.filter(s => s.cls === "Business service").forEach(s => { const i = envBag.indexOf("Production"); s.env = i >= 0 ? envBag.splice(i, 1)[0] : "Production"; });
    slots.filter(s => !s.env).forEach(s => { s.env = envBag.pop() || "Production"; });

    /* 2. hosting: fixed for hardware and PaaS, the rest filled to match the mix */
    const hm = Object.fromEntries(S.hostMix), tot = Object.values(hm).reduce((a, b) => a + b, 0) || 1;
    const hosted = slots.filter(s => s.cls !== "Business service");
    const want = { "On-premises": Math.round(hosted.length * (hm["On-premises"] || 0) / tot), "Public cloud": Math.round(hosted.length * (hm["Public cloud"] || 0) / tot), "SaaS": Math.round(hosted.length * (hm["SaaS"] || 0) / tot) };
    hosted.forEach(s => { if (["Physical server", "Network device", "Storage"].includes(s.cls)) s.host = "On-premises"; if (s.cls === "Cloud resource (PaaS)") s.host = "Public cloud"; });
    const left = h => want[h] - hosted.filter(s => s.host === h).length;
    R.shuffle(hosted.filter(s => s.cls === "Application")).forEach(s => { if (left("SaaS") > 0) s.host = "SaaS"; });
    R.shuffle(hosted.filter(s => !s.host)).forEach(s => { s.host = left("Public cloud") > 0 && (left("Public cloud") >= left("On-premises") || R.chance(0.5)) ? "Public cloud" : "On-premises"; });
    slots.filter(s => s.cls === "Business service").forEach(s => { s.host = ""; });

    /* 3. order, IDs, lifecycle */
    const ORDER = ["Business service", "Application", "Load balancer", "Database", "Cloud resource (PaaS)", "Virtual machine", "Physical server", "Storage", "Network device"];
    slots.sort((a, b) => ORDER.indexOf(a.cls) - ORDER.indexOf(b.cls));
    slots.forEach((s, i) => {
      s.id = `CI-${String(i + 1).padStart(6, "0")}`;
      s.status = R.w([["Operational", 87], ["Non-operational", 3], ["Under maintenance", 3], ["Retired", 5], ["Planned", 2]]);
      if (s.cls === "Business service") s.status = R.chance(0.95) ? "Operational" : "Planned";
      if (s.host === "Public cloud") { s.cloud = R.pick(clouds); const C = CLOUD[s.cloud], rs = C.r[s.cc]; s.region = rs ? R.pick(rs) : C.def[["AMER", "EMEA", "APAC", "LATAM"].indexOf(GEN.meta(s.cc).region)] || C.def[0]; }
      const off = R.pick(offices[s.cc]);
      if (s.host === "On-premises") { const inDC = ["Physical server", "Storage", "Virtual machine", "Database", "Load balancer"].includes(s.cls) ? R.chance(0.75) : s.cls === "Network device" ? R.chance(0.35) : false; s.site = inDC ? dcOf[s.cc] : { id: off.id, cc: s.cc, city: off.city }; }
      else if (s.host === "Public cloud") s.site = { id: off.id, cc: s.cc, city: off.city };
      else s.site = null;
    });

    /* hostnames */
    const used = {};
    const code = site => site ? (site.id.endsWith("-DC1") ? site.cc.toLowerCase() + "dc1" : site.id.split("-").pop().toLowerCase()) : "glb";
    const host = (s, role) => {
      const tok = { site: code(s.site), env: ENV[s.env], role, nn: "" };
      const baseName = pattern.replace(/\bsite\b/g, tok.site).replace(/\benv\b/g, tok.env).replace(/\brole\b/g, role);
      let k = (used[baseName] || 0) + 1; used[baseName] = k;
      return /\bnn\b/.test(baseName) ? baseName.replace(/\bnn\b/, String(k).padStart(2, "0")) : (k > 1 ? `${baseName}${k}` : baseName);
    };
    /* IP addresses: unique per interface */
    const ipc = {};
    const ip3 = (s, kind) => {           /* returns a full address */
      if (s.host === "Public cloud") { const r = 16 + (GEN.hash(s.cloud + s.region) % 16); ipc["c" + r] = (ipc["c" + r] || 9) + 1; const n = ipc["c" + r]; return `172.${r}.${Math.floor(n / 250)}.${n % 250 + 1}`; }
      const site = sIdx(s.site.id), vlan = { prod: 10, mgmt: 0, stor: 200, bkp: 210 }[kind];
      const key = `${kind}-${site}`; ipc[key] = (ipc[key] || 9) + 1; const n = ipc[key];
      if (kind === "mgmt") return `192.168.${site}.${n % 250 + 1}`;
      return `10.${site}.${vlan + Math.floor(n / 250)}.${n % 250 + 1}`;
    };

    const ci = {}, rel = [];
    const link = (src, tgt, type, crit) => { if (!src || !tgt || src === tgt) return; if (rel.some(r => r.source_ci_id === src.id && r.target_ci_id === tgt.id)) return; rel.push({ source_ci_id: src.id, target_ci_id: tgt.id, relationship_type: type, is_critical_path: crit ? "Y" : "N" }); };
    const live = x => x.status !== "Retired";
    const pickFor = (s, cls, filt = () => true) => { const all = slots.filter(x => x.cls === cls && live(x) && filt(x)); const same = all.filter(x => x.env === s.env && x.cc === s.cc); const env = all.filter(x => x.env === s.env); return (same.length ? same : env.length ? env : all); };

    /* 4. per-CI details */
    for (const s of slots) {
      const yrs = { "Physical server": [0.5, 8], "Network device": [0.5, 9], "Storage": [0.5, 7], "Virtual machine": [0.1, 6], "Database": [0.3, 8], "Application": [0.5, 10], "Business service": [1, 12], "Load balancer": [0.5, 7], "Cloud resource (PaaS)": [0.1, 5] }[s.cls];
      let inst = s.status === "Planned" ? GEN.between(R, GEN.addDays(today, 7), GEN.addDays(today, 90)) : GEN.addDays(today, -Math.round(R.uniform(yrs[0], s.host === "Public cloud" ? Math.min(yrs[1], 5) : yrs[1]) * 365));
      if (s.cls === "Physical server") s.role = R.w([["esx", 50], ["hv", 15], ["kvm", 15], ["bkp", 20]]);
      const os = s.cls === "Virtual machine" || s.role === "bkp" ? R.w(OS.map(o => [o, o[3]])) : s.role ? R.w(HV[s.role].map(o => [o, o[3]])) : null;
      const legacy = os && GEN.d(os[2]) < today;
      if (legacy && inst > GEN.addDays(today, -365 * 5)) inst = GEN.addDays(today, -365 * R.int(6, 9));
      let name = "", mf = "", model = "", serial = "", sw = "", swv = "", cpu = "", mem = "", disk = "", nics = [], rack = "", fqdn = "";
      if (s.cls === "Business service") { name = BSN[(slots.filter(x => x.cls === "Business service").indexOf(s)) % BSN.length] + (slots.filter(x => x.cls === "Business service").indexOf(s) >= BSN.length ? ` ${Math.floor(slots.filter(x => x.cls === "Business service").indexOf(s) / BSN.length) + 1}` : ""); }
      else if (s.cls === "Application") {
        if (s.host === "SaaS") { sw = R.pick(SAAS); name = sw; swv = ""; }
        else { const appN = APPS[GEN.hash(s.id) % APPS.length]; name = `${appN} (${s.env})`; const st = R.pick(STACK); sw = st[0]; swv = st[1]; if (s.env === "Production") fqdn = `${appN.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${S.domain}`; }
      }
      else if (s.cls === "Database") {
        if (s.host === "Public cloud") { sw = CLOUD[s.cloud].db; swv = sw.includes("PostgreSQL") ? "15" : ""; name = host(s, "db"); nics = [ip3(s, "prod")]; }
        else { const d = R.pick(DB); sw = d[0]; swv = d[1]; name = host(s, d[2]); }
      }
      else if (s.cls === "Cloud resource (PaaS)") { const p = R.pick(CLOUD[s.cloud].paas); sw = p.replace(/ [\d.]+$/, ""); swv = (p.match(/ ([\d.]+)$/) || [, ""])[1]; name = host(s, sw.toLowerCase().includes("kube") || sw.includes("EKS") || sw.includes("Engine") ? "k8s" : sw.toLowerCase().includes("storage") || sw.includes("S3") ? "obj" : sw.toLowerCase().match(/sqs|bus|pub|stream/) ? "mq" : "fn"); if (R.chance(0.6)) nics = [ip3(s, "prod")]; }
      else if (s.cls === "Virtual machine") {
        name = host(s, R.pick(ROLE["Virtual machine"]));
        if (s.host === "Public cloud") { mf = s.cloud === "Google Cloud" ? "Google" : s.cloud === "Oracle Cloud" ? "Oracle" : s.cloud === "Azure" ? "Microsoft" : "Amazon Web Services"; model = R.pick(CLOUD[s.cloud].vm); }
        else { mf = "VMware, Inc."; model = "VMware Virtual Platform"; }
        cpu = R.pick([2, 4, 4, 8, 8, 16, 32]); mem = cpu * R.pick([2, 4, 8]); disk = R.pick([80, 100, 200, 500, 1000, 2000]);
        nics = [ip3(s, "prod")]; if (R.chance(0.3)) nics.push(s.host === "Public cloud" ? ip3(s, "prod") : ip3(s, "bkp"));
      }
      else if (s.cls === "Physical server") {
        const h = R.pick(HW["Physical server"]); mf = h[0]; model = h[1]; serial = `TEST-${R.letters(3)}${R.digits(6)}`; name = host(s, s.role);
        cpu = R.pick([16, 24, 32, 48, 64, 96, 128]); mem = R.pick([128, 256, 384, 512, 768, 1024]); disk = R.pick([960, 1920, 3840, 7680]);
        nics = [ip3(s, "prod"), ip3(s, "mgmt")]; if (R.chance(0.7)) nics.push(ip3(s, "stor")); if (R.chance(0.4)) nics.push(ip3(s, "bkp"));
        rack = `Row ${R.pick("ABCDEFGH".split(""))} / Rack ${R.int(1, 24)} / U${R.int(1, 40)}`;
      }
      else if (s.cls === "Network device") {
        const h = R.pick(HW["Network device"]); mf = h[0]; model = h[1]; serial = `TEST-${R.letters(3)}${R.digits(6)}`; name = host(s, h[2]);
        nics = [ip3(s, "mgmt"), ip3(s, "prod")]; if (R.chance(0.6)) nics.push(ip3(s, "prod")); if (R.chance(0.3)) nics.push(ip3(s, "stor"));
        rack = `Row ${R.pick("ABCDEFGH".split(""))} / Rack ${R.int(1, 24)} / U${R.int(30, 42)}`;
      }
      else if (s.cls === "Storage") {
        const h = R.pick(HW["Storage"]); mf = h[0]; model = h[1]; serial = `TEST-${R.letters(3)}${R.digits(6)}`; name = host(s, h[2]); disk = R.pick([20000, 50000, 100000, 250000, 500000]);
        nics = [ip3(s, "mgmt"), ip3(s, "stor")]; if (R.chance(0.7)) nics.push(ip3(s, "stor")); if (R.chance(0.5)) nics.push(ip3(s, "bkp"));
        rack = `Row ${R.pick("ABCDEFGH".split(""))} / Rack ${R.int(1, 24)} / U${R.int(1, 30)}`;
      }
      else if (s.cls === "Load balancer") {
        name = host(s, "lb");
        if (s.host === "Public cloud") { sw = CLOUD[s.cloud].lb; nics = [ip3(s, "prod")]; }
        else { const h = R.pick(HW["Load balancer"]); mf = h[0]; model = h[1]; serial = `TEST-${R.letters(3)}${R.digits(6)}`; nics = [ip3(s, "prod"), ip3(s, "mgmt")]; rack = `Row ${R.pick("ABCDEFGH".split(""))} / Rack ${R.int(1, 24)} / U${R.int(20, 38)}`; }
      }
      if (!fqdn && name && !["Application", "Business service"].includes(s.cls)) fqdn = `${name}.${S.domain}`;
      const hw = ["Physical server", "Network device", "Storage"].includes(s.cls) || (s.cls === "Load balancer" && s.host === "On-premises");
      const eol = os ? os[2] : hw ? GEN.iso(GEN.addMonths(inst, 84)) : "";
      const discovered = s.status === "Operational" || s.status === "Under maintenance" ? GEN.between(R, GEN.addDays(today, -30), today) : s.status === "Planned" ? null : GEN.between(R, GEN.addDays(today, -400), GEN.addDays(today, -91));
      ci[s.id] = Object.assign(s, {
        row: {
          ci_id: s.id, ci_name: name, ci_class: s.cls,
          description: s.cls === "Business service" ? `${name} business service` : s.cls === "Application" ? (s.host === "SaaS" ? `${name} (SaaS)` : `${name.replace(/ \(.*\)$/, "")} – ${sw}`) : s.cls === "Database" ? `${sw} database` : s.cls === "Cloud resource (PaaS)" ? `${sw} in ${s.region}` : `${s.cls} (${s.env.toLowerCase()})`,
          environment: s.env, operating_system: os ? os[0] : "", os_version: os ? os[1] : "", manufacturer: mf, model, serial_number: serial,
          ip_address_nic_1: nics[0] || "", ip_address_nic_2: nics[1] || "", ip_address_nic_3: nics[2] || "", ip_address_nic_4: nics[3] || "",
          fqdn, cpu_count: cpu, memory_gb: mem, storage_gb: disk, software_name: sw, software_version: swv,
          hosting_type: s.host, cloud_provider: s.cloud || "", cloud_region: s.region || "", location_id: s.site ? s.site.id : "", rack_location: rack,
          owner_employee_id: s.cls === "Business service" ? owner(s.cc, ["Operations", "Finance", "Sales", "Customer Success", "Product", "People (HR)"]) : owner(s.cc),
          support_group: SUPPORT[s.cls] + (s.cls === "Virtual machine" || s.cls === "Physical server" ? (os && os[0].startsWith("VMware") ? " (Virtualization)" : os && os[0].startsWith("Windows") ? " (Windows)" : os ? " (Linux)" : "") : ""),
          business_service: "", business_criticality: "", cost_center: s.cls === "Application" || s.cls === "Business service" ? `CC-${CC[R.pick(S.depts.length ? S.depts : ["Engineering"])] || 1100}` : "CC-1300",
          operational_status: s.status, install_date: GEN.iso(inst), warranty_expiry_date: hw ? GEN.iso(GEN.addMonths(inst, R.pick([36, 60]))) : "", end_of_life_date: eol,
          last_patched_date: os && s.status === "Operational" ? GEN.iso(legacy ? GEN.between(R, GEN.addDays(today, -700), GEN.addDays(today, -200)) : GEN.between(R, GEN.addDays(today, -60), GEN.addDays(today, -1))) : "",
          last_discovered_at: discovered ? GEN.stamp(R, discovered) : "",
          discovery_source: s.cls === "Business service" ? "Manual" : s.host === "Public cloud" ? "Cloud API" : s.host === "SaaS" ? "Manual" : ["Network device", "Storage"].includes(s.cls) ? "Network scan" : s.cls === "Application" ? R.pick(["Agent", "Manual"]) : "Agent",
          runs_on_ci_id: "", depends_on_ci_ids: "",
          created_at: GEN.stamp(R, inst < today ? inst : today), updated_at: GEN.stamp(R, GEN.between(R, GEN.addDays(today, -120), today)),
        },
      });
    }

    /* 5. relationships (always point "down" the stack, so there are no cycles) */
    const by = cls => slots.filter(x => x.cls === cls);
    const runsOn = (s, t) => { if (!t) return; if (!s.row.runs_on_ci_id) s.row.runs_on_ci_id = t.id; link(s, t, "Runs on", s.env === "Production"); };
    const dep = (s, t, crit) => { if (!t) return; link(s, t, "Depends on", crit); };
    by("Virtual machine").forEach(s => { if (s.host === "On-premises") { const p = pickFor(s, "Physical server", x => x.role !== "bkp" && x.site && s.site && x.site.id === s.site.id); runsOn(s, p.length ? R.pick(p) : null); } });
    by("Database").forEach(s => { if (s.host === "On-premises") { const p = [...pickFor(s, "Virtual machine", x => x.host === "On-premises"), ...pickFor(s, "Physical server")]; const h = p.length ? R.pick(p) : null; runsOn(s, h); if (h) s.row.ip_address_nic_1 = h.row.ip_address_nic_1; } });
    by("Physical server").forEach(s => { const st = pickFor(s, "Storage", x => x.site && s.site && x.site.id === s.site.id); if (st.length) dep(s, R.pick(st), false); const sw = slots.filter(x => x.cls === "Network device" && live(x) && x.site && s.site && x.site.id === s.site.id); if (sw.length) link(s, R.pick(sw), "Connects to", false); });
    by("Load balancer").forEach(s => { const vms = pickFor(s, "Virtual machine", x => x.host === s.host); R.shuffle([...vms]).slice(0, R.int(2, 4)).forEach(v => link(s, v, "Connects to", s.env === "Production")); });
    by("Application").filter(s => s.host !== "SaaS").forEach(s => {
      const plat = s.host === "Public cloud" ? [...pickFor(s, "Cloud resource (PaaS)", x => /k8s|run|app|fn|lambda|function/i.test(x.row.ci_name + x.row.software_name)), ...pickFor(s, "Virtual machine", x => x.host === "Public cloud")] : pickFor(s, "Virtual machine", x => x.host === "On-premises");
      const hosts = R.shuffle([...plat]).slice(0, R.int(1, 3)); hosts.forEach((h, i) => i === 0 ? runsOn(s, h) : dep(s, h, false));
      const dbs = pickFor(s, "Database"); R.shuffle([...dbs]).slice(0, R.int(1, 2)).forEach(d => dep(s, d, true));
      const lbs = pickFor(s, "Load balancer"); if (lbs.length && R.chance(0.5)) dep(s, R.pick(lbs), true);
      const mq = pickFor(s, "Cloud resource (PaaS)", x => /mq|obj/.test(x.row.ci_name)); if (mq.length && R.chance(0.4)) dep(s, R.pick(mq), false);
    });
    const apps = by("Application").filter(live);
    by("Business service").forEach((s, i) => {
      const prod = apps.filter(a => a.env === "Production"), pool = prod.length ? prod : apps;
      const k = R.int(1, Math.min(4, Math.max(1, pool.length)));
      R.shuffle([...pool]).slice(0, k).forEach(a => { dep(s, a, true); if (!a.row.business_service) a.row.business_service = s.row.ci_name; });
      s.row.business_criticality = R.w([["Tier 1", 20], ["Tier 2", 35], ["Tier 3", 30], ["Tier 4", 15]]); s.row.business_service = s.row.ci_name;
    });
    /* push business service and criticality down the stack */
    const out = {}; rel.forEach(r => (out[r.source_ci_id] = out[r.source_ci_id] || []).push(r.target_ci_id));
    const tierN = t => +String(t).replace(/\D/g, "") || 9;
    const order = [...slots].sort((a, b) => ORDER.indexOf(a.cls) - ORDER.indexOf(b.cls));
    order.forEach(s => (out[s.id] || []).forEach(t => { const T = ci[t]; if (!T.row.business_service && s.row.business_service) T.row.business_service = s.row.business_service; const tier = s.row.business_criticality; if (tier && tierN(tier) < tierN(T.row.business_criticality)) T.row.business_criticality = tier; }));
    slots.forEach(s => { if (!s.row.business_criticality) s.row.business_criticality = s.env === "Production" ? R.w([["Tier 2", 30], ["Tier 3", 45], ["Tier 4", 25]]) : R.w([["Tier 3", 40], ["Tier 4", 60]]); if (s.env !== "Production" && tierN(s.row.business_criticality) < 3) s.row.business_criticality = "Tier 3"; });
    slots.forEach(s => { const d = (out[s.id] || []).filter(t => t !== s.row.runs_on_ci_id); s.row.depends_on_ci_ids = d.join(";"); });
    const relRows = rel.map((r, i) => ({ relationship_id: `REL-${String(i + 1).padStart(6, "0")}`, ...r, created_at: ci[r.source_ci_id].row.created_at, updated_at: ci[r.source_ci_id].row.updated_at }));
    const rows = slots.map(s => s.row);
    return { table: "configuration_items", pk: "ci_id", rows, tables: { cis: rows, ci_relationships: relRows },
      extraNote: `${relRows.length.toLocaleString()} relationships.${emps.length ? " Owners are employees from the HR page (its current settings and seed)." : ""} On-premises gear uses the same data-center and office site IDs as the Facilities page.` };
  }
  return { generate };
})();
