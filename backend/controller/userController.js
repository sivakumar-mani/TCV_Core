const express = require('express');
const connection = require('../connection');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const normalizeUser = (body) => ({
    user_id: body.user_id ?? body.userId,
    username: body.username ?? body.userName,
    password: body.password,
    email: body.email,
    contact_number: body.contact_number ?? body.contactNumber,
    first_name: body.first_name ?? body.firstName,
    last_name: body.last_name ?? body.lastName,
    role: (body.role || 'ADMIN').toUpperCase(),
    status: body.status ?? body.Status ?? 1,
    date_registered: body.date_registered ?? body.dateRegistered,
    last_login: body.last_login ?? body.lastLogin
});

const mapUserRow = (user) => ({
    ...user,
    userId: user.user_id,
    userName: user.username,
    contactNumber: user.contact_number,
    firstName: user.first_name,
    lastName: user.last_name,
    dateRegistered: user.date_registered,
    lastLogin: user.last_login,
    Status: user.status
});

const signup = async (req, res) => {
    const user = normalizeUser(req.body);
    const query = 'SELECT * FROM users WHERE username = ? OR email = ?';

    connection.query(query, [user.username, user.email], (error, results) => {
        if (error) {
            return res.status(500).json(error);
        }

        try {
            if (results.length > 0) {
                const existing = results[0];
                if (existing.username === user.username && existing.email === user.email) {
                    return res.status(400).json({
                        message: 'User Name and Email is already exists'
                    });
                } else if (existing.username === user.username) {
                    return res.status(400).json({
                        message: 'User Name is already exists'
                    });
                } else if (existing.email === user.email) {
                    return res.status(400).json({
                        message: 'Email is already exists'
                    });
                }
            }

            const insertQuery = `
                INSERT INTO users
                    (username, password, email, contact_number, first_name, last_name, role, status, last_login)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            connection.query(
                insertQuery,
                [
                    user.username,
                    user.password,
                    user.email,
                    user.contact_number,
                    user.first_name,
                    user.last_name,
                    user.role,
                    user.status,
                    user.last_login || null
                ],
                (error) => {
                    if (error) {
                        return res.status(500).json({
                            message: 'Insert failed',
                            error: error.message
                        });
                    }
                    return res.status(200).json({
                        message: 'Record updated Successfully'
                    });
                }
            );
        } catch (error) {
            return res.status(500).json(error);
        }
    });
};

const getAllUser = async (req, res) => {
    const query = 'SELECT * FROM users';
    connection.query(query, (error, results) => {
        if (error) {
            return res.status(500).json(error);
        }

        try {
            if (results.length <= 0) {
                return res.status(400).json({
                    message: 'No records found'
                });
            }
            return res.status(200).json(results.map(mapUserRow));
        } catch (error) {
            return res.status(500).json(error);
        }
    });
};

const login = async (req, res) => {
    const user = normalizeUser(req.body);
    const query = 'SELECT * FROM users WHERE username = ?';

    connection.query(query, [user.username], (error, results) => {
        if (error) {
            return res.status(500).json(error);
        }

        try {
            const existing = results[0];
            if (results.length <= 0 || user.password != existing.password) {
                return res.status(401).json({
                    message: 'Wrong user name or password, Please provide correct one'
                });
            } else if (!existing.status) {
                return res.status(401).json({
                    message: 'Waiting for admin approval'
                });
            } else if (existing.password === user.password) {
                const response = {
                    user_id: existing.user_id,
                    username: existing.username,
                    userId: existing.user_id,
                    userName: existing.username,
                    role: existing.role
                };
                const accessToken = jwt.sign(response, process.env.ACCESS_TOKEN, { expiresIn: '8h' });
                return res.status(200).json({
                    result: true,
                    token: accessToken,
                    message: 'Logged in'
                });
            } else {
                return res.status(400).json({
                    message: 'Something went wrong please try again'
                });
            }
        } catch (error) {
            return res.status(500).json(error);
        }
    });
};

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});

const forgotPassword = async (req, res) => {
    const user = normalizeUser(req.body);
    const query = 'SELECT * FROM users WHERE username = ? OR email = ?';

    connection.query(query, [user.username, user.email], (error, results) => {
        if (error) {
            return res.status(500).json(error);
        }

        try {
            if (results.length <= 0) {
                return res.status(401).json({
                    message: 'User Name is not found, please register the User Name'
                });
            } else {
                var mailOptions = {
                    from: 'timecablevision@gmail.com',
                    to: results[0].email,
                    subject: 'Password Reset',
                    html: '<p>Your login details Email:</p>' + results[0].email + '<p>Passord:</p>' + results[0].password + '<a href="http://local:4200>Click to Login</a>'
                };
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email send successfull', info.response);
                    }
                });
                return res.status(200).json({
                    message: 'Password sent successfull to your email id'
                });
            }
        } catch (error) {
            return res.status(500).json(error);
        }
    });
};

const changePassword = async (req, res) => {
    const user = req.body;
    const username = res.locals.username ?? res.locals.userName;
    const query = 'SELECT * FROM users WHERE username = ? AND password = ?';

    connection.query(query, [username, user.oldPassword], (error, results) => {
        if (error) {
            return res.status(500).json(error);
        }

        try {
            if (results.length <= 0) {
                return res.status(401).json({
                    message: 'Incorrect Password, please enter correct Password'
                });
            }
            if (results[0].password === user.oldPassword) {
                const updateQuery = 'UPDATE users SET password = ? WHERE username = ?';
                connection.query(updateQuery, [user.newPassword, username], (error) => {
                    if (error) {
                        return res.status(500).json(error);
                    }
                    return res.status(200).json({
                        message: 'Password updated successfully'
                    });
                });
            } else {
                return res.status(400).json({
                    message: 'Some thing went wrorng, please try some time later'
                });
            }
        } catch (error) {
            return res.status(500).json(error);
        }
    });
};

const editUser = async (req, res) => {
    const user = normalizeUser(req.body);
    const userId = user.user_id;
    const query = 'SELECT * FROM users WHERE (username = ? OR email = ?) AND user_id != ?';

    connection.query(query, [user.username, user.email, userId], (error, results) => {
        if (error) {
            return res.status(500).json({
                message: 'User not found'
            });
        }

        try {
            if (results.length > 0) {
                const existing = results[0];

                if (existing.username === user.username) {
                    return res.status(409).json({
                        message: 'User Name already exists, try another'
                    });
                }

                if (existing.email === user.email) {
                    return res.status(409).json({
                        message: 'Email already exists, try another'
                    });
                }
            }

            const updateQuery = `
                UPDATE users
                SET username = ?,
                    password = ?,
                    email = ?,
                    contact_number = ?,
                    first_name = ?,
                    last_name = ?,
                    role = ?,
                    status = ?,
                    last_login = ?
                WHERE user_id = ?
            `;
            connection.query(
                updateQuery,
                [
                    user.username,
                    user.password,
                    user.email,
                    user.contact_number,
                    user.first_name,
                    user.last_name,
                    user.role,
                    user.status,
                    user.last_login || null,
                    userId
                ],
                (error) => {
                    if (error) {
                        return res.status(500).json(error);
                    }

                    return res.status(200).json({
                        message: 'User record updated successfully'
                    });
                }
            );
        } catch (error) {
            return res.status(500).json(error);
        }
    });
};

const deleteUser = async (req, res) => {
    const user = normalizeUser(req.body);
    const query = 'SELECT * FROM users WHERE user_id = ?';

    connection.query(query, [user.user_id], (error, results) => {
        if (error) {
            return res.status(400).json(error);
        }
        if (results.length <= 0) {
            return res.status(404).json({
                message: 'User Details not found'
            });
        }
        if (results.length > 0) {
            const deleteQuery = 'DELETE FROM users WHERE user_id = ?';
            connection.query(deleteQuery, [user.user_id], (error) => {
                if (error) {
                    return res.status(500).json(error);
                } else {
                    return res.status(200).json({
                        message: 'User details deleted successfully'
                    });
                }
            });
        }
    });
};

module.exports = { login, forgotPassword, changePassword, signup, getAllUser, editUser, deleteUser };
