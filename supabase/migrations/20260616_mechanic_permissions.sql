ALTER TABLE mechanics
  ADD COLUMN IF NOT EXISTS profile text DEFAULT 'mechanic' CHECK (profile IN ('admin', 'mechanic')),
  ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{
    "leads":          {"view": false, "edit": false, "create": false},
    "jobs":           {"view": true,  "edit": true,  "create": false},
    "clients":        {"view": true,  "edit": false, "create": false},
    "vehicles":       {"view": true,  "edit": true,  "create": false},
    "mechanics":      {"view": false, "edit": false, "create": false},
    "groups":         {"view": false, "edit": false, "create": false},
    "facebook_groups":{"view": false, "edit": false, "create": false},
    "settings":       {"view": false, "edit": false, "create": false}
  }'::jsonb;
