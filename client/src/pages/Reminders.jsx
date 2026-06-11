import { Bell, Clock, Mail } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';

const reminderRules = [
  { id: 1, name: 'Invoice Due Reminder', trigger: '7 days before due date', channel: 'Email', status: 'active' },
  { id: 2, name: 'Overdue Payment Alert', trigger: '1 day after due date', channel: 'Email + Dashboard', status: 'active' },
  { id: 3, name: 'Agreement Renewal Notice', trigger: '30 days before end date', channel: 'Email', status: 'active' },
  { id: 4, name: 'Monthly Invoice Auto-send', trigger: 'On invoice date (5th)', channel: 'Email + PDF', status: 'active' },
];

const recentReminders = [
  { client: 'Sunrise Foods', type: 'Overdue Payment', sentAt: '2026-05-20 09:00', status: 'sent' },
  { client: 'TechNova Pvt Ltd', type: 'Due in 7 days', sentAt: '2026-05-18 09:00', status: 'sent' },
  { client: 'Metro Logistics', type: 'Renewal in 30 days', sentAt: '2026-05-15 09:00', status: 'sent' },
  { client: 'Acme Corp', type: 'Invoice Generated', sentAt: '2026-05-05 08:30', status: 'scheduled' },
];

export default function Reminders() {
  return (
    <div>
      <PageHeader
        title="Reminders"
        description="Automated notifications for invoices, payments, and renewals"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <Bell className="h-5 w-5 text-brand-600" />
            <h2 className="font-semibold text-slate-900">Automation Rules</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {reminderRules.map((rule) => (
              <div key={rule.id} className="px-5 py-4">
                <div className="flex items-start justify-between">
                  <p className="font-medium text-slate-900">{rule.name}</p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    {rule.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{rule.trigger}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                  <Mail className="h-3.5 w-3.5" />
                  {rule.channel}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <Clock className="h-5 w-5 text-brand-600" />
            <h2 className="font-semibold text-slate-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentReminders.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-slate-900">{r.client}</p>
                  <p className="text-sm text-slate-500">{r.type}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>{r.sentAt}</p>
                  <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-800">
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
