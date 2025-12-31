import shutil
import os
from pathlib import Path
from typing import List, Optional
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging

# Import existing logic
from data_loader import load_weights_file, load_nav_file
from market_data import calculate_returns, calculate_benchmark_returns, build_results_dataframe, get_ticker_performance
from cache_manager import load_cache, save_cache
from constants import CASH_TICKER, FX_TICKER

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define Response Model to match Client's PortfolioItem
class PortfolioItem(BaseModel):
    ticker: str
    weight: float
    date: str
    companyName: Optional[str] = None
    sector: Optional[str] = None
    notes: Optional[str] = None
    returnPct: Optional[float] = None
    contribution: Optional[float] = None

@app.post("/analyze", response_model=List[PortfolioItem])
async def analyze_portfolio(
    weights_file: UploadFile = File(...),
    nav_file: Optional[UploadFile] = File(None)
):
    temp_dir = Path("temp_uploads")
    temp_dir.mkdir(exist_ok=True)
    
    weights_path = temp_dir / weights_file.filename
    nav_path = None
    
    try:
        # Save uploaded files
        with weights_path.open("wb") as buffer:
            shutil.copyfileobj(weights_file.file, buffer)
            
        if nav_file:
            nav_path = temp_dir / nav_file.filename
            with nav_path.open("wb") as buffer:
                shutil.copyfileobj(nav_file.file, buffer)
        
        # --- Core Logic from portfolio_returns.py main() ---
        
        cache = load_cache()
        
        logger.info(f"Loading weights file: {weights_path}")
        weights_dict, dates = load_weights_file(str(weights_path))
        
        nav_dict = {}
        if nav_path:
            logger.info(f"Loading NAV file: {nav_path}")
            nav_dict = load_nav_file(str(nav_path))
            
        logger.info("Fetching market data...")
        returns, prices = calculate_returns(weights_dict, nav_dict, dates, cache)
        
        # We don't necessarily need the benchmark returns for the dashboard view yet, 
        # but the calculation updates the cache, so we might as well keep it if needed later.
        # benchmark_returns = calculate_benchmark_returns(dates, cache)
        
        save_cache(cache)
        
        logger.info("Building results dataframe...")
        # Note: build_results_dataframe sorts by YTD_Contrib desc
        df, periods = build_results_dataframe(weights_dict, returns, prices, dates, cache)
        
        # --- Transformation Logic: Wide (Server) -> Long (Client) ---
        
        result_items = []
        
        # periods is a list of tuples: (start_date, end_date)
        # df columns: Ticker, Weight_0, Return_0, Contrib_0, ..., YTD_Return, YTD_Contrib
        
        if df.empty:
            return []
            
        # Iterate through each period to create time-series data for the client
        for i, period in enumerate(periods):
            start_date_ts = period[0] # Timestamp
            # Format date as YYYY-MM-DD for consistency
            date_str = start_date_ts.strftime("%Y-%m-%d")
            
            for _, row in df.iterrows():
                ticker = row['Ticker']
                
                # Extract values for this specific period
                weight = row.get(f'Weight_{i}', 0.0)
                # weights logic in market_data.py seems to handle safe gets, but let's be safe
                ret = row.get(f'Return_{i}', 0.0)
                contrib = row.get(f'Contrib_{i}', 0.0)
                
                # Only add if there's meaningful data or if it's a held position
                # (Client logic might filter later, but let's send everything for now)
                
                item = PortfolioItem(
                    ticker=ticker,
                    weight=float(weight),  # Ensure native Python float
                    date=date_str,
                    returnPct=float(ret),
                    contribution=float(contrib),
                    # Optional fields - could be enriched if we had metadata
                    companyName=None,
                    sector=None, 
                    notes=None
                )
                result_items.append(item)
                
        return result_items

    except Exception as e:
        logger.error(f"Error processing analysis: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Cleanup
        if weights_path.exists():
            weights_path.unlink()
        if nav_path and nav_path.exists():
            nav_path.unlink()
        if temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)

@app.post("/fetch-sectors")
async def fetch_sectors(request: dict):
    tickers = request.get("tickers", [])
    if not tickers:
        return {}
    
    import yfinance as yf
    import json
    
    unique_tickers = list(set([t.strip() for t in tickers if t and isinstance(t, str)]))
    
    # --- Server-Side Persistence ---
    cache_file = Path("data/sectors_cache.json")
    server_cache = {}
    
    # Load existing cache
    if cache_file.exists():
        try:
            with open(cache_file, "r") as f:
                server_cache = json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load sector cache file: {e}")

    # Determine what creates a "miss" (not in server cache)
    missing_on_server = [t for t in unique_tickers if t not in server_cache]
    
    if missing_on_server:
        try:
            # yf.Tickers allows batch processing but getting info is sometimes better individually for reliability
            # or we use the Tickers object.
            # Let's try batch fetching info if possible, but yfinance is tricky with batch info.
            # Actually, iterating is safer for 'info' attribute reliability.
            
            # Optimization: Filter out known non-equity patterns first to save API calls
            # (Though yfinance handles them, it's faster to skip)
            
            # We can use Tickers object for multi-threading
            tickers_obj = yf.Tickers(" ".join(missing_on_server))
            
            for ticker in missing_on_server:
                try:
                    # Accessing info triggers the download
                    info = tickers_obj.tickers[ticker].info
                    sector = info.get('sector')
                    
                    # Check for ETF/Fund indicators if sector is missing
                    if not sector:
                        quote_type = info.get('quoteType', '').upper()
                        if quote_type in ['ETF', 'MUTUALFUND']:
                            sector = 'Mixed'
                    
                    if sector:
                        server_cache[ticker] = sector
                except Exception as e:
                    logger.warning(f"Failed to fetch info for {ticker}: {e}")
            
            # Save updated cache
            try:
                # Ensure directory exists
                cache_file.parent.mkdir(parents=True, exist_ok=True)
                with open(cache_file, "w") as f:
                    json.dump(server_cache, f)
            except Exception as e:
                logger.error(f"Failed to save sector cache: {e}")
                
        except Exception as e:
            logger.error(f"Error fetching sectors: {e}")
            # Continue to return what we have
    
    # Return requested sectors from the (now updated) server cache
    return {k: server_cache[k] for k in unique_tickers if k in server_cache}

@app.get("/index-exposure")
async def get_index_exposure():
    try:
        import json
        data_path = Path("data/index_exposure.json")
        if not data_path.exists():
            logger.error(f"index_exposure.json not found at {data_path.absolute()}")
            return {"sectors": [], "geography": []}
            
        with open(data_path, "r") as f:
            raw_data = json.load(f)
            
        acwi = raw_data.get("ACWI", {})
        tsx = raw_data.get("TSX", {})
        
        # --- Sector Composition ---
        all_sectors = set(acwi.get("Sectors", {}).keys()) | set(tsx.get("Sectors", {}).keys())
        
        sector_list = []
        for sector in all_sectors:
            w_acwi = acwi.get("Sectors", {}).get(sector, 0.0)
            w_tsx = tsx.get("Sectors", {}).get(sector, 0.0)
            
            w_composite = (w_acwi * 0.75) + (w_tsx * 0.25)
            
            if w_composite > 0.01:
                sector_list.append({
                    "sector": sector,
                    "ACWI": w_acwi,
                    "TSX": w_tsx,
                    "Index": round(w_composite, 2)
                })
            
        sector_list.sort(key=lambda x: x["Index"], reverse=True)
        
        # --- Geography Composition ---
        all_regions = set(acwi.get("Geography", {}).keys()) | set(tsx.get("Geography", {}).keys())
        
        geo_list = []
        for region in all_regions:
            w_acwi = acwi.get("Geography", {}).get(region, 0.0)
            w_tsx = tsx.get("Geography", {}).get(region, 0.0)
            
            w_composite = (w_acwi * 0.75) + (w_tsx * 0.25)
            
            if w_composite > 0.01:
                geo_list.append({
                    "region": region,
                    "weight": round(w_composite, 2)
                })
                
        geo_list.sort(key=lambda x: x["weight"], reverse=True)
            
        return {
            "sectors": sector_list,
            "geography": geo_list,
            "raw": {
                "ACWI": {"Geography": acwi.get("Geography", {})},
                "TSX": {"Geography": tsx.get("Geography", {})}
            }
        }
    except Exception as e:
        logger.error(f"Error in index-exposure: {e}")
        return {"sectors": [], "geography": []}

@app.post("/currency-performance")
async def currency_performance(request: dict):
    from cache_manager import load_cache, save_cache
    
    tickers = request.get("tickers", [])
    if not tickers:
        return {}
        
    try:
        cache = load_cache()
        performance = get_ticker_performance(tickers, cache)
        save_cache(cache)
        return performance
    except Exception as e:
        logger.error(f"Error in currency-performance: {e}")
        return {}


if __name__ == "__main__":
    import uvicorn
    import sys
    import asyncio

    # Fix for Windows asyncio loop policy (prevents "ConnectionResetError" and "ProactorBasePipeTransport" errors)
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    uvicorn.run(app, host="0.0.0.0", port=8000, loop="asyncio")
