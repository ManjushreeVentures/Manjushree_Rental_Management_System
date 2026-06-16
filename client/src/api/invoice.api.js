import client from './client';

export const invoiceApi = {
  getAll:         (params) => client.get('/invoices',               { params }),
  getById:        (id)     => client.get(`/invoices/${id}`),
  getStats:       (params) => client.get('/invoices/stats',         { params }),
  getBillingMonths:()      => client.get('/invoices/billing-months'),
  create:         (data)   => client.post('/invoices', data),
  update:         (id, data) => client.put(`/invoices/${id}`, data),
  generate:       (data)   => client.post('/invoices/generate', data),
  bulkGenerate:   (data)   => client.post('/invoices/bulk-generate', data),
  sendReminders:  (data)   => client.post('/invoices/send-reminders', data),
  delete:         (id)     => client.delete(`/invoices/${id}`),
};