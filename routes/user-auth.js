const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fetchUser = require("../middlewares/fetchUser");
const User = require("../models/User");

const router = express.Router();

const secret = process.env.JWT_SECRET;

// ROUTE 1: Register a user using POST. No Login Required.
router.post(
  "/register",
  [
    body("name", "Name cannot be less than 5 characters!").isLength({ min: 5 }),
    body("email", "Enter a valid email!").isEmail(),
    body("phone", "Enter a valid phone number!").isLength({ min: 10 }),
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
      const user = newUser.save();
      const data = {
        user: {
          id: user.id
        },
      };
      const userToken = jwt.sign(data, secret);
      success = true;
      return res.json({ success, user, userToken, status: 200 });
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
      success = true;
      return res.json({ success, user, userToken, status: 200 });
    } catch (error) {
      res.send({ error: "Internal Server Error", status: 500 });
    }
  }
);

// ROUTE 3: Get logged-in merchant details using GET. Login Required.
router.post("/profile", fetchUser, async (req, res) => {
  let success = false;
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    success = true;
    return res.json({ success, user, status: 200 });
  } catch (error) {
    res.send({ error: "Internal Server Error", status: 500 });
  }
});

// ROUTE 4: Edit merchant details using PUT. Require Login.
router.put("/editProfile", fetchUser, async (req, res) => {
  let success = false;
  try {
    const merchantId = req.user.id;
    let merchant = await Merchant.findById(merchantId);
    let merchant1 = await Merchant.findOne({ email: req.body.email });
    if (merchant1 && merchant1._id.toString() !== merchantId) {
      success = false;
      return res.json({
        success,
        error: "This email is associated to another account",
        status: 400,
      });
    }

    let merchant2 = await Merchant.findOne({ username: req.body.phone });
    if (merchant2 && merchant2._id.toString() !== merchantId) {
      success = false;
      return res.json({
        success,
        error: "This username is already taken",
        status: 400,
      });
    }

    let { name, email, phone, pincode, address } = req.body;

    let newmerchant = {
      name: merchant.name,
      email: merchant.email,
      phone: merchant.phone,
      location: {
        pincode: merchant.location.pincode,
        address: merchant.location.address,
      },
    };

    if (req.body.name) {
      newmerchant.name = name;
    }

    if (req.body.email) {
      newmerchant.email = email;
    }

    if (req.body.phone) {
      newmerchant.phone = phone;
    }

    if (req.body.pincode) {
      newmerchant.location = {
          pincode: pincode,
          address: merchant.location.address
      };
    }

    if (req.body.address) {
      newmerchant.location = {
          pincode: merchant.location.pincode,
          address: address
      };
    }

    if (!merchant) {
      success = false;
      return res.send({ success, error: "Not Found", status: 404 });
    }

    if (merchant._id.toString() !== req.user.id) {
      success = false;
      return res.send({ success, error: "This is not allowed", status: 401 });
    }

    merchant = await Merchant.findByIdAndUpdate(
      merchantId,
      { $set: newmerchant },
      { new: true }
    );
    success = true;
    res.send({ success, merchant, status: 200 });
  } catch (error) {
    success = false;
    res.send({ success, error: error.message, status: 500 });
  }
});

module.exports = router;