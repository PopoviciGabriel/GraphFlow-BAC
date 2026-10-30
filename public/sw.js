const CACHE_NAME = 'graphflow-bac-v2'

const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    precacheAppShell().then(() => {
      self.skipWaiting()
    }),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname === '/sw.js') return

  event.respondWith(networkFirst(request))
})

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME)
  await cache.addAll(APP_SHELL)

  const index = await matchCached(cache, '/index.html')
  if (!index) return

  const html = await index.text()
  const assets = new Set()
  const attribute = /(?:src|href)=["']([^"']+)["']/g
  for (let match = attribute.exec(html); match !== null; match = attribute.exec(html)) {
    const raw = match[1]
    if (
      !raw ||
      raw.startsWith('data:') ||
      raw.startsWith('#') ||
      raw.startsWith('http:') ||
      raw.startsWith('https:') ||
      raw.startsWith('//')
    ) {
      continue
    }

    const path = new URL(raw, self.location.origin).pathname
    if (path === '/sw.js') continue
    assets.add(path)
  }

  await Promise.all(
    [...assets].map(async (path) => {
      try {
        const response = await fetch(path)
        if (shouldStore(path, response)) await cache.put(path, response.clone())
      } catch {
        // An optional asset must not block installation of the shell.
      }
    }),
  )
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  const path = new URL(request.url).pathname

  try {
    const response = await fetch(request)
    if (shouldStore(path, response)) {
      try {
        await cache.put(path, response.clone())
      } catch {
        // Quota errors still leave the live response usable.
      }
    }
    return response
  } catch {
    const cached = await matchCached(cache, path)
    if (cached) return cached

    if (request.mode === 'navigate') {
      const shell = (await matchCached(cache, '/index.html')) ?? (await matchCached(cache, '/'))
      if (shell) return shell
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}

function matchCached(cache, path) {
  // Static hosts often send `Vary: Origin`. A module or stylesheet request
  // includes Origin, while the precache request does not, so a strict match
  // misses and the offline reload never receives JS or CSS.
  return cache.match(path, { ignoreVary: true })
}

function shouldStore(path, response) {
  if (!response || !response.ok || response.type !== 'basic' || response.redirected) return false
  const contentType = response.headers.get('content-type') ?? ''
  if (isStaticAsset(path) && contentType.includes('text/html')) return false
  return true
}

function isStaticAsset(path) {
  return /\.(?:js|css|svg|webmanifest|png|webp|ico|woff2?)$/.test(path)
}
