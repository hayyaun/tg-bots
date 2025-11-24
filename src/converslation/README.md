# Converslation Bot

An inline Telegram bot that translates your messages to your friend's language using ChatGPT API.

## Features

- 🌐 **Inline Translation**: Type `@bot_username your message` in any chat to translate
- 💬 **Per-Chat Language Settings**: Set different target languages for different chats
- 🚀 **Powered by ChatGPT**: Uses OpenAI's GPT-3.5-turbo for high-quality translations
- 💾 **Smart Caching**: Caches translations to reduce API calls and costs
- 🌍 **Multiple Languages**: Supports 10+ popular languages out of the box

## Setup

### 1. Create a Telegram Bot

1. Talk to [@BotFather](https://t.me/BotFather) on Telegram
2. Create a new bot with `/newbot`
3. Get your bot token
4. **Important**: Enable inline mode:
   - Send `/setinline` to BotFather
   - Select your bot
   - Set a placeholder text like "Type message to translate..."
   - Send `/setinlinefeedback` to enable inline feedback

### 2. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Go to API Keys section
4. Create a new API key
5. Copy the key (you won't be able to see it again)

### 3. Configure Environment

Add to your `.env` file:

```bash
CONVERSLATION_BOT_KEY=your_bot_token_here
OPENAI_API_KEY=your_openai_api_key_here
```

### 4. Run the Bot

```bash
npm run dev
```

## Usage

### Step 1: Set Target Language

1. Start a chat with the bot: `/start`
2. Use `/setlang` to choose the language you want to translate to
3. Select from popular languages (English, Persian, Russian, etc.)

### Step 2: Translate Messages

In any Telegram chat (private or group):

1. Type `@your_bot_username` followed by your message
2. The bot will show you the translated version
3. Tap on the result to send it to the chat

### Commands

- `/start` - Welcome message and instructions
- `/help` - Show help and usage information
- `/setlang` - Set target language for current chat
- `/mylang` - Show current language setting
- `/clearlang` - Clear language setting for current chat

## Supported Languages

- 🇬🇧 English (en)
- 🇮🇷 Persian (fa)
- 🇷🇺 Russian (ru)
- 🇪🇸 Spanish (es)
- 🇫🇷 French (fr)
- 🇩🇪 German (de)
- 🇸🇦 Arabic (ar)
- 🇨🇳 Chinese (zh)
- 🇯🇵 Japanese (ja)
- 🇰🇷 Korean (ko)

## Architecture

```
converslation/
├── index.ts          # Main bot logic
├── types.ts          # TypeScript interfaces
└── README.md         # This file
```

### Key Components

1. **Language Storage**: In-memory Map storing user language preferences
   - Format: `"chatId:userId" -> "languageCode"`
   - In production, consider using a database

2. **Translation Cache**: Reduces API costs by caching translations
   - TTL: 1 hour
   - Key format: `"sourceLang:targetLang:text"`

3. **OpenAI Integration**: Uses GPT-3.5-turbo for translations
   - Temperature: 0.3 (more deterministic)
   - Max tokens: 1000
   - System prompt optimized for translation

## Cost Considerations

- GPT-3.5-turbo costs approximately $0.002 per 1K tokens
- Average message: ~50-100 tokens
- Translation cache reduces repeated requests
- Monitor usage in OpenAI dashboard

## Future Enhancements

- [ ] Add language auto-detection
- [ ] Support for multiple target languages per chat
- [ ] Database persistence for language settings
- [ ] User statistics and usage tracking
- [ ] Support for document translation
- [ ] Voice message transcription and translation
- [ ] Group-specific language settings
- [ ] Admin commands for bot management

## Troubleshooting

### Bot doesn't respond to inline queries

- Make sure inline mode is enabled in BotFather (`/setinline`)
- Check that `CONVERSLATION_BOT_KEY` is set correctly
- Verify bot is running: check logs

### Translation fails

- Verify `OPENAI_API_KEY` is valid
- Check OpenAI account has credits
- Review logs for specific error messages
- Ensure internet connectivity

### Language not saving

- Language settings are per-chat
- Each chat needs separate `/setlang`
- Settings are stored in-memory (cleared on restart)

## License

Part of the tgbots project.

