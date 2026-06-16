-- Roles table: system roles + future custom roles per company
CREATE TABLE IF NOT EXISTS roles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  label               text NOT NULL,
  default_permissions jsonb NOT NULL DEFAULT '{
    "leads":           {"view": false, "edit": false, "create": false},
    "jobs":            {"view": false, "edit": false, "create": false},
    "clients":         {"view": false, "edit": false, "create": false},
    "vehicles":        {"view": false, "edit": false, "create": false},
    "mechanics":       {"view": false, "edit": false, "create": false},
    "groups":          {"view": false, "edit": false, "create": false},
    "facebook_groups": {"view": false, "edit": false, "create": false},
    "settings":        {"view": false, "edit": false, "create": false}
  }'::jsonb,
  is_system  boolean NOT NULL DEFAULT false,
  company_id uuid,                          -- null = system role
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique: system roles by name; custom roles by (name, company)
CREATE UNIQUE INDEX IF NOT EXISTS roles_name_system  ON roles (name)             WHERE is_system = true;
CREATE UNIQUE INDEX IF NOT EXISTS roles_name_company ON roles (name, company_id) WHERE is_system = false;

-- RLS: anyone authenticated can read roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_select" ON roles FOR SELECT USING (true);

-- Seed system roles
INSERT INTO roles (name, label, default_permissions, is_system) VALUES

('super_admin', 'Super Admin', '{
  "leads":           {"view": true, "edit": true, "create": true},
  "jobs":            {"view": true, "edit": true, "create": true},
  "clients":         {"view": true, "edit": true, "create": true},
  "vehicles":        {"view": true, "edit": true, "create": true},
  "mechanics":       {"view": true, "edit": true, "create": true},
  "groups":          {"view": true, "edit": true, "create": true},
  "facebook_groups": {"view": true, "edit": true, "create": true},
  "settings":        {"view": true, "edit": true, "create": true}
}'::jsonb, true),

('admin', 'Admin', '{
  "leads":           {"view": true, "edit": true, "create": true},
  "jobs":            {"view": true, "edit": true, "create": true},
  "clients":         {"view": true, "edit": true, "create": true},
  "vehicles":        {"view": true, "edit": true, "create": true},
  "mechanics":       {"view": true, "edit": true, "create": true},
  "groups":          {"view": true, "edit": true, "create": true},
  "facebook_groups": {"view": true, "edit": true, "create": true},
  "settings":        {"view": true, "edit": true, "create": true}
}'::jsonb, true),

('mechanic', 'Mechanic', '{
  "leads":           {"view": false, "edit": false, "create": false},
  "jobs":            {"view": true,  "edit": true,  "create": false},
  "clients":         {"view": true,  "edit": false, "create": false},
  "vehicles":        {"view": true,  "edit": true,  "create": false},
  "mechanics":       {"view": false, "edit": false, "create": false},
  "groups":          {"view": false, "edit": false, "create": false},
  "facebook_groups": {"view": false, "edit": false, "create": false},
  "settings":        {"view": false, "edit": false, "create": false}
}'::jsonb, true),

('customer', 'Customer', '{
  "leads":           {"view": false, "edit": false, "create": false},
  "jobs":            {"view": false, "edit": false, "create": false},
  "clients":         {"view": false, "edit": false, "create": false},
  "vehicles":        {"view": false, "edit": false, "create": false},
  "mechanics":       {"view": false, "edit": false, "create": false},
  "groups":          {"view": false, "edit": false, "create": false},
  "facebook_groups": {"view": false, "edit": false, "create": false},
  "settings":        {"view": false, "edit": false, "create": false}
}'::jsonb, true)

ON CONFLICT DO NOTHING;

-- Add role_id FK to mechanics (replaces profile text column)
ALTER TABLE mechanics
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES roles(id);

-- Migrate existing profile values to role_id
UPDATE mechanics m
SET role_id = r.id
FROM roles r
WHERE r.name = m.profile
  AND r.is_system = true;

-- Default new mechanics to 'mechanic' role
UPDATE mechanics
SET role_id = (SELECT id FROM roles WHERE name = 'mechanic' AND is_system = true)
WHERE role_id IS NULL;
