const mongoose = require('mongoose');

const behaviorSchema = new mongoose.Schema({
  email: String,
  viewedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  purchasedCategories: [String],
  lastPurchaseDate: Date
});

module.exports = mongoose.model('CustomerBehavior', behaviorSchema);