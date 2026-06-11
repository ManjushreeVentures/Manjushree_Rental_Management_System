import PageHeader from '../components/ui/PageHeader';

export default function Settings() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure invoice dates, escalation rules, and email templates"
      />

      <div className="max-w-2xl space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Invoice Settings</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Default Invoice Day</label>
              <select className="mt-1 w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {[1, 5, 10, 15].map((d) => (
                  <option key={d} value={d}>{d}th of every month</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Reminder Days Before Due</label>
              <input
                type="number"
                defaultValue={7}
                className="mt-1 w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Escalation Rules</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Default Escalation %</label>
              <input
                type="number"
                defaultValue={5}
                className="mt-1 w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Escalation Formula</label>
              <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option>currentRent + (currentRent × %)</option>
                <option>CAM + (rent × %)</option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Email (SMTP)</h2>
          <p className="mt-1 text-sm text-slate-500">Configure in backend .env — coming in next phase</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <input placeholder="SMTP Host" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" disabled />
            <input placeholder="From Email" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" disabled />
          </div>
        </section>

        <button
          type="button"
          className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
