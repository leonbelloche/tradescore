import { Suspense } from "react";
import Placeholder from "@/components/Placeholder";
import LoadingBlock from "@/components/LoadingBlock";

export default function PlayerPage(props: PageProps<"/player/[slug]">) {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Player params={props.params} />
    </Suspense>
  );
}

async function Player({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Placeholder
      title={`Player: ${slug}`}
      description="Season stats, contract, age and estimated value."
    />
  );
}
