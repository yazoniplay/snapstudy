import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const prompt = `Read the handwritten or printed study notes in the supplied image.
Return ONLY valid JSON with exactly this shape:
{
  "topic": "short topic",
  "summary": "student-friendly summary",
  "flashcards": [{"question": "...", "answer": "..."}],
  "quiz": [{"question": "...", "options": ["...", "...", "...", "..."], "answer": 0, "explanation": "..."}],
  "practiceTest": [{"question": "...", "answer": "..."}]
}
Create 8-12 flashcards, 6 quiz questions, and 5 practice-test questions.
The quiz answer must be a zero-based index into options.
Use only information supported by the notes. If something is unreadable, do not invent details.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { imageBase64, language = "en", mimeType = "image/jpeg" } = await req.json();
    if (typeof imageBase64 !== "string" || !imageBase64) throw new Error("No image supplied");

    const languageInstruction = language === "sv"
      ? "Write every generated field in natural Swedish."
      : language === "ar"
      ? "اكتب جميع الحقول المُنشأة باللغة العربية الفصحى الواضحة."
      : "Write every generated field in natural English.";

    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) throw new Error("GEMINI_API_KEY is not configured");

    // The Interactions API is the recommended endpoint for current Gemini models.
    // store:false avoids retaining students' uploaded notes as saved interactions.
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        model: "gemini-3.5-flash-lite",
        store: false,
        system_instruction: "You are SnapStudy, a careful study assistant. Follow the requested JSON structure exactly. Do not use markdown fences or add commentary.",
        input: [
          { type: "text", text: prompt + "\n\n" + languageInstruction },
          { type: "image", data: imageBase64, mime_type: mimeType || "image/jpeg" },
        ],
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      const message = result?.error?.message || "Gemini Interactions API request failed";
      throw new Error(message);
    }

    // Interactions API returns generated text inside steps[].content[].
    // Also accept output_text/outputs for SDK and API response compatibility.
    const textParts: string[] = [];
    if (typeof result?.output_text === "string" && result.output_text.trim()) {
      textParts.push(result.output_text);
    }
    const collectText = (items: unknown) => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        if (item && typeof item === "object") {
          const part = item as { type?: string; text?: string; content?: unknown[] };
          if (part.type === "text" && typeof part.text === "string") textParts.push(part.text);
          if (Array.isArray(part.content)) collectText(part.content);
        }
      }
    };
    collectText(result?.outputs);
    collectText(result?.output);
    if (Array.isArray(result?.steps)) {
      for (const step of result.steps) {
        if (step && typeof step === "object") {
          const item = step as { type?: string; content?: unknown[] };
          if (item.type === "model_output") collectText(item.content);
        }
      }
    }

    const outputText = textParts.join("\\n").trim();
    if (!outputText) {
      const status = typeof result?.status === "string" ? result.status : "unknown";
      throw new Error(`Gemini returned no readable text (status: ${status}). This is an API response parsing issue, not necessarily an image-quality problem.`);
    }
    const cleanedText = outputText.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      throw new Error("Gemini responded, but its study content was not valid JSON. Please try again.");
    }
    if (!parsed || typeof parsed.topic !== "string" || typeof parsed.summary !== "string" ||
        !Array.isArray(parsed.flashcards) || !Array.isArray(parsed.quiz) || !Array.isArray(parsed.practiceTest)) {
      throw new Error("Gemini returned study content in an unexpected format. Please try again.");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown AI service error",
    }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
