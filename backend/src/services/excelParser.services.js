import * as XLSX from 'xlsx';

// ================== UPDATED COLUMN MAPPING ==================
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

// ================== HELPER FUNCTIONS ==================
function parseExcelDate(value) {
  if (!value) return null;

  if (typeof value === 'number') {
    // Excel epoch is Jan 1, 1900. Jan 1, 1970 is 25569.
    const msSince1970 = (value - 25569) * 86400 * 1000;
    // Math.round to handle any floating point imprecision
    const date = new Date(Math.round(msSince1970));
    return date.toISOString().split('T')[0];
  }

  const strValue = String(value).trim();
  const date = new Date(strValue);
  if (isNaN(date.getTime())) return null;
  
  // For strings, parsing as local time is safest, then extract local components
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatBillingMonth(value) {
  if (!value) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  if (typeof value === 'number') {
    const msSince1970 = (value - 25569) * 86400 * 1000;
    const date = new Date(Math.round(msSince1970));
    return `${months[date.getUTCMonth()]}-${date.getUTCFullYear()}`;
  }

  const strValue = String(value).trim();
  
  // If it's already in format MMM-YYYY (e.g. Jun-2026), just return it
  if (/^[A-Z][a-z]{2}-\d{4}$/.test(strValue)) {
    return strValue;
  }

  const dateObj = new Date(strValue);
  if (!isNaN(dateObj.getTime()) && strValue.length > 15) {
    // Use local methods for string parsed dates
    return `${months[dateObj.getMonth()]}-${dateObj.getFullYear()}`;
  }
  
  return strValue;
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '');
}

const NORMALIZED_COL_MAP = Object.fromEntries(
  Object.entries(COL_MAP).map(([excelCol, dbField]) => [normalizeHeader(excelCol), { excelCol, dbField }])
);

function isEmpty(value) {
  return value === '' || value === null || value === undefined;
}

function parseNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = String(value).trim().replace(/[^0-9.-]+/g, '');
  if (cleaned === '' || cleaned === '.' || cleaned === '-' || cleaned === '-.') return null;
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStatus(status) {
  if (!status) return 'Pending';
  const s = String(status).toLowerCase().trim();
  if (['paid', 'cleared'].includes(s)) return 'Paid';
  return 'Pending';
}

function normalizeAgingBucket(bucket) {
  if (!bucket) return 'Current';
  const b = String(bucket).trim();
  if (b.toLowerCase() === 'due') return 'Current';
  return b;
}

// ================== MAIN PARSER ==================
export function parseExcelBuffer(buffer) {
  try {
    // Do NOT use cellDates: true! It creates timezone-shifted Date objects.
    // Reading dates as raw numbers guarantees 100% precision.
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!raw.length) return { rows: [], skipped: [] };

    const headerRow = raw[0].map(normalizeHeader);
    
    console.log('📋 RAW HEADERS FROM EXCEL:', raw[0]);
    console.log('📋 NORMALIZED HEADERS:', headerRow);
    
    const headerMap = {};
    headerRow.forEach((header, index) => {
      if (NORMALIZED_COL_MAP[header]) {
        headerMap[NORMALIZED_COL_MAP[header].dbField] = index;
        console.log(`✓ Matched: "${raw[0][index]}" (normalized: "${header}") -> ${NORMALIZED_COL_MAP[header].dbField}`);
      }
    });

    console.log('📊 HEADER MAP:', headerMap);

    const missingHeaders = Object.entries(COL_MAP)
      .filter(([, dbField]) => headerMap[dbField] === undefined)
      .map(([excelCol]) => excelCol);

    if (missingHeaders.length) {
      console.log('❌ MISSING HEADERS:', missingHeaders);
      throw new Error(`Missing required Excel headers: ${missingHeaders.join(', ')}`);
    }

    console.log(`📊 Excel Parser: ${raw.length - 1} data rows found`);

    const rows = [];
    const skipped = [];

    raw.slice(1).forEach((row, idx) => {
      const mapped = {};
      for (const [, { dbField }] of Object.entries(NORMALIZED_COL_MAP)) {
        const colIndex = headerMap[dbField];
        mapped[dbField] = row[colIndex] ?? '';
      }

      const rowNumber = idx + 2;
      
      if (idx < 1) {
        console.log(`🔍 ROW ${rowNumber} RAW DATA:`, row);
        console.log(`🔍 ROW ${rowNumber} MAPPED DATA:`, mapped);
      }
      
      const billAmountRaw = mapped.bill_amount;
      const billAmount = parseNumber(billAmountRaw);

      if (isEmpty(mapped.property_name) || isEmpty(mapped.tenant_name) || isEmpty(billAmountRaw)) {
        console.log(`⏭️  Row ${rowNumber} SKIPPED: property="${mapped.property_name}", tenant="${mapped.tenant_name}", billAmountRaw="${billAmountRaw}"`);
        skipped.push({
          row: rowNumber,
          reason: 'Missing required fields',
        });
        return;
      }

      if (billAmount === null) {
        console.log(`⏭️  Row ${rowNumber} SKIPPED: Invalid bill amount "${billAmountRaw}"`);
        skipped.push({
          row: rowNumber,
          reason: 'Invalid bill amount',
        });
        return;
      }

      if (idx < 3) {
        console.log(`✅ Row ${rowNumber}:`, {
          property: mapped.property_name,
          tenant: mapped.tenant_name,
          amount: billAmount,
        });
      }

      const parsedCategory = String(mapped.category || 'Rent').trim();
      const catLower = parsedCategory.toLowerCase();
      const creditDays = (catLower.includes('power') || catLower.includes('water')) ? 7 : 31;
      
      const parsedBillDate = parseExcelDate(mapped.bill_date) || new Date().toISOString().split('T')[0];
      const computedDueDate = new Date(parsedBillDate);
      computedDueDate.setUTCDate(computedDueDate.getUTCDate() + creditDays);
      
      let finalDueDate = computedDueDate.toISOString().split('T')[0];
      if (mapped.due_date) {
        finalDueDate = parseExcelDate(mapped.due_date) || finalDueDate;
      }

      rows.push({
        property_name: String(mapped.property_name).trim(),
        tenant_name: String(mapped.tenant_name).trim(),
        category: parsedCategory,
        bill_date: parsedBillDate,
        bill_amount: billAmount,
        billing_month: formatBillingMonth(mapped.billing_month),
        credit_terms_days: creditDays,
        due_date: finalDueDate,
        status: normalizeStatus(mapped.status),
        amount_collected: parseNumber(mapped.amount_collected) || 0,
        outstanding_balance: parseNumber(mapped.outstanding_balance) || 0,
        overdue_by_days: parseInt(mapped.overdue_by_days) || 0,
        aging_bucket: normalizeAgingBucket(mapped.aging_bucket),
      });
    });

    console.log(`✅ Parser done: ${rows.length} valid rows, ${skipped.length} skipped`);
    return { rows, skipped };

  } catch (error) {
    console.error('❌ Parser Error:', error.message);
    throw error;
  }
}