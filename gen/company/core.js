/* Company builder: shared core.
   A port of docs/requirements/reference/generate.py. The pipeline is a list of
   modules (org, facilities, catalog, applications, assets, ...). Each module
   reads and adds to one shared context `ctx`, so IDs line up across files.
   Later data areas (incidents, risks, ...) plug in as more modules, and can run
   standalone on a small default company. */
const COMPANY = { modules: [] };

/* ---------- random streams ---------- */
/* 128-bit string hash (cyrb128). Synchronous, so it works from file:// too. */
COMPANY.hash128 = str => {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067); h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213); h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067); h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213); h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
};
/* Independent, stable random stream per item (seed + item key), so adding one
   record does not reshuffle everything after it. sfc32 generator. */
COMPANY.rng = (seed, ...parts) => {
  let [a, b, c, d] = COMPANY.hash128([seed, ...parts].join("|"));
  const f = () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0; t = (t + d) | 0; c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < 12; i++) f();
  f.random = f;
  f.below = n => Math.floor(f() * n);                    /* Python randrange(n) */
  f.range = (lo, hi) => lo + Math.floor(f() * (hi - lo)); /* Python randrange(lo, hi) */
  f.choice = arr => arr[Math.floor(f() * arr.length)];
  f.sample = (arr, k) => { const a = arr.slice(); for (let i = 0; i < k; i++) { const j = i + Math.floor(f() * (a.length - i)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, k); };
  return f;
};

/* ---------- dates (UTC "YYYY-MM-DD" strings; they sort and compare as text) ---------- */
COMPANY.date = x => {
  if (x instanceof Date) return x.toISOString().slice(0, 10);
  const s = String(x);
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`Not a date: ${s}`);
  return s;
};
COMPANY.addDays = (s, n) => new Date(Date.parse(s + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
COMPANY.daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
COMPANY.randDate = (r, start, end) => {
  start = COMPANY.date(start); end = COMPANY.date(end);
  if (end <= start) return start;
  return COMPANY.addDays(start, r.below(COMPANY.daysBetween(start, end) + 1));
};
/* Python round(): halves go to the even number */
COMPANY.pyRound = x => { const f = Math.floor(x), diff = x - f; if (Math.abs(diff - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1; return Math.round(x); };
COMPANY.slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
COMPANY.fold = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "");
COMPANY.uniq = arr => [...new Set(arr)];
COMPANY.sortStr = arr => arr.slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

/* ---------- profile ---------- */
COMPANY.parseProfile = text => {
  const t = String(text).trim();
  if (t.startsWith("{")) return JSON.parse(t);
  if (!window.jsyaml) throw new Error("The YAML reader isn't loaded");
  return window.jsyaml.load(t);
};
/* Catch YAML slips such as an unquoted comma that splits a value into a stray key. */
COMPANY.checkProfile = (x, path = "profile") => {
  if (Array.isArray(x)) x.forEach((v, i) => COMPANY.checkProfile(v, `${path}[${i}]`));
  else if (x && typeof x === "object" && !(x instanceof Date)) {
    for (const [k, v] of Object.entries(x)) {
      if (v === null || v === undefined) throw new Error(`Profile error at ${path}/${k}: empty value (quote values that contain commas)`);
      COMPANY.checkProfile(v, `${path}/${k}`);
    }
  }
};
/* Dates may arrive as Date objects (YAML) or strings (JSON): make them strings. */
COMPANY.normalize = P => {
  const fix = x => x instanceof Date ? COMPANY.date(x) : Array.isArray(x) ? x.map(fix) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, fix(v)])) : x;
  return fix(P);
};

/* ---------- context ---------- */
COMPANY.createContext = (profile, { seed, profileName = "profile.yaml" } = {}) => {
  COMPANY.checkProfile(profile);
  const P = COMPANY.normalize(profile);
  const CO = P.company;
  const SEED = Number(seed ?? P.seed ?? 1);
  const ctx = {
    P, CO, SEED, profileName,
    AS_OF: COMPANY.date(CO.as_of), HIST: COMPANY.date(CO.history_start), DOMAIN: CO.email_domain,
    SITES: Object.fromEntries(P.sites.map(s => [s.id, s])),
    UNITS: Object.fromEntries(P.units.map(u => [u.code, u])),
    POS: P.positions,
    DTYPES: Object.fromEntries(P.data_types.map(d => [d.key, d])),
    VENDORS: Object.fromEntries(P.vendors.map(v => [v.code, v])),
    SVC: Object.fromEntries((P.services || []).map(s => [s.key, s])),
    RULES: COMPANY.rulesFor(P),
    rng: (...parts) => COMPANY.rng(SEED, ...parts),
    tables: {},     /* file name -> {cols, rows} */
    checks: [],     /* [{name, ok, detail, step}] */
  };
  ctx.divisionOf = code => { let u = ctx.UNITS[code]; while (u && !["division", "company"].includes(u.level)) u = ctx.UNITS[u.parent]; return u ? u.code : null; };
  return ctx;
};

/* ---------- output helpers ---------- */
COMPANY.fmt = v => v === null || v === undefined ? "" : typeof v === "boolean" ? (v ? "Yes" : "No") : Array.isArray(v) ? v.map(COMPANY.fmt).join("|") : String(v);
COMPANY.table = (ctx, name, cols, rows) => {
  ctx.tables[name] = { cols, rows: rows.map(r => Object.fromEntries(cols.map((c, i) => [c, COMPANY.fmt(Array.isArray(r) ? r[i] : r[c])]))) };
  return ctx.tables[name].rows.length;
};
/* Same quoting as Python's csv module: quote only when needed, LF line ends, no BOM. */
COMPANY.toCSV = ({ cols, rows }) => {
  const q = s => /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  return [cols.map(q).join(","), ...rows.map(r => cols.map(c => q(r[c])).join(","))].join("\n") + "\n";
};

/* ---------- running ---------- */
/* A module: {id, title, description, requires: [ids], files: [names], build(ctx), write(ctx), checks(ctx)}.
   build() adds records to ctx; write() turns them into tables once every chosen module
   has built (so, e.g., vendor contacts land in people.csv); checks() adds validation rows. */
COMPANY.register = mod => { COMPANY.modules.push({ requires: [], files: [], build() {}, write() {}, checks() {}, ...mod }); return mod; };
COMPANY.module = id => COMPANY.modules.find(m => m.id === id);
/* The chosen modules plus everything they depend on, in pipeline order. */
COMPANY.resolve = ids => {
  if (!ids) return COMPANY.modules.slice();
  const want = new Set();
  const add = id => { const m = COMPANY.module(id); if (!m) throw new Error(`Unknown module: ${id}`); if (want.has(id)) return; want.add(id); m.requires.forEach(add); };
  ids.forEach(add);
  return COMPANY.modules.filter(m => want.has(m.id));
};
/* Locales whose Faker data the pipeline needs. */
COMPANY.locales = P => COMPANY.uniq(P.sites.map(s => COMPANY.LOCALE[s.country]).filter(Boolean).concat("en_US"));
COMPANY.prepare = async P => {
  await GEN.prepare(COMPANY.locales(P));
};
/* opts: {seed, profileName, modules: [ids] (default: all)} */
COMPANY.run = (profile, opts = {}) => {
  const ctx = COMPANY.createContext(profile, opts);
  ctx.modules = COMPANY.resolve(opts.modules);
  ctx.has = id => ctx.modules.some(m => m.id === id);
  ctx.owners = [];   /* [{id, what}] people who own something; checked at the end */
  for (const m of ctx.modules) m.build(ctx);
  for (const m of ctx.modules) m.write(ctx);
  if (opts.beforeChecks) opts.beforeChecks(ctx);   /* tests use this to break a check on purpose */
  for (const m of ctx.modules) { ctx.step = m.id; m.checks(ctx); }
  COMPANY.finish(ctx);
  return ctx;
};
COMPANY.check = (ctx, name, ok, detail = "") => ctx.checks.push({ name, ok: !!ok, detail: String(detail), step: ctx.step });
COMPANY.ok = ctx => ctx.checks.every(c => c.ok);
/* Every file in the download, in load order, plus the report and README. */
COMPANY.files = ctx => {
  const out = [];
  for (const m of ctx.modules) for (const f of m.files) if (ctx.tables[f]) out.push({ name: f, data: COMPANY.toCSV(ctx.tables[f]) });
  out.push({ name: "validation-report.md", data: ctx.report }, { name: "README.md", data: ctx.readme });
  return out;
};
