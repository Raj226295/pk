CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(190) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(50) NOT NULL,
  company_name VARCHAR(190) NOT NULL DEFAULT '',
  profile_image VARCHAR(2048) NOT NULL DEFAULT '',
  profile_image_zoom DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  profile_image_offset_x INT NOT NULL DEFAULT 0,
  profile_image_offset_y INT NOT NULL DEFAULT 0,
  is_blocked TINYINT(1) NOT NULL DEFAULT 0,
  blocked_at DATETIME NULL,
  password_hash VARCHAR(255) NOT NULL,
  firebase_uid VARCHAR(128) NULL UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_users_role (role),
  INDEX idx_users_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS blogs (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  content LONGTEXT NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'General',
  published_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_blogs_published_at (published_at)
);

CREATE TABLE IF NOT EXISTS service_catalog (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(190) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  image VARCHAR(255) NOT NULL DEFAULT '',
  image_zoom DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  image_offset_x INT NOT NULL DEFAULT 0,
  image_offset_y INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_service_catalog_active (is_active),
  INDEX idx_service_catalog_sort (sort_order)
);

CREATE TABLE IF NOT EXISTS services (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  requested_by_client TINYINT(1) NOT NULL DEFAULT 0,
  catalog_service_id CHAR(36) NULL,
  influencer_id CHAR(36) NULL,
  type VARCHAR(190) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  notes TEXT NOT NULL,
  admin_remarks TEXT NOT NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_services_user (user_id),
  INDEX idx_services_catalog (catalog_service_id),
  INDEX idx_services_influencer (influencer_id),
  INDEX idx_services_status (status),
  CONSTRAINT fk_services_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_services_catalog FOREIGN KEY (catalog_service_id) REFERENCES service_catalog(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  uploaded_by_id CHAR(36) NULL,
  title VARCHAR(190) NOT NULL,
  document_type VARCHAR(190) NOT NULL DEFAULT '',
  service_type VARCHAR(190) NOT NULL DEFAULT 'General',
  input_type VARCHAR(20) NOT NULL DEFAULT 'file',
  text_value TEXT NULL,
  filename VARCHAR(255) NOT NULL DEFAULT '',
  original_name VARCHAR(255) NOT NULL DEFAULT '',
  relative_path VARCHAR(255) NOT NULL DEFAULT '',
  storage_folder VARCHAR(190) NOT NULL DEFAULT '',
  file_url VARCHAR(255) NOT NULL DEFAULT '',
  mime_type VARCHAR(190) NOT NULL DEFAULT 'application/octet-stream',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  remarks TEXT NOT NULL,
  notes TEXT NOT NULL,
  reviewed_by_id CHAR(36) NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_documents_user (user_id),
  INDEX idx_documents_service (service_type),
  INDEX idx_documents_status (status),
  CONSTRAINT fk_documents_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_documents_uploaded_by FOREIGN KEY (uploaded_by_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_documents_reviewed_by FOREIGN KEY (reviewed_by_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  service_id CHAR(36) NULL,
  invoice_number VARCHAR(190) NOT NULL UNIQUE,
  service_type VARCHAR(190) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'online',
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  transaction_id VARCHAR(190) NOT NULL DEFAULT '',
  razorpay_order_id VARCHAR(190) NOT NULL DEFAULT '',
  razorpay_payment_id VARCHAR(190) NOT NULL DEFAULT '',
  paid_at DATETIME NULL,
  screenshot_url VARCHAR(255) NOT NULL DEFAULT '',
  screenshot_name VARCHAR(255) NOT NULL DEFAULT '',
  screenshot_type VARCHAR(190) NOT NULL DEFAULT 'application/octet-stream',
  review_remarks TEXT NOT NULL,
  verified_by_id CHAR(36) NULL,
  verified_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_payments_user (user_id),
  INDEX idx_payments_service (service_id),
  INDEX idx_payments_status (status),
  INDEX idx_payments_verification_status (verification_status),
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  CONSTRAINT fk_payments_verified_by FOREIGN KEY (verified_by_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payment_events (
  id CHAR(36) PRIMARY KEY,
  payment_id CHAR(36) NULL,
  user_id CHAR(36) NULL,
  event_type VARCHAR(80) NOT NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'system',
  message TEXT NOT NULL,
  payload LONGTEXT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_payment_events_payment (payment_id),
  INDEX idx_payment_events_user (user_id),
  INDEX idx_payment_events_type (event_type),
  CONSTRAINT fk_payment_events_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
  CONSTRAINT fk_payment_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  scheduled_for DATETIME NOT NULL,
  service_type VARCHAR(190) NOT NULL DEFAULT 'General consultation',
  notes TEXT NOT NULL,
  admin_notes TEXT NOT NULL,
  rejection_reason TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_appointments_user (user_id),
  INDEX idx_appointments_status (status),
  INDEX idx_appointments_scheduled_for (scheduled_for),
  CONSTRAINT fk_appointments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  link VARCHAR(255) NOT NULL DEFAULT '',
  file_url VARCHAR(255) NOT NULL DEFAULT '',
  action_label VARCHAR(100) NOT NULL DEFAULT '',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_category (category),
  INDEX idx_notifications_is_read (is_read),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(190) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'contact',
  page_url VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  INDEX idx_contact_messages_created_at (created_at),
  INDEX idx_contact_messages_source (source)
);

-- Public site CMS. These tables deliberately sit beside the client portal tables:
-- catalog services are used for client requests while public_services controls web content.
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
);

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
);

-- The four root records are seeded and protected by the API. Every customer
-- facing service below them is a normal editable record in this hierarchy.
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
);

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
);

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
);

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
);

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
);

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
);

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
);

CREATE TABLE IF NOT EXISTS website_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value LONGTEXT NOT NULL,
  updated_at DATETIME NOT NULL
);
