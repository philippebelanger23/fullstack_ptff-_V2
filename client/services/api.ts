import { PortfolioItem } from '../types';

const API_Base_URL = ''; // Use relative path to leverage Vite proxy

export const analyzePortfolio = async (weightsFile: File, navFile?: File): Promise<PortfolioItem[]> => {
    const formData = new FormData();
    formData.append('weights_file', weightsFile);

    if (navFile) {
        formData.append('nav_file', navFile);
    }

    try {
        const response = await fetch(`${API_Base_URL}/analyze`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data: PortfolioItem[] = await response.json();
        return data;
    } catch (error) {
        console.error("API Error details:", error);
        throw error;
    }
};

// Cache storage
// Cache storage - Initialize from localStorage if available
let sectorCache: Record<string, string> = {};
try {
    const cached = localStorage.getItem('sectorCache');
    if (cached) {
        sectorCache = JSON.parse(cached);
    }
} catch (e) {
    console.warn("Failed to load sector cache from localStorage", e);
}

let indexExposureCache: { sectors: any[], geography: any[] } | null = null;

export const fetchSectors = async (tickers: string[]): Promise<Record<string, string>> => {
    // 1. Filter out tickers we already have in cache
    const missingTickers = tickers.filter(ticker => !sectorCache[ticker]);

    // 2. Fetch only missing tickers
    if (missingTickers.length > 0) {
        try {
            const response = await fetch(`${API_Base_URL}/fetch-sectors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tickers: missingTickers }),
            });

            if (response.ok) {
                const newSectors = await response.json();
                // 3. Update cache
                sectorCache = { ...sectorCache, ...newSectors };
                // Persist to localStorage
                try {
                    localStorage.setItem('sectorCache', JSON.stringify(sectorCache));
                } catch (e) {
                    console.warn("Failed to save sector cache to localStorage", e);
                }
            } else {
                console.error('Failed to fetch sectors');
            }
        } catch (error) {
            console.error("Error fetching sectors:", error);
        }
    }

    // 4. Return all requested sectors from cache (existing + new)
    const result: Record<string, string> = {};
    tickers.forEach(ticker => {
        if (sectorCache[ticker]) {
            result[ticker] = sectorCache[ticker];
        }
    });

    return result;
};

export const fetchIndexExposure = async (): Promise<{ sectors: any[], geography: any[] }> => {
    // Return cached data if available
    if (indexExposureCache) {
        return indexExposureCache;
    }

    try {
        const response = await fetch(`${API_Base_URL}/index-exposure`);
        if (!response.ok) throw new Error("Failed to fetch index exposure");

        // Cache the result
        indexExposureCache = await response.json();
        return indexExposureCache!;
    } catch (error) {
        console.error("Error fetching index exposure:", error);
        return { sectors: [], geography: [] };
    }
};

export const fetchCurrencyPerformance = async (tickers: string[]): Promise<Record<string, Record<string, number>>> => {
    try {
        const response = await fetch(`${API_Base_URL}/fetch-performance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tickers }),
        });

        if (response.ok) {
            return await response.json();
        } else {
            console.error('Failed to fetch currency performance');
            return {};
        }
    } catch (error) {
        console.error("Error fetching currency performance:", error);
        return {};
    }
};
