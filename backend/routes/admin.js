const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Subscriber = require('../models/Subscriber');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../../public/uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Admin login page
router.get('/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin/dashboard');
  res.sendFile(path.join(__dirname, '../../public/admin-login.html'));
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    req.session.admin = { email };
    res.redirect('/admin/dashboard');
  } else {
    res.redirect('/admin/login?error=1');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Admin dashboard (protected)
router.get('/dashboard', auth, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/admin-dashboard.html'));
});

// API endpoints for admin (JSON)
router.get('/api/products', auth, async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

router.post('/api/products', auth, upload.single('image'), async (req, res) => {
  const { name, price, stock, category, description, isNew } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
  const isNewProduct = isNew === 'on' || isNew === 'true' || isNew === true;
  const product = new Product({ name, price, stock, category, description, imageUrl, isNewProduct });
  await product.save();

  // If product is marked new, send email to all subscribers
  if (product.isNewProduct) {
    try {
      const subscribers = await Subscriber.find();
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });

      for (let sub of subscribers) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: sub.email,
          subject: `New Product: ${product.name}`,
          html: `<h3>New product matches your interest!</h3><p>${product.name} - M${product.price}</p><a href="http://localhost:3000/newproducts">View now</a>`
        });
      }
    } catch (err) {
      console.error('New product notification failed:', err.message);
    }
  }
  res.json({ success: true });
});

router.put('/api/products/:id', auth, upload.single('image'), async (req, res) => {
  const { name, price, stock, category, description, isNew, isNewProduct } = req.body;
  const update = { name, price, stock, category, description };

  if (typeof isNew !== 'undefined' || typeof isNewProduct !== 'undefined') {
    const newValue = typeof isNewProduct !== 'undefined' ? isNewProduct : isNew;
    update.isNewProduct = newValue === 'on' || newValue === 'true' || newValue === true;
  }

  if (req.file) update.imageUrl = `/uploads/${req.file.filename}`;
  const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
  res.json({ success: true, product });
});

router.delete('/api/products/:id', auth, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

router.get('/api/orders', auth, async (req, res) => {
  const orders = await Order.find().populate('items.productId').sort({ createdAt: -1 });
  res.json(orders);
});

router.get('/api/notifications', auth, async (req, res) => {
  const newOrders = await Order.countDocuments({ createdAt: { $gt: new Date(Date.now() - 24*60*60*1000) } });
  const lowStock = await Product.countDocuments({ stock: { $lt: 5 } });
  res.json({ newOrders, lowStock });
});

module.exports = router;
