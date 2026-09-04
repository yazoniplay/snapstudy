export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, imageBase64, mimeType } = req.body || {};

    if (!text && !imageBase64) {
      return res.status(400).json({
        error: "No text or image provided"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured"
      });
    }

    const parts = [];

    if (text) {
      parts.push({
        text: `Extract school assignments from this information.

Return ONLY valid JSON matching the requested schema.

School information:
${text}`
      });
    }

    if (imageBase64) {
      parts.push({
        inline_data: {
          mime_type: mimeType || "image/jpeg",
          data: imageBase64
        }
      });

      parts.push({
        text: `Read this school screenshot/photo and extract every assignment or school task you can identify.`
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                tasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      subject: { type: "string" },
                      title: { type: "string" },
                      dueDate: {
                        type: ["string", "null"]
                      },
                      estimatedMinutes: {
                        type: ["integer", "null"]
                      },
                      priority: {
                        type: "string",
                        enum: ["low", "medium", "high"]
                      }
                    },
                    required: [
                      "subject",
                      "title",
                      "dueDate",
                      "estimatedMinutes",
                      "priority"
                    ]
                  }
                }
              },
              required: ["tasks"]
            }
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", data);

      return res.status(response.status).json({
        error: "Gemini request failed",
        details: data
      });
    }

    const generatedText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return res.status(500).json({
        error: "Gemini returned no usable response"
      });
    }

    let result;

    try {
      result = JSON.parse(generatedText);
    } catch {
      return res.status(500).json({
        error: "Gemini returned invalid JSON"
      });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Server error"
    });
  }
}
