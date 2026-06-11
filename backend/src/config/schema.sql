-- USERS (Authentication)
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT DEFAULT 'user',       -- user / admin (for future role-based access)
  is_active     BOOLEAN DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- PROPERTIES
CREATE TABLE properties (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,       -- matches "Location" col in Excel
  address     TEXT,
  city        TEXT,
  total_units INTEGER DEFAULT 0,
  owner_name  TEXT,
  gstin       TEXT,
  total_area  NUMERIC(14,2),
  leased_area NUMERIC(14,2),
  vacant_area NUMERIC(14,2),
  total_amount NUMERIC(14,2),
  is_active   BOOLEAN DEFAULT TRUE,
  vacated_date DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- UNITS (Physical blocks/subdivisions of a property)
CREATE TABLE units (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID REFERENCES properties(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,               -- e.g., "Block-4", "GF & B-5"
  total_area    NUMERIC(14,2) NOT NULL,
  tenant_id     UUID,                        -- Will reference tenants(id), added as foreign key later or handled in logic
  rent_amount   NUMERIC(14,2) DEFAULT 0,     -- Revenue from this unit
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- TENANTS
CREATE TABLE tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID REFERENCES properties(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,           -- matches "Tenant Name" in Excel
  email           TEXT,
  phone           TEXT,
  gstin           TEXT,
  unit_no         TEXT,
  lease_start     DATE,
  lease_end       DATE,
  monthly_rent    NUMERIC(14,2),
  security_deposit NUMERIC(14,2),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- INVOICES  (append-only, one row per Excel row)
CREATE TABLE invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_name       TEXT NOT NULL,        -- "Location"
  tenant_name         TEXT NOT NULL,        -- "Tenant Name"
  property_id         UUID REFERENCES properties(id) ON DELETE SET NULL,
  tenant_id           UUID REFERENCES tenants(id)   ON DELETE SET NULL,
  category            TEXT NOT NULL,        -- "Category of Service"
  bill_date           DATE NOT NULL,        -- "Bill Date"
  bill_amount         NUMERIC(14,2) NOT NULL,
  billing_month       TEXT NOT NULL,        -- "May-2026"
  credit_terms_days   INTEGER DEFAULT 0,
  due_date            DATE,
  status              TEXT DEFAULT 'Pending', -- Pending / Paid / Partial
  amount_collected    NUMERIC(14,2) DEFAULT 0,
  outstanding_balance NUMERIC(14,2),
  overdue_by_days     INTEGER DEFAULT 0,
  aging_bucket        TEXT,                 -- Current / 1-30 Days / 31-60 / 61-90 / 90+
  upload_batch_id     UUID,                 -- which Excel upload created this row
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- RECEIPTS  (payments recorded against invoices)
CREATE TABLE receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID REFERENCES invoices(id) ON DELETE CASCADE,
  tenant_id       UUID REFERENCES tenants(id)  ON DELETE SET NULL,
  property_id     UUID REFERENCES properties(id) ON DELETE SET NULL,
  amount          NUMERIC(14,2) NOT NULL,
  payment_date    DATE NOT NULL,
  payment_mode    TEXT,                     -- NEFT / RTGS / Cheque / UPI
  reference_no    TEXT,
  remarks         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- EXCEL UPLOAD AUDIT LOG
CREATE TABLE excel_uploads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename      TEXT NOT NULL,
  rows_imported INTEGER DEFAULT 0,
  rows_skipped  INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'processing',  -- processing / done / failed
  error_log     JSONB,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for fast dashboard queries
CREATE INDEX idx_invoices_tenant_name    ON invoices(tenant_name);
CREATE INDEX idx_invoices_property_name  ON invoices(property_name);
CREATE INDEX idx_invoices_billing_month  ON invoices(billing_month);
CREATE INDEX idx_invoices_status         ON invoices(status);
CREATE INDEX idx_invoices_aging_bucket   ON invoices(aging_bucket);
CREATE INDEX idx_invoices_due_date       ON invoices(due_date);
CREATE INDEX idx_receipts_invoice_id     ON receipts(invoice_id);
CREATE INDEX idx_tenants_property_id     ON tenants(property_id);

-- SYSTEM AUDIT LOGS
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_email    TEXT,
  action        TEXT NOT NULL,               -- CREATE, UPDATE, DELETE
  entity        TEXT NOT NULL,               -- property, tenant, invoice, receipt, etc.
  entity_id     UUID,                        -- ID of the modified entity
  details       JSONB,                       -- JSON containing old/new values
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id      ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity       ON audit_logs(entity);
CREATE INDEX idx_audit_logs_created_at   ON audit_logs(created_at);