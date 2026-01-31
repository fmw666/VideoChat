/**
 * @file AssetsDisplayControls.tsx
 * @description Toolbar with search and display controls for assets view
 * @author fmw666@github
 * @date 2025-01-31
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useState, useCallback } from 'react';
import type { FC } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';

// --- Third-party Libraries ---
import { 
  MagnifyingGlassIcon, 
  Squares2X2Icon,
  ListBulletIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

// --- Internal Libraries ---
// --- Hooks ---
import { useAssets } from '@/hooks/assets';
// --- Store ---
import { useAssetsStore } from '@/store/assetsStore';

// =================================================================================================
// Type Definitions
// =================================================================================================

interface AssetsDisplayControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// =================================================================================================
// Component
// =================================================================================================

const AssetsDisplayControls: FC<AssetsDisplayControlsProps> = ({
  searchQuery,
  onSearchChange
}) => {
  // --- State ---
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // --- Hooks ---
  const { t } = useTranslation();
  const {
    isFlatMode,
    setIsFlatMode,
    filteredFlatAssets,
  } = useAssets();

  const totalCount = useAssetsStore(state => state.totalCount);

  // --- Event Handlers ---
  const handleClearSearch = useCallback(() => {
    onSearchChange('');
  }, [onSearchChange]);

  // --- Render Logic ---
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800/50">
      {/* Left: Search Bar */}
      <div className="flex-1 max-w-md">
        <div className={`relative flex items-center transition-all duration-200 ${
          isSearchFocused ? 'ring-2 ring-violet-500/50' : ''
        } rounded-xl`}>
          <MagnifyingGlassIcon className={`absolute left-4 w-5 h-5 transition-colors ${
            isSearchFocused ? 'text-violet-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder={t('assets.searchPlaceholder', '搜索提示词、视频...')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full pl-12 pr-10 py-2.5 text-sm bg-gray-800/80 border border-gray-700/50 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-all"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Center: Stats */}
      <div className="hidden sm:flex items-center gap-2 text-sm text-gray-400">
        <span className="px-3 py-1.5 bg-gray-800/50 rounded-lg">
          {filteredFlatAssets.length} / {totalCount} {t('assets.results', '个结果')}
        </span>
      </div>

      {/* Right: View Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-gray-800/80 rounded-xl p-1 border border-gray-700/50">
          <motion.button
            onClick={() => setIsFlatMode(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              !isFlatMode
                ? 'bg-violet-500/20 text-violet-300 shadow-sm'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
            }`}
            whileTap={{ scale: 0.98 }}
          >
            <ListBulletIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t('assets.listView', '列表')}</span>
          </motion.button>
          <motion.button
            onClick={() => setIsFlatMode(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isFlatMode
                ? 'bg-violet-500/20 text-violet-300 shadow-sm'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
            }`}
            whileTap={{ scale: 0.98 }}
          >
            <Squares2X2Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t('assets.gridView', '网格')}</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

// =================================================================================================
// Default Export
// =================================================================================================

export default AssetsDisplayControls;
