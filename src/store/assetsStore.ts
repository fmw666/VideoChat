/**
 * @file assetsStore.ts
 * @description Assets store for managing asset records and filtering.
 * @author fmw666@github
 * @date 2025-07-18
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { create } from 'zustand';

// --- Internal Libraries ---
// --- Services ---
import { assetsService, type Asset } from '@/services/assets';

// =================================================================================================
// Type Definitions
// =================================================================================================

export interface DisplayAsset {
  id: string;
  url: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  originalAsset: Asset;
}

export interface AssetsState {
  // --- State ---
  assets: Asset[];
  filteredAssets: Asset[];
  filteredFlatAssets: DisplayAsset[];
  selectedCategory: string;
  selectedTags: string[];
  isFlatMode: boolean;
  isDetailMode: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // --- State Setters ---
  setAssets: (assets: Asset[] | ((prev: Asset[]) => Asset[])) => void;
  setFilteredAssets: (assets: Asset[]) => void;
  setFilteredFlatAssets: (assets: DisplayAsset[]) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedTags: (tags: string[] | ((prev: string[]) => string[])) => void;
  setIsFlatMode: (isFlatMode: boolean) => void;
  setIsDetailMode: (isDetailMode: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsInitialized: (isInitialized: boolean) => void;

  // --- Operations ---
  initialize: () => Promise<void>;
  refreshAssets: () => Promise<void>;
  filterAssets: () => void;
  convertAssetToDisplayAsset: (asset: Asset) => DisplayAsset[];
  generateTagsFromAssets: (assets: Asset[]) => Array<{ id: string; name: string; count: number }>;
  calculateCategoryCounts: (assets: Asset[]) => Record<string, number>;
  updateAsset: (chatId: string, messageId: string, updatedAsset: Asset) => void;
  addOrUpdateAsset: (asset: Asset) => void;
}

// =================================================================================================
// Constants
// =================================================================================================

const DEFAULT_ASSETS: Asset[] = [];
const DEFAULT_FILTERED_ASSETS: Asset[] = [];
const DEFAULT_FILTERED_FLAT_ASSETS: DisplayAsset[] = [];
const DEFAULT_IS_FLAT_MODE = false;
const DEFAULT_IS_DETAIL_MODE = false;
const DEFAULT_IS_INITIALIZED = false;
const DEFAULT_IS_LOADING = false;
const DEFAULT_SELECTED_CATEGORY = 'all';
const DEFAULT_SELECTED_TAGS: string[] = [];
const DEFAULT_TITLE_LENGTH = 20;

// =================================================================================================
// Store Configuration
// =================================================================================================

/**
 * Assets store for managing asset records and filtering
 * Provides asset CRUD operations, filtering, and state persistence
 */
export const useAssetsStore = create<AssetsState>((set, get) => ({
  // --- Initial State ---
  assets: DEFAULT_ASSETS,
  filteredAssets: DEFAULT_FILTERED_ASSETS,
  filteredFlatAssets: DEFAULT_FILTERED_FLAT_ASSETS,
  selectedCategory: DEFAULT_SELECTED_CATEGORY,
  selectedTags: DEFAULT_SELECTED_TAGS,
  isDetailMode: DEFAULT_IS_DETAIL_MODE,
  isFlatMode: DEFAULT_IS_FLAT_MODE,
  isInitialized: DEFAULT_IS_INITIALIZED,
  isLoading: DEFAULT_IS_LOADING,

  // --- State Setters ---
  setAssets: (assets) => {
    const newAssets = typeof assets === 'function' ? assets(get().assets) : assets;
    set({ assets: newAssets });
  },
  setFilteredAssets: (filteredAssets) => set({ filteredAssets }),
  setFilteredFlatAssets: (filteredFlatAssets) => set({ filteredFlatAssets }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSelectedTags: (selectedTags) => {
    const newTags = typeof selectedTags === 'function' ? selectedTags(get().selectedTags) : selectedTags;
    set({ selectedTags: newTags });
  },
  setIsDetailMode: (isDetailMode) => set({ isDetailMode }),
  setIsFlatMode: (isFlatMode) => set({ isFlatMode }),
  setIsInitialized: (isInitialized) => set({ isInitialized }),
  setIsLoading: (isLoading) => set({ isLoading }),

  // --- Operations ---
  /**
   * Update a specific asset in the store
   * @param chatId - Chat ID of the asset to update
   * @param messageId - Message ID of the asset to update
   * @param updatedAsset - Updated asset data
   */
  updateAsset: (chatId: string, messageId: string, updatedAsset: Asset) => {
    const { assets, setAssets, filterAssets } = get();
    
    // Find and update the specific asset
    const updatedAssets = assets.map(asset => 
      asset.chat_id === chatId && asset.message_id === messageId 
        ? updatedAsset 
        : asset
    );
    
    // Update assets in store
    setAssets(updatedAssets);
    
    // Re-apply filtering to update filtered results
    setTimeout(() => filterAssets(), 0);
  },

  /**
   * Add or update an asset in the store
   * @param asset - Asset to add or update
   */
  addOrUpdateAsset: (asset: Asset) => {
    const { assets, setAssets, filterAssets } = get();
    
    // Check if asset already exists
    const existingIndex = assets.findIndex(
      existing => existing.chat_id === asset.chat_id && existing.message_id === asset.message_id
    );
    
    let updatedAssets: Asset[];
    
    if (existingIndex >= 0) {
      // Update existing asset
      updatedAssets = assets.map((existing, index) => 
        index === existingIndex ? asset : existing
      );
    } else {
      // Add new asset at the beginning
      updatedAssets = [asset, ...assets];
    }
    
    // Update assets in store
    setAssets(updatedAssets);
    
    // Re-apply filtering to update filtered results
    setTimeout(() => filterAssets(), 0);
  },

  // --- Asset Operations ---
  /**
   * Initialize assets store and load user's assets
   */
  initialize: async () => {
    const { isInitialized } = get();
    
    if (isInitialized || get().isLoading) {
      return;
    }

    try {
      set(state => ({
        ...state,
        isLoading: true
      }));

      const result = await assetsService.getAssetsList(1, 9999);
      const assets = result.data;

      set(state => ({
        ...state,
        assets,
        isLoading: false,
        isInitialized: true
      }));

      // Apply initial filtering
      get().filterAssets();
    } catch (error) {
      console.error('[AssetsStore] Error initializing assets:', error);
      set(state => ({
        ...state,
        assets: [],
        isLoading: false,
        isInitialized: true
      }));
    }
  },

  /**
   * Refresh assets data from database
   */
  refreshAssets: async () => {
    try {
      set(state => ({
        ...state,
        isLoading: true
      }));

      const result = await assetsService.getAssetsList(1, 1000);
      const assets = result.data;

      set(state => ({
        ...state,
        assets,
        isLoading: false
      }));

      // Apply current filtering
      get().filterAssets();
    } catch (error) {
      console.error('[AssetsStore] Error refreshing assets:', error);
      set(state => ({
        ...state,
        isLoading: false
      }));
    }
  },

  /**
   * Convert Asset to DisplayAsset array (only completed videos)
   */
  convertAssetToDisplayAsset: (asset: Asset): DisplayAsset[] => {
    const displayAssets: DisplayAsset[] = [];
    
    if (asset.results?.videos) {
      Object.entries(asset.results.videos).forEach(([modelName, videos]) => {
        videos.forEach((video: { videoUrl?: string | null; coverUrl?: string | null }, index: number) => {
          // 只显示成功的视频（有封面或视频URL）
          if (video.videoUrl || video.coverUrl) {
            displayAssets.push({
              id: `${asset.id}-${modelName}-${index}`,
              url: video.coverUrl || video.videoUrl || '', // 使用封面或视频URL
              title: asset.content.length > DEFAULT_TITLE_LENGTH ? asset.content.slice(0, DEFAULT_TITLE_LENGTH) + '...' : asset.content,
              content: asset.content,
              tags: [modelName], // 使用模型名称作为标签
              createdAt: asset.created_at,
              originalAsset: asset
            });
          }
        });
      });
    }
    
    return displayAssets;
  },

  /**
   * Generate tags from assets (model names with success videos)
   */
  generateTagsFromAssets: (assets: Asset[]) => {
    const modelCounts: Record<string, number> = {};
    
    assets.forEach(asset => {
      if (asset.results?.videos) {
        Object.entries(asset.results.videos).forEach(([modelName, videos]) => {
          // 统计有成功的视频对应的模型
          const successCount = videos.filter((vid: { videoUrl?: string | null }) => vid.videoUrl).length;
          if (successCount > 0) {
            modelCounts[modelName] = (modelCounts[modelName] || 0) + successCount;
          }
        });
      }
    });

    return Object.entries(modelCounts)
      .map(([modelName, count]) => ({
        id: modelName,
        name: modelName,
        count
      }))
      .sort((a, b) => b.count - a.count);
  },

  /**
   * Calculate category counts from assets
   */
  calculateCategoryCounts: (assets: Asset[]) => {
    const counts = {
      all: 0,
      text2img: 0,
      img2img: 0,
      favorites: 0
    };
    assets.forEach(asset => {
      if (asset.results?.videos) {
        let img2imgCount = 0;
        let text2imgCount = 0;
        let favoritesCount = 0;

        Object.values(asset.results.videos).forEach((videos: Array<{ videoUrl?: string | null; isFavorite?: boolean }>) => {
          videos.forEach((vid) => {
            if (vid.videoUrl) {
              // Only count if video generation was successful
              if (asset.user_image) {
                img2imgCount++;
              } else {
                text2imgCount++;
              }

              if (vid.isFavorite === true) {
                favoritesCount++;
              }
            }
          });
        });

        counts.img2img += img2imgCount;
        counts.text2img += text2imgCount;
        counts.favorites += favoritesCount;
      }
    });

    counts.all = counts.text2img + counts.img2img;

    return counts;
  },

  /**
   * Filter assets based on current category and tags
   */
  filterAssets: () => {
    const { assets, selectedCategory, selectedTags, convertAssetToDisplayAsset } = get();

    // 先按 asset 为单位过滤
    let filteredAssets = assets;

    // 根据分类过滤 assets
    if (selectedCategory !== 'all') {
      filteredAssets = filteredAssets.filter(asset => {
        if (selectedCategory === 'text2img') {
          return !asset.user_image;
        } else if (selectedCategory === 'img2img') {
          return asset.user_image;
        } else if (selectedCategory === 'favorites') {
          // 检查 asset 是否包含收藏的视频
          if (asset.results?.videos) {
            return Object.values(asset.results.videos).some((videos: Array<{ isFavorite?: boolean }>) => 
              videos.some(vid => vid.isFavorite === true)
            );
          }
          return false;
        }
        return true;
      });

      // 额外处理收藏夹：只保留 isFavorite 的视频
      if (selectedCategory === 'favorites') {
        filteredAssets = filteredAssets.map(asset => {
          if (!asset.results?.videos) return asset;
          const newVideos = Object.fromEntries(
            Object.entries(asset.results.videos).map(([model, videos]) => [
              model,
              videos.filter(vid => vid.isFavorite === true)
            ])
          ) as typeof asset.results.videos;
          return {
            ...asset,
            results: {
              ...asset.results,
              videos: newVideos
            }
          };
        });
      }
    }

    // 根据标签过滤 assets（如果 asset 包含选中的模型，就保留）
    if (selectedTags.length > 0) {
      filteredAssets = filteredAssets.filter(asset => {
        if (asset.results?.videos) {
          return selectedTags.some(tag => asset.results.videos[tag]);
        }
        return false;
      });

      // 额外处理标签过滤：只保留选中标签对应的视频
      filteredAssets = filteredAssets.map(asset => {
        if (!asset.results?.videos) return asset;
        const newVideos = Object.fromEntries(
          Object.entries(asset.results.videos).filter(([modelName]) => 
            selectedTags.includes(modelName)
          )
        );
        return {
          ...asset,
          results: {
            ...asset.results,
            videos: newVideos
          }
        };
      });
    }

    // 然后转换为扁平化的图片列表
    const filteredFlatAssets = filteredAssets.flatMap(convertAssetToDisplayAsset);

    set({ 
      filteredAssets: filteredAssets,
      filteredFlatAssets: filteredFlatAssets 
    });
  },
}));
