
import { loadCSV } from './dataHandler';

export function getFinancialAdvice(customerId: string) {
  const customers = loadCSV('customers.csv');
  const customer = customers.find((c: any) => c.customer_id === customerId);

  if (!customer) throw new Error("Customer not found");

  const age = parseInt((customer as any).age);
  const income = 50000; // Mock profile income if not in CSV, or calculate from transactions
  // In a real app we'd look at transactions to estimate monthly income.
  // For this exercise, let's assume a reasonable income or check transactions.
  
  let advice = "";
  if (age >= 18 && age <= 25) {
    advice = "As a young professional, focus on building wealth early. We suggest starting an SIP of ₹1,000–₹3,000 and maintaining an emergency fund of 3 months expenses.";
  } else if (age > 25 && age <= 40) {
    advice = "Your peak earning years are here. Balance growth and security: Consider an SIP of ₹3,000–₹10,000, ensure you have robust term/health insurance, and start planning for your dream home.";
  } else {
    advice = "Focus on capital preservation and retirement security. Prioritize low-risk investments like Fixed Deposits or Senior Citizen Savings Schemes, and ensure your retirement corpus is well-diversified.";
  }

  return { advice };
}

export function getSIPRecommendation(customerId: string) {
  const customers = loadCSV('customers.csv');
  const customer = customers.find((c: any) => c.customer_id === customerId);
  if (!customer) throw new Error("Customer not found");

  const balance = parseFloat((customer as any).balance);
  const savings = balance * 0.20;
  const sip = savings * 0.30;
  
  return {
    recommendation: `You can invest ₹${Math.floor(sip).toLocaleString('en-IN')} per month in SIP`
  };
}
