const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  subscribedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Subscriber', subscriberSchema);