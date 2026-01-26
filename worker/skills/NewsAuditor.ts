
import { GoogleGenerativeAI } from '@google/generative-ai';
import Parser from 'rss-parser';
import dotenv from 'dotenv';

dotenv.config();

export interface SentimentResult {
    score: number;       // Range: -1 (Negative) to 1 (Positive)
    summary: string;     // Brief explanation
    sourceUrl: string;   // Link to top relevant news
}

// Simple map for reliable RSS searching
const COIN_NAMES: Record<string, string> = {
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'SOL': 'Solana',
    'BNB': 'Binance',
    'XRP': 'Ripple',
    'ADA': 'Cardano',
    'AVAX': 'Avalanche',
    'DOGE': 'Dogecoin',
    'DOT': 'Polkadot',
    'MATIC': 'Polygon',
    'LINK': 'Chainlink',
    'SHIB': 'Shiba'
};

export class NewsAuditor {
    private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    private static parser = new Parser();

    /**
     * Analysis Pipeline:
     * 1. Fetch RSS Feeds (Cointelegraph, CoinDesk)
     * 2. Filter for specific Asset
     * 3. Send to Gemini for Sentiment Analysis
     */
    public static async analyzeSentiment(symbol: string): Promise<SentimentResult> {
        // Validation: Check API Key
        if (!process.env.GEMINI_API_KEY) {
            console.warn("⚠️ NewsAuditor: GEMINI_API_KEY missing. Falling back to Simulation.");
            return this.simulationFallback(symbol);
        }

        try {
            console.log(`🧠 NewsAuditor (Gemini): Researching ${symbol}...`);

            // 1. Fetch Real News
            const headlines = await this.fetchStartuptNews(symbol);

            if (headlines.length === 0) {
                console.log(`   ↳ No direct news found for ${symbol}. Assuming Neutral.`);
                return { score: 0, summary: "No recent specific news found. Market noise.", sourceUrl: "" };
            }

            // 2. Ask Gemini
            const analysis = await this.askGemini(symbol, headlines);

            console.log(`   ↳ Gemini Verdict: Score ${analysis.score} | "${analysis.summary}"`);
            return analysis;

        } catch (error: any) {
            console.error(`❌ NewsAuditor Error: ${error.message}`);
            return { score: 0, summary: "Error analyzing news. Defaulting to Neutral.", sourceUrl: "" };
        }
    }

    private static async fetchStartuptNews(symbol: string): Promise<{ title: string, link: string }[]> {
        try {
            // Using Cointelegraph RSS as it is reliable and fast
            const feed = await this.parser.parseURL('https://cointelegraph.com/rss');
            const cleanSymbol = symbol.replace('USDT', '');
            const coinName = COIN_NAMES[cleanSymbol] || cleanSymbol;

            const relevantItems = feed.items.filter(item => {
                const text = (item.title + " " + item.contentSnippet).toLowerCase();
                return text.includes(cleanSymbol.toLowerCase()) || text.includes(coinName.toLowerCase());
            });

            // Return top 5
            return relevantItems.slice(0, 5).map(item => ({
                title: item.title || "No Title",
                link: item.link || ""
            }));

        } catch (e) {
            console.warn("⚠️ RSS Fetch failed trying backup source...");
            return [];
        }
    }

    private static async askGemini(symbol: string, newsItems: { title: string, link: string }[]): Promise<SentimentResult> {
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const newsText = newsItems.map(n => `- ${n.title}`).join('\n');

        const prompt = `
        You are a crypto trading assistant. Analyze the sentiment of these news headlines for the asset "${symbol}":

        ${newsText}

        Determine a sentiment score from -1 (Extremely Negative/Crash Imminent) to 1 (Extremely Positive/Moon).
        0 is Neutral.
        Provide a very short summary (max 10 words).
        
        Respond ONLY in JSON format: { "score": number, "summary": "string" }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        try {
            // Clean markdown chars like ```json ... ```
            const cleanJson = text.replace(/```json|```/g, '').trim();
            const data = JSON.parse(cleanJson);

            return {
                score: data.score,
                summary: data.summary,
                sourceUrl: newsItems[0].link // Cite the first article
            };
        } catch (e) {
            console.error("Gemini JSON Parse Error", text);
            return { score: 0, summary: "AI Parse Error", sourceUrl: newsItems[0]?.link || "" };
        }
    }

    private static simulationFallback(symbol: string): Promise<SentimentResult> {
        return Promise.resolve({
            score: 0.1,
            summary: "Simulation: Neutral/Positive flow.",
            sourceUrl: "simulation-mode"
        });
    }
}
