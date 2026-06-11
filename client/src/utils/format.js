export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount ?? 0);

export function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d)) return dateString;

  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
}

export function formatBillingMonth(text) {
  if (!text) return '—';
  if (text.length > 15 && text.includes('GMT')) {
    const d = new Date(text);
    if (!isNaN(d)) {
      const ms = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${ms[d.getMonth()]}-${d.getFullYear()}`;
    }
  }
  return text;
}

export const formatMonth = (m) => {
  if (!m) return '—';
  const [mon, yr] = m.split('-');
  return `${mon} ${yr}`;
};

export function getCurrentBillingMonth() {
  const ms = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date();
  return `${ms[d.getMonth()]}-${d.getFullYear()}`;
}