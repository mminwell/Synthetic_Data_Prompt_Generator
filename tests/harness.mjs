// Loads the browser scripts into a Node VM context, the way index.html loads them.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SCRIPTS = [
  "vendor/faker-core.js", "vendor/faker-locales/en_US.js", "vendor/faker-locales/en_IE.js", "vendor/faker-locales/en_GB.js",
  "vendor/js-yaml.min.js", "gen/common.js",
  "gen/company/core.js", "gen/company/rules.js", "gen/company/foundation.js", "gen/company/org.js", "gen/company/facilities.js",
  "gen/company/catalog.js", "gen/company/applications.js", "gen/company/assets.js", "gen/company/report.js",
  "profiles/larkspur-pay.js",
];

export const load = () => {
  const ctx = { console, TextEncoder };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const s of SCRIPTS) vm.runInContext(readFileSync(path.join(root, s), "utf8"), ctx, { filename: s });
  return { COMPANY: vm.runInContext("COMPANY", ctx), GEN: vm.runInContext("GEN", ctx), window: ctx };
};
export const larkspurText = () => readFileSync(path.join(root, "docs/requirements/larkspur-pay.profile.yaml"), "utf8");
