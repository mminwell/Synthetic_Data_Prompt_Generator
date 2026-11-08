/* ================= FACILITIES ================= */
const FAC={id:"facilities",nav:"Facilities data",title:"Facilities data",noun:"facilities and real-estate test data",unit:"spaces",table:"spaces",
sub:"Sites, buildings, floors and spaces: desks, offices and meeting rooms, with leases, capacity, occupancy and assignments.",
card:"Sites, buildings, floors and individual spaces with leases, areas, capacity, occupancy and desk assignments.",
countLabel:"Number of spaces (desks, rooms…)",count:300,geoTitle:"Where are the sites?",mixTitle:"What kinds of space?",
extraHint:"e.g. Make the Austin office half-empty because of a planned move.",
geoExtra:`<div class="grid g2" style="margin-top:20px"><div><label class="lbl">Area unit</label><select class="input area"><option value="local">Local convention (sq ft in the US, m² elsewhere)</option><option value="sq ft">Square feet everywhere</option><option value="m²">Square meters everywhere</option></select></div><div><label class="lbl">Buildings per site</label><select class="input bps"><option value="1–2">1–2 (typical offices)</option><option value="exactly 1">Always 1</option><option value="1–4">1–4 (campuses)</option></select></div></div>`,
mixes:[{id:"space",title:"Space types",items:[["Desk",55],["Private office",10],["Meeting room",15],["Phone booth",8],["Collaboration area",5],["Lab",2],["Storage / support",5]]},
{id:"occ",title:"Occupancy",items:[["Occupied",70],["Vacant",20],["Reserved",5],["Under renovation",5]]}],
checks:[{id:"stype",title:"Site types",items:["Headquarters","Office","Data Center","Warehouse","Lab","Coworking"],on:["Headquarters","Office","Data Center"]}],
related:{desc:"Separate sites, buildings, floors and spaces tables linked by IDs, instead of one flat file with site and building details repeated on every row.",
 tables:[["sites","site_id",[],()=>"one row per site"],["buildings","building_id",[["site_id","sites.site_id"]],()=>"one row per building"],["floors","floor_id",[["building_id","buildings.building_id"]],()=>"one row per floor"],["spaces","space_id",[["floor_id","floors.floor_id"]],x=>`exactly ${x.n} rows`]]},
groups:[
{name:"Site",table:"sites",f:[["site_id","Site ID, e.g. LOC-US-DEN","es"],["site_name","e.g. Denver HQ","es"],["site_type","Headquarters, Office, Data Center, Warehouse, Lab, Coworking","es"],["region","AMER, EMEA, APAC, LATAM","s"],["country_code","ISO 3166-1 alpha-2","es"],["address_line1","Street address in local format","s"],["city","City","es"],["state_province","State / province","s"],["postal_code","Text, local format","s"],["time_zone","IANA time zone","s"],["site_status","Active, Planned, Closing","s"]]},
{name:"Lease",table:"sites",f:[["ownership_type","Owned or Leased","s"],["landlord_name","Fictional landlord company"],["lease_start_date","Lease start"],["lease_end_date","Lease end"],["annual_rent_amount","In local currency"],["rent_currency","ISO 4217 code"],["renewal_option","Y/N"]]},
{name:"Building",table:"buildings",f:[["building_id","e.g. LOC-US-DEN-B1","es"],["building_name","Building name","es"],["year_built","Year"],["total_floors","Floors in the building","s"],["gross_area","Total floor area","s"],["area_unit","sq ft or m²","s"],["certification","LEED Gold, BREEAM Very Good, None…"]]},
{name:"Floor",table:"floors",f:[["floor_id","e.g. LOC-US-DEN-B1-F03","es"],["floor_number","Floor number","es"],["floor_area","Floor area"]]},
{name:"Space",table:"spaces",f:[["space_id","e.g. LOC-US-DEN-B1-F03-112","key"],["space_name","e.g. 3.112 or a room name like “Aspen”","s"],["space_type","Desk, Private office, Meeting room, Phone booth…","es"],["capacity","People it holds","es"],["area","Space area","s"],["bookable","Y/N","s"],["occupancy_status","Occupied, Vacant, Reserved, Under renovation","es"],["amenities","Semicolon list: Display; Video conferencing; Whiteboard"]]},
{name:"Assignment",table:"spaces",f:[["assigned_employee_id","Employee using this desk/office; blank if unassigned","s"],["department","Department that owns the space","s"],["cost_center","Department cost center, e.g. CC-1100"]]},
{name:"Operations",table:"spaces",f:[["facility_manager_employee_id","Employee responsible for the site"],["last_inspection_date","Within the past year"],["next_maintenance_date","Future date"],["utilization_percent","Average weekday utilization"]]},
{name:"System",table:"*",f:[["created_at","Record creation timestamp"],["updated_at","Last update timestamp"]]}],
rules:[["geo","Match each site's country","Address, postal code, time zone, currency and area unit follow the site's country.",1],
["hier","Keep the hierarchy consistent","Every space sits on a floor in a building at a site; floor numbers never exceed total floors.",1],
["sizes","Realistic sizes and capacity","Desk, office and meeting-room areas and capacities make sense together.",1],
["dates","Keep dates logical","Leases end after they start, some expiring soon; maintenance in the future.",1],
["fake","Use fictional names","Landlords, building names and street numbers are invented.",1],
["attach","I’ll attach the HR file","The LLM takes employee IDs from an HR file you attach with the prompt.",0]],
what:x=>x.rel?`exactly ${x.n} spaces, plus the sites, buildings and floors that contain them`:`exactly ${x.n} space records (one row per space, with its site, building and floor details repeated on each row)`,
countryLine:(cv,c,x)=>`Currency ${cv[2]}${cv[8]?`; postal format ${cv[8]}`:"; use the local postal-code format"}.`,
lines(x){const h=x.has,R=x.R,geo=[],mix=[],rules=[],checks=[];const v=x.v,area=$(".area",v).value,t=x.checked("stype");
 geo.push(`Area unit: ${area==="local"?"square feet for US sites, square meters everywhere else":area+" for every site"}. Each site has ${$(".bps",v).value} building(s).`);
 if(t.length)geo.push(`Site types to include: ${t.join(", ")}. The first office in ${theName(COUNTRIES[x.g.primary()]?.[0]||"the home country")} is the headquarters.${t.includes("Data Center")?" Add one data center per region the company operates in, with site ID LOC-<country code>-DC1, made up mostly of server rooms and support spaces.":""}`);
 mix.push(`Space types: ${x.mix("space")}.`,`Occupancy: ${x.mix("occ")}.`);
 if(R.geo)rules.push("Each site's address, postal code, time zone, currency and area unit match its country.");
 if(R.hier){rules.push("Every space belongs to exactly one floor, every floor to one building and every building to one site. Floor numbers never exceed the building's total_floors, and IDs nest (e.g. LOC-US-DEN-B1-F03-112).");checks.push("every space links to an existing floor, building and site")}
 if(R.sizes)rules.push("Sizes are realistic: desks about 50–80 sq ft (5–7 m²) for 1 person; private offices 100–200 sq ft for 1–2; meeting rooms seat 4–20 in proportion to their area; floor area roughly equals its spaces plus about 30% circulation.");
 if(R.dates)rules.push("Dates are logical: lease_end_date after lease_start_date, with about 15% of leases ending in the next 18 months; inspections within the past year; maintenance dates in the future.");
 if(R.fake)rules.push("Landlord names, building names and street numbers are fictional; never use real companies or real building names.");
 const emp=h("assigned_employee_id")||h("facility_manager_employee_id");
 if(emp){if(R.attach)rules.push("I've attached an HR employee file. Every *_employee_id must be an employee_id from that file, at the same site (its location_id) and, for assigned desks, the same department where possible.");else rules.push(`Employee references use IDs in the range ${x.emp}${x.profile?"":" (format EMP-1xxxx)"}.`);
  if(h("assigned_employee_id")){rules.push("Only Occupied desks and offices have an assigned_employee_id; Vacant, Reserved and shared spaces leave it blank. No employee is assigned to more than one space.");checks.push("no employee is assigned to two spaces")}}
 return{geo,mix,rules,checks}}};
