import client from './client';

export const tenantApi = {
  getAll: (params) => client.get('/tenants', { params }),
  getById: (id) => client.get(`/tenants/${id}`),
  create: (data) => client.post('/tenants', data),
  update: (id, data) => client.put(`/tenants/${id}`, data),
  remove: (id) => client.delete(`/tenants/${id}`),
  getCategories: (id) => client.get(`/tenants/${id}/categories`),
  upsertCategories: (id, data) => client.post(`/tenants/${id}/categories`, data),
  getEscalationTracker: () => client.get('/tenants/escalation'),
  applyEscalation: (id) => client.post(`/tenants/${id}/apply-escalation`),
  uploadFile: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return client.post('/tenants/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};