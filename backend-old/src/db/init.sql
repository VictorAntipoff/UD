-- Insert initial admin user (password: admin123)
INSERT INTO users (
  first_name, 
  last_name, 
  email, 
  password, 
  role, 
  status
) VALUES (
  'Admin',
  'User',
  'admin@udesign.com',
  '$2b$10$YourHashedPasswordHere', -- You'll need to generate this with bcrypt
  'Admin',
  'active'
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('Admin', 'Full system access'),
  ('Manager', 'Department management access'),
  ('Supervisor', 'Team supervision access'),
  ('Operator', 'Basic operation access'),
  ('Technician', 'Technical maintenance access');

-- Insert default permissions
INSERT INTO permissions (name, module, description) VALUES
  ('user.create', 'admin', 'Create new users'),
  ('user.read', 'admin', 'View user details'),
  ('user.update', 'admin', 'Update user information'),
  ('user.delete', 'admin', 'Delete users'),
  ('role.manage', 'admin', 'Manage roles and permissions'),
  ('wood.slice', 'factory', 'Perform wood slicing operations'),
  ('wood.calculate', 'factory', 'Perform wood calculations'),
  ('wood.dry', 'factory', 'Manage drying processes'),
  ('supplier.manage', 'admin', 'Manage supplier information'),
  ('report.generate', 'system', 'Generate system reports'); 