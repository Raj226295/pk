-- P.K Business upgrade for u147697182_pkbuiness (old export)
-- Import the old database backup FIRST, then import this file in the same database.
-- It preserves all existing data and adds the current application tables/features.

-- Add Google identity and influencer-booking support only when missing.
SET @users_firebase_uid_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'firebase_uid');
SET @users_firebase_uid_sql := IF(@users_firebase_uid_exists = 0, 'ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(128) NULL UNIQUE AFTER password_hash', 'SELECT ''firebase_uid already exists'' AS message');
PREPARE users_firebase_uid_statement FROM @users_firebase_uid_sql;
EXECUTE users_firebase_uid_statement;
DEALLOCATE PREPARE users_firebase_uid_statement;

SET @services_influencer_id_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services' AND COLUMN_NAME = 'influencer_id');
SET @services_influencer_id_sql := IF(@services_influencer_id_exists = 0, 'ALTER TABLE services ADD COLUMN influencer_id CHAR(36) NULL AFTER catalog_service_id, ADD INDEX idx_services_influencer (influencer_id)', 'SELECT ''influencer_id already exists'' AS message');
PREPARE services_influencer_id_statement FROM @services_influencer_id_sql;
EXECUTE services_influencer_id_statement;
DEALLOCATE PREPARE services_influencer_id_statement;

CREATE TABLE IF NOT EXISTS content_categories (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(190) NOT NULL,
  slug VARCHAR(190) NOT NULL,
  content_type VARCHAR(40) NOT NULL DEFAULT 'service',
  description TEXT NOT NULL,
  icon VARCHAR(80) NOT NULL DEFAULT 'fileCheck',
  image VARCHAR(255) NOT NULL DEFAULT '',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_content_categories_type_slug (content_type, slug),
  INDEX idx_content_categories_public (content_type, is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS public_services (
  id CHAR(36) PRIMARY KEY,
  category_id CHAR(36) NULL,
  name VARCHAR(190) NOT NULL,
  slug VARCHAR(190) NOT NULL UNIQUE,
  short_description TEXT NOT NULL,
  full_description LONGTEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  image VARCHAR(255) NOT NULL DEFAULT '',
  icon VARCHAR(80) NOT NULL DEFAULT 'fileCheck',
  service_type VARCHAR(40) NOT NULL DEFAULT 'tax',
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_public_services_listing (service_type, is_active, display_order),
  INDEX idx_public_services_featured (is_featured, is_active),
  CONSTRAINT fk_public_services_category FOREIGN KEY (category_id) REFERENCES content_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS service_nodes (
  id CHAR(36) PRIMARY KEY,
  parent_id CHAR(36) NULL,
  slug VARCHAR(190) NOT NULL UNIQUE,
  name VARCHAR(190) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  image VARCHAR(255) NOT NULL DEFAULT '',
  metadata LONGTEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_fixed_root TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_service_nodes_parent (parent_id, is_active, sort_order),
  CONSTRAINT fk_service_nodes_parent FOREIGN KEY (parent_id) REFERENCES service_nodes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS service_requirements (
  id CHAR(36) PRIMARY KEY,
  service_node_id CHAR(36) NOT NULL,
  label VARCHAR(190) NOT NULL,
  help_text TEXT NOT NULL,
  field_type VARCHAR(30) NOT NULL,
  options_json LONGTEXT NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 0,
  accepted_file_types VARCHAR(255) NOT NULL DEFAULT '',
  max_file_size_mb INT NOT NULL DEFAULT 10,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_service_requirements_node (service_node_id, sort_order),
  CONSTRAINT fk_service_requirements_node FOREIGN KEY (service_node_id) REFERENCES service_nodes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS service_requirement_values (
  id CHAR(36) PRIMARY KEY,
  service_id CHAR(36) NOT NULL,
  requirement_id CHAR(36) NOT NULL,
  value_text LONGTEXT NULL,
  document_id CHAR(36) NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_requirement_values_service (service_id),
  CONSTRAINT fk_requirement_values_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  CONSTRAINT fk_requirement_values_requirement FOREIGN KEY (requirement_id) REFERENCES service_requirements(id) ON DELETE CASCADE,
  CONSTRAINT fk_requirement_values_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS influencers (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(190) NOT NULL,
  username VARCHAR(190) NOT NULL DEFAULT '',
  platform VARCHAR(80) NOT NULL DEFAULT '',
  followers VARCHAR(80) NOT NULL DEFAULT '',
  engagement VARCHAR(80) NOT NULL DEFAULT '',
  location VARCHAR(190) NOT NULL DEFAULT '',
  booking_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  niche VARCHAR(190) NOT NULL DEFAULT '',
  bio TEXT NOT NULL,
  profile_url VARCHAR(255) NOT NULL DEFAULT '',
  image VARCHAR(255) NOT NULL DEFAULT '',
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_influencers_public (is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS influencer_requirements (
  id CHAR(36) PRIMARY KEY,
  influencer_id CHAR(36) NOT NULL,
  label VARCHAR(190) NOT NULL,
  field_type VARCHAR(30) NOT NULL,
  accepted_file_types VARCHAR(255) NOT NULL DEFAULT '',
  max_file_size_mb INT NOT NULL DEFAULT 10,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_influencer_requirements (influencer_id, sort_order),
  CONSTRAINT fk_influencer_requirements_influencer FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS influencer_requirement_values (
  id CHAR(36) PRIMARY KEY,
  service_id CHAR(36) NOT NULL,
  influencer_requirement_id CHAR(36) NOT NULL,
  value_text LONGTEXT NULL,
  document_id CHAR(36) NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_influencer_requirement_values_service (service_id),
  CONSTRAINT fk_influencer_requirement_values_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  CONSTRAINT fk_influencer_requirement_values_requirement FOREIGN KEY (influencer_requirement_id) REFERENCES influencer_requirements(id) ON DELETE CASCADE,
  CONSTRAINT fk_influencer_requirement_values_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS content_items (
  id CHAR(36) PRIMARY KEY,
  content_type VARCHAR(40) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL DEFAULT '',
  summary TEXT NOT NULL,
  body LONGTEXT NOT NULL,
  image VARCHAR(255) NOT NULL DEFAULT '',
  metadata LONGTEXT NULL,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_content_items_public (content_type, is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS website_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value LONGTEXT NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
