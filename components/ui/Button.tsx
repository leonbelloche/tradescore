import Link from "next/link";

type Variant = "primary" | "ghost";

const STYLES: Record<Variant, string> = {
  primary: "bg-accent text-black enabled:hover:brightness-110 aria-[disabled=false]:hover:brightness-110",
  ghost: "border border-border-strong text-foreground hover:border-accent",
};

const BASE =
  "display inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-base font-bold transition " +
  "disabled:cursor-not-allowed disabled:opacity-40";

type CommonProps = { variant?: Variant; className?: string; children: React.ReactNode };

// Button (min 44 px tall, visible keyboard focus via the global :focus-visible style).
// Pass `href` to render a link that looks like a button.
export default function Button(
  props: CommonProps &
    ({ href: string } | ({ href?: undefined } & React.ButtonHTMLAttributes<HTMLButtonElement>)),
) {
  const { variant = "primary", className = "", children } = props;
  const classes = `${BASE} ${STYLES[variant]} ${className}`;
  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variant: _v, className: _c, href: _h, children: _ch, ...rest } = props;
  return (
    <button type="button" {...rest} className={classes}>
      {children}
    </button>
  );
}
