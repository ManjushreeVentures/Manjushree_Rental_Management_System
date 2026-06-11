const styles = {
  Paid:     'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Pending:  'bg-yellow-50  text-yellow-700  ring-yellow-200',
  Partial:  'bg-blue-50    text-blue-700    ring-blue-200',
  Overdue:  'bg-red-50     text-red-700     ring-red-200',
  Active:   'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Inactive: 'bg-slate-100  text-slate-500   ring-slate-200',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
      {status}
    </span>
  );
}