/* ================= CMDB ================= */
const CMDB={id:"cmdb",nav:"CMDB data",title:"CMDB data",noun:"CMDB (configuration management database) test data",unit:"configuration items",table:"configuration_items",pk:"ci_id",statKeys:["ci_class","environment","hosting_type"],
extra:({v,mix,chk})=>({clsMix:mix("cls"),envMix:mix("env"),hostMix:mix("host"),clouds:chk("cloud"),hostPattern:$(".host",v).value,
 depts:B.hr?$$('[data-chk="dept"]',B.hr.v).filter(x=>x.checked).map(x=>x.dataset.v):DEPTS,hr:B.hr&&B.hr.ctx?B.hr.settings():null}),

sub:"Configuration items (servers, VMs, databases, applications, network gear and business services) with ownership, lifecycle and relationships.",
card:"Servers, VMs, databases, apps, network gear and business services, with owners, lifecycle dates and dependencies.",
countLabel:"Number of configuration items",count:400,geoTitle:"Where does the infrastructure live?",mixTitle:"What kinds of configuration items?",
extraHint:"e.g. Include a legacy ERP application still running on Windows Server 2012.",
geoExtra:`<div class="grid g2" style="margin-top:20px"><div><label class="lbl">Hostname pattern</label><input class="input host" value="site-env-role-nn, e.g. den-prd-web-01"></div></div>`,
mixes:[{id:"cls",title:"CI classes",items:[["Virtual machine",30],["Physical server",12],["Database",10],["Application",15],["Business service",5],["Network device",12],["Storage",4],["Load balancer",3],["Cloud resource (PaaS)",9]]},
{id:"env",title:"Environment",items:[["Production",40],["Staging",10],["Test",15],["Development",30],["Disaster recovery",5]]},
{id:"host",title:"Hosting",items:[["On-premises",45],["Public cloud",45],["SaaS",10]]}],
checks:[{id:"cloud",title:"Cloud providers",items:["AWS","Azure","Google Cloud","Oracle Cloud"],on:["AWS","Azure"]}],
related:{desc:"A configuration items table plus a separate relationships table (source → target, with a type), instead of relationship columns on each CI.",
 tables:[["cis","ci_id",[],x=>`exactly ${x.n} rows`],["ci_relationships","relationship_id",[["source_ci_id","cis.ci_id"],["target_ci_id","cis.ci_id"]],()=>"about 1.5 rows per CI"]]},
groups:[
{name:"Identity",table:"cis",f:[["ci_id","e.g. CI-000001","key"],["ci_name","Hostname or application name","es"],["ci_class","Virtual machine, Physical server, Database, Application…","es"],["description","Short purpose, e.g. “Payroll API web tier”","s"]]},
{name:"Technical",table:"cis",f:[["environment","Production, Staging, Test, Development, DR","es"],["operating_system","For servers and VMs","s"],["os_version","e.g. 22.04, 2022, 9.3","s"],["manufacturer","Dell, HPE, Cisco, NetApp…"],["model","Hardware model"],["serial_number","Obviously fake"],["ip_address_nic_1","Primary network interface; private ranges only","s"],["ip_address_nic_2","Second interface (e.g. management); blank if none"],["ip_address_nic_3","Third interface (e.g. storage/backup); blank if none"],["ip_address_nic_4","Fourth interface; blank if none"],["fqdn","host.<company domain>"],["cpu_count","vCPUs or cores"],["memory_gb","RAM"],["storage_gb","Disk"],["software_name","For apps and databases","s"],["software_version","e.g. PostgreSQL 15.4","s"]]},
{name:"Hosting",table:"cis",f:[["hosting_type","On-premises, Public cloud, SaaS","es"],["cloud_provider","AWS, Azure, Google Cloud…","s"],["cloud_region","e.g. us-west-2, westeurope","s"],["location_id","Site ID (office or LOC-<cc>-DC1)","es"],["rack_location","e.g. Row C / Rack 12 / U20"]]},
{name:"Ownership",table:"cis",f:[["owner_employee_id","Accountable owner","s"],["support_group","e.g. IT – Linux Infrastructure","es"],["business_service","Service this supports","s"],["business_criticality","Tier 1 (critical) to Tier 4","s"],["cost_center","Department cost center, e.g. CC-1300"]]},
{name:"Lifecycle",table:"cis",f:[["operational_status","Operational, Non-operational, Under maintenance, Retired, Planned","es"],["install_date","Install / provision date","s"],["warranty_expiry_date","Hardware only"],["end_of_life_date","Vendor end of life"],["last_patched_date","Servers / VMs"],["last_discovered_at","Timestamp of last discovery scan"],["discovery_source","Agent, Network scan, Cloud API, Manual"]]},
{name:"Relationships",table:"cis",mode:"flat",f:[["runs_on_ci_id","ci_id of the host or platform it runs on","s"],["depends_on_ci_ids","Semicolon-separated ci_ids it depends on","s"]]},
{name:"Relationships",table:"ci_relationships",mode:"related",f:[["relationship_type","Runs on, Depends on, Hosted in, Connects to, Contains","es"],["is_critical_path","Y/N: failure of the target takes the source down"]]},
{name:"System",table:"*",f:[["created_at","Record creation timestamp"],["updated_at","Last update timestamp"]]}],
rules:[["rel","Build a believable dependency stack","Services → apps → VMs → servers or cloud; no cycles; nothing depends on retired CIs.",1],
["tech","Match technical details to the CI class","OS only on servers/VMs; realistic versions; sizing fits the role.",1],
["fake","Make network and hardware values safe","Private IP ranges, company-domain FQDNs, fake serial numbers.",1],
["dates","Keep lifecycle dates logical","Install before today; warranty and end of life after install.",1],
["attach","I’ll attach the HR file","The LLM takes owner employee IDs from an HR file you attach with the prompt.",0]],
what:x=>x.rel?`exactly ${x.n} configuration items plus the relationships between them`:`exactly ${x.n} configuration item records`,
countryLine:()=>"",
lines(x){const h=x.has,R=x.R,geo=[],mix=[],rules=[],checks=["hostnames are unique"];const host=$(".host",x.v).value.trim(),cl=x.checked("cloud");
 geo.push(`On-premises CIs sit in data center sites (LOC-<country code>-DC1, at most one per region) or server rooms at office sites. Cloud CIs use a real region of their provider close to the country (e.g. us-west-2, westeurope) and carry the nearest site's location_id.`);
 if(host)geo.push(`Hostnames follow this pattern: ${host}.`);
 mix.push(`CI classes: ${x.mix("cls")}.`,`Environment: ${x.mix("env")}.`,`Hosting: ${x.mix("host")}.`);if(cl.length)mix.push(`Cloud providers: ${cl.join(", ")}.`);
 if(R.rel){rules.push(`Relationships form a believable stack with no cycles: business services depend on applications; applications run on VMs, containers or PaaS; VMs run on physical servers (on-premises) or a cloud provider; databases run on servers or managed cloud services; load balancers sit in front of web tiers. Retired CIs have no production dependents.${x.rel?" Store every link in ci_relationships.":""}`);checks.push("every relationship points to existing CIs")}
 if(R.tech)rules.push("Technical details match the CI class: OS fields only for servers and VMs, with realistic families and versions (Windows Server 2019/2022, RHEL 8/9, Ubuntu 22.04/24.04); CPU, memory and storage sized to the role; realistic software for apps and databases (e.g. PostgreSQL 15, SQL Server 2022, Oracle 19c).");
 if(R.fake)rules.push(`IP addresses use private ranges only (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) and are unique across all CIs and interfaces, except that a database instance can share its host's primary IP${h("ip_address_nic_2")?"; physical servers, network devices and storage have 2–4 interfaces, VMs 1–2, and applications and business services none, so leave unused ip_address_nic_* fields blank":""}; FQDNs end in ${x.domain}; serial numbers use an obviously fake prefix such as TEST-.`);
 if(R.dates)rules.push("install_date is before today; warranty and end-of-life dates come after install; about 10% of CIs are past end of life; operational CIs were discovered within the last 30 days.");
 if(h("owner_employee_id")){if(R.attach)rules.push("I've attached an HR employee file. Every owner_employee_id must be an employee_id from that file, preferring IT and Engineering staff.");else rules.push(`owner_employee_id values use IDs in the range ${x.emp}${x.profile?"":" (format EMP-1xxxx)"}, mostly IT and Engineering staff.`)}
 return{geo,mix,rules,checks}}};
