-- =====================================================
-- STATE & DISTRICT MASTER TABLES
-- For: Employee address selection
-- =====================================================

CREATE TABLE states (
    state_id INT AUTO_INCREMENT PRIMARY KEY,
    state_code VARCHAR(10) UNIQUE NOT NULL COMMENT 'State code abbreviation',
    state_name VARCHAR(100) NOT NULL UNIQUE,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_state_name (state_name),
    INDEX idx_active (is_active)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Indian states master';

CREATE TABLE districts (
    district_id INT AUTO_INCREMENT PRIMARY KEY,
    state_id INT NOT NULL,
    district_code VARCHAR(10) UNIQUE,
    district_name VARCHAR(100) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (state_id) REFERENCES states(state_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    UNIQUE KEY uk_state_district (state_id, district_name),
    INDEX idx_state_id (state_id),
    INDEX idx_district_name (district_name),
    INDEX idx_active (is_active)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Districts/Cities under each state';

-- =====================================================
-- INSERT INDIAN STATES (28 States + 8 Union Territories)
-- =====================================================

INSERT INTO states (state_code, state_name) VALUES
('AP', 'Andhra Pradesh'),
('AR', 'Arunachal Pradesh'),
('AS', 'Assam'),
('BR', 'Bihar'),
('CG', 'Chhattisgarh'),
('GA', 'Goa'),
('GJ', 'Gujarat'),
('HR', 'Haryana'),
('HP', 'Himachal Pradesh'),
('JK', 'Jammu and Kashmir'),
('JH', 'Jharkhand'),
('KA', 'Karnataka'),
('KL', 'Kerala'),
('MP', 'Madhya Pradesh'),
('MH', 'Maharashtra'),
('MN', 'Manipur'),
('ML', 'Meghalaya'),
('MZ', 'Mizoram'),
('NL', 'Nagaland'),
('OR', 'Odisha'),
('PB', 'Punjab'),
('RJ', 'Rajasthan'),
('SK', 'Sikkim'),
('TN', 'Tamil Nadu'),
('TR', 'Tripura'),
('UP', 'Uttar Pradesh'),
('UK', 'Uttarakhand'),
('WB', 'West Bengal'),
-- Union Territories
('AN', 'Andaman and Nicobar Islands'),
('CG', 'Chandigarh'),
('DD', 'Daman and Diu'),
('DL', 'Delhi'),
('LD', 'Lakshadweep'),
('PY', 'Puducherry'),
('LA', 'Ladakh');

-- =====================================================
-- INSERT SAMPLE DISTRICTS (Major cities)
-- Add more districts as per requirement
-- =====================================================

-- Andhra Pradesh Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'AP'), 'Visakhapatnam'),
((SELECT state_id FROM states WHERE state_code = 'AP'), 'Krishna'),
((SELECT state_id FROM states WHERE state_code = 'AP'), 'Guntur'),
((SELECT state_id FROM states WHERE state_code = 'AP'), 'Chittoor'),
((SELECT state_id FROM states WHERE state_code = 'AP'), 'Anantapur'),
((SELECT state_id FROM states WHERE state_code = 'AP'), 'Nellore'),
((SELECT state_id FROM states WHERE state_code = 'AP'), 'Kadapa'),
((SELECT state_id FROM states WHERE state_code = 'AP'), 'Prakasam');

-- Delhi Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'DL'), 'Central Delhi'),
((SELECT state_id FROM states WHERE state_code = 'DL'), 'East Delhi'),
((SELECT state_id FROM states WHERE state_code = 'DL'), 'West Delhi'),
((SELECT state_id FROM states WHERE state_code = 'DL'), 'North Delhi'),
((SELECT state_id FROM states WHERE state_code = 'DL'), 'South Delhi'),
((SELECT state_id FROM states WHERE state_code = 'DL'), 'New Delhi');

-- Maharashtra Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'MH'), 'Mumbai'),
((SELECT state_id FROM states WHERE state_code = 'MH'), 'Pune'),
((SELECT state_id FROM states WHERE state_code = 'MH'), 'Nagpur'),
((SELECT state_id FROM states WHERE state_code = 'MH'), 'Thane'),
((SELECT state_id FROM states WHERE state_code = 'MH'), 'Nashik'),
((SELECT state_id FROM states WHERE state_code = 'MH'), 'Aurangabad'),
((SELECT state_id FROM states WHERE state_code = 'MH'), 'Kolhapur');

-- Karnataka Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'KA'), 'Bangalore'),
((SELECT state_id FROM states WHERE state_code = 'KA'), 'Mysore'),
((SELECT state_id FROM states WHERE state_code = 'KA'), 'Belgaum'),
((SELECT state_id FROM states WHERE state_code = 'KA'), 'Mangalore'),
((SELECT state_id FROM states WHERE state_code = 'KA'), 'Gulbarga'),
((SELECT state_id FROM states WHERE state_code = 'KA'), 'Belagavi');

-- Tamil Nadu Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'TN'), 'Chennai'),
((SELECT state_id FROM states WHERE state_code = 'TN'), 'Coimbatore'),
((SELECT state_id FROM states WHERE state_code = 'TN'), 'Madurai'),
((SELECT state_id FROM states WHERE state_code = 'TN'), 'Salem'),
((SELECT state_id FROM states WHERE state_code = 'TN'), 'Tiruppur'),
((SELECT state_id FROM states WHERE state_code = 'TN'), 'Vellore');

-- Telangana Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'TR'), 'Hyderabad'),
((SELECT state_id FROM states WHERE state_code = 'TR'), 'Warangal'),
((SELECT state_id FROM states WHERE state_code = 'TR'), 'Nizamabad'),
((SELECT state_id FROM states WHERE state_code = 'TR'), 'Karimnagar');

-- Uttar Pradesh Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'UP'), 'Lucknow'),
((SELECT state_id FROM states WHERE state_code = 'UP'), 'Kanpur'),
((SELECT state_id FROM states WHERE state_code = 'UP'), 'Varanasi'),
((SELECT state_id FROM states WHERE state_code = 'UP'), 'Agra'),
((SELECT state_id FROM states WHERE state_code = 'UP'), 'Allahabad'),
((SELECT state_id FROM states WHERE state_code = 'UP'), 'Meerut'),
((SELECT state_id FROM states WHERE state_code = 'UP'), 'Ghaziabad');

-- Rajasthan Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'RJ'), 'Jaipur'),
((SELECT state_id FROM states WHERE state_code = 'RJ'), 'Jodhpur'),
((SELECT state_id FROM states WHERE state_code = 'RJ'), 'Ajmer'),
((SELECT state_id FROM states WHERE state_code = 'RJ'), 'Bikaner'),
((SELECT state_id FROM states WHERE state_code = 'RJ'), 'Alwar'),
((SELECT state_id FROM states WHERE state_code = 'RJ'), 'Udaipur');

-- Gujarat Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'GJ'), 'Ahmedabad'),
((SELECT state_id FROM states WHERE state_code = 'GJ'), 'Surat'),
((SELECT state_id FROM states WHERE state_code = 'GJ'), 'Vadodara'),
((SELECT state_id FROM states WHERE state_code = 'GJ'), 'Rajkot'),
((SELECT state_id FROM states WHERE state_code = 'GJ'), 'Jamnagar'),
((SELECT state_id FROM states WHERE state_code = 'GJ'), 'Bhavnagar');

-- Punjab Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'PB'), 'Chandigarh'),
((SELECT state_id FROM states WHERE state_code = 'PB'), 'Amritsar'),
((SELECT state_id FROM states WHERE state_code = 'PB'), 'Ludhiana'),
((SELECT state_id FROM states WHERE state_code = 'PB'), 'Jalandhar'),
((SELECT state_id FROM states WHERE state_code = 'PB'), 'Patiala');

-- Haryana Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'HR'), 'Faridabad'),
((SELECT state_id FROM states WHERE state_code = 'HR'), 'Gurgaon'),
((SELECT state_id FROM states WHERE state_code = 'HR'), 'Hisar'),
((SELECT state_id FROM states WHERE state_code = 'HR'), 'Rohtak'),
((SELECT state_id FROM states WHERE state_code = 'HR'), 'Yamuna Nagar');

-- Himachal Pradesh Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'HP'), 'Shimla'),
((SELECT state_id FROM states WHERE state_code = 'HP'), 'Kangra'),
((SELECT state_id FROM states WHERE state_code = 'HP'), 'Solan'),
((SELECT state_id FROM states WHERE state_code = 'HP'), 'Mandi');

-- Bihar Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'BR'), 'Patna'),
((SELECT state_id FROM states WHERE state_code = 'BR'), 'Gaya'),
((SELECT state_id FROM states WHERE state_code = 'BR'), 'Madhubani'),
((SELECT state_id FROM states WHERE state_code = 'BR'), 'East Champaran'),
((SELECT state_id FROM states WHERE state_code = 'BR'), 'Darbhanga');

-- West Bengal Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'WB'), 'Kolkata'),
((SELECT state_id FROM states WHERE state_code = 'WB'), 'Howrah'),
((SELECT state_id FROM states WHERE state_code = 'WB'), 'Darjeeling'),
((SELECT state_id FROM states WHERE state_code = 'WB'), 'Hooghly'),
((SELECT state_id FROM states WHERE state_code = 'WB'), 'Midnapore');

-- Odisha Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'OR'), 'Bhubaneswar'),
((SELECT state_id FROM states WHERE state_code = 'OR'), 'Cuttack'),
((SELECT state_id FROM states WHERE state_code = 'OR'), 'Rourkela'),
((SELECT state_id FROM states WHERE state_code = 'OR'), 'Balasore');

-- Jharkhand Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'JH'), 'Ranchi'),
((SELECT state_id FROM states WHERE state_code = 'JH'), 'Dhanbad'),
((SELECT state_id FROM states WHERE state_code = 'JH'), 'Giridih'),
((SELECT state_id FROM states WHERE state_code = 'JH'), 'East Singhbhum');

-- Madhya Pradesh Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'MP'), 'Bhopal'),
((SELECT state_id FROM states WHERE state_code = 'MP'), 'Indore'),
((SELECT state_id FROM states WHERE state_code = 'MP'), 'Gwalior'),
((SELECT state_id FROM states WHERE state_code = 'MP'), 'Jabalpur'),
((SELECT state_id FROM states WHERE state_code = 'MP'), 'Ujjain');

-- Chhattisgarh Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'CG'), 'Raipur'),
((SELECT state_id FROM states WHERE state_code = 'CG'), 'Bilaspur'),
((SELECT state_id FROM states WHERE state_code = 'CG'), 'Durg'),
((SELECT state_id FROM states WHERE state_code = 'CG'), 'Rajnandgaon');

-- Kerala Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'KL'), 'Thiruvananthapuram'),
((SELECT state_id FROM states WHERE state_code = 'KL'), 'Kochi'),
((SELECT state_id FROM states WHERE state_code = 'KL'), 'Kozhikode'),
((SELECT state_id FROM states WHERE state_code = 'KL'), 'Thrissur'),
((SELECT state_id FROM states WHERE state_code = 'KL'), 'Ernakulam');

-- Assam Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'AS'), 'Guwahati'),
((SELECT state_id FROM states WHERE state_code = 'AS'), 'Silchar'),
((SELECT state_id FROM states WHERE state_code = 'AS'), 'Dibrugarh'),
((SELECT state_id FROM states WHERE state_code = 'AS'), 'Barpeta');

-- Goa Districts
INSERT INTO districts (state_id, district_name) VALUES
((SELECT state_id FROM states WHERE state_code = 'GA'), 'Panaji'),
((SELECT state_id FROM states WHERE state_code = 'GA'), 'Margao'),
((SELECT state_id FROM states WHERE state_code = 'GA'), 'North Goa'),
((SELECT state_id FROM states WHERE state_code = 'GA'), 'South Goa');
