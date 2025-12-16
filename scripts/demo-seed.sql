-- Demo seed: create datasources row for a local MySQL database and a sample table.
-- Adjust credentials before running.

INSERT INTO datasources (`name`, `type`, `host`, `port`, `username`, `password`, `database`, `created_at`, `updated_at`)
VALUES ('local-mysql', 'mysql', '127.0.0.1', 3306, 'root', '123456', 'sparkset_demo', NOW(), NOW());

CREATE DATABASE IF NOT EXISTS sparkset_demo;
USE sparkset_demo;

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user VARCHAR(64),
  region VARCHAR(64),
  amount DECIMAL(10,2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO orders (user, region, amount) VALUES
 ('Alice', '杭州', 123.45),
 ('Bob', '上海', 88.00),
 ('Carol', '北京', 45.10);
