const mongoose = require('mongoose');

const { Schema } = mongoose;

const ReviewSchema = new Schema({
    ratings: {
        type: Number,
        default: 1
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
    },
    product: {
        type: Schema.Types.ObjectId,
        ref: 'product'
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const Review = mongoose.model('review',ReviewSchema);
module.exports = Review;