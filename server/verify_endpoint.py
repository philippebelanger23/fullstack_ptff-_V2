import requests
import time

# Wait a moment for server to start if running immediately after
time.sleep(2)

url = "http://localhost:8000/fetch-sectors"
payload = {"tickers": ["XUS.TO", "MSFT", "DYN245", "BIP791", "GOOGL"]}

try:
    print(f"Testing {url} with {payload['tickers']}...")
    response = requests.post(url, json=payload)
    response.raise_for_status()
    print("Response JSON:")
    print(response.json())
except Exception as e:
    print(f"Verification Failed: {e}")
