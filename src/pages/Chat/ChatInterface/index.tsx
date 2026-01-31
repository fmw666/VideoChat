/**
 * @file ChatInterface.tsx
 * @description ChatInterface component, responsible for the main chat UI, message handling, and user interaction.
 * @author fmw666@github
 * @date 2025-07-18
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useState, useCallback, useEffect } from 'react';
import type { FC } from 'react';

// --- Third-party Libraries ---
import { useTranslation } from 'react-i18next';

import { AnimatePresence, motion } from 'framer-motion';

// --- Internal Libraries ---
import { ArchivedChatInterface } from '@/components/features/chat/ArchivedChatInterface';
import { ChatInput } from '@/components/features/chat/ChatInput';
import { ChatMessage } from '@/components/features/chat/ChatMessage';
import ChatTitle from '@/components/features/chat/ChatTitle';
import { NewChatGuide } from '@/components/features/chat/NewChatGuide';
import { SuccessToast } from '@/components/features/chat/SuccessToast';
import { ImagePreview } from '@/components/shared/common/ImagePreview';
import type { UploadedImage } from '@/config/models.types';
import { useAuth } from '@/hooks/auth';
import {
  useChat,
  useChatInput,
  useChatNavigation,
  useChatScroll,
  useVideoTaskRecovery,
} from '@/hooks/chat';
import { useImagePreview } from '@/hooks/ui';
import type { Message } from '@/services/chat';
// eslint-disable-next-line import/order
import type { SelectedModel } from '@/types/chat';

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
// --- Utils ---
import { getAvatarText } from '@/utils/avatar';

// --- Relative Imports ---
import ChatLoading from './ChatLoading';
import ScrollingOverlay from './ScrollingOverlay';

// =================================================================================================
// Type Definitions
// =================================================================================================

interface ChatInterfaceProps {
  chatId?: string;
}

// =================================================================================================
// Constants
// =================================================================================================

const IS_MOBILE = typeof window !== 'undefined' && window.innerWidth <= 768;
const SELECTED_MODELS_STORAGE_KEY = 'videochat_selected_models';

// =================================================================================================
// Helper Functions
// =================================================================================================

/**
 * 从 localStorage 读取已选择的模型
 */
const loadSelectedModelsFromStorage = (): SelectedModel[] => {
  try {
    const stored = localStorage.getItem(SELECTED_MODELS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 验证数据格式
      if (
        Array.isArray(parsed) &&
        parsed.every(m => m.id && typeof m.count === 'number')
      ) {
        // 确保 count 至少为 1
        return parsed.map(m => ({
          ...m,
          count: Math.max(1, m.count),
        }));
      }
    }
  } catch (e) {
    console.warn('Failed to load selected models from localStorage:', e);
  }
  return [];
};

/**
 * 保存已选择的模型到 localStorage
 */
const saveSelectedModelsToStorage = (models: SelectedModel[]): void => {
  try {
    localStorage.setItem(SELECTED_MODELS_STORAGE_KEY, JSON.stringify(models));
  } catch (e) {
    console.warn('Failed to save selected models to localStorage:', e);
  }
};

// =================================================================================================
// Component
// =================================================================================================

export const ChatInterface: FC<ChatInterfaceProps> = ({ chatId }) => {
  // --------------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------------

  const [input, setInput] = useState('');
  const [selectedModels, setSelectedModels] = useState<SelectedModel[]>(() =>
    loadSelectedModelsFromStorage()
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isShowLoading, setIsShowLoading] = useState(false);
  const [hasLoadingTimedOut, setHasLoadingTimedOut] = useState(false);
  const [isUnarchiving, setIsUnarchiving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  // 新增：图片上传和视频配置
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [lastFrameImage, setLastFrameImage] = useState<UploadedImage | null>(
    null
  );
  const [videoConfig, setVideoConfig] = useState<ExtendedVideoConfig>({
    resolution: '1080P',
    aspectRatio: '16:9',
    enhanceSwitch: 'Disabled',
    audioGeneration: 'Disabled',
    negativePrompt: '',
    sceneType: '',
  });

  // --------------------------------------------------------------------------------
  // Hooks
  // --------------------------------------------------------------------------------

  const { t } = useTranslation();
  const {
    user,
    isLoading: userLoading,
    isInitialized: userInitialized,
  } = useAuth();
  const {
    chats,
    currentChat,
    isArchivedChat,
    isLoading: chatLoading,
    isInitialized: chatInitialized,
    addMessage,
    updateMessageResults,
    createNewChat,
    getArchivedChatById,
    unarchiveChat,
    switchChatById,
    switchChat,
  } = useChat();

  // Custom hooks
  const { messagesEndRef, scrollMessagesToBottom } = useChatScroll(
    currentChat,
    {
      setIsScrolling,
      setIsShowLoading,
      setHasLoadingTimedOut,
    }
  );

  const { navigate } = useChatNavigation({
    chatId,
    user,
    userLoading,
    userInitialized,
    chats,
    currentChat,
    chatLoading,
    chatInitialized,
    isArchivedChat,
    switchChatById,
    getArchivedChatById,
    switchChat,
  });

  const {
    designImage,
    isDesignImageMenuVisible,
    selectedImage,
    handleDesignModeEnter,
    handleDesignImageClose,
    handleSelectedImageClose,
    handleEnterDesignFromPreview,
    handleReferenceJump,
    setDesignImage,
  } = useImagePreview({ currentChat, user });

  // Create wrapper functions to handle type compatibility
  const handleUpdateMessageResultsForRecovery = useCallback(
    async (messageId: string, results: any, updateInDatabase?: boolean) => {
      await updateMessageResults(messageId, results, updateInDatabase);
    },
    [updateMessageResults]
  );

  // Video task recovery - automatically resume incomplete tasks after page refresh
  useVideoTaskRecovery({
    currentChat,
    onUpdateMessageResults: handleUpdateMessageResultsForRecovery,
  });

  // Create wrapper functions to handle type compatibility
  const handleSendMessageWrapper = useCallback(
    async (message: Message) => {
      if (user) {
        await addMessage(message);
      }
    },
    [user, addMessage]
  );

  const handleUpdateMessageResultsWrapper = useCallback(
    async (messageId: string, results: any, updateInDatabase?: boolean) => {
      if (user) {
        await updateMessageResults(messageId, results, updateInDatabase);
      }
    },
    [user, updateMessageResults]
  );

  const handleCreateNewChatWrapper = useCallback(
    async (title: string, initialMessages: Message[]) => {
      if (user) {
        return await createNewChat(title, initialMessages);
      }
      return null;
    },
    [user, createNewChat]
  );

  const {
    textareaRef,
    handleSendMessage,
    handleInputKeyDown,
    handleInputChange,
  } = useChatInput({
    user,
    currentChat,
    selectedModels,
    designImage,
    uploadedImages,
    lastFrameImage,
    videoConfig,
    onSendMessage: handleSendMessageWrapper,
    onUpdateMessageResults: handleUpdateMessageResultsWrapper,
    onCreateNewChat: handleCreateNewChatWrapper,
    onNavigate: navigate,
    onSetInput: setInput,
    onSetIsGenerating: setIsGenerating,
    onSetIsSending: setIsSending,
    onScrollToBottom: scrollMessagesToBottom,
  });

  // --------------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------------

  const handleRefresh = useCallback(() => {
    setHasLoadingTimedOut(false);
    scrollMessagesToBottom();
  }, [scrollMessagesToBottom]);

  // 处理模型变更并保存到 localStorage
  const handleModelChange = useCallback((models: SelectedModel[]) => {
    setSelectedModels(models);
    saveSelectedModelsToStorage(models);
  }, []);

  // 处理图片上传变化
  const handleUploadedImagesChange = useCallback((images: UploadedImage[]) => {
    setUploadedImages(images);
  }, []);

  // 处理尾帧图片变化
  const handleLastFrameImageChange = useCallback(
    (image: UploadedImage | null) => {
      setLastFrameImage(image);
    },
    []
  );

  // 处理视频配置变化
  const handleVideoConfigChange = useCallback((config: ExtendedVideoConfig) => {
    setVideoConfig(config);
  }, []);

  const handleUnarchiveChat = useCallback(async () => {
    if (!currentChat) return;

    try {
      setIsUnarchiving(true);
      await unarchiveChat(currentChat.id);
      // 取消归档后，store 会自动更新状态和聊天列表
      // 添加短暂的成功反馈
      setTimeout(() => {
        setIsUnarchiving(false);
        // 延迟显示成功提示，确保状态切换完成
        setTimeout(() => {
          setShowSuccessToast(true);
        }, 300);
      }, 500);
    } catch (error) {
      console.error('Error unarchiving chat:', error);
      setIsUnarchiving(false);
    }
  }, [currentChat, unarchiveChat]);

  // --------------------------------------------------------------------------------
  // Side Effects
  // --------------------------------------------------------------------------------

  // 首次加载聊天时滚动到底部
  useEffect(() => {
    if (currentChat?.id && !hasInitiallyLoaded) {
      scrollMessagesToBottom();
      // 标记首次加载完成，之后不再显示 ScrollingOverlay
      const timer = setTimeout(() => {
        setHasInitiallyLoaded(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentChat?.id, hasInitiallyLoaded, scrollMessagesToBottom]);

  // 切换聊天时重置首次加载标记
  useEffect(() => {
    setHasInitiallyLoaded(false);
  }, [chatId]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSending || isGenerating) {
        e.preventDefault();
        e.returnValue = t('chat.generation.leaveWarning');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSending, isGenerating, t]);

  // 监听归档状态变化，重置成功提示
  useEffect(() => {
    if (!isArchivedChat) {
      setShowSuccessToast(false);
    }
  }, [isArchivedChat]);

  // 重置设计图片状态
  useEffect(() => {
    setDesignImage(null);
  }, [currentChat?.id, setDesignImage]);

  // --------------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------------

  if (chatLoading) {
    return <ChatLoading />;
  }

  return (
    <div className="flex flex-col h-full w-full">
      <ChatTitle />

      <div className="flex-1 overflow-y-auto p-4 relative bg-gray-50 dark:bg-gray-800">
        {/* 只在首次加载时显示滚动加载覆盖层 */}
        {isScrolling && isShowLoading && !hasInitiallyLoaded && (
          <ScrollingOverlay
            hasTimedOut={hasLoadingTimedOut}
            onRefresh={handleRefresh}
          />
        )}

        {!user || !currentChat || !currentChat.messages.length ? (
          <NewChatGuide />
        ) : (
          <>
            {currentChat.messages.map(message => (
              <ChatMessage
                key={message.id}
                message={message}
                userAvatar={getAvatarText(user)}
                currentChat={currentChat}
                onEnterDesign={handleDesignModeEnter}
                onJumpToReference={handleReferenceJump}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Success Toast */}
      <SuccessToast
        show={showSuccessToast}
        onHide={() => setShowSuccessToast(false)}
        message={t('chat.archived.unarchiveSuccess')}
      />

      <AnimatePresence mode="wait">
        {isArchivedChat ? (
          // 归档聊天状态 - 显示取消归档界面
          <motion.div
            key="archived"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <ArchivedChatInterface
              isUnarchiving={isUnarchiving}
              onUnarchiveChat={handleUnarchiveChat}
            />
          </motion.div>
        ) : (
          // 正常聊天状态 - 显示输入界面
          <motion.div
            key="normal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <ChatInput
              input={input}
              selectedModels={selectedModels}
              designImage={designImage}
              isGenerating={isGenerating}
              isSending={isSending}
              user={user}
              textareaRef={textareaRef}
              onInputChange={handleInputChange}
              onInputKeyDown={handleInputKeyDown}
              onSendMessage={handleSendMessage}
              onModelChange={handleModelChange}
              onDesignImageClose={handleDesignImageClose}
              isDesignImageMenuVisible={isDesignImageMenuVisible}
              isMobile={IS_MOBILE}
              uploadedImages={uploadedImages}
              onUploadedImagesChange={handleUploadedImagesChange}
              lastFrameImage={lastFrameImage}
              onLastFrameImageChange={handleLastFrameImageChange}
              videoConfig={videoConfig}
              onVideoConfigChange={handleVideoConfigChange}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal for Design Image */}
      {selectedImage && (
        <ImagePreview
          message={{
            id: selectedImage.imageId,
            content: selectedImage.asset.content,
            createdAt: selectedImage.asset.created_at,
            models: selectedImage.asset.models,
            results: selectedImage.asset.results,
            userImage: selectedImage.asset.user_image,
          }}
          initialImageId={selectedImage.imageId}
          isReference={false}
          onClose={handleSelectedImageClose}
          onDesignClick={handleEnterDesignFromPreview}
          alt={selectedImage.asset.content}
        />
      )}
    </div>
  );
};

export default ChatInterface;
