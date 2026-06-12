const connection = require('../connection');
require('dotenv').config();

const getProducts = async (req, res) => {
    const query = `
    SELECT 
        p.product_id,
        p.product_name,
        p.product_code,
        p.description,
        p.selling_price AS price,
        0 AS stock_qty,
        p.purchase_price,
        p.selling_price,
        p.status,
        p.created_at,

        b.brand_id,
        b.brand_name,

        c4.category_id,

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
            description,
            price,
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

        // INSERT PRODUCT
        const query = `
            INSERT INTO products (
                product_name,
                brand_id,
                category_id,
                product_code,
                description,
                purchase_price,
                selling_price,
                gst_percent,
                hsn_code,
                unit,
                reorder_level,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            product_name,
            brand_id || null,
            category_id,
            product_code || null,
            description || null,
            purchase_price ?? 0,
            selling_price ?? price ?? 0,
            gst_percent ?? 0,
            hsn_code || null,
            unit || 'PCS',
            reorder_level ?? 0,
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
            description,
            price,
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
        // Update query
        await connection.promise().query(
            `UPDATE products 
 SET  product_name = ?,
      brand_id = ?,
      category_id = ?,
      product_code = ?,
      description = ?,
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
                description,
                purchase_price ?? 0,
                selling_price ?? price ?? 0,
                gst_percent ?? 0,
                hsn_code || null,
                unit || 'PCS',
                reorder_level ?? 0,
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
