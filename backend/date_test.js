const XLSX = require('xlsx');

// Let's create a date 01-Jun-2026
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
  ['Date', 'Month'],
  [new Date('2026-06-01T00:00:00'), new Date('2026-06-01T00:00:00')]
]);
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
const buf = XLSX.write(wb, { type: 'buffer', cellDates: true });

const wb2 = XLSX.read(buf, { type: 'buffer', cellDates: true });
const sheet = wb2.Sheets[wb2.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
console.log(raw[1][0]);
console.log("Local getMonth:", raw[1][0].getMonth(), raw[1][0].getDate());
console.log("UTC getMonth:", raw[1][0].getUTCMonth(), raw[1][0].getUTCDate());
console.log("ISO:", raw[1][0].toISOString());
