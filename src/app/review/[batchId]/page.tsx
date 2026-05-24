import { ReviewClient } from "@/features/review/ReviewClient";

interface ReviewPageProps {
  params: Promise<{ batchId: string }>;
}

export default async function ReviewPage({ params }: ReviewPageProps): Promise<React.ReactElement> {
  const { batchId } = await params;
  return <ReviewClient batchId={batchId} />;
}
