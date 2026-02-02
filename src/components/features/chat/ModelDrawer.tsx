/**
 * @file ModelDrawer.tsx
 * @description Component that provides a dropdown interface for selecting and managing image generation models
 * @author fmw666@github
 * @date 2025-07-18
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { FC } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';

// --- Third-party Libraries ---
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  PlusIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';

// --- Internal Libraries ---
// --- Types ---
import { isModelAvailableForInput } from '@/config/models.types';
// --- Hooks ---
import { useModel } from '@/hooks/model';
// --- Services ---
import { type ImageModel } from '@/services/model/modelManager';
// --- Utils ---
import { getDefaultSelectedModels } from '@/utils/modelUtils';

// =================================================================================================
// Type Definitions
// =================================================================================================

interface SelectedModel {
  id: string;
  count: number;
  name: string;
  category: string;
}

interface ModelDrawerProps {
  selectedModels: SelectedModel[];
  onModelChange: (models: SelectedModel[]) => void;
  disabled?: boolean;
  hasUploadedImage?: boolean; // 是否已上传图片
  uploadedImageCount?: number; // 上传的图片数量
}

// =================================================================================================
// Constants
// =================================================================================================

const MIN_COUNT = 1;
const MAX_COUNT = 4;
const DEFAULT_CATEGORY = 'all';
const DRAWER_MAX_HEIGHT = '60vh';
const DATE_LOCALE = 'zh-CN';
const DATE_OPTIONS = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
} as const;

// =================================================================================================
// Utility Functions
// =================================================================================================

/**
 * Sorts models by publish date in descending order (newest first)
 * @param models - Array of image models to sort
 * @returns Sorted array of models
 */
const sortModelsByPublishDate = (models: ImageModel[]): ImageModel[] => {
  return [...models].sort((a, b) => {
    const dateA = new Date(a.publishDate || 0);
    const dateB = new Date(b.publishDate || 0);
    return dateB.getTime() - dateA.getTime();
  });
};

/**
 * Formats a date to a localized string
 * @param date - Date to format
 * @returns Formatted date string
 */
const formatDate = (date: string | number | Date): string => {
  return new Date(date).toLocaleDateString(DATE_LOCALE, DATE_OPTIONS);
};

// =================================================================================================
// Sub Components
// =================================================================================================

/**
 * 模型输入类型标签
 */
const InputTypeTag: FC<{
  supportT2V?: boolean;
  supportI2V?: boolean;
  small?: boolean;
}> = ({ supportT2V, supportI2V, small = false }) => {
  const { t } = useTranslation();

  if (supportT2V && supportI2V) {
    return (
      <span
        className={`inline-flex items-center gap-1 ${small ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'} rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 text-blue-700 dark:text-blue-300`}
      >
        <span>T2V</span>
        <span className="text-gray-400 dark:text-gray-500">+</span>
        <span>I2V</span>
      </span>
    );
  }

  if (supportT2V) {
    return (
      <span
        className={`inline-flex items-center ${small ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'} rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300`}
      >
        {t('model.t2vOnly', '仅文生视频')}
      </span>
    );
  }

  if (supportI2V) {
    return (
      <span
        className={`inline-flex items-center ${small ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'} rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300`}
      >
        {t('model.i2vOnly', '仅图生视频')}
      </span>
    );
  }

  return null;
};

/**
 * Tooltip 组件
 */
const Tooltip: FC<{
  content: string;
  children: React.ReactNode;
  show?: boolean;
}> = ({ content, children, show = true }) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!show) return <>{children}</>;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 dark:bg-gray-700 rounded shadow-lg whitespace-nowrap"
          >
            {content}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800 dark:border-t-gray-700" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =================================================================================================
// Component
// =================================================================================================

export const ModelDrawer: FC<ModelDrawerProps> = ({
  selectedModels,
  onModelChange,
  disabled = false,
  hasUploadedImage = false,
  uploadedImageCount = 0,
}) => {
  // --- State and Refs ---
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<string>(DEFAULT_CATEGORY);
  const [searchQuery, setSearchQuery] = useState('');

  const drawerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // --- Hooks ---
  const { t } = useTranslation();
  const { isLoading, isInitialized, getVisibleModels } = useModel();

  // --- Computed Values ---
  // Get only visible models (user preference filtered)
  const enabledModels = useMemo(() => {
    if (isLoading || !isInitialized) return [];
    return getVisibleModels();
  }, [isLoading, isInitialized, getVisibleModels]);

  // Get all categories from enabled models
  const categories = useMemo(() => {
    if (enabledModels.length === 0) return [DEFAULT_CATEGORY];
    const uniqueCategories = [
      ...new Set(enabledModels.map(model => model.category)),
    ];
    return [DEFAULT_CATEGORY, ...uniqueCategories];
  }, [enabledModels]);

  // 检查模型在当前输入模式下是否可用
  const getModelAvailability = useCallback(
    (model: ImageModel) => {
      return isModelAvailableForInput(
        model,
        hasUploadedImage,
        uploadedImageCount
      );
    },
    [hasUploadedImage, uploadedImageCount]
  );

  // 获取不可用原因的文本
  const getUnavailableReasonText = useCallback(
    (reason?: string, maxImages?: number) => {
      switch (reason) {
        case 'onlyT2V':
          return t('model.onlyT2VHint', '该模型仅支持文生视频，不支持图片输入');
        case 'onlyI2V':
          return t('model.onlyI2VHint', '该模型仅支持图生视频，请先上传图片');
        case 'tooManyImages':
          return t('model.tooManyImagesHint', {
            max: maxImages,
            current: uploadedImageCount,
            defaultValue: `该模型最多支持 ${maxImages} 张图片，当前已上传 ${uploadedImageCount} 张`,
          });
        default:
          return '';
      }
    },
    [t, uploadedImageCount]
  );

  // --- Logic and Event Handlers ---
  // Set default models only on initial mount and when no models are selected (e.g., from localStorage)
  useEffect(() => {
    if (isInitialMount.current && enabledModels.length > 0) {
      isInitialMount.current = false;

      // 如果已经有选择的模型（从 localStorage 加载的），验证这些模型是否仍然可用
      if (selectedModels.length > 0) {
        const validModels = selectedModels.filter(selected =>
          enabledModels.some(enabled => enabled.id === selected.id)
        );
        // 如果有无效的模型，更新为只包含有效模型的列表
        if (validModels.length !== selectedModels.length) {
          onModelChange(validModels);
        }
        // 如果至少有一个有效模型，不设置默认值
        if (validModels.length > 0) {
          return;
        }
      }

      // 没有已保存的有效模型，设置默认值
      const sortedModels = sortModelsByPublishDate(enabledModels);
      const defaultModels = getDefaultSelectedModels(sortedModels);
      onModelChange(defaultModels);
    }
  }, [enabledModels, selectedModels, onModelChange]);

  // Handle click outside to close drawer
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      drawerRef.current &&
      !drawerRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  // Filter models based on category and search query
  const filteredModels = useMemo(() => {
    return enabledModels.filter(model => {
      const matchesCategory =
        selectedCategory === DEFAULT_CATEGORY ||
        model.category === selectedCategory;
      const matchesSearch =
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [enabledModels, selectedCategory, searchQuery]);

  const handleModelSelect = useCallback(
    (modelId: string) => {
      const model = enabledModels.find(m => m.id === modelId);
      if (!model) return;

      // 检查模型是否可用
      const availability = getModelAvailability(model);
      if (!availability.available) return;

      const isSelected = selectedModels.some(m => m.id === modelId);
      if (isSelected) {
        onModelChange(selectedModels.filter(m => m.id !== modelId));
      } else {
        onModelChange([
          ...selectedModels,
          {
            id: modelId,
            count: 1,
            category: model?.category || '',
            name: model?.name || '',
          },
        ]);
      }
    },
    [selectedModels, onModelChange, enabledModels, getModelAvailability]
  );

  const handleCountChange = useCallback(
    (modelId: string, newCount: number) => {
      const validCount = Math.max(MIN_COUNT, Math.min(MAX_COUNT, newCount));
      onModelChange(
        selectedModels.map(m =>
          m.id === modelId ? { ...m, count: validCount } : m
        )
      );
    },
    [selectedModels, onModelChange]
  );

  const handleRemoveModel = useCallback(
    (modelId: string) => {
      onModelChange(selectedModels.filter(m => m.id !== modelId));
    },
    [selectedModels, onModelChange]
  );

  const handleToggleDrawer = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory(DEFAULT_CATEGORY);
  }, []);

  const handleCountButtonClick = useCallback(
    (e: React.MouseEvent, modelId: string, increment: number) => {
      e.stopPropagation();
      const currentModel = selectedModels.find(m => m.id === modelId);
      if (currentModel) {
        handleCountChange(modelId, currentModel.count + increment);
      }
    },
    [selectedModels, handleCountChange]
  );

  // --- Side Effects ---
  // No additional side effects needed

  // --- Render Logic ---
  return (
    <div
      className={`relative ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      ref={drawerRef}
    >
      {/* Selected model tags and add button */}
      <div className="flex flex-wrap items-center gap-2 max-h-18 overflow-y-auto">
        {selectedModels.length > 0 && (
          <>
            {selectedModels.map(({ id, count }) => {
              const model = enabledModels.find(m => m.id === id);
              const availability = model
                ? getModelAvailability(model)
                : { available: true };
              const isUnavailable = !availability.available;

              return (
                                <Tooltip
                                  key={id}
                                  content={getUnavailableReasonText(
                                    availability.reason,
                                    availability.maxImages
                                  )}
                                  show={isUnavailable}
                                >
                                  <div
                                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-all ${
                                      isUnavailable
                                        ? 'bg-gray-200/80 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-400 dark:border-gray-500 opacity-70'
                                        : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-300 dark:border-indigo-600'
                                    }`}
                                  >
                    <span className={isUnavailable ? 'line-through' : ''}>
                      {model?.name}
                    </span>
                    {model && (
                      <>
                        <InputTypeTag
                          supportT2V={model.supportT2V}
                          supportI2V={model.supportI2V}
                          small
                        />
                        {model.maxImages && model.maxImages > 1 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                            {t('model.multiImage', '多图')} ({model.maxImages})
                          </span>
                        )}
                        {model.supportLastFrame && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                            {t('model.lastFrame', '首尾帧')}
                          </span>
                        )}
                      </>
                    )}
                    {!isUnavailable && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCountChange(id, count - 1)}
                          className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-200 dark:bg-indigo-700 hover:bg-indigo-300 dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-200 font-bold transition-colors"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-200 min-w-[1rem] text-center">{count}</span>
                        <button
                          onClick={() => handleCountChange(id, count + 1)}
                          className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-200 dark:bg-indigo-700 hover:bg-indigo-300 dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-200 font-bold transition-colors"
                        >
                          +
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => handleRemoveModel(id)}
                      className={`ml-1 transition-colors ${
                        isUnavailable
                          ? 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                          : 'text-indigo-400 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-200'
                      }`}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </Tooltip>
              );
            })}
          </>
        )}

        {/* Add model button */}
        <button
          onClick={handleToggleDrawer}
          disabled={isLoading || !isInitialized}
          className={`flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 transition-colors ${
            isLoading || !isInitialized ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading || !isInitialized ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <PlusIcon className="h-4 w-4" />
          )}
          <span>
            {isLoading || !isInitialized ? t('common.loading') : t('model.add')}
          </span>
        </button>
      </div>

      {/* Model selection panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.99 }}
            transition={{
              type: 'spring',
              stiffness: 600,
              damping: 50,
              mass: 0.5,
              restDelta: 0.001,
            }}
            className="absolute bottom-full left-0 right-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg mb-2 flex flex-col z-50"
            style={{ maxHeight: DRAWER_MAX_HEIGHT }}
          >
            {/* Scrollable model list area */}
            <div className="overflow-y-auto p-4 flex-1">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-8 h-8 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('common.loading')}...
                  </p>
                </div>
              ) : filteredModels.length > 0 ? (
                <div className="space-y-2">
                  {filteredModels.map(model => {
                    const isSelected = selectedModels.some(
                      m => m.id === model.id
                    );
                    const selectedCount =
                      selectedModels.find(m => m.id === model.id)?.count || 1;
                    const availability = getModelAvailability(model);
                    const isUnavailable = !availability.available;

                    return (
                      <div key={model.id}>
                                        <div
                                          onClick={() => handleModelSelect(model.id)}
                                          className={`w-full p-3 rounded-lg text-left transition-all ${
                                            isUnavailable
                                              ? 'cursor-not-allowed opacity-50 bg-gray-100 dark:bg-gray-800/30 border-2 border-dashed border-gray-400 dark:border-gray-600'
                                              : isSelected
                                                ? 'bg-indigo-50 dark:bg-indigo-900/40 border-2 border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800 cursor-pointer shadow-sm'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer'
                                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* 选中状态指示器 */}
                                {isSelected && !isUnavailable && (
                                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500 dark:bg-indigo-500 text-white flex-shrink-0">
                                    <CheckIcon className="w-3 h-3 stroke-[3]" />
                                  </span>
                                )}
                                <h3
                                  className={`font-medium ${isUnavailable ? 'text-gray-400 dark:text-gray-500 line-through' : isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-gray-100'}`}
                                >
                                  {model.name}
                                </h3>
                                <InputTypeTag
                                  supportT2V={model.supportT2V}
                                  supportI2V={model.supportI2V}
                                />
                                {model.maxImages && model.maxImages > 1 && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                                    {t('model.multiImage', '多图')} (
                                    {model.maxImages})
                                  </span>
                                )}
                                {model.supportLastFrame && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                                    {t('model.lastFrame', '首尾帧')}
                                  </span>
                                )}
                              </div>
                              <p
                                className={`text-sm mt-1 ${isUnavailable ? 'text-gray-400 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}
                              >
                                {model.description}
                              </p>
                              {model.publishDate && (
                                <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                                  {t('model.publishDate')}:{' '}
                                  {formatDate(model.publishDate)}
                                </p>
                              )}
                              {/* 不可用提示 - 直接显示在对应模型下方 */}
                              {isUnavailable && (
                                <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 dark:text-amber-400">
                                  <svg
                                    className="w-3.5 h-3.5 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                  </svg>
                                  <span>
                                    {getUnavailableReasonText(
                                      availability.reason,
                                      availability.maxImages
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                            {isSelected && !isUnavailable && (
                              <div className="flex items-center gap-2 ml-2">
                                <button
                                  onClick={e =>
                                    handleCountButtonClick(e, model.id, -1)
                                  }
                                  className="w-7 h-7 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-800 hover:bg-indigo-200 dark:hover:bg-indigo-700 text-indigo-600 dark:text-indigo-300 font-bold transition-colors"
                                >
                                  -
                                </button>
                                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-300 min-w-[1.5rem] text-center">
                                  {selectedCount}
                                </span>
                                <button
                                  onClick={e =>
                                    handleCountButtonClick(e, model.id, 1)
                                  }
                                  className="w-7 h-7 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-800 hover:bg-indigo-200 dark:hover:bg-indigo-700 text-indigo-600 dark:text-indigo-300 font-bold transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600">
                    {searchQuery ? (
                      <svg
                        className="w-full h-full"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-full h-full"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {searchQuery
                      ? '未找到相关模型'
                      : enabledModels.length === 0
                        ? '暂无可用模型'
                        : '当前分类下暂无模型'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {searchQuery ? (
                      <>
                        没有找到与 &quot;
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          {searchQuery}
                        </span>
                        &quot; 相关的模型
                      </>
                    ) : enabledModels.length === 0 ? (
                      <>
                        请先在设置中配置并测试AI模型，
                        <br />
                        只有启用且测试通过的模型才会显示在这里
                      </>
                    ) : (
                      '当前分类下暂无可用模型'
                    )}
                  </p>
                  {searchQuery ? (
                    <button
                      onClick={handleClearSearch}
                      className="mt-4 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      清除搜索条件
                    </button>
                  ) : enabledModels.length === 0 ? (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        // TODO: 这里可以添加导航到设置页面的逻辑
                      }}
                      className="mt-4 px-4 py-2 text-sm text-white bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-800 dark:hover:bg-zinc-300 rounded-lg transition-colors"
                    >
                      前往设置
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {/* Fixed bottom area */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              {/* Category selection */}
              {categories.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => handleCategoryChange(category)}
                      className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap font-medium transition-all ${
                        selectedCategory === category
                          ? 'bg-indigo-500 text-white dark:bg-indigo-600 dark:text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {category === DEFAULT_CATEGORY
                        ? t('model.all')
                        : category}
                    </button>
                  ))}
                </div>
              )}

              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={`${t('model.search')}...`}
                  className="w-full pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 ease-in-out"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-600" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =================================================================================================
// Default Export
// =================================================================================================

export default ModelDrawer;
