/**
 * @file ChatInput.tsx
 * @description Chat input component with textarea, send button, image upload, and model settings
 * @author fmw666@github
 * @date 2025-07-18
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import {
  FormEvent,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import type { FC } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';

// --- Third-party Libraries ---
import {
  PaperAirplaneIcon,
  SparklesIcon,
  PhotoIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/solid';
import { AnimatePresence, motion } from 'framer-motion';

// --- Internal Libraries ---
// --- Types ---
import type { UploadedImage } from '@/config/models.types';
import { canUseLastFrame } from '@/config/models.types';
import { useModel } from '@/hooks/model';
import type { SelectedModel, DesignImage } from '@/types/chat';

// --- Relative Imports ---
import { ModelDrawer } from './ModelDrawer';

// =================================================================================================
// Type Definitions
// =================================================================================================

// 扩展的视频配置类型（与 ChatInterface 保持一致）
interface ExtendedVideoConfigProps {
  resolution?: '720P' | '1080P' | '2K' | '4K';
  aspectRatio?: '16:9' | '9:16' | '1:1';
  enhanceSwitch?: 'Enabled' | 'Disabled';
  negativePrompt?: string;
  audioGeneration?: 'Enabled' | 'Disabled';
  personGeneration?: 'AllowAdult' | 'Disabled';
  sceneType?: string;
  [key: string]: unknown;
}

interface ChatInputProps {
  input: string;
  selectedModels: SelectedModel[];
  designImage: DesignImage | null;
  isGenerating: boolean;
  isSending: boolean;
  user: any;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onInputKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSendMessage: (e: FormEvent) => void;
  onModelChange: (models: SelectedModel[]) => void;
  onDesignImageClose: (e: React.MouseEvent) => void;
  isDesignImageMenuVisible: boolean;
  isMobile: boolean;
  // 图片上传相关
  uploadedImages?: UploadedImage[];
  onUploadedImagesChange?: (images: UploadedImage[]) => void;
  // 尾帧图片（首尾帧模式）
  lastFrameImage?: UploadedImage | null;
  onLastFrameImageChange?: (image: UploadedImage | null) => void;
  // 视频配置相关
  videoConfig?: ExtendedVideoConfigProps;
  onVideoConfigChange?: (config: ExtendedVideoConfigProps) => void;
}

// =================================================================================================
// Sub Components
// =================================================================================================

/**
 * 单图上传槽组件 - 用于首帧/尾帧
 */
const ImageSlot: FC<{
  image: UploadedImage | null;
  onImageChange: (image: UploadedImage | null) => void;
  label?: string;
  disabled?: boolean;
  borderColor?: string;
  disabledTooltip?: string;
}> = ({
  image,
  onImageChange,
  label,
  disabled = false,
  borderColor = 'border-gray-300 dark:border-gray-600',
  disabledTooltip,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!validTypes.includes(file.type) || file.size > maxSize) return;

      // 清除旧的 blob URL
      if (image?.url.startsWith('blob:')) {
        URL.revokeObjectURL(image.url);
      }

      onImageChange({
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        uploadedAt: new Date(),
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [image, onImageChange]
  );

  const handleRemove = useCallback(() => {
    if (image?.url.startsWith('blob:')) {
      URL.revokeObjectURL(image.url);
    }
    onImageChange(null);
  }, [image, onImageChange]);

  // 禁用状态下的样式
  const disabledBorderColor = 'border-gray-300 dark:border-gray-600';
  const effectiveBorderColor = disabled ? disabledBorderColor : borderColor;

  const slotContent = (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <span
          className={`text-[10px] ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}
        >
          {label}
        </span>
      )}
      {image ? (
        <div
          className={`relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 group border-2 ${effectiveBorderColor} ${disabled ? 'opacity-60' : ''}`}
        >
          <img
            src={image.url}
            alt={image.name}
            className="w-full h-full object-cover"
          />
          {!disabled && (
            <button
              onClick={handleRemove}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => !disabled && fileInputRef.current?.click()}
          disabled={disabled}
          className={`w-12 h-12 rounded-lg border-2 border-dashed ${effectiveBorderColor} flex items-center justify-center flex-shrink-0 transition-colors ${
            disabled
              ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50'
              : 'hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
          }`}
        >
          <svg
            className="w-5 h-5 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );

  // 如果禁用且有 tooltip，包裹一个带 title 的容器
  if (disabled && disabledTooltip) {
    return (
      <div className="relative group/tooltip">
        {slotContent}
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
          {disabledTooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-700" />
        </div>
      </div>
    );
  }

  return slotContent;
};

/**
 * 图片预览行组件 - 紧凑的小缩略图横向排列
 */
const ImagePreviewRow: FC<{
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages: number;
  disabled?: boolean;
}> = ({ images, onImagesChange, maxImages, disabled = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件选择
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const remainingSlots = maxImages - images.length;
      const filesToAdd = Array.from(files).slice(0, remainingSlots);

      const newImages: UploadedImage[] = filesToAdd
        .filter(file => {
          const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
          const maxSize = 10 * 1024 * 1024; // 10MB
          return validTypes.includes(file.type) && file.size <= maxSize;
        })
        .map(file => ({
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          file,
          url: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          uploadedAt: new Date(),
        }));

      onImagesChange([...images, ...newImages]);

      // 清空 input 以便再次选择相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [images, maxImages, onImagesChange]
  );

  // 删除图片
  const handleRemoveImage = useCallback(
    (id: string) => {
      const imageToRemove = images.find(img => img.id === id);
      if (imageToRemove?.url.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove.url);
      }
      onImagesChange(images.filter(img => img.id !== id));
    },
    [images, onImagesChange]
  );

  // 点击上传按钮
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const canAddMore = images.length < maxImages;

  return (
    <div className="flex items-center gap-2">
      {/* 图片预览列表 */}
      <div className="flex items-center gap-2 overflow-x-auto flex-1 py-1">
        {images.map(img => (
          <div
            key={img.id}
            className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 group border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800"
          >
            <img
              src={img.url}
              alt={img.name}
              className="w-full h-full object-cover"
            />
            {/* 删除按钮 */}
            <button
              onClick={() => handleRemoveImage(img.id)}
              disabled={disabled}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            {/* 文件大小标签 */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white text-center py-0.5">
              {img.size ? `${(img.size / 1024 / 1024).toFixed(1)}MB` : ''}
            </div>
          </div>
        ))}

        {/* 上传按钮 */}
        {canAddMore && (
          <button
            onClick={handleUploadClick}
            disabled={disabled}
            className={`w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0 transition-colors ${
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
            }`}
          >
            <svg
              className="w-5 h-5 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 最大数量提示 */}
      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
        {images.length}/{maxImages}
      </span>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

/**
 * 设置弹出面板组件
 */
const SettingsPopover: FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ isOpen, onClose, children }) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full left-0 mb-2 w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * 视频配置设置面板
 */
const VideoConfigPanel: FC<{
  config: ExtendedVideoConfigProps;
  onChange: (config: ExtendedVideoConfigProps) => void;
  selectedModels: SelectedModel[];
}> = ({ config, onChange, selectedModels }) => {
  const { t, i18n } = useTranslation();
  const { getEnabledAndTestedModels } = useModel();
  const isZh = i18n.language === 'zh';

  // 获取所有选中模型的信息
  const allModels = getEnabledAndTestedModels();
  const selectedModelDetails = selectedModels
    .map(sm => allModels.find(m => m.id === sm.id))
    .filter(Boolean);

  // 计算所有选中模型共同支持的分辨率
  const commonResolutions = useMemo(() => {
    if (selectedModelDetails.length === 0) return ['720P', '1080P'];

    const allResolutions = selectedModelDetails.map(
      m => m?.supportedResolutions || ['720P', '1080P']
    );
    return allResolutions.reduce((common, resolutions) =>
      common.filter(r => resolutions.includes(r))
    );
  }, [selectedModelDetails]);

  // 计算所有选中模型共同支持的宽高比
  const commonAspectRatios = useMemo(() => {
    if (selectedModelDetails.length === 0) return ['16:9', '9:16', '1:1'];

    const allRatios = selectedModelDetails.map(
      m => m?.supportedAspectRatios || ['16:9', '9:16', '1:1']
    );
    return allRatios.reduce((common, ratios) =>
      common.filter(r => ratios.includes(r))
    );
  }, [selectedModelDetails]);

  // 检查是否有 Kling 模型被选中（支持动作控制）
  const hasKlingModel = useMemo(() => {
    return selectedModelDetails.some(m => m?.modelName === 'Kling');
  }, [selectedModelDetails]);

  // 获取有特定配置的模型
  const modelsWithSpecificConfig = useMemo(() => {
    return selectedModelDetails.filter(
      m =>
        m?.modelSpecificConfig && Object.keys(m.modelSpecificConfig).length > 0
    );
  }, [selectedModelDetails]);

  const handleChange = (key: string, value: string) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* 公共配置 */}
      <div>
        <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
          {t('videoConfig.commonSettings', '通用设置')}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 分辨率 */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              {t('videoConfig.resolution', '分辨率')}
            </label>
            <select
              value={config.resolution || '1080P'}
              onChange={e => handleChange('resolution', e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {commonResolutions.map(res => (
                <option key={res} value={res}>
                  {res}
                </option>
              ))}
            </select>
          </div>

          {/* 宽高比 */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              {t('videoConfig.aspectRatio', '宽高比')}
            </label>
            <select
              value={config.aspectRatio || '16:9'}
              onChange={e => handleChange('aspectRatio', e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {commonAspectRatios.map(ratio => (
                <option key={ratio} value={ratio}>
                  {ratio}
                </option>
              ))}
            </select>
          </div>

          {/* 画质增强 */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              {t('videoConfig.qualityEnhance', '画质增强')}
            </label>
            <select
              value={config.enhanceSwitch || 'Disabled'}
              onChange={e => handleChange('enhanceSwitch', e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="Enabled">{t('common.enabled', '开启')}</option>
              <option value="Disabled">{t('common.disabled', '关闭')}</option>
            </select>
          </div>

          {/* 音频生成 */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              {t('videoConfig.audioGeneration', '音频生成')}
            </label>
            <select
              value={config.audioGeneration || 'Disabled'}
              onChange={e => handleChange('audioGeneration', e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="Enabled">{t('common.enabled', '开启')}</option>
              <option value="Disabled">{t('common.disabled', '关闭')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 负面提示词 */}
      <div className="space-y-1">
        <label className="text-xs text-gray-500 dark:text-gray-400">
          {t('videoConfig.negativePrompt', '负面提示词')}
          <span className="ml-1 text-gray-400">
            ({t('videoConfig.negativePromptHint', '输入不想出现的内容')})
          </span>
        </label>
        <input
          type="text"
          value={config.negativePrompt || ''}
          onChange={e => handleChange('negativePrompt', e.target.value)}
          placeholder={t(
            'videoConfig.negativePromptPlaceholder',
            '例如：模糊、低质量、变形...'
          )}
          className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
      </div>

      {/* 模型特定配置 */}
      {modelsWithSpecificConfig.length > 0 && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-1">
            <SparklesIcon className="w-3.5 h-3.5 text-amber-500" />
            {t('videoConfig.modelSpecificSettings', '模型专属设置')}
          </h4>

          {/* Kling 动作控制 */}
          {hasKlingModel && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  可灵 (Kling)
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-800 text-amber-600 dark:text-amber-300 rounded">
                  {t('videoConfig.exclusive', '专属')}
                </span>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-600 dark:text-gray-400">
                  {t('videoConfig.sceneType', '场景类型')}
                </label>
                <select
                  value={config.sceneType || ''}
                  onChange={e => handleChange('sceneType', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="">{isZh ? '默认' : 'Default'}</option>
                  <option value="motion_control">
                    {isZh ? '动作控制' : 'Motion Control'}
                  </option>
                </select>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                  {t(
                    'videoConfig.sceneTypeHint',
                    '选择动作控制可实现更精准的人物动作生成'
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =================================================================================================
// Component
// =================================================================================================

export const ChatInput: FC<ChatInputProps> = ({
  input,
  selectedModels,
  designImage,
  isGenerating,
  isSending,
  user,
  textareaRef,
  onInputChange,
  onInputKeyDown,
  onSendMessage,
  onModelChange,
  onDesignImageClose,
  isDesignImageMenuVisible,
  isMobile,
  uploadedImages = [],
  onUploadedImagesChange,
  lastFrameImage = null,
  onLastFrameImageChange,
  videoConfig = {},
  onVideoConfigChange,
}) => {
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const { getEnabledAndTestedModels } = useModel();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取所有启用的模型
  const allModels = getEnabledAndTestedModels();

  // 检查是否有模型支持图生视频
  const hasI2VModels = useMemo(() => {
    return selectedModels.some(sm => {
      const model = allModels.find(m => m.id === sm.id);
      return model?.supportI2V;
    });
  }, [selectedModels, allModels]);

  // 检查是否有模型支持首尾帧
  const hasLastFrameModels = useMemo(() => {
    return selectedModels.some(sm => {
      const model = allModels.find(m => m.id === sm.id);
      return model?.supportLastFrame;
    });
  }, [selectedModels, allModels]);

  // 获取不支持尾帧的模型名称（用于提示）
  const modelsWithoutLastFrame = useMemo(() => {
    return selectedModels
      .map(sm => {
        const model = allModels.find(m => m.id === sm.id);
        return model && !model.supportLastFrame ? model.name : null;
      })
      .filter((name): name is string => name !== null);
  }, [selectedModels, allModels]);

  // 检查尾帧是否可用（根据模型限制）
  const lastFrameStatus = useMemo(() => {
    const resolution = videoConfig?.resolution || '1080P';
    const firstFrameCount = uploadedImages.length;

    // 检查所有选中的支持首尾帧的模型
    for (const sm of selectedModels) {
      const model = allModels.find(m => m.id === sm.id);
      if (model?.supportLastFrame) {
        const result = canUseLastFrame(model, resolution, firstFrameCount);
        if (!result.canUse && result.reason) {
          return result;
        }
      }
    }
    return { canUse: true };
  }, [
    selectedModels,
    allModels,
    videoConfig?.resolution,
    uploadedImages.length,
  ]);

  // 获取最大支持的图片数量
  const maxImages = useMemo(() => {
    if (selectedModels.length === 0) return 1;

    const maxPerModel = selectedModels.map(sm => {
      const model = allModels.find(m => m.id === sm.id);
      return model?.maxImages || 1;
    });

    return Math.max(...maxPerModel, 1);
  }, [selectedModels, allModels]);

  // 处理图片上传变化
  const handleImagesChange = useCallback(
    (images: UploadedImage[]) => {
      onUploadedImagesChange?.(images);
    },
    [onUploadedImagesChange]
  );

  // 处理视频配置变化
  const handleVideoConfigChange = useCallback(
    (config: ExtendedVideoConfigProps) => {
      onVideoConfigChange?.(config);
    },
    [onVideoConfigChange]
  );

  // 切换设置面板显示
  const toggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);

  // 关闭设置面板
  const closeSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  // 打开文件选择器
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 处理文件选择
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const remainingSlots = maxImages - uploadedImages.length;
      const filesToAdd = Array.from(files).slice(0, remainingSlots);

      const newImages: UploadedImage[] = filesToAdd
        .filter(file => {
          const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
          const maxSize = 10 * 1024 * 1024; // 10MB
          return validTypes.includes(file.type) && file.size <= maxSize;
        })
        .map(file => ({
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          file,
          url: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          uploadedAt: new Date(),
        }));

      onUploadedImagesChange?.([...uploadedImages, ...newImages]);

      // 清空 input 以便再次选择相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [uploadedImages, maxImages, onUploadedImagesChange]
  );

  // 是否有上传的图片
  const hasUploadedImages = uploadedImages.length > 0;

  return (
    <div className="border-t border-primary-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800 backdrop-blur-sm p-4">
      {designImage ? (
        <div className="flex items-center gap-3">
          <div
            className="group relative flex items-center gap-3 cursor-pointer ml-3"
            onClick={() => {
              // Handle design image preview
            }}
          >
            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-all duration-200 group-hover:shadow-md">
              <img
                src={designImage?.url || ''}
                alt={designImage?.alt || 'Design reference'}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('chat.input.designTitle')}
              </span>
            </div>
            <button
              onClick={onDesignImageClose}
              className={`absolute -top-2 -right-2 p-1.5 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-110 ${
                isMobile
                  ? isDesignImageMenuVisible
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-95'
                  : 'opacity-0 group-hover:opacity-100'
              }`}
              aria-label="Close design image"
            >
              <svg
                className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 模型选择器 */}
          <ModelDrawer
            selectedModels={selectedModels}
            onModelChange={onModelChange}
            disabled={isGenerating}
            hasUploadedImage={hasUploadedImages}
            uploadedImageCount={uploadedImages.length}
          />

          {/* 图片预览行 */}
          {hasI2VModels && onUploadedImagesChange && (
            <div className="flex items-center gap-2 px-1">
              {/* 首帧/多图区域 */}
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                {hasLastFrameModels
                  ? t('chat.input.firstFrame', '首帧')
                  : t('chat.input.i2vUpload', '图生视频')}
              </span>
              <ImagePreviewRow
                images={uploadedImages}
                onImagesChange={handleImagesChange}
                maxImages={maxImages}
                disabled={isGenerating}
              />
              {/* 尾帧区域（仅当有模型支持首尾帧时显示） */}
              {hasLastFrameModels && onLastFrameImageChange && (
                <>
                  <div
                    className={`flex items-center ${!lastFrameStatus.canUse ? 'text-gray-200 dark:text-gray-700' : 'text-gray-300 dark:text-gray-600'}`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {t('chat.input.lastFrame', '尾帧')}
                  </span>
                  <ImageSlot
                    image={lastFrameImage}
                    onImageChange={onLastFrameImageChange}
                    disabled={isGenerating || !lastFrameStatus.canUse}
                    borderColor="border-amber-400 dark:border-amber-500"
                    disabledTooltip={
                      lastFrameStatus.reason
                        ? t(
                            `chat.input.lastFrameDisabled.${lastFrameStatus.reason}`
                          )
                        : undefined
                    }
                  />
                </>
              )}
              {/* 提示信息（紧挨着） */}
              {hasLastFrameModels && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-2">
                  {t('chat.input.firstFrameHint', '第一张为首帧，其余为参考图')}
                  {modelsWithoutLastFrame.length > 0 && (
                    <>
                      <span className="mx-1">·</span>
                      <span className="text-amber-500 dark:text-amber-400">
                        {t('chat.input.lastFrameHint', '尾帧：若模型不支持则不上传')}
                      </span>
                    </>
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <form onSubmit={onSendMessage} className="mt-3">
        <div className="relative flex items-end gap-2">
          {/* 左侧工具按钮 */}
          <div className="flex items-center gap-1 pb-2">
            {/* 图片上传按钮 */}
            {hasI2VModels && onUploadedImagesChange && (
              <button
                type="button"
                onClick={openFilePicker}
                disabled={isGenerating || uploadedImages.length >= maxImages}
                className={`p-2 rounded-lg transition-colors ${
                  hasUploadedImages
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                } ${isGenerating || uploadedImages.length >= maxImages ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={t('chat.input.uploadImage', '上传图片')}
              >
                <PhotoIcon className="w-5 h-5" />
              </button>
            )}

            {/* 设置按钮 + Popover */}
            {onVideoConfigChange && (
              <div className="relative">
                <button
                  type="button"
                  onClick={toggleSettings}
                  disabled={isGenerating}
                  className={`p-2 rounded-lg transition-colors ${
                    showSettings
                      ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={t('chat.input.videoSettings', '视频设置')}
                >
                  <Cog6ToothIcon className="w-5 h-5" />
                </button>

                {/* 设置 Popover */}
                <SettingsPopover isOpen={showSettings} onClose={closeSettings}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('chat.input.videoSettings', '视频设置')}
                      </span>
                      <button
                        onClick={closeSettings}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    <VideoConfigPanel
                      config={videoConfig}
                      onChange={handleVideoConfigChange}
                      selectedModels={selectedModels}
                    />
                  </div>
                </SettingsPopover>
              </div>
            )}
          </div>

          {/* 输入框 */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={onInputChange}
              onKeyDown={onInputKeyDown}
              placeholder={
                isGenerating
                  ? t('chat.placeholderGenerating')
                  : user
                    ? window.innerWidth < 768
                      ? t('chat.placeholderShort')
                      : t('chat.placeholder')
                    : t('chat.placeholderLogin')
              }
              disabled={isSending || isGenerating}
              className={`w-full max-h-[200px] py-3 pl-4 pr-12 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none overflow-hidden ease-in-out ${
                isSending || isGenerating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              rows={1}
            />
            <button
              type="submit"
              disabled={
                !input.trim() ||
                (selectedModels.length === 0 &&
                  !designImage &&
                  !user?.user_metadata?.hide_model_info) ||
                isSending ||
                isGenerating
              }
              className="absolute right-2 bottom-2 p-2 text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-500 disabled:text-indigo-400 disabled:cursor-not-allowed transition-colors duration-200 rounded-lg disabled:hover:bg-transparent"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              ) : isGenerating ? (
                <SparklesIcon className="h-5 w-5 animate-pulse text-indigo-500" />
              ) : (
                <PaperAirplaneIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="mt-2 flex items-center justify-between px-2">
          <div className="flex items-center space-x-3 text-xs text-gray-500">
            <span className="flex items-center">
              <svg
                className="h-4 w-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              {t('chat.input.enterToSend')}
            </span>
            <span className="flex items-center">
              <svg
                className="h-4 w-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M12 5l7 7-7 7"
                />
              </svg>
              {t('chat.input.ctrlEnterToNewLine')}
            </span>
            {designImage ? (
              <span className="flex items-center text-indigo-600 dark:text-indigo-400">
                <SparklesIcon className="h-4 w-4 mr-1" />
                {t('chat.input.designMode', '图片编辑模式')}
              </span>
            ) : (
              <>
                {hasUploadedImages && (
                  <span className="flex items-center text-purple-600 dark:text-purple-400">
                    <PhotoIcon className="h-4 w-4 mr-1" />
                    {t('chat.input.i2vMode', '图生视频模式')}
                  </span>
                )}
                {!(user?.user_metadata?.hide_model_info ?? false) &&
                  selectedModels.length > 0 &&
                  !hasUploadedImages && (
                    <span className="flex items-center">
                      <SparklesIcon className="h-4 w-4 mr-1" />
                      {t('chat.input.selectedModels', {
                        count: selectedModels.length,
                      })}
                    </span>
                  )}
                {isGenerating && (
                  <span className="flex items-center text-indigo-600 dark:text-indigo-400">
                    <SparklesIcon className="h-4 w-4 mr-1 animate-pulse" />
                    {t('chat.input.generating')}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {input.length > 0 &&
              t('chat.input.characterCount', { count: input.length })}
          </div>
        </div>
      </form>
    </div>
  );
};
