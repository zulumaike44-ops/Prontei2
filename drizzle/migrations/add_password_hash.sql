-- Add passwordHash column to users table for local authentication
ALTER TABLE users ADD COLUMN passwordHash varchar(255) DEFAULT NULL AFTER avatarUrl;
