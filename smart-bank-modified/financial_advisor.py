
from data_handler import load_csv

def get_advice(customer_id):
    customers = load_csv('customers.csv')
    customer = customers[customers['customer_id'] == customer_id]
    if customer.empty: return "User not found"
    
    age = customer.iloc[0]['age']
    if 18 <= age <= 25:
        return "Suggest: SIP (₹1000–₹3000) and emergency savings."
    elif 25 < age <= 40:
        return "Suggest: SIP ₹3000–₹10000, insurance, and home loan planning."
    else:
        return "Suggest: Low-risk investments and retirement planning."

def get_sip_recommendation(customer_id):
    customers = load_csv('customers.csv')
    customer = customers[customers['customer_id'] == customer_id]
    if customer.empty: return "User not found"
    
    balance = customer.iloc[0]['balance']
    savings = balance * 0.20
    sip = savings * 0.30
    return f"You can invest ₹{int(sip)} per month in SIP"
