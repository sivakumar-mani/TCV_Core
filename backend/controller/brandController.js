const express = require('express');
const connection = require('../connection');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const addBrand = async (req, res) => {
    const brand = req.body;
    query = "select * from brands WHERE brand_name=?"
    connection.query(query, [brand.brand_name], (error, results) => {
        if (error) {
            return res.status(500).json(error);
        }
        if (results.length > 0) {
            const existing = results[0];
            if (brand.brand_name.toLowerCase() === existing.brand_name.toLowerCase()) {
                return res.status(409).json({
                    message: "Brand is already available, Please add another"
                })
            }
        }
        if (results.length <= 0) {

            function getShortCode(brandName, maxId) {
                const shortCode = brandName.trim().split(/\s+/).filter(Boolean);
                let prefix = '';
                console.log("shortCode", shortCode, "-prefix", prefix);
                if (shortCode.length === 1) {
                    const sCode = shortCode[0];
                    if (sCode.length <= 4) {
                        prefix = sCode.toUpperCase();
                    } else {
                        const constants = sCode.replace(/[aeiou]/gi, '');
                        prefix = constants.length >= 3 ? sCode + constants.slice(1, 4).toUpperCase().slice(0, 4) :
                            sCode.slice(0, 4).toUpperCase();
                    }
                } else if (shortCode.length === 2) {
                    prefix = (shortCode[0].slice(0, 2).toUpperCase() + shortCode[1].slice(0, 2).toUpperCase());
                } else {
                    prefix = shortCode.map(sCode => shortCode[0]).join('').toUpperCase().slice(0, 5)
                }
                const sequence = (maxId ?? 0) + 1;
                return `${prefix}${String(sequence).padStart(3, 0)}`
            }


            getIdQuery = "select max(brand_id) as maxId  from brands";
            connection.query(getIdQuery, (error, data) => {
                if (error) {
                    return res.status(500).json(error);
                } else {
                    maxCode = data[0].maxId;
                    const brandCode = getShortCode(brand.brand_name, maxCode);
                    const status = 'ACTIVE';
                    const createdAt = new Date();
                    const updatedAt = new Date();
                    console.log(brand, brandCode, status, createdAt, updatedAt);
                    query = "INSERT INTO brands (brand_name, brand_code, description, status, created_at, updated_at) VALUES (?,?,?,?,?,?)";
                    connection.query(query, [brand.brand_name, brandCode, brand.description, status, createdAt, updatedAt], (error, results) => {
                        if (error) {
                            return res.status(500).json(error);
                        } else {
                            return res.status(200).json({
                                message: "Record added successfully"
                            })
                        }
                    })
                }

            })
        }
    })
}

const getBrands = async (req, res) => {
    const query = "SELECT * FROM brands";

    connection.query(query, (error, results) => {
        if (error) {
            console.error("Database error:", error); // log internally
            return res.status(500).json({ message: "Internal server error" });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "No brands found" });
        }

        return res.status(200).json(results);
    });
};

const deleteBrand = async (req, res) => {
    try {
        const { brand_id } = req.body;
        // Check if brand exists
        const [results] = await connection.promise().query(
            "SELECT * FROM brands WHERE brand_id = ?",
            [brand_id]
        );
      
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Brand not found"
            });
        }else {
            
        // Delete brand
        await connection.promise().query(
            "DELETE FROM brands WHERE brand_id = ?",
            [brand_id]
        );
        return res.status(200).json({
            success: true,
            message: "Record deleted successfully"
        });
        }

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

// this is passing the id via url to perform action 
// const deleteBrand = async (req, res) => {
//   try {
//     const { brand_id } = req.params;

//     // Step 1: Check if brand exists
//     const [existing] = await connection.promise().query(
//       "SELECT * FROM brands WHERE brand_id = ?",
//       [brand_id]
//     );

//     if (existing.length === 0) {
//       return res.status(404).json({ message: "Brand not found" });
//     }

//     // Step 2: Actually delete it
//     await connection.promise().query(
//       "DELETE FROM brands WHERE brand_id = ?",
//       [brand_id]
//     );

//     return res.status(200).json({ message: "Brand deleted successfully" });

//   } catch (error) {
//     console.error("Delete error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

const editBrand = async(req, res)=>{
    const brand = req.body;
    // console.log("test",brand )
    try {
        const { brand_id, brand_name, brand_code, description, status } = req.body;
        const [results] = await connection.promise().query(
            "SELECT * FROM brands where brand_id = ?",[brand_id]
        )

        // console.log("results.length", results.length);
        if( results.length === 0 ){
            return res.status(400).json({
                message: "Brand not found"
            })
        }
            await connection.promise().query(
                `UPDATE brands 
                     SET brand_name = ?, brand_code = ?, description = ?, status = ?,  updated_at = NOW()
                      WHERE brand_id = ?`,[brand_name, brand_code, description, status, brand_id]
            )
            return res.status(200).json({
                message: "Record Updated Successfully"
            })
        
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error", error
        })
    }
}

module.exports = { addBrand, getBrands, deleteBrand, editBrand }