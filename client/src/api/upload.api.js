import client from './client';

export const uploadApi = {
  uploadExcel: (file) => {
    const form = new FormData();
    form.append('file', file);
    return client.post('/upload/excel', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getHistory: () => client.get('/upload/history'),
  verifyPin: (pin, filename) => client.post('/upload/verify-pin', { pin, filename }),
};