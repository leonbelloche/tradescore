// Posting limits for X (researched 2026-11-09):
// - free accounts: 50 posts and 200 replies a day max, counted in half-hour windows (X Help Center, May 2026);
// - automation rules: no duplicate or "substantially similar" posts, no automated replies/mentions, no trend hijacking.
// X sets no minimum gap between posts. We use 10 posts a day, at least 2 minutes apart (45 before 2026-11-12:
// that was our own caution, not an X rule), max 1 hashtag, every text different. Spreading posts over the US day
// still gets more reach and looks more human on a new account.
// History: 10 -> 3 on 2026-11-11 (a new account gets little reach from its own posts), back to 10 on 2026-11-12
// at Léon's request (he wants a steady presence). Replies under big accounts still matter most.
export const X_POSTS_PER_DAY = 10;
export const X_GAP_MINUTES = 2;
