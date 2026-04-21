CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(150) NOT NULL,
    parent_id INT NULL,
    level INT DEFAULT 1,
    slug VARCHAR(200),
    status TINYINT DEFAULT 1,
    sort_order    SMALLINT UNSIGNED   NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,    
    FOREIGN KEY (parent_id) REFERENCES categories(category_id)
);

Insert Example

-- Top level
INSERT INTO categories (category_name, parent_id, level)
VALUES ('CCTV', NULL, 1);

-- Sub level
INSERT INTO categories (category_name, parent_id, level)
VALUES ('Cameras', 1, 2);

-- Child level
INSERT INTO categories (category_name, parent_id, level)
VALUES ('IP Camera', 5, 3);

Query to get TOP parent:

WITH RECURSIVE category_tree AS (
    SELECT category_id, category_name, parent_id
    FROM categories
    WHERE category_id = 7   -- selected category (IP Camera)

    UNION ALL

    SELECT c.category_id, c.category_name, c.parent_id
    FROM categories c
    INNER JOIN category_tree ct ON ct.parent_id = c.category_id
)
SELECT * FROM category_tree WHERE parent_id IS NULL;


claude 
-- ============================================
-- Category hierarchy table (3-level deep)
-- Supports: CCTV, CATV, Internet, Solar, Other
-- ============================================

CREATE TABLE categories (
  id            INT UNSIGNED        NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)        NOT NULL,
  slug          VARCHAR(120)        NOT NULL,
  description   TEXT               DEFAULT NULL,
  parent_id     INT UNSIGNED        DEFAULT NULL,
  top_parent_id INT UNSIGNED        DEFAULT NULL,
  level         TINYINT UNSIGNED    NOT NULL DEFAULT 1,
  sort_order    SMALLINT UNSIGNED   NOT NULL DEFAULT 0,
  is_active     TINYINT(1)          NOT NULL DEFAULT 1,
  icon          VARCHAR(100)        DEFAULT NULL,
  created_at    TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY  uq_slug (slug),
  KEY         idx_parent   (parent_id),
  KEY         idx_top      (top_parent_id),
  KEY         idx_level    (level),

  CONSTRAINT fk_cat_parent
    FOREIGN KEY (parent_id)
    REFERENCES categories (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================
-- Seed: Level 1 — top-level categories
-- top_parent_id = own id for root nodes
-- ============================================

INSERT INTO categories (name, slug, level, parent_id, top_parent_id, sort_order) VALUES
  ('CCTV',     'cctv',     1, NULL, NULL, 1),
  ('CATV',     'catv',     1, NULL, NULL, 2),
  ('Internet', 'internet', 1, NULL, NULL, 3),
  ('Solar',    'solar',    1, NULL, NULL, 4),
  ('Other',    'other',    1, NULL, NULL, 5);

-- After insert, set top_parent_id = own id for root rows
UPDATE categories SET top_parent_id = id WHERE parent_id IS NULL;


-- ============================================
-- Trigger: auto-fill top_parent_id on INSERT
-- ============================================

DELIMITER $$
CREATE TRIGGER trg_cat_before_insert
BEFORE INSERT ON categories
FOR EACH ROW
BEGIN
  IF NEW.parent_id IS NULL THEN
    -- root node: top_parent_id set after insert via UPDATE
    SET NEW.level = 1;
    SET NEW.top_parent_id = NULL;
  ELSE
    SET NEW.level = (
      SELECT level + 1 FROM categories WHERE id = NEW.parent_id
    );
    SET NEW.top_parent_id = (
      SELECT COALESCE(top_parent_id, id)
      FROM   categories
      WHERE  id = NEW.parent_id
    );
  END IF;
END$$
DELIMITER ;