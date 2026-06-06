const express = require('express');
const cors = require('cors');
const userRoute = require('./routes/userRouter')
const brandRoute = require('./routes/brandRouter')
const categoryRoute = require('./routes/categoryRouter');
const productRoute = require('./routes/productRouter')
const supplierRoute = require('./routes/supplierRouter')
const approvalRoute = require('./routes/approvalRouter')
const purchaseRoute = require('./routes/purchaseRouter')
const materialRoute = require('./routes/materialRouter')
const stockRoute = require('./routes/stockRouter')
const lookupRoute = require('./routes/lookupRouter')
const customerRoute = require('./routes/customerRouter')
const quotationRoute = require('./routes/quotationRouter')
const app = express()

app.use(cors());
app.use(express.urlencoded({ extended: true}));
app.use(express.json());

app.use('/api/user', userRoute);
app.use('/api/brand', brandRoute);
app.use('/api/category', categoryRoute);
app.use('/api/product', productRoute);
app.use('/api/supplier', supplierRoute);
app.use('/api/approval', approvalRoute);
app.use('/api/purchase', purchaseRoute);
app.use('/api/material', materialRoute);
app.use('/api/stock', stockRoute);
app.use('/api/lookup', lookupRoute);
app.use('/api/customer', customerRoute);
app.use('/api/quotation', quotationRoute);
module.exports = app;
