import { useState, useEffect } from 'react';
import { Plus, Building2, Pencil, PowerOff, Eye, Trash2, FileText, X } from 'lucide-react';
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
import { useToast } from '../contexts/ToastContext';

import { EST_VACANT_RATE_PER_SQFT } from '../utils/constants';

// ─── Form ────────────────────────────────────────────────────────────────────
const empty = {
  name: '', address: '', gstin: '',
  total_area: '', leased_area: '', vacant_area: '',
  files: [], attachment_url: null,
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
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length) {
      setForm(f => ({ ...f, files: [...(f.files || []), ...selectedFiles] }));
    }
    e.target.value = null; // reset
  };

  const removeFile = (index) => {
    setForm(f => ({ ...f, files: (f.files || []).filter((_, i) => i !== index) }));
  };

  const removeExistingAttachment = (url) => {
    setForm(f => {
      if (!f.attachment_url) return f;
      const urls = f.attachment_url.split(',').filter(u => u !== url);
      return { ...f, attachment_url: urls.length > 0 ? urls.join(',') : null };
    });
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
          <label className="block text-xs font-semibold text-slate-600 mb-2">Documents (PDF/Images)</label>
          
          {/* Existing uploaded documents */}
          {form.attachment_url && (
            <div className="space-y-2 mb-3">
              {form.attachment_url.split(',').map((url, i) => (
                <div key={i} className="flex items-center justify-between bg-blue-50/50 border border-blue-100 p-2 rounded-lg">
                  <button type="button" onClick={() => onViewAttachment(url)} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline">
                    <FileText className="h-4 w-4" /> Document {i + 1}
                  </button>
                  <button type="button" onClick={() => removeExistingAttachment(url)} className="text-red-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Newly selected files waiting to be uploaded */}
          {form.files && form.files.length > 0 && (
            <div className="space-y-2 mb-3">
              {form.files.map((f, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-slate-700 truncate max-w-[80%]">
                    <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" /> <span className="truncate">{f.name}</span>
                  </div>
                  <button type="button" onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition flex-shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            type="file"
            multiple
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
  const [unitToDelete, setUnitToDelete] = useState(null);
  const [editingRentId, setEditingRentId] = useState(null);
  const [editingRentVal, setEditingRentVal] = useState('');

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

  const handleDeleteUnit = async () => {
    if (!unitToDelete) return;
    try {
      await unitApi.remove(unitToDelete);
      fetchUnits();
      if (onUnitsChange) onUnitsChange();
    } catch (e) {
      console.error(e);
    } finally {
      setUnitToDelete(null);
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

  const handleSaveRent = async (unitId) => {
    try {
      await unitApi.update(unitId, { rent_amount: Number(editingRentVal) || 0 });
      setEditingRentId(null);
      fetchUnits();
      if (onUnitsChange) onUnitsChange();
    } catch (e) {
      console.error('Failed to update rent:', e);
    }
  };

  if (!property) return null;
  
  const sumUnitAreas = units.length ? units.reduce((acc, u) => acc + Number(u.total_area), 0) : 0;
  const dynamicTotalArea = Math.max(sumUnitAreas, Number(property.total_area) || 0);
  const dynamicLeasedArea = units.length ? units.filter(u => u.tenant_id).reduce((acc, u) => acc + Number(u.total_area), 0) : Number(property.leased_area) || 0;
  const dynamicVacantArea = dynamicTotalArea - dynamicLeasedArea;

  const dynamicTotalAmount = units.length ? units.filter(u => u.tenant_id).reduce((acc, u) => acc + Number(u.rent_amount), 0) : property.total_amount;

  return (
    <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="col-span-1 sm:col-span-2 min-w-0">
          <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5">Property Name</p>
          <p className="font-semibold text-slate-900 text-sm truncate" title={property.name}>{property.name}</p>
        </div>
        <div className="col-span-1">
          <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5">Status</p>
          <StatusBadge status="Active" />
        </div>
        <div className="col-span-2 sm:col-span-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5">GSTIN</p>
          <p className="font-medium text-slate-900 text-sm truncate" title={property.gstin}>{property.gstin || '—'}</p>
        </div>
        <div className="col-span-2 sm:col-span-4 min-w-0">
          <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5">Address</p>
          <p className="font-medium text-slate-900 text-sm line-clamp-2">{property.address || '—'}</p>
        </div>
      </div>

      {property.attachment_url && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">Documents</h3>
          </div>
          <div className="p-4 bg-white space-y-2">
            {property.attachment_url.split(',').map((url, i) => (
              <div key={i}>
                <button type="button" onClick={() => onViewAttachment(url)} className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline">
                  <FileText className="h-4 w-4" /> View Document {i + 1}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700">Area Details</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 bg-white">
          <div className="p-2 sm:p-4 border-b border-r sm:border-b-0 sm:border-r border-slate-200">
            <p className="text-[10px] sm:text-xs text-slate-500 mb-1">Total</p>
            <p className="font-medium text-slate-900 text-xs sm:text-base">{dynamicTotalArea ? Number(dynamicTotalArea).toLocaleString('en-IN') : '—'} sft</p>
          </div>
          <div className="p-2 sm:p-4 border-b border-r sm:border-b-0 sm:border-r border-slate-200">
            <p className="text-[10px] sm:text-xs text-emerald-700 font-medium mb-1">Leased</p>
            <p className="font-medium text-slate-900 text-xs sm:text-base">{dynamicLeasedArea ? Number(dynamicLeasedArea).toLocaleString('en-IN') : '—'} sft</p>
          </div>
          <div className="p-2 sm:p-4 border-b sm:border-b-0 sm:border-r border-slate-200">
            <p className="text-[10px] sm:text-xs text-orange-700 font-medium mb-1">Vacant</p>
            <p className="font-medium text-slate-900 text-xs sm:text-base">{dynamicVacantArea ? Number(dynamicVacantArea).toLocaleString('en-IN') : '—'} sft</p>
          </div>
          <div className="p-2 sm:p-4 col-span-1 sm:col-span-1 border-r sm:border-r-0 border-slate-200 bg-orange-50/30">
            <p className="text-[10px] sm:text-xs text-orange-700 font-medium mb-1">Est. Vacant Rent</p>
            <p className="font-bold text-orange-700 text-xs sm:text-base">{dynamicVacantArea ? '₹ ' + (Number(dynamicVacantArea) * EST_VACANT_RATE_PER_SQFT).toLocaleString('en-IN') : '—'}</p>
          </div>
          <div className="p-2 sm:p-4 col-span-2 sm:col-span-1 bg-teal-50/30">
            <p className="text-[10px] sm:text-xs text-teal-700 font-medium mb-1">Rent Earned / Month</p>
            <p className="font-bold text-teal-700 text-sm sm:text-lg">{dynamicTotalAmount ? '₹ ' + Number(dynamicTotalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</p>
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
          <div className="p-3 sm:p-4 border-b border-slate-200 bg-blue-50/50 flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="grid grid-cols-2 sm:flex flex-1 gap-3 w-full">
              <div className="col-span-2 sm:flex-1 w-full sm:w-auto">
                <Input label="Block Name" placeholder="e.g. Block-4" value={unitForm.name} onChange={(e) => setUnitForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="col-span-1 sm:w-24 w-full">
                <Input label="Area (sft)" type="number" value={unitForm.total_area} onChange={(e) => setUnitForm(f => ({ ...f, total_area: e.target.value }))} />
              </div>
              <div className="col-span-1 sm:w-32 w-full">
                <Input label="Est. Rent" type="number" value={unitForm.rent_amount} onChange={(e) => setUnitForm(f => ({ ...f, rent_amount: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 sm:pb-0.5 w-full sm:w-auto">
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
              <thead>
                <tr className="bg-gradient-to-r from-teal-50 to-blue-50/50 border-b border-slate-200">
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Block Name</th>
                  <th className="px-4 py-2 text-right text-[11px] font-semibold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Area (sft)</th>
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tenant</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Rent (₹)</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {units.map(u => (
                  <tr key={u.id} className="hover:bg-blue-50/60 transition-colors">
                    <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-slate-900">{u.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-600 text-right hidden sm:table-cell">{Number(u.total_area).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-center">
                      {u.tenant_id ? (
                        <StatusBadge status="Leased" />
                      ) : (
                        <StatusBadge status="Vacant" />
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
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-600 text-right">
                      {editingRentId === u.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input 
                            type="number" 
                            autoFocus
                            value={editingRentVal} 
                            onChange={e => setEditingRentVal(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveRent(u.id)}
                            onBlur={() => handleSaveRent(u.id)}
                            className="w-24 rounded border border-slate-300 px-2 py-1 text-xs text-right outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2 group cursor-pointer" onClick={() => { setEditingRentId(u.id); setEditingRentVal(u.rent_amount || ''); }}>
                          <span>{u.rent_amount ? '₹ ' + Number(u.rent_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</span>
                          <Pencil className="h-3 w-3 text-slate-400 opacity-60 md:opacity-40 md:group-hover:opacity-100 md:group-hover:text-teal-500 transition-all" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right">
                      <button onClick={() => setUnitToDelete(u.id)} className="text-red-400 hover:text-red-600 text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!unitToDelete} onClose={() => setUnitToDelete(null)} title="Delete Block/Unit" width="max-w-md">
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-600">Are you sure you want to delete this block/unit? This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setUnitToDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteUnit}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Properties() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'view'
  const [vacateModal, setVacateModal] = useState(null); // id of property to vacate
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pinModalFile, setPinModalFile] = useState(null);

  const { data, loading, error, refetch } = useAsync(
    () => propertyApi.getAll({ search: search || undefined }),
    [search]
  );

  const { data: tenantsData } = useAsync(() => tenantApi.getAll({ is_active: true }), []);

  const properties = data?.data ?? [];

  const handleAdd = async (form) => {
    setSaving(true);
    try {
      let newUrls = [];
      if (form.files && form.files.length > 0) {
        for (const file of form.files) {
          const uploadRes = await propertyApi.uploadFile(file);
          if (uploadRes.fileUrl) newUrls.push(uploadRes.fileUrl);
        }
      }
      
      const payload = { ...form };
      delete payload.files;
      
      if (newUrls.length > 0) {
        payload.attachment_url = payload.attachment_url 
          ? [payload.attachment_url, ...newUrls].join(',') 
          : newUrls.join(',');
      }
      
      await propertyApi.create(payload);
      showToast('Property added successfully', 'success');
      setModal(null);
      refetch();
    } catch (e) {
      showToast(e.response?.data?.message || e.message, 'error');
    } finally { setSaving(false); }
  };

  const handleEdit = async (form) => {
    setSaving(true);
    try {
      let newUrls = [];
      if (form.files && form.files.length > 0) {
        for (const file of form.files) {
          const uploadRes = await propertyApi.uploadFile(file);
          if (uploadRes.fileUrl) newUrls.push(uploadRes.fileUrl);
        }
      }

      const payload = { ...form };
      delete payload.files;
      
      if (newUrls.length > 0) {
        payload.attachment_url = payload.attachment_url 
          ? [payload.attachment_url, ...newUrls].join(',') 
          : newUrls.join(',');
      }

      await propertyApi.update(selected.id, payload);
      showToast('Property updated successfully', 'success');
      setModal(null);
      refetch();
    } catch (e) {
      showToast(e.response?.data?.message || e.message, 'error');
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
          <span className="font-semibold text-slate-900">{properties.length} Propert{properties.length !== 1 ? 'ies' : 'y'}</span>
          {search && (
            <span className="ml-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
              Filtered
            </span>
          )}
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

      {pinModalFile && (
        <PinModal filename={pinModalFile} onClose={() => setPinModalFile(null)} />
      )}
    </div>
  );
}