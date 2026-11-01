import {
  ConvexReactClient,
  type Watch,
  type WatchQueryOptions,
} from "convex/react";
import type {
  ArgsAndOptions,
  FunctionReference,
  FunctionReference_future,
  FunctionReturnType,
} from "convex/server";

export const UNWATCHED_QUERY_KEEP_ALIVE_MS = 5 * 60 * 1000;

export class KeepAliveConvexClient extends ConvexReactClient {
  override watchQuery<
    Query extends
      | FunctionReference<"query">
      | FunctionReference_future<"query">,
  >(
    query: Query,
    ...argsAndOptions: ArgsAndOptions<Query, WatchQueryOptions>
  ): Watch<FunctionReturnType<Query>> {
    const watch = super.watchQuery(query, ...argsAndOptions);
    return {
      ...watch,
      onUpdate: (callback) => {
        const unsubscribe = watch.onUpdate(callback);
        return () => {
          const releaseKeepAlive = watch.onUpdate(() => undefined);
          unsubscribe();
          setTimeout(releaseKeepAlive, UNWATCHED_QUERY_KEEP_ALIVE_MS);
        };
      },
    };
  }
}
