"""PDF Generator for Top Contributors/Disruptors tables."""

from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import pandas as pd

from top_contributors_sheet import (
    group_periods_by_month,
    group_months_by_quarter,
    aggregate_monthly_data,
    aggregate_quarterly_data
)
from constants import CASH_TICKER, BENCHMARK_TICKERS


# Colors matching Excel
GREEN_TEXT = colors.HexColor('#006100')
RED_TEXT = colors.HexColor('#C00000')
BLACK_BG = colors.HexColor('#000000')
GREY_BG = colors.HexColor('#D9D9D9')
LIGHT_GREEN_BG = colors.HexColor('#E2EFDA')
LIGHT_RED_BG = colors.HexColor('#FCE4D6')


def create_contributors_table(month_name: str, month_df: pd.DataFrame) -> Table:
    """Create a single table for a month/quarter showing top contributors and disruptors."""
    
    if month_df.empty:
        return None
    
    # Get top 5 contributors and disruptors
    top_contributors = month_df.nlargest(5, 'Contrib')
    top_disruptors = month_df.nsmallest(5, 'Contrib')
    
    # Calculate "Other Holdings"
    excluded_tickers = set(top_contributors['Ticker'].tolist() + top_disruptors['Ticker'].tolist())
    other_holdings = month_df[~month_df['Ticker'].isin(excluded_tickers)]
    
    other_weight = other_holdings['Weight'].sum() if not other_holdings.empty else 0
    other_contrib = other_holdings['Contrib'].sum() if not other_holdings.empty else 0
    other_return = (other_holdings['Return'] * other_holdings['Weight']).sum() / other_weight if other_weight > 0 else 0
    
    # Totals
    total_weight = month_df['Weight'].sum()
    total_contrib = month_df['Contrib'].sum()
    
    # Build table data
    data = []
    
    # Title row (will be merged)
    data.append([month_name, '', '', ''])
    
    # Top Contributors section
    data.append(['Top Contributors', '', '', ''])
    data.append(['Ticker', 'Weight', 'Perf.', 'Contrib.'])
    
    for _, row in top_contributors.iterrows():
        contrib_bps = int(row['Contrib'] * 10000)
        data.append([
            row['Ticker'],
            f"{row['Weight']*100:.2f}%",
            f"{row['Return']*100:.2f}%",
            str(contrib_bps)
        ])
    
    # Contributors sum
    contrib_sum_bps = int(top_contributors['Contrib'].sum() * 10000)
    data.append(['Σ', f"{top_contributors['Weight'].sum()*100:.2f}%", '', str(contrib_sum_bps)])
    
    # Top Disruptors section
    data.append(['Top Disruptors', '', '', ''])
    data.append(['Ticker', 'Weight', 'Perf.', 'Contrib.'])
    
    for _, row in top_disruptors.iterrows():
        contrib_bps = int(row['Contrib'] * 10000)
        data.append([
            row['Ticker'],
            f"{row['Weight']*100:.2f}%",
            f"({abs(row['Return'])*100:.2f}%)" if row['Return'] < 0 else f"{row['Return']*100:.2f}%",
            f"({abs(contrib_bps)})"
        ])
    
    # Disruptors sum
    disrupt_sum_bps = int(top_disruptors['Contrib'].sum() * 10000)
    data.append(['Σ', f"{top_disruptors['Weight'].sum()*100:.2f}%", '', f"({abs(disrupt_sum_bps)})"])
    
    # Other Holdings
    other_bps = int(other_contrib * 10000)
    other_return_str = f"({abs(other_return)*100:.2f}%)" if other_return < 0 else f"{other_return*100:.2f}%"
    other_contrib_str = f"({abs(other_bps)})" if other_bps < 0 else str(other_bps)
    data.append(['Other Holdings', f"{other_weight*100:.2f}%", other_return_str, other_contrib_str])
    
    # Total Portfolio
    total_bps = int(total_contrib * 10000)
    total_contrib_str = f"({abs(total_bps)})" if total_bps < 0 else str(total_bps)
    data.append(['Total Portfolio', f"{total_weight*100:.2f}%", '', total_contrib_str])
    
    # Create table
    col_widths = [0.9*inch, 0.6*inch, 0.7*inch, 0.6*inch]
    table = Table(data, colWidths=col_widths)
    
    # Style the table
    style = TableStyle([
        # Title row - black background, white text
        ('SPAN', (0, 0), (3, 0)),
        ('BACKGROUND', (0, 0), (3, 0), BLACK_BG),
        ('TEXTCOLOR', (0, 0), (3, 0), colors.white),
        ('FONTNAME', (0, 0), (3, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (3, 0), 9),
        ('ALIGN', (0, 0), (3, 0), 'CENTER'),
        
        # Top Contributors header
        ('SPAN', (0, 1), (3, 1)),
        ('BACKGROUND', (0, 1), (3, 1), LIGHT_GREEN_BG),
        ('FONTNAME', (0, 1), (3, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 1), (3, 1), 7),
        ('ALIGN', (0, 1), (3, 1), 'CENTER'),
        
        # Column headers (row 2)
        ('BACKGROUND', (0, 2), (3, 2), BLACK_BG),
        ('TEXTCOLOR', (0, 2), (3, 2), colors.white),
        ('FONTNAME', (0, 2), (3, 2), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 2), (3, 2), 6),
        ('ALIGN', (0, 2), (3, 2), 'CENTER'),
        
        # Top Disruptors header (row 9)
        ('SPAN', (0, 9), (3, 9)),
        ('BACKGROUND', (0, 9), (3, 9), LIGHT_RED_BG),
        ('FONTNAME', (0, 9), (3, 9), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 9), (3, 9), 7),
        ('ALIGN', (0, 9), (3, 9), 'CENTER'),
        
        # Column headers for disruptors (row 10)
        ('BACKGROUND', (0, 10), (3, 10), BLACK_BG),
        ('TEXTCOLOR', (0, 10), (3, 10), colors.white),
        ('FONTNAME', (0, 10), (3, 10), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 10), (3, 10), 6),
        ('ALIGN', (0, 10), (3, 10), 'CENTER'),
        
        # Total Portfolio row - grey background
        ('BACKGROUND', (0, -1), (3, -1), GREY_BG),
        ('FONTNAME', (0, -1), (3, -1), 'Helvetica-Bold'),
        
        # General styling
        ('FONTSIZE', (0, 3), (3, -1), 7),
        ('ALIGN', (1, 3), (3, -1), 'CENTER'),
        ('ALIGN', (0, 3), (0, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        
        # Box around table
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('LINEBELOW', (0, 2), (-1, 2), 0.5, colors.black),
        ('LINEBELOW', (0, 10), (-1, 10), 0.5, colors.black),
    ])
    
    # Apply green color to contributor values (rows 3-7, column 3)
    for i in range(3, 8):
        style.add('TEXTCOLOR', (3, i), (3, i), GREEN_TEXT)
    
    # Apply red color to disruptor values (rows 11-15, column 3)
    for i in range(11, 16):
        style.add('TEXTCOLOR', (3, i), (3, i), RED_TEXT)
    
    table.setStyle(style)
    return table


def generate_pdf(df: pd.DataFrame, periods: list, dates: list) -> BytesIO:
    """
    Generate PDF with Top Contributors/Disruptors tables.
    
    Args:
        df: DataFrame with portfolio data (same format as Excel generator)
        periods: List of (start_date, end_date) tuples
        dates: List of dates
    
    Returns:
        BytesIO buffer containing the PDF
    """
    buffer = BytesIO()
    
    # Create document with landscape orientation
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        leftMargin=0.3*inch,
        rightMargin=0.3*inch,
        topMargin=0.3*inch,
        bottomMargin=0.3*inch
    )
    
    # Group periods by month
    month_groups = group_periods_by_month(periods)
    sorted_months = sorted(month_groups.keys())
    
    # Find first January
    first_january_idx = 0
    for i, (year, month) in enumerate(sorted_months):
        if month == 1:
            first_january_idx = i
            break
    
    sorted_months = sorted_months[first_january_idx:]
    
    # Group months into quarters
    quarters = group_months_by_quarter(sorted_months)
    
    # Month name mapping
    month_names = {
        1: 'January', 2: 'February', 3: 'March',
        4: 'April', 5: 'May', 6: 'June',
        7: 'July', 8: 'August', 9: 'September',
        10: 'October', 11: 'November', 12: 'December'
    }
    
    elements = []
    
    # Title
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=16,
        alignment=TA_CENTER,
        spaceAfter=20
    )
    elements.append(Paragraph("Top Contributors & Disruptors", title_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Process each quarter (creates one row of 4 tables: M1, M2, M3, Q)
    rows_per_page = 2
    row_count = 0
    
    for quarter_months, has_quarter in quarters:
        row_tables = []
        
        # Create table for each month in the quarter
        for year, month in quarter_months:
            month_periods = month_groups.get((year, month), [])
            if month_periods:
                month_df = aggregate_monthly_data(df, periods, month_periods)
                month_name = f"{month_names[month]} {year}"
                table = create_contributors_table(month_name, month_df)
                if table:
                    row_tables.append(table)
        
        # Create quarterly table if we have 3 months
        if has_quarter and len(quarter_months) == 3:
            quarter_num = (quarter_months[0][1] - 1) // 3 + 1
            quarter_year = quarter_months[0][0]
            quarter_df = aggregate_quarterly_data(df, periods, quarter_months, month_groups)
            quarter_name = f"Q{quarter_num} {quarter_year}"
            q_table = create_contributors_table(quarter_name, quarter_df)
            if q_table:
                row_tables.append(q_table)
        
        if row_tables:
            # Create a wrapper table to hold the 4 tables side by side
            wrapper_data = [[t for t in row_tables]]
            wrapper = Table(wrapper_data, colWidths=[2.8*inch] * len(row_tables))
            wrapper.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 5),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ]))
            elements.append(wrapper)
            elements.append(Spacer(1, 0.3*inch))
            
            row_count += 1
            if row_count >= rows_per_page:
                elements.append(PageBreak())
                row_count = 0
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer
