// Company builder tests. Run:  node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { load, larkspurText, root } from "./harness.mjs";
import { PROFILES, bundle } from "../tools/bundle-profiles.mjs";

const { COMPANY } = load();
const plain = x => JSON.parse(JSON.stringify(x));
const same = (a, b, m) => assert.deepEqual(plain(a), plain(b), m);
const NAME = "larkspur-pay.profile.yaml";
const profile = () => COMPANY.parseProfile(larkspurText());
const run = (opts = {}) => COMPANY.run(profile(), { profileName: NAME, ...opts });
const files = ctx => Object.fromEntries(COMPANY.files(ctx).map(f => [f.name, f.data]));
const failed = ctx => ctx.checks.filter(c => !c.ok).map(c => c.name);
const REF = path.join(root, "docs/requirements/reference/out");
const refCsv = readdirSync(REF).filter(f => f.endsWith(".csv"));
const refLines = f => readFileSync(path.join(REF, f), "utf8").replace(/\r\n/g, "\n").trimEnd().split("\n");

const base = run();

test("Larkspur passes all 23 checks", () => {
  assert.equal(base.checks.length, 23);
  same(failed(base), []);
});

test("same profile and seed give byte-identical files, also from a fresh load", () => {
  const a = files(base), b = files(run());
  const fresh = load().COMPANY, c = Object.fromEntries(fresh.files(fresh.run(fresh.parseProfile(larkspurText()), { profileName: NAME })).map(f => [f.name, f.data]));
  same(Object.keys(a), Object.keys(b));
  for (const k of Object.keys(a)) { assert.equal(a[k], b[k], k); assert.equal(a[k], c[k], k); }
});

test("file names and column headers match the reference exactly", () => {
  const mine = Object.keys(base.tables).sort();
  same(mine, refCsv.slice().sort());
  for (const f of refCsv) assert.equal(COMPANY.toCSV(base.tables[f]).split("\n")[0], refLines(f)[0], f);
});

test("row counts are within ±2% of the reference", () => {
  for (const f of refCsv) {
    const ref = refLines(f).length - 1, n = base.tables[f].rows.length;
    assert.ok(Math.abs(n - ref) <= Math.max(0, ref * 0.02), `${f}: ${n} vs reference ${ref}`);
  }
});

test("a different seed changes names and IDs but keeps counts and checks", () => {
  const other = run({ seed: 7 });
  same(failed(other), []);
  assert.notEqual(files(other)["people.csv"], files(base)["people.csv"]);
  for (const [f, t] of Object.entries(base.tables)) {
    const n = other.tables[f].rows.length;
    if (f === "assets.csv") assert.ok(Math.abs(n - t.rows.length) <= t.rows.length * 0.02, f);   // retired laptops are kept at random
    else assert.equal(n, t.rows.length, f);
  }
});

test("emails use .example domains and phones are in fictional ranges", () => {
  for (const p of base.tables["people.csv"].rows) {
    assert.match(p.work_email, /@[a-z0-9.-]+\.example$/);
    if (p.work_phone) assert.ok(COMPANY.fictionalPhone(p.work_phone), p.work_phone);
  }
});

test("output format: ISO dates, Yes/No, pipes, LF line ends, no BOM", () => {
  const f = files(base);
  for (const [k, v] of Object.entries(f)) { assert.ok(!v.startsWith("﻿"), k); assert.ok(!v.includes("\r"), k); }
  const hr = base.tables["people_hr.csv"].rows;
  assert.ok(hr.every(r => !r.hire_date || /^\d{4}-\d{2}-\d{2}$/.test(r.hire_date)));
  assert.ok(base.tables["vendors.csv"].rows.every(r => ["Yes", "No"].includes(r.name_is_real_company)));
  assert.ok(f["README.md"].includes("Everything in these files is fictional"));
});

test("the bundled profile matches the YAML file", () => {
  for (const p of PROFILES) assert.equal(readFileSync(path.join(root, p.out), "utf8"), bundle(p), `${p.out} is stale: run node tools/bundle-profiles.mjs`);
});

test("an unquoted comma in the profile is rejected", () => {
  const broken = larkspurText().replace('title: "President, Larkspur Federal"', "title: President, Larkspur Federal");
  assert.notEqual(broken, larkspurText());
  assert.throws(() => COMPANY.run(COMPANY.parseProfile(broken)), /empty value/);
});

test("choosing modules gives only their files and checks, plus what they need", () => {
  const ctx = run({ modules: ["org", "facilities"] });
  same(ctx.modules.map(m => m.id), ["org", "facilities"]);
  same(failed(ctx), []);
  same(Object.keys(ctx.tables).sort(), ["business_units.csv", "facilities_buildings.csv", "facilities_secure_areas.csv", "facilities_sites.csv", "group_members.csv", "groups.csv", "people.csv", "people_hr.csv"]);
  assert.equal(ctx.tables["people.csv"].rows.length, 616);   // no vendor contacts without vendors
  // Same people whichever modules run (vendor contacts aside)
  const ids = t => t.rows.filter(r => r.employee_id && !r.employee_id.startsWith("VC-")).map(r => r.employee_id + r.work_email);
  same(ids(ctx.tables["people.csv"]), ids(base.tables["people.csv"]));
  same(COMPANY.resolve(["assets"]).map(m => m.id), ["org", "facilities", "catalog", "applications", "assets"]);
  same(COMPANY.resolve(["org"]).map(m => m.id), ["org"]);
});

/* Each check has a test that breaks it on purpose. */
const person = (ctx, f) => ctx.people.find(f);
const pos = (ctx, k) => ctx.byPos[k][0];
const BREAK = {
  "Exactly one Company": { profile: P => P.units.push({ code: "LP2", name: "Second Co", level: "company", head: "ceo" }) },
  "Every unit's parent is the level directly above": { profile: P => { P.units.find(u => u.code === "FIN-TRS-SWF").parent = "FIN"; } },
  "Every person's unit exists": { tamper: c => { c.people[50].unit = "NOPE"; } },
  "Every manager exists and is active": { tamper: c => { c.people[50].manager = "E99999"; } },
  "No manager loops": { tamper: c => { pos(c, "ceo").manager = pos(c, "ea_ceo").id; } },
  "The CEO is the only active person without a manager": { tamper: c => { c.people[50].manager = null; } },
  "Every GRC role is filled by an active person": { tamper: c => { const p = pos(c, "pentester"); p.status = "terminated"; p.term = c.AS_OF; } },
  "Site, country and time zone agree": { tamper: c => { c.people[50].tz = "Europe/Paris"; } },
  "Active headcount per site matches the profile (±2)": { tamper: c => c.people.filter(p => p.site === "LP-MNL-01" && !p.position && p.status === "active").slice(0, 3).forEach(p => { p.status = "terminated"; p.term = c.AS_OF; }) },
  "Total active headcount is 500 (±2)": { tamper: c => c.people.filter(p => p.site === "LP-MNL-01" && !p.position && p.status === "active").slice(0, 3).forEach(p => { p.status = "terminated"; p.term = c.AS_OF; }) },
  "Larkspur Federal staff work in US locations": { tamper: c => { person(c, p => c.divisionOf(p.unit) === "FED").site = "LP-DUB-01"; } },
  "No Manila person has federal access": { tamper: c => c.groups["Federal access (US persons)"].add(person(c, p => p.site === "LP-MNL-01").id) },
  "Terminated people have a termination date after their hire date": { tamper: c => { const p = person(c, p => p.status === "terminated"); p.term = p.hire; } },
  "Hire dates are not before the site opened": { tamper: c => { c.people[50].hire = "2000-01-01"; } },
  "Work emails are unique and use .example domains": { tamper: c => { c.people[50].email = "someone@gmail.com"; } },
  "Phone numbers are fictional (555-0100 + ext., Ofcom drama range, or undiallable)": { tamper: c => { c.people[50].phone = "+1 303-867-5309"; } },
  "Vendors with Restricted data are at least High tier": { profile: P => { P.vendors.find(v => v.tier === "Low").data = ["payroll"]; } },
  "Everyone with a role on a federal application has federal access": { profile: P => { P.applications.find(a => a.id === "APP-003").tech = "controller"; } },
  // The handoff's example: a Manila person given a role on Larkspur Federal
  "No Manila person is linked to a federal application": { profile: P => { P.applications.find(a => a.id === "APP-003").tech = "soc_mnl_lead"; } },
  "Application regulatory scope covers its data types": { patch: () => { const orig = COMPANY.appRegs; COMPANY.appRegs = () => []; return () => { COMPANY.appRegs = orig; }; } },
  "Asset match keys are unique": { tamper: c => { c.assets[1].source_id = c.assets[0].source_id; } },
  "Every owner is an active person": { tamper: c => { pos(c, "treasurer").status = "on_leave"; } },
  "Terminated people own nothing": { tamper: c => { const p = pos(c, "treasurer"); p.status = "terminated"; p.term = c.AS_OF; } },
};

test("every check has a test that breaks it", () => {
  same(Object.keys(BREAK).sort(), base.checks.map(c => c.name).sort());
});
for (const [name, how] of Object.entries(BREAK)) {
  test(`breaking: ${name}`, () => {
    const P = profile();
    if (how.profile) how.profile(P);
    const undo = how.patch ? how.patch() : null;
    try {
      const ctx = COMPANY.run(P, { profileName: NAME, beforeChecks: how.tamper });
      assert.ok(failed(ctx).includes(name), `expected "${name}" to fail; failed: ${failed(ctx).join("; ") || "none"}`);
      assert.equal(COMPANY.ok(ctx), false);
    } finally { if (undo) undo(); }
  });
}
