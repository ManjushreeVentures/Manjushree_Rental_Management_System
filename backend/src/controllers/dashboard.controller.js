import {
  getKPIs as fetchKPIs,
  getAgingSnapshot as fetchAging,
  getTenantSummary as fetchTenants,
  getDashboardAlerts as fetchAlerts,
  getRecentActivity as fetchActivity,
} from '../services/dashboard.service.js';

export async function getDashboardFull(req, res) {
  const [kpis, aging, tenants, alerts, activity] = await Promise.all([
    fetchKPIs(),
    fetchAging(),
    fetchTenants(),
    fetchAlerts(),
    fetchActivity(),
  ]);

  res.json({
    success: true,
    data: {
      kpis,
      aging,
      tenants,
      alerts,
      activity,
    }
  });
}

export async function getKPIs(req, res) {
  const kpis = await fetchKPIs();
  res.json({ success: true, data: kpis });
}

export async function getAgingSnapshot(req, res) {
  const aging = await fetchAging();
  res.json({ success: true, data: aging });
}

export async function getTenantSummary(req, res) {
  const tenants = await fetchTenants();
  res.json({ success: true, data: tenants });
}

export async function getDashboardAlerts(req, res) {
  const alerts = await fetchAlerts();
  res.json({ success: true, data: alerts });
}

export async function getRecentActivity(req, res) {
  const activity = await fetchActivity();
  res.json({ success: true, data: activity });
}