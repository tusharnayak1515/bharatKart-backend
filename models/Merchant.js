const mongoose = require('mongoose');

const { Schema } = mongoose;

const MerchantSchema = new Schema({
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
    aadhaar: {
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
    products: [
        {
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
    soldproducts: [
        {
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
            user: {
                type: Schema.Types.ObjectId,
                ref: 'user'
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
    earnedmoney: {
        type: Number,
        default: 0
    }
});

const Merchant = mongoose.model('merchant', MerchantSchema);
module.exports = Merchant;