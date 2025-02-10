const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { analyzeUserSpending } = require("../services/aiService");

const router = express.Router();

// AI Expense Analysis Endpoint
router.post("/analyze-spending", authMiddleware, async (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ message: "Query is required" });
  }

  try {
    const analysis = await analyzeUserSpending(req.user.id, query);
    res.json({ response: analysis });
  } catch (error) {
    console.error("❌ AI Chatbot Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
