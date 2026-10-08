-- P.K Business: Google Sign-In database update
-- Run this once in Hostinger phpMyAdmin after selecting your application database.
-- This script preserves all existing users and data.

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'firebase_uid'
);

SET @migration_sql := IF(
  @column_exists = 0,
  'ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(128) NULL UNIQUE AFTER password_hash',
  'SELECT ''firebase_uid already exists; no database change required.'' AS message'
);

PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
