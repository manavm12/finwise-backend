const express = require("express");
const ChatHistory = require("../models/chatHistory");
const authMiddleware = require("../middleware/authMiddleware");
const { v4: uuidv4 } = require("uuid"); // Generate unique session IDs

const router = express.Router();
const mongoose = require("mongoose");

// 📌 Fetch all chat sessions for a user
router.get("/sessions", authMiddleware, async (req, res) => {
  try {
    const sessions = await ChatHistory.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } }, // Ensure userId is an ObjectId
      {
        $group: {
          _id: "$sessionId",
          sessionName: { $first: "$sessionName" } ,// Assigns session name from the first entry
          lastUpdated: { $max: "$timestamp" }
        }
      },
      { $sort: { lastUpdated: -1 } } // Sort latest first
    ]);

    res.json(sessions);
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});




// 📌 Fetch chat history for a specific session
router.get("/session/:sessionId", authMiddleware, async (req, res) => {
  try {
    const chats = await ChatHistory.find({
      userId: req.user.id,
      sessionId: req.params.sessionId,
    }).sort({ timestamp: 1 }); // Oldest to newest messages

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 📌 Save a new chat to an existing session
router.post("/save", authMiddleware, async (req, res) => {
  const { query, response, sessionId } = req.body;

  try {
    sessionName = query.substring(0, 25) + "..."; // Use first few words of query

    const chat = new ChatHistory({
      userId: req.user.id,
      sessionId: sessionId || uuidv4(), // Generate unique session ID
      sessionName: sessionName,
      query,
      response,
    });

    await chat.save();
    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


module.exports = router;
