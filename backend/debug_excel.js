import XLSX from 'xlsx';

const COL_MAP = {
  'Location': 'property_name',
  'Tenant Name': 'tenant_name',
  'Category of Service': 'category',
  'Bill Date': 'bill_date',
  'Bill Amount': 'bill_amount',
  'Billing Month': 'billing_month',
  'Credit Terms (Days)': 'credit_terms_days',
  'Due By': 'due_date',
  'Outstanding Status': 'status',
  'Amount Collected': 'amount_collected',
  'Outstanding Balance': 'outstanding_balance',
  'Overdue By Days': 'overdue_by_days',
  'Aging Bucket': 'aging_bucket',
};

function normalizeHeader(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '');
}

const NORMALIZED_COL_MAP = Object.fromEntries(
  Object.entries(COL_MAP).map(([excelCol, dbField]) => [normalizeHeader(excelCol), { excelCol, dbField }])
);

function parseNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = String(value).trim().replace(/[^0-9.-]+/g, '');
  if (cleaned === '' || cleaned === '.' || cleaned === '-' || cleaned === '-.') return null;
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

try {
  // Try reading the user's Excel file
  // Assumes the file is in the same directory or you can change the path
  const files = ['data.xlsx', 'invoices.xlsx', 'Rental_Data.xlsx', '../Rental_Data.xlsx', 'test.xlsx'];
  let workbook;
  let foundFile = '';
  
  for (const f of files) {
    try {
      workbook = XLSX.readFile(f);
      foundFile = f;
      break;
    } catch(e) {}
  }

  if (!workbook) {
    console.log("Could not find the excel file to debug. Please rename your excel file to 'test.xlsx' and put it in the backend folder, then run this again.");
    process.exit(1);
  }

  console.log(`✅ Reading from ${foundFile}`);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const headers = raw[0].map(h => normalizeHeader(h));
  console.log("Normalized Headers from your Excel:");
  console.log(headers);

  const headerMap = {};
  headers.forEach((h, idx) => {
    if (NORMALIZED_COL_MAP[h]) {
      headerMap[NORMALIZED_COL_MAP[h].dbField] = idx;
    } else {
      console.log(`⚠️ Unrecognized column header: "${h}"`);
    }
  });

  console.log("\nMapped Columns:");
  console.log(headerMap);

  // Look at the first data row
  if (raw.length > 1) {
    const row = raw[1];
    console.log("\nFirst Data Row (Raw):", row);
    
    const mapped = {};
    for (const [, { dbField }] of Object.entries(NORMALIZED_COL_MAP)) {
      const colIndex = headerMap[dbField];
      mapped[dbField] = row[colIndex] ?? '';
    }
    console.log("\nMapped Data:", mapped);
    
    console.log("\nParsed Amounts:");
    console.log("Bill Amount:", parseNumber(mapped.bill_amount));
    console.log("Amount Collected:", parseNumber(mapped.amount_collected));
    console.log("Outstanding Balance:", parseNumber(mapped.outstanding_balance));
  }
} catch (err) {
  console.error("Error:", err);
}
