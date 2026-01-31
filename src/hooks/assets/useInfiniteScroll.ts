/**
 * @file useInfiniteScroll.ts
 * @description Hook for implementing infinite scroll functionality
 * @author fmw666@github
 * @date 2025-01-31
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useEffect, useRef, useCallback } from 'react';

// =================================================================================================
// Type Definitions
// =================================================================================================

interface UseInfiniteScrollOptions {
  loadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
}

// =================================================================================================
// Hook Definition
// =================================================================================================

/**
 * Hook for implementing infinite scroll with Intersection Observer
 * @param options - Configuration options
 * @returns Ref to attach to the sentinel element
 */
export const useInfiniteScroll = ({
  loadMore,
  hasMore,
  isLoading,
  threshold = 0.1
}: UseInfiniteScrollOptions) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Callback for intersection observer
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;

      if (entry.isIntersecting && hasMore && !isLoading) {
        loadMore();
      }
    },
    [loadMore, hasMore, isLoading]
  );

  // Setup intersection observer
  useEffect(() => {
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Don't create observer if we can't load more
    if (!hasMore || isLoading) {
      return;
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin: '100px' // Start loading a bit before reaching the sentinel
    });

    // Observe the sentinel element
    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    // Cleanup on unmount
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection, hasMore, isLoading, threshold]);

  return sentinelRef;
};
