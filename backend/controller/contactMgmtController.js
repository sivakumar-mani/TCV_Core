const express = require('express');
const connection = require('../connection');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const getCustomer = async(req, res)=>{
    try {
        const [ rowData] = await connection.promise().query(
            "SELECT * FROM supplier ORDER BY supplier_id"
        )
        if(rowData.length === 0){
            return res.status(404).json({
                message : "No supplier Found"
            })
        }
        return res.status(200).json(rowData);
        
    } catch (error) {
        return res.status(500).json({
            error: error.message
        })
    }
}

module.exports ={ getCustomer}