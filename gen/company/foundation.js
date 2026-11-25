/* Foundation value lists (GRC Foundation design 5.3). Output uses these exact
   values so the GRC platform's import accepts every row. Ported from the
   "Foundation value lists" block of docs/requirements/reference/generate.py. */
COMPANY.FV = {
  siteType: t => ({ Headquarters: "Headquarters", "Data center": "Data center", Colocation: "Colocation", Warehouse: "Warehouse", Lab: "Lab", Coworking: "Coworking" })[t] || "Office",
  ownership: o => ["Owned", "Leased", "Colocation"].includes(o) ? o : "Leased",
  areaType: t => ["Server room", "Data hall", "Network closet", "Vault", "Records room"].includes(t) ? t : "Other",
  accessControl: text => {
    const t = String(text).toLowerCase();
    const out = [["badge", "Badge"], ["biometric", "Biometric"], ["key", "Key"], ["escort", "Escort required"], ["camera", "Camera"], ["pin", "PIN"]].filter(([k]) => t.includes(k)).map(([, v]) => v);
    return out.length ? out : ["Badge"];
  },
  vendorType: type => {
    const t = String(type).toLowerCase(), any = ks => ks.some(k => t.includes(k));
    if (t.includes("event")) return "Services";
    if (any(["hardware", "reseller"])) return "Hardware";
    if (any(["auditor", "assessment organization", "counsel"])) return "Consulting";
    if (any(["cloud infrastructure", "data platform", "cdn", "hosting"])) return "Cloud/hosting";
    if (any(["saas", "identity", "security", "siem", "management", "tool", "health records", "conferencing", "alerting", "training",
             "whiteboard", "scheduling", "video", "writing", "design", "access control"])) return "Software";
    return "Services";
  },
  signIn: s => {
    s = String(s).toLowerCase();
    if (s.includes("okta")) return ["SSO", "MFA"];
    if (s.includes("customer identity") || s.includes("vendor accounts")) return ["Local accounts", "MFA"];
    return ["Other"];
  },
  capRange: v => v ? v[0].toUpperCase() + v.slice(1) : v,
  /* [internal_users, external_users] */
  userRanges: a => { const v = COMPANY.FV.capRange(a.users_affected); return a.users === "Internal" ? [v, "None"] : ["Under 1,000", v]; },
  classifications: ["Public", "Internal", "Confidential", "Restricted"],
  serviceType: t => t === "Internal service" ? "Technology service" : t,
  assetType: { "Container cluster": "Cloud resource", "Container service": "Cloud resource", "Load balancer": "Cloud resource",
    "Encryption key": "Cloud resource", "Storage bucket": "Storage", Database: "Database", "Virtual machine": "Virtual machine",
    Workstation: "Workstation", Laptop: "Workstation", Firewall: "Network device", Switch: "Network device", "Wireless controller": "Network device" },
  environment: { Production: "Production", "Disaster recovery": "DR", Corporate: "Production" },
  hostingType: { Cloud: "Public cloud", "On-premises": "On-premises", Endpoint: "On-premises" },
  lifecycle: { "In use": "Operational", Retired: "Retired", "In stock": "Non-operational" },
  discovery: { Jamf: "Agent", "Microsoft Intune": "Agent", "AWS Config": "Cloud API", ServiceNow: "Manual" },
};
/* Highest classification among an item's data types */
COMPANY.maxClass = (ctx, keys, dflt = "Internal") => {
  const L = COMPANY.FV.classifications;
  return (keys || []).map(k => ctx.DTYPES[k].classification).reduce((m, c) => L.indexOf(c) > L.indexOf(m) ? c : m, null) || dflt;
};

/* MD5 (hex) of a UTF-8 string. Synchronous; used for laptops, which the GRC seed
   rebuilds from md5("<prefix>:laptop:<person ID>"). */
COMPANY.md5 = str => {
  const bytes = new TextEncoder().encode(str), n = bytes.length;
  const words = new Uint32Array((((n + 8) >>> 6) + 1) * 16);
  for (let i = 0; i < n; i++) words[i >> 2] |= bytes[i] << ((i % 4) * 8);
  words[n >> 2] |= 0x80 << ((n % 4) * 8);
  words[words.length - 2] = (n * 8) >>> 0; words[words.length - 1] = Math.floor(n / 0x20000000);
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let o = 0; o < words.length; o += 16) {
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      const s = S[(i >> 4) * 4 + (i % 4)];
      F = (F + A + K[i] + words[o + g]) >>> 0;
      A = D; D = C; C = B; B = (B + ((F << s) | (F >>> (32 - s)))) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  return [a0, b0, c0, d0].map(x => [0, 8, 16, 24].map(sh => ((x >>> sh) & 255).toString(16).padStart(2, "0")).join("")).join("");
};
