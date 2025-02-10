const OpenAI = require("openai");
const Expense = require("../models/expense");
const User = require("../models/user"); // Import User model to fetch budget
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Function to analyze user expenses & generate insights
async function analyzeUserSpending(userId, userQuery) {
  try {
    // Fetch user’s expense data
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const userObjectId = userId;

    const expenses = await Expense.find({
      userId: userObjectId,
      date: { $gte: firstDayOfMonth, $lte: now },
    });

    // Fetch Monthly Budget
    const user = await User.findById(userId);
    const monthlyBudget = user?.monthlyBudget || 0;

    // Categorize expenses & identify high-spending anomalies
    let categoryBreakdown = {};
    let totalSpending = 0;
    let highestExpense = { description: "", amount: 0, category: "" };
    let dailySpendingData = {};

    expenses.forEach((expense) => {
      totalSpending += expense.amount;
      categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] || 0) + expense.amount;

      // Identify highest single expense
      if (expense.amount > highestExpense.amount) {
        highestExpense = { description: expense.description, amount: expense.amount, category: expense.category };
      }

      // Track daily spending trends
      const expenseDate = expense.date.toISOString().split("T")[0];
      dailySpendingData[expenseDate] = (dailySpendingData[expenseDate] || 0) + expense.amount;
    });

    // Adjust calculations based on actual days elapsed
    const daysElapsed = now.getDate();
    const avgDailySpending = daysElapsed > 0 ? totalSpending / daysElapsed : 0;
    const remainingBudget = Math.max(monthlyBudget - totalSpending, 0);
    const budgetStatus = totalSpending > monthlyBudget ? "Over Budget" : "Within Budget";

    // Identify large one-time expenses (above 50% of total spending)
    const oneTimeExpenses = expenses.filter(exp => exp.amount >= totalSpending * 0.5).map(exp => ({
      description: exp.description,
      amount: exp.amount,
      category: exp.category
    }));

    // Prepare structured data for OpenAI
    const spendingData = `
    - **Total Spending This Month**: $${totalSpending.toFixed(2)}
    - **Monthly Budget**: $${monthlyBudget.toFixed(2)}
    - **Remaining Budget**: $${remainingBudget.toFixed(2)} (${budgetStatus})
    - **Average Daily Spending**: $${avgDailySpending.toFixed(2)}
    - **Category Breakdown**: ${JSON.stringify(categoryBreakdown, null, 2)}
    - **Highest Single Expense**: ${highestExpense.description} ($${highestExpense.amount}) in ${highestExpense.category}
    - **Large One-Time Expenses**: ${oneTimeExpenses.length > 0 ? JSON.stringify(oneTimeExpenses, null, 2) : "None"}
    - **Daily Spending Pattern**: ${JSON.stringify(dailySpendingData, null, 2)}
    - **Last ${expenses.length} Expenses**: ${expenses.map((exp) => `${exp.description} ($${exp.amount})`).join(", ")}
    `;

    // Generate OpenAI Prompt
    const prompt = `
    You are a **financial assistant** that specializes in analyzing user expenses and providing direct, concise answers.

      ### Context:
      Here is the user's spending data:  
      **${spendingData}**

      ### User Query:  
      **"${userQuery}"**

      ### Instructions:
      1. **Do NOT provide general knowledge answers. 
      2. **Strictly focus on finance/expenditure/money/spending/affordability-related topics. If the user asks about unrelated topics, reply: "I can only help you with finance and expense-related queries."**
      3. **If the user asks about total spending, give a direct number.**
      4. **If the user is overspending, suggest 1-2 simple ways to save money.**
      5. **If within budget, provide 1-2 suggestions for financial growth (e.g., saving, investing).**
      6. **If a large one-time expense is detected, explain why it shouldn't be averaged.**
      7. **If the user asks any questions about statistics that have been fed to you, give direct answer**
      8. ** If the question is close-ended then be direct. Keep your answer short and tell the user exactly they want to hear.**
      9. ** If the question is open-ended then give financial advice by using data provided to you and logical reasoning. Keep your answer limited to MAX 45 sentences.**
    `;

    //Send the request to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200, // Reduced token limit for shorter answers
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("❌ AI Analysis Error:", error);
    return "Sorry, I encountered an error while analyzing your spending.";
  }
}

module.exports = { analyzeUserSpending };
