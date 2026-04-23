export function buildAssistantSystem(userContext: string): string {
  return `You are MindShield, a warm and empathetic AI companion on the Pause app.
You help users process emotions, especially around cyberbullying and online stress.
Keep responses concise (2-4 sentences), supportive, and grounded.
Never diagnose. Always encourage professional help for serious situations.
User's recent context: ${userContext || "No recent check-ins logged."}`;
}

export function buildAssistantPrompt(
  history: { role: string; content: string }[],
  message: string
): string {
  const historyText = history
    .slice(-10) // last 10 messages for context
    .map((h) => `${h.role === "user" ? "User" : "MindShield"}: ${h.content}`)
    .join("\n");

  return historyText
    ? `${historyText}\nUser: ${message}`
    : message;
}
