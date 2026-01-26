-- --------------------------------------------------------
-- Add News Audit columns to the trades table
-- This allows us to track the QUALITATIVE reason behind a trade
-- --------------------------------------------------------

ALTER TABLE paper_trades 
ADD COLUMN IF NOT EXISTS news_sentiment_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS news_summary TEXT DEFAULT '';

COMMENT ON COLUMN paper_trades.news_sentiment_score IS 'Sentiment Score (-1 to 1) at the moment of entry';
COMMENT ON COLUMN paper_trades.news_summary IS 'Brief summary of the news narrative driving the decision';
