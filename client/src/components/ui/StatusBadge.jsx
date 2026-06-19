const styles = {
  Paid:     'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Pending:  'bg-yellow-50  text-yellow-700  ring-yellow-200',
  Partial:  'bg-blue-50    text-blue-700    ring-blue-200',
  Overdue:  'bg-red-50     text-red-700     ring-red-200',
  Active:   'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Inactive: 'bg-slate-100  text-slate-500   ring-slate-200',
  Leased:   'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Vacant:   'bg-orange-50  text-orange-700  ring-orange-200',
  'Expiring Soon': 'bg-orange-50 text-orange-700 ring-orange-200',
  Expired:  'bg-red-50 text-red-700 ring-red-200',
  'No Lease': 'bg-slate-100 text-slate-500 ring-slate-200',
  'Due Soon': 'bg-orange-100 text-orange-700 ring-orange-200',
  Upcoming: 'bg-blue-50 text-blue-600 ring-blue-200',
  Applied:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'No Escalation': 'bg-slate-100 text-slate-500 ring-slate-200',
};

export default function StatusBadge({ status, icon: Icon, sublabel }) {
  const badgeClass = styles[status] ?? 'bg-slate-100 text-slate-600 ring-slate-200';
  
  const badge = (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeClass}`}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {status}
    </span>
  );

  if (!sublabel) return badge;

  return (
    <div className="flex flex-col gap-1 items-start">
      {badge}
      <span className="text-xs text-slate-400 font-medium">{sublabel}</span>
    </div>
  );
}