export const dashboardStats = [
  { label: 'Monthly Rent Billed', value: '₹4,85,000', change: '+3 invoices this month', trend: 'up' },
  { label: 'Collected (Current Month)', value: '₹3,20,000', change: '66% collection rate', trend: 'neutral' },
  { label: 'Total Outstanding', value: '₹1,65,000', change: '4 tenants pending', trend: 'down' },
  { label: 'Overdue (>30 days)', value: '₹72,500', change: '2 accounts critical', trend: 'down' },
  { label: 'Occupancy Rate', value: '87.5%', change: '7 of 8 units occupied', trend: 'up' },
  { label: 'Annual Rent Roll', value: '₹58,20,000', change: 'FY 2024-25 projection', trend: 'up' },
];

export const agingData = [
  { bucket: '0–30 days', amount: 92500, count: 3, color: 'bg-emerald-500' },
  { bucket: '31–60 days', amount: 48000, count: 2, color: 'bg-yellow-400' },
  { bucket: '61–90 days', amount: 24500, count: 1, color: 'bg-orange-500' },
  { bucket: '90+ days', amount: 72500, count: 2, color: 'bg-red-600' },
];

export const tenantSummary = [
  {
    id: 'T001', tenant: 'Arjun Mehta', property: 'Prestige Heights – 3B',
    rent: 45000, billed: 45000, collected: 45000, outstanding: 0,
    lastPayment: '2025-06-01', status: 'Paid',
  },
  {
    id: 'T002', tenant: 'Sunita Rao', property: 'Green Palms – A102',
    rent: 28000, billed: 28000, collected: 0, outstanding: 28000,
    lastPayment: '2025-04-30', status: 'Overdue',
  },
  {
    id: 'T003', tenant: 'Vikram Industries', property: 'Cyber Tower – 5F',
    rent: 120000, billed: 120000, collected: 120000, outstanding: 0,
    lastPayment: '2025-06-02', status: 'Paid',
  },
  {
    id: 'T004', tenant: 'Pooja Sharma', property: 'Lakeside Villa – B4',
    rent: 18000, billed: 18000, collected: 9000, outstanding: 9000,
    lastPayment: '2025-05-15', status: 'Partial',
  },
  {
    id: 'T005', tenant: 'Ravi Constructions', property: 'Industrial Plot 12',
    rent: 55000, billed: 55000, collected: 0, outstanding: 55000,
    lastPayment: '2025-03-31', status: 'Overdue',
  },
  {
    id: 'T006', tenant: 'Meena Pillai', property: 'Palm Grove – C201',
    rent: 22000, billed: 22000, collected: 22000, outstanding: 0,
    lastPayment: '2025-06-03', status: 'Paid',
  },
];

export const recentAlerts = [
  {
    id: 'A001', type: 'Agreement Expiry', tenant: 'Sunita Rao',
    property: 'Green Palms – A102', date: '2025-07-15', daysLeft: 44, severity: 'warning',
  },
  {
    id: 'A002', type: 'Rent Escalation Due', tenant: 'Vikram Industries',
    property: 'Cyber Tower – 5F', date: '2025-07-01', daysLeft: 30, severity: 'info',
    note: '8% escalation → ₹1,29,600',
  },
  {
    id: 'A003', type: 'Agreement Expiry', tenant: 'Ravi Constructions',
    property: 'Industrial Plot 12', date: '2025-06-30', daysLeft: 29, severity: 'critical',
  },
  {
    id: 'A004', type: 'Overdue >60 days', tenant: 'Pooja Sharma',
    property: 'Lakeside Villa – B4', date: '2025-04-15', daysLeft: -47, severity: 'critical',
    note: '₹9,000 unpaid since April',
  },
  {
    id: 'A005', type: 'Rent Escalation Due', tenant: 'Meena Pillai',
    property: 'Palm Grove – C201', date: '2025-08-01', daysLeft: 61, severity: 'info',
    note: '5% escalation → ₹23,100',
  },
];

export const upcomingInvoices = [
  { id: 'INV-041', client: 'Arjun Mehta', property: 'Prestige Heights – 3B', invoiceDate: '2025-06-01', dueDate: '2025-06-10', amount: 45000, status: 'Paid' },
  { id: 'INV-042', client: 'Sunita Rao', property: 'Green Palms – A102', invoiceDate: '2025-06-01', dueDate: '2025-06-10', amount: 28000, status: 'Overdue' },
  { id: 'INV-043', client: 'Vikram Industries', property: 'Cyber Tower – 5F', invoiceDate: '2025-06-01', dueDate: '2025-06-07', amount: 120000, status: 'Paid' },
  { id: 'INV-044', client: 'Pooja Sharma', property: 'Lakeside Villa – B4', invoiceDate: '2025-06-01', dueDate: '2025-06-10', amount: 18000, status: 'Partial' },
];

export const renewalsDue = [
  { client: 'Sunita Rao', property: 'Green Palms – A102', endDate: '2025-07-15', currentRent: 28000, escalatedRent: 30240, escalation: '8%' },
  { client: 'Ravi Constructions', property: 'Industrial Plot 12', endDate: '2025-06-30', currentRent: 55000, escalatedRent: 59400, escalation: '8%' },
];