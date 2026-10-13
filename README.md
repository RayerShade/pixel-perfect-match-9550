# Pixel Perfect Preview

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pixel-perfect-match-9550.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9d101627-0336-4f17-a11a-3c2dfd782f81).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Optional: AI table parser fallback

`src/lib/ai-tablo.functions.ts` (`aiSutunHaritasi`) is an admin-only, opt-in fallback that asks an OpenAI-compatible API for a **column map only** (max 15 rows sent, 300 tokens, 20 s timeout, zod-validated). It is never called on normal input and makes no request when unconfigured.

Server-only environment variables:
- `AI_TABLE_PARSER_API_KEY` (required to enable)
- `AI_TABLE_PARSER_URL` (optional, default OpenAI chat completions)
- `AI_TABLE_PARSER_MODEL` (optional, default `gpt-4o-mini`)
