/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                wallstreet: {
                    50: 'var(--bg-main)',    // Using main bg as lightest for now, or could be distinct
                    100: 'var(--bg-subtle)',
                    200: 'var(--border-main)', // Use for borders
                    300: '#cbd5e1',     // Keep some static slates if needed, or map to var
                    400: '#94a3b8',
                    500: 'var(--text-muted)',
                    600: '#475569',
                    700: 'var(--border-main)', // Mapping legacy 700 usages (borders) to border var
                    800: 'var(--bg-card)',     // Mapping legacy 800 usages (cards) to card var
                    900: 'var(--bg-main)',     // Mapping legacy 900 usages (main bg) to main bg var
                    950: '#020617',
                    text: 'var(--text-main)',
                    accent: 'var(--accent-primary)',
                    danger: 'var(--status-danger)',
                    success: 'var(--status-success)',
                    warning: 'var(--status-warning)'
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
        },
    },
    plugins: [],
}
