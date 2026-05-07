
import pandas as pd
from data_handler import load_csv, save_csv
from reward_system import calculate_cashback
from datetime import datetime

def send_money(sender_id, receiver_id_or_mobile, amount):
    customers = load_csv('customers.csv')
    transactions = load_csv('transactions.csv')
    
    sender_idx = customers[customers['customer_id'] == sender_id].index
    receiver_idx = customers[(customers['customer_id'] == receiver_id_or_mobile) | (customers['mobile'].astype(str) == str(receiver_id_or_mobile))].index
    
    if sender_idx.empty or receiver_idx.empty:
        return {"error": "User not found"}
        
    sender = customers.loc[sender_idx[0]]
    if sender['balance'] < amount:
        return {"error": "Insufficient balance"}
        
    # Update balances
    customers.loc[sender_idx[0], 'balance'] -= amount
    customers.loc[receiver_idx[0], 'balance'] += amount
    
    # Reward
    cashback = calculate_cashback(amount)
    customers.loc[sender_idx[0], 'rewards_balance'] += cashback
    
    save_csv('customers.csv', customers)
    
    # Transactions
    now = datetime.now().strftime("%Y-%m-%d")
    new_txs = [
        {'transaction_id': f'TX{datetime.now().timestamp()}S', 'customer_id': sender_id, 'date': now, 'type': 'Debit', 'amount': amount, 'category': 'UPI', 'merchant_name': customers.loc[receiver_idx[0], 'name']},
        {'transaction_id': f'TX{datetime.now().timestamp()}R', 'customer_id': customers.loc[receiver_idx[0], 'customer_id'], 'date': now, 'type': 'Credit', 'amount': amount, 'category': 'UPI', 'merchant_name': sender['name']}
    ]
    transactions = pd.concat([transactions, pd.DataFrame(new_txs)], ignore_index=True)
    save_csv('transactions.csv', transactions)
    
    return {"message": f"₹{amount} sent successfully", "cashback": cashback}
