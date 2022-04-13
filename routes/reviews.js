const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fetchUser = require("../middlewares/fetchUser");
const User = require("../models/User");
const Product = require("../models/Products");
const Review = require("../models/Review");

const router = express.Router();

// ROUTE 1: Add product review using PUT. Require Login.
router.put("/addreview/:id", [
    body("rating", "You have to give minimum 1 star and maximum 5 star ratings!").isFloat({ min: 1, max: 5 }),
    body("review", "You can write review of minimum 5 characters!").isLength({ min: 5 })
], fetchUser, async (req, res) => {
    const productId = req.params.id;
    const { rating, review } = req.body;
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        success = false;
        return res.json({ success, error: errors.array()[0].msg, status: 400 })
    }
    try {
        const userId = req.user.id;
        let user = await User.findById(userId);
        if (!user) {
            success = false;
            return res.json({ success, error: "You need to login first!", status: 404 });
        }

        let product = await Product.findById(productId);
        if (!product) {
            success = false;
            return res.json({ success, error: "Product Not Found!", status: 404 });
        }

        let allReviews = await Review.find();
        
        for(let j=0; j<allReviews.length; j++) {
            if((allReviews[j].user.userId.toString() === userId) && (allReviews[j].product.toString() === productId) ) {
                success = false;
                return res.json({success, error: "You cannot add multiple reviews for a single product!", status: 400})
            }
        }

        let isBought = false;
        for (let i = 0; i < user.boughtproducts.length; i++) {
            if (user.boughtproducts[i].product.toString() === productId) {
                isBought = true;
            }
        }

        if (!isBought) {
            success = false;
            return res.json({ success, error: "You have not purchased the product yet!", status: 400 })
        }

        let myreview = new Review({
            ratings: rating,
            comments: review,
            user: {
                username: user.name,
                userId: userId
            },
            product: productId
        });

        const savedReview = await myreview.save();
        product = await Product.findByIdAndUpdate(productId, { $push: { review: savedReview._id.toString() } }, { new: true });
        user = await User.findByIdAndUpdate(userId, { $push: { reviews: savedReview } }, { new: true });

        let orders = [];
        for (let i = 0; i < user.boughtproducts.length; i++) {
            let item = await Product.findById(user.boughtproducts[i].product.toString());
            orders.push(item);
        }

        let reviews = [];
        for (let i = 0; i < user.reviews.length; i++) {
            let item = await Review.findById(user.reviews[i].toString());
            reviews.push(item);
        }

        const myprofile = {
            profile: user,
            orders: orders,
            reviews: reviews
        }

        let myreviews = [];
        for(let i=0; i<product.review.length; i++) {
            myreviews.push(await Review.findById(product.review[i].toString()))
        }

        const myProduct = {
            product: product,
            reviews: myreviews
        }

        success = true;
        return res.json({ success, myProduct, myprofile, status: 200 });
    } catch (error) {
        success = false;
        res.send({ success, error: error.message, status: 500 });
    }
});

// ROUTE 2: Edit product review using PUT. Require Login.
router.put("/editreview/:id", [
    body("rating", "You have to give minimum 1 star and maximum 5 star ratings!").isFloat({ min: 1, max: 5 }),
    body("review", "You can write review of minimum 5 characters!").isLength({ min: 5 })
], fetchUser, async (req, res) => {
    const reviewId = req.params.id;
    const { rating, review } = req.body;
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        success = false;
        return res.json({ success, error: errors.array()[0].msg, status: 400 })
    }
    try {
        const userId = req.user.id;

        let user = await User.findById(userId);
        if (!user) {
            success = false;
            return res.json({ success, error: "You need to login first!", status: 404 });
        }

        let targetReview = await Review.findById(reviewId);
        if (!targetReview) {
            success = false;
            return res.json({ success, error: "Review not found!", status: 404 });
        }

        if(targetReview.user.userId.toString() !== userId) {
            success = false;
            return res.json({success, error: "You cannot edit a review thats not submitted by you!", status: 400})
        }

        let allProducts = await Product.find();
        let productId;
        for(let x=0; x<allProducts.length; x++) {
            for(let y=0; y<allProducts[x].review.length; y++) {
                if(allProducts[x].review[y].toString() === reviewId) {
                    productId = allProducts[x]._id.toString();
                }
            }
        }

        let product = await Product.findById(productId);
        if (!product) {
            success = false;
            return res.json({ success, error: "Product Not Found!", status: 404 });
        }

        let isBought = false;
        for (let i = 0; i < user.boughtproducts.length; i++) {
            if (user.boughtproducts[i].product.toString() === productId) {
                isBought = true;
            }
        }

        if (!isBought) {
            success = false;
            return res.json({ success, error: "You have not purchased the product yet!", status: 400 })
        }

        // let myreview = {
        //     ratings: rating,
        //     comments: review,
        //     user: {
        //         username: user.name,
        //         userId: userId
        //     }
        // };

        targetReview = await Review.findByIdAndUpdate(reviewId, {ratings: rating, comments: review}, {new: true});
        product = await Product.findByIdAndUpdate(productId, { $pull: { review: reviewId } }, { new: true });
        product = await Product.findByIdAndUpdate(productId, { $push: { review: reviewId } }, { new: true });
        user = await User.findByIdAndUpdate(userId, { $pull: { reviews: reviewId } }, { new: true });
        user = await User.findByIdAndUpdate(userId, { $push: { reviews: reviewId } }, { new: true });

        let orders = [];
        for (let i = 0; i < user.boughtproducts.length; i++) {
            let item = await Product.findById(user.boughtproducts[i].product.toString());
            orders.push(item);
        }

        let reviews = [];
        for (let i = 0; i < user.reviews.length; i++) {
            let item = await Review.findById(user.reviews[i].toString());
            reviews.push(item);
        }

        const myprofile = {
            profile: user,
            orders: orders,
            reviews: reviews
        }

        let myreviews = [];
        for(let i=0; i<product.review.length; i++) {
            myreviews.push(await Review.findById(product.review[i].toString()))
        }

        const myProduct = {
            product: product,
            reviews: myreviews
        }

        success = true;
        return res.json({ success, myProduct, myprofile, status: 200 });
    } catch (error) {
        success = false;
        res.send({ success, error: error.message, status: 500 });
    }
});

// ROUTE 3: Delete product review using DELETE. Require Login.
router.delete("/deletereview/:id", fetchUser, async (req, res) => {
    const reviewId = req.params.id;
    let success = false;
    try {
        const userId = req.user.id;

        let user = await User.findById(userId);
        if (!user) {
            success = false;
            return res.json({ success, error: "You need to login first!", status: 404 });
        }

        let targetReview = await Review.findById(reviewId);
        if (!targetReview) {
            success = false;
            return res.json({ success, error: "Review not found!", status: 404 });
        }

        if(targetReview.user.userId.toString() !== userId) {
            success = false;
            return res.json({success, error: "You cannot delete a review thats not submitted by you!", status: 400})
        }

        let allProducts = await Product.find();
        let productId;
        for(let x=0; x<allProducts.length; x++) {
            for(let y=0; y<allProducts[x].review.length; y++) {
                if(allProducts[x].review[y].toString() === reviewId) {
                    productId = allProducts[x]._id.toString();
                }
            }
        }

        let product = await Product.findById(productId);
        if (!product) {
            success = false;
            return res.json({ success, error: "Product Not Found!", status: 404 });
        }

        let isBought = false;
        for (let i = 0; i < user.boughtproducts.length; i++) {
            if (user.boughtproducts[i].product.toString() === productId) {
                isBought = true;
            }
        }

        if (!isBought) {
            success = false;
            return res.json({ success, error: "You have not purchased the product yet!", status: 400 })
        }

        targetReview = await Review.findByIdAndDelete(reviewId,{new: true});
        product = await Product.findByIdAndUpdate(productId, { $pull: { review: reviewId } }, { new: true });
        user = await User.findByIdAndUpdate(userId, { $pull: { reviews: reviewId } }, { new: true });

        let orders = [];
        for (let i = 0; i < user.boughtproducts.length; i++) {
            let item = await Product.findById(user.boughtproducts[i].product.toString());
            orders.push(item);
        }

        let reviews = [];
        for (let i = 0; i < user.reviews.length; i++) {
            let item = await Review.findById(user.reviews[i].toString());
            reviews.push(item);
        }

        const myprofile = {
            profile: user,
            orders: orders,
            reviews: reviews
        }

        let myreviews = [];
        for(let i=0; i<product.review.length; i++) {
            myreviews.push(await Review.findById(product.review[i].toString()))
        }

        const myProduct = {
            product: product,
            reviews: myreviews
        }

        success = true;
        return res.json({ success, myProduct, myprofile, status: 200 });
    } catch (error) {
        success = false;
        res.send({ success, error: error.message, status: 500 });
    }
});

// ROUTE 4: Get all reviews using GET. Do not Require Login.
router.get("/reviews", async (req, res) => {
    let success = false;
    try {
        const reviews = await Review.find();
        success = true;
        return res.json({ success, reviews, status: 200 });
    } catch (error) {
        success = false;
        return res.send({ success, error: error.message, status: 500 });
    }
});

module.exports = router;