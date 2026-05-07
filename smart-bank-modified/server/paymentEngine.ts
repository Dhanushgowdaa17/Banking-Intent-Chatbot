
import { loadCSV, saveCSV } from './dataHandler';
import { calculateCashback } from './rewardSystem';

export function sendMoney(senderId: string, receiverIdentifier: string, amount: number) {
  const customers = loadCSV('customers.csv');
  const transactions = loadCSV('transactions.csv');

  const sender = customers.find((c: any) => c.customer_id === senderId);
  const receiver = customers.find((c: any) => c.customer_id === receiverIdentifier || c.mobile === receiverIdentifier);

  if (!sender) throw new Error("Sender not found");
  if (!receiver) throw new Error("Receiver not found");
  
  const senderObj = sender as any;
  const receiverObj = receiver as any;

  if (parseFloat(senderObj.balance) < amount) throw new Error("Insufficient balance");

  // Update balances
  senderObj.balance = (parseFloat(senderObj.balance) - amount).toFixed(2);
  receiverObj.balance = (parseFloat(receiverObj.balance) + amount).toFixed(2);

  // Rewards logic
  const cashback = calculateCashback(amount);
  senderObj.rewards_balance = (parseFloat(senderObj.rewards_balance || "0") + cashback).toFixed(2);

  saveCSV('customers.csv', customers);

  // Record transactions
  const now = new Date().toISOString().split('T')[0];
  const txIdBase = `TX${Date.now()}`;

  const senderTx = {
    transaction_id: `${txIdBase}S`,
    customer_id: senderObj.customer_id,
    date: now,
    type: 'Debit',
    amount: amount.toFixed(2),
    category: 'UPI',
    merchant_name: receiverObj.name
  };

  const receiverTx = {
    transaction_id: `${txIdBase}R`,
    customer_id: receiverObj.customer_id,
    date: now,
    type: 'Credit',
    amount: amount.toFixed(2),
    category: 'UPI',
    merchant_name: senderObj.name
  };

  transactions.push(senderTx);
  transactions.push(receiverTx);
  saveCSV('transactions.csv', transactions);

  return {
    success: true,
    message: `₹${amount} sent to ${receiverObj.name} successfully`,
    cashback: cashback.toFixed(2),
    newBalance: senderObj.balance
  };
}
