const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/database");
const userRoutes = require("./routes/userRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const aiRoutes = require("./routes/aiRoutes");
const chatRoutes = require("./routes/chatRoutes");


// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express App
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Allows JSON requests

// Default Route
app.get("/", (req, res) => {
  res.send("Finwise API is running...");
});

app.use("/api/users", userRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/chat", chatRoutes);


// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
