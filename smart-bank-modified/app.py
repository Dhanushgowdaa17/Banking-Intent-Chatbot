
from flask import Flask, request, jsonify
from payment_engine import send_money
from financial_advisor import get_advice, get_sip_recommendation
from loan_engine import check_eligibility
from data_handler import load_csv

app = Flask(__name__)

@app.route('/send-money', methods=['POST'])
def handle_send_money():
    data = request.json
    return jsonify(send_money(data['customer_id'], data['receiver_identifier'], data['amount']))

@app.route('/financial-advice', methods=['GET'])
def handle_advice():
    cid = request.args.get('customer_id')
    return jsonify({
        "advice": get_advice(cid)
    })

@app.route('/sip-suggestion', methods=['GET'])
def handle_sip():
    cid = request.args.get('customer_id')
    return jsonify({"recommendation": get_sip_recommendation(cid)})

@app.route('/loan-eligibility', methods=['GET'])
def handle_loan():
    cid = request.args.get('customer_id')
    return jsonify(check_eligibility(cid))

@app.route('/transactions/full', methods=['GET'])
def get_all_transactions():
    cid = request.args.get('customer_id')
    txs = load_csv('transactions.csv')
    user_txs = txs[txs['customer_id'] == cid]
    return user_txs.to_json(orient='records')

if __name__ == '__main__':
    app.run(port=5000)
