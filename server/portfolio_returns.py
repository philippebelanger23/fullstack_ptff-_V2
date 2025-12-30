"""
Portfolio Returns and Contribution Analysis
Generates professional Excel report for portfolio performance and attribution analysis.
"""

from datetime import datetime
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox

from data_loader import load_weights_file, load_nav_file
from market_data import calculate_returns, calculate_benchmark_returns, build_results_dataframe
from cache_manager import load_cache, save_cache
from excel_formatter import create_excel_report


def main(weights_file, nav_file=None, output_dir=None):
    """Main function to generate portfolio returns report."""
    output_dir = Path("C:/Users/Phili/Downloads")
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    cache = load_cache()
    
    print("Loading weights file...")
    weights_dict, dates = load_weights_file(weights_file)
    
    holdings_name = Path(weights_file).stem
    last_date_header = dates[-1]
    
    if isinstance(last_date_header, datetime):
        last_date = last_date_header
    else:
        last_date = datetime.strptime(last_date_header, "%d/%m/%Y")
    
    formatted_date = last_date.strftime("%d %b %Y")
    output_path = output_dir / f"Returns Contribution - {holdings_name} - {formatted_date}.xlsx"
    
    nav_dict = {}
    if nav_file:
        print("Loading NAV file...")
        nav_dict = load_nav_file(nav_file)
    
    print("Fetching market data and calculating returns...")
    returns, prices = calculate_returns(weights_dict, nav_dict, dates, cache)
    
    print("Calculating benchmark returns...")
    benchmark_returns = calculate_benchmark_returns(dates, cache)
    
    save_cache(cache)
    
    print("Building results dataframe...")
    df, periods = build_results_dataframe(weights_dict, returns, prices, dates, cache)
    
    print("Creating Excel report...")
    create_excel_report(df, periods, benchmark_returns, dates, output_path, cache, 
                       weights_dict=weights_dict, returns=returns, prices=prices, nav_dict=nav_dict)
    
    print("Done!")


def select_files():
    """Open file picker dialogs to select weights and NAV files."""
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    
    print("Please select the Portfolio Weights file...")
    weights_file = filedialog.askopenfilename(
        title="Select Portfolio Weights File",
        initialdir="C:/Users/Phili/iCloudDrive/GitHub/Return_Contribution_Files",
        filetypes=[("Excel files", "*.xlsx *.xls"), ("All files", "*.*")]
    )
    
    if not weights_file:
        print("No weights file selected. Exiting.")
        root.destroy()
        return None, None, None
    
    print(f"Weights file selected: {weights_file}")
    
    print("\nPlease select the Mutual Fund NAV file (optional - click Cancel to skip)...")
    nav_file = filedialog.askopenfilename(
        title="Select Mutual Fund NAV File (Optional)",
        initialdir="C:/Users/Phili/iCloudDrive/GitHub/Return_Contribution_Files",
        filetypes=[("Excel files", "*.xlsx *.xls"), ("All files", "*.*")]
    )
    
    if nav_file:
        print(f"NAV file selected: {nav_file}")
    else:
        print("No NAV file selected. Continuing without NAV file.")
        nav_file = None
    
    print("\nOutput will be saved to Downloads folder.")
    output_dir = None
    
    root.destroy()
    return weights_file, nav_file, output_dir


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        weights_file = sys.argv[1]
        nav_file = sys.argv[2] if len(sys.argv) > 2 else None
        output_dir = sys.argv[3] if len(sys.argv) > 3 else None
        main(weights_file, nav_file, output_dir)
    else:
        weights_file, nav_file, output_dir = select_files()
        if weights_file:
            try:
                main(weights_file, nav_file, output_dir)
            except Exception as e:
                error_msg = f"Error generating report:\n{str(e)}"
                print(f"\nERROR: {error_msg}")
                messagebox.showerror("Error", error_msg)
