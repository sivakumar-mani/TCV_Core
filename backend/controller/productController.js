const connection = require('../connection');
require('dotenv').config();

const toNumber = (value, defaultValue = 0) => {
    if (value === null || typeof value === 'undefined' || value === '') {
        return defaultValue;
    }

    return Number(value);
};

const getProducts = async (req, res) => {
    const query = `
    WITH RECURSIVE category_tree AS (
        SELECT
            category_id,
            parent_id,
            category_name,
            CAST(category_name AS CHAR(1000)) AS category_path
        FROM categories
        WHERE parent_id IS NULL

        UNION ALL

        SELECT
            c.category_id,
            c.parent_id,
            c.category_name,
            CONCAT(ct.category_path, ' > ', c.category_name) AS category_path
        FROM categories c
        INNER JOIN category_tree ct
            ON ct.category_id = c.parent_id
    )
    SELECT 
        p.product_id,
        p.product_name,
        p.product_code,
        p.barcode,
        p.description,
        p.price,
        p.stock_qty,
        p.purchase_price,
        p.selling_price,
        p.gst_percent,
        p.hsn_code,
        p.unit,
        p.reorder_level,
        p.status,
        p.created_at,
        p.updated_at,

        b.brand_id,
        b.brand_name,

        p.category_id,
        ct.category_path

    FROM products p

    LEFT JOIN brands b
        ON b.brand_id = p.brand_id

    LEFT JOIN category_tree ct
        ON ct.category_id = p.category_id

    ORDER BY p.product_id DESC
`;

    connection.query(query, (error, results) => {
        if (error) {
            console.error("Database error:", error); // log internally
            return res.status(500).json({ message: "Internal server error" });
        }

        return res.status(200).json(results);
    });
};

const addProduct = async (req, res) => {
    try {

        const {
            product_name,
            brand_id,
            category_id,
            product_code,
            barcode,
            description,
            price,
            stock_qty,
            purchase_price,
            selling_price,
            gst_percent,
            hsn_code,
            unit,
            reorder_level,
            status
        } = req.body;

        // VALIDATION
        if (!product_name) {
            return res.status(400).json({
                success: false,
                message: 'Product name is required'
            });
        }

        if (!category_id) {
            return res.status(400).json({
                success: false,
                message: 'Category is required'
            });
        }

        // CHECK BRAND EXISTS
        if (brand_id) {

            const [brand] = await connection.promise().query(
                `SELECT brand_id 
                 FROM brands 
                 WHERE brand_id = ?`,
                [brand_id]
            );

            if (brand.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid brand'
                });
            }
        }

        // CHECK CATEGORY EXISTS
        const [category] = await connection.promise().query(
            `SELECT category_id 
             FROM categories 
             WHERE category_id = ?`,
            [category_id]
        );

        if (category.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category'
            });
        }

        // CHECK PRODUCT CODE ALREADY EXISTS
        if (product_code) {

            const [existingProduct] = await connection.promise().query(
                `SELECT product_id 
                 FROM products 
                 WHERE LOWER(product_code) = LOWER(?)`,
                [product_code]
            );

            if (existingProduct.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Product code already exists'
                });
            }
        }

        if (barcode) {

            const [existingBarcode] = await connection.promise().query(
                `SELECT product_id
                 FROM products
                 WHERE LOWER(barcode) = LOWER(?)`,
                [barcode]
            );

            if (existingBarcode.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Barcode already exists'
                });
            }
        }

        // INSERT PRODUCT
        const query = `
            INSERT INTO products (
                product_name,
                brand_id,
                category_id,
                product_code,
                barcode,
                description,
                price,
                stock_qty,
                purchase_price,
                selling_price,
                gst_percent,
                hsn_code,
                unit,
                reorder_level,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const sellingPrice = toNumber(selling_price, toNumber(price, 0));

        const values = [
            product_name,
            brand_id || null,
            category_id,
            product_code || null,
            barcode || null,
            description || null,
            sellingPrice,
            toNumber(stock_qty),
            toNumber(purchase_price),
            sellingPrice,
            toNumber(gst_percent),
            hsn_code || null,
            unit || 'PCS',
            toNumber(reorder_level),
            status || 'ACTIVE'
        ];

        const [result] = await connection.promise().query(query, values);

        return res.status(201).json({
            success: true,
            message: 'Product added successfully',
            product_id: result.insertId
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }

}
const updateProduct = async (req, res) => {
    try {
        const {
            product_id,
            product_name,
            brand_id,
            category_id,
            product_code,
            barcode,
            description,
            price,
            stock_qty,
            purchase_price,
            selling_price,
            gst_percent,
            hsn_code,
            unit,
            reorder_level,
            status
        } = req.body;

        if (!product_id) {
            return res.status(400).json({
                success: false,
                message: "product_id is required"
            });
        }

        const [existing] = await connection.promise().query(
            "SELECT * FROM products WHERE product_id = ?", [product_id]
        )

        if (existing.length === 0) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        if (product_code) {
            const [existingCode] = await connection.promise().query(
                `SELECT product_id
                 FROM products
                 WHERE LOWER(product_code) = LOWER(?)
                   AND product_id != ?`,
                [product_code, product_id]
            );

            if (existingCode.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Product code already exists'
                });
            }
        }

        if (barcode) {
            const [existingBarcode] = await connection.promise().query(
                `SELECT product_id
                 FROM products
                 WHERE LOWER(barcode) = LOWER(?)
                   AND product_id != ?`,
                [barcode, product_id]
            );

            if (existingBarcode.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Barcode already exists'
                });
            }
        }

        const sellingPrice = toNumber(selling_price, toNumber(price, 0));

        // Update query
        await connection.promise().query(
            `UPDATE products 
 SET  product_name = ?,
      brand_id = ?,
      category_id = ?,
      product_code = ?,
      barcode = ?,
      description = ?,
      price = ?,
      stock_qty = ?,
      purchase_price = ?,
      selling_price = ?,
      gst_percent = ?,
      hsn_code = ?,
      unit = ?,
      reorder_level = ?,
      status = ?,
      updated_at = NOW()
      WHERE product_id = ?`,
            [
                product_name,
                brand_id || null,
                category_id,
                product_code,
                barcode || null,
                description,
                sellingPrice,
                toNumber(stock_qty),
                toNumber(purchase_price),
                sellingPrice,
                toNumber(gst_percent),
                hsn_code || null,
                unit || 'PCS',
                toNumber(reorder_level),
                status || 'ACTIVE',
                product_id
            ]
        );

        res.json({ message: "Product updated successfully" });

    } catch (error) {
        return res.status(500).json({
            error: error.message
        })
    }


}

module.exports = { getProducts, addProduct, updateProduct };
