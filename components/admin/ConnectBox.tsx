// Shown on a channel page while the channel is not connected: what to set up, step by step.
export default function ConnectBox({ channel }: { channel: "x" | "instagram" }) {
  const steps =
    channel === "x"
      ? [
          "Go to developer.x.com, sign in with the Trade Score X account, create a Project and an App.",
          "In the App's “User authentication settings”: permissions “Read and write”.",
          "In “Keys and tokens”: copy the API Key and Secret, then generate the Access Token and Secret (for your account).",
          "In Vercel → Settings → Environment Variables, add X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET, then redeploy.",
          "X bills the API per use (a few cents per post with an image): add credit in the developer portal.",
        ]
      : [
          "Switch the Instagram account to a professional account (Settings → Account type → Business or Creator).",
          "On developers.facebook.com, create an app with the “Instagram” product (API setup with Instagram login) and add your account.",
          "Generate an access token for the account (long-lived, 60 days) and note the Instagram user id shown next to it.",
          "In Vercel, add INSTAGRAM_USER_ID and INSTAGRAM_ACCESS_TOKEN, then redeploy. Publishing is free.",
          "In Supabase → SQL Editor, run supabase/migrations/005_reels.sql (storage for the videos), then publish from the live site.",
        ];
  return (
    <details className="rounded-2xl border border-score-3/40 bg-score-3/10 p-4 text-sm">
      <summary className="cursor-pointer font-bold">
        {channel === "x" ? "𝕏" : "Instagram"} is not connected yet: for now Send {channel === "x" ? "opens X with the text ready" : "saves the video and opens Instagram"}. Connect it to publish in one click ▸
      </summary>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-muted">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </details>
  );
}
