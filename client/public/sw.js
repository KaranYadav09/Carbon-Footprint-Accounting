self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
  // Empty fetch listener satisfies standard PWA install criteria
});
