// Placeholder until a production Gateway origin is decided (no deploy target exists yet for
// this app) — assumes the Gateway is reverse-proxied under the same origin as the SPA.
export const environment = {
  production: true,
  apiBaseUrl: '/api',
  // Placeholder, same caveat as apiBaseUrl above — no real tenant-resolution mechanism exists yet.
  tenantId: 'demo',
};
