// Shown on a channel page while the channel is not connected: what to set up, step by step.
export default function ConnectBox({ channel }: { channel: "x" | "instagram" }) {
  const steps =
    channel === "x"
      ? [
          "Va sur developer.x.com, connecte-toi avec le compte X de Trade Score, crée un Project et une App.",
          "Dans « User authentication settings » de l'App : permissions « Read and write ».",
          "Dans « Keys and tokens » : copie l'API Key et le Secret, puis génère l'Access Token et son Secret (pour ton compte).",
          "Ajoute X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN et X_ACCESS_TOKEN_SECRET dans le fichier .env.local (et chez l'hébergeur quand le site sera en ligne).",
          "X fait payer l'API à l'usage (quelques centimes par post avec image) : ajoute du crédit dans le portail développeur.",
        ]
      : [
          "Passe le compte Instagram en compte professionnel (Paramètres → Type de compte → Business ou Créateur).",
          "Sur developers.facebook.com, crée une app avec le produit « Instagram » (API setup with Instagram login) et ajoute ton compte.",
          "Génère un access token pour le compte (longue durée, 60 jours) et note l'identifiant Instagram affiché à côté.",
          "Ajoute INSTAGRAM_USER_ID et INSTAGRAM_ACCESS_TOKEN dans le fichier .env.local. Publier est gratuit.",
          "Dans Supabase → SQL Editor, lance supabase/migrations/005_reels.sql (le stockage des vidéos). L'envoi direct ne marchera qu'une fois le site en ligne.",
        ];
  return (
    <details className="rounded-2xl border border-score-3/40 bg-score-3/10 p-4 text-sm">
      <summary className="cursor-pointer font-bold">
        {channel === "x" ? "𝕏" : "Instagram"} n’est pas encore connecté : pour l’instant, Envoyer {channel === "x" ? "ouvre X avec le texte prêt" : "enregistre la vidéo et ouvre Instagram"}. Connecte-le pour publier en un clic ▸
      </summary>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-muted">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </details>
  );
}
