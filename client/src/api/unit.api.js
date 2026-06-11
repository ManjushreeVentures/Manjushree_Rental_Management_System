import client from './client';

export const unitApi = {
  getAll: (params) => client.get('/units', { params }),
  create: (data) => client.post('/units', data),
  update: (id, data) => client.put(`/units/${id}`, data),
  remove: (id) => client.delete(`/units/${id}`),
};
