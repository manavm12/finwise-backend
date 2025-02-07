const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Register New User
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Validate input fields
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    // Hash password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    user = new User({ username, email, password: hashedPassword });

    await user.save();
    res.status(201).json({
      message: "User registered successfully",
      user: { id: user._id, username: user.username, email: user.email }, // Exclude password
    });

  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// User Login (with JWT)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input fields
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT Token
    const token = jwt.sign(
      { id: user._id }, // Payload
      process.env.JWT_SECRET, // Secret key from .env
      { expiresIn: "7d" } // Expires in 7 days
    );

    res.status(200).json({
      message: "Login successful",
      user: { id: user._id, username: user.username, email: user.email },
      token,
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get All Users (for testing only)
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password"); // Exclude passwords
    res.json(users);
  } catch (error) {
    console.error("Get Users Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/add-repeated-expense", authMiddleware, async (req, res) => {
  const { description, category, amount } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.repeatedExpenses.push({ description, category, amount, isActive: false });
    await user.save();

    res.status(201).json({ message: "Repeated Expense added successfully", repeatedExpenses: user.repeatedExpenses });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 📌 Get User's Repeated Expenses
router.get("/repeated-expenses", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("repeatedExpenses");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.repeatedExpenses);

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 📌 Toggle Activation of Repeated Expense
router.put("/toggle-repeated-expense/:index", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const index = req.params.index;
    if (index >= user.repeatedExpenses.length) {
      return res.status(400).json({ message: "Invalid index" });
    }

    user.repeatedExpenses[index].isActive = !user.repeatedExpenses[index].isActive;
    await user.save();

    res.json({ message: "Repeated Expense updated", repeatedExpenses: user.repeatedExpenses });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/budget", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("monthlyBudget");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ monthlyBudget: user.monthlyBudget });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 📌 Update Monthly Budget
router.put("/update-budget", authMiddleware, async (req, res) => {
  const { monthlyBudget } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.monthlyBudget = monthlyBudget;
    await user.save();

    res.json({ message: "Monthly budget updated", monthlyBudget: user.monthlyBudget });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.delete("/delete-repeated-expense/:index", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const index = req.params.index;
    if (index >= user.repeatedExpenses.length) {
      return res.status(400).json({ message: "Invalid index" });
    }

    user.repeatedExpenses.splice(index, 1); // Remove the repeated expense
    await user.save();

    res.json({ message: "Repeated expense deleted successfully", repeatedExpenses: user.repeatedExpenses });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
