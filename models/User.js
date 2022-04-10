const mongoose = require('mongoose');

const { Schema } = mongoose;

const UserSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: Number,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    location: {
        pincode: {
            type: Number,
            required: true
        },
        address: {
            type: String,
            required: true
        }
    },
    boughtproducts: [
        {
            merchant: {
                type: Schema.Types.ObjectId,
                ref: 'merchant'
            },
            product: {
                type: Schema.Types.ObjectId,
                ref: 'product',
            },
            quantity: {
                type: Number,
                default: 0
            }
        }
    ],
    cart: [
        {
            product: {
                type: Schema.Types.ObjectId,
                ref: 'product',
            },
            quantity: {
                type: Number
            }
        }
    ],
    reviews: [
        {
            ratings: {
                type: Number,
                default: 0
            },
            review: {
                type: String,
                default: ""
            },
            product: {
                type: Schema.Types.ObjectId,
                ref: 'product'
            }
        }
    ]
});

const User = mongoose.model('user',UserSchema);
module.exports = User;