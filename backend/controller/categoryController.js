const express = require('express');
const connection = require('../connection');
require('dotenv').config();
const jwt = require('jsonwebtoken');


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

module.exports = { addCategory }