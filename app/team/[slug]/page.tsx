import { Suspense } from "react";
import Placeholder from "@/components/Placeholder";
import LoadingBlock from "@/components/LoadingBlock";

export default function TeamPage(props: PageProps<"/team/[slug]">) {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Team params={props.params} />
    </Suspense>
  );
}

async function Team({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Placeholder
      title={`Team: ${slug}`}
      description="Roster, total payroll and room under the salary cap."
    />
  );
}
