const express = require('express');
const connection = require('../connection');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const createCategory = async (req, res) => {
  try {
    const { category_name, parent_id, level, slug, status, sort_order } = req.body;

    // ✅ If parent_id is provided, verify it exists first
    // if (parent_id !== null && parent_id !== undefined) {
      const [parentRows] = await connection.promise().query(
        'SELECT category_id FROM categories WHERE category_id = ?',
        [parent_id]
      );

      if (parentRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Parent category with id ${parent_id} does not exist`
        });
      }
    // }

    const [result] = await connection.promise().query(
      `INSERT INTO categories 
        (category_name, parent_id, level, slug, status, sort_order, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [category_name, parent_id ?? null, level, slug, status, sort_order]
    );

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category_id: result.insertId }
    });

  } catch (error) {
    // ✅ Catch FK constraint error as fallback
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        success: false,
        message: 'Parent category does not exist. Please provide a valid parent_id.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error
    });
  }
};

const addCategory = async (req, res)=>{
    try {
        const { category_name, parent_id, level, status, sort_order } = req.body;

        const [results] = await connection.promise().query(
            `SELECT * FROM categories 
         WHERE category_name = ? 
         AND (parent_id = ? OR (parent_id IS NULL AND ? IS NULL))`,
            [category_name, parent_id, parent_id]
        );

        if (results.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Category already exists under this parent"
            });
        }

        await connection.promise().query(
            `INSERT INTO categories 
        (category_name, parent_id, level,slug, status, sort_order, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?,?, NOW(),NOW())`,
            [category_name, parent_id, level, category_name, status, sort_order]
        );

        return res.status(201).json({
            success: true,
            message: "Category created successfully"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error
        });
    }

}
const getCategory = async (req, res) => {
  try {
    const query = `
      SELECT JSON_OBJECT(
        'category_id', p.category_id,
        'category_name', p.category_name,
        'parent_id', p.parent_id,
        'level', p.level,
        'slug', p.slug,
        'status', p.status,
        'sort_order', p.sort_order,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'children', (
          SELECT COALESCE(
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'category_id', c.category_id,
                'category_name', c.category_name,
                'parent_id', c.parent_id,
                'level', c.level,
                'slug', c.slug,
                'status', c.status,
                'sort_order', c.sort_order,
                'created_at', c.created_at,
                'updated_at', c.updated_at,
                'children', (
                  SELECT COALESCE(
                    JSON_ARRAYAGG(
                      JSON_OBJECT(
                        'category_id', s.category_id,
                        'category_name', s.category_name,
                        'parent_id', s.parent_id,
                        'level', s.level,
                        'slug', s.slug,
                        'status', s.status,
                        'sort_order', s.sort_order,
                        'created_at', s.created_at,
                        'updated_at', s.updated_at
                      )
                    ),
                    JSON_ARRAY()
                  )
                  FROM categories s
                  WHERE s.parent_id = c.category_id
                )
              )
            ),
            JSON_ARRAY()
          )
          FROM categories c
          WHERE c.parent_id = p.category_id
        )
      ) AS category_tree
      FROM categories p
      WHERE p.parent_id IS NULL
      ORDER BY p.sort_order;
    `;

    const [rows] = await connection.promise().query(query);

    const result = rows.map(row => {
      const data = row.category_tree;
      return typeof data === 'string' ? JSON.parse(data) : data;
    });

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories'
    });
  }
};
const express = require('express');
const connection = require('../connection');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const createCategoryBulk = async (req, res) => {
  const categories = Array.isArray(req.body) ? req.body : [req.body];
  const connection_p = connection.promise();

  try {
    await connection_p.query('START TRANSACTION');

    const idMap = {}; // tracks slug -> new real category_id

    for (const cat of categories) {
      const { category_name, parent_id, level, slug, status, sort_order } = cat;

      // Resolve parent_id from idMap if it was just inserted in this batch
      let resolvedParentId = parent_id ?? null;

      if (resolvedParentId !== null) {
        // Check if parent exists in DB
        const [parentRows] = await connection_p.query(
          'SELECT category_id FROM categories WHERE category_id = ?',
          [resolvedParentId]
        );

        if (parentRows.length === 0) {
          await connection_p.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Parent category with id ${resolvedParentId} does not exist for "${category_name}"`
          });
        }
      }

      const [result] = await connection_p.query(
        `INSERT INTO categories 
          (category_name, parent_id, level, slug, status, sort_order, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [category_name, resolvedParentId, level, slug, status, sort_order]
      );

      idMap[result.insertId] = result.insertId;
    }

    await connection_p.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `${categories.length} category(ies) created successfully`
    });

  } catch (error) {
    await connection_p.query('ROLLBACK');

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        success: false,
        message: 'A parent_id reference does not exist. Insert parent categories first.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error
    });
  }
};

const addCategory = async (req, res)=>{
    try {
        const { category_name, parent_id, level, status, sort_order } = req.body;

        const [results] = await connection.promise().query(
            `SELECT * FROM categories 
         WHERE category_name = ? 
         AND (parent_id = ? OR (parent_id IS NULL AND ? IS NULL))`,
            [category_name, parent_id, parent_id]
        );

        if (results.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Category already exists under this parent"
            });
        }

        await connection.promise().query(
            `INSERT INTO categories 
        (category_name, parent_id, level,slug, status, sort_order, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?,?, NOW(),NOW())`,
            [category_name, parent_id, level, category_name, status, sort_order]
        );

        return res.status(201).json({
            success: true,
            message: "Category created successfully"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error
        });
    }

}
const getCategory = async (req, res) => {
  try {
    const query = `
      SELECT JSON_OBJECT(
        'category_id', p.category_id,
        'category_name', p.category_name,
        'parent_id', p.parent_id,
        'level', p.level,
        'slug', p.slug,
        'status', p.status,
        'sort_order', p.sort_order,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'children', (
          SELECT COALESCE(
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'category_id', c.category_id,
                'category_name', c.category_name,
                'parent_id', c.parent_id,
                'level', c.level,
                'slug', c.slug,
                'status', c.status,
                'sort_order', c.sort_order,
                'created_at', c.created_at,
                'updated_at', c.updated_at,
                'children', (
                  SELECT COALESCE(
                    JSON_ARRAYAGG(
                      JSON_OBJECT(
                        'category_id', s.category_id,
                        'category_name', s.category_name,
                        'parent_id', s.parent_id,
                        'level', s.level,
                        'slug', s.slug,
                        'status', s.status,
                        'sort_order', s.sort_order,
                        'created_at', s.created_at,
                        'updated_at', s.updated_at
                      )
                    ),
                    JSON_ARRAY()
                  )
                  FROM categories s
                  WHERE s.parent_id = c.category_id
                )
              )
            ),
            JSON_ARRAY()
          )
          FROM categories c
          WHERE c.parent_id = p.category_id
        )
      ) AS category_tree
      FROM categories p
      WHERE p.parent_id IS NULL
      ORDER BY p.sort_order;
    `;

    const [rows] = await connection.promise().query(query);

    const result = rows.map(row => {
      const data = row.category_tree;
      return typeof data === 'string' ? JSON.parse(data) : data;
    });

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories'
    });
  }
};

module.exports = {getCategory, addCategory, createCategoryBulk }
module.exports = {getCategory, addCategory, createCategory }
