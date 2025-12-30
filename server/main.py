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
from market_data import calculate_returns, calculate_benchmark_returns, build_results_dataframe
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
