const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const Subscriber = require('../models/Subscriber');
const CustomerBehavior = require('../models/CustomerBehavior');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

// Email setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Get all products
router.get('/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// Get new products (for homepage banner link)
router.get('/new-products', async (req, res) => {
  const newProducts = await Product.find({ isNewProduct: true }).sort({ createdAt: -1 });
  res.json(newProducts);
});

// Subscribe to new product updates
router.post('/subscribe', async (req, res) => {
  const { name, email } = req.body;
  try {
    const subscriber = new Subscriber({ name, email });
    await subscriber.save();
    res.json({ success: true, message: 'Subscribed successfully' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Email already exists' });
  }
});

// Place order (payment simulation & stock reduction)
router.post('/checkout', async (req, res) => {
  const { customer, items, paymentMethod } = req.body;
  try {
    if (!customer?.name || !customer?.email || !customer?.phone || !customer?.location) {
      return res.status(400).json({ success: false, message: 'Please complete your contact details and location' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ success: false, message: 'Please choose a payment method' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const orderItems = items.map(item => ({
      productId: item.productId || item.id || item._id,
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity)
    }));

    if (orderItems.some(item => !mongoose.Types.ObjectId.isValid(item.productId) || item.quantity <= 0)) {
      return res.status(400).json({ success: false, message: 'One or more cart items are invalid. Please add them again.' });
    }

    // Check stock
    for (let item of orderItems) {
      const product = await Product.findById(item.productId);
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product?.name || item.name || 'an item'}` });
      }
    }
    // Reduce stock
    for (let item of orderItems) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
    }
    // Save order
    const order = new Order({
      customer,
      items: orderItems,
      paymentMethod,
      total: orderItems.reduce((sum, i) => sum + (i.price * i.quantity), 0)
    });
    await order.save();

    // Track customer behavior
    let behavior = await CustomerBehavior.findOne({ email: customer.email });
    if (!behavior) {
      behavior = new CustomerBehavior({ email: customer.email, purchasedCategories: [], viewedProducts: [] });
    }
    for (let item of orderItems) {
      const prod = await Product.findById(item.productId);
      if (prod && !behavior.purchasedCategories.includes(prod.category)) {
        behavior.purchasedCategories.push(prod.category);
      }
    }
    behavior.lastPurchaseDate = new Date();
    await behavior.save();

    // Send email receipt. Do not fail the order if email delivery is unavailable.
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: customer.email,
        subject: 'MILCO Order Confirmation',
        html: `<h3>Thank you ${customer.name}</h3><p>Your order #${order._id} has been received.</p><p>Payment method: ${paymentMethod}</p><p>Location: ${customer.location}</p>`
      });
    } catch (err) {
      console.error('Order confirmation email failed:', err.message);
    }

    // Admin dashboard notification (will be fetched by admin panel)
    res.json({ success: true, orderId: order._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get product recommendations based on customer email
router.post('/recommendations', async (req, res) => {
  const { email } = req.body;
  const behavior = await CustomerBehavior.findOne({ email });
  if (!behavior || behavior.purchasedCategories.length === 0) {
    const products = await Product.find().limit(4);
    return res.json(products);
  }
  const recs = await Product.find({ category: { $in: behavior.purchasedCategories }, stock: { $gt: 0 } }).limit(4);
  res.json(recs);
});

module.exports = router;
