const OpenAI = require("openai");
const Expense = require("../models/expense");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 📌 Function to analyze user expenses & generate insights
async function analyzeUserSpending(userId, userQuery) {
  try {
    // ✅ Step 1: Fetch user’s expense data
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const userObjectId = userId;

    const expenses = await Expense.find({
      userId: userObjectId,
      date: { $gte: firstDayOfMonth, $lte: now },
    });

    // ✅ Step 2: Categorize expenses & identify high-spending anomalies
    let categoryBreakdown = {};
    let totalSpending = 0;
    let highestExpense = { description: "", amount: 0, category: "" };
    let dailySpendingData = {}; // Store spending per day

    expenses.forEach((expense) => {
      totalSpending += expense.amount;

      // ✅ Category-wise breakdown
      categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] || 0) + expense.amount;

      // ✅ Identify highest single expense
      if (expense.amount > highestExpense.amount) {
        highestExpense = { description: expense.description, amount: expense.amount, category: expense.category };
      }

      // ✅ Track daily spending trends
      const expenseDate = expense.date.toISOString().split("T")[0]; // Convert to YYYY-MM-DD
      dailySpendingData[expenseDate] = (dailySpendingData[expenseDate] || 0) + expense.amount;
    });

    // ✅ Step 3: Adjust calculations based on actual days elapsed
    const daysElapsed = now.getDate(); // Number of days passed this month
    const avgDailySpending = daysElapsed > 0 ? totalSpending / daysElapsed : 0;

    // ✅ Identify large one-time expenses (above 50% of total spending)
    const oneTimeExpenses = expenses.filter(exp => exp.amount >= totalSpending * 0.5).map(exp => ({
      description: exp.description,
      amount: exp.amount,
      category: exp.category
    }));

    // ✅ Step 4: Prepare structured data for OpenAI
    const spendingData = `
    - Total Spending This Month: **$${totalSpending.toFixed(2)}**
    - Average Daily Spending (Last ${daysElapsed} Days): **$${avgDailySpending.toFixed(2)}**
    - Category Breakdown: ${JSON.stringify(categoryBreakdown, null, 2)}
    - Highest Single Expense: **${highestExpense.description} ($${highestExpense.amount})** in **${highestExpense.category}**
    - Large One-Time Expenses: ${oneTimeExpenses.length > 0 ? JSON.stringify(oneTimeExpenses, null, 2) : "None"}
    - Spending Pattern (Daily Breakdown): ${JSON.stringify(dailySpendingData, null, 2)}
    - Last ${expenses.length} Expenses: ${expenses.map((exp) => `${exp.description} ($${exp.amount})`).join(", ")}
    `;

    // ✅ Step 6: Generate OpenAI Prompt
    const prompt = `
    You are a **financial assistant** that helps users analyze their expenses.
    Here is their spending data:
    ${spendingData}

    User's Query: "${userQuery}"

    - Do NOT provide general knowledge answers.
    - If the user is overspending in a category, suggest specific ways to save.
    - If they are within budget, provide ideas for financial growth.
    - If a large one-time expense exists, explain why it shouldn't be averaged.
    - Format your response with **bold headings** and clear, actionable insights,
    `;

    // ✅ Step 7: Send the request to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("❌ AI Analysis Error:", error);
    return "Sorry, I encountered an error while analyzing your spending.";
  }
}

module.exports = { analyzeUserSpending };
