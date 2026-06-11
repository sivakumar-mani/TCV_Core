const express = require('express');
const cors = require('cors');
const path = require('path');
const userRoute = require('./routes/userRouter')
const brandRoute = require('./routes/brandRouter')
const categoryRoute = require('./routes/categoryRouter');
const productRoute = require('./routes/productRouter')
const supplierRoute = require('./routes/supplierRouter')
const employeeRoute = require('./routes/employeeRouter')
const employeeSalaryRoute = require('./routes/employeeSalaryRouter')
const auditLogRoute = require('./routes/auditLogRouter')
const locationRoute = require('./routes/locationRouter')
const app = express()

app.use(cors());
app.use(express.urlencoded({ extended: true}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/user', userRoute);
app.use('/api/brand', brandRoute);
app.use('/api/category', categoryRoute);
app.use('/api/product', productRoute);
app.use('/api/supplier', supplierRoute);
app.use('/api/v1/brands', brandRoute);
app.use('/api/v1/categories', categoryRoute);
app.use('/api/v1/products', productRoute);
app.use('/api/v1/suppliers', supplierRoute);
app.use('/api/employee', employeeRoute);
app.use('/api/employee-salary', employeeSalaryRoute);
app.use('/api/audit-log', auditLogRoute);
app.use('/api/location', locationRoute);
module.exports = app;
