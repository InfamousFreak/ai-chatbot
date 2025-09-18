# 🆓 FREE AI APIs Setup Guide

Your chatbot now supports **completely FREE** AI APIs! No billing required.

## 🚀 Quick Start (Works Immediately)

**Option 1: Zero Setup** - Works right now!
- The app includes a built-in fallback that provides demo responses
- Just run `npm run dev` and start chatting!

## 🔥 Best Free Options (Real AI)

### **Option A: Google Gemini (RECOMMENDED)**
**Why:** Highest quality, very generous free tier

1. **Get API Key:**
   - Go to: https://aistudio.google.com/app/apikey
   - Click "Create API Key"
   - Copy the key

2. **Add to .env:**
   ```
   GOOGLE_API_KEY=your_api_key_here
   ```

3. **Free Limits:**
   - 15 requests per minute
   - 1 million tokens per month
   - Perfect for development!

### **Option B: Hugging Face (Good Alternative)**
**Why:** Many models available, very reliable

1. **Get API Key:**
   - Go to: https://huggingface.co/settings/tokens
   - Click "New token"
   - Copy the token

2. **Add to .env:**
   ```
   HUGGINGFACE_API_KEY=your_token_here
   ```

3. **Free Limits:**
   - Generous rate limits
   - Access to many open-source models

## 📋 Priority Order (Automatic)

The app automatically tries providers in this order:
1. **Google Gemini** (if GOOGLE_API_KEY is set)
2. **Hugging Face Llama** (if HUGGINGFACE_API_KEY is set)
3. **Demo fallback** (always works)

## 🛠 Current Features

✅ **Usage tracking** (50 requests/day limit)  
✅ **Multiple AI providers** (automatic fallback)  
✅ **Real-time responses** (streaming simulation)  
✅ **Error handling** (graceful degradation)  
✅ **Zero billing** (completely free)

## 🚀 Test Your Setup

```bash
npm run dev
# Visit http://localhost:3000
# Start chatting - it works immediately!
```

## 💡 Pro Tips

- **Start with Gemini** - highest quality free API
- **Daily limits protect you** - no unexpected costs
- **Multiple providers** - automatic failover
- **Demo mode** - always works even without API keys

You're all set! 🎉
