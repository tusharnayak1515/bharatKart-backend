const mongoose = require('mongoose');

const { Schema } = mongoose;

const ProductSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    category: {
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
    review: [
        {
            type: Schema.Types.ObjectId,
            ref: 'review'
        }
    ],
    date: {
        type: Date,
        default: Date.now
    },
    merchant: {
        merchantName: {
            type: String
        },
        merchantId: {
            type: Schema.Types.ObjectId,
            ref: 'merchant'
        }
    }
});

const Product = mongoose.model('product', ProductSchema);
module.exports = Product;