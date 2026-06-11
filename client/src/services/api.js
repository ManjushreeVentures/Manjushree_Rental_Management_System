const API_BASE = "/api";

async function request(path, options = {}) {
  let res;

  try {
    res = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new Error(
      "Cannot reach backend. Run: cd backend && npm run dev"
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data;
}

export async function loginApi(payload) {
  return request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getBootstrapApi(token) {
  return request("/bootstrap", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createClientApi(token, payload) {
  return request("/clients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function updateClientApi(token, id, payload) {
  return request(`/clients/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteClientApi(token, id) {
  return request(`/clients/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createPropertyApi(token, payload) {
  return request("/properties", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function createAgreementApi(token, payload) {
  return request("/agreements", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function createInvoiceApi(token, payload) {
  return request("/invoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}
