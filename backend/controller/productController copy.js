const express = require('express');
const connection = require('../connection');
require('dotenv').config();
const jwt = require('jsonwebtoken');


const getProducts = async (req, res) => {

    try {

        const sql = `
            SELECT 
                p.product_id,
                p.product_name,
                p.product_code,
                p.description,
                p.price,
                p.stock_qty,
                p.status,
                p.created_at,

                b.brand_id,
                b.brand_name,

                c.category_id,

                CONCAT_WS(' > ',
                    c1.category_name,
                    c2.category_name,
                    c3.category_name,
                    c4.category_name
                ) AS category_path

            FROM products p

            LEFT JOIN brands b
                ON b.brand_id = p.brand_id

            -- LAST LEVEL CATEGORY
            LEFT JOIN categories c4
                ON c4.category_id = p.category_id

            -- LEVEL 3
            LEFT JOIN categories c3
                ON c3.category_id = c4.parent_id

            -- LEVEL 2
            LEFT JOIN categories c2
                ON c2.category_id = c3.parent_id

            -- LEVEL 1
            LEFT JOIN categories c1
                ON c1.category_id = c2.parent_id

            ORDER BY p.product_id DESC
        `;

        const [rows] = await connection.query(sql);

        res.status(200).json({
            success: true,
            message: 'Products fetched successfully',
            data: rows
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error.message
        });

    }

};
// CREATE PRODUCT
router.post('/add', async (req, res) => {
  try {
    const {
      product_name,
      brand_id,
      category_id,
      product_code,
      description,
      price,
      stock_qty
    } = req.body;

    const sql = `
      INSERT INTO products 
      (product_name, brand_id, category_id, product_code, description, price, stock_qty)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(sql, [
      product_name,
      brand_id,
      category_id,
      product_code,
      description,
      price,
      stock_qty
    ]);

    res.json({ success: true, message: 'Product added' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET PRODUCTS
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, b.brand_name, c.category_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      ORDER BY p.product_id DESC
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// UPDATE PRODUCT
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const {
      product_name,
      brand_id,
      category_id,
      product_code,
      description,
      price,
      stock_qty,
      status
    } = req.body;

    const sql = `
      UPDATE products SET
      product_name=?,
      brand_id=?,
      category_id=?,
      product_code=?,
      description=?,
      price=?,
      stock_qty=?,
      status=?
      WHERE product_id=?
    `;

    await db.query(sql, [
      product_name,
      brand_id,
      category_id,
      product_code,
      description,
      price,
      stock_qty,
      status,
      id
    ]);

    res.json({ success: true, message: 'Updated' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// DELETE PRODUCT
router.delete('/:id', async (req, res) => {
  try {
    await db.query("DELETE FROM products WHERE product_id=?", [req.params.id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = {getProducts};