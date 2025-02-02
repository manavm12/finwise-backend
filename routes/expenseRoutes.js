const express = require("express");
const Expense = require("../models/expense");

const router = express.Router();

// 📌 Add a new expense
router.post("/add", async (req, res) => {
  const { userId, description, category, amount } = req.body;

  try {
    const expense = new Expense({ userId, description, category, amount });
    await expense.save();

    res.status(201).json({ message: "Expense added successfully", expense });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// 📌 Get all expenses for a user
router.get("/:userId", async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.params.userId }).sort({ date: -1 }); // Latest first
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// 📌 Delete an expense
router.delete("/:id", async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

router.put("/update/:id", async (req, res) => {
  const { description, category, amount, date } = req.body;

  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    if (description) expense.description = description;
    if (category) expense.category = category;
    if (amount) expense.amount = amount;


    await expense.save();
    res.json({ message: "Expense updated successfully", expense });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});


module.exports = router;
