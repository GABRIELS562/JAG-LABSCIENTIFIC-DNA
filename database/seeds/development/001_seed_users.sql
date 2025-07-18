-- Development Seed: 001_seed_users.sql
-- Description: Seed development database with initial users
-- Environment: Development Only
-- Author: DevOps Team

-- Insert admin user
INSERT INTO users (
    username, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    role, 
    is_active,
    created_by,
    updated_by
) VALUES (
    'admin',
    'admin@labscientific.com',
    '$2b$12$LQv3c1yqBwEHxv7h2qQJKO7LUxnIqYGjcQQhO6qVZSr3gXFl6VUwq', -- password: admin123
    'System',
    'Administrator',
    'admin',
    TRUE,
    'system',
    'system'
) ON CONFLICT (username) DO NOTHING;

-- Insert technician users
INSERT INTO users (
    username, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    role, 
    is_active,
    created_by,
    updated_by
) VALUES 
(
    'tech001',
    'sarah.johnson@labscientific.com',
    '$2b$12$LQv3c1yqBwEHxv7h2qQJKO7LUxnIqYGjcQQhO6qVZSr3gXFl6VUwq', -- password: tech123
    'Sarah',
    'Johnson',
    'technician',
    TRUE,
    'system',
    'system'
),
(
    'tech002',
    'mike.chen@labscientific.com',
    '$2b$12$LQv3c1yqBwEHxv7h2qQJKO7LUxnIqYGjcQQhO6qVZSr3gXFl6VUwq', -- password: tech123
    'Michael',
    'Chen',
    'technician',
    TRUE,
    'system',
    'system'
),
(
    'tech003',
    'emma.davis@labscientific.com',
    '$2b$12$LQv3c1yqBwEHxv7h2qQJKO7LUxnIqYGjcQQhO6qVZSr3gXFl6VUwq', -- password: tech123
    'Emma',
    'Davis',
    'technician',
    TRUE,
    'system',
    'system'
) ON CONFLICT (username) DO NOTHING;

-- Insert analyst users
INSERT INTO users (
    username, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    role, 
    is_active,
    created_by,
    updated_by
) VALUES 
(
    'analyst001',
    'dr.martinez@labscientific.com',
    '$2b$12$LQv3c1yqBwEHxv7h2qQJKO7LUxnIqYGjcQQhO6qVZSr3gXFl6VUwq', -- password: analyst123
    'Dr. Maria',
    'Martinez',
    'analyst',
    TRUE,
    'system',
    'system'
),
(
    'analyst002',
    'dr.wilson@labscientific.com',
    '$2b$12$LQv3c1yqBwEHxv7h2qQJKO7LUxnIqYGjcQQhO6qVZSr3gXFl6VUwq', -- password: analyst123
    'Dr. James',
    'Wilson',
    'analyst',
    TRUE,
    'system',
    'system'
),
(
    'analyst003',
    'dr.patel@labscientific.com',
    '$2b$12$LQv3c1yqBwEHxv7h2qQJKO7LUxnIqYGjcQQhO6qVZSr3gXFl6VUwq', -- password: analyst123
    'Dr. Priya',
    'Patel',
    'analyst',
    TRUE,
    'system',
    'system'
) ON CONFLICT (username) DO NOTHING;

-- Insert viewer users
INSERT INTO users (
    username, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    role, 
    is_active,
    created_by,
    updated_by
) VALUES 
(
    'viewer001',
    'john.smith@labscientific.com',
    '$2b$12$LQv3c1yqBwEHxv7h2qQJKO7LUxnIqYGjcQQhO6qVZSr3gXFl6VUwq', -- password: viewer123
    'John',
    'Smith',
    'viewer',
    TRUE,
    'system',
    'system'
),
(
    'viewer002',
    'lisa.brown@labscientific.com',
    '$2b$12$LQv3c1yqBwEHxv7h2qQJKO7LUxnIqYGjcQQhO6qVZSr3gXFl6VUwq', -- password: viewer123
    'Lisa',
    'Brown',
    'viewer',
    TRUE,
    'system',
    'system'
) ON CONFLICT (username) DO NOTHING;

-- Insert load testing user
INSERT INTO users (
    username, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    role, 
    is_active,
    created_by,
    updated_by
) VALUES (
    'loadtest',
    'loadtest@example.com',
    '$2b$12$LQv3c1yqBwEHxv7h2qQJKO7LUxnIqYGjcQQhO6qVZSr3gXFl6VUwq', -- password: loadtest123
    'Load',
    'Test',
    'technician',
    TRUE,
    'system',
    'system'
) ON CONFLICT (username) DO NOTHING;

-- Update system settings to reflect seeded data
UPDATE system_settings 
SET setting_value = 'true' 
WHERE setting_key = 'development_mode';

INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('development_mode', 'true', 'boolean', 'Development environment flag'),
('seed_data_loaded', 'true', 'boolean', 'Indicates if seed data has been loaded'),
('default_password_policy', 'development', 'string', 'Password policy for development environment')
ON CONFLICT (setting_key) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = CURRENT_TIMESTAMP;

-- Record seed execution
INSERT INTO audit_log (
    table_name,
    record_id,
    action,
    new_values,
    user_id,
    timestamp
) VALUES (
    'users',
    (SELECT id FROM users WHERE username = 'admin'),
    'SEED_DATA_LOADED',
    '{"seed_file": "001_seed_users.sql", "environment": "development"}'::jsonb,
    (SELECT id FROM users WHERE username = 'admin'),
    CURRENT_TIMESTAMP
);

COMMIT;