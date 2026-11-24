# SnapStudy

SnapStudy is an Expo app that turns photos of handwritten notes into study material.

## Features
- Scan notes
- AI extraction into summaries, flashcards, quizzes, and practice tests
- XP, levels, daily quests, and achievements

## AI provider fallback

The `analyze-notes` Supabase Edge Function tries each configured provider in order. A provider failure, timeout, or invalid study JSON causes it to continue to the next provider. Each request is bounded to 9 seconds so a long provider outage does not stall the study flow indefinitely.

Supported provider IDs: `gemini`, `groq`, `nvidia`, `tokenharbor`, `huggingface`, `openrouter`, `vercel`, `zai`, `siliconflow`, `orcarouter`, `bazaarlink`, `cloudflare`, and `sambanova`.

Configure provider credentials as **Supabase Edge Function secrets** (never put provider keys in Expo/public environment variables). Set any available keys with the Supabase CLI, for example:

```sh
supabase secrets set GEMINI_API_KEY=... GROQ_API_KEY=... OPENROUTER_API_KEY=... AI_GATEWAY_API_KEY=...
```

Provider key names:
- Gemini: `GEMINI_API_KEY`
- Groq: `GROQ_API_KEY`
- NVIDIA: `NVIDIA_API_KEY`
- TokenHarbor: `TOKENHARBOR_API_KEY` and `TOKENHARBOR_BASE_URL`
- Hugging Face: `HUGGINGFACE_API_KEY` (or `HF_TOKEN`)
- OpenRouter: `OPENROUTER_API_KEY`
- Vercel AI Gateway: `AI_GATEWAY_API_KEY` (or `VERCEL_AI_GATEWAY_API_KEY`)
- Z.ai / Zhipu: `ZAI_API_KEY` (or `ZHIPU_API_KEY`)
- SiliconFlow: `SILICONFLOW_API_KEY`
- OrcaRouter: `ORCAROUTER_API_KEY` and `ORCAROUTER_BASE_URL`
- BazaarLink: `BAZAARLINK_API_KEY` and `BAZAARLINK_BASE_URL`
- Cloudflare Workers AI: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
- SambaNova: `SAMBANOVA_API_KEY`

Optional `*_MODEL` secrets override the default model for each provider. Optional `AI_PROVIDER_ORDER` accepts a comma-separated list of provider IDs, such as `groq,cloudflare,gemini,openrouter`. Router providers with no known public-compatible endpoint require their `*_BASE_URL` to be set.

Deploy the updated function after setting secrets:

```sh
supabase functions deploy analyze-notes --project-ref thqxjxrtcvcrnqnnmjzi
```

