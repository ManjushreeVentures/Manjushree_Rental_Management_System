import client from './client';

export const dashboardApi = {
  getFull:         () => client.get('/dashboard'),
  getKPIs:         () => client.get('/dashboard/kpis'),
  getAging:        () => client.get('/dashboard/aging'),
  getTenants:      () => client.get('/dashboard/tenants'),
  getAlerts:       () => client.get('/dashboard/alerts'),
  getActivity:     () => client.get('/dashboard/activity'),
};