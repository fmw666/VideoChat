/**
 * @file chatService.ts
 * @description ChatService singleton for managing chat records, messages, and database operations.
 * @author fmw666@github
 * @date 2025-07-17
 */

// =================================================================================================
// Imports
// =================================================================================================

import { supabase } from '@/services/api/supabase';
import { assetsService } from '@/services/assets';
import { authService } from '@/services/auth/authService';

// =================================================================================================
// Constants
// =================================================================================================

const CHAT_TABLE_NAME =
  import.meta.env.VITE_SUPABASE_CHAT_TABLE_NAME || 'chat_msgs';

// =================================================================================================
// Type Definitions
// =================================================================================================

export interface Model {
  id: string;
  name: string;
  count: number;
}

/**
 * 视频结果类型
 * 用于存储视频生成任务的结果信息
 */
export interface VideoResult {
  id: string;
  taskId: string | null; // VOD API 返回的任务 ID
  videoUrl: string | null; // Supabase S3 存储的视频 URL
  coverUrl: string | null; // 视频封面 URL
  duration: number | null; // 视频时长（秒）
  status: 'PROCESSING' | 'FINISH' | 'FAIL'; // 任务状态
  progress: number; // 进度百分比 0-100
  error: string | null;
  errorMessage: string | null;
  isGenerating: boolean;
  createdAt: string | null;
  isFavorite?: boolean;
}

export interface Results {
  videos: {
    [key: string]: VideoResult[];
  };
  status: {
    success: number;
    failed: number;
    total: number;
    generating: number;
  };
}

/**
 * 模型专属配置
 */
export interface ModelSpecificParams {
  modelId: string;
  modelName: string;
  params: Record<string, string | boolean | number>;
}

/**
 * 消息中保存的视频配置
 */
export interface MessageVideoConfig {
  // 通用配置
  resolution?: '720P' | '1080P' | '2K' | '4K';
  aspectRatio?: '16:9' | '9:16' | '1:1';
  enhanceSwitch?: 'Enabled' | 'Disabled';
  negativePrompt?: string;
  audioGeneration?: 'Enabled' | 'Disabled';
  // 模型专属配置
  modelSpecificParams?: ModelSpecificParams[];
}

/**
 * 消息中保存的上传图片信息
 */
export interface MessageUploadedImage {
  id: string;
  url: string; // 云存储 URL
  name: string;
}

export interface Message {
  id: string;
  models: Model[];
  content: string;
  results: Results;
  createdAt: string;
  userImage?: {
    url: string | null;
    alt?: string;
    referenceMessageId: string | null;
    referenceResultId: string | null;
  };
  // 新增：视频配置参数
  videoConfig?: MessageVideoConfig;
  // 新增：上传的首帧图片（图生视频模式）
  uploadedImages?: MessageUploadedImage[];
  // 新增：尾帧图片（首尾帧模式）
  lastFrameImage?: MessageUploadedImage | null;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  user_id: string;
}

// =================================================================================================
// Class Definition
// =================================================================================================

export class ChatService {
  // --------------------------------------------------------------------------------
  // Singleton Instance
  // --------------------------------------------------------------------------------
  private static instance: ChatService;
  private constructor() {}
  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  // --------------------------------------------------------------------------------
  // Chat CRUD Methods
  // --------------------------------------------------------------------------------

  /** 获取用户的所有聊天记录 */
  public async getUserChats(): Promise<Chat[]> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const currentUser = await authService.getCurrentUser();
      if (!currentUser) throw new Error('User not found');

      const { data, error } = await supabase
        .from(CHAT_TABLE_NAME)
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const result = data.map(chat => ({
        ...chat,
        messages: chat.messages || [],
      }));
      return result;
    } catch (error) {
      console.error('Error fetching user chats:', error);
      throw error;
    }
  }

  /** 创建新聊天 */
  public async createChat(
    title: string = '新对话',
    initialMessages: Message[] = []
  ): Promise<Chat> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const currentUser = await authService.getCurrentUser();
      if (!currentUser) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from(CHAT_TABLE_NAME)
        .insert([{ user_id: currentUser.id, title, messages: initialMessages }])
        .select()
        .single();
      if (error) throw error;
      return { ...data, messages: data.messages || [] };
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  /** 更新聊天记录 */
  public async updateChat(
    chatId: string,
    updates: Partial<Chat>
  ): Promise<Chat> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const { data, error } = await supabase
        .from(CHAT_TABLE_NAME)
        .update(updates)
        .eq('id', chatId)
        .select()
        .single();
      if (error) throw error;
      return { ...data, messages: data.messages || [] };
    } catch (error) {
      console.error('Error updating chat:', error);
      throw error;
    }
  }

  /** 添加消息到聊天 */
  public async addMessage(chat: Chat, message: Message): Promise<Chat> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const updatedMessages = [...(chat.messages || []), message];
      const title =
        chat.messages?.length === 0 ? message.content.slice(0, 30) : chat.title;
      const { data, error } = await supabase
        .from(CHAT_TABLE_NAME)
        .update({ messages: updatedMessages, title })
        .eq('id', chat.id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, messages: data.messages || [] };
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  /** delete chat by chatId */
  public async deleteChat(chatId: string): Promise<void> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      // 1. delete related assets records
      const { error: assetsError } = await supabase
        .from('assets')
        .delete()
        .eq('chat_id', chatId);

      if (assetsError) {
        console.error('Error deleting assets:', assetsError);
      }

      // 2. delete chat record
      const { error: chatError } = await supabase
        .from(CHAT_TABLE_NAME)
        .delete()
        .eq('id', chatId);

      if (chatError) throw chatError;
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  }

  /** get chat by chatId */
  public async getChat(chatId: string): Promise<Chat | null> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const { data, error } = await supabase
        .from(CHAT_TABLE_NAME)
        .select('*')
        .eq('id', chatId)
        .single();
      if (error) throw error;
      return data as Chat;
    } catch (error) {
      console.error('Error getting chat:', error);
      return null;
    }
  }

  /** unarchive chat by chatId */
  public async unarchiveChat(chatId: string): Promise<void> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const { error } = await supabase
        .from(CHAT_TABLE_NAME)
        .update({ archived: false })
        .eq('id', chatId);
      if (error) throw error;
    } catch (error) {
      console.error('Error unarchiving chat:', error);
      throw error;
    }
  }

  /** archive chat by chatId */
  public async archiveChat(chatId: string): Promise<void> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const { error } = await supabase
        .from(CHAT_TABLE_NAME)
        .update({ archived: true })
        .eq('id', chatId);

      if (error) throw error;
    } catch (error) {
      console.error('Error archiving chat:', error);
      throw error;
    }
  }

  /** archive all chats */
  public async archiveAllChats(): Promise<void> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const currentUser = await authService.getCurrentUser();
      if (!currentUser) throw new Error('User not authenticated');

      const { error } = await supabase
        .from(CHAT_TABLE_NAME)
        .update({ archived: true })
        .eq('user_id', currentUser.id)
        .eq('archived', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error archiving all chats:', error);
      throw error;
    }
  }

  /** delete all chats */
  public async deleteAllChats(): Promise<void> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const currentUser = await authService.getCurrentUser();
      if (!currentUser) throw new Error('User not authenticated');

      // 1. delete related assets records (only delete assets of unarchived chats)
      const { data: chatsToDelete, error: chatsError } = await supabase
        .from(CHAT_TABLE_NAME)
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('archived', false);

      if (chatsError) throw chatsError;

      if (chatsToDelete && chatsToDelete.length > 0) {
        const chatIds = chatsToDelete.map(chat => chat.id);
        const { error: assetsError } = await supabase
          .from('assets')
          .delete()
          .in('chat_id', chatIds);

        if (assetsError) {
          console.error('Error deleting assets:', assetsError);
        }
      }

      // 2. delete all unarchived chat records
      const { error: chatError } = await supabase
        .from(CHAT_TABLE_NAME)
        .delete()
        .eq('user_id', currentUser.id)
        .eq('archived', false);

      if (chatError) throw chatError;
    } catch (error) {
      console.error('Error deleting all chats:', error);
      throw error;
    }
  }

  /** get archived chats */
  public async getArchivedChats(): Promise<Chat[]> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const currentUser = await authService.getCurrentUser();
      if (!currentUser) throw new Error('User not found');
      const { data, error } = await supabase
        .from(CHAT_TABLE_NAME)
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('archived', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(chat => ({ ...chat, messages: chat.messages || [] }));
    } catch (error) {
      console.error('Error fetching archived chats:', error);
      throw error;
    }
  }

  /**
   * toggle image favorite status
   */
  public async toggleImageFavorite(
    chatId: string,
    messageId: string,
    imageId: string,
    isFavorite: boolean
  ): Promise<Chat> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      // get current chat
      const { data: chat, error } = await supabase
        .from(CHAT_TABLE_NAME)
        .select('*')
        .eq('id', chatId)
        .single();
      if (error || !chat) throw error || new Error('Chat not found');

      // find corresponding message and modify its results
      const messages = (chat.messages || []).map((msg: Message) => {
        if (msg.id !== messageId) return msg;

        // modify video results of the message
        const newResults: Results = {
          ...msg.results,
          videos: Object.fromEntries(
            Object.entries(msg.results.videos).map(([model, vids]) => [
              model,
              vids.map(vid =>
                vid.id === imageId ? { ...vid, isFavorite } : vid
              ),
            ])
          ),
        };

        return { ...msg, results: newResults };
      });

      // find the modified message's results
      const updatedMessage = messages.find(
        (msg: Message) => msg.id === messageId
      );
      if (!updatedMessage) throw new Error('Message not found');

      // only pass results to assets table
      const updatedAsset = await assetsService.updateAssetResults(
        chatId,
        messageId,
        updatedMessage.results
      );
      if (!updatedAsset) {
        console.warn(
          `Failed to update asset results for chat_id: ${chatId}, message_id: ${messageId}`
        );
      }

      // save all messages to CHAT_TABLE_NAME
      const { data: updated, error: updateError } = await supabase
        .from(CHAT_TABLE_NAME)
        .update({ messages })
        .eq('id', chatId)
        .select()
        .single();
      if (updateError) throw updateError;

      return { ...updated, messages: updated.messages || [] };
    } catch (err) {
      console.error('Error toggling image favorite:', err);
      throw err;
    }
  }

  /** unarchive all chats */
  public async unarchiveAllChats(): Promise<void> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const currentUser = await authService.getCurrentUser();
      if (!currentUser) throw new Error('User not authenticated');

      const { error } = await supabase
        .from(CHAT_TABLE_NAME)
        .update({ archived: false })
        .eq('user_id', currentUser.id)
        .eq('archived', true);

      if (error) throw error;
    } catch (error) {
      console.error('Error unarchiving all chats:', error);
      throw error;
    }
  }

  /** delete all archived chats */
  public async deleteAllArchivedChats(): Promise<void> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const currentUser = await authService.getCurrentUser();
      if (!currentUser) throw new Error('User not authenticated');

      // 1. delete related assets records (only delete assets of archived chats)
      const { data: chatsToDelete, error: chatsError } = await supabase
        .from(CHAT_TABLE_NAME)
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('archived', true);

      if (chatsError) throw chatsError;

      if (chatsToDelete && chatsToDelete.length > 0) {
        const chatIds = chatsToDelete.map(chat => chat.id);
        const { error: assetsError } = await supabase
          .from('assets')
          .delete()
          .in('chat_id', chatIds);

        if (assetsError) {
          console.error('Error deleting assets:', assetsError);
        }
      }

      // 2. delete all archived chat records
      const { error: chatError } = await supabase
        .from(CHAT_TABLE_NAME)
        .delete()
        .eq('user_id', currentUser.id)
        .eq('archived', true);

      if (chatError) throw chatError;
    } catch (error) {
      console.error('Error deleting all archived chats:', error);
      throw error;
    }
  }
}

// =================================================================================================
// Singleton Export
// =================================================================================================

export const chatService = ChatService.getInstance();
