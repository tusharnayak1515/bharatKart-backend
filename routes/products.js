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


// ROUTE 1: Fetch all products using GET. Doesn't Require Login.
router.get("/products", async (req, res) => {
    let success = false;
    try {
        const products = await Product.find();
        success = true;
        return res.json({ success, products, status: 200 });
    } catch (error) {
        success = false;
        return res.send({ success, error: error.message, status: 500 });
    }
});

// ROUTE 2: Add products using POST. Require Login.
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
        const products = await Product.find();

        if (!merchant) {
            success = false;
            return res.send({ success, error: "Not Found", status: 404 });
        }

        if (merchant._id.toString() !== req.user.id) {
            success = false;
            return res.send({ success, error: "This is not allowed", status: 401 });
        }

        for (let i = 0; i < products.length; i++) {
            // console.log(products[i].name);
            // console.log(name);
            // console.log((products[i].name === name));
            if (products[i].name === name) {
                let qty = 1;
                for (let j = 0; j < merchant.products.length; j++) {
                    // console.log(merchant.products[j].product.toString() === products[i]._id.toString());
                    // console.log(merchant.products[j].product.toString() === products[i]._id);
                    // console.log(merchant.products[j].product.toString());
                    // console.log(products[i]._id.toString());
                    if (merchant.products[j].product.toString() === products[i]._id.toString()) {
                        // console.log("yes");
                        qty = merchant.products[j].quantity + quantity;
                    }
                }
                // console.log(qty);
                merchant = await Merchant.findByIdAndUpdate(merchantId, { $pull: { products: { product: products[i]._id.toString() } } });
                merchant = await Merchant.findByIdAndUpdate(merchantId, { $push: { products: { product: products[i]._id.toString(), quantity: qty } } });
                success = true;
                return res.json({ success, merchant, status: 200 });
            }
        }

        let myproduct = await new Product({
            name: name,
            description: description,
            image: image,
            price: price,
            merchant: {
                merchantName: merchant.name,
                merchantId: merchantId
            }
        });

        const product = await myproduct.save();
        merchant = await Merchant.findByIdAndUpdate(merchantId, { $push: { products: { product, quantity } } });
        success = true;
        return res.json({ success, product, merchant, status: 200 });
    } catch (error) {
        success = false;
        res.send({ success, error: error.message, status: 500 });
    }
});

// ROUTE 3: Add products in cart using PUT. Require Login.
router.put("/addtocart/:id", [
    body("qty", "Quantity can be minimum 1!").isFloat({ min: 1 })
], fetchUser, async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        success = false;
        return res.json({ success, error: errors.array()[0].msg, status: 400 })
    }
    const productId = req.params.id;
    const { qty } = req.body;
    try {
        const userId = req.user.id;
        let user = await User.findById(userId);

        if (!user) {
            success = false;
            return res.json({ success, error: "Invalid Request", status: 400 });
        }

        const product = await Product.findById(productId);

        if (!product) {
            success = false;
            return res.json({ success, error: "Product Not Found", status: 404 });
        }

        let latestqty = qty;
        let isProduct = false;

        for (let i = 0; i < user.cart.length; i++) {
            if (user.cart[i].product.toString() === productId) {
                isProduct = true;
                latestqty = user.cart[i].quantity + qty;
            }
        }

        if (isProduct) {
            for (let i = 0; i < user.cart.length; i++) {
                if (user.cart[i].product.toString() === productId) {
                    user.cart[i].quantity = latestqty;
                }
            }
            user.save();
        }
        else {
            user = await User.findByIdAndUpdate(userId, { $addToSet: { cart: { product: productId, quantity: latestqty } } }, { new: true });
        }

        let cart = [];
        for (let i = 0; i < user.cart.length; i++) {
            cart.push(await Product.findById(user.cart[i].product.toString()));
        }

        let orders = [];
        for (let i = 0; i < user.boughtproducts.length; i++) {
            let item = await Product.findById(user.boughtproducts[i].product.toString());
            orders.push(item);
        }

        const myprofile = {
            profile: user,
            orders: orders
        }

        success = true;
        return res.json({ success, product, cart, myprofile, status: 200 });
    } catch (error) {
        success = false;
        res.send({ success, error: error.message, status: 500 });
    }
});

// ROUTE 4: Remove products from cart using PUT. Require Login.
router.put("/removefromcart/:id", [
    body("qty", "Quantity can be minimum 1!").exists()
], fetchUser, async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        success = false;
        return res.json({ success, error: errors.array()[0].msg, status: 400 })
    }
    const productId = req.params.id;
    const { qty } = req.body;
    try {
        const userId = req.user.id;
        let user = await User.findById(userId);

        if (!user) {
            success = false;
            return res.json({ success, error: "Invalid Request", status: 400 })
        }

        const product = await Product.findById(productId);

        if (!product) {
            success = false;
            return res.json({ success, error: "Product Not Found", status: 404 });
        }

        let isValid = false;
        for (let i = 0; i < user.cart.length; i++) {
            if (user.cart[i].product.toString() === productId) {
                isValid = true;
            }
        }

        if (!isValid) {
            success = false;
            return res.json({ success, error: "Product not present in cart!", status: 400 })
        }

        let latestqty = qty;

        for (let i = 0; i < user.cart.length; i++) {
            if (user.cart[i].product.toString() === productId) {
                if (user.cart[i].quantity === qty) {
                    user.cart = user.cart.filter((item) => item.product.toString() !== productId);
                }
                else if (user.cart[i].quantity > qty) {
                    latestqty = user.cart[i].quantity - qty;
                    user.cart[i].quantity = latestqty;
                }
                else {
                    success = false;
                    return res.json({ success, error: "The product stock is less than your requirement!", status: 400 })
                }
            }
        }
        user.save();

        let cart = [];
        for (let i = 0; i < user.cart.length; i++) {
            cart.push(await Product.findById(user.cart[i].product.toString()));
        }

        let orders = [];
        for (let i = 0; i < user.boughtproducts.length; i++) {
            let item = await Product.findById(user.boughtproducts[i].product.toString());
            orders.push(item);
        }

        const myprofile = {
            profile: user,
            orders: orders
        }

        success = true;
        return res.json({ success, product, cart, myprofile, status: 200 });
    } catch (error) {
        success = false;
        res.send({ success, error: error.message, status: 500 });
    }
});

// ROUTE 5: Buy products using PUT. Require Login.
router.put("/buyproduct", [
    body("cart", "Your cart is empty!").isArray().notEmpty()
], fetchUser, async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        success = false;
        return res.json({ success, error: errors.array()[0].msg, status: 400 })
    }
    const cart = req.body.cart;
    const userId = req.user.id;
    let product;
    let merchant;
    let user = await User.findById(userId);
    if (!user) {
        success = false;
        return res.json({ success, error: "Invalid Request", status: 400 })
    }

    try {
        if (cart.length === 0) {
            success = false;
            return res.json({ success, error: "Your cart is empty!", status: 400 })
        }

        for (let i = 0; i < cart.length; i++) {
            let productId = cart[i].product.toString();

            product = await Product.findById(productId);
            if (!product) {
                success = false;
                return res.json({ success, error: "Product Not Found", status: 404 });
            }

            merchant = await Merchant.findById(product.merchant.merchantId.toString());

            let productQuantity = 0;
            let merchantEarning = 0;

            for (let j = 0; j < merchant.products.length; j++) {
                if (merchant.products[j].product.toString() === productId) {
                    if (cart[i].quantity > merchant.products[j].quantity) {
                        success = false;
                        return res.json({ success, error: "The product stock is less than your requirement!", status: 400 });
                    }
                    productQuantity = merchant.products[j].quantity - cart[i].quantity;
                    merchantEarning = merchant.earnedmoney + (product.price * cart[i].quantity);
                }
            }

            merchant = await Merchant.findByIdAndUpdate(product.merchant.merchantId.toString(), { $pull: { products: { product: productId } } }, { new: true });
            merchant = await Merchant.findByIdAndUpdate(product.merchant.merchantId.toString(), { $push: { products: { product: productId, quantity: productQuantity } } }, { new: true });
            merchant = await Merchant.findByIdAndUpdate(product.merchant.merchantId.toString(), { $push: { soldproducts: { location: user.location, user: userId, product: productId, quantity: cart[i].quantity } } }, { new: true });
            merchant = await Merchant.findByIdAndUpdate(product.merchant.merchantId.toString(), { earnedmoney: merchantEarning }, { new: true });
            user = await User.findByIdAndUpdate(userId, { $push: { boughtproducts: { merchant: product.merchant.merchantId.toString(), product: productId, quantity: cart[i].quantity } } }, { new: true });

            // let latestqty = cart[i].quantity;
            for (let k = 0; k < user.cart.length; k++) {
                if (user.cart[k].product.toString() === productId) {
                    if (user.cart[k].quantity < cart[i].quantity) {
                        success = false;
                        return res.json({ success, error: "Invalid Request!", status: 400 });
                    }
                    else if (user.cart[k].quantity === cart[i].quantity) {
                        user = await User.findByIdAndUpdate(userId, { $pull: { cart: { product: productId } } }, { new: true });
                    }
                    // else {
                    //     latestqty = user.cart[k].quantity - cart[i].quantity;
                    //     user = await User.findByIdAndUpdate(userId, { $pull: { cart: { product, quantity } } });
                    //     user = await User.findByIdAndUpdate(userId, { $push: { cart: { product, quantity: latestqty } } });
                    // }
                }
            }

        }

        let mycart = [];
        for (let i = 0; i < user.cart.length; i++) {
            mycart.push(await Product.findById(user.cart[i].product.toString()));
        }

        let orders = [];
        for (let i = 0; i < user.boughtproducts.length; i++) {
            let item = await Product.findById(user.boughtproducts[i].product.toString());
            orders.push(item);
        }

        const myprofile = {
            profile: user,
            orders: orders
        }

        success = true;
        return res.json({ success, product, myprofile, mycart, merchant, status: 200 });

    } catch (error) {
        success = false;
        res.send({ success, error: error.message, status: 500 });
    }
});

// Route 6: Delete a product using DELETE. Merchant Login Required.
router.delete("/deleteproduct/:id", fetchMerchant, async (req, res) => {
    let success = false;
    const productId = req.params.id;
    try {
        const targetProduct = await Product.findById(productId);
        if (!targetProduct) {
            success = false;
            return res.json({ success, error: "Product not found", status: 404 })
        }

        if (targetProduct.merchant.toString() !== req.user.id) {
            success = false;
            return res.json({ success, error: "This is not allowed", status: 401 })
        }

        const deletedProduct = await Product.findByIdAndDelete(productId, {new: true});
        const myMerchant = await Merchant.findByIdAndUpdate(req.user.id, { $pull: { products: { product: productId } } }, {new: true});
        const filteredProducts = await Product.find({ merchant: req.user.id });

        success = true;
        return res.json({ success, filteredProducts, myMerchant, status: 200 });

    }
    catch (error) {
        res.send({ error: "Internal Server Error", status: 500 });
    }
});

// ROUTE 7: Fetch a particular product using GET. Doesn't Require Login.
router.get("/product/:id", async (req, res) => {
    const productId = req.params.id;
    let success = false;
    try {
        const product = await Product.findById(productId);
        if (!product) {
            success = false;
            return res.json({ success, error: "Not Found", status: 404 });
        }

        const merchant = await Merchant.findById(product.merchant.merchantId.toString());
        let productQuantity;
        for (let i = 0; i < merchant.products.length; i++) {
            if (merchant.products[i].product.toString() === productId) {
                productQuantity = merchant.products[i].quantity;
            }
        }
        if (!merchant) {
            success = false;
            return res.json({ success, error: "Not Found", status: 404 });
        }

        const merchantName = merchant.name;
        success = true;
        return res.json({ success, product, merchantName, productQuantity, status: 200 });
    } catch (error) {
        success = false;
        res.send({ success, error: error.message, status: 500 });
    }
});

// ROUTE 8: Add product review using PUT. Require Login.
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
            return res.json({ success, error: "Not Found", status: 404 });
        }

        let isBought = false;
        for(let i=0; i<user.boughtproducts.length; i++) {
            if(user.boughtproducts[i],product.toString() === productId) {
                isBought = true;
            }
        }

        if(!isBought) {
            success = false;
            return res.json({success, error: "You have not purchased the product yet!", status: 400})
        }

        const myreview = {
            ratings: rating,
            comments: review,
            user: {
                username: user.name,
                userId: userId
            }
        }

        product = await Product.findByIdAndUpdate(productId, { $push: { review: myreview } }, {new: true});
        user = await User.findByIdAndUpdate(userId, {$push: { reviews: { ratings: rating, review: review, product: productId } }}, {new: true});

        let orders = [];
        for (let i = 0; i < user.boughtproducts.length; i++) {
            let item = await Product.findById(user.boughtproducts[i].product.toString());
            orders.push(item);
        }

        const myprofile = {
            profile: user,
            orders: orders
        }

        success = true;
        return res.json({ success, product, myprofile, status: 200 });
    } catch (error) {
        success = false;
        res.send({ success, error: error.message, status: 500 });
    }
});

module.exports = router;