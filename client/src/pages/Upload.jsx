import { useState, useRef } from 'react';
import {
  UploadCloud, FileSpreadsheet, CheckCircle2,
  XCircle, AlertTriangle, Clock, RefreshCw
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import { useAsync } from '../hooks/useAsync';
import { uploadApi } from '../api/upload.api';
import { formatDate } from '../utils/format';

// ─── Status badge for upload history ─────────────────────────────────────────
const uploadStatusStyles = {
  done: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: CheckCircle2 },
  failed: { cls: 'bg-red-50 text-red-700 ring-red-200', icon: XCircle },
  processing: { cls: 'bg-blue-50 text-blue-700 ring-blue-200', icon: RefreshCw },
};

function UploadStatusBadge({ status }) {
  const cfg = uploadStatusStyles[status] ?? uploadStatusStyles.processing;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5
      text-xs font-medium ring-1 ring-inset ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

// ─── Drop zone ────────────────────────────────────────────────────────────────
function DropZone({ onFile, disabled }) {
  const inputRef = useRef();
  const [drag, setDrag] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current.click()}
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2
        border-dashed px-8 py-14 text-center transition cursor-pointer
        ${drag ? 'border-blue-400 bg-blue-50' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50'
          : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/40'}`}
    >
      <UploadCloud className={`h-10 w-10 ${drag ? 'text-blue-500' : 'text-slate-400'}`} />
      <div>
        <p className="font-medium text-slate-700">Drop your Excel file here</p>
        <p className="text-sm text-slate-400 mt-1">or click to browse — .xlsx / .xls, max 10MB</p>
      </div>
      <input ref={inputRef} type="file" accept=".xlsx,.xls"
        className="hidden" onChange={(e) => onFile(e.target.files[0])} />
    </div>
  );
}

// ─── Result panel ─────────────────────────────────────────────────────────────
function UploadResult({ result }) {
  if (!result) return null;
  const { success, message, data } = result;

  return (
    <div className={`rounded-xl border p-5 ${success ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
      }`}>
      <div className="flex items-center gap-2 mb-3">
        {success
          ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          : <XCircle className="h-5 w-5 text-red-500" />}
        <p className={`font-semibold ${success ? 'text-emerald-800' : 'text-red-700'}`}>
          {message}
        </p>
      </div>

      {success && data && (
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-slate-500">Imported</p>
            <p className="text-2xl font-bold text-emerald-700">{data.imported}</p>
          </div>
          <div>
            <p className="text-slate-500">Receipts Created</p>
            <p className="text-2xl font-bold text-blue-700">{data.receiptsCreated ?? 0}</p>
          </div>
          <div>
            <p className="text-slate-500">Skipped</p>
            <p className="text-2xl font-bold text-orange-600">{data.skipped}</p>
          </div>
          <div>
            <p className="text-slate-500">Batch ID</p>
            <p className="text-xs font-mono text-slate-600 mt-1 break-all">{data.batchId}</p>
          </div>
        </div>
      )}

      {/* skipped row details */}
      {data?.skippedDetails?.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-orange-700 flex items-center gap-1 mb-2">
            <AlertTriangle className="h-4 w-4" /> Skipped rows
          </p>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-orange-200 bg-white">
            {data.skippedDetails.map((s, i) => (
              <div key={i} className="flex gap-3 border-b border-orange-100 px-3 py-2 text-xs last:border-0">
                <span className="font-medium text-slate-600">Row {s.row}</span>
                <span className="text-slate-500">{s.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Upload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const { data: histData, loading: histLoading, refetch: refetchHistory }
    = useAsync(() => uploadApi.getHistory(), []);

  const history = histData?.data ?? [];

  const handleFile = (f) => {
    setFile(f);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const res = await uploadApi.uploadExcel(file);
      setResult({ success: true, message: res.message, data: res.data });
      setFile(null);
      refetchHistory();
    } catch (e) {
      setResult({ success: false, message: e.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Excel Upload"
        description="Import invoice data from Excel — rows are appended, nothing is overwritten"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left — uploader */}
        <div className="space-y-4">
          <DropZone onFile={handleFile} disabled={uploading} />

          {/* selected file pill */}
          {file && (
            <div className="flex items-center justify-between rounded-xl border
              border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setFile(null); setResult(null); }}>
                  Remove
                </Button>
                <Button loading={uploading} onClick={handleUpload}>
                  Upload
                </Button>
              </div>
            </div>
          )}

          <UploadResult result={result} />

          {/* Column mapping reference */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-3">
              <p className="text-sm font-semibold text-slate-700">Expected Excel Columns</p>
            </div>
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
              {[
                ['Location', 'Property name (must match master)'],
                ['Tenant Name', 'Tenant name (must match master)'],
                ['Category of Service', 'Rent & CAM / Power Charges / etc.'],
                ['Bill Date', 'DD-MMM-YY or Excel date serial'],
                ['Bill Amount', 'Numeric — commas and ₹ stripped'],
                ['Billing Month', 'e.g. May-2026'],
                ['Credit Terms (Days)', 'Integer'],
                ['Due By', 'DD-MMM-YY or Excel date serial'],
                ['Outstanding Status', 'Pending / Paid / Partial'],
                ['Amount Collected', 'Numeric'],
                ['Outstanding Balance', 'Numeric'],
                ['Overdue By Days', 'Integer'],
                ['Aging Bucket', 'Current / 1-30 Days / 31-60 Days…'],
              ].map(([col, hint]) => (
                <div key={col} className="flex gap-3 px-5 py-2.5 text-xs">
                  <span className="w-44 shrink-0 font-medium text-slate-700">{col}</span>
                  <span className="text-slate-400">{hint}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — upload history */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm self-start">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Upload History</h2>
            <Clock className="h-5 w-5 text-slate-400" />
          </div>

          {histLoading ? (
            <p className="py-10 text-center text-sm text-slate-400 animate-pulse">Loading...</p>
          ) : !history.length ? (
            <p className="py-10 text-center text-sm text-slate-400">No uploads yet</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
              {history.map((h) => (
                <div key={h.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileSpreadsheet className="h-4 w-4 text-slate-400 shrink-0" />
                      <p className="text-sm font-medium text-slate-800 truncate">{h.filename}</p>
                    </div>
                    <UploadStatusBadge status={h.status} />
                  </div>
                  <div className="mt-2 flex gap-4 text-[11px] text-slate-500 font-medium">
                    <span>{formatDate(h.uploaded_at)}</span>
                    {h.rows_imported > 0 && (
                      <span className="text-emerald-600">
                        ✓ {h.rows_imported} imported
                      </span>
                    )}
                    {h.rows_skipped > 0 && (
                      <span className="text-orange-500">
                        ⚠ {h.rows_skipped} skipped
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}