const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sessionId: { type: String, required: true },
  sessionName: { type: String, required: true }, 
  query: { type: String, required: true },
  response: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ChatHistory = mongoose.model("ChatHistory", chatSchema);
module.exports = ChatHistory;
