import { loadEarthquakeDatabase } from "./data-loader.js?v=1.2.0";
import { renderSitePopup, renderDamageTooltip } from "./popup-renderer.js?v=1.2.0";

// v1.2 Embed API: ?embed=1 activates the iframe-friendly layout while
// preserving the same application code, controls, data loading, and map logic.
const urlParams = new URLSearchParams(window.location.search);
const isEmbedMode = urlParams.get("embed") === "1";

if (isEmbedMode) {
  document.body.classList.add("embed-mode");
  document.documentElement.classList.add("embed-mode-root");
}

const INITIAL_BOUNDS = L.latLngBounds([28.7, 32.0], [37.8, 39.5]);
const ENV_COLORS = Object.freeze({ AC:"#7f3c8d",CS:"#11a579",DR:"#3969ac",GB:"#f2b701",GC:"#e73f74",GE:"#80ba5a",LD:"#e68310",LQ:"#008695",RF:"#cf1c90",SF:"#f97b72",SW:"#4b4b8f",WC:"#a5aa99",WO:"#6f4e7c",U:"#8c8c8c","":"#8c8c8c" });
const ENV_LABELS = Object.freeze({ AC:"AC",CS:"CS",DR:"DR",GB:"GB — Ground breakage",GC:"GC — Ground cracking",GE:"GE — Gas exhalation",LD:"LD — Landslides",LQ:"LQ — Liquefaction",RF:"RF",SF:"SF",SW:"SW — Sea/water phenomena",WC:"WC",WO:"WO",U:"U — Unknown","":"Unknown" });

const DAMAGE_SEVERITY_STYLE = Object.freeze({
  None:{rank:0,radius:5,color:"#f6a04d"},
  Felt:{rank:1,radius:6.5,color:"#e98232"},
  Light:{rank:2,radius:8,color:"#cc6425"},
  Moderate:{rank:3,radius:10,color:"#a9471d"},
  Heavy:{rank:4,radius:12.5,color:"#813318"},
  Severe:{rank:5,radius:15,color:"#542112"},
  U:{rank:-1,radius:6,color:"#8c8c8c"},
  Unknown:{rank:-1,radius:6,color:"#8c8c8c"}
});

const state = {
  database:null, map:null, baseLayers:{},
  layers:{ damage:L.layerGroup(), environmental:L.layerGroup() },
  markers:{ damage:new Map(), environmental:new Map() },
  confidence:"all", legend:null,
  earthquakeMap:null, earthquakeBaseLayers:{}, earthquakeLegend:null,
  earthquakeLayers:{ damage:L.layerGroup(), environmental:L.layerGroup() },
  earthquakeMarkers:{ damage:new Map(), environmental:new Map() },
  earthquakeLabelLayer:L.layerGroup(),
  earthquakeConfidence:"all", selectedEarthquakeId:"",
};

const elements = {
  loading:document.querySelector("#loading-overlay"), status:document.querySelector("#status-message"),
  damageToggle:document.querySelector("#damage-toggle"), environmentalToggle:document.querySelector("#environmental-toggle"),
  confidenceOptions:document.querySelector("#confidence-options"), siteSearch:document.querySelector("#site-search"),
  searchButton:document.querySelector("#search-button"), searchResults:document.querySelector("#search-results"), resetButton:document.querySelector("#reset-button"),
  aboutButton:document.querySelector("#about-button"), aboutDialog:document.querySelector("#about-dialog"),
  damageSiteCount:document.querySelector("#damage-site-count"), environmentalSiteCount:document.querySelector("#environmental-site-count"),
  damageRecordCount:document.querySelector("#damage-record-count"), environmentalRecordCount:document.querySelector("#environmental-record-count"),
  visibleSummary:document.querySelector("#visible-summary"), tabs:[...document.querySelectorAll("[role=tab]")], panels:[...document.querySelectorAll("[role=tabpanel]")],
  embedFilterButton:document.querySelector("#embed-filter-button"), embedFilterClose:document.querySelector("#embed-filter-close"),
  embedAboutButton:document.querySelector("#embed-about-button"), filtersDrawer:document.querySelector("#filters-drawer"),
  earthquakeSelect:document.querySelector("#earthquake-select"), earthquakeConfidenceOptions:document.querySelector("#earthquake-confidence-options"),
  earthquakeSelectionSummary:document.querySelector("#earthquake-selection-summary"), earthquakeStatus:document.querySelector("#earthquake-status-message"),
  earthquakeDamageToggle:document.querySelector("#earthquake-damage-toggle"), earthquakeEnvironmentalToggle:document.querySelector("#earthquake-environmental-toggle"),
  earthquakeStatistics:document.querySelector("#earthquake-statistics"), earthquakeStatisticsEmpty:document.querySelector("#earthquake-statistics-empty"),
  earthquakeDamageTotal:document.querySelector("#earthquake-damage-total"), earthquakeEnvironmentalTotal:document.querySelector("#earthquake-environmental-total"),
  earthquakeDamageRelStats:document.querySelector("#earthquake-damage-rel-stats"), earthquakeDamageSeverityStats:document.querySelector("#earthquake-damage-severity-stats"),
  earthquakeEnvironmentalRelStats:document.querySelector("#earthquake-environmental-rel-stats"), earthquakeEnvironmentalSeverityStats:document.querySelector("#earthquake-environmental-severity-stats"),
};

function showStatus(message,isError=false){ elements.status.textContent=message; elements.status.classList.add("visible"); elements.status.classList.toggle("error",isError); clearTimeout(showStatus.timer); showStatus.timer=setTimeout(()=>elements.status.classList.remove("visible"),isError?9000:4500); }
function coordinates(site){ const lng=Number(site.POINT_X),lat=Number(site.POINT_Y); return Number.isFinite(lat)&&Number.isFinite(lng)?[lat,lng]:null; }
function normalize(value){ return String(value ?? "").trim(); }
function normalizeConfidence(value){
  const normalized=normalize(value);
  return normalized.toUpperCase() === "U" || normalized.toUpperCase() === "UNKNOWN" ? "Unknown" : normalized;
}
function normalizeUnknownLabel(value){
  const normalized=normalize(value);
  return !normalized || normalized.toUpperCase() === "U" || normalized.toUpperCase() === "UNKNOWN" ? "Unknown" : normalized;
}
function isUnknownSite(site){
  if(!site)return true;
  const name=normalize(site.SITE_NAME||site.S_NAME).toUpperCase();
  return name === "UNKNOWN";
}
function isMappedEarthquakeRecord(record){ return Boolean(record?._site) && !isUnknownSite(record._site) && Boolean(coordinates(record._site)); }
function recordsForFilter(records){
  return state.confidence === "all"
    ? records
    : records.filter((record)=>normalizeConfidence(record.Rel) === state.confidence);
}
function sizeForCount(count){ if(count<=1)return 12;if(count<=4)return 17;if(count<=9)return 23;if(count<=19)return 30;return 38; }
function effectTypes(records){ return [...new Set(records.map((r)=>normalize(r.Env_Eff)||"U"))].sort(); }
function squareSvg(types,size){ const inner=size-4, width=inner/Math.max(types.length,1); const segments=types.map((t,i)=>`<rect x="${2+i*width}" y="2" width="${i===types.length-1?inner-i*width:width}" height="${inner}" fill="${ENV_COLORS[t]??ENV_COLORS.U}"/>`).join(""); return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">${segments}<rect x="2" y="2" width="${inner}" height="${inner}" rx="2" fill="none" stroke="#fff" stroke-width="2"/></svg>`; }
function environmentalIcon(records){ const size=sizeForCount(records.length),types=effectTypes(records); return L.divIcon({className:"environmental-div-icon",html:squareSvg(types,size),iconSize:[size,size],iconAnchor:[size/2,size/2],popupAnchor:[0,-size/2]}); }

function makeMarker(group,layerName,records){
  const latLng=coordinates(group.site); if(!latLng||!records.length)return null;
  const name=group.site.SITE_NAME||group.site.S_NAME||"Unnamed site"; let marker;
  if(layerName==="damage"){
    marker=L.circleMarker(latLng,{radius:sizeForCount(records.length)/2,color:"#fff",weight:1.5,fillColor:"#b64926",fillOpacity:.86});
    marker.bindTooltip(renderDamageTooltip(group,records),{direction:"top",offset:[0,-5],sticky:true,interactive:true});
  }else{
    const types=effectTypes(records); marker=L.marker(latLng,{icon:environmentalIcon(records)});
    marker.bindTooltip(`${name} · ${records.length} environmental occurrence${records.length===1?"":"s"} · ${types.join(", ")}`,{direction:"top",offset:[0,-8]});
  }
  marker.bindPopup(renderSitePopup(group,layerName,records),{maxWidth:470,minWidth:330,offset:L.point(24,-18),autoPan:true,keepInView:true}); marker._siteGlobalId=group.siteGlobalId; return marker;
}
function rebuildLayer(name){ const layer=state.layers[name],index=state.markers[name]; layer.clearLayers();index.clear(); state.database.layers[name].forEach((group)=>{ const records=recordsForFilter(group.records); const marker=makeMarker(group,name,records);if(marker){marker.addTo(layer);index.set(group.siteGlobalId,marker);} }); }
function rebuildAllLayers(){ rebuildLayer("damage");rebuildLayer("environmental");updateVisibleSummary();updateLegend(); }
function updateVisibleSummary(){ const d=[...state.database.layers.damage.values()].reduce((n,g)=>n+recordsForFilter(g.records).length,0); const e=[...state.database.layers.environmental.values()].reduce((n,g)=>n+recordsForFilter(g.records).length,0); elements.visibleSummary.textContent=`Visible: ${state.markers.damage.size} damage sites (${d} occurrences) and ${state.markers.environmental.size} environmental sites (${e} occurrences).`; }
function setLayerVisibility(name,visible){ const layer=state.layers[name]; if(visible&&!state.map.hasLayer(layer))layer.addTo(state.map);if(!visible&&state.map.hasLayer(layer))state.map.removeLayer(layer);updateLegend(); }
function fitInitialBounds(){ state.map.fitBounds(INITIAL_BOUNDS,{padding:[15,15]}); }
function populateSummary(){ const c=state.database.report.counts; elements.damageSiteCount.textContent=c.damageSites.toLocaleString();elements.environmentalSiteCount.textContent=c.environmentalSites.toLocaleString();elements.damageRecordCount.textContent=c.damageRecords.toLocaleString();elements.environmentalRecordCount.textContent=c.environmentalRecords.toLocaleString(); }

const CONFIDENCE_OPTIONS = Object.freeze([
  { value:"all", label:"All", className:"confidence-all" },
  { value:"Poor", label:"Poor", className:"confidence-left confidence-row-1" },
  { value:"Doubtful", label:"Doubtful", className:"confidence-left confidence-row-2" },
  { value:"Unknown", label:"Unknown", className:"confidence-left confidence-row-3" },
  { value:"Moderate", label:"Moderate", className:"confidence-right confidence-row-1" },
  { value:"High", label:"High", className:"confidence-right confidence-row-2" },
  { value:"Very High", label:"Very High", className:"confidence-right confidence-row-3" },
]);

function confidenceDisplayLabel(value){
  return value === "all" ? "All" : value;
}

function buildConfidenceOptions(){
  elements.confidenceOptions.replaceChildren();
  CONFIDENCE_OPTIONS.forEach((option,index)=>{
    const label=document.createElement("label");
    label.className=`radio-row ${option.className}`;
    const input=document.createElement("input");
    input.type="radio";
    input.name="confidence";
    input.value=option.value;
    input.checked=index===0;
    const span=document.createElement("span");
    span.textContent=option.label;
    label.append(input,span);
    elements.confidenceOptions.append(label);
  });
  elements.confidenceOptions.addEventListener("change",(event)=>{
    if(event.target.name!=="confidence")return;
    state.confidence=event.target.value;
    rebuildAllLayers();
    showStatus(`Confidence filter: ${confidenceDisplayLabel(event.target.value)}.`);
  });
}
function siteSearchIndex(){ const index=new Map();for(const name of ["damage","environmental"])state.database.layers[name].forEach((g)=>{const cur=index.get(g.siteGlobalId)??{siteGlobalId:g.siteGlobalId,name:g.site.SITE_NAME||"Unnamed site",layers:[]};if(!cur.layers.includes(name))cur.layers.push(name);index.set(g.siteGlobalId,cur);});return [...index.values()].sort((a,b)=>a.name.localeCompare(b.name)); }
function renderSearchResults(query){ const q=query.trim().toLowerCase();elements.searchResults.replaceChildren();if(!q){elements.searchResults.classList.remove("active");return;}const results=siteSearchIndex().filter((x)=>x.name.toLowerCase().includes(q)).slice(0,20);if(!results.length){const d=document.createElement("div");d.className="search-result";d.textContent="No matching sites";elements.searchResults.append(d);}else results.forEach((item)=>{const b=document.createElement("button");b.type="button";b.className="search-result";b.textContent=`${item.name} (${item.layers.join(", ")})`;b.onclick=()=>{focusSite(item);elements.searchResults.classList.remove("active");elements.siteSearch.value=item.name;};elements.searchResults.append(b);});elements.searchResults.classList.add("active"); }
function focusSite(item){for(const name of ["damage","environmental"]){const marker=state.markers[name].get(item.siteGlobalId);if(!marker)continue;if(name==="damage")elements.damageToggle.checked=true;else elements.environmentalToggle.checked=true;setLayerVisibility(name,true);state.map.setView(marker.getLatLng(),Math.max(state.map.getZoom(),9),{animate:true});marker.openPopup();return;}showStatus("This site has no records under the current Confidence filter.");}

const countLegendRows=()=>[[12,"1"],[17,"2–4"],[23,"5–9"],[30,"10–19"],[38,"20+"]].map(([size,label])=>`<div class="legend-row"><span class="legend-circle" style="width:${size}px;height:${size}px"></span><span>${label} occurrences</span></div>`).join("");
function damageLegendHtml(){return `<section class="legend-section"><strong>Earthquake Damage</strong><small>Circle size: visible occurrence count</small>${countLegendRows()}</section>`;}
function environmentalLegendHtml(){const types=new Set();state.database.layers.environmental.forEach((g)=>recordsForFilter(g.records).forEach((r)=>types.add(normalize(r.Env_Eff)||"U")));const rows=[...types].sort().map((t)=>`<div class="legend-row"><span class="legend-swatch" style="background:${ENV_COLORS[t]??ENV_COLORS.U}"></span><span>${ENV_LABELS[t]??t}</span></div>`).join("");return `<section class="legend-section"><strong>Environmental Effects</strong><small>Square color: effect type</small><div class="legend-scroll">${rows}</div></section>`;}
function updateLegend(){if(!state.legend||!state.database)return;const sections=[];if(elements.damageToggle.checked)sections.push(damageLegendHtml());if(elements.environmentalToggle.checked)sections.push(environmentalLegendHtml());const c=state.legend.getContainer();c.innerHTML=sections.join("");c.style.display=sections.length?"block":"none";}

function showEarthquakeStatus(message,isError=false){
  if(!elements.earthquakeStatus)return;
  elements.earthquakeStatus.textContent=message;
  elements.earthquakeStatus.classList.add("visible");
  elements.earthquakeStatus.classList.toggle("error",isError);
  clearTimeout(showEarthquakeStatus.timer);
  showEarthquakeStatus.timer=setTimeout(()=>elements.earthquakeStatus.classList.remove("visible"),isError?9000:4500);
}

function eventConfidence(event){ return normalizeConfidence(event.Confidence); }
function eventOrder(event){ const n=Number(event.Order_Date ?? event.Numeric_Date); return Number.isFinite(n)?n:Number.POSITIVE_INFINITY; }
function eventsForEarthquakeFilter(){
  if(!state.database)return [];
  return state.database.raw.events
    .filter((event)=>state.earthquakeConfidence==="all" || eventConfidence(event)===state.earthquakeConfidence)
    .slice()
    .sort((a,b)=>eventOrder(a)-eventOrder(b) || normalize(a.Full_Date).localeCompare(normalize(b.Full_Date)));
}
function eventOptionLabel(event){
  const date=normalize(event.Full_Date)||`Event ${normalize(event.Id)}`;
  const region=normalize(event.Region);
  return region ? `${date}[${region}]` : date;
}
function populateEarthquakeSelect(){
  if(!elements.earthquakeSelect)return;
  const events=eventsForEarthquakeFilter();
  const previous=state.selectedEarthquakeId;
  elements.earthquakeSelect.replaceChildren();
  const placeholder=document.createElement("option");
  placeholder.value="";
  placeholder.textContent=events.length ? "Select an earthquake…" : "No earthquakes match this Confidence";
  elements.earthquakeSelect.append(placeholder);
  events.forEach((event)=>{
    const option=document.createElement("option");
    option.value=normalize(event.Id);
    option.textContent=eventOptionLabel(event);
    elements.earthquakeSelect.append(option);
  });
  elements.earthquakeSelect.disabled=!events.length;
  const stillAvailable=events.some((event)=>normalize(event.Id)===previous);
  if(stillAvailable){
    elements.earthquakeSelect.value=previous;
  }else{
    state.selectedEarthquakeId="";
    clearEarthquakeMap();
  }
}
function buildEarthquakeConfidenceOptions(){
  if(!elements.earthquakeConfidenceOptions)return;
  elements.earthquakeConfidenceOptions.replaceChildren();
  CONFIDENCE_OPTIONS.filter((option)=>option.value!=="Unknown").forEach((option,index)=>{
    const label=document.createElement("label");
    label.className=`radio-row ${option.className}`;
    const input=document.createElement("input");
    input.type="radio";
    input.name="earthquake-confidence";
    input.value=option.value;
    input.checked=index===0;
    const span=document.createElement("span");
    span.textContent=option.label;
    label.append(input,span);
    elements.earthquakeConfidenceOptions.append(label);
  });
  elements.earthquakeConfidenceOptions.addEventListener("change",(event)=>{
    if(event.target.name!=="earthquake-confidence")return;
    state.earthquakeConfidence=event.target.value;
    populateEarthquakeSelect();
    showEarthquakeStatus(`Event Confidence filter: ${confidenceDisplayLabel(event.target.value)}.`);
  });
}
function enrichedRecordsForEvent(layerName,eventId){
  const records=[];
  state.database.layers[layerName].forEach((group)=>{
    group.records.forEach((record)=>{ if(normalize(record.Event_Id)===eventId) records.push(record); });
  });
  return records;
}
function groupRecordsBySite(records){
  const groups=new Map();
  records.forEach((record)=>{
    if(!record._site)return;
    const id=record._siteGlobalId;
    if(!groups.has(id))groups.set(id,{siteGlobalId:id,site:record._site,records:[]});
    groups.get(id).records.push(record);
  });
  return groups;
}
function earthquakeLayerVisible(layerName){
  const toggle=layerName==="damage" ? elements.earthquakeDamageToggle : elements.earthquakeEnvironmentalToggle;
  return toggle ? toggle.checked : true;
}
function setEarthquakeLayerVisibility(layerName,visible){
  if(!state.earthquakeMap)return;
  const layer=state.earthquakeLayers[layerName];
  if(visible&&!state.earthquakeMap.hasLayer(layer))layer.addTo(state.earthquakeMap);
  if(!visible&&state.earthquakeMap.hasLayer(layer))state.earthquakeMap.removeLayer(layer);
}
function damageSeverityForRecords(records){
  let best={label:"U",...DAMAGE_SEVERITY_STYLE.U};
  records.forEach((record)=>{
    const label=normalize(record.Damage_Val)||"U";
    const style=DAMAGE_SEVERITY_STYLE[label]??DAMAGE_SEVERITY_STYLE.U;
    if(style.rank>best.rank)best={label,...style};
  });
  return best;
}
function earthquakeDamageLegendHtml(){
  const order=["None","Felt","Light","Moderate","Heavy","Severe"];
  const rows=order.map((label)=>{
    const style=DAMAGE_SEVERITY_STYLE[label];
    const diameter=style.radius*2;
    return `<div class="legend-row"><span class="legend-circle severity-circle" style="width:${diameter}px;height:${diameter}px;background:${style.color}"></span><span>${label}</span></div>`;
  }).join("");
  return `<section class="legend-section"><strong>Damage Severity</strong><small>Circle size and color: Damage_Val</small>${rows}</section>`;
}
// Site names are shown only on hover through marker tooltips in the selected-earthquake map.
function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));}
function updateEarthquakeLegend(){
  if(!state.earthquakeLegend||!state.database)return;
  const sections=[];
  if(earthquakeLayerVisible("damage"))sections.push(earthquakeDamageLegendHtml());
  if(earthquakeLayerVisible("environmental")){
    const eventId=state.selectedEarthquakeId;
    const records=eventId?enrichedRecordsForEvent("environmental",eventId):[];
    const types=[...new Set(records.map((r)=>normalize(r.Env_Eff)||"U"))].sort();
    const rows=types.map((t)=>`<div class="legend-row"><span class="legend-swatch" style="background:${ENV_COLORS[t]??ENV_COLORS.U}"></span><span>${t}</span></div>`).join("");
    sections.push(`<section class="legend-section"><strong>Environmental Effects</strong><small>Square color: effect type</small>${rows?`<div class="earthquake-env-legend-grid">${rows}</div>`:'<span class="stat-empty">No environmental effects for selected earthquake</span>'}</section>`);
  }
  const c=state.earthquakeLegend.getContainer();
  c.innerHTML=sections.join("");
  c.style.display=sections.length?"block":"none";
}
function clearEarthquakeMap(){
  Object.values(state.earthquakeLayers).forEach((layer)=>layer.clearLayers());
  Object.values(state.earthquakeMarkers).forEach((markers)=>markers.clear());
  state.earthquakeLabelLayer.clearLayers();
  if(elements.earthquakeSelectionSummary)elements.earthquakeSelectionSummary.textContent="Select an earthquake to display its damage and environmental-effect records.";
  updateEarthquakeStatistics([],[]);
  updateEarthquakeLegend();
  if(state.earthquakeMap)state.earthquakeMap.fitBounds(INITIAL_BOUNDS,{padding:[15,15]});
}
const REL_STATS_ORDER=["Poor","Doubtful","Moderate","High","Very High","Unknown"];
const DAMAGE_SEVERITY_ORDER=["None","Felt","Light","Moderate","Heavy","Severe","Unknown"];
function frequency(records,field,normalizer=(v)=>normalize(v)||"Unknown"){
  const counts=new Map();
  records.forEach((record)=>{const value=normalizer(record[field]);counts.set(value,(counts.get(value)||0)+1);});
  return counts;
}
function renderStatTable(container,counts,preferredOrder=[]){
  if(!container)return;
  if(!counts.size){container.innerHTML='<span class="stat-empty">No records</span>';return;}
  const preferred=new Map(preferredOrder.map((value,index)=>[value,index]));
  const rows=[...counts.entries()].sort(([a],[b])=>{
    const aUnknown=normalizeUnknownLabel(a)==="Unknown";
    const bUnknown=normalizeUnknownLabel(b)==="Unknown";
    if(aUnknown!==bUnknown)return aUnknown?1:-1;
    const ai=preferred.has(a)?preferred.get(a):999;
    const bi=preferred.has(b)?preferred.get(b):999;
    if(ai!==bi)return ai-bi;
    const an=Number.parseFloat(a),bn=Number.parseFloat(b);
    if(Number.isFinite(an)&&Number.isFinite(bn))return an-bn;
    return a.localeCompare(b,undefined,{numeric:true});
  });
  container.innerHTML=rows.map(([label,count])=>`<div class="stat-row"><span>${label}</span><strong>${count.toLocaleString()}</strong></div>`).join("");
}
function environmentalSeverityOrder(records){
  const values=new Map();
  records.forEach((record)=>{
    const label=normalizeUnknownLabel(record.ESI_Val);
    const numeric=Number(record.ESI_Num);
    const order=Number.isFinite(numeric)?numeric:999;
    if(!values.has(label)||order<values.get(label))values.set(label,order);
  });
  return [...values.entries()].sort((a,b)=>{
    if(a[0]==="Unknown"&&b[0]!=="Unknown")return 1;
    if(b[0]==="Unknown"&&a[0]!=="Unknown")return -1;
    return a[1]-b[1]||a[0].localeCompare(b[0],undefined,{numeric:true});
  }).map(([label])=>label);
}
function updateEarthquakeStatistics(damageRecords,environmentalRecords){
  const hasSelection=Boolean(state.selectedEarthquakeId);
  if(elements.earthquakeStatistics)elements.earthquakeStatistics.hidden=!hasSelection;
  if(elements.earthquakeStatisticsEmpty)elements.earthquakeStatisticsEmpty.hidden=hasSelection;
  if(!hasSelection)return;
  const mappedDamage=damageRecords.filter(isMappedEarthquakeRecord);
  const mappedEnvironmental=environmentalRecords.filter(isMappedEarthquakeRecord);
  const unmappedDamage=damageRecords.length-mappedDamage.length;
  const unmappedEnvironmental=environmentalRecords.length-mappedEnvironmental.length;
  const damageSites=groupRecordsBySite(mappedDamage).size;
  const environmentalSites=groupRecordsBySite(mappedEnvironmental).size;
  const unassignedText=(n)=>n?` · ${n.toLocaleString()} additional unassigned report${n===1?"":"s"}`:"";
  if(elements.earthquakeDamageTotal)elements.earthquakeDamageTotal.textContent=`${mappedDamage.length.toLocaleString()} mapped record${mappedDamage.length===1?"":"s"} · ${damageSites.toLocaleString()} mapped site${damageSites===1?"":"s"}${unassignedText(unmappedDamage)}`;
  if(elements.earthquakeEnvironmentalTotal)elements.earthquakeEnvironmentalTotal.textContent=`${mappedEnvironmental.length.toLocaleString()} mapped record${mappedEnvironmental.length===1?"":"s"} · ${environmentalSites.toLocaleString()} mapped site${environmentalSites===1?"":"s"}${unassignedText(unmappedEnvironmental)}`;
  renderStatTable(elements.earthquakeDamageRelStats,frequency(mappedDamage,"Rel",normalizeConfidence),REL_STATS_ORDER);
  renderStatTable(elements.earthquakeDamageSeverityStats,frequency(mappedDamage,"Damage_Val",normalizeUnknownLabel),DAMAGE_SEVERITY_ORDER);
  renderStatTable(elements.earthquakeEnvironmentalRelStats,frequency(mappedEnvironmental,"Rel",normalizeConfidence),REL_STATS_ORDER);
  renderStatTable(elements.earthquakeEnvironmentalSeverityStats,frequency(mappedEnvironmental,"ESI_Val",normalizeUnknownLabel),environmentalSeverityOrder(mappedEnvironmental));
}
function renderSelectedEarthquake(){
  const eventId=state.selectedEarthquakeId;
  Object.values(state.earthquakeLayers).forEach((layer)=>layer.clearLayers());
  Object.values(state.earthquakeMarkers).forEach((markers)=>markers.clear());
  if(!eventId){ clearEarthquakeMap(); return; }
  const event=state.database.raw.events.find((row)=>normalize(row.Id)===eventId);
  const damageRecords=enrichedRecordsForEvent("damage",eventId);
  const environmentalRecords=enrichedRecordsForEvent("environmental",eventId);
  const mappedDamageRecords=damageRecords.filter(isMappedEarthquakeRecord);
  const mappedEnvironmentalRecords=environmentalRecords.filter(isMappedEarthquakeRecord);
  const unmappedDamageCount=damageRecords.length-mappedDamageRecords.length;
  const unmappedEnvironmentalCount=environmentalRecords.length-mappedEnvironmentalRecords.length;
  const damageGroups=groupRecordsBySite(mappedDamageRecords);
  const environmentalGroups=groupRecordsBySite(mappedEnvironmentalRecords);
  const bounds=[];
  damageGroups.forEach((group)=>{
    const latLng=coordinates(group.site);
    if(!latLng||!group.records.length)return;
    const severity=damageSeverityForRecords(group.records);
    const marker=L.circleMarker(latLng,{radius:severity.radius,color:"#fff",weight:1.5,fillColor:severity.color,fillOpacity:.9});
    marker.bindTooltip(renderDamageTooltip(group,group.records),{direction:"top",offset:[0,-5],sticky:true,interactive:true});
    marker.bindPopup(renderSitePopup(group,"damage",group.records),{maxWidth:470,minWidth:330,offset:L.point(24,-18),autoPan:true,keepInView:true});
    marker.addTo(state.earthquakeLayers.damage);
    state.earthquakeMarkers.damage.set(group.siteGlobalId,marker);
    bounds.push(latLng);
  });
  environmentalGroups.forEach((group)=>{
    const latLng=coordinates(group.site);
    if(!latLng||!group.records.length)return;
    const name=group.site.SITE_NAME||group.site.S_NAME||"Unnamed site";
    const types=effectTypes(group.records);
    const marker=L.marker(latLng,{icon:environmentalIcon(group.records)});
    marker.bindTooltip(`${name} · ${group.records.length} environmental occurrence${group.records.length===1?"":"s"} · ${types.join(", ")}`,{direction:"top",offset:[0,-8],sticky:true});
    marker.bindPopup(renderSitePopup(group,"environmental",group.records),{maxWidth:470,minWidth:330,offset:L.point(24,-18),autoPan:true,keepInView:true});
    marker.addTo(state.earthquakeLayers.environmental);
    state.earthquakeMarkers.environmental.set(group.siteGlobalId,marker);
    bounds.push(latLng);
  });
  setEarthquakeLayerVisibility("damage",earthquakeLayerVisible("damage"));
  setEarthquakeLayerVisibility("environmental",earthquakeLayerVisible("environmental"));
  updateEarthquakeStatistics(damageRecords,environmentalRecords);
  updateEarthquakeLegend();
  const eventLabel=event ? eventOptionLabel(event) : `Event ${eventId}`;
  const damageSites=state.earthquakeMarkers.damage.size;
  const environmentalSites=state.earthquakeMarkers.environmental.size;
  const extra=[];
  if(unmappedDamageCount)extra.push(`${unmappedDamageCount} unassigned damage report${unmappedDamageCount===1?"":"s"}`);
  if(unmappedEnvironmentalCount)extra.push(`${unmappedEnvironmentalCount} unassigned environmental report${unmappedEnvironmentalCount===1?"":"s"}`);
  if(elements.earthquakeSelectionSummary)elements.earthquakeSelectionSummary.textContent=`${eventLabel}: ${mappedDamageRecords.length} mapped damage record${mappedDamageRecords.length===1?"":"s"} at ${damageSites} site${damageSites===1?"":"s"}; ${mappedEnvironmentalRecords.length} mapped environmental record${mappedEnvironmentalRecords.length===1?"":"s"} at ${environmentalSites} site${environmentalSites===1?"":"s"}${extra.length?`; ${extra.join("; ")}`:""}.`;
  if(bounds.length)state.earthquakeMap.fitBounds(L.latLngBounds(bounds),{padding:[35,35],maxZoom:11});
  else state.earthquakeMap.fitBounds(INITIAL_BOUNDS,{padding:[15,15]});
  showEarthquakeStatus(bounds.length ? `Displayed damage and environmental effects for ${eventLabel}.` : `No mapped effect records found for ${eventLabel}.`);
}
function initializeEarthquakeMap(){
  state.earthquakeMap=L.map("earthquake-map",{zoomControl:true,preferCanvas:true});
  state.earthquakeBaseLayers={
    "Light map":L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{maxZoom:20,subdomains:"abcd",attribution:"&copy; OpenStreetMap contributors &copy; CARTO"}),
    "OpenStreetMap":L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap contributors"}),
    "Satellite imagery":L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"Tiles &copy; Esri and imagery contributors"})
  };
  state.earthquakeBaseLayers.OpenStreetMap.addTo(state.earthquakeMap);
  if(earthquakeLayerVisible("damage"))state.earthquakeLayers.damage.addTo(state.earthquakeMap);
  if(earthquakeLayerVisible("environmental"))state.earthquakeLayers.environmental.addTo(state.earthquakeMap);
  state.earthquakeLabelLayer.addTo(state.earthquakeMap);
  L.control.layers(state.earthquakeBaseLayers,null,{position:"topright"}).addTo(state.earthquakeMap);
  L.control.scale({imperial:false}).addTo(state.earthquakeMap);
  state.earthquakeLegend=L.control({position:"bottomleft"});
  state.earthquakeLegend.onAdd=()=>L.DomUtil.create("div","map-legend");
  state.earthquakeLegend.addTo(state.earthquakeMap);
  updateEarthquakeLegend();
  state.earthquakeMap.fitBounds(INITIAL_BOUNDS,{padding:[15,15]});
  if(state.selectedEarthquakeId)renderSelectedEarthquake();
}

function initializeMap(){state.map=L.map("map",{zoomControl:true,preferCanvas:true});state.baseLayers={"Light map":L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{maxZoom:20,subdomains:"abcd",attribution:"&copy; OpenStreetMap contributors &copy; CARTO"}),"OpenStreetMap":L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap contributors"}),"Satellite imagery":L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"Tiles &copy; Esri and imagery contributors"})};state.baseLayers.OpenStreetMap.addTo(state.map);state.layers.damage.addTo(state.map);state.layers.environmental.addTo(state.map);L.control.layers(state.baseLayers,null,{position:"topright",collapsed:isEmbedMode}).addTo(state.map);L.control.scale({imperial:false}).addTo(state.map);state.legend=L.control({position:"bottomleft"});state.legend.onAdd=()=>L.DomUtil.create("div","map-legend");state.legend.addTo(state.map);fitInitialBounds();}
function activateTab(tab){elements.tabs.forEach((t)=>{const active=t===tab;t.setAttribute("aria-selected",String(active));t.tabIndex=active?0:-1;});elements.panels.forEach((p)=>p.hidden=p.id!==tab.getAttribute("aria-controls"));const panel=tab.getAttribute("aria-controls");if(panel==="accumulated-panel")setTimeout(()=>state.map?.invalidateSize(),0);if(panel==="earthquake-panel")setTimeout(()=>{if(!state.earthquakeMap)initializeEarthquakeMap();else state.earthquakeMap.invalidateSize();},0);}
function setEmbedFiltersOpen(open){if(!isEmbedMode)return;document.body.classList.toggle("embed-filters-open",open);elements.embedFilterButton?.setAttribute("aria-expanded",String(open));if(open)elements.embedFilterClose?.focus();else elements.embedFilterButton?.focus();setTimeout(()=>state.map?.invalidateSize(),220);}
function bindControls(){
  elements.damageToggle.onchange=(e)=>{setLayerVisibility("damage",e.target.checked);updateVisibleSummary();};
  elements.environmentalToggle.onchange=(e)=>{setLayerVisibility("environmental",e.target.checked);updateVisibleSummary();};
  elements.siteSearch.oninput=(e)=>renderSearchResults(e.target.value);
  elements.searchButton.onclick=()=>renderSearchResults(elements.siteSearch.value);
  elements.siteSearch.onkeydown=(e)=>{if(e.key==="Enter"){e.preventDefault();renderSearchResults(elements.siteSearch.value);}if(e.key==="Escape")elements.searchResults.classList.remove("active");};
  elements.resetButton.onclick=()=>{state.confidence="all";elements.confidenceOptions.querySelector('input[value="all"]').checked=true;elements.damageToggle.checked=true;elements.environmentalToggle.checked=true;setLayerVisibility("damage",true);setLayerVisibility("environmental",true);elements.siteSearch.value="";rebuildAllLayers();fitInitialBounds();};
  elements.earthquakeSelect?.addEventListener("change",(event)=>{state.selectedEarthquakeId=event.target.value;renderSelectedEarthquake();});
  elements.earthquakeDamageToggle?.addEventListener("change",(event)=>{setEarthquakeLayerVisibility("damage",event.target.checked);updateEarthquakeLegend();});
  elements.earthquakeEnvironmentalToggle?.addEventListener("change",(event)=>{setEarthquakeLayerVisibility("environmental",event.target.checked);updateEarthquakeLegend();});
  elements.aboutButton.onclick=()=>elements.aboutDialog.showModal();
  elements.embedAboutButton?.addEventListener("click",()=>elements.aboutDialog.showModal());
  elements.embedFilterButton?.addEventListener("click",()=>setEmbedFiltersOpen(!document.body.classList.contains("embed-filters-open")));
  elements.embedFilterClose?.addEventListener("click",()=>setEmbedFiltersOpen(false));
  document.addEventListener("keydown",(event)=>{if(isEmbedMode&&event.key==="Escape"&&document.body.classList.contains("embed-filters-open"))setEmbedFiltersOpen(false);});
  elements.tabs.forEach((tab)=>tab.onclick=()=>activateTab(tab));
}

async function start(){try{initializeMap();bindControls();state.database=await loadEarthquakeDatabase();buildConfidenceOptions();buildEarthquakeConfidenceOptions();populateEarthquakeSelect();rebuildAllLayers();populateSummary();elements.loading.classList.add("hidden");if(isEmbedMode){const accumulatedTab=document.querySelector("#accumulated-tab");if(accumulatedTab)activateTab(accumulatedTab);requestAnimationFrame(()=>{state.map?.invalidateSize();fitInitialBounds();});}const c=state.database.report.counts;showStatus(`Loaded ${c.damageRecords.toLocaleString()} damage and ${c.environmentalRecords.toLocaleString()} environmental records.`);}catch(error){elements.loading.classList.add("hidden");showStatus(error.message||"The map could not be loaded.",true);showEarthquakeStatus(error.message||"The map could not be loaded.",true);console.error(error);}}
start();
