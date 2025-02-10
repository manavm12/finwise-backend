const OpenAI = require("openai");
const Expense = require("../models/expense");
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

    // Categorize expenses & identify high-spending anomalies
    let categoryBreakdown = {};
    let totalSpending = 0;
    let highestExpense = { description: "", amount: 0, category: "" };
    let dailySpendingData = {}; // Store spending per day

    expenses.forEach((expense) => {
      totalSpending += expense.amount;

      // Category-wise breakdown
      categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] || 0) + expense.amount;

      // Identify highest single expense
      if (expense.amount > highestExpense.amount) {
        highestExpense = { description: expense.description, amount: expense.amount, category: expense.category };
      }

      // Track daily spending trends
      const expenseDate = expense.date.toISOString().split("T")[0]; // Convert to YYYY-MM-DD
      dailySpendingData[expenseDate] = (dailySpendingData[expenseDate] || 0) + expense.amount;
    });

    // Adjust calculations based on actual days elapsed
    const daysElapsed = now.getDate(); // Number of days passed this month
    const avgDailySpending = daysElapsed > 0 ? totalSpending / daysElapsed : 0;

    // Identify large one-time expenses (above 50% of total spending)
    const oneTimeExpenses = expenses.filter(exp => exp.amount >= totalSpending * 0.5).map(exp => ({
      description: exp.description,
      amount: exp.amount,
      category: exp.category
    }));

    // Prepare structured data for OpenAI
    const spendingData = `
    - Total Spending This Month: **$${totalSpending.toFixed(2)}**
    - Average Daily Spending (Last ${daysElapsed} Days): **$${avgDailySpending.toFixed(2)}**
    - Category Breakdown: ${JSON.stringify(categoryBreakdown, null, 2)}
    - Highest Single Expense: **${highestExpense.description} ($${highestExpense.amount})** in **${highestExpense.category}**
    - Large One-Time Expenses: ${oneTimeExpenses.length > 0 ? JSON.stringify(oneTimeExpenses, null, 2) : "None"}
    - Spending Pattern (Daily Breakdown): ${JSON.stringify(dailySpendingData, null, 2)}
    - Last ${expenses.length} Expenses: ${expenses.map((exp) => `${exp.description} ($${exp.amount})`).join(", ")}
    `;

    // Generate OpenAI Prompt
    const prompt = `
    You are a **financial assistant** that specializes in analyzing user expenses and providing personalized advice.
      ### Context:
      Here is the user's spending data:  
      **${spendingData}**

      ### User Query:  
      **"${userQuery}"**

      ### Instructions:
      1. **Do NOT provide general knowledge answers or irrelevant information. Focus exclusively on the user's spending data and query.**
      2. **Overspending**: 
        - If the user is overspending in a category, identify the specific areas where they can reduce expenses.
        - Suggest realistic, actionable ways to save money.
      3. **Within Budget**: 
        - If the user is within budget, highlight their financial strengths.
        - Provide ideas for financial growth, such as savings plans, investments, or achieving financial goals.
      4. **Large One-Time Expenses**: 
        - If there are large one-time expenses, explain why these should not be averaged with recurring expenses.
        - Discuss how these expenses impact their overall spending and budgeting.
      5. **Trends**: 
        - Highlight spending patterns, trends, or anomalies that may be important for the user to consider.

      ### Response Format:
      Use the following format for clarity and structure:

      - **Summary of Spending**:  
        Provide a concise overview of their spending and financial status.

      - **Key Insights**:  
        Highlight overspending, underspending, trends, or anomalies.

      - **Actionable Suggestions**:  
        Offer clear, specific advice based on their financial situation.

      - **Next Steps**:  
        Suggest steps they can take to improve their financial habits or achieve their goals.
    `;

    //Send the request to OpenAI
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
