/**
 * @file ChatMessage.tsx
 * @description Renders a single chat message, including user input and AI response with videos and actions.
 * @author fmw666@github
 * @date 2025-07-18
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useState, useCallback, useEffect } from 'react';
import type { FC } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';

// --- Third-party Libraries ---
import { SparklesIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

// --- Internal Libraries ---
// --- Components ---
import { VideoResultItem } from '@/components/features/chat/VideoResultItem';
import { VideoPreview } from '@/components/shared/common/VideoPreview';
import { ImageViewer } from '@/components/shared/common/ImageViewer';
// --- Services ---
import type { VideoResult, Message, Chat } from '@/services/chat';
// --- Store ---
import { useAuthStore } from '@/store/authStore';
// --- Types ---
import type { SelectedVideo, SelectedImage } from '@/types/chat';
// --- Utils ---
import { getAvatarClasses, getAvatarSizeClasses } from '@/utils/avatar';

// =================================================================================================
// Type Definitions
// =================================================================================================

interface ChatMessageProps {
  message: Message;
  userAvatar: string;
  currentChat: Chat | null;
  onEnterDesign?: (image: SelectedImage) => void;
  onJumpToReference?: (messageId: string, resultId: string) => void;
}

// =================================================================================================
// Sub Components
// =================================================================================================

/**
 * 消息参数信息展示组件
 * 展示用户发送消息时的配置参数、模型选择和上传的图片
 */
const MessageParamsDisplay: FC<{
  message: Message;
}> = ({ message }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const hasConfig = message.videoConfig && Object.keys(message.videoConfig).some(
    key => message.videoConfig?.[key as keyof typeof message.videoConfig]
  );
  const hasModels = message.models && message.models.length > 0;
  const hasImages = (message.uploadedImages && message.uploadedImages.length > 0) || message.lastFrameImage;

  // 如果没有任何参数信息，不渲染
  if (!hasConfig && !hasModels && !hasImages) {
    return null;
  }

  // 点击图片放大查看
  const handleImageClick = (url: string, name: string) => {
    setPreviewImage({ url, name });
  };

  // 关闭图片预览
  const handleClosePreview = () => {
    setPreviewImage(null);
  };

  return (
    <>
      {/* 图片预览弹窗 */}
      {previewImage && (
        <ImageViewer
          src={previewImage.url}
          alt={previewImage.name}
          onClose={handleClosePreview}
        />
      )}

      <div className="mt-2 flex flex-col items-end">
        {/* 折叠/展开按钮 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-1"
        >
          <span>{t('chat.params.viewParams', '查看参数')}</span>
          {isExpanded ? (
            <ChevronUpIcon className="w-3 h-3" />
          ) : (
            <ChevronDownIcon className="w-3 h-3" />
          )}
        </button>

        {/* 参数详情面板 */}
        {isExpanded && (
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-left shadow-sm">
            {/* 模型信息 */}
            {hasModels && (
              <div className="mb-3">
                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3" />
                  {t('chat.params.selectedModels', '选用模型')}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {message.models.map((model, index) => (
                    <span
                      key={`${model.id}-${index}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full"
                    >
                      <span>{model.name}</span>
                      {model.count > 1 && (
                        <span className="text-indigo-500 dark:text-indigo-400">×{model.count}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 视频配置 - 通用参数 */}
            {hasConfig && message.videoConfig && (
              <div className="mb-3">
                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t('chat.params.videoConfig', '视频配置')}
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {message.videoConfig.resolution && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">{t('chat.params.resolution', '分辨率')}</span>
                      <span className="text-gray-700 dark:text-gray-300">{message.videoConfig.resolution}</span>
                    </div>
                  )}
                  {message.videoConfig.aspectRatio && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">{t('chat.params.aspectRatio', '宽高比')}</span>
                      <span className="text-gray-700 dark:text-gray-300">{message.videoConfig.aspectRatio}</span>
                    </div>
                  )}
                  {message.videoConfig.enhanceSwitch && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">{t('chat.params.enhanceSwitch', '画质增强')}</span>
                      <span className={`${message.videoConfig.enhanceSwitch === 'Enabled' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                        {message.videoConfig.enhanceSwitch === 'Enabled' ? t('common.enabled', '开启') : t('common.disabled', '关闭')}
                      </span>
                    </div>
                  )}
                  {message.videoConfig.audioGeneration && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">{t('chat.params.audioGeneration', '音频生成')}</span>
                      <span className={`${message.videoConfig.audioGeneration === 'Enabled' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                        {message.videoConfig.audioGeneration === 'Enabled' ? t('common.enabled', '开启') : t('common.disabled', '关闭')}
                      </span>
                    </div>
                  )}
                </div>
                {message.videoConfig.negativePrompt && (
                  <div className="mt-1.5 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{t('chat.params.negativePrompt', '负面提示词')}: </span>
                    <span className="text-gray-600 dark:text-gray-300 italic">{message.videoConfig.negativePrompt}</span>
                  </div>
                )}
              </div>
            )}

            {/* 模型专属参数 */}
            {(() => {
              // 检查新格式的 modelSpecificParams
              const hasNewFormat = message.videoConfig?.modelSpecificParams && message.videoConfig.modelSpecificParams.length > 0;
              // 兼容旧格式：检查 videoConfig 中是否有旧的 sceneType 字段
              const hasOldSceneType = (message.videoConfig as any)?.sceneType;
              
              if (!hasNewFormat && !hasOldSceneType) return null;
              
              return (
                <div className="mb-3">
                  <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                    <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                    {t('chat.params.modelSpecificParams', '模型专属参数')}
                  </h4>
                  <div className="space-y-2">
                    {/* 新格式的模型专属参数 */}
                    {hasNewFormat && message.videoConfig!.modelSpecificParams!.map((modelParam, idx) => (
                      <div 
                        key={`${modelParam.modelId}-${idx}`}
                        className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                            {modelParam.modelName}
                          </span>
                          <span className="text-[10px] px-1 py-0.5 bg-amber-100 dark:bg-amber-800 text-amber-600 dark:text-amber-300 rounded">
                            {t('chat.params.exclusive', '专属')}
                          </span>
                        </div>
                        <div className="text-xs space-y-0.5">
                          {Object.entries(modelParam.params).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">
                                {key === 'sceneType' ? t('chat.params.sceneType', '场景类型') : key}
                              </span>
                              <span className="text-gray-700 dark:text-gray-300">
                                {key === 'sceneType' 
                                  ? (value === 'default' || value === '' 
                                      ? t('chat.params.sceneTypeDefault', '默认') 
                                      : value === 'motion_control' 
                                        ? t('chat.params.sceneTypeMotionControl', '动作控制')
                                        : String(value))
                                  : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {/* 兼容旧格式：显示旧的 sceneType */}
                    {!hasNewFormat && hasOldSceneType && (
                      <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                            Kling
                          </span>
                          <span className="text-[10px] px-1 py-0.5 bg-amber-100 dark:bg-amber-800 text-amber-600 dark:text-amber-300 rounded">
                            {t('chat.params.exclusive', '专属')}
                          </span>
                        </div>
                        <div className="text-xs space-y-0.5">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">
                              {t('chat.params.sceneType', '场景类型')}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300">{(message.videoConfig as any).sceneType}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 上传的图片 */}
            {hasImages && (
              <div>
                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {t('chat.params.uploadedImages', '上传图片')}
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* 首帧图片 */}
                  {message.uploadedImages && message.uploadedImages.length > 0 && (
                    <>
                      {message.uploadedImages.map((img, index) => (
                        <div
                          key={img.id}
                          className="relative group cursor-pointer"
                          onClick={() => handleImageClick(img.url, img.name)}
                          title={t('chat.params.clickToEnlarge', '点击放大查看')}
                        >
                          <div className="w-14 h-14 rounded-lg overflow-hidden border border-indigo-200 dark:border-indigo-700 bg-gray-100 dark:bg-gray-800">
                            <img
                              src={img.url}
                              alt={img.name}
                              className="w-full h-full object-cover transition-transform group-hover:scale-110"
                              loading="lazy"
                            />
                          </div>
                          <span className="absolute -top-1 -left-1 w-4 h-4 bg-indigo-500 text-white text-[10px] rounded-full flex items-center justify-center">
                            {index === 0 ? t('chat.params.firstFrame', '首') : index + 1}
                          </span>
                          {/* 放大图标提示 */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  
                  {/* 尾帧图片 */}
                  {message.lastFrameImage && (
                    <>
                      {message.uploadedImages && message.uploadedImages.length > 0 && (
                        <div className="flex items-center text-gray-300 dark:text-gray-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      )}
                      <div
                        className="relative group cursor-pointer"
                        onClick={() => handleImageClick(message.lastFrameImage!.url, message.lastFrameImage!.name)}
                        title={t('chat.params.clickToEnlarge', '点击放大查看')}
                      >
                        <div className="w-14 h-14 rounded-lg overflow-hidden border-2 border-amber-400 dark:border-amber-500 bg-gray-100 dark:bg-gray-800">
                          <img
                            src={message.lastFrameImage.url}
                            alt={message.lastFrameImage.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            loading="lazy"
                          />
                        </div>
                        <span className="absolute -top-1 -left-1 w-4 h-4 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center">
                          {t('chat.params.lastFrame', '尾')}
                        </span>
                        {/* 放大图标提示 */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

// =================================================================================================
// Component
// =================================================================================================

export const ChatMessage: FC<ChatMessageProps> = ({ 
  message, 
  userAvatar, 
  currentChat: _currentChat,
  onEnterDesign,
  onJumpToReference,
}) => {
  // Note: currentChat is available but currently unused
  void _currentChat;
  // --- State and Refs ---
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null);
  const [isHiddenModelInfo, setIsHiddenModelInfo] = useState(false);

  // --- Hooks ---
  const { t } = useTranslation();
  const { user } = useAuthStore();

  // --- Logic and Event Handlers ---
  const handleJumpToReference = useCallback((messageId: string, resultId: string) => {
    onJumpToReference?.(messageId, resultId);
  }, [onJumpToReference]);

  const handleVideoClick = useCallback((video: SelectedVideo) => {
    if (video.videoUrl) {
      setSelectedVideo(video);
    }
  }, []);

  const handleClosePreview = useCallback(() => {
    setSelectedVideo(null);
  }, []);

  // --- Side Effects ---
  useEffect(() => {
    setIsHiddenModelInfo(user?.user_metadata?.hide_model_info ?? false);
  }, [user]);

  // --- Render Logic ---
  return (
    <>
      {/* Video preview modal */}
      {selectedVideo && selectedVideo.videoUrl && (
        <VideoPreview
          videoUrl={selectedVideo.videoUrl}
          coverUrl={selectedVideo.coverUrl}
          duration={selectedVideo.duration}
          onClose={handleClosePreview}
        />
      )}

      <div className="flex flex-col mb-6">
        {/* User message */}
        <div className="flex justify-end p-3">
          <div className="flex items-start gap-3 max-w-3xl">
            <div className="flex-1 text-right">
              <div className="inline-block bg-indigo-600 text-white text-left rounded-lg px-4 py-2">
                <p className="text-sm">{message.content}</p>
              </div>
              
              {/* 参数信息展示区域 */}
              {(message.videoConfig || message.uploadedImages || message.lastFrameImage || message.models?.length > 0) && (
                <MessageParamsDisplay message={message} />
              )}

              {/* User reference image (设计模式的参考图) */}
              {message.userImage?.url && (
                <div className="mt-3 flex flex-col items-end gap-2">
                  <div
                    className="group relative aspect-square w-48 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 cursor-pointer"
                    onClick={() => onEnterDesign?.({
                      id: message.userImage?.referenceResultId || 'user',
                      url: message.userImage?.url || null,
                      messageId: message.userImage?.referenceMessageId || null,
                      resultId: message.userImage?.referenceResultId || null,
                      isReference: true,
                    })}
                  >
                    <img
                      src={message.userImage.url}
                      alt={message.userImage.alt || 'User uploaded image'}
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {message.userImage?.referenceMessageId && message.userImage?.referenceResultId && (
                      <button
                        onClick={() => handleJumpToReference(message.userImage!.referenceMessageId!, message.userImage!.referenceResultId!)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full transition-colors hover:bg-white dark:hover:bg-gray-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                        </svg>
                        {t('chat.jumpToReference')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex-shrink-0">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                message.userImage ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
              }`}>
                <div className={`${getAvatarClasses()} ${getAvatarSizeClasses('sm')}`}> 
                  <span>{userAvatar}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI response */}
        <div className="flex justify-start p-3">
          <div className={"flex items-start gap-3 max-w-8xl"}>
            <div className="flex-shrink-0">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                message.userImage ? 'bg-gradient-to-br from-cyan-500 to-blue-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'
              }`}>
                <SparklesIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              {/* AI text response */}
              <div className="inline-block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-2 mb-3">
                {message.userImage && (
                  <div className="mb-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    【{t('chat.input.referenceMode')}】
                  </div>
                )}
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {message.results.status?.total > 0 ? (
                    <>
                      {message.results.status?.generating > 0 
                        ? t('chat.generation.videoGenerating')
                        : message.results.status?.failed === message.results.status?.total
                          ? t('chat.generation.failed')
                          : message.results.status?.failed > 0
                            ? t('chat.generation.partialSuccess')
                            : t('chat.generation.videoSuccess')
                      }
                      {isHiddenModelInfo && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({Object.values(message.results.videos).flat().length} {t('chat.videos')})
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      {t('chat.generation.noResults')}
                    </>
                  )}
                </p>
              </div>

              {/* AI video results */}
              {isHiddenModelInfo ? (
                // 隐藏模型信息模式下的视频展示
                <div className="mb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 min-w-[300px]">
                    {Object.values(message.results.videos)
                      .flat()
                      .map((result: VideoResult, index: number) => (
                        <VideoResultItem
                          key={`${result.id}-${index}`}
                          result={result}
                          messageCreatedAt={message.createdAt}
                          onClick={() => handleVideoClick({
                            id: result.id,
                            videoUrl: result.videoUrl,
                            coverUrl: result.coverUrl,
                            duration: result.duration,
                            messageId: message.id,
                            resultId: result.id,
                          })}
                        />
                      ))}
                  </div>
                </div>
              ) : (
                // 显示模型信息模式下的视频展示
                Object.entries(message.results.videos).map(([modelId, results], index) => (
                  <div key={modelId} className="mb-4">
                    {!message.userImage && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-5 w-5 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-500 dark:to-indigo-600 flex items-center justify-center shadow-sm">
                          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                            {index + 1}
                          </span>
                        </div>
                        <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                          <span className="text-indigo-600 dark:text-indigo-400">{modelId}</span>
                          <span className="text-gray-400 dark:text-gray-600">•</span>
                          <span className="text-gray-400 dark:text-gray-500">
                            {results.length} {t('chat.videos')}
                          </span>
                        </h4>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 min-w-[300px]">
                      {results.map((result: VideoResult, resultIndex: number) => (
                        <VideoResultItem
                          key={`${result.id}-${resultIndex}`}
                          result={result}
                          messageCreatedAt={message.createdAt}
                          onClick={() => handleVideoClick({
                            id: result.id,
                            videoUrl: result.videoUrl,
                            coverUrl: result.coverUrl,
                            duration: result.duration,
                            messageId: message.id,
                            resultId: result.id,
                          })}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// =================================================================================================
// Default Export
// =================================================================================================

export default ChatMessage;
