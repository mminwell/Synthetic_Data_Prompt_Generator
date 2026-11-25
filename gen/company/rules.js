/* Larkspur-specific generator rules, kept in one place.
   The reference generator hard-codes these. Phase 1 ports them unchanged; a
   profile may override any of them with a top-level `generator_rules:` block,
   and Phase 2 will move them into the profile schema proper. */
COMPANY.LOCALE = { US: "en_US", IE: "en_IE", GB: "en_GB" };

COMPANY.DEFAULT_RULES = {
  /* Divisions where about `contractor_share` of generated staff are contractors */
  contractor_divisions: ["TEC", "OPS", "REV"],
  /* Generated staff per team lead */
  staff_per_lead: 8,
  /* People on leave at as_of */
  on_leave_count: 6,
  /* Site whose unit is used as primary site when a unit has no headcount */
  default_site: "LP-DEN-HQ",
  /* Main phone line per site: extensions are appended. null = UK Ofcom drama range. */
  phone_main: { "LP-DEN-HQ": "+1 303-555-0100", "LP-NYC-01": "+1 212-555-0100", "LP-ARL-01": "+1 703-555-0100",
                "LP-DUB-01": "+353 1 000 0100", "LP-LON-01": null, "LP-MNL-01": "+63 2 0000 0100" },
  /* Groups built from unit membership, position keys, division or site */
  groups: {
    "Security operations": { description: "Security operations analysts across Denver, Dublin, Manila and Arlington", units: ["SEC-CYB-OPS"] },
    "Clinic staff": { description: "On-site clinic staff (HIPAA workforce)", units: ["PPL-CLN"] },
    "SWIFT operators": { description: "Treasury staff allowed into the SWIFT operations room and secure zone", units: ["FIN-TRS-SWF"] },
    "Executive leadership team": { description: "CEO and direct reports", positions: ["ceo", "cfo", "coo", "cto", "cpdo", "cro", "cso", "gc", "chro", "crevo", "fed_president"] },
    "Federal access (US persons)": { description: "People allowed to access Larkspur Federal systems and the CUI room", divisions: ["FED"], sites: ["LP-ARL-01"],
      /* Denver staff who hold roles on federal systems must be US persons too */
      positions: ["cso", "ciso", "soc_mgr", "ir_lead", "threat_hunter", "seceng_dir", "secgrc_dir", "iam_mgr", "appsec_mgr", "sre_head", "bcdr_dir", "bcdr_analyst", "privacy_analyst", "cpo_privacy", "it_dir", "vp_physres"] },
    "GRC platform administrators": { description: "Administrators of the GRC platform", positions: ["secgrc_dir", "grc_policy"] },
    "Risk committee attendees": { description: "Management attendees of the Board Risk Committee", positions: ["cso", "cro", "ceo", "cfo", "gc"] },
  },
  federal_group: "Federal access (US persons)",
  restricted_site: "LP-MNL-01",   /* No one here may have federal access */
  /* Positions that must exist and be active (every GRC module role) */
  grc_positions: ["cro", "vp_erm", "vp_compliance", "bsa_officer", "cpo_privacy", "dpo", "hipaa_po", "privacy_analyst", "cso", "ciso",
    "secgrc_dir", "grc_policy", "grc_ctltest", "fedramp_pm", "cmmc_analyst", "vp_oprisk", "cmp_pci", "cmp_regchange", "tprm_dir",
    "tprm_analyst", "vp_physres", "bcdr_dir", "bcdr_analyst", "cae", "it_audit_mgr", "auditor", "soc_mgr", "threat_hunter",
    "appsec_mgr", "pentester", "erm_analyst", "oprisk_analyst"],
  ceo: "ceo",
  /* Application role holders */
  app_roles: {
    security_federal: "fedramp_pm", security_inhouse: "appsec_mgr", security_saas: "seceng_dir",
    privacy_phi: "hipaa_po", privacy_eu: "dpo", privacy_default: "privacy_analyst",
    continuity: "bcdr_analyst", dr_federal: "fed_eng_dir", dr_inhouse: "sre_head", dr_saas: "it_dir",
  },
  source_name: "Larkspur application inventory",
  code_org: "larkspur",
  /* Cloud accounts: alias, account ID, region */
  accounts: { us: ["lp-prod-us", "100000000101", "us-west-2"], eu: ["lp-prod-eu", "100000000102", "eu-west-1"],
              dr: ["lp-dr-us", "100000000103", "us-east-2"], gov: ["lp-federal-prod", "100000000201", "us-gov-west-1"],
              sec: ["lp-security", "100000000104", "us-west-2"], swift: ["lp-swift-securezone", "100000000105", "us-east-2"] },
  ip_blocks: { us: 10, eu: 20, dr: 30, gov: 40, sec: 11, swift: 50 },
  assets: {
    platform_owner: "sre_head", federal_owner: "fed_eng_dir", security_owner: "seceng_dir", it_owner: "it_dir",
    shared_clusters: {
      us: { name: "eks-prod-us-west-2", env: "Production", services: ["svc_payroll", "svc_cards", "svc_ess"] },
      eu: { name: "eks-prod-eu-west-1", env: "Production", services: ["svc_payroll", "svc_support"] },
      dr: { name: "eks-dr-us-east-2", env: "Disaster recovery", services: ["svc_payroll", "svc_cards"] },
      gov: { name: "eks-federal-us-gov-west-1", env: "Production", services: ["svc_federal"] },
    },
    bucket_apps: ["APP-017", "APP-019"],
    swift: { app: "APP-008", owner: "swift_mgr", room: "LP-NYC-01-SA01", data_type: "swift", service: "svc_funds", terminals: 3 },
    clinic: { app: "APP-038", room: "LP-DEN-HQ-SA01", data_type: "phi", serial: "CLN4410782" },
    network_owner_site: { "LP-ARL-01": "phys_arl" },
    mac_share: 0.85, mac_share_divisions: { FIN: 0.35 },
    retired_laptop_share: 0.2, spare_laptops: 15, spare_site: "LP-DEN-HQ",
  },
};

COMPANY.rulesFor = P => {
  const R = JSON.parse(JSON.stringify(COMPANY.DEFAULT_RULES));
  const o = P.generator_rules || {};
  for (const [k, v] of Object.entries(o)) R[k] = v && typeof v === "object" && !Array.isArray(v) && R[k] && typeof R[k] === "object" && !Array.isArray(R[k]) ? { ...R[k], ...v } : v;
  return R;
};
