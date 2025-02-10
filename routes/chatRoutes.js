const express = require("express");
const ChatHistory = require("../models/chatHistory"); // Import the ChatHistory model
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Route to save chat history
router.post("/save", authMiddleware, async (req, res) => {
  const { userQuery, aiResponse } = req.body;

  if (!userQuery || !aiResponse) {
    return res.status(400).json({ message: "User query and AI response are required." });
  }

  try {
    const chatEntry = new ChatHistory({
      userId: req.user.id,
      query: userQuery,
      response: aiResponse,
      timestamp: new Date(),
    });

    await chatEntry.save();
    res.status(201).json({ message: "Chat saved successfully.", chat: chatEntry });
  } catch (error) {
    console.error("Error saving chat:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Route to fetch chat history
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const chatHistory = await ChatHistory.find({ userId: req.user.id }).sort({ timestamp: 1 });
    res.json(chatHistory);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
