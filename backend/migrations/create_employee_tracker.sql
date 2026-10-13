-- Apply manually to the intended database after backup. Existing tables are untouched.
CREATE TABLE IF NOT EXISTS tracker_sessions (
 session_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 employee_id INT NOT NULL,
 started_at DATETIME(3) NOT NULL,
 ended_at DATETIME(3) NULL,
 consent_at DATETIME(3) NOT NULL,
 active_employee_id INT GENERATED ALWAYS AS (IF(ended_at IS NULL, employee_id, NULL)) STORED,
 UNIQUE KEY tracker_one_active_session (active_employee_id),
 KEY tracker_employee_time (employee_id, started_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS tracker_locations (
 location_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 session_id BIGINT UNSIGNED NOT NULL,
 employee_id INT NOT NULL,
 point_id VARCHAR(80) NOT NULL,
 latitude DOUBLE NOT NULL, longitude DOUBLE NOT NULL,
 accuracy DOUBLE NULL, speed DOUBLE NULL, battery_level DOUBLE NULL,
 network_type VARCHAR(32) NOT NULL,
 recorded_at DATETIME(3) NOT NULL,
 received_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE KEY tracker_deduplicate (employee_id, point_id),
 KEY tracker_history (employee_id, recorded_at),
 CONSTRAINT tracker_location_session FOREIGN KEY (session_id) REFERENCES tracker_sessions(session_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS tracker_events (
 event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 session_id BIGINT UNSIGNED NOT NULL,
 employee_id INT NOT NULL,
 kind ENUM('CHECK_IN','CHECK_OUT','VISIT','SOS') NOT NULL,
 remarks VARCHAR(1000) NOT NULL DEFAULT '',
 latitude DOUBLE NULL, longitude DOUBLE NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 KEY tracker_event_time (employee_id, created_at),
 CONSTRAINT tracker_event_session FOREIGN KEY (session_id) REFERENCES tracker_sessions(session_id)
) ENGINE=InnoDB;
