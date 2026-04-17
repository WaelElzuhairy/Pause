import { VertexAI } from "@google-cloud/vertexai";
import type { AIProvider, GenerateOptions } from "./provider";

export class GeminiProvider implements AIProvider {
  private vertexai: VertexAI;

  constructor() {
    this.vertexai = new VertexAI({
      project: "pause-9dc28",
      location: "us-central1",
    });
  }

  async generate(opts: GenerateOptions): Promise<string> {
    const model = this.vertexai.getGenerativeModel({
      model: "gemini-2.0-flash-001",
      systemInstruction: {
        role: "system",
        parts: [{ text: opts.system }],
      },
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? 1024,
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
      },
    });

    const result = await model.generateContent(opts.user);
    const text =
      result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!text) throw new Error("Gemini returned empty response");
    return text;
  }
}
