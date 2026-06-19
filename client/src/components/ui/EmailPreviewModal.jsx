import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import Button from './Button';
import { Mail, Loader2, Info } from 'lucide-react';
import { invoiceApi } from '../../api/invoice.api';
import { useToast } from '../../contexts/ToastContext';

export default function EmailPreviewModal({ open, onClose, tenantId, tenantName, localEmail, onSent }) {
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [sending, setSending] = useState(false);
  const [to, setTo] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (open && tenantId) {
      setTo(localEmail || '');
      setBcc('');
      fetchPreview();
    }
  }, [open, tenantId, localEmail]);

  const fetchPreview = async () => {
    try {
      setLoadingPreview(true);
      setError(null);
      const res = await invoiceApi.previewReminder({ tenant_id: tenantId });
      if (res && res.success) {
        setSubject(res.data.subject);
        setHtmlContent(res.data.html);
        if (!to) setTo(res.data.to || '');
      } else {
        setError(res?.message || 'Failed to generate preview. No pending invoices found?');
      }
    } catch (err) {
      setError('Error communicating with server for email preview.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSend = async () => {
    if (!to) {
      showToast('Recipient email is required', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to.trim())) {
      showToast('Please enter a valid email address for the recipient', 'error');
      return;
    }

    if (bcc) {
      const bccEmails = bcc.split(',').map(e => e.trim()).filter(Boolean);
      for (let email of bccEmails) {
        if (!emailRegex.test(email)) {
          showToast(`Invalid BCC email format: ${email}`, 'error');
          return;
        }
      }
    }
    setSending(true);
    let finalHtml = htmlContent;
    if (iframeRef.current?.contentDocument) {
      finalHtml = iframeRef.current.contentDocument.documentElement.innerHTML;
    }

    try {
      const res = await invoiceApi.sendReminders({
        tenant_id: tenantId,
        override_email: to,
        override_subject: subject,
        override_html: finalHtml,
        bcc: bcc
      });
      showToast(res?.message || 'Reminder sent successfully');
      onSent(to); // tell parent we sent it, passing the email used
      onClose();
    } catch (err) {
      showToast('Failed to send reminder email', 'error');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Review & Send Reminder Email" width="max-w-2xl">
      {loadingPreview ? (
        <div className="p-10 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p>Generating email preview...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
            <Info className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-red-600 font-medium">{error}</p>
          <div className="mt-6">
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">To</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                  placeholder="tenant@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">BCC (optional)</label>
              <input
                type="text"
                value={bcc}
                onChange={e => setBcc(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                placeholder="admin@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white font-medium"
            />
          </div>

          <div className="flex flex-col flex-1 h-[50vh] min-h-[300px]">
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex justify-between items-center">
              <span>Email Body Preview</span>
            </label>
            <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-inner relative">
              <iframe
                ref={iframeRef}
                srcDoc={htmlContent}
                className="w-full h-full border-none"
                title="Email Preview"
                onLoad={() => {
                  if (iframeRef.current?.contentDocument) {
                    iframeRef.current.contentDocument.designMode = "on";

                    // Inject styles to set font family and custom scrollbar
                    const style = iframeRef.current.contentDocument.createElement('style');
                    style.innerHTML = `
                      body { 
                        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; 
                        cursor: text; 
                        margin: 0;
                      }
                      /* Custom thin scrollbar */
                      ::-webkit-scrollbar { width: 6px; }
                      ::-webkit-scrollbar-track { background: transparent; }
                      ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                      ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                    `;
                    iframeRef.current.contentDocument.head.appendChild(style);
                  }
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 mt-1 border-t border-slate-100">
            <Button variant="secondary" onClick={onClose} disabled={sending}>Cancel</Button>
            <Button onClick={handleSend} loading={sending}>
              <Mail className="h-4 w-4" /> Send Now
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
