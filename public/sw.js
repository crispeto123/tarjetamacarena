const CACHE='macarena-shell-v101';
const FILES=['/','/app.js','/scoring.js','/offline.js','/styles.css','/manifest.webmanifest','/icon.svg','/tournament-logo.jpg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('macarena-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/'))return;if(u.pathname==='/tournament-logo.jpg'){event.respondWith(caches.open(CACHE).then(async cache=>{try{const response=await fetch(event.request);if(response.ok)await cache.put(u.pathname,response.clone());return response;}catch{return cache.match(u.pathname);}}));return;}if(FILES.includes(u.pathname))event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(u.pathname))||fetch(event.request)));});
// Mobile browsers may suspend the app. Synchronization resumes on reopening;
// no API response or session credential is stored in the shell cache.




