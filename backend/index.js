const express = require('express');
const cors = require('cors');
const userRoute = require('./routes/userRouter')
const brandRoute = require('./routes/brandRouter')
const categoryRoute = require('./routes/categoryRouter');
const productRoute = require('./routes/productRouter')
const app = express()

app.use(cors());
app.use(express.urlencoded({ extended: true}));
app.use(express.json());

app.use('/api/user', userRoute);
app.use('/api/brand', brandRoute);
app.use('/api/category', categoryRoute);
app.use('/api/product', productRoute);
module.exports = app;