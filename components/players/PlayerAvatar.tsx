import Image from "next/image";

const SIZES = { sm: 32, md: 44, lg: 96 } as const;

// ESPN headshot in a round frame, or the player's initials when there is none.
export default function PlayerAvatar({ name, url, size = "sm" }: { name: string; url: string | null; size?: keyof typeof SIZES }) {
  const px = SIZES[size];
  const box = { width: px, height: px };
  if (url) {
    return (
      <span className="inline-block shrink-0 overflow-hidden rounded-full border border-border bg-surface-2" style={box}>
        <Image src={url} alt="" width={px} height={px} className="h-full w-full object-cover object-top" />
      </span>
    );
  }
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <span
      className="display inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 font-bold text-muted"
      style={{ ...box, fontSize: px / 2.8 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
