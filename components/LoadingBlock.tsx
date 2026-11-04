// Grey pulsing skeleton shown while a page's content is loading.
export default function LoadingBlock() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-9 w-2/3 rounded bg-surface" />
      <div className="h-4 w-1/2 rounded bg-surface" />
      <div className="h-24 rounded-xl bg-surface" />
    </div>
  );
}
