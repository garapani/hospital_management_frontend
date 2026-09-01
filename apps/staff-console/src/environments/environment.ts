export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3005/api',
  // Single hardcoded dev tenant until a real tenant-resolution mechanism (subdomain, tenant
  // picker) exists — matches the "demo" tenant created by the backend's dev seed script.
  tenantId: 'demo',
};
