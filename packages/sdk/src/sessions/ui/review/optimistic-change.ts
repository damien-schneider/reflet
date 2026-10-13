import type { SessionDetail } from "../../protocol";
import { useSessionAction } from "../session-workspace";
import type { ReviewHandle } from "./use-session-detail";

type DetailUpdate = (detail: SessionDetail) => SessionDetail;

export interface OptimisticChange<T> {
  failureLabel: string;
  request: () => Promise<T>;
  rollback: DetailUpdate;
  settle: (detail: SessionDetail, saved: T) => SessionDetail;
  show: DetailUpdate;
}

export function useOptimisticChange(review: ReviewHandle) {
  const run = useSessionAction();
  const applyChange = async <T>(
    change: OptimisticChange<T>
  ): Promise<T | null> => {
    review.patch(change.show);
    const saved = await run(change.failureLabel, change.request, () => {
      applyChange(change);
    });
    if (saved === null) {
      review.patch(change.rollback);
      return null;
    }
    review.patch((detail) => change.settle(detail, saved));
    return saved;
  };
  return applyChange;
}
