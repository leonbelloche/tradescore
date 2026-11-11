// Posting limits for X (researched 2026-11-09):
// - free accounts: 50 posts and 200 replies a day max, counted in half-hour windows (X Help Center, May 2026);
// - automation rules: no duplicate or "substantially similar" posts, no automated replies/mentions, no trend hijacking.
// We stay far below: 3 posts a day, at least 45 minutes apart, max 1 hashtag, every text different.
// Why only 3 (changed 2026-11-11): a new account with no followers gets almost no reach from its own posts.
// Growth comes from replies under big NBA accounts; 3 strong posts + 20 replies a day beats 10 posts.
export const X_POSTS_PER_DAY = 3;
export const X_GAP_MINUTES = 45;
