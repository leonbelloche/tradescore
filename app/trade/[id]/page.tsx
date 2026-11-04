import { Suspense } from "react";
import Placeholder from "@/components/Placeholder";
import LoadingBlock from "@/components/LoadingBlock";

// Reading the URL (params) happens inside <Suspense>, so Next.js can show
// the page shell instantly and stream the content in.
export default function TradeResultPage(props: PageProps<"/trade/[id]">) {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <TradeResult params={props.params} />
    </Suspense>
  );
}

async function TradeResult({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Placeholder
      title={`Trade #${id}`}
      description="Trade Score out of 100 for each team and the winner."
    />
  );
}
