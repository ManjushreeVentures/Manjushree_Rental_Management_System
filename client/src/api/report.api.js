import client from './client';

export const reportApi = {
  getOutstanding:       (params) => client.get('/reports/outstanding',        { params }),
  getCollectionSummary: (params) => client.get('/reports/collection-summary', { params }),
  getAgingDetail:       (params) => client.get('/reports/aging-detail',       { params }),
  getTenantLedger:      (params) => client.get('/reports/tenant-ledger',      { params }),
  getRentRoll:          (params) => client.get('/reports/rent-roll',          { params }),

  // download helpers — direct window href for file download
  downloadOutstanding:      (params) => _download('/reports/outstanding',        { ...params, format: 'xlsx' }),
  downloadCollectionSummary:(params) => _download('/reports/collection-summary', { ...params, format: 'xlsx' }),
  downloadAgingDetail:      (params) => _download('/reports/aging-detail',       { ...params, format: 'xlsx' }),
  downloadTenantLedger:     (params) => _download('/reports/tenant-ledger',      { ...params, format: 'xlsx' }),
  downloadRentRoll:         (params) => _download('/reports/rent-roll',          { ...params, format: 'xlsx' }),
};

async function _download(path, params) {
  try {
    const blob = await client.get(path, {
      params,
      responseType: 'blob'
    });

    const nameMap = {
      '/reports/outstanding': 'Outstanding_Report.xlsx',
      '/reports/collection-summary': 'Collection_Summary.xlsx',
      '/reports/aging-detail': 'Aging_Detail.xlsx',
      '/reports/tenant-ledger': 'Tenant_Ledger.xlsx',
      '/reports/rent-roll': 'Rent_Roll.xlsx',
    };
    const filename = nameMap[path] || 'Report.xlsx';

    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    
    // cleanup
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Download failed:', err);
    throw err;
  }
}