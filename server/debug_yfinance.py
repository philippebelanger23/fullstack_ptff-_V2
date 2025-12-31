import yfinance as yf
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

tickers = ["BIP791", "DJT03868", "XUS.TO", "DYN245", "SU.TO", "MSFT"]

print(f"Testing tickers: {tickers}")

for ticker in tickers:
    print(f"\n--- Fetching {ticker} ---")
    try:
        t = yf.Ticker(ticker)
        info = t.info
        
        # Check if we got valid info (yfinance often returns empty dict or mostly None for invalid)
        if not info or all(v is None for v in info.values()):
             print(f"❌ {ticker}: No info found (likely invalid ticker)")
             continue
             
        sector = info.get('sector')
        category = info.get('category')
        fundFamily = info.get('fundFamily')
        shortName = info.get('shortName')
        
        print(f"✅ {ticker} ({shortName})")
        print(f"   Sector: {sector}")
        print(f"   Category: {category}")
        print(f"   Fund Family: {fundFamily}")
        
    except Exception as e:
        print(f"❌ {ticker}: Error - {e}")
