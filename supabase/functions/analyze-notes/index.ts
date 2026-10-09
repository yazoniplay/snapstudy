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

    const outputText = typeof result?.output_text === "string"
      ? result.output_text
      : Array.isArray(result?.outputs)
      ? result.outputs.filter((item: { type?: string }) => item?.type === "text").map((item: { text?: string }) => item.text || "").join("\n")
      : "";

    if (!outputText) throw new Error("Gemini returned no text. Please try a clearer image.");
    const parsed = JSON.parse(outputText);
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
