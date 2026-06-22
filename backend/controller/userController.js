const connection = require('../connection');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const captchaSecret = () => process.env.CAPTCHA_SECRET || process.env.ACCESS_TOKEN || 'tcv-captcha-secret';
const signCaptcha = (payload) => crypto.createHmac('sha256', captchaSecret()).update(payload).digest('base64url');

const getCaptcha = (_req, res) => {
  const code = crypto.randomInt(100000, 1000000);
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const payload = Buffer.from(`${code}.${expiresAt}.${crypto.randomBytes(8).toString('hex')}`).toString('base64url');
  return res.json({ question: String(code), token: `${payload}.${signCaptcha(payload)}` });
};

const validateCaptcha = (token, answer) => {
  if (!token || answer === undefined || answer === null || answer === '') return false;
  const [payload, signature] = String(token).split('.');
  if (!payload || !signature) return false;
  const expectedSignature = signCaptcha(payload);
  const supplied = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return false;
  const [expectedAnswer, expiresAt] = Buffer.from(payload, 'base64url').toString().split('.');
  return Date.now() <= Number(expiresAt) && Number(answer) === Number(expectedAnswer);
};

const normalizeRole = (role) => {
  const value = String(role || 'EMPLOYEE').toUpperCase();
  const allowed = ['ADMIN', 'MANAGER', 'EMPLOYEE', 'SALES', 'SERVICE'];
  if (value === 'USER' || value === 'STAFF') return 'EMPLOYEE';
  return allowed.includes(value) ? value : 'EMPLOYEE';
};

const normalizeStatus = (status) => {
  if (typeof status === 'boolean') return status ? 1 : 0;
  if (typeof status === 'number') return status === 1 ? 1 : 0;
  return String(status).toLowerCase() === 'false' ? 0 : 1;
};

const toClientUser = (row) => ({
  userId: row.user_id,
  userName: row.username,
  username: row.username,
  password: row.password,
  email: row.email,
  contactNumber: row.contact_number,
  firstName: row.first_name,
  lastName: row.last_name,
  dateRegistered: row.date_registered,
  lastLogin: row.last_login,
  role: row.role || 'EMPLOYEE',
  Status: row.is_active ? 'true' : 'false',
  is_active: row.is_active,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const getRequestUsername = (user) => user.username || user.userName;

const signup = async (req, res) => {
  const user = req.body;
  const username = getRequestUsername(user);
  const firstName = user.firstName || user.first_name;

  if (!username || !user.password || !user.email || !firstName) {
    return res.status(400).json({ message: 'User name, password, email, and first name are required' });
  }

  connection.query(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [username, user.email],
    (error, results) => {
      if (error) return res.status(500).json({ message: 'User lookup failed', error: error.message });

      if (results.length > 0) {
        const existing = results[0];
        if (existing.username === username && existing.email === user.email) {
          return res.status(400).json({ message: 'User Name and Email is already exists' });
        }
        if (existing.username === username) {
          return res.status(400).json({ message: 'User Name is already exists' });
        }
        if (existing.email === user.email) {
          return res.status(400).json({ message: 'Email is already exists' });
        }
      }

      connection.query(
        `INSERT INTO users
         (username, password, email, contact_number, first_name, last_name, date_registered, last_login, role, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          username,
          user.password,
          user.email,
          user.contactNumber || user.contact_number || null,
          firstName,
          user.lastName || user.last_name || null,
          user.dateRegistered || user.date_registered || new Date(),
          user.lastLogin || user.last_login || null,
          normalizeRole(user.role),
          normalizeStatus(user.Status ?? user.is_active),
        ],
        (insertError) => {
          if (insertError) {
            return res.status(500).json({ message: 'Insert failed', error: insertError.message });
          }
          return res.status(200).json({ message: 'Record updated Successfully' });
        }
      );
    }
  );
};

const getAllUser = async (req, res) => {
  connection.query('SELECT * FROM users ORDER BY user_id DESC', (error, results) => {
    if (error) return res.status(500).json({ message: 'User list failed', error: error.message });
    if (results.length <= 0) return res.status(400).json({ message: 'No records found' });
    return res.status(200).json(results.map(toClientUser));
  });
};

const login = async (req, res) => {
  const user = req.body;
  const username = getRequestUsername(user);

  if (!username || !user.password) {
    return res.status(400).json({ message: 'User name and password are required' });
  }
  if (!validateCaptcha(user.captchaToken, user.captchaAnswer)) {
    return res.status(400).json({ message: 'Invalid or expired CAPTCHA. Please try again.' });
  }

  connection.query('SELECT * FROM users WHERE username = ?', [username], (error, results) => {
    if (error) return res.status(500).json({ message: 'Login lookup failed', error: error.message });

    if (results.length <= 0 || user.password !== results[0].password) {
      return res.status(401).json({ message: 'Wrong user name or password, Please provide correct one' });
    }

    const existing = results[0];
    if (!existing.is_active) {
      return res.status(401).json({ message: 'Waiting for admin approval' });
    }

    const response = {
      userId: existing.user_id,
      userName: existing.username,
      username: existing.username,
      role: existing.role,
    };
    connection.query(
      'SELECT permission_key, can_view, can_create, can_update, can_delete FROM role_permissions WHERE role = ?',
      [existing.role],
      (permissionError, permissions) => {
        if (permissionError) return res.status(500).json({ message: 'Permission lookup failed' });
        response.permissions = existing.role === 'ADMIN' ? ['*'] : permissions;
        const accessToken = jwt.sign(response, process.env.ACCESS_TOKEN, { expiresIn: '8h' });
        connection.query('UPDATE users SET last_login = NOW() WHERE user_id = ?', [existing.user_id]);
        return res.status(200).json({ result: true, token: accessToken, message: 'Logged in' });
      }
    );
  });
};

const getMyPermissions = (req, res) => {
  const role = String(res.locals.role || '').toUpperCase();
  if (role === 'ADMIN') return res.json({ role, permissions: ['*'] });
  connection.query(
    'SELECT permission_key, can_view, can_create, can_update, can_delete FROM role_permissions WHERE role = ?',
    [role],
    (error, permissions) => {
      if (error) return res.status(500).json({ message: 'Permission lookup failed' });
      return res.json({ role, permissions });
    }
  );
};

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

const forgotPassword = async (req, res) => {
  const user = req.body;
  const username = getRequestUsername(user);

  connection.query(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [username, user.email],
    (error, results) => {
      if (error) return res.status(500).json({ message: 'Password lookup failed', error: error.message });
      if (results.length <= 0) {
        return res.status(401).json({ message: 'User Name is not found, please register the User Name' });
      }

      var mailOptions = {
        from: 'timecablevision@gmail.com',
        to: results[0].email,
        subject: 'Password Reset',
        html:
          '<p>Your login details Email:</p>' +
          results[0].email +
          '<p>Passord:</p>' +
          results[0].password +
          '<a href="http://local:4200">Click to Login</a>',
      };
      transporter.sendMail(mailOptions, (mailError, info) => {
        if (mailError) console.log(mailError);
        else console.log('Email send successfull', info.response);
      });
      return res.status(200).json({ message: 'Password sent successfull to your email id' });
    }
  );
};

const changePassword = async (req, res) => {
  const user = req.body;
  const username = res.locals.username || res.locals.userName;

  connection.query(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [username, user.oldPassword],
    (error, results) => {
      if (error) return res.status(500).json({ message: 'Password check failed', error: error.message });
      if (results.length <= 0) {
        return res.status(401).json({ message: 'Incorrect Password, please enter correct Password' });
      }

      connection.query(
        'UPDATE users SET password = ? WHERE username = ?',
        [user.newPassword, username],
        (updateError) => {
          if (updateError) return res.status(500).json({ message: 'Password update failed', error: updateError.message });
          return res.status(200).json({ message: 'Password updated successfully' });
        }
      );
    }
  );
};

const editUser = async (req, res) => {
  const user = req.body;
  const userId = user.userId || user.user_id;
  const username = getRequestUsername(user);

  connection.query(
    'SELECT * FROM users WHERE (username = ? OR email = ?) AND user_id != ?',
    [username, user.email, userId],
    (error, results) => {
      if (error) return res.status(500).json({ message: 'User lookup failed', error: error.message });

      if (results.length > 0) {
        const existing = results[0];
        if (existing.username === username) return res.status(409).json({ message: 'User Name already exists, try another' });
        if (existing.email === user.email) return res.status(409).json({ message: 'Email already exists, try another' });
      }

      connection.query(
        `UPDATE users SET
           username = ?, password = ?, email = ?, contact_number = ?, first_name = ?, last_name = ?,
           date_registered = COALESCE(?, date_registered), last_login = COALESCE(?, last_login), role = ?, is_active = ?
         WHERE user_id = ?`,
        [
          username,
          user.password,
          user.email,
          user.contactNumber || user.contact_number || null,
          user.firstName || user.first_name,
          user.lastName || user.last_name || null,
          user.dateRegistered || user.date_registered || null,
          user.lastLogin || user.last_login || null,
          normalizeRole(user.role),
          normalizeStatus(user.Status ?? user.is_active),
          userId,
        ],
        (updateError) => {
          if (updateError) return res.status(500).json({ message: 'User update failed', error: updateError.message });
          return res.status(200).json({ message: 'User record updated successfully' });
        }
      );
    }
  );
};

const deleteUser = async (req, res) => {
  const userId = req.body.userId || req.body.user_id;

  connection.query('SELECT * FROM users WHERE user_id = ?', [userId], (error, results) => {
    if (error) return res.status(400).json({ message: 'User lookup failed', error: error.message });
    if (results.length <= 0) return res.status(404).json({ message: 'User Details not found' });

    connection.query('DELETE FROM users WHERE user_id = ?', [userId], (deleteError) => {
      if (deleteError) return res.status(500).json({ message: 'User delete failed', error: deleteError.message });
      return res.status(200).json({ message: 'User details deleted successfully' });
    });
  });
};

module.exports = { getCaptcha, login, forgotPassword, changePassword, signup, getAllUser, getMyPermissions, editUser, deleteUser };
