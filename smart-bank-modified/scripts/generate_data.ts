import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const INDIAN_NAMES = [
  "Rahul Sharma", "Amit Patel", "Neha Gupta", "Priya Singh", "Sanjay Kumar",
  "Anjali Verma", "Vikram Reddy", "Deepak Rao", "Sunita Nair", "Rohan Das",
  "Kiran Joshi", "Meera Iyer", "Arun Malhotra", "Suresh Prabhu", "Pooja Hegde",
  "Rajesh Khanna", "Swati Kulkarni", "Aditya Bose", "Kavita Menon", "Vijay Chauhan"
];

const CITIES = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Pune", "Jaipur", "Lucknow"];
const MERCHANTS = {
  Food: ["Swiggy", "Zomato", "McDonalds", "Blinkit", "BigBasket", "Local Restaurant"],
  Shopping: ["Amazon", "Flipkart", "Myntra", "Ajio", "Reliance Digital", "DMart"],
  Travel: ["Uber", "Ola", "IndiGo", "IRCTC", "Petrol Pump", "Metro Recharge"],
  Bills: ["Airtel", "Jio", "BESCOM", "TATA Play", "Adani Gas"],
  UPI: ["Friend Transfer", "Kirana Store", "Milk Vendor", "Laundry"]
};

function generateData() {
  const customers = [];
  const users = [];
  const loans = [];
  const transactions = [];
  const subscriptions = [];

  const SERVICES = [
    { name: "Netflix", cost: 499 },
    { name: "Spotify", cost: 119 },
    { name: "Amazon Prime", cost: 179 },
    { name: "Disney+ Hotstar", cost: 299 },
    { name: "YouTube Premium", cost: 129 }
  ];

  for (let i = 1; i <= 100; i++) {
    const customerId = `C${String(i).padStart(3, '0')}`;
    const name = INDIAN_NAMES[i % INDIAN_NAMES.length];
    const mobile = `9${Math.floor(100000000 + Math.random() * 899999999)}`;
    const age = 22 + Math.floor(Math.random() * 40);
    const accountType = Math.random() > 0.3 ? "Savings" : "Current";
    const balance = 50000 + Math.floor(Math.random() * 500000);
    const creditScore = 600 + Math.floor(Math.random() * 250);
    const city = CITIES[i % CITIES.length];

    customers.push(`${customerId},${name},${age},${mobile},${accountType},${balance.toFixed(2)},4.0,${creditScore},${city}`);
    users.push(`${customerId},${name.split(' ')[0]},${mobile}`);

    // Loans
    if (Math.random() > 0.6) {
      const loanId = `L${String(i).padStart(3, '0')}`;
      const type = ["Home", "Car", "Personal", "Education"][Math.floor(Math.random() * 4)];
      const amount = 100000 + Math.floor(Math.random() * 2000000);
      const emi = 5000 + Math.floor(Math.random() * 20000);
      loans.push(`${loanId},${customerId},${type},${amount},9.5,15,${emi},Active`);
    }

    // Subscriptions
    if (Math.random() > 0.5) {
      const sub = SERVICES[Math.floor(Math.random() * SERVICES.length)];
      subscriptions.push(`${customerId},${sub.name},${sub.cost},2026-04-15`);
    }

    // Transactions (approx 15-20 per customer)
    const txCount = 15 + Math.floor(Math.random() * 10);
    for (let j = 0; j < txCount; j++) {
      const txId = `T${customerId}${String(j).padStart(3, '0')}`;
      const date = `2026-04-${String(Math.floor(1 + Math.random() * 28)).padStart(2, '0')}`;
      const isCredit = Math.random() > 0.8;
      const type = isCredit ? 'Credit' : 'Debit';
      const category = isCredit ? 'Salary' : Object.keys(MERCHANTS)[Math.floor(Math.random() * Object.keys(MERCHANTS).length)];
      const amount = isCredit ? (25000 + Math.floor(Math.random() * 125000)) : (100 + Math.floor(Math.random() * 5000));
      const merchant = isCredit ? "Company Salary" : MERCHANTS[category][Math.floor(Math.random() * MERCHANTS[category].length)];

      transactions.push(`${txId},${customerId},${date},${type},${amount.toFixed(2)},${category},${merchant}`);
    }
  }

  fs.writeFileSync(path.join(DATA_DIR, 'customers.csv'), "customer_id,name,age,mobile,account_type,balance,interest_rate,credit_score,city\n" + customers.join('\n'));
  fs.writeFileSync(path.join(DATA_DIR, 'users.csv'), "customer_id,name,mobile\n" + users.join('\n'));
  fs.writeFileSync(path.join(DATA_DIR, 'loans.csv'), "loan_id,customer_id,loan_type,loan_amount,interest_rate,tenure_years,emi,status\n" + loans.join('\n'));
  fs.writeFileSync(path.join(DATA_DIR, 'transactions.csv'), "transaction_id,customer_id,date,type,amount,category,merchant_name\n" + transactions.join('\n'));
  fs.writeFileSync(path.join(DATA_DIR, 'subscriptions.csv'), "customer_id,service_name,monthly_cost,last_used_date\n" + subscriptions.join('\n'));

  console.log("Realistic Banking Dataset Generated Successfully!");
}

generateData();
