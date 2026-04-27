const express = require('express');
const connection = require('../connection');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const addCategory = async (req, res) => {
  try {
    const { category_name, parent_id } = req.body;

    // calculate level automatically
    let level = 1;

    if (parent_id ) {
      const [parent] = await connection.promise().query(
        "SELECT level FROM categories WHERE category_id = ?",
        [parent_id]
      );

      if (parent.length === 0) {
        return res.status(400).json({ message: "Invalid parent_id" });
      }

      level = parent[0].level + 1;
    }

    const slug = category_name.toLowerCase().replace(/\s+/g, '-');
    const status ='Active';
   await connection.promise().query(
  `INSERT INTO categories 
   (category_name, parent_id, level, slug, status, sort_order, created_at, updated_at) 
   VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
  [
    category_name,
    parent_id || null,
    level,
    slug,
    1,
    0
  ]
);

    res.json({ message: "Category added successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const getCategoriesTree = async (req, res) => {
  try {
    const [rows] = await connection.promise().query(
      "SELECT * FROM categories WHERE status = 1 ORDER BY sort_order"
    );

    const buildTree = (data, parentId = null) => {
      return data
        .filter(item => item.parent_id === parentId)
        .map(item => ({
          ...item,
          children: buildTree(data, item.category_id)
        }));
    };

    const tree = buildTree(rows);
    res.json(tree);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { addCategory, getCategoriesTree }