import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { parse } from "csv-parse/sync";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

// Modular Imports
import { loadCSV, saveCSV } from "./server/dataHandler";
import { sendMoney } from "./server/paymentEngine";
import { getFinancialAdvice, getSIPRecommendation } from "./server/financialAdvisor";
import { getLoanEligibility } from "./server/loanEngine";

dotenv.config();

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  });
}

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory OTP store (mobile -> otp)
const otpStore: Record<string, string> = {};

// Indian numbering system formatter
function formatINR(amount: number | string) {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(numericAmount);
}

// Simple Scam Checker
function analyzeFraud(text: string) {
  const lowerText = text.toLowerCase();
  const highRiskKeywords = ["urgent", "password", "suspended", "prize", "cash", "otp", "karo", "lottery", "link", "verify"];
  const mediumRiskKeywords = ["official", "update", "click", "limit", "kyc", "aadhaar", "pan"];
  
  let score = 0;
  const indicators: string[] = [];

  highRiskKeywords.forEach(word => {
    if (lowerText.includes(word)) {
      score += 0.35;
      indicators.push(`Urgent word: "${word}" detected`);
    }
  });

  mediumRiskKeywords.forEach(word => {
    if (lowerText.includes(word)) {
      score += 0.15;
      indicators.push(`Asking for: "${word}"`);
    }
  });

  if (lowerText.includes("http") || lowerText.includes("www")) {
    score += 0.2;
    indicators.push("Contains a link");
  }

  const confidence = Math.min(score, 0.99);
  let riskLevel = "Low";
  if (confidence > 0.7) riskLevel = "High";
  else if (confidence > 0.3) riskLevel = "Medium";

  return {
    prediction: riskLevel === "Low" ? "Safe" : "Scam",
    riskLevel,
    probability: Math.round(confidence * 100),
    reason: indicators.length > 0 
      ? `This message looks like a scam because: ${indicators.join(". ")}.`
      : "This message looks safe."
  };
}

// Simple Savings Health Check
function getFinancialHealth(customerId: string) {
  const transactions = loadCSV("transactions.csv");
  const customerTransactions = transactions.filter((t: any) => t.customer_id === customerId);
  
  if (customerTransactions.length === 0) return { score: 50, trend: "N/A", suggestions: ["Start using your account to see your score."] };

  let totalIncome = 0;
  let totalExpense = 0;
  const categories: Record<string, number> = {};

  customerTransactions.forEach((t: any) => {
    const amount = parseFloat(t.amount);
    if (t.type === "Credit") totalIncome += amount;
    else {
      const absAmount = Math.abs(amount);
      totalExpense += absAmount;
      categories[t.category] = (categories[t.category] || 0) + absAmount;
    }
  });

  if (totalIncome === 0) return { 
    score: 20, 
    trend: "Static",
    breakdown: { income: 0, expense: totalExpense, categories },
    suggestions: ["No salary or income found. Please check your deposits."] 
  };

  const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;
  let score = 50 + (savingsRate * 0.5);
  score = Math.max(0, Math.min(100, Math.round(score)));

  const suggestions = [];
  const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories.length > 0 ? sortedCategories[0] : ["Misc", 0];

  if (score < 40) {
    suggestions.push(`Your spending is high. Try to spend less on ${topCategory[0]}.`);
    suggestions.push("Try to save at least ₹5,000 every month.");
  } else if (score < 75) {
    suggestions.push(`Good job! If you save ₹10,000 more, you will reach your goals faster.`);
    suggestions.push(`Try to reduce your ${topCategory[0]} spending.`);
  } else {
    suggestions.push("Great job! You are saving a lot of money.");
    suggestions.push("You can invest your extra money to grow your wealth.");
  }

  return { 
    score, 
    trend: "Improving",
    breakdown: { income: totalIncome, expense: totalExpense, categories },
    suggestions 
  };
}

// Simple Monthly Tips
function generateInsights(customerId: string) {
  const transactions = loadCSV("transactions.csv");
  const customerTransactions = transactions.filter((t: any) => t.customer_id === customerId);
  const insights = [];

  // Monthly spending summary
  const totalSpend = customerTransactions
    .filter((t: any) => t.type === "Debit")
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

  // Category breakdown for insights
  const categorySpend: Record<string, number> = {};
  customerTransactions.forEach((t: any) => {
    if (t.type === "Debit") {
      categorySpend[t.category] = (categorySpend[t.category] || 0) + parseFloat(t.amount);
    }
  });

  const sortedCategories = Object.entries(categorySpend).sort((a, b) => b[1] - a[1]);
  
  if (sortedCategories.length > 0) {
    const [topCat, topAmount] = sortedCategories[0];
    insights.push({
      title: `${topCat} is your top expense`,
      description: `You spent ${formatINR(topAmount)} on ${topCat} this month.`,
      icon: topCat.toLowerCase() === 'food' ? 'shopping-bag' : 'alert',
      severity: topAmount > 10000 ? 'medium' : 'low'
    });
  }

  // Salary check
  const salary = customerTransactions.find((t: any) => t.category === "Salary");
  if (salary) {
    const s = salary as any;
    insights.push({
      title: "Salary Received",
      description: `Your salary of ${formatINR(s.amount)} was credited on ${s.date}.`,
      icon: "trending-up",
      severity: "low"
    });
  }

  // Savings Tip
  if ((totalSpend as number) > 20000) {
    insights.push({
      title: "Save More",
      description: "Moving ₹5,000 to a Fixed Deposit could help you reach your goals faster.",
      icon: "trending-up",
      severity: "high"
    });
  }

  return insights;
}

// OTP Auth Routes
app.post("/api/send-otp", (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: "Please enter your Mobile Number or Customer ID" });

  const users = loadCSV("users.csv");
  // Find user by mobile or customer_id
  const user = users.find((u: any) => u.mobile === identifier || u.customer_id === identifier);

  if (!user) {
    return res.status(404).json({ error: "User not found. Please check your details." });
  }

  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  // Store OTP against the identifier used
  otpStore[identifier] = otp;

  console.log(`[AUTH] OTP for ${identifier} (${(user as any).name}): ${otp}`);
  
  res.json({ success: true, message: "OTP sent successfully" });
});

app.post("/api/verify-otp", (req, res) => {
  const { identifier, otp } = req.body;
  if (!identifier || !otp) return res.status(400).json({ error: "Details are missing" });

  if (otpStore[identifier] === otp) {
    const users = loadCSV("users.csv");
    const user = users.find((u: any) => u.mobile === identifier || u.customer_id === identifier);
    delete otpStore[identifier];

    const customers = loadCSV("customers.csv");
    const customerFull = customers.find((c: any) => c.customer_id === (user as any).customer_id);

    return res.json({ 
      success: true, 
      customer_id: (user as any).customer_id, 
      name: (user as any).name,
      city: (customerFull as any)?.city || 'Unknown',
      mobile: (customerFull as any)?.mobile || (user as any).mobile
    });
  }

  res.status(400).json({ error: "Invalid OTP. Please try again." });
});

// API Routes
app.get("/api/account-details", (req, res) => {
  const { customer_id } = req.query;
  const customers = loadCSV("customers.csv");
  const customer = customers.find((c: any) => c.customer_id === customer_id);

  if (!customer) return res.status(404).json({ error: "User not found" });

  const transactions = loadCSV("transactions.csv");
  const userTxs = transactions.filter((t: any) => t.customer_id === customer_id);
  const last5 = userTxs
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  res.json({
    balance: formatINR((customer as any).balance),
    rewards_balance: formatINR((customer as any).rewards_balance || 0),
    account_type: (customer as any).account_type,
    interest_rate: (customer as any).interest_rate,
    credit_score: (customer as any).credit_score,
    last_transactions: last5.map(t => {
      const tx = t as any;
      return {
        ...tx,
        amount_formatted: formatINR(Math.abs(parseFloat(tx.amount)))
      };
    })
  });
});

app.get("/api/loans", (req, res) => {
  const { customer_id } = req.query;
  const loans = loadCSV("loans.csv");
  const customerLoans = loans.filter((l: any) => l.customer_id === customer_id);
  res.json(customerLoans.map(l => {
    const loan = l as any;
    return {
      ...loan,
      loan_amount_formatted: formatINR(loan.loan_amount),
      emi_formatted: formatINR(loan.emi)
    };
  }));
});

app.post("/api/fraud-check", (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Please enter some text" });
  res.json(analyzeFraud(text));
});

app.get("/api/financial-score", (req, res) => {
  const { customer_id } = req.query;
  if (!customer_id) return res.status(400).json({ error: "Something went wrong. Please log in again." });
  res.json(getFinancialHealth(customer_id as string));
});

app.get("/api/insights", (req, res) => {
  const { customer_id } = req.query;
  res.json(generateInsights(customer_id as string));
});

app.get("/api/subscriptions", (req, res) => {
  const { customer_id } = req.query;
  const subs = loadCSV("subscriptions.csv");
  const customerSubs = subs.filter((s: any) => s.customer_id === customer_id);
  res.json(customerSubs.map(s => {
    const sub = s as any;
    return {
      ...sub,
      cost_formatted: formatINR(sub.monthly_cost)
    };
  }));
});

app.post("/api/chat", async (req, res) => {
  const { message, customer_id } = req.body;
  const lowerMsg = message.toLowerCase();

  const intents = {
    balance: lowerMsg.includes("balance") || lowerMsg.includes("account") || lowerMsg.includes("paisa"),
    ledger: lowerMsg.includes("transaction") || lowerMsg.includes("history") || lowerMsg.includes("khata") || lowerMsg.includes("statement"),
    loan: lowerMsg.includes("loan") || lowerMsg.includes("emi") || lowerMsg.includes("karz"),
    score: lowerMsg.includes("score") || lowerMsg.includes("health") || lowerMsg.includes("status"),
    fraud: lowerMsg.includes("scam") || lowerMsg.includes("fraud") || lowerMsg.includes("security") || lowerMsg.includes("risk")
  };

  const results = [];
  
  if (intents.balance) {
    const customers = loadCSV("customers.csv");
    const customer = customers.find((c: any) => c.customer_id === customer_id);
    results.push(`Your balance is ${formatINR((customer as any)?.balance || 0)}.`);
  }

  if (intents.ledger) {
    const transactions = loadCSV("transactions.csv");
    const last3 = transactions.filter((t: any) => t.customer_id === customer_id).slice(-3).reverse();
    const list = last3.map((t: any) => `${t.description} of ${formatINR(t.amount)}`).join(", ");
    results.push(`Your last few transactions were: ${list}.`);
  }

  if (intents.loan) {
    const loans = loadCSV("loans.csv");
    const myLoans = loans.filter((l: any) => l.customer_id === customer_id);
    if (myLoans.length > 0) {
      const list = (myLoans as any[]).map((l: any) => `${l.type} with EMI of ${formatINR(l.emi)}`).join(", ");
      results.push(`Your loans are: ${list}.`);
    } else {
      results.push("You don't have any active loans with us.");
    }
  }

  if (intents.score) {
    const health = getFinancialHealth(customer_id);
    results.push(`Your score is ${health.score}/100. It is ${health.trend}. Tip: ${health.suggestions[0]}`);
  }

  if (intents.fraud) {
    results.push("I can help you check for scams. Go to the 'Check for Scam' tab and paste the message there.");
  }

  if (results.length > 0) {
    return res.json({ response: results.join(" ") });
  }

  res.json({ response: null });
});

app.get("/api/spending-stats", (req, res) => {
  const { customer_id } = req.query;
  if (!customer_id) return res.status(400).json({ error: "Missing customer_id" });

  const transactions = loadCSV("transactions.csv");
  const customerTransactions = transactions.filter((t: any) => t.customer_id === customer_id);

  // Group by date for the last 30 days
  const stats: Record<string, number> = {};
  customerTransactions.forEach((t: any) => {
    if (t.type === 'Debit') {
      const date = t.date;
      stats[date] = (stats[date] || 0) + parseFloat(t.amount);
    }
  });

  const chartData = Object.entries(stats)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-15); // Last 15 data points

  res.json(chartData);
});

app.get("/api/transactions/full", (req, res) => {
  const { customer_id, category, date } = req.query;
  let transactions = loadCSV("transactions.csv");
  
  let filtered = transactions.filter((t: any) => t.customer_id === customer_id);
  
  if (category) {
    filtered = filtered.filter((t: any) => t.category.toLowerCase() === (category as string).toLowerCase());
  }
  
  if (date) {
    filtered = filtered.filter((t: any) => t.date === date);
  }

  res.json(filtered
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((t: any) => ({
      ...t,
      amount_formatted: formatINR(Math.abs(parseFloat(t.amount)))
    })));
});

app.post("/api/send-money", (req, res) => {
  const { customer_id, receiver_identifier, amount } = req.body;
  if (!customer_id || !receiver_identifier || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const result = sendMoney(customer_id, receiver_identifier, parseFloat(amount));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/financial-advice", (req, res) => {
  const { customer_id } = req.query;
  try {
    const advice = getFinancialAdvice(customer_id as string);
    const sip = getSIPRecommendation(customer_id as string);
    res.json({ ...advice, ...sip });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/sip-suggestion", (req, res) => {
  const { customer_id } = req.query;
  try {
    const sip = getSIPRecommendation(customer_id as string);
    res.json(sip);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/loan-eligibility", (req, res) => {
  const { customer_id } = req.query;
  try {
    const result = getLoanEligibility(customer_id as string);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
