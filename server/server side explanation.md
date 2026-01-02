Code Execution Flow: A to Z Explanation
This document explains how the application processes data to generate the "Top Contributors & Disruptors" report.

1. Data Ingestion (Input)
The process creates a foundation by loading the user's portfolio data.

Loading Weights: It reads an Excel file containing portfolio weights. It looks for a "Ticker" column and a series of date columns (e.g., "31/01/2023"). It intelligently parses percentages (e.g., "5.0%") or decimals (e.g., 0.05). Make sure the dates are sorted chronologically.
Loading NAVs (Optional): It can also read a separate file for Mutual Fund Net Asset Values (NAVs) if specific price data is provided manually instead of being fetched online.
2. Market Data Retrieval (Fetching)
Once the tickers and dates are known, the system fetches market data to calculate performance.

Yahoo Finance: For most stocks, it connects to Yahoo Finance (yfinance). It fetches the closing price for each specific date found in the weights file. It has a "cache" system to store these prices so it doesn't need to re-download them every time you run the script.
Currency Adjustment (FX): This is a critical step. The code assumes the portfolio is in CAD (Canadian Dollars).
If a ticker ends in .TO (Toronto Stock Exchange) or is the TSX Composite (^GSPTSE), it uses the raw price return.
For US/International stocks, it fetches the USD/CAD exchange rate (CAD=X) for the start and end dates. It calculates the return adjusted for currency fluctuations.
Formula: Total Return = (1 + Price Return) * (1 + FX Return) - 1
3. Core Calculations (Granular Dates)
Before aggregating, the system calculates metrics for every single "period" (the intervals between the dates in your input file).

Period Return: calculated as 
(End Price / Start Price) - 1
.
Contribution: calculated as Beginning Weight * Period Return. This represents how much that specific stock added to or subtracted from the portfolio's total return during that specific period.
4. Data Aggregation (Months & Quarters)
The raw data is usually "period-based" (e.g., irregular dates). The code aggregates this into standard calendar Months and Quarters.

Grouping: It groups the granular periods based on their end dates. (e.g., periods ending Jan 5, Jan 15, Jan 31 are all grouped into "January").
Aggregating Metrics:
Contribution: It SUMS the contributions of all granular periods within the month. (e.g., Jan 1-15 contrib + Jan 15-31 contrib = Total Jan contrib).
Weight: It identifies the End-of-Period Weight (the weight at the very last date of the month).
Return: It calculates a weighted average return for the month, ensuring the return number displayed usually aligns with the contribution.
5. Ranking and Categorization
For each Month or Quarter, the system analyzes the aggregated data to populate the specific sections of the table:

Top Contributors: It selects the 5 tickers with the highest positive contribution.
Top Disruptors: It selects the 5 tickers with the lowest (most negative) contribution.
Other Holdings: It bundles all other tickers that didn't make the Top 5 lists. It sums their weights and contributions to create a single "Other Holdings" line item.
Total Portfolio: It sums everything (Top 5 Winners + Top 5 Losers + Others) to verify the Total Weight (should be ~100%) and Total Contribution.
6. Table Generation (Excel Output)
Finally, it draws the table in Excel using openpyxl.

Structure: It creates a standard 4-column layout: Ticker, Weight, Performance (Return), and Contribution (bps).
Formatting:
Contributions: Converted to Basis Points (bps) (multiplied by 10,000) for easier reading (e.g., 0.0150 becomes 150).
Colors: Positive numbers are Green, negative numbers are Red.
Visuals: It applies borders, bold fonts for headers, and a grey background for the "Total Portfolio" row to make it distinct.
It repeats this process, placing tables side-by-side for every Month and Quarter in the dataset.