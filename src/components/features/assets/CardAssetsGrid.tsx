/**
 * @file CardAssetsGrid.tsx
 * @description Card-based assets list with video previews.
 * @author fmw666@github
 * @date 2025-01-31
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import type { FC } from 'react';
import { useCallback, useState } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';

// --- Third-party Libraries ---
import { 
  ArrowTopRightOnSquareIcon, 
  ClockIcon,
  PlayIcon,
  FilmIcon 
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

// --- Internal Libraries ---
// --- Components ---
import ImageLoader from '@/components/shared/common/ImageLoader';
// --- Hooks ---
import { useInfiniteScroll } from '@/hooks/assets';
// --- Services ---
import type { Asset } from '@/services/assets';

// =================================================================================================
// Type Definitions
// =================================================================================================

interface CardAssetsGridProps {
  assets: Asset[];
  filterKey: string;
  onImageClick: (asset: Asset, imageUrl: string, imageId: string) => void;
  onGoToConversation: (chatId: string, e: React.MouseEvent) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

// =================================================================================================
// Component
// =================================================================================================

const CardAssetsGrid: FC<CardAssetsGridProps> = ({
  assets,
  filterKey,
  onImageClick,
  onGoToConversation,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore = () => {}
}) => {
  // --- State ---
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);

  // --- Hooks ---
  const { t } = useTranslation();
  const sentinelRef = useInfiniteScroll({
    loadMore: onLoadMore,
    hasMore,
    isLoading: isLoadingMore,
    threshold: 0.1
  });

  // --- Event Handlers ---
  const handleImageClick = useCallback((asset: Asset, imageUrl: string, imageId: string) => {
    onImageClick(asset, imageUrl, imageId);
  }, [onImageClick]);

  const handleGoToConversation = useCallback((chatId: string, e: React.MouseEvent) => {
    onGoToConversation(chatId, e);
  }, [onGoToConversation]);

  // --- Render Logic ---
  return (
    <>
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {assets.map((asset, index) => {
            // 获取该 asset 中所有成功的视频
            const successVideos: Array<{ url: string; id: string; modelName: string }> = [];
            if (asset.results?.videos) {
              Object.entries(asset.results.videos).forEach(([modelName, videos]) => {
                (videos as Array<{ coverUrl?: string | null; videoUrl?: string | null; id: string }>).forEach((video) => {
                  if (video.coverUrl || video.videoUrl) {
                    successVideos.push({
                      url: video.coverUrl || video.videoUrl || '',
                      id: video.id,
                      modelName
                    });
                  }
                });
              });
            }

            return (
              <motion.div
                key={`${filterKey}-${asset.id}`}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                layout
              >
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden hover:border-violet-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/5">
                  {/* Card Header */}
                  <div className="px-5 py-4 border-b border-gray-700/50">
                    {/* Prompt Text */}
                    <h3 className="text-base font-medium text-gray-200 mb-3 leading-relaxed line-clamp-2">
                      {asset.content}
                    </h3>
                    
                    {/* Meta Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Time */}
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <ClockIcon className="w-4 h-4" />
                          <span>
                            {new Date(asset.created_at).toLocaleDateString('zh-CN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {/* Video Count */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-500/10 rounded-lg">
                          <FilmIcon className="w-4 h-4 text-violet-400" />
                          <span className="text-sm font-medium text-violet-300">
                            {successVideos.length}
                          </span>
                        </div>
                      </div>
                      
                      {/* Go to Chat */}
                      <motion.button
                        onClick={(e) => handleGoToConversation(asset.chat_id, e)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-lg transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('assets.goToConversation', '查看对话')}</span>
                      </motion.button>
                    </div>
                  </div>

                  {/* Videos Grid */}
                  <div className="p-4">
                    {successVideos.length === 0 ? (
                      <div className="flex items-center justify-center h-24 text-gray-600">
                        <div className="text-center">
                          <FilmIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">{t('assets.noVideos', '暂无视频')}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                        {successVideos.map((video) => (
                          <motion.div
                            key={`${filterKey}-${video.id}`}
                            className="flex-shrink-0 relative aspect-[9/16] w-28 sm:w-32 overflow-hidden rounded-xl cursor-pointer group bg-gray-900 border border-gray-700/50 hover:border-violet-500/50 transition-all"
                            onClick={() => handleImageClick(asset, video.url, video.id)}
                            onMouseEnter={() => setHoveredVideoId(video.id)}
                            onMouseLeave={() => setHoveredVideoId(null)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <ImageLoader
                              src={video.url}
                              alt={`${asset.content} - ${video.modelName}`}
                              className="group-hover:scale-105 transition-transform duration-300"
                              aspectRatio="auto"
                              showLoadingSpinner={true}
                            />
                            
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            
                            {/* Play Button */}
                            <motion.div
                              className="absolute inset-0 flex items-center justify-center"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: hoveredVideoId === video.id ? 1 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                <PlayIcon className="w-5 h-5 text-white ml-0.5" />
                              </div>
                            </motion.div>
                            
                            {/* Model Badge */}
                            <div className="absolute bottom-2 left-2 right-2">
                              <span className="block w-full px-2 py-1 text-[10px] font-medium bg-black/60 backdrop-blur-sm rounded-md text-white/90 text-center truncate">
                                {video.modelName}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Infinite Scroll Sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="w-full py-8 flex justify-center">
          {isLoadingMore && (
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-800/50 rounded-xl">
              <svg className="animate-spin h-5 w-5 text-violet-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm text-gray-400">{t('assets.loadingMore', '加载更多...')}</span>
            </div>
          )}
        </div>
      )}

      {/* End of List */}
      {!hasMore && assets.length > 0 && (
        <div className="w-full py-6 flex justify-center">
          <span className="text-sm text-gray-600">{t('assets.noMore', '已经到底啦')}</span>
        </div>
      )}
    </>
  );
};

// =================================================================================================
// Default Export
// =================================================================================================

export default CardAssetsGrid;
