const express = require('express');
const path = require("path");
require('dotenv').config({path: path.resolve(__dirname,'./.env')});
const cors = require('cors');
const connectToMongo = require('./db');

const app = express();
const port = 5000;

app.use(express.json());
app.use(cors());
connectToMongo();

app.use('/api/merchant-auth', require('./routes/merchant-auth'));
app.use('/api/user-auth', require('./routes/user-auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/reviews', require('./routes/reviews'));

app.listen(port,()=> {
    console.log(`Server started successfully at port ${port}`);
})