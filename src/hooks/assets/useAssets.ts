/**
 * @file useAssets.ts
 * @description Hook for managing assets state and operations.
 * @author fmw666@github
 * @date 2025-07-18
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useEffect } from 'react';

// --- Internal Libraries ---
// --- Hooks ---
import { useAuth } from '@/hooks/auth';
// --- Stores ---
import { useAssetsStore } from '@/store/assetsStore';

// =================================================================================================
// Hook Definition
// =================================================================================================

export const useAssets = () => {
  const { user } = useAuth();
  const {
    assets,
    filteredAssets,
    filteredFlatAssets,
    selectedCategory,
    selectedTags,
    isFlatMode,
    isDetailMode,
    isLoading,
    isInitialized,
    currentPage,
    hasMore,
    isLoadingMore,
    totalCount,
    setAssets,
    setFilteredAssets,
    setFilteredFlatAssets,
    setSelectedCategory,
    setSelectedTags,
    setIsFlatMode,
    setIsDetailMode,
    setIsInitialized,
    initialize,
    refreshAssets,
    loadMoreAssets,
    resetPagination,
    filterAssets,
    convertAssetToDisplayAsset,
    generateTagsFromAssets,
    calculateCategoryCounts
  } = useAssetsStore();

  // --- Side Effects ---
  useEffect(() => {
    if (user && !isInitialized) {
      initialize();
    } else if (!user) {
      setAssets([]);
      setFilteredAssets([]);
      setFilteredFlatAssets([]);
      setSelectedCategory('all');
      setSelectedTags([]);
      setIsFlatMode(false);
      setIsDetailMode(false);
      setIsInitialized(false);
    }
  }, [user, isInitialized, initialize, setAssets, setFilteredAssets, setFilteredFlatAssets, setSelectedCategory, setSelectedTags, setIsFlatMode, setIsDetailMode, setIsInitialized]);

  // --- Return Values ---
  return {
    // State
    assets,
    filteredAssets,
    filteredFlatAssets,
    selectedCategory,
    selectedTags,
    isFlatMode,
    isDetailMode,
    isLoading,
    isInitialized,
    currentPage,
    hasMore,
    isLoadingMore,
    totalCount,

    // Setters - 总是返回函数，即使没有用户登录
    setAssets,
    setFilteredAssets,
    setFilteredFlatAssets,
    setSelectedCategory,
    setSelectedTags,
    setIsFlatMode,
    setIsDetailMode,

    // Operations (only available when user is logged in)
    initialize: user ? initialize : async () => {},
    refreshAssets: user ? refreshAssets : async () => {},
    loadMoreAssets: user ? loadMoreAssets : async () => {},
    resetPagination: user ? resetPagination : () => {},
    filterAssets: user ? filterAssets : () => {},

    // Utilities
    convertAssetToDisplayAsset,
    generateTagsFromAssets,
    calculateCategoryCounts
  };
};
