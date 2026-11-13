/* Shared helpers for the in-browser data generators.
   Everything is seeded, so the same settings + seed always produce the same data. */
const GEN = {};

/* ---------- seeded random numbers ---------- */
GEN.rng = seed => {
  let a = seed >>> 0;
  const f = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.chance = p => f() < p;
  f.uniform = (lo, hi) => lo + f() * (hi - lo);
  f.w = pairs => { const t = pairs.reduce((s, p) => s + p[1], 0); let r = f() * t; for (const p of pairs) { if ((r -= p[1]) < 0) return p[0]; } return pairs[pairs.length - 1][0]; };
  f.shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  f.digits = n => Array.from({ length: n }, () => Math.floor(f() * 10)).join("");
  f.letters = (n, pool = "ABCDEFGHJKLMNPRSTUVWXYZ") => Array.from({ length: n }, () => pool[Math.floor(f() * pool.length)]).join("");
  return f;
};
GEN.hash = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/* ---------- dates (UTC, ISO strings) ---------- */
GEN.d = s => new Date(s + "T00:00:00Z");
GEN.iso = d => d.toISOString().slice(0, 10);
GEN.addDays = (d, n) => new Date(d.getTime() + n * 864e5);
GEN.addMonths = (d, m) => { const x = new Date(d); const day = x.getUTCDate(); x.setUTCDate(1); x.setUTCMonth(x.getUTCMonth() + m); x.setUTCDate(Math.min(day, 28)); return x; };
GEN.between = (R, a, b) => GEN.addDays(a, R.int(0, Math.max(0, Math.round((b - a) / 864e5))));
GEN.monday = d => { let x = d; while (x.getUTCDay() !== 1) x = GEN.addDays(x, 1); return x; };
GEN.years = (a, b) => (b - a) / (365.25 * 864e5);
GEN.stamp = (R, d) => `${GEN.iso(d)} ${String(R.int(8, 18)).padStart(2, "0")}:${String(R.int(0, 59)).padStart(2, "0")}`;

/* ---------- script loading (Faker locales etc. load only when needed) ---------- */
GEN._loaded = {};
GEN.load = src => GEN._loaded[src] || (GEN._loaded[src] = new Promise((ok, no) => {
  const s = document.createElement("script"); s.src = src; s.onload = ok;
  s.onerror = () => { delete GEN._loaded[src]; no(new Error("Couldn't load " + src)); };
  document.head.appendChild(s);
}));
GEN.NONLATIN = new Set(["ja", "zh_CN", "zh_TW", "ko", "ru", "uk", "el", "he", "ar", "fa", "th", "ka_GE", "hy", "mk", "ne", "bn_BD", "ur", "mn_MN_cyrl", "dv", "ta_IN"]);
GEN.prepare = async locales => {
  await GEN.load("vendor/faker-core.js");
  const need = [...new Set(locales.filter(Boolean))];
  await Promise.all(need.map(l => GEN.load(`vendor/faker-locales/${l}.js`)));
  if (need.some(l => GEN.NONLATIN.has(l))) await GEN.load("vendor/any-ascii.js");
};
GEN.faker = (locale, seed) => {
  const { Faker, en, base } = window.FakerCore;
  const loc = (window.FakerLocales || {})[locale];
  const f = new Faker({ locale: loc ? [loc, en, base] : [en, base] });
  f.seed(seed >>> 0);
  return f;
};

/* ---------- country metadata ---------- */
GEN.meta = cc => {
  const r = COUNTRIES[cc] || [], m = (window.COUNTRY_META || {})[cc] || {};
  return { name: r[0] || cc, region: r[1] || "", currency: r[2] || "USD", phone: (r[4] || "+1").replace("+", ""), capital: m.cap || "", tz: m.tz || "UTC", locale: m.loc || "" };
};
GEN.ascii = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 .'-]/g, "");
GEN.roman = s => {
  const t = (window.anyAscii ? window.anyAscii(String(s)) : GEN.ascii(s)).replace(/\s+/g, " ").trim();
  return t.split(" ").map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w).join(" ");
};
GEN.slug = s => GEN.ascii(GEN.roman(s)).toLowerCase().replace(/[^a-z0-9]/g, "");

/* ---------- cities we know details for (state, postal prefix, area code, time zone) ---------- */
GEN.US_CITIES = Object.fromEntries(`denver|CO|802|303|America/Denver;aurora|CO|800|303|America/Denver;lakewood|CO|802|303|America/Denver;boulder|CO|803|303|America/Denver;littleton|CO|801|303|America/Denver;new york|NY|100|212|America/New_York;brooklyn|NY|112|718|America/New_York;queens|NY|113|718|America/New_York;jersey city|NJ|073|201|America/New_York;hoboken|NJ|070|201|America/New_York;austin|TX|787|512|America/Chicago;round rock|TX|786|512|America/Chicago;cedar park|TX|786|512|America/Chicago;chicago|IL|606|312|America/Chicago;evanston|IL|602|847|America/Chicago;oak park|IL|603|708|America/Chicago;san francisco|CA|941|415|America/Los_Angeles;oakland|CA|946|510|America/Los_Angeles;berkeley|CA|947|510|America/Los_Angeles;daly city|CA|940|650|America/Los_Angeles;atlanta|GA|303|404|America/New_York;decatur|GA|300|404|America/New_York;marietta|GA|300|770|America/New_York;seattle|WA|981|206|America/Los_Angeles;bellevue|WA|980|425|America/Los_Angeles;boston|MA|021|617|America/New_York;cambridge|MA|021|617|America/New_York;los angeles|CA|900|213|America/Los_Angeles;san diego|CA|921|619|America/Los_Angeles;san jose|CA|951|408|America/Los_Angeles;portland|OR|972|503|America/Los_Angeles;phoenix|AZ|850|602|America/Phoenix;dallas|TX|752|214|America/Chicago;houston|TX|770|713|America/Chicago;miami|FL|331|305|America/New_York;tampa|FL|336|813|America/New_York;orlando|FL|328|407|America/New_York;minneapolis|MN|554|612|America/Chicago;detroit|MI|482|313|America/Detroit;philadelphia|PA|191|215|America/New_York;pittsburgh|PA|152|412|America/New_York;washington|DC|200|202|America/New_York;washington d.c.|DC|200|202|America/New_York;baltimore|MD|212|410|America/New_York;charlotte|NC|282|704|America/New_York;raleigh|NC|276|919|America/New_York;nashville|TN|372|615|America/Chicago;salt lake city|UT|841|801|America/Denver;las vegas|NV|891|702|America/Los_Angeles;kansas city|MO|641|816|America/Chicago;st. louis|MO|631|314|America/Chicago;columbus|OH|432|614|America/New_York;cleveland|OH|441|216|America/New_York;indianapolis|IN|462|317|America/Indiana/Indianapolis;boise|ID|837|208|America/Boise;honolulu|HI|968|808|Pacific/Honolulu;anchorage|AK|995|907|America/Anchorage;madison|WI|537|608|America/Chicago;richmond|VA|232|804|America/New_York;albuquerque|NM|871|505|America/Denver`
  .split(";").map(r => { const [c, st, zip, area, tz] = r.split("|"); return [c, { st, zip, area, tz }]; }));
GEN.US_REMOTE = ["portland", "seattle", "phoenix", "salt lake city", "minneapolis", "nashville", "raleigh", "columbus", "pittsburgh", "boston", "tampa", "kansas city", "boise", "madison", "richmond", "albuquerque", "honolulu", "anchorage", "charlotte", "dallas"];
GEN.US_SUBURBS = { denver: ["aurora", "lakewood", "boulder", "littleton"], "new york": ["brooklyn", "queens", "jersey city", "hoboken"], austin: ["round rock", "cedar park"], chicago: ["evanston", "oak park"], "san francisco": ["oakland", "berkeley", "daly city"], atlanta: ["decatur", "marietta"], seattle: ["bellevue"], boston: ["cambridge"] };
/* other countries: city -> [state/province, time zone, postal key, area code] */
GEN.CITIES = {
  GB: { london: ["Greater London", "Europe/London", "LON"], manchester: ["Greater Manchester", "Europe/London", "MAN"], salford: ["Greater Manchester", "Europe/London", "MAN"], stockport: ["Greater Manchester", "Europe/London", "SK"] },
  CA: { toronto: ["ON", "America/Toronto", "M", "416"], mississauga: ["ON", "America/Toronto", "L5", "905"], markham: ["ON", "America/Toronto", "L3", "905"], vancouver: ["BC", "America/Vancouver", "V6", "604"], burnaby: ["BC", "America/Vancouver", "V5", "604"], montreal: ["QC", "America/Toronto", "H", "514"], ottawa: ["ON", "America/Toronto", "K1", "613"], calgary: ["AB", "America/Edmonton", "T2", "403"] },
  DE: { berlin: ["Berlin", "Europe/Berlin", "BER"], potsdam: ["Brandenburg", "Europe/Berlin", "POT"], munich: ["Bayern", "Europe/Berlin", "MUC"], "münchen": ["Bayern", "Europe/Berlin", "MUC"], freising: ["Bayern", "Europe/Berlin", "FRE"], hamburg: ["Hamburg", "Europe/Berlin", "HAM"], frankfurt: ["Hessen", "Europe/Berlin", "FRA"] },
  IN: { bengaluru: ["Karnataka", "Asia/Kolkata", "5600"], bangalore: ["Karnataka", "Asia/Kolkata", "5600"], hyderabad: ["Telangana", "Asia/Kolkata", "5000"], mumbai: ["Maharashtra", "Asia/Kolkata", "4000"], pune: ["Maharashtra", "Asia/Kolkata", "4110"], chennai: ["Tamil Nadu", "Asia/Kolkata", "6000"], "new delhi": ["Delhi", "Asia/Kolkata", "1100"] },
  MX: { "mexico city": ["CDMX", "America/Mexico_City", "CDMX", "55"], "ciudad de méxico": ["CDMX", "America/Mexico_City", "CDMX", "55"], monterrey: ["Nuevo León", "America/Monterrey", "MTY", "81"], "san pedro garza garcía": ["Nuevo León", "America/Monterrey", "MTY", "81"], guadalajara: ["Jalisco", "America/Mexico_City", "GDL", "33"] },
  JP: { tokyo: ["Tokyo", "Asia/Tokyo", "TYO"], kawasaki: ["Kanagawa", "Asia/Tokyo", "KAW"], yokohama: ["Kanagawa", "Asia/Tokyo", "YOK"], osaka: ["Osaka", "Asia/Tokyo", "OSA"] },
  AU: { sydney: ["NSW", "Australia/Sydney"], melbourne: ["VIC", "Australia/Melbourne"], brisbane: ["QLD", "Australia/Brisbane"], perth: ["WA", "Australia/Perth"] },
  BR: { "são paulo": ["SP", "America/Sao_Paulo"], "sao paulo": ["SP", "America/Sao_Paulo"], "rio de janeiro": ["RJ", "America/Sao_Paulo"] },
  CN: { shanghai: ["Shanghai", "Asia/Shanghai"], shenzhen: ["Guangdong", "Asia/Shanghai"], beijing: ["Beijing", "Asia/Shanghai"] },
  CO: { "bogotá": ["Bogotá D.C.", "America/Bogota"], bogota: ["Bogotá D.C.", "America/Bogota"], "medellín": ["Antioquia", "America/Bogota"], medellin: ["Antioquia", "America/Bogota"] },
  FR: { paris: ["Île-de-France", "Europe/Paris"], lyon: ["Auvergne-Rhône-Alpes", "Europe/Paris"] },
  IE: { dublin: ["Co. Dublin", "Europe/Dublin"], cork: ["Co. Cork", "Europe/Dublin"] },
  IL: { "tel aviv": ["Tel Aviv District", "Asia/Jerusalem"] },
  KR: { seoul: ["Seoul", "Asia/Seoul"] },
  NL: { amsterdam: ["North Holland", "Europe/Amsterdam"] },
  PH: { manila: ["Metro Manila", "Asia/Manila"], cebu: ["Cebu", "Asia/Manila"] },
  PL: { warsaw: ["Masovian", "Europe/Warsaw"], "kraków": ["Lesser Poland", "Europe/Warsaw"], krakow: ["Lesser Poland", "Europe/Warsaw"] },
  SG: { singapore: ["", "Asia/Singapore"] },
  ES: { madrid: ["Community of Madrid", "Europe/Madrid"], barcelona: ["Catalonia", "Europe/Madrid"] },
  SE: { stockholm: ["Stockholm County", "Europe/Stockholm"] },
  CH: { zurich: ["Zürich", "Europe/Zurich"], "zürich": ["Zürich", "Europe/Zurich"], geneva: ["Geneva", "Europe/Zurich"] },
  AE: { dubai: ["Dubai", "Asia/Dubai"] },
};
GEN.SUBURBS = { GB: { london: ["london"], manchester: ["manchester", "salford", "stockport"] }, CA: { toronto: ["toronto", "mississauga", "markham"], vancouver: ["vancouver", "burnaby"] }, DE: { berlin: ["berlin", "potsdam"], munich: ["münchen", "freising"], "münchen": ["münchen", "freising"] }, MX: { monterrey: ["monterrey", "san pedro garza garcía"] }, JP: { tokyo: ["tokyo", "kawasaki", "yokohama"] } };
const titleCase = s => s.replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

/* where a city is: {city, state, tz, key, area} */
GEN.place = (cc, city) => {
  const k = String(city).toLowerCase().trim();
  if (cc === "US") { const u = GEN.US_CITIES[k]; return u ? { city: titleCase(k), state: u.st, tz: u.tz, key: u.zip, area: u.area } : { city, state: "", tz: GEN.meta(cc).tz, key: "", area: "" }; }
  const c = (GEN.CITIES[cc] || {})[k];
  return c ? { city: k === "münchen" ? "München" : titleCase(k), state: c[0], tz: c[1], key: c[2] || "", area: c[3] || "" } : { city, state: "", tz: GEN.meta(cc).tz, key: "", area: "" };
};
GEN.homePlace = (R, cc, city) => {
  const k = String(city).toLowerCase().trim();
  const sub = cc === "US" ? GEN.US_SUBURBS[k] : (GEN.SUBURBS[cc] || {})[k];
  return GEN.place(cc, sub && R.chance(0.5) ? R.pick(sub) : city);
};

/* ---------- address pieces ---------- */
GEN.postal = (R, cc, key, fk) => {
  const d = R.digits;
  if (cc === "US") return key ? key + d(2) : d(5);
  if (cc === "GB" && key) { const out = { LON: ["E1", "E8", "N1", "N16", "NW3", "SE15", "SE22", "SW4", "SW11", "W2", "W12"], MAN: ["M1", "M4", "M14", "M20", "M21", "M50"], SK: ["SK1", "SK4", "SK7"] }[key]; return `${R.pick(out)} ${R.int(1, 9)}${R.letters(2, "ABDEFGHJLNPQRSTUWXYZ")}`; }
  if (cc === "CA" && key) { const fsa = key.length === 1 ? key + R.int(1, 9) + R.pick("ABCEGHJKLMNPRSTV".split("")) : key + R.pick("ABCEGHJKLMNPRSTV".split("")); return `${fsa} ${R.int(0, 9)}${R.pick("ABCEGHJKLMNPRSTVWXYZ".split(""))}${R.int(0, 9)}`; }
  if (cc === "DE" && key) return String({ BER: R.int(10115, 14199), POT: R.int(14467, 14482), MUC: R.int(80331, 81929), FRE: 85354 + R.int(0, 2), HAM: R.int(20095, 22769), FRA: R.int(60306, 65936) }[key]);
  if (cc === "IN" && key) return key + String(R.int(1, 99)).padStart(2, "0");
  if (cc === "MX" && key) return key === "CDMX" ? String(R.int(1000, 16999)).padStart(5, "0") : key === "MTY" ? String(R.int(64000, 66499)) : String(R.int(44100, 45699));
  if (cc === "JP" && key) return `${{ TYO: R.int(100, 179), KAW: R.int(210, 216), YOK: R.int(220, 247), OSA: R.int(530, 559) }[key]}-${d(4)}`;
  try { return fk.location.zipCode(); } catch (e) { return d(5); }
};
const JP_AREAS = { tokyo: ["Shibuya-ku", "Setagaya-ku", "Meguro-ku", "Minato-ku", "Shinagawa-ku", "Nakano-ku", "Suginami-ku", "Bunkyo-ku"], kawasaki: ["Nakahara-ku", "Takatsu-ku", "Saiwai-ku"], yokohama: ["Kohoku-ku", "Nishi-ku", "Aoba-ku"], osaka: ["Kita-ku", "Chuo-ku", "Tennoji-ku"] };
GEN.street = (R, cc, loc, fk, city) => {
  if (cc === "JP") return `${R.int(1, 5)}-${R.int(1, 30)}-${R.int(1, 20)} ${R.pick(JP_AREAS[String(city).toLowerCase()] || ["Chuo-ku", "Kita-ku", "Minami-ku"])}`;
  if (RN[loc]) return `${R.int(1, 250)} ${R.pick(RN[loc][2].split(" "))} Street`;
  let s; try { s = fk.location.streetAddress(); } catch (e) { s = `${R.int(1, 400)} Main Street`; }
  return GEN.NONLATIN.has(loc) ? GEN.roman(s).replace(/(\d)([A-Za-z])/g, "$1 $2") : s;
};
GEN.line2 = (R, cc, fk) => {
  if (!R.chance(cc === "JP" ? 0.55 : 0.3)) return "";
  if (cc === "JP") return `${R.pick(["Sunny Heights", "Park Mansion", "Green Court", "Maison Aoi", "Residence Hikari"])} ${R.int(1, 12)}0${R.int(1, 9)}`;
  if (cc === "DE") return R.pick(["Hinterhaus", `${R.int(1, 5)}. OG`, "Seitenflügel"]);
  if (cc === "MX") return `Depto. ${R.int(1, 12)}0${R.int(1, 9)}`;
  if (cc === "GB" || cc === "IE") return `Flat ${R.int(1, 30)}`;
  if (cc === "US" || cc === "CA") return R.pick([`Apt ${R.int(1, 40)}${R.pick(["A", "B", "C", "D"])}`, `Unit ${R.int(100, 2400)}`]);
  return `Apt ${R.int(1, 60)}`;
};

/* ---------- people ---------- */
const JP_LAST = "佐藤 Sato,鈴木 Suzuki,高橋 Takahashi,田中 Tanaka,伊藤 Ito,渡辺 Watanabe,山本 Yamamoto,中村 Nakamura,小林 Kobayashi,加藤 Kato,吉田 Yoshida,山田 Yamada,佐々木 Sasaki,山口 Yamaguchi,松本 Matsumoto,井上 Inoue,木村 Kimura,林 Hayashi,斎藤 Saito,清水 Shimizu,山崎 Yamazaki,森 Mori,池田 Ikeda,橋本 Hashimoto,阿部 Abe,石川 Ishikawa,前田 Maeda,藤田 Fujita,小川 Ogawa,岡田 Okada".split(",").map(x => x.split(" "));
const JP_F = "陽菜 Hina,結衣 Yui,美咲 Misaki,さくら Sakura,葵 Aoi,凛 Rin,花子 Hanako,由美 Yumi,恵 Megumi,直子 Naoko,裕子 Yuko,明美 Akemi,愛 Ai,真由美 Mayumi,彩 Aya,奈々 Nana,千尋 Chihiro,麻衣 Mai,香織 Kaori,智子 Tomoko".split(",").map(x => x.split(" "));
const JP_M = "翔太 Shota,大輔 Daisuke,健太 Kenta,拓也 Takuya,蓮 Ren,悠斗 Yuto,陽翔 Haruto,大樹 Daiki,誠 Makoto,浩 Hiroshi,隆 Takashi,健一 Kenichi,和也 Kazuya,直樹 Naoki,亮 Ryo,翼 Tsubasa,一郎 Ichiro,雄一 Yuichi,修 Osamu,剛 Tsuyoshi".split(",").map(x => x.split(" "));
const SPANISH = new Set(["es", "es_MX"]);
/* romanized names for scripts that don't write vowels (Arabic, Hebrew, Persian, Urdu) */
const RN = {
  ar: ["Mohammed Ahmed Omar Ali Khalid Yousef Abdullah Hassan Ibrahim Faisal Saeed Tariq Hamza Ziad Karim Nasser Majid Sami Bilal Adel", "Fatima Aisha Mariam Noura Layla Huda Sara Reem Lina Dana Hala Amal Yasmin Salma Rania Nadia Hind Maha Lama Jana", "Al-Harbi Al-Qahtani Al-Otaibi Al-Ghamdi Al-Zahrani Al-Shehri Al-Dosari Al-Mutairi Haddad Khoury Nasser Saleh Hamdan Mansour Aziz Rahman Farouk Kassem Barakat Darwish"],
  he: ["David Yosef Daniel Noam Eitan Itai Omer Yonatan Ariel Uri Avi Moshe Amit Ido Tal", "Noa Tamar Yael Maya Shira Michal Adi Rivka Liat Hila Dana Ayelet Neta Orly Sarah", "Cohen Levi Mizrahi Peretz Biton Dahan Avraham Friedman Katz Azoulay Malka Ben-David Shapiro Goldberg Rosen"],
  fa: ["Ali Reza Mohammad Amir Hossein Mehdi Saeed Arash Babak Kian Dariush Farhad", "Maryam Zahra Fatemeh Sara Narges Leila Shirin Parisa Roya Neda Mina Azadeh", "Ahmadi Hosseini Mohammadi Rezaei Karimi Moradi Jafari Rahimi Tehrani Kazemi Hashemi Sadeghi"],
  ur: ["Muhammad Ahmed Ali Hassan Usman Bilal Imran Fahad Kamran Zeeshan", "Ayesha Fatima Sana Hina Mahnoor Zainab Saba Amna Rabia Nida", "Khan Ahmed Malik Hussain Qureshi Sheikh Butt Chaudhry Siddiqui Raza"],
};
RN.dv = RN.ar;
GEN.name = (R, cc, loc, fk, female) => {
  const sex = female ? "female" : "male";
  if (cc === "JP" || loc === "ja") { const l = R.pick(JP_LAST), f = R.pick(female ? JP_F : JP_M); return { first: f[1], middle: "", last: l[1], local: `${l[0]} ${f[0]}` }; }
  const fn = () => { try { return fk.person.firstName(sex); } catch (e) { return fk.person.firstName(); } };
  const ln = () => fk.person.lastName(sex);
  if (RN[loc]) { const [m, f, l] = RN[loc].map(x => x.split(" ")); return { first: R.pick(female ? f : m), middle: "", last: R.pick(l), local: "" }; }
  if (GEN.NONLATIN.has(loc)) {
    const f = fn(), l = ln(), cjk = ["zh_CN", "zh_TW", "ko"].includes(loc);
    return { first: GEN.roman(f), middle: "", last: GEN.roman(l), local: cjk ? `${l}${f}` : `${f} ${l}` };
  }
  let first = fn(), last = ln(), middle = "";
  const single = () => { let x = ln(); for (let i = 0; i < 6 && /\s/.test(x); i++) x = ln(); return x.split(/\s+/).pop(); };
  if (SPANISH.has(loc)) { last = `${single()} ${single()}`; if (R.chance(0.4)) middle = fn(); }
  else if (loc === "pt_BR" && R.chance(0.5)) last = `${ln()} ${last}`;
  else if (/^en_(US|GB|CA|AU|IE)$|^en$/.test(loc || "en") && R.chance(0.6)) middle = fn();
  else if (loc && loc.startsWith("de") && R.chance(0.3)) middle = fn();
  return { first, middle, last, local: "" };
};
GEN.NICK = { William: "Will", Robert: "Bob", Elizabeth: "Liz", Katherine: "Kate", Michael: "Mike", Christopher: "Chris", Jennifer: "Jen", Matthew: "Matt", Jonathan: "Jon", Daniel: "Dan", Rebecca: "Becky", Nicholas: "Nick", Alexander: "Alex", Alexandra: "Alex", Samuel: "Sam", Thomas: "Tom", Benjamin: "Ben", Joseph: "Joe", Margaret: "Maggie", James: "Jim", Richard: "Rick", Anthony: "Tony", Andrew: "Andy", Jessica: "Jess", Kimberly: "Kim", Timothy: "Tim", Zachary: "Zach", Gregory: "Greg" };

/* phone numbers: fictional ranges where they exist */
GEN.phone = (R, cc, area) => {
  const d = R.digits, m = GEN.meta(cc);
  if (cc === "US") return `+1${area || "303"}55501${d(2)}`;
  if (cc === "CA") return `+1${area || "416"}55501${d(2)}`;
  if (cc === "GB") return `+447700900${d(3)}`;
  if (cc === "AU") return `+614910${d(5)}`;
  if (cc === "DE") return `+4915${R.pick(["1", "2", "7", "9"])}${d(8)}`;
  if (cc === "IN") return `+91${R.pick(["6", "7", "8", "9"])}${d(9)}`;
  if (cc === "MX") return `+52${area || "55"}${d(8)}`;
  if (cc === "JP") return `+81${R.pick(["70", "80", "90"])}${d(8)}`;
  return `+${m.phone}${R.int(2, 9)}${d(8)}`;
};

/* national IDs: never-issued / obviously invalid patterns */
GEN.nationalId = (R, cc) => {
  const d = R.digits, L = R.letters;
  const T = {
    US: ["SSN", `9${d(2)}-${d(2)}-${d(4)}`], GB: ["National Insurance number", `QQ${d(6)}${R.pick(["A", "B", "C", "D"])}`], CA: ["SIN", `0${d(2)} ${d(3)} ${d(3)}`],
    DE: ["Steuer-ID", "0" + d(10)], IN: ["PAN", `ZZ${L(1)}P${L(1)}${d(4)}${L(1)}`], MX: ["CURP", `XEXX${d(6)}${R.pick(["H", "M"])}NE${L(3)}${d(2)}`],
    JP: ["My Number", "0000" + d(8)], AU: ["TFN", "000 " + d(3) + " " + d(3)], BR: ["CPF", `000.000.0${d(2)}-${d(2)}`], CN: ["Resident ID", "000000" + d(12)],
    CO: ["Cédula", "000" + d(7)], FR: ["NIR", "0" + d(14)], IE: ["PPSN", "0000" + d(3) + L(1)], IL: ["Teudat Zehut", "000" + d(6)],
    KR: ["Resident Registration No.", `000000-0${d(6)}`], NL: ["BSN", "000" + d(6)], PH: ["TIN", `000-${d(3)}-${d(3)}`], PL: ["PESEL", "000" + d(8)],
    SG: ["NRIC/FIN", `X${d(7)}${L(1)}`], ES: ["DNI/NIE", "000" + d(5) + L(1)], SE: ["Personnummer", `${d(2)}13${d(2)}-${d(4)}`], CH: ["AHV number", `756.0000.${d(4)}.${d(2)}`],
    AE: ["Emirates ID", `784-0000-${d(7)}-${d(1)}`],
  };
  return T[cc] || ["National ID", "000" + d(7)];
};

/* ---------- money (illustrative values, not live rates) ---------- */
GEN.FX = { USD: 1, GBP: 0.78, CAD: 1.38, EUR: 0.88, INR: 85, MXN: 18.5, JPY: 150, AUD: 1.52, NZD: 1.68, BRL: 5.5, CNY: 7.2, COP: 4000, ILS: 3.7, KRW: 1380, PHP: 57, PLN: 3.9, SGD: 1.33, SEK: 10.5, NOK: 10.7, DKK: 6.6, CHF: 0.86, AED: 3.67, SAR: 3.75, QAR: 3.64, KWD: 0.31, CZK: 22.5, HUF: 360, RON: 4.5, TRY: 34, ZAR: 18, NGN: 1500, EGP: 49, KES: 129, THB: 34, IDR: 16000, VND: 25000, MYR: 4.5, TWD: 32, HKD: 7.8, ARS: 950, CLP: 930, PEN: 3.75, UAH: 41, PKR: 278, BDT: 118, RUB: 90, KZT: 480, MAD: 10, LKR: 300, GHS: 15, ISK: 138, BGN: 1.72, RSD: 103, GEL: 2.7, AMD: 390, AZN: 1.7, UZS: 12700, MNT: 3400, NPR: 135, JOD: 0.71, BHD: 0.38, OMR: 0.38, CRC: 510, DOP: 60, GTQ: 7.7, UYU: 40, BOB: 6.9, PYG: 7500, TND: 3.1, DZD: 134, ETB: 120, TZS: 2600, UGX: 3700 };
GEN.COL = { US: 1, GB: 0.78, CA: 0.8, DE: 0.8, IN: 0.28, MX: 0.33, JP: 0.7, AU: 0.82, NZ: 0.7, BR: 0.32, CN: 0.45, CO: 0.25, FR: 0.72, IE: 0.8, IL: 0.75, KR: 0.6, NL: 0.8, PH: 0.2, PL: 0.45, SG: 0.85, ES: 0.6, SE: 0.75, CH: 1.05, AE: 0.8, IT: 0.6, NO: 0.85, DK: 0.85 };
GEN.colFor = cc => GEN.COL[cc] ?? ({ AMER: 0.8, EMEA: 0.55, APAC: 0.45, LATAM: 0.3 }[GEN.meta(cc).region] || 0.5);
GEN.roundMoney = v => { if (v <= 0) return 0; const step = Math.pow(10, Math.max(0, Math.floor(Math.log10(v)) - 2)); return Math.round(v / step) * step; };

const ENTITY = { US: "Inc.", GB: "Ltd", CA: "Canada Inc.", DE: "GmbH", AT: "GmbH", CH: "AG", IN: "India Pvt. Ltd.", MX: "México S. de R.L. de C.V.", JP: "K.K.", FR: "SAS", ES: "S.L.", IT: "S.r.l.", NL: "B.V.", BE: "BV", SE: "AB", NO: "AS", DK: "ApS", FI: "Oy", PL: "Sp. z o.o.", BR: "Brasil Ltda.", AU: "Pty Ltd", NZ: "Limited", IE: "Ireland Limited", SG: "Pte. Ltd.", CN: "(Shanghai) Co., Ltd.", KR: "Korea Ltd.", IL: "Israel Ltd.", AE: "FZ-LLC", ZA: "(Pty) Ltd", CO: "Colombia S.A.S.", PH: "Philippines Inc." };
GEN.entity = (company, cc) => `${company} ${ENTITY[cc] || GEN.meta(cc).name}`;
GEN.siteName = (city, isHQ) => `${city} ${isHQ ? "HQ" : "Office"}`;

/* ---------- output formats ---------- */
GEN.toCSV = (cols, rows) => {
  const q = v => { const s = v == null ? "" : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "﻿" + [cols.join(","), ...rows.map(r => cols.map(c => q(r[c])).join(","))].join("\r\n") + "\r\n";
};
GEN.toJSON = (cols, rows) => JSON.stringify(rows.map(r => Object.fromEntries(cols.map(c => [c, r[c] === "" ? null : r[c]]))), null, 2);
GEN.toMD = (cols, rows) => { const e = v => String(v ?? "").replace(/\|/g, "\\|"); return [`| ${cols.join(" | ")} |`, `| ${cols.map(() => "---").join(" | ")} |`, ...rows.map(r => `| ${cols.map(c => e(r[c])).join(" | ")} |`)].join("\n") + "\n"; };
GEN.sqlType = (c, rows) => {
  const vals = rows.map(r => r[c]).filter(v => v !== "" && v != null);
  if (/_at$/.test(c)) return "timestamp";
  if (/(_date|^date_of_birth)$/.test(c) || c === "date_of_birth") return "date";
  if (vals.length && vals.every(v => typeof v === "number")) return vals.every(v => Number.isInteger(v)) ? "integer" : "numeric";
  return "text";
};
GEN.toSQL = (table, cols, rows, pk) => {
  const types = cols.map(c => GEN.sqlType(c, rows));
  const lit = (v, t) => v === "" || v == null ? "NULL" : (t === "integer" || t === "numeric") ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
  const out = [`CREATE TABLE ${table} (\n${cols.map((c, i) => `  ${c} ${types[i]}${c === pk ? " PRIMARY KEY" : ""}`).join(",\n")}\n);`, ""];
  for (let i = 0; i < rows.length; i += 100) out.push(`INSERT INTO ${table} (${cols.join(", ")}) VALUES\n${rows.slice(i, i + 100).map(r => `  (${cols.map((c, j) => lit(r[c], types[j])).join(", ")})`).join(",\n")};`, "");
  return out.join("\n");
};
GEN.download = (name, data, mime) => {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
};
GEN.save = async (fmt, base, table, cols, rows, pk) => {
  if (fmt === "csv") return GEN.download(`${base}.csv`, GEN.toCSV(cols, rows), "text/csv;charset=utf-8");
  if (fmt === "json") return GEN.download(`${base}.json`, GEN.toJSON(cols, rows), "application/json");
  if (fmt === "md") return GEN.download(`${base}.md`, GEN.toMD(cols, rows), "text/markdown");
  if (fmt === "sql") return GEN.download(`${base}.sql`, GEN.toSQL(table, cols, rows, pk), "application/sql");
  if (fmt === "xlsx") {
    await GEN.load("vendor/xlsx.mini.min.js");
    const ws = XLSX.utils.aoa_to_sheet([cols, ...rows.map(r => cols.map(c => r[c] === "" ? null : r[c]))]);
    ws["!cols"] = cols.map(c => ({ wch: Math.min(40, Math.max(c.length, ...rows.slice(0, 200).map(r => String(r[c] ?? "").length)) + 2) }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, table.slice(0, 31));
    return GEN.download(`${base}.xlsx`, new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  }
};

/* ---------- several tables at once ---------- */
GEN.zip = files => {   /* store-only ZIP: [{name, data(string)}] -> Blob */
  const enc = new TextEncoder(), T = GEN._crcT || (GEN._crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; }));
  const crc = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const parts = [], central = []; let off = 0;
  const u16 = v => [v & 255, v >>> 8 & 255], u32 = v => [v & 255, v >>> 8 & 255, v >>> 16 & 255, v >>> 24 & 255];
  for (const f of files) {
    const name = enc.encode(f.name), data = enc.encode(f.data), c = crc(data);
    const head = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(c), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)];
    parts.push(new Uint8Array([0x50, 0x4B, 3, 4, ...head]), name, data);
    central.push(new Uint8Array([0x50, 0x4B, 1, 2, ...u16(20), ...head, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), name);
    off += 30 + name.length + data.length;
  }
  const cdSize = central.reduce((s, p) => s + p.length, 0);
  return new Blob([...parts, ...central, new Uint8Array([0x50, 0x4B, 5, 6, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(off), 0, 0])], { type: "application/zip" });
};
GEN.saveTables = async (fmt, base, tables) => {
  if (tables.length === 1) { const t = tables[0]; return GEN.save(fmt, base, t.name, t.cols, t.rows, t.pk); }
  if (fmt === "csv") return GEN.download(`${base}.zip`, GEN.zip(tables.map(t => ({ name: `${t.name}.csv`, data: GEN.toCSV(t.cols, t.rows) }))));
  if (fmt === "json") return GEN.download(`${base}.json`, `{\n${tables.map(t => `"${t.name}": ${GEN.toJSON(t.cols, t.rows)}`).join(",\n")}\n}`, "application/json");
  if (fmt === "md") return GEN.download(`${base}.md`, tables.map(t => `## ${t.name}\n\n${GEN.toMD(t.cols, t.rows)}`).join("\n"), "text/markdown");
  if (fmt === "sql") {
    const sql = tables.map(t => {
      let s = GEN.toSQL(t.name, t.cols, t.rows, t.pk);
      (t.fks || []).forEach(([col, ref]) => { const [rt, rc] = ref.split("."); s = s.replace(new RegExp(`(\\n  ${col} [a-z]+)`), `$1 REFERENCES ${rt}(${rc})`); });
      return s;
    }).join("\n");
    return GEN.download(`${base}.sql`, sql, "application/sql");
  }
  if (fmt === "xlsx") {
    await GEN.load("vendor/xlsx.mini.min.js");
    const wb = XLSX.utils.book_new();
    tables.forEach(t => { const ws = XLSX.utils.aoa_to_sheet([t.cols, ...t.rows.map(r => t.cols.map(c => r[c] === "" ? null : r[c]))]); ws["!cols"] = t.cols.map(c => ({ wch: Math.min(40, Math.max(c.length, ...t.rows.slice(0, 200).map(r => String(r[c] ?? "").length)) + 2) })); XLSX.utils.book_append_sheet(wb, ws, t.name.slice(0, 31)); });
    return GEN.download(`${base}.xlsx`, new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  }
};
