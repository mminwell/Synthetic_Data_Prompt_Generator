/* "Build a company" page: load a profile, choose modules, generate, check, preview, download. */
(() => {
  const S = { text: "", name: "", profile: null, ctx: null, tab: null, error: "" };
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const v = document.createElement("div");
  v.className = "view"; v.id = "view-company"; v.hidden = true;
  const examples = Object.entries(window.COMPANY_PROFILES || {});
  v.innerHTML = `<div class="eyebrow">Company</div><h1>Build a company</h1>
<p class="sub">Generate a whole fictional company from one profile file: business units, people, facilities, vendors, applications and assets, with IDs that line up across every file. Choose the parts you need. The download is a .zip of CSVs with a validation report and a README.</p>
<section><div class="sh"><div class="eyebrow">01 — Profile</div><h2>Which company?</h2></div><div class="panel">
<div class="row">
<label class="lbl" for="coEx" style="margin:0">Start from</label>
<select id="coEx" class="input" style="width:auto;min-width:220px">${examples.map(([k, p]) => `<option value="${esc(k)}">${esc(p.title)} (example)</option>`).join("")}</select>
<button class="btn btn-secondary" type="button" id="coLoadEx">Load example</button>
<button class="btn btn-secondary" type="button" id="coUpBtn">Upload profile…</button><input type="file" id="coUp" accept=".yaml,.yml,.json,application/json,text/yaml" hidden>
<button class="btn btn-ghost" type="button" id="coDown" disabled>Download profile</button>
</div>
<div class="hint" style="font-size:13px">A profile is a YAML or JSON file describing the company. Editing it in the page comes next; for now, edit the file and upload it again.</div>
<div id="coSum" style="margin-top:16px"></div><div class="err" id="coErr" hidden></div>
</div></section>
<section><div class="sh"><div class="eyebrow">02 — Modules</div><h2>What should it include?</h2></div><div class="panel">
<div class="grid g2" id="coMods"></div>
<div class="hint" style="font-size:13px;margin-top:12px">Modules another module needs are included automatically.</div>
</div></section>
<section><div class="sh"><div class="eyebrow">03 — Generate</div><h2>Generate and check</h2></div><div class="panel">
<div class="row" style="align-items:flex-end">
<div><label class="lbl" for="coSeed">Random seed</label><div class="row" style="gap:6px;flex-wrap:nowrap"><input class="input" id="coSeed" type="number" min="1" style="width:160px"><button class="icon-btn" type="button" id="coDice" title="New random seed" aria-label="New random seed"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/></svg></button></div></div>
<button class="btn btn-primary" type="button" id="coGen" disabled>Generate company</button>
<span class="hint" id="coStat" style="margin:0 0 8px" aria-live="polite"></span>
</div>
<div class="hint">Same profile + same seed = the same files, byte for byte.</div>
<div class="err" id="coGenErr" hidden></div>
<div id="coOut" hidden>
<h3 style="margin-top:28px">Validation report <span class="badge" id="coRes"></span></h3>
<div style="overflow-x:auto;margin-top:8px"><table><thead><tr><th>Check</th><th>Module</th><th>Result</th><th>Detail</th></tr></thead><tbody id="coChecks"></tbody></table></div>
<div class="spread" style="margin-top:24px">
<div class="row" style="gap:8px"><button class="btn btn-primary" type="button" id="coZip">Download .zip</button><button class="btn btn-secondary" type="button" id="coXlsx">Excel workbook</button></div>
<span class="hint" id="coBlock" style="margin:0"></span>
</div>
<div class="stats" id="coTabs" role="group" aria-label="Preview file" style="margin-top:20px"></div>
<div class="preview" id="coPrev"></div><div class="hint" id="coPvn"></div>
</div>
</div></section>`;
  $("#main").appendChild(v);

  const modsEl = $("#coMods", v);
  modsEl.innerHTML = COMPANY.modules.map(m => `<label class="opt" style="border:var(--border);border-radius:10px;padding:12px"><input type="checkbox" data-mod="${m.id}" checked><span><b style="font-weight:500">${esc(m.title)}</b><small>${esc(m.description)}<br><span class="reqby"></span>${m.files.length} files: ${esc(m.files.map(f => f.replace(/\.csv$/, "")).join(", "))}</small></span></label>`).join("");
  const chosen = () => $$("[data-mod]", v).filter(x => x.checked).map(x => x.dataset.mod);
  const syncMods = () => {
    const sel = chosen(), need = {};
    for (const id of sel) for (const m of COMPANY.resolve([id])) if (m.id !== id) (need[m.id] = need[m.id] || []).push(COMPANY.module(id).title);
    for (const x of $$("[data-mod]", v)) {
      const by = need[x.dataset.mod];
      if (by) x.checked = true;
      x.disabled = !!by;
      x.closest("label").querySelector(".reqby").textContent = by ? `Needed by ${by.join(", ")}. ` : "";
    }
    store.set("company.modules", JSON.stringify(chosen()));
  };
  try { const saved = JSON.parse(store.get("company.modules") || "null"); if (Array.isArray(saved) && saved.length) $$("[data-mod]", v).forEach(x => x.checked = saved.includes(x.dataset.mod)); } catch (e) {}
  syncMods();
  modsEl.addEventListener("change", syncMods);

  const showErr = (el, msg) => { el.hidden = !msg; el.textContent = msg || ""; };
  const setProfile = async (text, name) => {
    S.ctx = null; $("#coOut", v).hidden = true; showErr($("#coGenErr", v), "");
    try {
      if (!String(text).trim().startsWith("{")) await GEN.load("vendor/js-yaml.min.js");
      const P = COMPANY.parseProfile(text);
      if (!P || !P.company || !P.units || !P.sites) throw new Error("This doesn't look like a company profile (it needs company, sites and units).");
      COMPANY.checkProfile(P);
      S.text = text; S.name = name; S.profile = P;
      store.set("company.profile", JSON.stringify({ text, name }));
      $("#coSeed", v).value = P.seed || 1;
      const n = k => (Array.isArray(P[k]) ? P[k].length : Object.keys(P[k] || {}).length);
      $("#coSum", v).innerHTML = `<div class="callout"><b style="font-weight:500">${esc(P.company.name)}</b> from <code>${esc(name)}</code>: ${n("sites")} sites, ${n("units")} business units, ${n("positions")} named positions, ${n("vendors")} vendors, ${n("applications")} applications. As of ${esc(COMPANY.date(P.company.as_of))}.</div>`;
      showErr($("#coErr", v), "");
      $("#coGen", v).disabled = false; $("#coDown", v).disabled = false;
    } catch (e) {
      S.profile = null; $("#coGen", v).disabled = true;
      showErr($("#coErr", v), `Couldn't read ${name}: ${e.message}`);
    }
  };
  $("#coLoadEx", v).onclick = () => { const k = $("#coEx", v).value, p = (window.COMPANY_PROFILES || {})[k]; if (p) setProfile(p.text, k); };
  $("#coUpBtn", v).onclick = () => $("#coUp", v).click();
  $("#coUp", v).onchange = async e => { const f = e.target.files[0]; if (f) await setProfile(await f.text(), f.name); e.target.value = ""; };
  $("#coDown", v).onclick = () => S.text && GEN.download(S.name || "profile.yaml", S.text, /\.json$/i.test(S.name) ? "application/json" : "text/yaml");
  $("#coDice", v).onclick = () => { $("#coSeed", v).value = 1 + Math.floor(Math.random() * 99999999); };

  const fileBase = () => `${COMPANY.slug(S.ctx.CO.name)}_seed${S.ctx.SEED}`;
  const generate = async () => {
    const btn = $("#coGen", v);
    btn.disabled = true; $("#coStat", v).textContent = "Generating…"; showErr($("#coGenErr", v), "");
    try {
      await COMPANY.prepare(S.profile);
      const t0 = performance.now();
      S.ctx = COMPANY.run(S.profile, { seed: +$("#coSeed", v).value || 1, profileName: S.name, modules: chosen() });
      S.files = COMPANY.files(S.ctx);
      $("#coStat", v).textContent = `${(S.ctx.people.length + S.ctx.vendorContacts.length).toLocaleString()} people and ${Object.keys(S.ctx.tables).length} files in ${((performance.now() - t0) / 1000).toFixed(1)}s · seed ${S.ctx.SEED}`;
      render();
    } catch (e) {
      S.ctx = null; $("#coOut", v).hidden = true; $("#coStat", v).textContent = "";
      showErr($("#coGenErr", v), `Generation stopped: ${e.message}`);
    } finally { btn.disabled = false; }
  };
  $("#coGen", v).onclick = generate;

  const render = () => {
    const ctx = S.ctx, ok = COMPANY.ok(ctx), failN = ctx.checks.filter(c => !c.ok).length;
    $("#coOut", v).hidden = false;
    const res = $("#coRes", v);
    res.textContent = ok ? `All ${ctx.checks.length} checks pass` : `${failN} of ${ctx.checks.length} checks fail`;
    res.className = "badge " + (ok ? "badge-success" : "badge-warning");
    const fails = ctx.checks.filter(c => !c.ok), passes = ctx.checks.filter(c => c.ok);
    $("#coChecks", v).innerHTML = [...fails, ...passes].map(c => `<tr><td>${esc(c.name)}</td><td style="white-space:nowrap">${esc(COMPANY.module(c.step)?.title || c.step)}</td><td>${c.ok ? '<span class="badge badge-success">Pass</span>' : '<span class="badge badge-warning">Fail</span>'}</td><td class="hint" style="font-size:12px">${esc(c.detail)}${c.ok ? "" : ` <a href="#company" data-fix="${c.step}" style="color:var(--gray-700)">Fix in the profile</a>`}</td></tr>`).join("");
    $("#coZip", v).disabled = !ok; $("#coXlsx", v).disabled = !ok;
    $("#coBlock", v).textContent = ok ? `${S.files.length} files, including validation-report.md and README.md` : "Downloads are off while a check fails. Fix the profile and generate again.";
    if (!S.files.some(f => f.name === S.tab)) S.tab = S.files[0].name;
    renderPreview();
  };
  const renderPreview = () => {
    const f = S.files.find(x => x.name === S.tab), t = S.ctx.tables[S.tab];
    $("#coTabs", v).innerHTML = S.files.map(x => `<button type="button" class="btn ${x.name === S.tab ? "btn-secondary" : "btn-ghost"}" data-tab="${esc(x.name)}" aria-pressed="${x.name === S.tab}" style="height:30px">${esc(x.name.replace(/\.csv$/, ""))}${S.ctx.tables[x.name] ? ` <span class="badge badge-neutral" style="margin-left:4px">${S.ctx.tables[x.name].rows.length.toLocaleString()}</span>` : ""}</button>`).join("");
    if (t) {
      const rows = t.rows.slice(0, 50);
      $("#coPrev", v).innerHTML = `<table><thead><tr>${t.cols.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${t.cols.map(c => `<td>${esc(r[c])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      $("#coPvn", v).textContent = `Showing the first ${rows.length} of ${t.rows.length.toLocaleString()} rows of ${S.tab}.`;
    } else {
      $("#coPrev", v).innerHTML = `<pre style="margin:0;padding:16px;white-space:pre-wrap;font-family:var(--mono);font-size:12px">${esc(f.data)}</pre>`;
      $("#coPvn", v).textContent = "";
    }
  };
  v.addEventListener("click", e => {
    const tb = e.target.closest("[data-tab]");
    if (tb) { S.tab = tb.dataset.tab; renderPreview(); }
    if (e.target.closest("[data-fix]")) { e.preventDefault(); $("#coUpBtn", v).focus(); $("#coUpBtn", v).scrollIntoView({ block: "center" }); }
  });
  $("#coZip", v).onclick = () => { if (S.ctx && COMPANY.ok(S.ctx)) GEN.download(`${fileBase()}.zip`, GEN.zip(S.files)); };
  $("#coXlsx", v).onclick = () => {
    if (!S.ctx || !COMPANY.ok(S.ctx)) return;
    const tables = Object.entries(S.ctx.tables).map(([n, t]) => ({ name: n.replace(/\.csv$/, ""), cols: t.cols, rows: t.rows }));
    GEN.saveTables("xlsx", fileBase(), tables).catch(err => showErr($("#coGenErr", v), "Download failed: " + err.message));
  };

  /* Restore the last profile, or start from the first example */
  let last = null;
  try { last = JSON.parse(store.get("company.profile") || "null"); } catch (e) {}
  if (last && last.text) setProfile(last.text, last.name || "profile.yaml");
  else if (examples.length) setProfile(examples[0][1].text, examples[0][0]);
})();
