/**
 * @file FlatAssetsGrid.tsx
 * @description Video-focused grid component with masonry layout.
 * @author fmw666@github
 * @date 2025-01-31
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useCallback, useState } from 'react';
import type { FC } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';

// --- Third-party Libraries ---
import { PlayIcon, ClockIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

// --- Internal Libraries ---
// --- Components ---
import ImageLoader from '@/components/shared/common/ImageLoader';
// --- Hooks ---
import { useInfiniteScroll } from '@/hooks/assets';
// --- Store ---
import { DisplayAsset } from '@/store/assetsStore';

// =================================================================================================
// Type Definitions
// =================================================================================================

interface FlatAssetsGridProps {
  assets: DisplayAsset[];
  filterKey: string;
  isDetailMode?: boolean;
  onAssetClick: (asset: DisplayAsset) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

// =================================================================================================
// Component
// =================================================================================================

const FlatAssetsGrid: FC<FlatAssetsGridProps> = ({
  assets,
  filterKey,
  onAssetClick,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore = () => {}
}) => {
  // --- State ---
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // --- Hooks ---
  const { t } = useTranslation();
  const sentinelRef = useInfiniteScroll({
    loadMore: onLoadMore,
    hasMore,
    isLoading: isLoadingMore,
    threshold: 0.1
  });

  // --- Event Handlers ---
  const handleAssetClick = useCallback((asset: DisplayAsset) => {
    onAssetClick(asset);
  }, [onAssetClick]);

  const handleGoToChat = useCallback((chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/chat/${chatId}`, '_blank');
  }, []);

  // --- Render Logic ---
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
        <AnimatePresence mode="popLayout">
          {assets.map((asset, index) => (
            <motion.div
              key={`${filterKey}-${asset.id}`}
              className="relative group"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
              layout
              onMouseEnter={() => setHoveredId(asset.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div
                className="relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer bg-gray-800 border border-gray-700/50 hover:border-violet-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10"
                onClick={() => handleAssetClick(asset)}
              >
                {/* Video Thumbnail */}
                {asset.url ? (
                  <ImageLoader
                    src={asset.url}
                    alt={asset.title}
                    className="group-hover:scale-105 transition-transform duration-500"
                    aspectRatio="auto"
                    showLoadingSpinner={true}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <PlayIcon className="w-12 h-12 text-gray-700" />
                  </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                {/* Play Button */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hoveredId === asset.id ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <PlayIcon className="w-7 h-7 text-white ml-1" />
                  </div>
                </motion.div>

                {/* Model Tag */}
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-1 text-[10px] font-medium bg-black/60 backdrop-blur-sm rounded-lg text-white/90 border border-white/10">
                    {asset.tags[0] || 'Video'}
                  </span>
                </div>

                {/* Go to Chat Button */}
                <motion.button
                  className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-white/80 hover:text-white hover:bg-black/80 border border-white/10 transition-all"
                  onClick={(e) => handleGoToChat(asset.originalAsset.chat_id, e)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hoveredId === asset.id ? 1 : 0 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  title={t('assets.goToChat', '跳转到对话')}
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </motion.button>

                {/* Bottom Info */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ 
                      y: hoveredId === asset.id ? 0 : 5,
                      opacity: hoveredId === asset.id ? 1 : 0.8
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Title */}
                    <h3 className="text-sm font-medium text-white line-clamp-2 mb-1.5 leading-snug">
                      {asset.title}
                    </h3>
                    {/* Time */}
                    <div className="flex items-center gap-1.5 text-[11px] text-white/60">
                      <ClockIcon className="w-3 h-3" />
                      <span>
                        {new Date(asset.createdAt).toLocaleDateString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
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

export default FlatAssetsGrid;
