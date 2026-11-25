# SnapStudy

SnapStudy is an Expo app that turns photos of handwritten notes into study material.

## Features
- Scan notes
- AI extraction into summaries, flashcards, quizzes, and practice tests
- Organized Study hub with separate sections for learning, planning, focus, progress, and study buddies
- Private friend chat with images and gifts, plus message replies, reactions, editing, and soft deletion
- XP, levels, daily quests, and achievements

## AI provider fallback

The `analyze-notes` Supabase Edge Function tries configured providers in order. It extracts JSON from responses with surrounding prose or Markdown, repairs common trailing-comma errors, validates the lesson and practice arrays, and uses JSON mode for compatible providers. Provider errors and timeouts continue to the next configured provider.

Supported provider IDs: `gemini`, `groq`, `nvidia`, `tokenharbor`, `huggingface`, `openrouter`, `vercel`, `zai`, `siliconflow`, `orcarouter`, `bazaarlink`, `cloudflare`, and `sambanova`, remote/cloud `ollama`, `agentrouter`, `routeway`, `requesty`, `fastrouter`, `opencodezen`, `llm7`, and `aihorde`.

Configure provider credentials as **Supabase Edge Function secrets** (never put provider keys in Expo/public environment variables). Set any available keys with the Supabase CLI, for example:

```sh
supabase secrets set GEMINI_API_KEY=... GROQ_API_KEY=... OPENROUTER_API_KEY=... AI_GATEWAY_API_KEY=...
```

Provider key names:
- Gemini: `GEMINI_API_KEY`
- Groq: `GROQ_API_KEY`
- NVIDIA: `NVIDIA_API_KEY`
- TokenHarbor: `TOKEN_HARBOR_KEY` (or `TOKENHARBOR_API_KEY`); endpoint defaults to `https://tokenharbor.ai/v1`
- Hugging Face: `HUGGINGFACE_API_KEY` (or `HF_TOKEN`)
- OpenRouter: `OPENROUTER_API_KEY`
- Vercel AI Gateway: `AI_GATEWAY_API_KEY`, `AI_GATEWAY_BASE_URL`, and `AI_GATEWAY_MODEL` (or the `VERCEL_AI_GATEWAY_*` aliases)
- Z.ai / Zhipu: `ZAI_API_KEY` (or `ZHIPU_API_KEY`); default endpoint `https://api.z.ai/api/paas/v4`
- SiliconFlow: `SILICONFLOW_API_KEY`
- OrcaRouter: `ORCAROUTER_API_KEY` (default base URL `https://api.orcarouter.ai/v1`)
- BazaarLink: `BAZAARLINK_API_KEY` (default base URL `https://api.bazaarlink.ai/v1`)
- Cloudflare Workers AI: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
- Remote Ollama: `OLLAMA_API_KEY`, optional `OLLAMA_BASE_URL` (local Ollama on your computer cannot be reached from the hosted Edge Function)\n- AgentRouter: `AGENTROUTER_API_KEY` (optional `AGENTROUTER_BASE_URL` / `AGENTROUTER_MODEL`)\n- Routeway: `ROUTEWAY_API_KEY`\n- Requesty: `REQUESTY_API_KEY`\n- FastRouter: `FASTROUTER_API_KEY`\n- OpenCode Zen: `OPENCODE_ZEN_API_KEY`\n- LLM7: optional `LLM7_API_KEY` (keyless endpoint supported)\n- AI Horde: optional `AIHORDE_API_KEY` (anonymous key is used if omitted)\n- SambaNova: `SAMBANOVA_API_KEY`

Optional `*_MODEL` secrets override the default model for each provider. Optional `AI_PROVIDER_ORDER` accepts a comma-separated list of provider IDs, such as `groq,cloudflare,gemini,openrouter`. Router providers with no known public-compatible endpoint require their `*_BASE_URL` to be set.

Deploy the updated function after setting secrets:

```sh
supabase functions deploy analyze-notes --project-ref thqxjxrtcvcrnqnnmjzi
```

