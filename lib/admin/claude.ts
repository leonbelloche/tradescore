// Claude (Opus 5.5) for the admin's writing tools: X posts, X replies, video scripts. Server only.
// Needs ANTHROPIC_API_KEY (server only, no NEXT_PUBLIC_). Every call costs a little (Opus 5.5: $4 / $20 per million tokens).
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const MODEL = "claude-opus-5-5";

export const claudeConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

// Shared voice for everything Claude writes for the Trade Score account.
export const VOICE = `You write for Trade Score, a website that grades every NBA trade from 1 to 99 for each team
(50 = fair, 80+ = heist, 20 or less = fleeced). Tagline: "Who got robbed? We do the math."
Voice: confident, funny, a bit cheeky, never mean to players. Short sentences. American English, NBA Twitter tone.
Only use numbers and facts given in the data below; never invent stats, trades, injuries or quotes.
No hashtag spam: at most #NBA plus one team hashtag. No emojis unless they add something (max 1).`;

// One structured call: returns data matching `schema`, or throws a readable error.
export async function writeJson<S extends z.ZodType>(schema: S, system: string, prompt: string): Promise<z.infer<S>> {
  if (!claudeConfigured()) throw new Error("La clé ANTHROPIC_API_KEY manque : ajoute-la dans .env.local pour utiliser Claude.");
  try {
    const response = await anthropic().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // If Opus 5.5 declines for safety reasons, the API retries on a fallback model automatically.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
      system,
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") throw new Error("Claude a refusé cette demande. Essaie de la reformuler.");
    if (!response.parsed_output) throw new Error("La réponse de Claude n'a pas pu être lue. Réessaie.");
    return response.parsed_output as z.infer<S>;
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error("La clé ANTHROPIC_API_KEY n'est pas valide.");
    if (e instanceof Anthropic.RateLimitError) throw new Error("Trop de demandes à Claude en ce moment. Attends une minute et réessaie.");
    if (e instanceof Anthropic.APIError) throw new Error(`Erreur de l'API Claude ${e.status} : ${e.message}`);
    throw e;
  }
}
