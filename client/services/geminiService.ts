import { GoogleGenAI } from "@google/genai";
import { PortfolioItem } from "../types";

const SYSTEM_INSTRUCTION = `
**ROLE & OBJECTIVE**
You are a Senior Portfolio Manager (Fundamental Focus) and Chief Macro Strategist. Your mandate is to analyze the user's portfolio with a "Devil's Advocate" mindset. You do not strictly validate the user's ideas; you aggressively pressure-test them to find "Thesis Drift," valuation risks, and macro inefficiencies.

**TONE & STYLE**
Professional, institutional, and direct. Use Wall Street terminology (e.g., "multiple compression," "idiosyncratic risk," "sector rotation," "convexity"). Avoid hedging language like "it might be good"; be decisive about risks.

**ANALYSIS FRAMEWORK**
Process the portfolio through these four filters:

Phase 1: The Macro Overlay (Top-Down)
* Sector Exposure: Analyze concentration. Is the user short volatility or long duration?
* Cyclicality Check: Performance in "Reflationary" vs. "Recessionary" environments.

Phase 2: Fundamental Stress Test (Bottom-Up)
For each major holding (>5% weight), perform a "Pre-Mortem":
* Thesis Drift Check: Compare implied thesis against business reality.
* Valuation Sanity: Critique P/E or DCF implications.
* Qualitative Moat: Is the "moat" eroding (AI, regulation, etc)?

Phase 3: Correlation & Hedging
* Identify "False Diversification".
* Suggest potential hedges.

Phase 4: Weight Variation Analysis (New)
* Analyze the provided weight history/changes.
* Are they "chasing performance" (increasing weight after price rise) or "doubling down" (increasing weight on drops)?
* Flag erratic sizing or lack of conviction (frequent small changes).

**OUTPUT FORMAT**
Produce a structured "Investment Committee Memo" in Markdown:

## 1. Executive Summary & Risk Rating
(Give a Risk Score 1-10 and a summary of vulnerability).

## 2. Macro Alignment Check
(Critique sector allocation).

## 3. Position-Level Deep Dives
* **[TICKER] ([Current Weight]%)**
    * *Stated Thesis:* [Infer from ticker]
    * *The Counter-Argument:* [Your ruthless critique]
    * *Quant Check:* [Valuation commentary]
    * *Verdict:* (BUY / HOLD / SELL / TRIM)

## 4. Weight Variation Analysis
(Critique the sizing decisions and historical moves provided).

## 5. Synthesis & Actionable Recommendations
(3-5 specific bullet points).
`;

export const analyzePortfolio = async (portfolio: PortfolioItem[]): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });
  const tickerHistory = new Map<string, { date: string, weight: number }[]>();
  let latestDate = "";

  portfolio.forEach(p => {
    if (!tickerHistory.has(p.ticker)) tickerHistory.set(p.ticker, []);
    tickerHistory.get(p.ticker)?.push({ date: p.date, weight: p.weight });
    if (p.date > latestDate) latestDate = p.date;
  });

  let portfolioString = "CURRENT HOLDINGS (as of " + latestDate + "):\n";
  const currentHoldings = portfolio.filter(p => p.date === latestDate);
  portfolioString += currentHoldings
    .map((p) => `- ${p.ticker}: ${p.weight}% ${p.notes ? `(Notes: ${p.notes})` : ''}`)
    .join('\n');

  portfolioString += "\n\nHISTORICAL WEIGHT VARIATIONS:\n";
  tickerHistory.forEach((history, ticker) => {
    if (history.length > 1) {
      history.sort((a, b) => a.date.localeCompare(b.date));
      const historyStr = history.map(h => `${h.date}: ${h.weight}%`).join(' -> ');
      portfolioString += `- ${ticker}: ${historyStr}\n`;
    }
  });

  const prompt = `
  Here is the portfolio for analysis. Use the Current Holdings for the main risk assessment, and the Historical Weight Variations to critique the trading/sizing discipline.
  
  ${portfolioString}
  
  Perform the deep dive analysis as requested.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text || "Analysis failed to generate text.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const analyzeCorrelations = async (portfolio: PortfolioItem[]): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });
  const tickers = Array.from(new Set(
    portfolio
      .filter(p => !p.ticker.toUpperCase().includes('CASH') && !p.ticker.includes('$'))
      .map(p => p.ticker)
  )).slice(0, 30);

  const prompt = `
  Analyze the correlation matrix for these assets based on historical price movements and sector beta.
  The list is sorted by portfolio weight (heaviest first). Maintain this order in the matrix.
  
  Tickers:
  ${tickers.join(', ')}

  Output the result ONLY as a JSON object with this exact schema, do not wrap in markdown code blocks:
  {
    "tickers": ["Ticker1", "Ticker2", ...],
    "matrix": [
      [1.0, 0.5, ...], 
      [0.5, 1.0, ...]
    ],
    "analysis": "Markdown formatted string containing the 'Diversification Analysis' identifying False Diversification and True Hedges."
  }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    return response.text || "{}";
  } catch (error) {
    console.error("Gemini Correlation Error:", error);
    throw error;
  }
};