const express = require('express');
const cors = require('cors');
const path = require('path');
const userRoute = require('./routes/userRouter')
const brandRoute = require('./routes/brandRouter')
const categoryRoute = require('./routes/categoryRouter');
const productRoute = require('./routes/productRouter')
const supplierRoute = require('./routes/supplierRouter')
const customerRoute = require('./routes/customerRouter')
const purchaseRoute = require('./routes/purchaseRouter')
const stockRoute = require('./routes/stockRouter')
const quotationRoute = require('./routes/quotationRouter')
const workflowRoute = require('./routes/workflowRouter')
const workOrderRoute = require('./routes/workOrderRouter')
const employeeRoute = require('./routes/employeeRouter')
const employeeSalaryRoute = require('./routes/employeeSalaryRouter')
const auditLogRoute = require('./routes/auditLogRouter')
const locationRoute = require('./routes/locationRouter')
const employeeAttendanceRoute = require('./routes/employeeAttendanceRouter')
const customerPaymentRoute = require('./routes/customerPaymentRouter')
const supplierPaymentRoute = require('./routes/supplierPaymentRouter')
const salesRoute = require('./routes/salesRouter')
const serviceTicketRoute = require('./routes/serviceTicketRouter')
const warrantyRoute = require('./routes/warrantyRouter')
const notificationRoute = require('./routes/notificationRouter')
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
app.use('/api/customer', customerRoute);
app.use('/api/purchase', purchaseRoute);
app.use('/api/stock', stockRoute);
app.use('/api/quotation', quotationRoute);
app.use('/api/workflow', workflowRoute);
app.use('/api/work-order', workOrderRoute);
app.use('/api/v1/brands', brandRoute);
app.use('/api/v1/categories', categoryRoute);
app.use('/api/v1/products', productRoute);
app.use('/api/v1/suppliers', supplierRoute);
app.use('/api/v1/customers', customerRoute);
app.use('/api/v1/purchase', purchaseRoute);
app.use('/api/v1/stock', stockRoute);
app.use('/api/v1/quotations', quotationRoute);
app.use('/api/v1/workflow', workflowRoute);
app.use('/api/v1/workflows', workflowRoute);
app.use('/api/v1/work-orders', workOrderRoute);
app.use('/api/employee', employeeRoute);
app.use('/api/employee-salary', employeeSalaryRoute);
app.use('/api/audit-log', auditLogRoute);
app.use('/api/location', locationRoute);
app.use('/api/employee-attendance', employeeAttendanceRoute);
app.use('/api/customer-payment', customerPaymentRoute);
app.use('/api/supplier-payment', supplierPaymentRoute);
app.use('/api/sales', salesRoute);
app.use('/api/service-ticket', serviceTicketRoute);
app.use('/api/warranty', warrantyRoute);
app.use('/api/notifications', notificationRoute);
app.use('/api/v1/employee-attendance', employeeAttendanceRoute);
app.use('/api/v1/customer-payments', customerPaymentRoute);
app.use('/api/v1/supplier-payments', supplierPaymentRoute);
app.use('/api/v1/sales', salesRoute);
app.use('/api/v1/service-tickets', serviceTicketRoute);
app.use('/api/v1/warranties', warrantyRoute);
app.use('/api/v1/notifications', notificationRoute);
module.exports = app;
