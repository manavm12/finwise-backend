const express = require("express");
const Expense = require("../models/expense");
const authMiddleware = require("../middleware/authMiddleware"); // Import authentication middleware

const router = express.Router();

// Add a new expense (Protected)
router.post("/add", authMiddleware, async (req, res) => {
  const { description, category, amount, date } = req.body;

  try {
    const expense = new Expense({
      userId: req.user.id, // Get user ID from token
      description,
      category,
      amount,
      date: date || new Date(), // Default to current date if not provided
    });

    await expense.save();
    res.status(201).json({ message: "Expense added successfully", expense });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 📌 Get all expenses for logged-in user (Protected)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.user.id }).sort({ date: -1 }); // Latest first
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get a single expense by ID (Protected)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense || expense.userId.toString() !== req.user.id) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update an expense (Protected & Ownership Check)
router.put("/update/:id", authMiddleware, async (req, res) => {
  const { description, category, amount, date } = req.body;

  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense || expense.userId.toString() !== req.user.id) {
      return res.status(404).json({ message: "Expense not found or unauthorized" });
    }

    // Update fields only if provided
    if (description) expense.description = description;
    if (category) expense.category = category;
    if (amount) expense.amount = amount;
    if (date) expense.date = date;

    await expense.save();
    res.json({ message: "Expense updated successfully", expense });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete an expense (Protected & Ownership Check)
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense || expense.userId.toString() !== req.user.id) {
      return res.status(404).json({ message: "Expense not found or unauthorized" });
    }

    await expense.deleteOne();
    res.json({ message: "Expense deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
