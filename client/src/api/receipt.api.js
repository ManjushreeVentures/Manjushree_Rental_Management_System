import client from './client';

export const receiptApi = {
  getAll:    (params) => client.get('/receipts',       { params }),
  getById:   (id)     => client.get(`/receipts/${id}`),
  getStats:  (params) => client.get('/receipts/stats', { params }),
  create:    (data)   => client.post('/receipts', data),
  remove:    (id)     => client.delete(`/receipts/${id}`),
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/receipts/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};