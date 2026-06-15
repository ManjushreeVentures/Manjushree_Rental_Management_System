-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default admin user (Password is 'admin123' hashed)
INSERT INTO users (name, email, password_hash, role) 
VALUES ('System Admin', 'admin@manjushree.com', '$2b$10$EP4k6oG.M1R1H.45vX64H.n52Lh3Z4i/0F4YF5Yj9R1QyZqD8m8v2', 'admin')
ON CONFLICT (email) DO NOTHING;

-- 3. PROPERTIES TABLE
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  total_units INTEGER DEFAULT 0,
  owner_name TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  gstin TEXT,
  total_area NUMERIC(14,2) DEFAULT 0,
  leased_area NUMERIC(14,2) DEFAULT 0,
  vacant_area NUMERIC(14,2) DEFAULT 0,
  total_amount NUMERIC(14,2) DEFAULT 0,
  vacated_date DATE,
  attachment_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TENANTS TABLE
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  gstin TEXT,
  unit_no TEXT,
  lease_start DATE,
  lease_end DATE,
  monthly_rent NUMERIC(14,2) DEFAULT 0,
  security_deposit NUMERIC(14,2) DEFAULT 0,
  tenant_area NUMERIC(14,2) DEFAULT 0,
  rate_per_sft NUMERIC(14,2) DEFAULT 0,
  cam_amount NUMERIC(14,2) DEFAULT 0,
  escalation_pct NUMERIC(5,2) DEFAULT 0,
  escalation_due_date DATE,
  escalation_new_rent NUMERIC(14,2) DEFAULT 0,
  escalation_applied BOOLEAN DEFAULT false,
  attachment_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. UNITS TABLE
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_area NUMERIC(14,2) NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  rent_amount NUMERIC(14,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_name TEXT NOT NULL,
  tenant_name TEXT NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  bill_date DATE NOT NULL,
  bill_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  billing_month TEXT NOT NULL,
  credit_terms_days INTEGER DEFAULT 0,
  due_date DATE,
  status TEXT DEFAULT 'Pending',
  amount_collected NUMERIC(14,2) DEFAULT 0,
  outstanding_balance NUMERIC(14,2) DEFAULT 0,
  overdue_by_days INTEGER DEFAULT 0,
  aging_bucket TEXT DEFAULT 'Current',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_mode TEXT NOT NULL,
  reference_no TEXT,
  remarks TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_property_id ON invoices(property_id);
CREATE INDEX IF NOT EXISTS idx_invoices_category ON invoices(category);
CREATE INDEX IF NOT EXISTS idx_invoices_bill_date ON invoices(bill_date);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice_id ON receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON tenants(property_id);
