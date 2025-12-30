# Portfolio Returns Python - Usage Guide

------------------------------------------------------------------


# Navigate to project directory
cd C:\Users\Phili\Documents\GitHub\Return_Contribution_Python


# Activate it (PowerShell)
.\venv\Scripts\Activate.ps1



# Now run the script
python portfolio_returns.py



-------------------------------------------------------------------

## Installation

1. Install required packages:
```bash
pip install -r requirements.txt
```

## Usage

### Interactive Mode (Recommended)

Simply run the script without arguments:

```bash
python portfolio_returns.py
```

This will open file picker dialogs to:
1. **Select Portfolio Weights File** - Required
   - Column A: "Ticker"
   - Subsequent columns: Dates in DD/MM/YYYY format
   - Values: Percentages (e.g., 15% or 15.00%)
   
2. **Select Mutual Fund NAV File** - Optional (click Cancel to skip)
   - Same structure as weights file
   - Contains NAV values instead of percentages
   
3. **Select Output Directory** - Optional (click Cancel for default)
   - Default: `C:/Users/Phili/Downloads`

### Command Line Mode

You can also provide file paths as command line arguments:

```bash
python portfolio_returns.py <weights_file.xlsx> [nav_file.xlsx] [output_directory]
```

### Example

```bash
# Interactive mode (recommended)
python portfolio_returns.py

# Or command line mode
python portfolio_returns.py portfolio_weights.xlsx mutual_funds_nav.xlsx
```

This will create a timestamped Excel file with the portfolio returns and contributions report.

## Features

- ✅ Automatic market data fetching from Yahoo Finance
- ✅ Caching to avoid redundant downloads
- ✅ CAD adjustment for non-CAD assets
- ✅ Mutual fund NAV support
- ✅ Professional Excel formatting with conditional formatting
- ✅ Weight change indicators (green/red backgrounds)
- ✅ Benchmark returns (USD/CAD, S&P 500, Dow Jones, Nasdaq, ACWI, TSX60)
- ✅ YTD calculations
- ✅ Automatic sorting by YTD contribution

## Special Tickers

- `$CASH$`: Treated as 0% return for all periods
- `.TO` suffix: Canadian stocks (no FX adjustment)
- Indices: `^GSPC`, `^DJI`, `^IXIC`, `ACWI`, `^GSPTSE` (no FX adjustment for TSX)

## Output Format

The Excel report includes:
- Merged title row
- Period headers with date ranges (DD/MM/YYYY -> DD/MM/YYYY)
- Weight | Return | Contrib. columns for each period
- YTD Return | YTD Contrib. columns
- TOTAL row with blue background
- Benchmarks section with returns only
- Conditional formatting (green for positive, red for negative)
- Weight change indicators (green for increases, red for decreases)

