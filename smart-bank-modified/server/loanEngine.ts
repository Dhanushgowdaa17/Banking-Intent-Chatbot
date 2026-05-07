
import { loadCSV } from './dataHandler';

export function getLoanEligibility(customerId: string) {
  const customers = loadCSV('customers.csv');
  const customer = customers.find((c: any) => c.customer_id === customerId);

  if (!customer) throw new Error("Customer not found");

  const score = parseInt((customer as any).credit_score || "0"); 
  let status = "Low";
  let maxLoan = 0;
  let interestRate = "12%";

  if (score > 750) {
    status = "High Approval Chance";
    maxLoan = 5000000;
    interestRate = "8.5%";
  } else if (score >= 650) {
    status = "Medium Approval Chance";
    maxLoan = 1000000;
    interestRate = "10.5%";
  } else {
    status = "Limited Eligibility";
    maxLoan = 100000;
    interestRate = "14%";
  }

  return {
    cibil_score: score,
    eligibility_status: status,
    max_loan_amount: `₹${maxLoan.toLocaleString('en-IN')}`,
    suggested_interest_rate: interestRate
  };
}
