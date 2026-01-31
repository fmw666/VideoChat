/**
 * @file VideoResultItem.tsx
 * @description Renders a single video result item with progress indicator, player, and error states.
 * @author fmw666@github
 * @date 2025-07-18
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useState, useRef, useCallback } from 'react';
import type { FC } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';

// --- Third-party Libraries ---
import {
  ExclamationCircleIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/solid';

// --- Internal Libraries ---
import type { VideoResult } from '@/services/chat';

// =================================================================================================
// Type Definitions
// =================================================================================================

interface VideoResultItemProps {
  result: VideoResult;
  messageCreatedAt: string;
  onClick: () => void;
}

// =================================================================================================
// Constants
// =================================================================================================

const GENERATION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes for video generation

// =================================================================================================
// Component
// =================================================================================================

export const VideoResultItem: FC<VideoResultItemProps> = ({
  result,
  messageCreatedAt,
  onClick,
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const isTimedOut =
    result.isGenerating &&
    Date.now() - new Date(messageCreatedAt).getTime() > GENERATION_TIMEOUT_MS;

  const handlePlayPause = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause();
        } else {
          videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
      }
    },
    [isPlaying]
  );

  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // 生成中状态
  if (result.isGenerating) {
    if (isTimedOut) {
      // 超时状态
      return (
        <div
          data-result-id={result.id}
          className="group relative aspect-video min-w-[280px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-yellow-50 dark:bg-yellow-900/30 cursor-pointer"
          onClick={onClick}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 p-4">
              <ClockIcon className="h-8 w-8 text-yellow-500" />
              <span className="text-sm text-yellow-700 dark:text-yellow-300 text-center">
                {t('chat.generation.timeout')}
              </span>
              <span className="text-xs text-yellow-600 dark:text-yellow-400">
                {t('chat.generation.videoTimeoutHint')}
              </span>
            </div>
          </div>
        </div>
      );
    }

    // 生成中状态，显示 loading 转圈
    return (
      <div
        data-result-id={result.id}
        className="group relative aspect-video min-w-[280px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-zinc-100 dark:bg-zinc-800/50 cursor-pointer"
        onClick={onClick}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          {/* Loading 转圈动画 */}
          <div className="relative w-16 h-16 mb-3">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-zinc-500 dark:border-t-zinc-400 animate-spin"></div>
          </div>

          {/* 状态文字 */}
          <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            {t('chat.generation.videoGenerating')}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {result.taskId
              ? `任务ID: ${result.taskId.slice(0, 8)}...`
              : '正在创建任务...'}
          </span>
        </div>
      </div>
    );
  }

  // 错误状态
  if (result.error || result.errorMessage) {
    return (
      <div
        data-result-id={result.id}
        className="group relative aspect-video min-w-[280px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/30 cursor-pointer"
        onClick={onClick}
      >
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-2 max-w-[90%]">
            <ExclamationCircleIcon className="h-8 w-8 text-red-500" />
            <span className="text-sm text-red-600 dark:text-red-400 font-medium text-center">
              {t('errors.generationFailed')}
            </span>
            <p className="text-xs text-red-500 dark:text-red-400 break-words text-center max-h-20 overflow-y-auto">
              {result.errorMessage || result.error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 成功状态，显示视频
  if (result.videoUrl) {
    return (
      <div
        data-result-id={result.id}
        className="group relative aspect-video min-w-[280px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-black cursor-pointer"
        onClick={onClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <video
          ref={videoRef}
          src={result.videoUrl}
          poster={result.coverUrl || undefined}
          className="w-full h-full object-contain"
          loop
          muted
          playsInline
          onEnded={handleVideoEnded}
        />

        {/* 播放/暂停按钮覆盖层 */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
            isHovering || !isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            onClick={handlePlayPause}
            className="w-14 h-14 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-all"
          >
            {isPlaying ? (
              <PauseIcon className="h-7 w-7 text-white" />
            ) : (
              <PlayIcon className="h-7 w-7 text-white ml-1" />
            )}
          </button>
        </div>

        {/* 视频信息 */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-200 ${
            isHovering ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center justify-between text-white text-xs">
            {result.duration && (
              <span>
                {Math.floor(result.duration / 60)}:
                {String(result.duration % 60).padStart(2, '0')}
              </span>
            )}
            <span className="text-white/70">
              {t('chat.video.clickToExpand')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 默认加载状态
  return (
    <div
      data-result-id={result.id}
      className="group relative aspect-video min-w-[280px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 cursor-pointer"
      onClick={onClick}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t('common.loading')}
        </span>
      </div>
    </div>
  );
};

export default VideoResultItem;
