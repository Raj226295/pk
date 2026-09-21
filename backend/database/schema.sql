CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(190) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(50) NOT NULL,
  company_name VARCHAR(190) NOT NULL DEFAULT '',
  profile_image VARCHAR(255) NOT NULL DEFAULT '',
  profile_image_zoom DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  profile_image_offset_x INT NOT NULL DEFAULT 0,
  profile_image_offset_y INT NOT NULL DEFAULT 0,
  is_blocked TINYINT(1) NOT NULL DEFAULT 0,
  blocked_at DATETIME NULL,
  password_hash VARCHAR(255) NOT NULL,
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
