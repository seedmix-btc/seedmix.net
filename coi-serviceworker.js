// GitHub Pages cannot set response headers, but the threaded Emscripten build
// needs SharedArrayBuffer, which browsers only expose to cross-origin isolated
// documents. This worker re-serves every response with the COOP/COEP headers
// that enable isolation. Registration and the one-time reload live in index.html.

const COEP = 'require-corp';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only same-origin cache-only lookups can be reconstructed.
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') {
    return;
  }

  event.respondWith(
    (async () => {
      let response;
      try {
        response = await fetch(request);
      } catch (error) {
        // Let the browser report the network failure instead of masking it.
        throw error;
      }

      // Opaque responses expose neither headers nor a readable body.
      if (response.type === 'opaque' || response.type === 'opaqueredirect' || response.status === 0) {
        return response;
      }

      const headers = new Headers(response.headers);
      headers.set('Cross-Origin-Opener-Policy', 'same-origin');
      headers.set('Cross-Origin-Embedder-Policy', COEP);
      headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
      // The streamed body is already decoded, so the original encoding
      // metadata would be wrong (and would break strict decoders).
      headers.delete('content-encoding');
      headers.delete('content-length');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    })()
  );
});
