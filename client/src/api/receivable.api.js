import client from './client';

export const receivableApi = {
  getAgingSummary:       (params) => client.get('/receivables/aging',    { params }),
  getOutstandingRegister:(params) => client.get('/receivables/register', { params }),
  getTenantOutstanding:  (name)   => client.get(`/receivables/tenant/${encodeURIComponent(name)}`),
  getOverdueAlerts:      ()       => client.get('/receivables/alerts'),
  getCollectionTrend:    ()       => client.get('/receivables/trend'),
};