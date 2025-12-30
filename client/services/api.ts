import { PortfolioItem } from '../types';

const API_Base_URL = 'http://localhost:8000';

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
