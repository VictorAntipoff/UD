-- Users and Authentication
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret VARCHAR(32),
  reset_token VARCHAR(100),
  reset_token_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  module VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Session Management
CREATE TABLE active_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  device_info TEXT,
  ip_address VARCHAR(45),
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

-- Wood Processing Data
CREATE TABLE sleepers (
  id SERIAL PRIMARY KEY,
  thickness_inches DECIMAL(10,2) NOT NULL,
  width_inches DECIMAL(10,2) NOT NULL,
  length_feet DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  batch_number VARCHAR(50),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wood_slicing_jobs (
  id SERIAL PRIMARY KEY,
  sleeper_id INTEGER REFERENCES sleepers(id),
  input_thickness_inches DECIMAL(10,2) NOT NULL,
  input_width_inches DECIMAL(10,2) NOT NULL,
  input_length_feet DECIMAL(10,2) NOT NULL,
  output_thickness_inches DECIMAL(10,2) NOT NULL,
  output_width_inches DECIMAL(10,2) NOT NULL,
  output_length_feet DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  total_volume_m3 DECIMAL(10,4) NOT NULL,
  waste_percentage DECIMAL(5,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  approval_required VARCHAR(20),
  approved_by INTEGER REFERENCES users(id),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drying Process
CREATE TABLE drying_batches (
  id SERIAL PRIMARY KEY,
  batch_number VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  num_items INTEGER NOT NULL,
  thickness_inches DECIMAL(10,2) NOT NULL,
  initial_kw_reading DECIMAL(10,2) NOT NULL,
  initial_humidity DECIMAL(5,2) NOT NULL,
  final_kw_reading DECIMAL(10,2),
  final_humidity DECIMAL(5,2),
  target_humidity DECIMAL(5,2) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  status VARCHAR(20) DEFAULT 'in_progress',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drying_spot_checks (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER REFERENCES drying_batches(id) ON DELETE CASCADE,
  kw_reading DECIMAL(10,2) NOT NULL,
  humidity_level DECIMAL(5,2) NOT NULL,
  temperature_celsius DECIMAL(5,2),
  checked_by INTEGER REFERENCES users(id),
  check_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE TABLE humidity_specifications (
  id SERIAL PRIMARY KEY,
  wood_type VARCHAR(50) NOT NULL,
  min_humidity DECIMAL(5,2) NOT NULL,
  max_humidity DECIMAL(5,2) NOT NULL,
  optimal_humidity DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Supplier Management
CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE supplier_prices (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
  wood_type VARCHAR(50) NOT NULL,
  price_per_unit DECIMAL(10,2) NOT NULL,
  unit_type VARCHAR(20) NOT NULL,
  minimum_order INTEGER,
  valid_from TIMESTAMP NOT NULL,
  valid_to TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE price_calculations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  supplier_id INTEGER REFERENCES suppliers(id),
  dimensions_json JSONB NOT NULL,
  quantity INTEGER NOT NULL,
  price_per_unit DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  cost_per_m3 DECIMAL(10,2) NOT NULL,
  calculation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Logs
CREATE TABLE system_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications System
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'approval', 'alert', 'info'
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  module VARCHAR(50) NOT NULL,
  reference_id INTEGER, -- ID of the related record (e.g., wood_slicing_jobs.id)
  reference_type VARCHAR(50), -- Table name of the reference (e.g., 'wood_slicing_jobs')
  action_url VARCHAR(255), -- Frontend URL for the action
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_recipients (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(notification_id, user_id)
);

-- Add approval workflow tables
CREATE TABLE approval_workflows (
  id SERIAL PRIMARY KEY,
  module VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  reference_id INTEGER NOT NULL,
  reference_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  requested_by INTEGER REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  approval_date TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE approval_requirements (
  id SERIAL PRIMARY KEY,
  module VARCHAR(50) NOT NULL,
  threshold_type VARCHAR(50) NOT NULL,
  threshold_value DECIMAL(10,2) NOT NULL,
  required_role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default approval requirements
INSERT INTO approval_requirements (module, threshold_type, threshold_value, required_role) VALUES
  ('wood_slicer', 'waste_percentage', 10.00, 'Manager'),
  ('wood_slicer', 'waste_percentage', 15.00, 'Admin'),
  ('drying_process', 'humidity_deviation', 5.00, 'Manager'),
  ('drying_process', 'humidity_deviation', 10.00, 'Admin');

-- Add indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user_id ON active_sessions(user_id);
CREATE INDEX idx_wood_slicing_jobs_status ON wood_slicing_jobs(status);
CREATE INDEX idx_drying_batches_status ON drying_batches(status);
CREATE INDEX idx_supplier_prices_valid_dates ON supplier_prices(valid_from, valid_to);
CREATE INDEX idx_system_logs_user_module ON system_logs(user_id, module);

-- Indexes for notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at);
CREATE INDEX idx_notification_recipients_user ON notification_recipients(user_id, is_read);

-- Add indexes
CREATE INDEX idx_approval_workflows_status ON approval_workflows(status);
CREATE INDEX idx_approval_workflows_reference ON approval_workflows(reference_type, reference_id); 