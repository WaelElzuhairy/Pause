import type { AIProvider, GenerateOptions } from "./provider";

export class GroqProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async generate(opts: GenerateOptions): Promise<string> {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ],
          max_tokens: opts.maxTokens ?? 1024,
          ...(opts.json ? { response_format: { type: "json_object" } } : {}),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq error ${response.status}: ${error}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Groq returned empty response");
    return text;
  }
}
