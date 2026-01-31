/**
 * @file useChatInput.ts
 * @description Hook for managing chat input state and video generation logic
 * @author fmw666@github
 * @date 2025-07-18
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useRef, useCallback } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';

// --- Internal Libraries ---
// --- Services ---
import { modelApiManager, type VideoStatusUpdate } from '@/services/api';
import type {
  Chat,
  Message,
  Results,
  VideoResult,
  MessageVideoConfig,
  MessageUploadedImage,
  ModelSpecificParams,
} from '@/services/chat';
import { modelManager, type ImageModel } from '@/services/model';
import { storageService } from '@/services/storage/storageService';
// --- Types ---
import type { DesignImage, SelectedModel } from '@/types/chat';
import type { UploadedImage } from '@/config/models.types';
import {
  isModelAvailableForInput,
  canUseLastFrame,
} from '@/config/models.types';
// --- Utils ---
import { eventBus, EVENT_NEED_SIGN_IN } from '@/utils/eventBus';

// =================================================================================================
// Type Definitions
// =================================================================================================

// 扩展的视频配置类型
interface ExtendedVideoConfig {
  resolution?: '720P' | '1080P' | '2K' | '4K';
  aspectRatio?: '16:9' | '9:16' | '1:1';
  enhanceSwitch?: 'Enabled' | 'Disabled';
  negativePrompt?: string;
  audioGeneration?: 'Enabled' | 'Disabled';
  personGeneration?: 'AllowAdult' | 'Disabled';
  sceneType?: string;
  [key: string]: unknown;
}

interface UseChatInputProps {
  user: any;
  currentChat: Chat | null;
  selectedModels: SelectedModel[];
  designImage: DesignImage | null;
  uploadedImages?: UploadedImage[]; // 用户上传的图片（首帧）
  lastFrameImage?: UploadedImage | null; // 尾帧图片（首尾帧模式）
  videoConfig?: ExtendedVideoConfig; // 视频配置
  onSendMessage: (message: Message) => Promise<void>;
  onUpdateMessageResults: (
    messageId: string,
    results: Results,
    updateInDatabase?: boolean
  ) => Promise<void>;
  onCreateNewChat: (
    title: string,
    initialMessages: Message[]
  ) => Promise<Chat | null> | Promise<null>;
  onNavigate: (path: string) => void;
  onSetInput: (input: string) => void;
  onSetIsGenerating: (isGenerating: boolean) => void;
  onSetIsSending: (isSending: boolean) => void;
  onScrollToBottom: (showLoading?: boolean) => void;
}

// =================================================================================================
// Constants
// =================================================================================================

const TEXTAREA_MAX_HEIGHT = 200;

// =================================================================================================
// Helper Functions
// =================================================================================================

/**
 * 创建初始视频结果
 */
const createInitialVideoResult = (index: number): VideoResult => ({
  id: `vid_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`,
  taskId: null,
  videoUrl: null,
  coverUrl: null,
  duration: null,
  status: 'PROCESSING',
  progress: 0,
  error: null,
  errorMessage: null,
  isGenerating: true,
  createdAt: null,
});

/**
 * 将 VideoStatusUpdate 转换为 VideoResult
 */
const statusUpdateToVideoResult = (
  update: VideoStatusUpdate,
  existingResult: VideoResult
): VideoResult => ({
  id: existingResult.id,
  taskId: update.taskId || existingResult.taskId,
  videoUrl: update.videoUrl || existingResult.videoUrl,
  coverUrl: update.coverUrl || existingResult.coverUrl,
  duration: update.duration || existingResult.duration,
  status: update.status,
  progress: update.progress,
  error: update.success ? null : update.error || '生成失败',
  errorMessage: update.error || null,
  isGenerating: update.status === 'PROCESSING',
  createdAt: update.createdAt || existingResult.createdAt,
});

// =================================================================================================
// Hook
// =================================================================================================

export const useChatInput = ({
  user,
  currentChat,
  selectedModels,
  designImage,
  uploadedImages = [],
  lastFrameImage = null,
  videoConfig = {},
  onSendMessage,
  onUpdateMessageResults,
  onCreateNewChat,
  onNavigate,
  onSetInput,
  onSetIsGenerating,
  onSetIsSending,
  onScrollToBottom,
}: UseChatInputProps) => {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 检查是否有上传的图片
  const hasUploadedImages = uploadedImages.length > 0 || !!designImage;

  // =================================================================================================
  // Message Sending
  // =================================================================================================

  const handleSendMessage = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!user) {
        eventBus.emit(EVENT_NEED_SIGN_IN);
        return;
      }

      onSetIsSending(true);
      const currentInput = textareaRef.current?.value || '';

      // 视频生成不支持设计模式，直接使用选中的模型
      const currentModels = selectedModels;

      if (currentModels.length === 0) {
        console.warn('没有选择任何模型');
        onSetIsSending(false);
        return;
      }

      try {
        const totalCount = currentModels.reduce(
          (sum, model) => sum + model.count,
          0
        );

        // 生成安全的文件名（移除中文、空格等特殊字符）
        const sanitizeFileName = (name: string): string => {
          const ext = name.split('.').pop() || 'png';
          const random = Math.random().toString(36).substring(2, 15);
          return `${Date.now()}_${random}.${ext}`;
        };

        // 上传图片到云存储的辅助函数
        const uploadImageToCloud = async (
          img: UploadedImage,
          prefix: string = 'i2v'
        ): Promise<string> => {
          if (!img.url.startsWith('blob:')) {
            return img.url;
          }
          if (img.file) {
            const safeFileName = `${prefix}_${sanitizeFileName(img.name)}`;
            console.log(`上传图片到云存储: ${img.name} -> ${safeFileName}`);
            const result = await storageService.uploadImage(
              img.file,
              safeFileName
            );
            if (result.success && result.url) {
              console.log(`图片上传成功: ${result.url}`);
              return result.url;
            } else {
              throw new Error(result.error || '图片上传失败');
            }
          }
          throw new Error('图片文件不存在');
        };

        // ===== 先上传图片到云存储，获取 URL =====
        let sharedFileInfos: Array<{ Type: 'Url'; Url: string }> | undefined;
        let sharedLastFrameUrl: string | undefined;
        let uploadedImageInfos: MessageUploadedImage[] | undefined;
        let lastFrameImageInfo: MessageUploadedImage | undefined;

        try {
          // 上传首帧图片
          if (uploadedImages.length > 0) {
            console.log(
              `准备上传 ${uploadedImages.length} 张首帧图片到云存储...`
            );
            const uploadedUrls = await Promise.all(
              uploadedImages.map(img => uploadImageToCloud(img, 'first'))
            );
            sharedFileInfos = uploadedUrls.map(url => ({
              Type: 'Url' as const,
              Url: url,
            }));
            uploadedImageInfos = uploadedImages.map((img, index) => ({
              id: img.id,
              url: uploadedUrls[index],
              name: img.name,
            }));
            console.log('首帧图片上传完成:', sharedFileInfos);
          } else if (designImage?.url) {
            if (designImage.url.startsWith('blob:')) {
              throw new Error('设计图片需要是公网可访问的 URL');
            }
            sharedFileInfos = [{ Type: 'Url' as const, Url: designImage.url }];
          }

          // 上传尾帧图片
          if (lastFrameImage) {
            console.log('准备上传尾帧图片到云存储...');
            sharedLastFrameUrl = await uploadImageToCloud(
              lastFrameImage,
              'last'
            );
            lastFrameImageInfo = {
              id: lastFrameImage.id,
              url: sharedLastFrameUrl,
              name: lastFrameImage.name,
            };
            console.log('尾帧图片上传完成:', sharedLastFrameUrl);
          }
        } catch (uploadError) {
          console.error('图片上传失败:', uploadError);
          onSetIsSending(false);
          throw uploadError;
        }

        // ===== 图片上传完成后，构建消息 =====

        // 初始化视频结果
        const initialResults: Results = {
          status: {
            success: 0,
            failed: 0,
            total: totalCount,
            generating: totalCount,
          },
          videos: currentModels.reduce(
            (acc, model) => ({
              ...acc,
              [model.name]: Array(model.count)
                .fill(null)
                .map((_, index) => createInitialVideoResult(index)),
            }),
            {}
          ),
        };

        // 构建模型专属参数
        const modelSpecificParams: ModelSpecificParams[] = [];

        // 检查是否有 Kling 模型，如果有则添加其专属参数（包括默认值）
        const klingModels = currentModels.filter(m => {
          const model = modelManager.getModelById(m.id);
          return model?.modelName === 'Kling';
        });
        if (klingModels.length > 0) {
          // 场景类型：空字符串表示"默认"，"motion_control"表示"动作控制"
          const sceneTypeValue = videoConfig.sceneType || 'default';
          klingModels.forEach(m => {
            modelSpecificParams.push({
              modelId: m.id,
              modelName: m.name,
              params: { sceneType: sceneTypeValue },
            });
          });
        }

        // 构建视频配置（保存到消息中）
        const messageVideoConfig: MessageVideoConfig = {
          resolution: videoConfig.resolution || '1080P',
          aspectRatio: videoConfig.aspectRatio || '16:9',
          enhanceSwitch: videoConfig.enhanceSwitch || 'Disabled',
          negativePrompt: videoConfig.negativePrompt || undefined,
          audioGeneration: videoConfig.audioGeneration || 'Disabled',
          modelSpecificParams:
            modelSpecificParams.length > 0 ? modelSpecificParams : undefined,
        };

        const message: Message = {
          id: `msg_${Date.now()}`,
          content: currentInput,
          models: currentModels,
          results: initialResults,
          createdAt: new Date().toISOString(),
          userImage: designImage
            ? {
                url: designImage.url,
                alt: designImage.alt || 'User uploaded image',
                referenceMessageId: designImage.referenceMessageId,
                referenceResultId: designImage.referenceResultId,
              }
            : undefined,
          videoConfig: messageVideoConfig,
          // 使用云存储 URL（已上传完成）
          uploadedImages: uploadedImageInfos,
          lastFrameImage: lastFrameImageInfo,
        };

        let chat: Chat | null = currentChat;
        if (!chat) {
          const title =
            currentInput.slice(0, 10) + (currentInput.length > 10 ? '...' : '');
          chat = await onCreateNewChat(title, [message]);
          if (!chat) throw new Error('Failed to create new chat');
          onNavigate(`/chat/${chat.id}`);
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          await onSendMessage(message);
        }

        // 重置状态
        onSetInput('');
        onSetIsSending(false);
        onSetIsGenerating(true);
        onScrollToBottom(false);

        // ===== 继续视频生成流程 =====
        try {
          // 图片已经上传完成，这里只是为了保持后续代码的兼容性
          void sharedFileInfos;
          void sharedLastFrameUrl;
        } catch (uploadError) {
          console.error('图片上传失败:', uploadError);
          // 图片上传失败，所有模型都标记为失败
          const errorMsg =
            uploadError instanceof Error ? uploadError.message : '图片上传失败';
          currentModels.forEach(({ name, count }) => {
            message.results.status.generating -= count;
            message.results.status.failed += count;
            const errorResults: VideoResult[] = Array(count)
              .fill(null)
              .map((_, index) => ({
                id: `vid_${Date.now()}_error_${index}_${Math.random().toString(36).substring(2, 9)}`,
                taskId: null,
                videoUrl: null,
                coverUrl: null,
                duration: null,
                status: 'FAIL' as const,
                progress: 0,
                error: '图片上传失败',
                errorMessage: errorMsg,
                isGenerating: false,
                createdAt: new Date().toISOString(),
              }));
            message.results.videos[name] = errorResults;
          });
          onUpdateMessageResults(message.id, { ...message.results }, true);
          onSetIsGenerating(false);
          return;
        }

        // 为每个模型生成视频
        const updatePromises = currentModels.map(
          async ({ id, name, count }) => {
            const model: ImageModel | undefined = modelManager.getModelById(id);

            if (!model) {
              const errorMessage = `模型未找到: ${name}`;
              message.results.status.generating -= count;
              message.results.status.failed += count;

              // 创建错误结果
              const errorResults: VideoResult[] = Array(count)
                .fill(null)
                .map((_, index) => ({
                  id: `vid_${Date.now()}_error_${index}_${Math.random().toString(36).substring(2, 9)}`,
                  taskId: null,
                  videoUrl: null,
                  coverUrl: null,
                  duration: null,
                  status: 'FAIL' as const,
                  progress: 0,
                  error: '生成失败',
                  errorMessage,
                  isGenerating: false,
                  createdAt: new Date().toISOString(),
                }));

              // 立即更新 UI 显示错误状态
              const updatedVideos = { ...message.results.videos };
              updatedVideos[name] = errorResults;
              message.results.videos = updatedVideos;
              onUpdateMessageResults(
                message.id,
                { ...message.results, videos: updatedVideos },
                true
              );

              return { [name]: errorResults };
            }

            // 检查模型兼容性（包括图片数量检查）
            const imageCount = uploadedImages.length || (designImage ? 1 : 0);
            const compatibility = isModelAvailableForInput(
              model,
              hasUploadedImages,
              imageCount
            );
            if (!compatibility.available) {
              // 模型不兼容当前输入模式，跳过 API 调用，直接设置警告状态
              let warningMessage: string;
              let shortError: string;

              if (compatibility.reason === 'onlyT2V') {
                warningMessage = t(
                  'model.incompatible.onlyT2V',
                  '该模型仅支持文生视频，不支持图片输入'
                );
                shortError = t(
                  'model.incompatible.shortOnlyT2V',
                  '不支持图片输入'
                );
              } else if (compatibility.reason === 'onlyI2V') {
                warningMessage = t(
                  'model.incompatible.onlyI2V',
                  '该模型仅支持图生视频，需要上传图片'
                );
                shortError = t(
                  'model.incompatible.shortOnlyI2V',
                  '需要上传图片'
                );
              } else if (compatibility.reason === 'tooManyImages') {
                warningMessage = t('model.incompatible.tooManyImages', {
                  max: compatibility.maxImages,
                  current: imageCount,
                  defaultValue: `该模型最多支持 ${compatibility.maxImages} 张图片，当前已上传 ${imageCount} 张`,
                });
                shortError = t('model.incompatible.shortTooManyImages', {
                  max: compatibility.maxImages,
                  defaultValue: `最多 ${compatibility.maxImages} 张图片`,
                });
              } else {
                warningMessage = t('model.incompatible.unknown', '模型不兼容');
                shortError = t('model.incompatible.shortUnknown', '不兼容');
              }

              message.results.status.generating -= count;
              message.results.status.failed += count;

              // 创建警告/错误结果
              const warningResults: VideoResult[] = Array(count)
                .fill(null)
                .map((_, index) => ({
                  id: `vid_${Date.now()}_warning_${index}_${Math.random().toString(36).substring(2, 9)}`,
                  taskId: null,
                  videoUrl: null,
                  coverUrl: null,
                  duration: null,
                  status: 'FAIL' as const,
                  progress: 0,
                  error: shortError,
                  errorMessage: warningMessage,
                  isGenerating: false,
                  createdAt: new Date().toISOString(),
                }));

              console.warn(`模型 ${name} 不兼容: ${warningMessage}`);

              // 立即更新 UI 显示警告状态
              const updatedVideos = { ...message.results.videos };
              updatedVideos[name] = warningResults;
              message.results.videos = updatedVideos;
              onUpdateMessageResults(
                message.id,
                { ...message.results, videos: updatedVideos },
                true
              );

              return { [name]: warningResults };
            }

            try {
              // 使用预先上传的图片 URL（所有模型共享）
              const fileInfos = sharedFileInfos;

              return new Promise<{ [key: string]: VideoResult[] }>(resolve => {
                // 初始化结果数组
                const results: VideoResult[] = Array(count)
                  .fill(null)
                  .map((_, index) => createInitialVideoResult(index));

                const streamRequest = {
                  count,
                  onProgress: (
                    update: VideoStatusUpdate,
                    index: number,
                    total: number
                  ) => {
                    console.log(
                      `视频生成进度: ${name} - ${index + 1}/${total}`,
                      update
                    );

                    // 更新对应索引位置的结果
                    results[index] = statusUpdateToVideoResult(
                      update,
                      results[index]
                    );

                    // 如果任务完成或失败，更新状态计数
                    if (update.status === 'FINISH') {
                      if (update.success) {
                        message.results.status.success++;
                      } else {
                        message.results.status.failed++;
                      }
                      message.results.status.generating--;
                    } else if (update.status === 'FAIL') {
                      message.results.status.failed++;
                      message.results.status.generating--;
                    }

                    // 更新消息结果
                    const updatedVideos = { ...message.results.videos };
                    updatedVideos[name] = [...results];
                    message.results.videos = updatedVideos;

                    // 立即更新 UI 显示当前结果
                    onUpdateMessageResults(
                      message.id,
                      { ...message.results, videos: updatedVideos },
                      true
                    );
                  },
                  onComplete: () => {
                    console.log(`视频生成完成: ${name}`);
                    resolve({ [name]: results });
                  },
                  onError: (error: Error) => {
                    console.error(`视频生成出错: ${name}`, error);
                    const errorMessage = error.message || '未知原因';

                    // 将所有未完成的结果标记为错误
                    const errorResults = results.map(result => ({
                      ...result,
                      status: 'FAIL' as const,
                      error: '生成失败',
                      errorMessage,
                      isGenerating: false,
                    }));

                    // 计算未完成的数量
                    const incompleteCount = results.filter(
                      r => r.isGenerating
                    ).length;
                    message.results.status.generating -= incompleteCount;
                    message.results.status.failed += incompleteCount;

                    // 立即更新 UI 显示错误状态
                    const updatedVideos = { ...message.results.videos };
                    updatedVideos[name] = errorResults;
                    message.results.videos = updatedVideos;
                    onUpdateMessageResults(
                      message.id,
                      { ...message.results, videos: updatedVideos },
                      true
                    );

                    resolve({ [name]: errorResults });
                  },
                };

                // 检查该模型是否可以使用尾帧
                const resolution = videoConfig.resolution || '1080P';
                const firstFrameCount = fileInfos?.length || 0;
                const lastFrameCheck = canUseLastFrame(
                  model,
                  resolution,
                  firstFrameCount
                );

                // 构建请求参数
                const videoRequest = {
                  prompt: currentInput,
                  count,
                  fileInfos,
                  // 添加视频配置
                  outputConfig: {
                    resolution,
                    aspectRatio: videoConfig.aspectRatio || '16:9',
                    enhanceSwitch: videoConfig.enhanceSwitch || 'Disabled',
                  },
                  // 负面提示词
                  negativePrompt: videoConfig.negativePrompt || undefined,
                  // 尾帧图片（根据模型限制条件判断）
                  lastFrameUrl: lastFrameCheck.canUse
                    ? sharedLastFrameUrl
                    : undefined,
                  // Kling 特有配置
                  sceneType:
                    model.modelName === 'Kling'
                      ? videoConfig.sceneType
                      : undefined,
                };

                // 调用视频生成服务
                modelApiManager.generateVideoStream(
                  model.id,
                  videoRequest,
                  streamRequest
                );
              });
            } catch (error) {
              console.error(`Error generating videos for model ${id}:`, error);
              const errorMessage =
                error instanceof Error ? error.message : '生成失败';
              message.results.status.generating -= count;
              message.results.status.failed += count;

              // 创建错误结果
              const errorResults: VideoResult[] = Array(count)
                .fill(null)
                .map((_, index) => ({
                  id: `vid_${Date.now()}_error_${index}_${Math.random().toString(36).substring(2, 9)}`,
                  taskId: null,
                  videoUrl: null,
                  coverUrl: null,
                  duration: null,
                  status: 'FAIL' as const,
                  progress: 0,
                  error: '生成失败',
                  errorMessage,
                  isGenerating: false,
                  createdAt: new Date().toISOString(),
                }));

              // 立即更新 UI 显示错误状态
              const updatedVideos = { ...message.results.videos };
              updatedVideos[name] = errorResults;
              message.results.videos = updatedVideos;
              onUpdateMessageResults(
                message.id,
                { ...message.results, videos: updatedVideos },
                true
              );

              return { [name]: errorResults };
            }
          }
        );

        for (const promise of updatePromises) {
          await promise;
        }
      } catch (error) {
        console.error('Error in handleSendMessage:', error);
        onSetInput(currentInput);
      } finally {
        onSetIsSending(false);
        onSetIsGenerating(false);
      }
    },
    [
      user,
      selectedModels,
      designImage,
      uploadedImages,
      lastFrameImage,
      videoConfig,
      hasUploadedImages,
      currentChat,
      onCreateNewChat,
      onNavigate,
      onSendMessage,
      onUpdateMessageResults,
      onSetInput,
      onSetIsSending,
      onSetIsGenerating,
      onScrollToBottom,
      t,
    ]
  );

  // =================================================================================================
  // Keyboard Events
  // =================================================================================================

  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.ctrlKey) {
        e.preventDefault();
        handleSendMessage(e as unknown as FormEvent);
      } else if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        const textarea = e.currentTarget;
        const { selectionStart, selectionEnd, value } = textarea;
        const newValue =
          value.substring(0, selectionStart) +
          '\n' +
          value.substring(selectionEnd);
        onSetInput(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
        }, 0);
      }
    },
    [handleSendMessage, onSetInput]
  );

  // =================================================================================================
  // Textarea Auto-resize
  // =================================================================================================

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      onSetInput(value);

      // Auto-resize textarea
      const textarea = e.target;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
    },
    [onSetInput]
  );

  // =================================================================================================
  // Return Values
  // =================================================================================================

  return {
    textareaRef,
    handleSendMessage,
    handleInputKeyDown,
    handleInputChange,
  };
};
