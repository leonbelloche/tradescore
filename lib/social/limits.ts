// Posting limits for X (researched 2026-11-09):
// - free accounts: 50 posts and 200 replies a day max, counted in half-hour windows (X Help Center, May 2026);
// - automation rules: no duplicate or "substantially similar" posts, no automated replies/mentions, no trend hijacking.
// We stay far below: 10 posts a day, at least 45 minutes apart, max 2 hashtags, every text different.
export const X_POSTS_PER_DAY = 10;
export const X_GAP_MINUTES = 45;
