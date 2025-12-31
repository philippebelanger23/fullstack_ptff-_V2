import yfinance as yf
import json

ticker = "XUS.TO"
print(f"--- Fecthing full info for {ticker} ---")
try:
    t = yf.Ticker(ticker)
    info = t.info
    
    # Print all keys regarding classification
    useful_keys = ['sector', 'category', 'industry', 'quoteType', 'legalType', 'fundFamily', 'assetClass']
    print("\nSelected Classification Fields:")
    for k in useful_keys:
        print(f"{k}: {info.get(k)}")
        
    print("\nFull Info Keys Available:")
    print(info.keys())

except Exception as e:
    print(f"Error: {e}")
