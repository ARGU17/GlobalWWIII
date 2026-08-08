"use strict";

const CACHE_VERSION="nexus-global-v6.0.0-r5";
const CORE_ASSETS=[
  "./",
  "./index.html",
  "./404.html",
  "./.nojekyll",
  "./css/styles.css",
  "./assets/vendor/maplibre-gl/5.24.0/maplibre-gl.css",
  "./assets/vendor/maplibre-gl/5.24.0/maplibre-gl.js",
  "./assets/vendor/deck.gl/9.1.14/deck.gl.min.js",
  "./js/polyfills.js",
  "./js/auth.js",
  "./compat/legacy-v52.bundle.js",
  "./core/entry.mjs",
  "./assets/maps/v6/offline_fallback_land.geojson",
  "./assets/maps/v6/ne_110m_admin_0_countries.geojson"
];

self.addEventListener("install",event=>{
  event.waitUntil((async()=>{const cache=await caches.open(CACHE_VERSION);await Promise.all(CORE_ASSETS.map(async asset=>{try{await cache.add(new Request(asset,{cache:"reload"}))}catch(_){}}));await self.skipWaiting()})());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith("nexus-global-")&&key!==CACHE_VERSION)await caches.delete(key);await self.clients.claim()})());
});

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET"||request.headers.has("range"))return;
  const url=new URL(request.url);if(url.origin!==self.location.origin)return;
  if(request.mode==="navigate"){
    event.respondWith((async()=>{const cache=await caches.open(CACHE_VERSION);try{const response=await fetch(request);if(response.ok)await cache.put("./index.html",response.clone());return response}catch(_){return(await cache.match("./index.html"))||(await cache.match("./"))||Response.error()}})());
    return;
  }
  event.respondWith((async()=>{const cache=await caches.open(CACHE_VERSION),cached=await cache.match(request,{ignoreSearch:true});if(cached)return cached;try{const response=await fetch(request);if(response.ok&&response.type!=="opaque")await cache.put(request,response.clone());return response}catch(_){return Response.error()}})());
});

self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting()});
