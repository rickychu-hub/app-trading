export const TICKER_MAP: Record<string, string> = {
    'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana', 'BNB': 'binancecoin',
    'XRP': 'ripple', 'ADA': 'cardano', 'AVAX': 'avalanche-2', 'DOGE': 'dogecoin',
    'DOT': 'polkadot', 'TRX': 'tron', 'LINK': 'chainlink', 'MATIC': 'matic-network',
    'SHIB': 'shiba-inu', 'LTC': 'litecoin', 'UNI': 'uniswap', 'ATOM': 'cosmos',
    'XLM': 'stellar', 'ETC': 'ethereum-classic', 'FIL': 'filecoin', 'HBAR': 'hedera-hashgraph',
    'APT': 'aptos', 'NEAR': 'near', 'VET': 'vechain', 'QNT': 'quant', 'GRT': 'the-graph',
    'AAVE': 'aave', 'ALGO': 'algorand', 'STX': 'blockstack', 'IMX': 'immutable-x',
    'EOS': 'eos', 'XTZ': 'tezos', 'SAND': 'the-sandbox', 'THETA': 'theta-token',
    'AXS': 'axie-infinity', 'MANA': 'decentraland', 'FTM': 'fantom', 'PEPE': 'pepe',
    'RNDR': 'render-token', 'INJ': 'injective-protocol', 'LDO': 'lido-dao'
};

export const getCoingeckoId = (ticker: string): string => {
    // 1. Remove $ prefix, 2. Remove spaces, 3. Uppercase
    const clean = ticker.replace(/\$/g, '').trim().toUpperCase();
    // Return mapped ID or fallback to lowercase ticker
    return TICKER_MAP[clean] || clean.toLowerCase();
};
