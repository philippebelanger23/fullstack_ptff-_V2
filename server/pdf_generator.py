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
    # Get top 5 contributors and disruptors
    top_contributors = month_df.nlargest(5, 'Contrib').fillna(0)
    top_disruptors = month_df.nsmallest(5, 'Contrib').fillna(0)
    
    # Calculate "Other Holdings"
    excluded_tickers = set(top_contributors['Ticker'].tolist() + top_disruptors['Ticker'].tolist())
    other_holdings = month_df[~month_df['Ticker'].isin(excluded_tickers)].fillna(0)
    
    other_weight = other_holdings['Weight'].sum() if not other_holdings.empty else 0
    other_contrib = other_holdings['Contrib'].sum() if not other_holdings.empty else 0
    other_return = (other_holdings['Return'] * other_holdings['Weight']).sum() / other_weight if other_weight > 0 else 0
    
    # Totals
    month_df_safe = month_df.fillna(0)
    total_weight = month_df_safe['Weight'].sum()
    total_contrib = month_df_safe['Contrib'].sum()
    
    # Build table data
    data = []
    
    # Title row (will be merged)
    data.append([month_name.upper(), '', '', ''])
    
    # Top Contributors section
    data.append(['TOP CONTRIBUTORS', '', '', ''])
    data.append(['TICKER', 'WEIGHT', 'PERFORMANCE', 'CONTRIB. (BPS)'])
    
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
    data.append(['TOP DISRUPTORS', '', '', ''])
    data.append(['TICKER', 'WEIGHT', 'PERFORMANCE', 'CONTRIB. (BPS)'])
    
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
    # Style the table
    # Colors from Tailwind/App
    APP_GREEN = colors.HexColor('#15803d') # text-green-700
    APP_RED = colors.HexColor('#b91c1c')   # text-red-700
    APP_GREY_BG = colors.HexColor('#d1d5db') # bg-gray-300 / bg-[#d1d5db]
    APP_BORDER = colors.HexColor('#f1f5f9') # border-wallstreet-100 / light grey
    
    style = TableStyle([
        # --- Month Header ---
        ('SPAN', (0, 0), (3, 0)),
        ('BACKGROUND', (0, 0), (3, 0), colors.black),
        ('TEXTCOLOR', (0, 0), (3, 0), colors.white),
        ('FONTNAME', (0, 0), (3, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (3, 0), 9),
        ('ALIGN', (0, 0), (3, 0), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (3, 0), 4),
        ('TOPPADDING', (0, 0), (3, 0), 4),
        
        # --- Top Contributors Header ---
        ('SPAN', (0, 1), (3, 1)),
        ('BACKGROUND', (0, 1), (3, 1), colors.white),
        ('TEXTCOLOR', (0, 1), (3, 1), colors.black),
        ('FONTNAME', (0, 1), (3, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 1), (3, 1), 7),
        ('ALIGN', (0, 1), (3, 1), 'CENTER'),
        ('BOTTOMPADDING', (0, 1), (3, 1), 2),
        ('TOPPADDING', (0, 1), (3, 1), 2),
        
        # --- Column Headers (Contributors) ---
        ('BACKGROUND', (0, 2), (3, 2), colors.black),
        ('TEXTCOLOR', (0, 2), (3, 2), colors.white),
        ('FONTNAME', (0, 2), (3, 2), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 2), (3, 2), 6),
        ('ALIGN', (0, 2), (3, 2), 'CENTER'),
        ('BOTTOMPADDING', (0, 2), (3, 2), 2),
        ('TOPPADDING', (0, 2), (3, 2), 2),
        
        # --- Top Disruptors Header ---
        ('SPAN', (0, 9), (3, 9)),
        ('BACKGROUND', (0, 9), (3, 9), colors.white),
        ('TEXTCOLOR', (0, 9), (3, 9), colors.black),
        ('FONTNAME', (0, 9), (3, 9), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 9), (3, 9), 7),
        ('ALIGN', (0, 9), (3, 9), 'CENTER'),
        ('BOTTOMPADDING', (0, 9), (3, 9), 2),
        ('TOPPADDING', (0, 9), (3, 9), 2),
        
        # --- Column Headers (Disruptors) ---
        ('BACKGROUND', (0, 10), (3, 10), colors.black),
        ('TEXTCOLOR', (0, 10), (3, 10), colors.white),
        ('FONTNAME', (0, 10), (3, 10), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 10), (3, 10), 6),
        ('ALIGN', (0, 10), (3, 10), 'CENTER'),
        ('BOTTOMPADDING', (0, 10), (3, 10), 2),
        ('TOPPADDING', (0, 10), (3, 10), 2),
        
        # --- Total Portfolio ---
        ('BACKGROUND', (0, -1), (3, -1), APP_GREY_BG),
        ('FONTNAME', (0, -1), (3, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, -1), (3, -1), colors.black),
        
        # --- General Data Styling ---
        ('FONTSIZE', (0, 3), (3, -1), 7),
        ('ALIGN', (1, 3), (3, -1), 'CENTER'), # Weight centered
        ('ALIGN', (2, 3), (3, -1), 'CENTER'), # Perf centered
        ('ALIGN', (3, 3), (3, -1), 'RIGHT'),  # Contrib right aligned (like app)
        ('ALIGN', (0, 3), (0, -1), 'LEFT'),   # Ticker left aligned
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 3), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 3), (-1, -1), 2),
        
        # --- Borders ---
        # Outer border
        ('BOX', (0, 0), (-1, -1), 0.5, colors.black),
        
        # Inner horizontal lines
        # ('GRID', (0, 0), (-1, -1), 0.5, APP_BORDER), # Too busy, match app's "border-b"
        
        # Row lines for data
        ('LineBelow', (0, 3), (-1, 7), 0.25, APP_BORDER),   # Contributors rows
        ('LineBelow', (0, 11), (-1, 15), 0.25, APP_BORDER), # Disruptors rows
        
        # Border under headers
        ('LineBelow', (0, 2), (-1, 2), 0.5, colors.black),  # Under Contrib Header
        ('LineBelow', (0, 10), (-1, 10), 0.5, colors.black), # Under Disrupt Header
        
    ])
    
    # Apply green color to contributor values (rows 3-7)
    # Perf (Col 2) and Contrib (Col 3)
    for i in range(3, 8):
        # We need to check if value is negative (red) or positive (green)
        # But here we are applying static styles based on row index.
        # Since we pre-formatted the strings (e.g. "(34)"), strict coloring in ReportLab requires
        # knowing the value again or parsing the string.
        # Alternatively, use CellStyle (Flowables) but that's complex.
        # Simple hack: Top Contributors are usually positive.
        # BUT wait, the code previously applied GREEN_TEXT to all contrib values in this section.
        # Let's keep that logic but refine the color.
        style.add('TEXTCOLOR', (3, i), (3, i), APP_GREEN) # Contrib column
        
        # Performance column color depends on value, hard to do with static TableStyle if mixed.
        # However, Top Contributors usually have positive contrib, but return could be mixed?
        # Actually, in the code loop we see:
        # data.append([ticker, weight, perf, contrib])
        # We can't easily conditionally style CELL by CELL in TableStyle after creation without logic.
        # The previous code did: style.add('TEXTCOLOR', (3, i), (3, i), GREEN_TEXT)
        # It assumed top contributors -> green contrib.
        
    # Apply red color to disruptor values (rows 11-15)
    for i in range(11, 16):
        style.add('TEXTCOLOR', (3, i), (3, i), APP_RED)
        
    # Other Holdings (Row -3)
    # Total Portfolio (Row -1)
    
    # Re-apply coloring logic based on string content?
    # ReportLab Table doesn't support conditional styling easily *after* data is text.
    # But notice in the loops above in strict code, we constructed the `data` list.
    # We can iterate through `data` and set specific cell text colors if we pass `style` object?
    # No, usually we build one big style list.
    
    # Better approach: Use Paragraphs for cells with colors, OR add precise (row, col) styles.
    # Let's add specific styles for the "Other Holdings" and "Total" rows based on sign.
    
    # Row indices in `data` list:
    # 0: Month Header
    # 1: Top Contrib Title
    # 2: Top Contrib Headers
    # 3-7: Top Contrib Data
    # 8: Contrib Sum
    # 9: Top Disrupt Title
    # 10: Top Disrupt Headers
    # 11-15: Top Disrupt Data
    # 16: Disrupt Sum
    # 17: Other Holdings
    # 18: Total Portfolio
    
    # Colors for Sum rows (Σ)
    # Contrib Sum (Row 8)
    style.add('TEXTCOLOR', (3, 8), (3, 8), APP_GREEN) # Usually positive
    
    # Disrupt Sum (Row 16)
    style.add('TEXTCOLOR', (3, 16), (3, 16), APP_RED) # Usually negative
    
    # Other Holdings (Row 17)
    # We need to know if Other Holdings is pos/neg.
    # In the code `other_contrib` variable holds this.
    if other_contrib >= 0:
         style.add('TEXTCOLOR', (3, 17), (3, 17), APP_GREEN)
         style.add('TEXTCOLOR', (2, 17), (2, 17), APP_GREEN) # Perf too?
    else:
         style.add('TEXTCOLOR', (3, 17), (3, 17), APP_RED)
         style.add('TEXTCOLOR', (2, 17), (2, 17), APP_RED)
         
    # Total Portfolio (Row 18)
    if total_contrib >= 0:
         style.add('TEXTCOLOR', (3, 18), (3, 18), APP_GREEN)
    else:
         style.add('TEXTCOLOR', (3, 18), (3, 18), APP_RED)

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
