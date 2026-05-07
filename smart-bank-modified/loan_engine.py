
from data_handler import load_csv

def check_eligibility(customer_id):
    customers = load_csv('customers.csv')
    customer = customers[customers['customer_id'] == customer_id]
    if customer.empty: return "User not found"
    
    score = customer.iloc[0]['credit_score']
    if score > 750:
        return {"status": "High approval", "max_loan": "₹5,000,000", "interest": "8.5%"}
    elif 650 <= score <= 750:
        return {"status": "Medium", "max_loan": "₹1,000,000", "interest": "10.5%"}
    else:
        return {"status": "Low", "max_loan": "₹100,000", "interest": "14%"}
