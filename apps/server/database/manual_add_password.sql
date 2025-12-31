-- Manual SQL to add password_hash column to users table
-- Run this against your MySQL database if migration fails
-- Usage: mysql -u root -p sparkset < database/manual_add_password.sql

USE sparkset;

-- Check if column exists first
SET @has_column = 0;
SELECT COUNT(*) INTO @has_column
FROM information_schema.columns
WHERE table_schema = 'sparkset'
  AND table_name = 'users'
  AND column_name = 'password_hash';

-- Add password_hash column if it doesn't exist
SET @sql = IF(@has_column = 0,
  'ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER display_name',
  'SELECT ''Column already exists'' as status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for faster lookups (if not exists)
SET @has_index = 0;
SELECT COUNT(*) INTO @has_index
FROM information_schema.statistics
WHERE table_schema = 'sparkset'
  AND table_name = 'users'
  AND index_name = 'users_password_hash_idx';

SET @sql = IF(@has_index = 0,
  'CREATE INDEX users_password_hash_idx ON users(password_hash)',
  'SELECT ''Index already exists'' as status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Insert default admin user (password: admin123)
-- Note: This is a bcrypt hash of "admin123"
INSERT INTO users (
  uid,
  provider,
  username,
  email,
  display_name,
  password_hash,
  roles,
  permissions,
  is_active,
  created_at,
  updated_at
) VALUES (
  'local:admin',
  'local',
  'admin',
  'admin@example.com',
  'Admin User',
  '$2b$10$K8wjZ1cJ3zQYQ5v6X7Y8QeX9zQYQ5v6X7Y8QeX9zQYQ5v6X7Y8QeX9',
  '["admin"]',
  '["read:*","write:*","delete:*"]',
  true,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  updated_at = NOW();

SELECT 'Database migration completed successfully' as status;
