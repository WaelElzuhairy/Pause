export interface GenerateOptions {
  system: string;
  user: string;
  json?: boolean;
  maxTokens?: number;
}

export interface AIProvider {
  generate(opts: GenerateOptions): Promise<string>;
}

// Factory — swap provider via AI_PROVIDER env var
let _provider: AIProvider | null = null;

export function getProvider(): AIProvider {
  if (_provider) return _provider;

  const providerName = process.env.AI_PROVIDER ?? "groq";

  if (providerName === "claude") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ClaudeProvider } = require("./claude");
    _provider = new ClaudeProvider(process.env.CLAUDE_API_KEY!);
  } else if (providerName === "gemini") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GeminiProvider } = require("./gemini");
    _provider = new GeminiProvider();
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GroqProvider } = require("./groq");
    _provider = new GroqProvider(process.env.GROQ_API_KEY!);
  }

  return _provider!;
}
