import client from './client';

export const propertyApi = {
  getAll:  (params) => client.get('/properties', { params }),
  getById: (id)     => client.get(`/properties/${id}`),
  create:  (data)   => client.post('/properties', data),
  update:  (id, data) => client.put(`/properties/${id}`, data),
  remove:  (id, vacated_date) => client.delete(`/properties/${id}`, { data: { vacated_date } }),
  uploadFile: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return client.post('/properties/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};