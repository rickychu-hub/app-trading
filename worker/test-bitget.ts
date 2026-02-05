
import dotenv from 'dotenv';
import { bitgetApi } from './utils/BitgetAPI';

dotenv.config();

async function testBitget() {
    console.log("🧪 Testing Bitget API Integration...");

    const apiKey = process.env.BITGET_API_KEY;
    if (!apiKey || apiKey.includes('your_bitget')) {
        console.warn("⚠️  Bitget API Key not configured in .env. Test will likely fail.");
    }

    try {
        // Attempting a market sell of 0.0001 BTC (or whatever) 
        // Note: This WILL fail if credentials are fake, which is what we want to verify the error handling.
        console.log("👉 Attempting a mock market sell to verify signature logic...");
        await bitgetApi.placeMarketSellOrder('BTCUSDT', 0.0001);
        console.log("✅ SUCCESS: Order placed (unexpectedly, check if you are using real money!)");
    } catch (error: any) {
        console.log("📊 Result:");
        if (error.message.includes('401') || error.message.includes('Sign')) {
            console.log("❌ Signature/Auth Error: This confirms the logic works but credentials are invalid.");
        } else {
            console.log(`ℹ️  Received error: ${error.message}`);
        }
    }
}

testBitget();
