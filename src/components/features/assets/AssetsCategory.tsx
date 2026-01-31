/**
 * @file AssetsCategory.tsx
 * @description Simplified asset filter panel with model tags only.
 * @author fmw666@github
 * @date 2025-01-31
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FC } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';

// --- Third-party Libraries ---
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

// --- Internal Libraries ---
// --- Hooks ---
import { useAssets } from '@/hooks/assets';

// =================================================================================================
// Component
// =================================================================================================

const AssetsCategory: FC = () => {
  // --- State and Refs ---
  const [searchQuery, setSearchQuery] = useState('');

  // --- Hooks ---
  const { t } = useTranslation();
  const {
    assets,
    selectedTags,
    setSelectedTags,
    generateTagsFromAssets,
    filterAssets,
  } = useAssets();

  // --- Effects ---
  useEffect(() => {
    filterAssets();
  }, [selectedTags, filterAssets]);

  // --- Event Handlers ---
  const handleTagClick = useCallback((tagId: string) => {
    setSelectedTags((prev: string[]) => {
      return prev.includes(tagId) 
        ? prev.filter((id: string) => id !== tagId) 
        : [...prev, tagId];
    });
  }, [setSelectedTags]);

  const handleClearAll = useCallback(() => {
    setSelectedTags([]);
    setSearchQuery('');
  }, [setSelectedTags]);

  // --- Computed Values ---
  const dynamicTags = useMemo(() => {
    return generateTagsFromAssets(assets);
  }, [assets, generateTagsFromAssets]);

  const filteredTags = useMemo(() => 
    dynamicTags.filter(tag => tag.name.toLowerCase().includes(searchQuery.toLowerCase())), 
    [dynamicTags, searchQuery]
  );

  const totalVideos = useMemo(() => {
    return dynamicTags.reduce((sum, tag) => sum + tag.count, 0);
  }, [dynamicTags]);

  // --- Render Logic ---
  return (
    <div className="flex flex-col h-full bg-gray-900/50">
      {/* Header */}
      <div className="px-4 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <FunnelIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              {t('assets.filters', '模型筛选')}
            </h2>
            <p className="text-xs text-gray-400">
              {totalVideos} {t('assets.totalVideos', '个视频')}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <input
            type="text"
            placeholder={t('assets.searchModels', '搜索模型...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 text-sm bg-gray-800/80 border border-gray-700/50 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Selected Tags Summary */}
      <AnimatePresence>
        {selectedTags.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-3 overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-lg">
              <span className="text-xs text-violet-300">
                {selectedTags.length} {t('assets.modelsSelected', '个模型已选')}
              </span>
              <button
                onClick={handleClearAll}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                {t('assets.clearAll', '清除')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tags List */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="space-y-1.5">
          {filteredTags.map((tag, index) => {
            const isSelected = selectedTags.includes(tag.id);
            return (
              <motion.button
                key={tag.id}
                onClick={() => handleTagClick(tag.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isSelected
                    ? 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30'
                    : 'bg-gray-800/40 border border-transparent hover:bg-gray-800/80 hover:border-gray-700/50'
                }`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                <div className="flex items-center gap-3">
                  {/* Indicator */}
                  <div className={`w-2 h-2 rounded-full transition-all ${
                    isSelected 
                      ? 'bg-violet-400 shadow-lg shadow-violet-400/50' 
                      : 'bg-gray-600 group-hover:bg-gray-500'
                  }`} />
                  {/* Model Name */}
                  <span className={`text-sm font-medium transition-colors ${
                    isSelected ? 'text-violet-200' : 'text-gray-300 group-hover:text-white'
                  }`}>
                    {tag.name}
                  </span>
                </div>
                {/* Count Badge */}
                <span className={`text-xs px-2 py-0.5 rounded-full transition-all ${
                  isSelected
                    ? 'bg-violet-500/30 text-violet-200'
                    : 'bg-gray-700/50 text-gray-400 group-hover:bg-gray-700 group-hover:text-gray-300'
                }`}>
                  {tag.count}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredTags.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
              <FunnelIcon className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500">
              {searchQuery 
                ? t('assets.noModelsFound', '未找到匹配的模型')
                : t('assets.noModels', '暂无可用模型')
              }
            </p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-3 border-t border-gray-800">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{dynamicTags.length} {t('assets.models', '个模型')}</span>
          <span>{totalVideos} {t('assets.videos', '个视频')}</span>
        </div>
      </div>
    </div>
  );
};

// =================================================================================================
// Default Export
// =================================================================================================

export default AssetsCategory;
