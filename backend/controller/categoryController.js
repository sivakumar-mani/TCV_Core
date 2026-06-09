const connection = require('../connection');
require('dotenv').config();

const slugify = (value) => {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const normalizeStatus = (status) => {
  if (status === 0 || status === '0' || status === false) return 0;
  return 1;
};

const assertUniqueCategory = async ({ categoryName, slug, excludeId = null }) => {
  const params = [categoryName, slug];
  let excludeClause = '';

  if (excludeId) {
    excludeClause = 'AND category_id != ?';
    params.push(excludeId);
  }

  const [existing] = await connection.promise().query(
    `SELECT category_id, category_name, slug
     FROM categories
     WHERE (LOWER(category_name) = LOWER(?) OR LOWER(slug) = LOWER(?))
       ${excludeClause}`,
    params
  );

  if (existing.some((category) => category.category_name.toLowerCase() === categoryName.toLowerCase())) {
    return "Category name already exists";
  }

  if (existing.some((category) => category.slug?.toLowerCase() === slug.toLowerCase())) {
    return "Category slug already exists";
  }

  return null;
};

const getParentLevel = async (parentId) => {
  if (!parentId) return 0;

  const [parent] = await connection.promise().query(
    "SELECT level FROM categories WHERE category_id = ?",
    [parentId]
  );

  if (parent.length === 0) {
    throw new Error("Invalid parent_id");
  }

  return parent[0].level;
};

const insertCategory = async ({ categoryName, parentId, status, sortOrder, description }) => {
  const name = categoryName.trim();
  const slug = slugify(name);
  const level = (await getParentLevel(parentId)) + 1;
  const uniqueError = await assertUniqueCategory({ categoryName: name, slug });

  if (uniqueError) {
    const error = new Error(uniqueError);
    error.statusCode = 409;
    throw error;
  }

  const [result] = await connection.promise().query(
    `INSERT INTO categories
     (category_name, parent_id, level, slug, description, status, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      name,
      parentId || null,
      level,
      slug,
      description || null,
      normalizeStatus(status),
      typeof sortOrder !== 'undefined' ? sortOrder : level
    ]
  );

  return {
    category_id: result.insertId,
    category_name: name,
    parent_id: parentId || null,
    level,
    slug
  };
};

const addCategory = async (req, res) => {
  try {
    const { category_name, parent_id, status, sort_order, description, level_names } = req.body;

    const names = Array.isArray(level_names)
      ? level_names.map((value) => value?.trim()).filter(Boolean)
      : [category_name?.trim()].filter(Boolean);

    if (names.length === 0) {
      return res.status(400).json({ message: "Category name is required" });
    }

    let nextParentId = parent_id || null;
    const created = [];

    for (const name of names) {
      const category = await insertCategory({
        categoryName: name,
        parentId: nextParentId,
        status,
        sortOrder: sort_order,
        description
      });
      created.push(category);
      nextParentId = category.category_id;
    }

    return res.status(201).json({
      success: true,
      message: created.length > 1 ? "Category levels added successfully" : "Category added successfully",
      data: created
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message, error: err.message });
  }
};

const getCategoriesTree = async (req, res) => {
  try {
    const [rows] = await connection.promise().query(
      `SELECT c.*,
              p.category_name AS parent_name
       FROM categories c
       LEFT JOIN categories p ON p.category_id = c.parent_id
       ORDER BY c.sort_order, c.category_name`
    );

    const buildTree = (data, parentId = null) => {
      return data
        .filter(item => item.parent_id === parentId)
        .map(item => ({
          ...item,
          children: buildTree(data, item.category_id)
        }));
    };

    return res.json(buildTree(rows));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getCatById = async (req, res) => {
  try {
    const categoryId = req.params.id;

    const [rows] = await connection.promise().query(
      `SELECT c.*,
              p.category_name AS parent_name
       FROM categories c
       LEFT JOIN categories p ON p.category_id = c.parent_id
       WHERE c.category_id = ?`,
      [categoryId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    return res.json({
      success: true,
      data: rows[0]
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { category_id, category_name, parent_id, status, sort_order, description } = req.body;

    if (!category_id) {
      return res.status(400).json({ message: "category_id is required" });
    }

    if (!category_name?.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const [existing] = await connection.promise().query(
      "SELECT * FROM categories WHERE category_id = ?",
      [category_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (category_id == parent_id) {
      return res.status(400).json({ message: "Category cannot be its own parent" });
    }

    const name = category_name.trim();
    const slug = slugify(name);
    const level = (await getParentLevel(parent_id)) + 1;
    const uniqueError = await assertUniqueCategory({ categoryName: name, slug, excludeId: category_id });

    if (uniqueError) {
      return res.status(409).json({ message: uniqueError });
    }

    await connection.promise().query(
      `UPDATE categories
       SET category_name = ?,
           parent_id = ?,
           level = ?,
           slug = ?,
           description = ?,
           status = ?,
           sort_order = ?,
           updated_at = NOW()
       WHERE category_id = ?`,
      [
        name,
        parent_id || null,
        level,
        slug,
        description || null,
        normalizeStatus(status),
        typeof sort_order !== 'undefined' ? sort_order : level,
        category_id
      ]
    );

    return res.json({ success: true, message: "Category updated successfully" });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message, error: err.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id || req.body.category_id;

    if (!categoryId) {
      return res.status(400).json({ message: "category_id is required" });
    }

    const [children] = await connection.promise().query(
      "SELECT category_id FROM categories WHERE parent_id = ? LIMIT 1",
      [categoryId]
    );

    if (children.length > 0) {
      return res.status(409).json({ message: "Category with child levels cannot be deleted" });
    }

    const [result] = await connection.promise().query(
      "DELETE FROM categories WHERE category_id = ?",
      [categoryId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.json({ success: true, message: "Category deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { addCategory, updateCategory, deleteCategory, getCatById, getCategoriesTree };
