const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fetchMerchant = require("../middlewares/fetchMerchant");
const fetchUser = require("../middlewares/fetchUser");

const Merchant = require("../models/Merchant");
const Product = require("../models/Products");
const User = require("../models/User");

const router = express.Router();

const secret = process.env.JWT_SECRET;


// ROUTE 1: Add products using POST. Require Login.
router.post("/addproduct", [
    body("name", "Name must be more than 4 characters").isLength({ min: 4 }),
    body("description", "Description must be more than 10 characters").isLength({ min: 10 }),
    body("image", "Image is compulsory").exists(),
    body("price", "Price is compulsory").exists(),
], fetchMerchant, async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        success = false;
        return res.json({ success, error: errors.array()[0].msg, status: 400 })
    }
    const { name, description, image, price, quantity } = req.body;
    try {
        const merchantId = req.user.id;
        let merchant = await Merchant.findById(merchantId);

        if (!merchant) {
            success = false;
            return res.send({ success, error: "Not Found", status: 404 });
        }

        if (merchant._id.toString() !== req.user.id) {
            success = false;
            return res.send({ success, error: "This is not allowed", status: 401 });
        }

        let myproduct = await new Product({
            name: name,
            description: description,
            image: image,
            price: price,
            merchant: merchantId
        });

        const product = await myproduct.save();
        merchant = await Merchant.findByIdAndUpdate(merchantId, { $push: { products: { product, quantity } } });
        success = true;
        res.send({ success, product, merchant, status: 200 });
    } catch (error) {
        success = false;
        res.send({ success, error: error.message, status: 500 });
    }
});

// ROUTE 2: Buy products using PUT. Require Login.
router.put("/buyproduct/:id", [
    body("qty", "Quantity can be minimum 1!").exists()
], fetchUser, async (req, res) => {
    let success = false;
    const id = req.params.id;
    const { qty } = req.body;
    try {
        const userId = req.user.id;
        let user = await User.findById(userId);

        if (!user) {
            success = false;
            return res.json({ success, error: "Invalid Request", status: 400 })
        }

        const product = await Product.findById(id);
        // console.log(product.merchant.toString());

        let merchant = await Merchant.findById(product.merchant.toString());

        let productQuantity = 0;
        let merchantEarning = 0;
        
        for(let i = 0;i<merchant.products.length; i++) {
            if(merchant.products[i].product.toString() === id) {
                if(qty > merchant.products[i].quantity) {
                    success = false;
                    return res.json({ success, error: "Invalid Buy Request", status: 400 });
                }
                productQuantity = merchant.products[i].quantity - qty;
                merchantEarning = merchant.earnedmoney + (product.price * qty);
            }
        }

        merchant = await Merchant.findByIdAndUpdate(product.merchant.toString(), { $pull: { products: { product: id } } });
        merchant = await Merchant.findByIdAndUpdate(product.merchant.toString(), { $push: { products: { product, quantity: productQuantity } } });
        merchant = await Merchant.findByIdAndUpdate(product.merchant.toString(), { $push: { soldproducts: { user: userId, product, quantity: qty } } });
        merchant = await Merchant.findByIdAndUpdate(product.merchant.toString(), { earnedmoney: merchantEarning });
        user = await User.findByIdAndUpdate(userId, { $push: { boughtproducts: { merchant, product, quantity: qty } } });
        success = true;
        return res.json({ success, product, user, merchant, status: 200 });
    } catch (error) {
        success = false;
        res.send({ success, error: error.message, status: 500 });
    }
});

module.exports = router;