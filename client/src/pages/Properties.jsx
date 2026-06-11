import { useState, useEffect } from 'react';
import { Plus, Building2, Pencil, PowerOff, Eye } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Table } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import { useAsync } from '../hooks/useAsync';
import { propertyApi } from '../api/property.api';
import { unitApi } from '../api/unit.api';
import { tenantApi } from '../api/tenant.api';
import { formatDate } from '../utils/format';
import PinModal from '../components/PinModal';

// ─── Form ────────────────────────────────────────────────────────────────────
const empty = {
  name: '', address: '', gstin: '',
  total_area: '', leased_area: '', vacant_area: '',
  file: null, attachment_url: null,
  file: null, attachment_url: null,
};

function PropertyForm({ initial = empty, onSubmit, loading, onViewAttachment }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Required';
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      ...form,
      total_area: Number(form.total_area) || 0,
      leased_area: Number(form.leased_area) || 0,
      vacant_area: Number(form.vacant_area) || 0,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setForm(f => ({ ...f, file }));
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Property Name *" value={form.name} onChange={set('name')}
            placeholder="e.g. Prestige Heights" error={errors.name} />
        </div>
        <div className="col-span-2">
          <Input label="Address" value={form.address} onChange={set('address')}
            placeholder="Full address" />
        </div>
        <Input label="GSTIN" value={form.gstin} onChange={set('gstin')} />

        <Input label="Total Area (sft)" type="number" value={form.total_area} onChange={set('total_area')} />
        <Input label="Leased Area (sft)" type="number" value={form.leased_area} onChange={set('leased_area')} />
        <Input label="Vacant Area (sft)" type="number" value={form.vacant_area} onChange={set('vacant_area')} />
        
        <div className="col-span-2 mt-2 border-t border-slate-100 pt-3">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Attachment (PDF/Image)</label>
          {form.attachment_url && !form.file && (
            <div className="mb-2 text-sm text-blue-600">
              <button type="button" onClick={() => onViewAttachment(form.attachment_url)} className="underline hover:text-blue-800">
                View Existing Document
              </button>
            </div>
          )}
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="primary" loading={loading} onClick={handleSubmit}>
          Save Property
        </Button>
      </div>
    </div>
  );
}



// ─── Property Details View ───────────────────────────────────────────────────
function PropertyDetails({ property, onUnitsChange, tenants = [], onViewAttachment }) {
  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [unitForm, setUnitForm] = useState({ name: '', total_area: '', rent_amount: '' });
  const [savingUnit, setSavingUnit] = useState(false);

  const fetchUnits = async () => {
    if (!property) return;
    setLoadingUnits(true);
    try {
      const res = await unitApi.getAll({ property_id: property.id });
      setUnits(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUnits(false);
    }
  };

  // Fetch units on mount
  useEffect(() => {
    fetchUnits();
  }, [property?.id]);

  const handleAddUnit = async () => {
    if (!unitForm.name || !unitForm.total_area) return;
    setSavingUnit(true);
    try {
      await unitApi.create({
        property_id: property.id,
        name: unitForm.name,
        total_area: Number(unitForm.total_area),
        rent_amount: Number(unitForm.rent_amount) || 0
      });
      setUnitForm({ name: '', total_area: '', rent_amount: '' });
      setShowUnitForm(false);
      fetchUnits();
      if (onUnitsChange) onUnitsChange();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingUnit(false);
    }
  };

  const handleDeleteUnit = async (id) => {
    if (!window.confirm('Are you sure you want to delete this unit?')) return;
    try {
      await unitApi.remove(id);
      fetchUnits();
      if (onUnitsChange) onUnitsChange();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTenant = async (unitId, tenantId) => {
    try {
      await unitApi.update(unitId, { tenant_id: tenantId || null });
      fetchUnits();
      if (onUnitsChange) onUnitsChange();
    } catch (e) {
      console.error('Failed to assign tenant:', e);
    }
  };

  if (!property) return null;
  const dynamicTotalArea = units.reduce((acc, u) => acc + Number(u.total_area), 0) || property.total_area;
  const dynamicLeasedArea = units.filter(u => u.tenant_id).reduce((acc, u) => acc + Number(u.total_area), 0) || property.leased_area;
  const dynamicVacantArea = units.filter(u => !u.tenant_id).reduce((acc, u) => acc + Number(u.total_area), 0) || property.vacant_area;

  const dynamicTotalAmount = units.filter(u => u.tenant_id).reduce((acc, u) => acc + Number(u.rent_amount), 0) || property.total_amount;

  return (
    <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] sm:text-xs text-slate-500 mb-1">Property Name</p>
          <p className="font-semibold text-slate-900">{property.name}</p>
        </div>
        <div>
          <p className="text-[11px] sm:text-xs text-slate-500 mb-1">Status</p>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Active</span>
        </div>
        <div className="sm:col-span-2">
          <p className="text-[11px] sm:text-xs text-slate-500 mb-1">Address</p>
          <p className="font-medium text-slate-900 text-sm">{property.address || '—'}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-[11px] sm:text-xs text-slate-500 mb-1">GSTIN</p>
          <p className="font-medium text-slate-900 text-sm">{property.gstin || '—'}</p>
        </div>
      </div>

      {property.attachment_url && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">Documents</h3>
          </div>
          <div className="p-4 bg-white">
            <button type="button" onClick={() => onViewAttachment(property.attachment_url)} className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline">
              View Property Document
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700">Area Details</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 bg-white">
          <div className="p-3 sm:p-4 border-b border-r sm:border-b-0 sm:border-r border-slate-200">
            <p className="text-[10px] sm:text-xs text-slate-500 mb-1">Total</p>
            <p className="font-medium text-slate-900 text-sm sm:text-base">{dynamicTotalArea ? Number(dynamicTotalArea).toLocaleString('en-IN') : '—'} sft</p>
          </div>
          <div className="p-3 sm:p-4 border-b sm:border-b-0 sm:border-r border-slate-200">
            <p className="text-[10px] sm:text-xs text-emerald-700 font-medium mb-1">Leased</p>
            <p className="font-medium text-slate-900 text-sm sm:text-base">{dynamicLeasedArea ? Number(dynamicLeasedArea).toLocaleString('en-IN') : '—'} sft</p>
          </div>
          <div className="p-3 sm:p-4 border-b border-r sm:border-b-0 sm:border-r border-slate-200">
            <p className="text-[10px] sm:text-xs text-orange-700 font-medium mb-1">Vacant</p>
            <p className="font-medium text-slate-900 text-sm sm:text-base">{dynamicVacantArea ? Number(dynamicVacantArea).toLocaleString('en-IN') : '—'} sft</p>
          </div>
          <div className="p-3 sm:p-4 border-b sm:border-b-0 sm:border-r border-slate-200 bg-orange-50/30">
            <p className="text-[10px] sm:text-xs text-orange-700 font-medium mb-1">Est. Vacant Rent</p>
            <p className="font-bold text-orange-700 text-sm sm:text-base">{dynamicVacantArea ? '₹ ' + (Number(dynamicVacantArea) * 21).toLocaleString('en-IN') : '—'}</p>
          </div>
          <div className="p-3 sm:p-4 col-span-2 sm:col-span-1 bg-teal-50/30">
            <p className="text-[10px] sm:text-xs text-teal-700 font-medium mb-1">Rent Earned / Month</p>
            <p className="font-bold text-teal-700 text-base sm:text-lg">{dynamicTotalAmount ? '₹ ' + Number(dynamicTotalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</p>
          </div>
        </div>
      </div>

      {/* Units Breakdown */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-slate-700">Blocks & Units</h3>
          {!showUnitForm && (
            <Button variant="secondary" onClick={() => setShowUnitForm(true)} className="py-1 px-2 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add Block
            </Button>
          )}
        </div>

        {showUnitForm && (
          <div className="p-4 border-b border-slate-200 bg-blue-50/50 flex flex-col sm:flex-row sm:items-end flex-wrap gap-3">
            <div className="flex-1 w-full sm:w-auto">
              <Input label="Block Name" placeholder="e.g. Block-4" value={unitForm.name} onChange={(e) => setUnitForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="w-full sm:w-24">
              <Input label="Area (sft)" type="number" value={unitForm.total_area} onChange={(e) => setUnitForm(f => ({ ...f, total_area: e.target.value }))} />
            </div>
            <div className="w-full sm:w-32">
              <Input label="Est. Rent" type="number" value={unitForm.rent_amount} onChange={(e) => setUnitForm(f => ({ ...f, rent_amount: e.target.value }))} />
            </div>
            <div className="flex gap-2 sm:pb-0.5 mt-2 sm:mt-0 w-full sm:w-auto">
              <Button variant="primary" onClick={handleAddUnit} loading={savingUnit} className="flex-1 sm:flex-none">Save</Button>
              <Button variant="secondary" onClick={() => setShowUnitForm(false)} className="flex-1 sm:flex-none">Cancel</Button>
            </div>
          </div>
        )}

        {loadingUnits ? (
          <div className="p-4 text-center text-sm text-slate-500">Loading blocks...</div>
        ) : units.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">No blocks or units added yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">Block Name</th>
                  <th className="px-4 py-2 text-right text-[11px] font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Area (sft)</th>
                  <th className="px-4 py-2 text-center text-[11px] font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Tenant</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Rent (₹)</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {units.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-slate-900">{u.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-600 text-right hidden sm:table-cell">{Number(u.total_area).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-center">
                      {u.tenant_id ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Leased</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">Vacant</span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600">
                      <select
                        value={u.tenant_id || ''}
                        onChange={(e) => handleUpdateTenant(u.id, e.target.value)}
                        className="rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500 max-w-[150px]"
                      >
                        <option value="">-- Vacant --</option>
                        {tenants.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 text-right">{u.rent_amount ? '₹ ' + Number(u.rent_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-right">
                      <button onClick={() => handleDeleteUnit(u.id)} className="text-red-400 hover:text-red-600 text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Properties() {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'view'
  const [vacateModal, setVacateModal] = useState(null); // id of property to vacate
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [pinModalFile, setPinModalFile] = useState(null);

  const { data, loading, error, refetch } = useAsync(
    () => propertyApi.getAll({ search: search || undefined }),
    [search]
  );

  const { data: tenantsData } = useAsync(() => tenantApi.getAll({ is_active: true }), []);

  const properties = data?.data ?? [];

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async (form) => {
    setSaving(true);
    try {
      let attachment_url = null;
      if (form.file) {
        const uploadRes = await propertyApi.uploadFile(form.file);
        attachment_url = uploadRes.fileUrl;
      }
      
      const payload = { ...form };
      delete payload.file;
      if (attachment_url) payload.attachment_url = attachment_url;
      
      await propertyApi.create(payload);
      showToast('Property added');
      setModal(null);
      refetch();
    } catch (e) {
      showToast(e.message, 'error');
    } finally { setSaving(false); }
  };

  const handleEdit = async (form) => {
    setSaving(true);
    try {
      let attachment_url = form.attachment_url;
      if (form.file) {
        const uploadRes = await propertyApi.uploadFile(form.file);
        attachment_url = uploadRes.fileUrl;
      }

      const payload = { ...form };
      delete payload.file;
      payload.attachment_url = attachment_url;

      await propertyApi.update(selected.id, payload);
      showToast('Property updated');
      setModal(null);
      refetch();
    } catch (e) {
      showToast(e.message, 'error');
    } finally { setSaving(false); }
  };



  const columns = [
    {
      key: 'name', label: 'Property Name',
      render: (r) => (
        <button
          onClick={() => { setSelected(r); setModal('view'); }}
          className="font-semibold text-blue-600 hover:text-blue-800 transition-colors text-left"
        >
          {r.name}
        </button>
      ),
    },
    {
      key: 'address', label: 'Address', className: 'hidden md:table-cell',
      render: (r) => <span className="text-slate-600 text-xs">{r.address || '—'}</span>
    },
    {
      key: 'total_area', label: 'Total Area (sft)', className: 'hidden md:table-cell text-right',
      render: (r) => <span className="font-medium text-slate-700">{r.total_area ? Number(r.total_area).toLocaleString('en-IN') : '—'}</span>
    },
    {
      key: 'leased_area', label: 'Leased Area (sft)', className: 'hidden md:table-cell text-right',
      render: (r) => <span className="font-medium text-emerald-700">{r.leased_area ? Number(r.leased_area).toLocaleString('en-IN') : '—'}</span>
    },
    {
      key: 'vacant_area', label: 'Vacant Area (sft)', className: 'hidden md:table-cell text-right',
      render: (r) => <span className="font-medium text-orange-700">{r.vacant_area ? Number(r.vacant_area).toLocaleString('en-IN') : '—'}</span>
    },
    {
      key: 'rent_earned', label: 'Rent Earned / Month', className: 'hidden lg:table-cell text-right',
      render: (r) => <span className="font-bold text-teal-700">{r.total_amount ? '₹ ' + Number(r.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</span>
    },

    {
      key: 'actions', label: '',
      render: (r) => (
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => { setSelected(r); setModal('edit'); }}
            title="Edit"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition">
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const totalArea = properties.reduce((sum, p) => sum + (Number(p.total_area) || 0), 0);
  const totalLeasedArea = properties.reduce((sum, p) => sum + (Number(p.leased_area) || 0), 0);
  const totalVacantArea = properties.reduce((sum, p) => sum + (Number(p.vacant_area) || 0), 0);
  const totalRentEarned = properties.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);

  const tableFooter = properties.length > 0 ? (
    <tr>
      <td className="px-4 py-3 text-left font-bold">Total</td>
      <td className="px-4 py-3 hidden md:table-cell"></td>
      <td className="px-4 py-3 hidden md:table-cell text-right font-bold">{totalArea ? totalArea.toLocaleString('en-IN') : '—'}</td>
      <td className="px-4 py-3 hidden md:table-cell text-right text-emerald-700 font-bold">{totalLeasedArea ? totalLeasedArea.toLocaleString('en-IN') : '—'}</td>
      <td className="px-4 py-3 hidden md:table-cell text-right text-orange-700 font-bold">{totalVacantArea ? totalVacantArea.toLocaleString('en-IN') : '—'}</td>
      <td className="px-4 py-3 hidden lg:table-cell text-right text-teal-700 font-bold">₹ {totalRentEarned ? totalRentEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</td>
      <td className="px-4 py-3"></td>
    </tr>
  ) : null;

  return (
    <div>
      <PageHeader
        title="Properties"
        description="Manage all properties, areas, and occupancy"
        actions={
          <Button onClick={() => setModal('add')}>
            <Plus className="h-4 w-4" /> Add Property
          </Button>
        }
      />

      {/* Search */}
      <div className="mb-4">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm
            outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <Building2 className="h-5 w-5 text-slate-400" />
          <span className="font-semibold text-slate-900">
            {properties.length} Propert{properties.length !== 1 ? 'ies' : 'y'}
          </span>
        </div>
        {error
          ? <p className="px-5 py-10 text-center text-sm text-red-500">{error}</p>
          : <Table columns={columns} data={properties} loading={loading} footer={tableFooter} />
        }
      </div>

      {/* Add Modal */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Add Property" width="max-w-2xl">
        <PropertyForm onSubmit={handleAdd} loading={saving} onViewAttachment={setPinModalFile} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="Edit Property" width="max-w-2xl">
        {selected && (
          <PropertyForm
            initial={{
              name: selected.name || '',
              address: selected.address || '',
              gstin: selected.gstin || '',
              total_area: selected.total_area || '',
              leased_area: selected.leased_area || '',
              vacant_area: selected.vacant_area || '',
              attachment_url: selected.attachment_url || null,
            }}
            onSubmit={handleEdit}
            loading={saving}
            onViewAttachment={setPinModalFile}
          />
        )}
      </Modal>

      {/* View Details Modal */}
      <Modal open={modal === 'view'} onClose={() => setModal(null)} title="Property Details" width="max-w-4xl">
        <PropertyDetails property={selected} onUnitsChange={refetch} tenants={tenantsData?.data} onViewAttachment={setPinModalFile} />
      </Modal>



      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-lg
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {pinModalFile && (
        <PinModal filename={pinModalFile} onClose={() => setPinModalFile(null)} />
      )}
    </div>
  );
}