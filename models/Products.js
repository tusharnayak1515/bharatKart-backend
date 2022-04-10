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
    review: [
        {
            ratings: {
                type: Number,
                default: 0
            },
            comments: {
                type: String,
                default: ""
            },
            user: {
                username: {
                    type: String,
                    default: ""
                },
                userId: {
                    type: Schema.Types.ObjectId,
                    ref: 'user'
                }
            }
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