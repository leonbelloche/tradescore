// Dark rounded card used for every block.
export default function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[14px] border border-border bg-surface ${className}`}>{children}</div>;
}
