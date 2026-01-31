/**
 * @file useChatScroll.ts
 * @description Hook for managing chat scrolling behavior
 * @author fmw666@github
 * @date 2025-07-18
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useRef, useCallback, useEffect } from 'react';

// --- Internal Libraries ---
// --- Services ---
import type { Chat } from '@/services/chat';

// =================================================================================================
// Hook Definition
// =================================================================================================

interface UseChatScrollOptions {
  setIsScrolling?: (v: boolean) => void;
  setIsShowLoading?: (v: boolean) => void;
  setHasLoadingTimedOut?: (v: boolean) => void;
}

const SCROLL_TIMEOUT = 8000;

export const useChatScroll = (
  currentChat: Chat | null,
  options?: UseChatScrollOptions
) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const optionsRef = useRef(options);
  
  // 更新 optionsRef
  useEffect(() => {
    optionsRef.current = options;
  });

  const scrollMessagesToBottom = useCallback(
    (showLoading: boolean = true) => {
      if (!currentChat?.messages.length) {
        optionsRef.current?.setIsScrolling?.(false);
        optionsRef.current?.setHasLoadingTimedOut?.(false);
        return;
      }

      optionsRef.current?.setIsScrolling?.(true);
      optionsRef.current?.setIsShowLoading?.(showLoading);
      optionsRef.current?.setHasLoadingTimedOut?.(false);

      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (optionsRef.current?.setHasLoadingTimedOut) {
        loadingTimeoutRef.current = setTimeout(() => optionsRef.current?.setHasLoadingTimedOut?.(true), SCROLL_TIMEOUT);
      }

      // 获取所有视频结果
      const allVideos = currentChat.messages.flatMap(msg =>
        Object.values(msg.results?.videos || {}).flat()
      );
      // 检查是否有任何视频
      const hasAnyVideos = allVideos.length > 0;

      const finishScroll = () => {
        optionsRef.current?.setIsScrolling?.(false);
        optionsRef.current?.setHasLoadingTimedOut?.(false);
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      };

      // 视频不需要预加载，直接滚动
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setTimeout(finishScroll, hasAnyVideos ? 300 : 500);
      }, 100);
    },
    [currentChat]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, []);

  return {
    messagesEndRef,
    scrollMessagesToBottom,
  };
};
