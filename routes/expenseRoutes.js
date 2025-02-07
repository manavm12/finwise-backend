const express = require("express");
const Expense = require("../models/expense");
const authMiddleware = require("../middleware/authMiddleware"); // Import authentication middleware
const mongoose = require("mongoose");

const router = express.Router();

// Add a new expense (Protected)
router.post("/add", authMiddleware, async (req, res) => {
  const { description, category, amount, date } = req.body;

  try {
    const expense = new Expense({
      userId: req.user.id,
      description,
      category,
      amount,
      date: date ? new Date(date) : new Date() // ✅ Ensure it's stored as a Date object
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


router.get("/monthly-spending", authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));

    const userObjectId = new mongoose.Types.ObjectId(req.user.id);

    const totalSpending = await Expense.aggregate([
      { 
        $match: { 
          userId: userObjectId,
          date: { $gte: firstDayOfMonth, $lte: endOfToday } 
        } 
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const total = totalSpending.length > 0 ? totalSpending[0].total : 0;
    res.json({ totalSpendingThisMonth: total });

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

router.get("/by-date/:date", authMiddleware, async (req, res) => {
  try {
    const selectedDate = new Date(req.params.date);
    
    // Normalize selectedDate to remove time (00:00:00)
    selectedDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(selectedDate);
    nextDay.setDate(selectedDate.getDate() + 1); // Get the next day's 00:00:00

    // Filter expenses that fall within this day
    const expenses = await Expense.find({
      userId: req.user.id,
      date: { 
        $gte: selectedDate,  // Start of the selected day
        $lt: nextDay         // Start of the next day (excludes it)
      }
    }).sort({ date: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});



module.exports = router;
