CREATE DATABASE IF NOT EXISTS bajaj_service_center;
USE bajaj_service_center;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_number VARCHAR(32) NOT NULL UNIQUE,
  owner_name VARCHAR(200) NOT NULL,
  owner_phone VARCHAR(40),
  owner_address TEXT,
  vehicle_model VARCHAR(120),
  avg_daily_km DECIMAL(10,2) NOT NULL DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_card_no VARCHAR(64) NOT NULL,
  vehicle_id INT NOT NULL,
  service_date DATE NOT NULL,
  odometer_km INT NOT NULL,
  service_type ENUM('FREE','PAID') NOT NULL DEFAULT 'PAID',
  work_done TEXT,
  parts_replaced TEXT,
  next_due_km INT NOT NULL,
  next_due_date DATE,
  feedback TEXT,
  followup_call_done TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  INDEX idx_vehicle (vehicle_id),
  INDEX idx_service_date (service_date)
);

CREATE TABLE IF NOT EXISTS reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  service_record_id INT NOT NULL,
  reminder_date DATE NOT NULL,
  status ENUM('PENDING','SENT','DISMISSED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (service_record_id) REFERENCES service_records(id) ON DELETE CASCADE,
  INDEX idx_reminder_date (reminder_date),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS call_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  service_record_id INT NULL,
  reminder_id INT NULL,
  outcome ENUM('CONTACTED','NO_ANSWER','CALLBACK_REQUESTED','RESCHEDULED','ADJUSTED_DUE','OTHER') NOT NULL DEFAULT 'CONTACTED',
  notes TEXT,
  previous_next_due_date DATE NULL,
  new_next_due_date DATE NULL,
  previous_next_due_km INT NULL,
  new_next_due_km INT NULL,
  called_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id INT NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (service_record_id) REFERENCES service_records(id) ON DELETE SET NULL,
  FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_call_vehicle_time (vehicle_id, called_at)
);
