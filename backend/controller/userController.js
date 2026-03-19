const express = require('express');
const connection = require('../connection');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const signup = async (req, res) => {
    const user = req.body;
    query = "SELECT * FROM user where userName=? or email=?";
    connection.query(query, [user.userName, user.email], (error, results) => {
        try {
            if (results.length > 0) {
                const existing = results[0];
                if (existing.userName === user.userName && existing.email === user.email) {
                    return res.status(400).json({
                        message: "User Name and Email is already exists"
                    })
                } else if (existing.userName === user.userName) {
                    return res.status(400).json({
                        message: "User Name is already exists"
                    })
                } else if (existing.email === user.email) {
                    return res.status(400).json({
                        message: "Email is already exists"
                    })
                }
            }

            if (results.length <= 0) {

                query = "INSERT INTO `user` (userName, password, email, contactNumber, firstName, lastName, dateRegistered, lastLogin, role, Status) VALUES (?,?,?,?,?,?,?,?,?,?)";
                connection.query(query, [user.userName, user.password, user.email, user.contactNumber, user.firstName, user.lastName, user.dateRegistered, user.lastLogin, user.role, user.Status], (error, results) => {
                    if (error) {
                        // console.error("INSERT Error:", error);
                        return res.status(500).json({
                            message: "Insert failed",
                            error: error.message
                        });
                    } else {
                        return res.status(200).json({
                            message: "Record updated Successfully"
                        })
                    }
                })
            } else {
                return res.status(400).json({
                    message: "Email or User Name already exists"
                })
            }
        } catch (error) {
            return res.status(500).json(error);
        }
    })
}

const getAllUser = async (req, res) => {
    query = "SELECT * FROM user";
    connection.query(query, (error, results) => {
        try {
            // console.log("result", results)
            if (results.length <= 0) {
                return res.status(400).json({
                    message: "No records found"
                })
            }
            return res.status(200).json(results)
        } catch (error) {
            return res.status(500).json(error);
        }
    })
}

const login = async (req, res) => {
    const user = req.body;
    // console.log('login:', user);
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
                const response = { userId: existing.userId, userName: existing.userName, role: existing.role }
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
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});

const forgotPassword = async (req, res) => {
    const user = req.body;
    // console.log('forgot:', user);
    query = "SELECT * FROM user WHERE userName=? or email=?";
    connection.query(query, [user.userName, user.email], (error, results) => {
        try {
            if (results.length <= 0) {
                return res.status(401).json({
                    message: "User Name is not found, please register the User Name"
                })
            } else {
                var mailOptions = {
                    from: 'timecablevision@gmail.com',
                    to: results[0].email,
                    subject: 'Password Reset',
                    html: '<p>Your login details Email:</p>' + results[0].email + '<p>Passord:</p>' + results[0].password + '<a href="http://local:4200>Click to Login</a>'
                };
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log(error)
                    } else {
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
const changePassword = async (req, res) => {
    const user = req.body;
    const userName = res.locals.userName;

    query = "SELECT * FROM user where userName=? and password=?"
    connection.query(query, [userName, user.oldPassword], (error, results) => {
        try {
            if (results.length <= 0) {
                return res.status(401).json({
                    message: "Incorrect Password, please enter correct Password"
                })
            }
            if (results[0].password === user.oldPassword) {
                query = "UPDATE user SET password=? WHERE userName=?";
                connection.query(query, [user.newPassword, userName], (error, results) => {
                    try {
                        return res.status(200).json({
                            message: "Password updated successfully"
                        })
                    } catch (error) {
                        return res.status(500).json(error);
                    }
                })
            } else {
                return res.status(400).json({
                    message: "Some thing went wrorng, please try some time later"
                })
            }
        } catch (error) {
            return res.status(500).json(error);
        }
    })
}

const editUser = async (req, res) => {
    const user = req.body;
    const userId = user.userId;
    query = `SELECT * FROM user WHERE (userName = ? OR email = ?)  AND userId != ?`;
    connection.query(query, [user.userName, user.email, userId], (error, results) => {
        if (error) {
            return res.status(500).json({
                message: 'User not found'
            })
        }
        try {
            // if (results.length > 0) {
            if (results.length > 0) {
                const existing = results[0];

                if (existing.userName === user.userName) {
                    return res.status(409).json({
                        message: "User Name already exists, try another"
                    });
                }

                if (existing.email === user.email) {
                    return res.status(409).json({
                        message: "Email already exists, try another"
                    });
                }
            }
             query = "UPDATE user SET  userName=?, password=?, email=?, contactNumber=?,firstName=?,lastName=?, dateRegistered=?,lastLogin=?, role=?, Status=? WHERE userId=?";
                connection.query(query, [user.userName, user.password, user.email, user.contactNumber, user.firstName, user.lastName, user.dateRegistered, user.lastLogin, user.role, user.Status, userId], (error, results) => {
                    if (error) {
                        return res.status(500).json(error);
                    }

                    return res.status(200).json({
                        message: "User record updated successfully"
                    });
                });

            // } else {
            //     return res.status(403).json({ message: "Unauthorized to edit this user" });
            // }
        } catch (error) {
            return res.status(500).json(error);
        }

    })
}
module.exports = { login, forgotPassword, changePassword, signup, getAllUser, editUser }