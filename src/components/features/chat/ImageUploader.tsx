/**
 * @file ImageUploader.tsx
 * @description 图片上传组件，支持预览、删除，用于图生视频功能
 * @author fmw666@github
 * @date 2025-01-31
 */

// =================================================================================================
// Imports
// =================================================================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import type { FC, DragEvent, ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PhotoIcon,
  XMarkIcon,
  PlusIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import type { UploadedImage } from '@/config/models.types';

// =================================================================================================
// Type Definitions
// =================================================================================================

interface ImageUploaderProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  maxSizeBytes?: number; // 单个文件最大大小，默认 10MB
  disabled?: boolean;
  compact?: boolean; // 紧凑模式
}

// =================================================================================================
// Constants
// =================================================================================================

const DEFAULT_MAX_IMAGES = 1;
const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// =================================================================================================
// Utility Functions
// =================================================================================================

/**
 * 生成唯一 ID
 */
const generateId = (): string => {
  return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * 验证文件
 */
const validateFile = (
  file: File,
  maxSizeBytes: number
): { valid: boolean; error?: string } => {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { valid: false, error: 'unsupportedFormat' };
  }
  if (file.size > maxSizeBytes) {
    return { valid: false, error: 'fileTooLarge' };
  }
  return { valid: true };
};

// =================================================================================================
// Component
// =================================================================================================

export const ImageUploader: FC<ImageUploaderProps> = ({
  images,
  onImagesChange,
  maxImages = DEFAULT_MAX_IMAGES,
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
  disabled = false,
  compact = false,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 清除错误提示
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // 获取错误消息文本
  const getErrorMessage = useCallback(
    (errorKey: string): string => {
      switch (errorKey) {
        case 'unsupportedFormat':
          return t(
            'imageUploader.unsupportedFormat',
            '不支持的图片格式，请使用 JPEG、PNG 或 WebP'
          );
        case 'fileTooLarge':
          return t(
            'imageUploader.fileTooLarge',
            `文件过大，最大支持 ${formatFileSize(maxSizeBytes)}`
          );
        case 'maxImagesReached':
          return t(
            'imageUploader.maxImagesReached',
            `最多只能上传 ${maxImages} 张图片`
          );
        default:
          return t('imageUploader.uploadError', '上传失败，请重试');
      }
    },
    [t, maxSizeBytes, maxImages]
  );

  // 处理文件选择
  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const remainingSlots = maxImages - images.length;
      if (remainingSlots <= 0) {
        setError('maxImagesReached');
        return;
      }

      const newImages: UploadedImage[] = [];
      const filesToProcess = Array.from(files).slice(0, remainingSlots);

      for (const file of filesToProcess) {
        const validation = validateFile(file, maxSizeBytes);
        if (!validation.valid) {
          setError(validation.error || 'uploadError');
          continue;
        }

        const blobUrl = URL.createObjectURL(file);
        newImages.push({
          id: generateId(),
          file,
          url: blobUrl,
          name: file.name,
          size: file.size,
          uploadedAt: new Date(),
        });
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
      }
    },
    [images, maxImages, maxSizeBytes, onImagesChange]
  );

  // 处理文件输入变化
  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // 重置 input 以允许重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFiles]
  );

  // 处理拖拽
  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (!disabled) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, handleFiles]
  );

  // 删除图片
  const handleRemoveImage = useCallback(
    (imageId: string) => {
      const imageToRemove = images.find(img => img.id === imageId);
      if (imageToRemove && imageToRemove.url.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove.url);
      }
      onImagesChange(images.filter(img => img.id !== imageId));
    },
    [images, onImagesChange]
  );

  // 点击上传区域
  const handleClickUpload = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  // 是否可以继续上传
  const canUploadMore = images.length < maxImages;

  // 渲染紧凑模式
  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* 已上传的图片 */}
        <AnimatePresence mode="popLayout">
          {images.map(image => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative group"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={() => handleRemoveImage(image.id)}
                className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 添加按钮 */}
        {canUploadMore && (
          <button
            onClick={handleClickUpload}
            disabled={disabled}
            className={`w-12 h-12 flex items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
              disabled
                ? 'border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-zinc-500 dark:hover:border-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-400'
            }`}
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        )}

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple={maxImages > 1}
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* 错误提示 */}
        <AnimatePresence>
          {error && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-xs text-red-500"
            >
              {getErrorMessage(error)}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // 渲染标准模式
  return (
    <div className="space-y-3">
      {/* 已上传的图片预览 */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <AnimatePresence mode="popLayout">
            {images.map(image => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group"
              >
                <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <button
                  onClick={() => handleRemoveImage(image.id)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                  title={t('common.delete', '删除')}
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
                {image.size && (
                  <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/50 text-white text-[10px] text-center truncate">
                    {formatFileSize(image.size)}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 上传区域 */}
      {canUploadMore && (
        <div
          onClick={handleClickUpload}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg transition-all cursor-pointer ${
            disabled
              ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed'
              : isDragging
                ? 'border-zinc-400 dark:border-zinc-500 bg-zinc-100 dark:bg-zinc-800/50'
                : 'border-gray-300 dark:border-gray-600 hover:border-zinc-500 dark:hover:border-zinc-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            multiple={maxImages > 1}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled}
          />

          {isDragging ? (
            <ArrowUpTrayIcon className="w-8 h-8 text-zinc-600 dark:text-zinc-400 mb-2" />
          ) : (
            <PhotoIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
          )}

          <p
            className={`text-sm font-medium ${
              isDragging
                ? 'text-zinc-700 dark:text-zinc-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {isDragging
              ? t('imageUploader.dropHere', '释放以上传')
              : t('imageUploader.clickOrDrag', '点击或拖拽图片到此处')}
          </p>

          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {t(
              'imageUploader.supportedFormats',
              'JPEG、PNG、WebP，最大 {{size}}',
              {
                size: formatFileSize(maxSizeBytes),
              }
            )}
          </p>

          {maxImages > 1 && (
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
              {t('imageUploader.imageCount', '{{current}}/{{max}} 张图片', {
                current: images.length,
                max: maxImages,
              })}
            </p>
          )}
        </div>
      )}

      {/* 错误提示 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 text-sm text-red-500 dark:text-red-400"
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{getErrorMessage(error)}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageUploader;
