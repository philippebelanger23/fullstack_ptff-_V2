"""Excel formatting and styling functions - orchestrates sheet creation."""

from openpyxl import Workbook
from period_sheet import create_period_sheet
from monthly_sheet import (
    create_monthly_periods,
    calculate_monthly_returns,
    calculate_monthly_benchmark_returns,
    build_monthly_dataframe,
    create_monthly_sheet
)
from top_contributors_sheet import create_top_contributors_sheet


def create_excel_report(df, periods, benchmark_returns, dates, output_path, cache, weights_dict=None, returns=None, prices=None, nav_dict=None):
    """Create the formatted Excel report with both period and monthly sheets."""
    wb = Workbook()
    
    # Remove default sheet
    wb.remove(wb.active)
    
    # Create period sheet
    create_period_sheet(wb, df, periods, benchmark_returns, dates, cache)
    
    # Create monthly sheet if we have the necessary data
    if weights_dict is not None and prices is not None:
        print("Creating monthly contributions sheet...")
        monthly_periods = create_monthly_periods(dates, periods=periods)
        if monthly_periods:
            monthly_returns = calculate_monthly_returns(weights_dict, nav_dict or {}, monthly_periods, prices, cache)
            monthly_benchmark_returns = calculate_monthly_benchmark_returns(monthly_periods, cache)
            monthly_df = build_monthly_dataframe(weights_dict, monthly_returns, monthly_periods, dates, cache, nav_dict or {}, periods=periods, period_df=df)
            create_monthly_sheet(wb, monthly_df, monthly_periods, monthly_benchmark_returns, dates, cache)
    
    # Create top contributors/disruptors sheet
    print("Creating top contributors/disruptors sheet...")
    create_top_contributors_sheet(wb, df, periods, dates)
    
    wb.save(output_path)
    print(f"Excel report saved to: {output_path}")
