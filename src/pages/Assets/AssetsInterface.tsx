/**
 * @file AssetsInterface.tsx
 * @description Asset management interface with video-focused grid layouts.
 * @author fmw666@github
 * @date 2025-01-31
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useState, useCallback, useMemo } from 'react';
import type { FC } from 'react';

// --- Third-party Libraries ---
import { FilmIcon } from '@heroicons/react/24/outline';

// --- Internal Libraries ---
// --- Components ---
import CardAssetsGrid from '@/components/features/assets/CardAssetsGrid';
import FlatAssetsGrid from '@/components/features/assets/FlatAssetsGrid';
import AssetsDisplayControls from '@/components/features/assets/AssetsDisplayControls';
import AssetsSkeleton from '@/components/features/assets/AssetsSkeleton';
import { ImagePreview } from '@/components/shared/common/ImagePreview';
// --- Hooks ---
import { useAssets } from '@/hooks/assets';
// --- Services ---
import type { Asset } from '@/services/assets';
// --- Stores ---
import type { DisplayAsset } from '@/store/assetsStore';

// =================================================================================================
// Component
// =================================================================================================

const AssetsInterface: FC = () => {
  // --- State and Refs ---
  const [selectedImage, setSelectedImage] = useState<{ asset: Asset; imageUrl: string; imageId: string } | null>(null);
  const [selectedFlatImage, setSelectedFlatImage] = useState<DisplayAsset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Hooks ---
  const {
    filteredAssets,
    filteredFlatAssets,
    selectedTags,
    isFlatMode,
    isLoading,
    hasMore,
    isLoadingMore,
    loadMoreAssets
  } = useAssets();

  // --- Search Filtering ---
  const searchFilteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return filteredAssets;
    const query = searchQuery.toLowerCase();
    return filteredAssets.filter(asset => 
      asset.content.toLowerCase().includes(query)
    );
  }, [filteredAssets, searchQuery]);

  const searchFilteredFlatAssets = useMemo(() => {
    if (!searchQuery.trim()) return filteredFlatAssets;
    const query = searchQuery.toLowerCase();
    return filteredFlatAssets.filter(asset => 
      asset.title.toLowerCase().includes(query) ||
      asset.content.toLowerCase().includes(query)
    );
  }, [filteredFlatAssets, searchQuery]);

  // --- Generate unique filter key ---
  const filterKey = useMemo(() => {
    const filterData = {
      tags: selectedTags.sort(),
      mode: isFlatMode ? 'flat' : 'card',
      search: searchQuery
    };
    return JSON.stringify(filterData);
  }, [selectedTags, isFlatMode, searchQuery]);

  // --- Logic and Event Handlers ---
  const handleImageClick = useCallback((asset: Asset, imageUrl: string, imageId: string) => {
    setSelectedImage({ asset, imageUrl, imageId });
  }, []);

  const handleFlatImageClick = useCallback((asset: DisplayAsset) => {
    setSelectedFlatImage(asset);
  }, []);

  const handleGoToConversation = useCallback((chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `/chat/${chatId}`;
    window.open(url, '_blank');
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // --- Render Logic ---
  if (isLoading) {
    return (
      <div className="flex flex-col h-full w-full bg-gray-900">
        <AssetsDisplayControls 
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <AssetsSkeleton count={12} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-900">
      {/* Display Controls Toolbar with Search */}
      <AssetsDisplayControls 
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {isFlatMode ? (
          // 网格模式 - 视频封面为主
          searchFilteredFlatAssets.length === 0 ? (
            <EmptyState searchQuery={searchQuery} />
          ) : (
            <FlatAssetsGrid
              assets={searchFilteredFlatAssets}
              filterKey={filterKey}
              isDetailMode={false}
              onAssetClick={handleFlatImageClick}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={loadMoreAssets}
            />
          )
        ) : (
          // 列表模式 - 卡片展示
          searchFilteredAssets.length === 0 ? (
            <EmptyState searchQuery={searchQuery} />
          ) : (
            <CardAssetsGrid
              assets={searchFilteredAssets}
              filterKey={filterKey}
              onImageClick={handleImageClick}
              onGoToConversation={handleGoToConversation}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={loadMoreAssets}
            />
          )
        )}
      </div>
      
      {/* Image Preview Modal - Asset Mode */}
      {selectedImage && (
        <ImagePreview
          message={{
            id: selectedImage.imageId,
            content: selectedImage.asset.content,
            createdAt: selectedImage.asset.created_at,
            models: selectedImage.asset.models,
            results: selectedImage.asset.results,
          }}
          isReference={false}
          onClose={() => setSelectedImage(null)}
          alt={selectedImage.asset.content}
        />
      )}

      {/* Image Preview Modal - Flat Mode */}
      {selectedFlatImage && (
        <ImagePreview
          message={{
            id: selectedFlatImage.id,
            content: selectedFlatImage.title,
            createdAt: selectedFlatImage.createdAt,
            models: [],
            results: {
              videos: {},
              status: {
                generating: 0,
                success: 0,
                failed: 0,
                total: 0,
              },
            },
          }}
          isReference={false}
          onClose={() => setSelectedFlatImage(null)}
          alt={selectedFlatImage.title}
        />
      )}
    </div>
  );
};

// =================================================================================================
// Empty State Component
// =================================================================================================

interface EmptyStateProps {
  searchQuery: string;
}

const EmptyState: FC<EmptyStateProps> = ({ searchQuery }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
      <div className="w-20 h-20 rounded-2xl bg-gray-800 flex items-center justify-center mb-6">
        <FilmIcon className="w-10 h-10 text-gray-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-300 mb-2">
        {searchQuery ? '未找到匹配的视频' : '暂无视频'}
      </h3>
      <p className="text-sm text-gray-500 max-w-sm">
        {searchQuery 
          ? `没有找到包含 "${searchQuery}" 的视频，请尝试其他关键词`
          : '开始一个新对话来生成视频，生成的视频将显示在这里'
        }
      </p>
    </div>
  );
};

// =================================================================================================
// Default Export
// =================================================================================================

export default AssetsInterface;
