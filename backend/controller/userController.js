const express = require('express');
const connection = require('../connection');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer')

const login = async (req, res) => {
    const user = req.body;
      console.log('login:',user);
    query = "SELECT * FROM user WHERE userName=?";
    connection.query(query, [user.userName], (error, results) => {
        try {
            const existing = results[0];  
            if (results.length <= 0 || user.password != existing.password) {
                return res.status(401).json({
                    message: "Wrong user name or password, Please provide correct one"
                })
            } else if (existing.Status === 'false') {
                return res.status(401).json({
                    message: "Waiting for admin approval"
                })
            } else if (existing.password === user.password) {
                const response = { userName: existing.userName, role: existing.role }
                const accessToken = jwt.sign(response, process.env.ACCESS_TOKEN, { expiresIn: '8h' })
                return res.status(200).json({
                    result: true,
                    token: accessToken,
                    message: "Logged in"
                })
            } else {
                return res.status(400).json({
                    message: "Something went wrong please try again"
                })
            }

        } catch (error) {
            return res.status(500).json(error);
        }
    })
}

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth:{
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});

const forgotPassword = async(req,res)=>{
    
    const user = req.body;
    console.log('forgot:',user);
    query = "SELECT * FROM user WHERE userName=? or email=?";
     connection.query(query, [user.userName, user.email], (error, results) => {
        try {
            if(results.length <=0){
            return res.status(401).json({
                message: "User Name is not found, please register the User Name"
            })
        }else {
            var mailOptions ={
                from: 'timecablevision@gmail.com',
                to: results[0].email,
                subject: 'Password Reset',
                html: '<p>Your login details Email:</p>' + results[0].email + '<p>Passord:</p>' + results[0].password + '<a href="http://local:4200>Click to Login</a>'
            };
            transporter.sendMail(mailOptions,(error, info)=>{
                if(error){
                    console.log(error)
                }else {
                    console.log("Email send successfull", info.response)
                }
            });
            return res.status(200).json({
                message: "Password sent successfull to your email id"
            })
        }
        } catch (error) {
            return res.status(500).json(error);
        }
    })
}

module.exports = { login, forgotPassword }