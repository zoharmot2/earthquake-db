import { loadEarthquakeDatabase } from "./data-loader.js";
import { renderSitePopup } from "./popup-renderer.js";

const INITIAL_BOUNDS = L.latLngBounds([28.7, 32.0], [37.8, 39.5]);
const ENV_COLORS = Object.freeze({ AC:"#7f3c8d",CS:"#11a579",DR:"#3969ac",GB:"#f2b701",GC:"#e73f74",GE:"#80ba5a",LD:"#e68310",LQ:"#008695",RF:"#cf1c90",SF:"#f97b72",SW:"#4b4b8f",WC:"#a5aa99",WO:"#6f4e7c",U:"#8c8c8c","":"#8c8c8c" });
const ENV_LABELS = Object.freeze({ AC:"AC",CS:"CS",DR:"DR",GB:"GB — Ground breakage",GC:"GC — Ground cracking",GE:"GE — Gas exhalation",LD:"LD — Landslides",LQ:"LQ — Liquefaction",RF:"RF",SF:"SF",SW:"SW — Sea/water phenomena",WC:"WC",WO:"WO",U:"U — Unknown","":"Unknown" });

const state = {
  database:null, map:null, baseLayers:{},
  layers:{ damage:L.layerGroup(), environmental:L.layerGroup() },
  markers:{ damage:new Map(), environmental:new Map() },
  confidence:"all", legend:null,
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
};

function showStatus(message,isError=false){ elements.status.textContent=message; elements.status.classList.add("visible"); elements.status.classList.toggle("error",isError); clearTimeout(showStatus.timer); showStatus.timer=setTimeout(()=>elements.status.classList.remove("visible"),isError?9000:4500); }
function coordinates(site){ const lng=Number(site.POINT_X),lat=Number(site.POINT_Y); return Number.isFinite(lat)&&Number.isFinite(lng)?[lat,lng]:null; }
function normalize(value){ return String(value ?? "").trim(); }
function normalizeConfidence(value){
  const normalized=normalize(value);
  return normalized === "U" ? "Unknown" : normalized;
}
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
    marker.bindTooltip(`${name} · ${records.length} damage occurrence${records.length===1?"":"s"}`,{direction:"top",offset:[0,-5]});
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

function initializeMap(){state.map=L.map("map",{zoomControl:true,preferCanvas:true});state.baseLayers={"Light map":L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{maxZoom:20,subdomains:"abcd",attribution:"&copy; OpenStreetMap contributors &copy; CARTO"}),"OpenStreetMap":L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap contributors"}),"Satellite imagery":L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"Tiles &copy; Esri and imagery contributors"})};state.baseLayers.OpenStreetMap.addTo(state.map);state.layers.damage.addTo(state.map);state.layers.environmental.addTo(state.map);L.control.layers(state.baseLayers,null,{position:"topright",collapsed:false}).addTo(state.map);L.control.scale({imperial:false}).addTo(state.map);state.legend=L.control({position:"bottomleft"});state.legend.onAdd=()=>L.DomUtil.create("div","map-legend");state.legend.addTo(state.map);fitInitialBounds();}
function activateTab(tab){elements.tabs.forEach((t)=>{const active=t===tab;t.setAttribute("aria-selected",String(active));t.tabIndex=active?0:-1;});elements.panels.forEach((p)=>p.hidden=p.id!==tab.getAttribute("aria-controls"));if(tab.getAttribute("aria-controls")==="accumulated-panel")setTimeout(()=>state.map?.invalidateSize(),0);}
function bindControls(){elements.damageToggle.onchange=(e)=>{setLayerVisibility("damage",e.target.checked);updateVisibleSummary();};elements.environmentalToggle.onchange=(e)=>{setLayerVisibility("environmental",e.target.checked);updateVisibleSummary();};elements.siteSearch.oninput=(e)=>renderSearchResults(e.target.value);elements.searchButton.onclick=()=>renderSearchResults(elements.siteSearch.value);elements.siteSearch.onkeydown=(e)=>{if(e.key==="Enter"){e.preventDefault();renderSearchResults(elements.siteSearch.value);}if(e.key==="Escape")elements.searchResults.classList.remove("active");};elements.resetButton.onclick=()=>{state.confidence="all";elements.confidenceOptions.querySelector('input[value="all"]').checked=true;elements.damageToggle.checked=true;elements.environmentalToggle.checked=true;setLayerVisibility("damage",true);setLayerVisibility("environmental",true);elements.siteSearch.value="";rebuildAllLayers();fitInitialBounds();};elements.aboutButton.onclick=()=>elements.aboutDialog.showModal();elements.tabs.forEach((tab)=>tab.onclick=()=>activateTab(tab));}
async function start(){try{initializeMap();bindControls();state.database=await loadEarthquakeDatabase();buildConfidenceOptions();rebuildAllLayers();populateSummary();elements.loading.classList.add("hidden");const c=state.database.report.counts;showStatus(`Loaded ${c.damageRecords.toLocaleString()} damage and ${c.environmentalRecords.toLocaleString()} environmental records.`);}catch(error){elements.loading.classList.add("hidden");showStatus(error.message||"The map could not be loaded.",true);console.error(error);}}
start();
