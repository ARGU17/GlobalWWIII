"use strict";

window.NEXUS_MAP_ENGINE = (() => {
  const TILE_SIZE=256,MIN_ZOOM=1,MAX_ZOOM=9;
  let state,callbacks={},canvas,ctx,tooltip,geojson={features:[]},regionGeojson={features:[]},width=0,height=0,dpr=1;
  let camera={lat:18,lng:8,zoom:2};
  let dragging=false,lastPointer=null,hitCountries=[],hitRegions=[],hitMarkers=[],tileCache=new Map(),needsRender=true,frame=null;
  const markerEmoji={housing:"🏘",hospital:"✚",university:"🎓",autoPlant:"🚗",steelPlant:"🏗",chipFab:"▦",shipyard:"⚓",aerospace:"✈",solar:"☀",wind:"✣",nuclear:"☢",grid:"⚡",rail:"═",port:"⚓",airbase:"▲",navalBase:"≈",cyberCenter:"◆",foodPlant:"🥫",agriHub:"🌾",pharmaPlant:"💊",biotechCampus:"🧬",refinery:"🛢",oilField:"🛢",gasField:"🔥",lngTerminal:"🚢",petrochemical:"⚗",chemicalPlant:"🧪",fertilizerPlant:"🌱",cementPlant:"🏗",copperMine:"⛏",lithiumMine:"🔋",batteryGigafactory:"🔋",electronicsPlant:"📱",machineTools:"⚙",textileCluster:"🧵",dataCenter:"▦",desalination:"💧",hydroPlant:"🌊",geothermal:"🌋",hydrogenPlant:"H₂",recyclingHub:"♻",defensePlant:"🛡"};
  const unitEmoji={infantry:"◆",mechanized:"▣",armor:"▰",artillery:"✦",airDefense:"⌁",rocketArtillery:"✹",fighter:"▲",drone:"◇",bomber:"▼",transport:"✈",frigate:"≈",destroyer:"≋",submarine:"◒",carrier:"▱",satellite:"✧",missile:"↟",cyber:"⌘"};

  function initialize(nextState,nextCallbacks={}){
    state=nextState;callbacks=nextCallbacks;
    canvas=document.getElementById("strategicMap");tooltip=document.getElementById("mapTooltip");
    if(!canvas||canvas.tagName!=="CANVAS")throw new Error("El mapa requiere <canvas id=\"strategicMap\">.");
    ctx=canvas.getContext("2d",{alpha:false});
    camera.lat=state.mapCenter?.[0]??18;camera.lng=state.mapCenter?.[1]??8;camera.zoom=state.mapZoom??2;
    bindEvents();resize();loadWorld();loadSpainRegions();startLoop();
  }

  async function loadWorld(){
    try{const response=await fetch("assets/maps/world-countries.geojson",{cache:"force-cache"});if(!response.ok)throw new Error(`GeoJSON ${response.status}`);geojson=await response.json();needsRender=true;}
    catch(error){console.error("No se pudo cargar el mapa mundial local",error);geojson={features:[]};showTipAt(width/2,height/2,"<strong>Mapa sin geometría</strong><span>Comprueba assets/maps/world-countries.geojson.</span>")}
  }

  async function loadSpainRegions(){
    const urls=["https://unpkg.com/es-atlas@0.6.0/es/autonomous_regions.json","assets/maps/spain-autonomous-regions.topojson"];
    for(const url of urls){
      try{const response=await fetch(url,{cache:"force-cache"});if(!response.ok)throw new Error(`${response.status}`);const topology=await response.json();regionGeojson=topologyToRegions(topology);if(regionGeojson.features.length){needsRender=true;return}}
      catch(error){console.warn(`No se pudo cargar ${url}`,error)}
    }
    regionGeojson={features:[]};
  }

  function topologyToRegions(topology){
    if(topology?.type!=="Topology")return topology?.type==="FeatureCollection"?topology:{features:[]};
    const object=topology.objects?.autonomous_regions||Object.values(topology.objects||{})[0];if(!object)return{type:"FeatureCollection",features:[]};
    const transform=topology.transform||{scale:[1,1],translate:[0,0]},cache=[];
    const decodeArc=index=>{const reverse=index<0,idx=reverse?~index:index;if(!cache[idx]){let x=0,y=0;cache[idx]=(topology.arcs[idx]||[]).map(([dx,dy])=>{x+=dx;y+=dy;return[x*transform.scale[0]+transform.translate[0],y*transform.scale[1]+transform.translate[1]]})}const arc=cache[idx];return reverse?[...arc].reverse():arc};
    const stitch=indices=>{const ring=[];for(const idx of indices){const arc=decodeArc(idx);for(let i=0;i<arc.length;i++){if(ring.length&&i===0)continue;ring.push(arc[i])}}return ring};
    const nameToId={"Andalucía":"AND","Aragón":"ARA","Principado de Asturias":"AST","Illes Balears":"BAL","Cantabria":"CNT","Castilla y León":"CYL","Castilla-La Mancha":"CLM","Cataluña/Catalunya":"CAT","Comunitat Valenciana":"VAL","Extremadura":"EXT","Galicia":"GAL","Comunidad de Madrid":"MAD","Región de Murcia":"MUR","Comunidad Foral de Navarra":"NAV","País Vasco/Euskadi":"PVA","La Rioja":"RIO","Canarias":"CAN"};
    const features=[];for(const g of object.geometries||[]){const name=g.properties?.name,id=nameToId[name];if(!id)continue;let geometry;if(g.type==="Polygon")geometry={type:"Polygon",coordinates:g.arcs.map(stitch)};else if(g.type==="MultiPolygon")geometry={type:"MultiPolygon",coordinates:g.arcs.map(poly=>poly.map(stitch))};else continue;features.push({type:"Feature",properties:{...g.properties,regionId:id},geometry})}
    return{type:"FeatureCollection",features};
  }

  function bindEvents(){
    if(canvas.dataset.bound)return;canvas.dataset.bound="1";
    window.addEventListener("resize",resize,{passive:true});
    canvas.addEventListener("pointerdown",e=>{dragging=true;lastPointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);canvas.classList.add("dragging")});
    canvas.addEventListener("pointermove",e=>{
      if(dragging&&lastPointer){panBy(e.clientX-lastPointer.x,e.clientY-lastPointer.y);lastPointer={x:e.clientX,y:e.clientY};hideTip();return}
      hover(e);
    });
    const stop=e=>{dragging=false;lastPointer=null;canvas.classList.remove("dragging");canvas.releasePointerCapture?.(e.pointerId)};
    canvas.addEventListener("pointerup",stop);canvas.addEventListener("pointercancel",stop);canvas.addEventListener("pointerleave",e=>{if(!dragging)hideTip()});
    canvas.addEventListener("wheel",e=>{e.preventDefault();zoomAt(e.offsetX,e.offsetY,e.deltaY<0?.42:-.42)},{passive:false});
    canvas.addEventListener("click",clickMap);
    document.getElementById("mapZoomIn")?.addEventListener("click",()=>zoomAt(width/2,height/2,.6));
    document.getElementById("mapZoomOut")?.addEventListener("click",()=>zoomAt(width/2,height/2,-.6));
    document.getElementById("mapReset")?.addEventListener("click",()=>{camera={lat:18,lng:8,zoom:2};persistCamera();needsRender=true});
    document.getElementById("mapBaseToggle")?.addEventListener("click",()=>{state.mapBase=state.mapBase==="vector"?"osm":"vector";needsRender=true});
  }

  function resize(){const rect=canvas.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);width=Math.max(300,Math.round(rect.width));height=Math.max(260,Math.round(rect.height));canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);needsRender=true}
  function startLoop(){if(frame)return;const loop=()=>{if(needsRender||state?.wars?.some(w=>!w.ended)||(state?.running&&state?.tradeRoutes?.length)){draw();needsRender=false}frame=requestAnimationFrame(loop)};frame=requestAnimationFrame(loop)}
  function render(){needsRender=true}

  function worldSize(z=camera.zoom){return TILE_SIZE*Math.pow(2,z)}
  function project(lat,lng,z=camera.zoom){const size=worldSize(z);const sin=Math.sin(clampLat(lat)*Math.PI/180);return{x:(lng+180)/360*size,y:(.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*size}}
  function unproject(x,y,z=camera.zoom){const size=worldSize(z);const lng=x/size*360-180;const n=Math.PI-2*Math.PI*y/size;const lat=180/Math.PI*Math.atan(.5*(Math.exp(n)-Math.exp(-n)));return{lat:clampLat(lat),lng:normalizeLng(lng)}}
  function clampLat(v){return Math.max(-85.0511,Math.min(85.0511,v))}
  function normalizeLng(v){while(v<-180)v+=360;while(v>180)v-=360;return v}
  function centerWorld(){return project(camera.lat,camera.lng)}
  function toScreen(lat,lng){const p=project(lat,lng),c=centerWorld(),size=worldSize();let dx=p.x-c.x;while(dx>size/2)dx-=size;while(dx<-size/2)dx+=size;return{x:width/2+dx,y:height/2+(p.y-c.y)}}
  function screenToGeo(x,y){const c=centerWorld();return unproject(c.x+(x-width/2),c.y+(y-height/2))}

  function panBy(dx,dy){const c=centerWorld(),next=unproject(c.x-dx,c.y-dy);camera.lat=next.lat;camera.lng=next.lng;persistCamera();needsRender=true}
  function zoomAt(x,y,delta){const before=screenToGeo(x,y);camera.zoom=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,camera.zoom+delta));const after=screenToGeo(x,y);camera.lat=clampLat(camera.lat+(before.lat-after.lat));camera.lng=normalizeLng(camera.lng+(before.lng-after.lng));persistCamera();needsRender=true}
  function persistCamera(){if(!state)return;state.mapCenter=[camera.lat,camera.lng];state.mapZoom=camera.zoom}

  function draw(){if(!ctx)return;hitMarkers=[];hitRegions=[];ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);drawBackground();drawTiles();drawAtmosphere();drawCountries();drawRegions();drawTradeRoutes();drawFacilities();drawUnits();drawWars();drawHUD();ctx.restore()}
  function drawBackground(){const g=ctx.createLinearGradient(0,0,0,height);g.addColorStop(0,"#061725");g.addColorStop(.55,"#082437");g.addColorStop(1,"#04111d");ctx.fillStyle=g;ctx.fillRect(0,0,width,height)}

  function drawTiles(){if(state?.mapBase==="vector")return;const z=Math.max(1,Math.min(7,Math.floor(camera.zoom)));const zScale=Math.pow(2,camera.zoom-z);const centerZ=project(camera.lat,camera.lng,z);const viewW=width/zScale,viewH=height/zScale;const left=centerZ.x-viewW/2,top=centerZ.y-viewH/2;const minX=Math.floor(left/TILE_SIZE),maxX=Math.floor((left+viewW)/TILE_SIZE),minY=Math.floor(top/TILE_SIZE),maxY=Math.floor((top+viewH)/TILE_SIZE);const n=Math.pow(2,z);
    ctx.save();ctx.translate(width/2,height/2);ctx.scale(zScale,zScale);ctx.translate(-centerZ.x,-centerZ.y);
    for(let ty=minY;ty<=maxY;ty++){if(ty<0||ty>=n)continue;for(let tx=minX;tx<=maxX;tx++){const wrapped=((tx%n)+n)%n;const img=getTile(z,wrapped,ty);if(img?.complete&&img.naturalWidth){try{ctx.drawImage(img,tx*TILE_SIZE,ty*TILE_SIZE,TILE_SIZE,TILE_SIZE)}catch(_){}}else{ctx.fillStyle=(tx+ty)%2?"#0a2737":"#0b2c3e";ctx.fillRect(tx*TILE_SIZE,ty*TILE_SIZE,TILE_SIZE,TILE_SIZE)}}}
    ctx.restore();
  }
  function getTile(z,x,y){const key=`${z}/${x}/${y}`;if(tileCache.has(key))return tileCache.get(key);if(tileCache.size>260){const first=tileCache.keys().next().value;tileCache.delete(first)}const img=new Image();img.decoding="async";img.onload=()=>{needsRender=true};img.onerror=()=>{img.failed=true};img.src=`https://tile.openstreetmap.org/${z}/${x}/${y}.png`;tileCache.set(key,img);return img}
  function drawAtmosphere(){ctx.fillStyle=state?.mapBase==="vector"?"rgba(2,13,23,.05)":"rgba(2,10,18,.38)";ctx.fillRect(0,0,width,height);const g=ctx.createRadialGradient(width*.5,height*.45,50,width*.5,height*.45,Math.max(width,height)*.7);g.addColorStop(0,"rgba(58,146,189,.02)");g.addColorStop(1,"rgba(0,5,12,.32)");ctx.fillStyle=g;ctx.fillRect(0,0,width,height)}

  function drawCountries(){hitCountries=[];for(const feature of geojson.features||[]){const id=feature.properties?.ISO3;if(!id)continue;const country=state.countries.find(c=>c.id===id);if(!country)continue;const selected=id===state.selectedCountryId,controlled=id===state.controlledCountryId;const paths=geometryPaths(feature.geometry);for(const path of paths){if(!path)continue;ctx.save();ctx.fillStyle=countryColor(country);ctx.globalAlpha=selected?.62:controlled?.5:camera.zoom<3?.38:.22;ctx.fill(path);ctx.globalAlpha=selected||controlled?1:.74;ctx.strokeStyle=selected?"#ffffff":controlled?"#ffe66d":"#7dc8e5";ctx.lineWidth=selected?2.2:controlled?1.8:.55;ctx.stroke(path);ctx.restore();hitCountries.push({path,country})}
      if(camera.zoom>3.4&&state.settings?.showMapLabels!==false&&country.economy.gdp>80){const p=toScreen(country.map.lat,country.map.lng);drawLabel(p.x,p.y,country.name,selected||controlled?"#fff":"#c8e6f3",selected?12:9)}
    }}
  function geometryPaths(geometry){
    if(!geometry)return[];
    if(geometry.type==="Point"){
      const [lng,lat]=geometry.coordinates,p=toScreen(lat,lng),r=Math.max(3,2+camera.zoom*.45),path=new Path2D();
      path.arc(p.x,p.y,r,0,Math.PI*2);return[path];
    }
    const polygons=geometry.type==="Polygon"?[geometry.coordinates]:geometry.type==="MultiPolygon"?geometry.coordinates:[];
    const result=[],size=worldSize(),center=centerWorld();
    for(const polygon of polygons){
      const projectedRings=[];let polyMin=Infinity,polyMax=-Infinity;
      for(const ring of polygon){
        const pts=[];let previousX=null;
        for(const coord of ring){
          const p=project(coord[1],coord[0]);let x=p.x;
          if(previousX!==null){while(x-previousX>size/2)x-=size;while(x-previousX<-size/2)x+=size}
          previousX=x;pts.push({x,y:p.y});polyMin=Math.min(polyMin,x);polyMax=Math.max(polyMax,x);
        }
        projectedRings.push(pts);
      }
      const midpoint=(polyMin+polyMax)/2,baseShift=Math.round((center.x-midpoint)/size)*size;
      for(const worldShift of [baseShift-size,baseShift,baseShift+size]){
        const screenMin=width/2+(polyMin+worldShift-center.x),screenMax=width/2+(polyMax+worldShift-center.x);
        if(screenMax<-80||screenMin>width+80)continue;
        const path=new Path2D();
        for(const ring of projectedRings){let started=false;for(const point of ring){const x=width/2+(point.x+worldShift-center.x),y=height/2+(point.y-center.y);if(!started){path.moveTo(x,y);started=true}else path.lineTo(x,y)}path.closePath()}
        result.push(path);
      }
    }
    return result;
  }
  function countryColor(c){const owner=c.annexedBy?state.countries.find(x=>x.id===c.annexedBy)||c:c,layer=state.mapLayer||"political";if(layer==="political")return owner.color||"#4d8fd8";if(layer==="economy")return heat(owner.economy.gdp,1,30000,"#214562","#ffd75f");if(layer==="military")return heat(owner.systems.military,10,100,"#263f54","#ff5d6f");if(layer==="technology")return heat(owner.systems.technology,10,100,"#252d61","#4de4ff");if(layer==="stability")return heat(owner.systems.stability,20,98,"#7b3345","#45d58a");return owner.color}
  function heat(v,min,max,a,b){const t=Math.max(0,Math.min(1,(Math.log1p(v)-Math.log1p(min))/(Math.log1p(max)-Math.log1p(min))));const A=hex(a),B=hex(b);return`rgb(${Math.round(A[0]+(B[0]-A[0])*t)},${Math.round(A[1]+(B[1]-A[1])*t)},${Math.round(A[2]+(B[2]-A[2])*t)})`}
  function hex(h){h=h.replace("#","");return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}

  function drawRegions(){
    if(camera.zoom<3.8)return;
    const countryId=state.selectedCountryId||state.controlledCountryId;
    const country=state.countries.find(c=>c.id===countryId);if(!country)return;
    const regions=window.NEXUS_ECONOMY?.getCountryRegions?.(state,country.id)||(country.id==="ESP"?state.regions:country.strategicRegions)||[];
    if(!regions.length)return;

    if(country.id==="ESP"&&regionGeojson.features?.length){
      for(const feature of regionGeojson.features){
        const region=regions.find(r=>r.id===feature.properties?.regionId);if(!region)continue;
        const selected=region.id===state.selectedRegionId,controlled=(region.controllerId||country.id)===state.controlledCountryId;
        for(const path of geometryPaths(feature.geometry)){
          ctx.save();ctx.fillStyle=selected?"rgba(255,220,82,.35)":controlled?"rgba(55,207,148,.20)":"rgba(45,178,220,.17)";ctx.fill(path);
          ctx.strokeStyle=selected?"#ffe46a":controlled?"#63e8b0":"#63d6f0";ctx.lineWidth=selected?2.5:1.15;ctx.stroke(path);ctx.restore();
          hitRegions.push({path,region,country});
        }
        if(camera.zoom>4.55){const p=toScreen(region.lat,region.lng);drawLabel(p.x,p.y,region.name,selected?"#ffe46a":"#e1f8ff",selected?10:8)}
      }
      return;
    }

    const scale=Math.pow(1.13,camera.zoom-4);
    for(const region of regions){
      const p=toScreen(region.lat,region.lng);if(p.x<-80||p.x>width+80||p.y<-80||p.y>height+80)continue;
      const selected=region.id===state.selectedRegionId,controlled=(region.controllerId||country.id)===state.controlledCountryId;
      const radius=Math.max(14,Math.min(46,12+(region.gdp||country.economy.gdp/regions.length)/100))*scale;
      const path=new Path2D();path.arc(p.x,p.y,radius,0,Math.PI*2);
      ctx.save();ctx.fillStyle=selected?"rgba(255,220,82,.32)":controlled?"rgba(62,220,155,.17)":"rgba(57,184,221,.13)";ctx.fill(path);
      ctx.strokeStyle=selected?"#ffe46a":controlled?"#64e9b0":"#63cae7";ctx.lineWidth=selected?2.4:1.2;ctx.stroke(path);
      ctx.beginPath();ctx.arc(p.x,p.y,3.2,0,Math.PI*2);ctx.fillStyle=selected?"#ffe46a":controlled?"#64e9b0":"#63cae7";ctx.fill();ctx.restore();
      hitRegions.push({path,region,country});
      if(camera.zoom>4.45)drawLabel(p.x,p.y-radius-7,region.name,selected?"#ffe46a":"#d8f4ff",selected?10:8);
    }
  }

  function clockFraction(){const sim=state.simulation||{};let f=Number(sim.clockFraction)||0;if(state.running&&sim.clockAnchor)f+=(Date.now()-sim.clockAnchor)/(10000/Math.max(1,state.speed||1));return Math.max(0,Math.min(.999,f))}
  function curvePoint(p0,p1,p2,t){const u=1-t;return{x:u*u*p0.x+2*u*t*p1.x+t*t*p2.x,y:u*u*p0.y+2*u*t*p1.y+t*t*p2.y}}
  function drawTradeRoutes(){
    const routes=(state.tradeRoutes||[]).filter(r=>r.active!==false);if(!routes.length)return;const focus=new Set([state.controlledCountryId,state.selectedCountryId]);
    for(const route of routes){if(camera.zoom>3.4&&!route.countries.some(id=>focus.has(id)))continue;for(const ship of route.ships||[]){const a=state.countries.find(c=>c.id===ship.from),b=state.countries.find(c=>c.id===ship.to);if(!a||!b)continue;const from=route.points?.[ship.from]||[a.map.lat,a.map.lng],to=route.points?.[ship.to]||[b.map.lat,b.map.lng],p0=toScreen(from[0],from[1]),p2=toScreen(to[0],to[1]),mx=(p0.x+p2.x)/2,my=(p0.y+p2.y)/2-Math.min(90,25+Math.abs(p2.x-p0.x)*.09),p1={x:mx,y:my};ctx.save();ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.quadraticCurveTo(p1.x,p1.y,p2.x,p2.y);ctx.setLineDash([6,7]);ctx.lineDashOffset=-(Date.now()/150)%13;ctx.strokeStyle="rgba(74,218,255,.62)";ctx.lineWidth=1.6;ctx.stroke();ctx.setLineDash([]);const t=Math.max(0,Math.min(1,(ship.progress||0)+(ship.dailyStep||.02)*clockFraction())),p=curvePoint(p0,p1,p2,t);ctx.beginPath();ctx.arc(p.x,p.y,12,0,Math.PI*2);ctx.fillStyle="rgba(3,20,32,.94)";ctx.fill();ctx.strokeStyle="#55dcff";ctx.lineWidth=1.5;ctx.stroke();ctx.font="14px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#fff";ctx.fillText("🚢",p.x,p.y);ctx.restore();const cargo=ship.cargo||{};hitMarkers.push({x:p.x,y:p.y,r:18,html:`<strong>🚢 ${ship.name}</strong><span>${a.flag} ${a.name} → ${b.flag} ${b.name}</span><span>${cargo.icon||"📦"} ${cargo.quantity||0} ${cargo.unit||""} de ${cargo.name||"suministros"}</span><span>Progreso ${(t*100).toFixed(0)}%</span>`})}}
  }

  function drawFacilities(){
    if(camera.zoom<3.5)return;
    const countriesToShow=new Set([state.controlledCountryId,state.selectedCountryId]);
    for(const country of state.countries){
      if(!countriesToShow.has(country.id)&&camera.zoom<5.7)continue;
      const regions=window.NEXUS_ECONOMY?.getCountryRegions?.(state,country.id)||(country.id==="ESP"?state.regions:country.strategicRegions)||[];
      const byId=new Map(regions.map(r=>[r.id,r]));
      let facilities=[];
      if(country.id==="ESP")facilities=state.regions.flatMap(r=>(r.buildings||[]).map(b=>({...b,regionName:r.name,region:r})));
      else facilities=(country.facilities||[]).map(b=>{const r=byId.get(b.regionId);return{...b,regionName:r?.name||country.name,region:r}});
      for(const facility of facilities){
        const base=facility.region||country.map;const p=toScreen(facility.lat??base.lat??country.map.lat,facility.lng??base.lng??country.map.lng);
        if(p.x<-25||p.x>width+25||p.y<-25||p.y>height+25)continue;
        const def=NEXUS_CATALOG.buildings.find(b=>b.id===facility.typeId),family=def?.family||"";
        drawMarker(p.x,p.y,markerEmoji[facility.typeId]||def?.icon||"●",family.includes("Energía")?"#ffd35d":family.includes("Defensa")?"#ff6877":family.includes("Farm")||family.includes("Bio")?"#7de8b4":"#4dd7ff",facility.level||1);
        hitMarkers.push({x:p.x,y:p.y,r:16,html:`<strong>${def?.icon||"🏭"} ${def?.name||facility.typeId}</strong><span>${facility.regionName} · Nivel ${facility.level||1}</span><span>${def?.capacity||"Capacidad estratégica"}</span><span>${(def?.jobs||0).toLocaleString("es-ES")} empleos por nivel</span>`});
      }
    }
  }
  function drawMarker(x,y,glyph,color,badge){ctx.save();ctx.shadowColor="rgba(0,0,0,.7)";ctx.shadowBlur=8;ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.fillStyle="#07131d";ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=color;ctx.lineWidth=1.6;ctx.stroke();ctx.font="10px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#fff";ctx.fillText(glyph,x,y+1);if(badge>1){ctx.beginPath();ctx.arc(x+9,y-9,6,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.font="bold 7px system-ui";ctx.fillStyle="#061019";ctx.fillText(String(badge),x+9,y-9)}ctx.restore()}

  function drawUnits(){
    if(camera.zoom<3.05)return;
    const show=new Set([state.controlledCountryId,state.selectedCountryId]);
    for(const country of state.countries){
      if(!show.has(country.id)&&camera.zoom<5.8)continue;
      for(const unit of country.units||[]){
        if(unit.quantity<=0)continue;
        let lat=unit.lat??country.map.lat,lng=unit.lng??country.map.lng;
        if(unit.movement){const m=unit.movement,t=Math.max(0,Math.min(1,(m.progress||0)+(1/Math.max(1,m.totalDays||1))*clockFraction()));lat=(m.startLat??lat)+((m.endLat??lat)-(m.startLat??lat))*t;let dl=normalizeLng((m.endLng??lng)-(m.startLng??lng));lng=normalizeLng((m.startLng??lng)+dl*t);const a=toScreen(m.startLat??lat,m.startLng??lng),b=toScreen(m.endLat??lat,m.endLng??lng);ctx.save();ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.setLineDash([5,6]);ctx.strokeStyle=m.mode==="attack"?"rgba(255,86,99,.9)":"rgba(85,220,255,.72)";ctx.lineWidth=1.7;ctx.stroke();ctx.restore()}
        const p=toScreen(lat,lng);if(p.x<-30||p.x>width+30||p.y<-30||p.y>height+30)continue;
        const def=state.unitCatalog.find(x=>x.id===unit.typeId),attack=unit.movement?.mode==="attack";
        ctx.save();ctx.beginPath();ctx.roundRect(p.x-17,p.y-13,34,26,6);ctx.fillStyle="rgba(7,18,28,.95)";ctx.fill();ctx.strokeStyle=attack?"#ff5969":country.id===state.controlledCountryId?"#ffe063":"#65d8ff";ctx.lineWidth=1.7;ctx.stroke();ctx.font="bold 12px system-ui";ctx.fillStyle="#fff";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(unitEmoji[unit.typeId]||"◆",p.x-7,p.y);ctx.font="bold 7px system-ui";ctx.fillText(shortQty(unit.quantity),p.x+8,p.y);ctx.restore();
        const region=window.NEXUS_ECONOMY?.getRegion?.(state,country.id,unit.regionId);
        hitMarkers.push({x:p.x,y:p.y,r:19,html:`<strong>${def?.name||unit.typeId}</strong><span>${unit.quantity.toLocaleString("es-ES")} ${def?.unitName||"unidades"}</span><span>${region?.name||"En despliegue"} · Preparación ${(unit.readiness||0).toFixed(0)}%</span><span>${unit.status||"desplegada"}${unit.movement?` · ${unit.movement.daysRemaining} días`:""}</span>`});
      }
    }
  }
  function shortQty(v){if(v>=1e6)return`${(v/1e6).toFixed(1)}M`;if(v>=1000)return`${(v/1000).toFixed(v>=10000?0:1)}k`;return String(v)}

  function drawWars(){
    const now=Date.now();
    for(const battle of state.regionBattles||[]){
      if(battle.resolved||battle.ended)continue;const target=window.NEXUS_ECONOMY?.getRegion?.(state,battle.targetCountryId,battle.regionId||battle.targetRegionId);if(!target)continue;const bp=toScreen(target.lat,target.lng),pulse=12+Math.sin(now/190)*4;
      ctx.save();ctx.beginPath();ctx.arc(bp.x,bp.y,pulse,0,Math.PI*2);ctx.fillStyle="rgba(255,70,80,.16)";ctx.fill();ctx.strokeStyle="#ff5868";ctx.lineWidth=2.2;ctx.stroke();ctx.font="17px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#fff";ctx.fillText("⚔",bp.x,bp.y);ctx.restore();
      hitMarkers.push({x:bp.x,y:bp.y,r:23,html:`<strong>⚔ Batalla por ${target.name}</strong><span>Día ${battle.days||1} · Control ${(battle.controlProgress||battle.progress||0).toFixed(0)}%</span><span>Bajas atacante ${Math.round(battle.attackerLosses||0).toLocaleString("es-ES")} · defensor ${Math.round(battle.defenderLosses||0).toLocaleString("es-ES")}</span>`});
    }
    for(const war of state.wars.filter(w=>!w.ended)){
      const a=state.countries.find(c=>c.id===war.attacker),d=state.countries.find(c=>c.id===war.defender);if(!a||!d)continue;const p1=toScreen(a.map.lat,a.map.lng),p2=toScreen(d.map.lat,d.map.lng),mx=(p1.x+p2.x)/2,my=(p1.y+p2.y)/2-30;
      ctx.save();ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.quadraticCurveTo(mx,my,p2.x,p2.y);ctx.setLineDash([8,7]);ctx.lineDashOffset=-(now/90)%15;ctx.strokeStyle="rgba(255,72,86,.82)";ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);ctx.restore();
    }
  }

  function drawHUD(){ctx.save();ctx.fillStyle="rgba(4,15,24,.82)";ctx.fillRect(10,height-32,310,22);ctx.font="9px system-ui";ctx.fillStyle="#b8d5e4";ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillText(`Zoom ${camera.zoom.toFixed(1)} · ${state.mapBase==="vector"?"Mapa vectorial local":"OpenStreetMap + límites Natural Earth"} · Comunidades y rutas comerciales`,18,height-21);ctx.restore()}
  function drawLabel(x,y,text,color,size){ctx.save();ctx.font=`700 ${size}px system-ui`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.lineWidth=3;ctx.strokeStyle="rgba(2,10,16,.9)";ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore()}

  function hover(e){
    const p=eventPoint(e);const marker=[...hitMarkers].reverse().find(m=>Math.hypot(p.x-m.x,p.y-m.y)<=m.r);if(marker){showTipAt(p.x,p.y,marker.html);canvas.style.cursor="pointer";return}
    const regionHit=[...hitRegions].reverse().find(h=>ctx.isPointInPath(h.path,p.x,p.y));if(regionHit){const r=regionHit.region,c=regionHit.country||state.countries.find(x=>x.id===state.selectedCountryId),resources=window.NEXUS_ECONOMY?.regionResources?.(state,c?.id,r.id)||[],top=resources.slice(0,4).map(x=>`${x.icon} ${x.name} ${Number(x.value||0).toFixed(1)}`).join(" · ");const controller=state.countries.find(x=>x.id===(r.controllerId||c?.id));showTipAt(p.x,p.y,`<strong>🗺️ ${r.name}</strong><span>${c?.flag||""} ${c?.name||""} · Control ${controller?.flag||"🏳️"} ${controller?.name||""}</span><span>${r.capital||"Centro regional"} · ${(r.population||0).toLocaleString("es-ES",{maximumFractionDigits:2})} M hab.</span><span>PIB ${(r.gdp||0).toLocaleString("es-ES")} mil M€ · Industria ${(r.industry||0).toFixed(0)} · Defensa ${(r.defense||0).toFixed(0)}</span><span>${top||"Sin producción registrada"}</span><span>Clic para seleccionar la región</span>`);canvas.style.cursor="pointer";return}
    const hit=[...hitCountries].reverse().find(h=>ctx.isPointInPath(h.path,p.x,p.y));if(hit){const original=hit.country,c=original.annexedBy?state.countries.find(x=>x.id===original.annexedBy)||original:original;showTipAt(p.x,p.y,`<strong>${c.flag} ${original.annexedBy?`${original.name} · integrado en ${c.name}`:c.name}</strong><span>PIB soberano ${c.economy.gdp.toLocaleString("es-ES",{maximumFractionDigits:0})} mil M€ · ${c.economy.population.toLocaleString("es-ES",{maximumFractionDigits:1})} M hab.</span><span>Industria ${c.systems.industry.toFixed(0)} · Tecnología ${c.systems.technology.toFixed(0)} · Militar ${c.systems.military.toFixed(0)}</span><span>${c.id===state.controlledCountryId?"CONTROLADO":"Clic para inspeccionar"}</span>`);canvas.style.cursor="pointer";return}
    hideTip();canvas.style.cursor=dragging?"grabbing":"grab";
  }
  function clickMap(e){
    if(dragging)return;const p=eventPoint(e);const marker=[...hitMarkers].reverse().find(m=>Math.hypot(p.x-m.x,p.y-m.y)<=m.r);if(marker){showTipAt(p.x,p.y,marker.html);return}
    const regionHit=[...hitRegions].reverse().find(h=>ctx.isPointInPath(h.path,p.x,p.y));if(regionHit){callbacks.selectRegion?.(regionHit.country?.id||state.selectedCountryId,regionHit.region.id);return}
    const hit=[...hitCountries].reverse().find(h=>ctx.isPointInPath(h.path,p.x,p.y));if(hit)callbacks.selectCountry?.(hit.country.annexedBy||hit.country.id);
  }
  function eventPoint(e){const rect=canvas.getBoundingClientRect();return{x:e.clientX-rect.left,y:e.clientY-rect.top}}
  function showTipAt(x,y,html){if(!tooltip)return;tooltip.innerHTML=html;tooltip.hidden=false;tooltip.style.left=`${Math.min(width-260,Math.max(8,x+15))}px`;tooltip.style.top=`${Math.min(height-130,Math.max(8,y+15))}px`}
  function hideTip(){if(tooltip)tooltip.hidden=true}


  function geometryBounds(geometry){
    if(!geometry)return null;const coords=[];
    const collect=node=>{if(!Array.isArray(node))return;if(typeof node[0]==="number"&&typeof node[1]==="number")coords.push(node);else for(const child of node)collect(child)};collect(geometry.coordinates);if(!coords.length)return null;
    const lats=coords.map(c=>c[1]),raw=coords.map(c=>normalizeLng(c[0]));let best={span:360,start:-180};const sorted=[...raw].sort((a,b)=>a-b);for(let i=0;i<sorted.length;i++){const a=sorted[i],b=i===sorted.length-1?sorted[0]+360:sorted[i+1],gap=b-a,span=360-gap;if(span<best.span)best={span,start:normalizeLng(b)}}
    const shifted=raw.map(l=>{let x=l;while(x<best.start)x+=360;while(x>=best.start+360)x-=360;return x});const minLng=Math.min(...shifted),maxLng=Math.max(...shifted),mid=normalizeLng((minLng+maxLng)/2);return{lat:(Math.min(...lats)+Math.max(...lats))/2,lng:mid,latSpan:Math.max(...lats)-Math.min(...lats),lngSpan:maxLng-minLng};
  }
  function focusCountry(id){
    const c=state.countries.find(x=>x.id===id);if(!c)return;
    const feature=(geojson.features||[]).find(f=>f.properties?.ISO3===id);let bounds=feature?geometryBounds(feature.geometry):null;
    camera.lat=bounds?.lat??c.map?.lat??0;camera.lng=bounds?.lng??c.map?.lng??0;
    if(bounds){const zLng=Math.log2((width*.72*360)/(TILE_SIZE*Math.max(2,bounds.lngSpan))),zLat=Math.log2((height*.65*170)/(TILE_SIZE*Math.max(1,bounds.latSpan)));camera.zoom=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,Math.min(zLng,zLat)))}
    else camera.zoom=id==="ESP"?5:3.7;
    if(id==="ESP")camera.zoom=Math.max(camera.zoom,4.8);persistCamera();needsRender=true;
  }
  function focusRegion(countryId,regionId){
    if(regionId==null){regionId=countryId;countryId=state.selectedCountryId||state.controlledCountryId}
    const region=window.NEXUS_ECONOMY?.getRegion?.(state,countryId,regionId);if(!region)return;camera.lat=region.lat;camera.lng=region.lng;camera.zoom=countryId==="ESP"?6.4:5.6;persistCamera();needsRender=true;
  }

  return{initialize,render,focusCountry,focusRegion};
})();
