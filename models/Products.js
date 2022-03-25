const mongoose = require('mongoose');

const { Schema } = mongoose;

const ProductSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    merchant: {
        type: Schema.Types.ObjectId,
        ref: 'merchant'
    }
});

const Product = mongoose.model('product',ProductSchema);
module.exports = Product;