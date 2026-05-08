const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app = express();
app.set('trust proxy', 1);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 3600000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Make session user available in views
app.use((req, res, next) => {
  res.locals.admin = req.session.admin;
  next();
});

// Routes
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Serve static HTML files (your existing frontend)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});
app.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'products.html'));
});
app.get('/newproducts', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'newproducts.html'));
});
app.get('/stakeholders', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'stakeholders.html'));
});
app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'contact.html'));
});
app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'cart.html'));
});
app.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'checkout.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
