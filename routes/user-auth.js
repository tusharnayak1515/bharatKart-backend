const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fetchUser = require("../middlewares/fetchUser");
const User = require("../models/User");
const Product = require("../models/Products");

const router = express.Router();

const secret = process.env.JWT_SECRET;

// ROUTE 1: Register a user using POST. No Login Required.
router.post(
  "/register",
  [
    body("name", "Name cannot be less than 5 characters!").isLength({ min: 5 }),
    body("email", "Enter a valid email!").isEmail(),
    body("phone", "Enter a valid phone number!").isLength({ min: 10, max: 10 }),
    body("password", "Enter a valid password!")
      .isLength({ min: 8 })
      .matches(/^[a-zA-Z0-9!@#$%^&*]{6,16}$/),
    body("pincode", "Enter a valid pincode!").isLength({ min: 6 }),
    body("address", "Enter a valid address!").exists(),
  ],
  async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      success = false;
      return res.json({ success, error: errors.array()[0].msg, status: 400 });
    }
    const { name, email, phone, password, pincode, address } =
      req.body;
    try {
      let user1 = await User.findOne({ email: email });
      if (user1) {
        success = false;
        return res.json({
          success,
          error: "This email is already associated to another account!",
          status: 400,
        });
      }

      let user2 = await User.findOne({ phone: phone });
      if (user2) {
        success = false;
        return res.json({
          success,
          error: "This phone number is already associated to another account!",
          status: 400,
        });
      }

      const salt = await bcrypt.genSalt(10);
      const securePassword = await bcrypt.hash(password, salt);

      const newUser = new User({
        name: name,
        email: email,
        phone: phone,
        password: securePassword,
        location: {
          pincode: pincode,
          address: address,
        },
      });

      const user = await newUser.save();
      const data = {
        user: {
          id: user.id
        },
      };

      const userToken = jwt.sign(data, secret);

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
      return res.json({ success, myprofile, userToken, status: 200 });
    } catch (error) {
      res.send({ error: "Internal Server Error", status: 500 });
    }
  }
);

// ROUTE 2: Login a user using POST. No Login Required.
router.post(
  "/login",
  [
    body("email", "Enter a valid email!").isEmail(),
    body("password", "Password cannot be blank").exists(),
  ],
  async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      success = false;
      return res.json({ success, error: errors.array()[0].msg, status: 400 });
    }
    const { email, password } = req.body;
    try {
      let user = await User.findOne({ email: email });
      if (!user) {
        success = false;
        return res.json({
          success,
          error: "No account is associated with this email!",
          status: 400,
        });
      }

      const passwordCompare = await bcrypt.compare(password, user.password);
      if (!passwordCompare) {
        success = false;
        return res.json({ success, error: "Wrong Credentials!", status: 400 });
      }

      const data = {
        user: {
          id: user.id,
        },
      };

      const userToken = jwt.sign(data, secret);

      let cart = [];
      if (user.cart.length !== 0) {
        for (let i = 0; i < user.cart.length; i++) {
          let item = await Product.findById(user.cart[i].product.toString());
          cart.push(item);
        }
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
      return res.json({ success, myprofile, cart, userToken, status: 200 });
    } catch (error) {
      res.send({ error: error.message, status: 500 });
    }
  }
);

// ROUTE 3: Get logged-in merchant details using GET. Login Required.
router.get("/profile", fetchUser, async (req, res) => {
  let success = false;
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
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
    return res.json({ success, myprofile, status: 200 });
  } catch (error) {
    res.send({ error: "Internal Server Error", status: 500 });
  }
});

// ROUTE 4: Edit merchant details using PUT. Require Login.
router.put("/editProfile", fetchUser, async (req, res) => {
  let success = false;
  try {
    const userId = req.user.id;
    let user = await User.findById(userId);
    let user1 = await User.findOne({ email: req.body.email });
    if (user1 && user1._id.toString() !== userId) {
      success = false;
      return res.json({
        success,
        error: "This email is associated to another account",
        status: 400,
      });
    }

    let user2 = await User.findOne({ phone: req.body.phone });
    if (user2 && user2._id.toString() !== userId) {
      success = false;
      return res.json({
        success,
        error: "This phone number is already taken",
        status: 400,
      });
    }

    let { name, email, phone, pincode, address } = req.body;

    let newuser = {
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: {
        pincode: user.location.pincode,
        address: user.location.address,
      },
    };

    if (req.body.name) {
      newuser.name = name;
    }

    if (req.body.email) {
      newuser.email = email;
    }

    if (req.body.phone) {
      newuser.phone = phone;
    }

    if (req.body.pincode) {
      newuser.location = {
        pincode: pincode,
        address: user.location.address
      };
    }

    if (req.body.address) {
      newuser.location = {
        pincode: user.location.pincode,
        address: address
      };
    }

    if (!user) {
      success = false;
      return res.send({ success, error: "Not Found", status: 404 });
    }

    if (user._id.toString() !== req.user.id) {
      success = false;
      return res.send({ success, error: "This is not allowed", status: 401 });
    }

    user = await User.findByIdAndUpdate(
      userId,
      { $set: newuser },
      { new: true }
    );

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
    res.send({ success, myprofile, status: 200 });
  } catch (error) {
    success = false;
    res.send({ success, error: error.message, status: 500 });
  }
});

module.exports = router;