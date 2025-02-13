const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hashed Password
  monthlyBudget: { type: Number, default: 0 },
  budgetUsed: { type: Number, default: 0 },
  repeatedExpenses: [
    {
      description: { type: String, required: true },
      category: { type: String, required: true },
      amount: { type: Number, required: true },
      isActive: { type: Boolean, default: false },
    }
  ],
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", UserSchema);
module.exports = User;
