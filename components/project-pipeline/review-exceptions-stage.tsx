import type { BoqItem } from "@/lib/data";
import { ExceptionReviewCard } from "@/components/project-pipeline/exception-review-card";
import { SimilarItemsPreview } from "@/components/project-pipeline/similar-items-preview";

export function ReviewExceptionsStage({
  projectId,
  reviewItems,
}: {
  projectId: string;
  reviewItems: BoqItem[];
}) {
  const currentItem = reviewItems[0];

  if (!currentItem) return null;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#f59e0b]">{reviewItems.length} items need confirmation</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-[#0f172a]">Item 1 of {reviewItems.length}</h2>
      </div>
      <ExceptionReviewCard item={currentItem} projectId={projectId} />
      <SimilarItemsPreview items={reviewItems.slice(1, 7)} />
    </div>
  );
}
