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

const getDescriptionWordCount = (value = '') => {
    return value.trim().split(/\s+/).filter(Boolean).length;
};

const validateBrandPayload = ({ brand_name, brand_code, description }) => {
    if (!brand_name || !brand_name.trim()) {
        return "Brand name is required";
    }

    if (!brand_code || !brand_code.trim()) {
        return "Brand code is required";
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(brand_code)) {
        return "Brand code must be slug format, e.g. hikvision or cp-plus";
    }

    if (!description || description.trim().length < 10) {
        return "Description must be at least 10 characters";
    }

    if (getDescriptionWordCount(description) > 200) {
        return "Description cannot exceed 200 words";
    }

    return null;
};

const isValidStatus = (status) => ['ACTIVE', 'INACTIVE'].includes(status);

const addBrand = async (req, res) => {
    try {
        const brand_name = req.body.brand_name?.trim();
        const brand_code = slugify(req.body.brand_code || brand_name || '');
        const description = req.body.description?.trim();
        const status = req.body.status || 'ACTIVE';

        const validationError = validateBrandPayload({ brand_name, brand_code, description });
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        if (!isValidStatus(status)) {
            return res.status(400).json({ message: "Invalid brand status" });
        }

        const [existing] = await connection.promise().query(
            `SELECT brand_id, brand_name, brand_code
             FROM brands
             WHERE LOWER(brand_name) = LOWER(?) OR LOWER(brand_code) = LOWER(?)`,
            [brand_name, brand_code]
        );

        if (existing.some((brand) => brand.brand_name.toLowerCase() === brand_name.toLowerCase())) {
            return res.status(409).json({ message: "Brand name already exists" });
        }

        if (existing.some((brand) => brand.brand_code?.toLowerCase() === brand_code.toLowerCase())) {
            return res.status(409).json({ message: "Brand code already exists" });
        }

        const [result] = await connection.promise().query(
            `INSERT INTO brands (brand_name, brand_code, description, status)
             VALUES (?, ?, ?, ?)`,
            [brand_name, brand_code, description, status]
        );

        return res.status(201).json({
            success: true,
            message: "Brand added successfully",
            brand_id: result.insertId
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

const getBrands = async (req, res) => {
    try {
        const [rows] = await connection.promise().query(
            "SELECT * FROM brands ORDER BY brand_id DESC"
        );

        return res.status(200).json(rows);
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

const deleteBrand = async (req, res) => {
    try {
        const brand_id = req.body.brand_id || req.params.brand_id;

        if (!brand_id) {
            return res.status(400).json({
                success: false,
                message: "brand_id is required"
            });
        }

        const [results] = await connection.promise().query(
            "SELECT brand_id FROM brands WHERE brand_id = ?",
            [brand_id]
        );

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Brand not found"
            });
        }

        await connection.promise().query(
            "DELETE FROM brands WHERE brand_id = ?",
            [brand_id]
        );

        return res.status(200).json({
            success: true,
            message: "Brand deleted successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

const editBrand = async (req, res) => {
    try {
        const brand_id = req.body.brand_id || req.params.brand_id;
        const brand_name = req.body.brand_name?.trim();
        const brand_code = slugify(req.body.brand_code || '');
        const description = req.body.description?.trim();
        const status = req.body.status || 'ACTIVE';

        if (!brand_id) {
            return res.status(400).json({ message: "brand_id is required" });
        }

        const validationError = validateBrandPayload({ brand_name, brand_code, description });
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        if (!isValidStatus(status)) {
            return res.status(400).json({ message: "Invalid brand status" });
        }

        const [current] = await connection.promise().query(
            "SELECT brand_id FROM brands WHERE brand_id = ?",
            [brand_id]
        );

        if (current.length === 0) {
            return res.status(404).json({ message: "Brand not found" });
        }

        const [existing] = await connection.promise().query(
            `SELECT brand_id, brand_name, brand_code
             FROM brands
             WHERE (LOWER(brand_name) = LOWER(?) OR LOWER(brand_code) = LOWER(?))
               AND brand_id != ?`,
            [brand_name, brand_code, brand_id]
        );

        if (existing.some((brand) => brand.brand_name.toLowerCase() === brand_name.toLowerCase())) {
            return res.status(409).json({ message: "Brand name already exists" });
        }

        if (existing.some((brand) => brand.brand_code?.toLowerCase() === brand_code.toLowerCase())) {
            return res.status(409).json({ message: "Brand code already exists" });
        }

        await connection.promise().query(
            `UPDATE brands
             SET brand_name = ?,
                 brand_code = ?,
                 description = ?,
                 status = ?,
                 updated_at = NOW()
             WHERE brand_id = ?`,
            [brand_name, brand_code, description, status, brand_id]
        );

        return res.status(200).json({
            success: true,
            message: "Brand updated successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

module.exports = { addBrand, getBrands, deleteBrand, editBrand };
