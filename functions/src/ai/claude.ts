import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, GenerateOptions } from "./provider";

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generate(opts: GenerateOptions): Promise<string> {
    const message = await this.client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    });

    const block = message.content[0];
    if (!block || block.type !== "text") {
      throw new Error("Claude returned no text content");
    }

    return block.text;
  }
}
