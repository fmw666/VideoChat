/**
 * @file videoTaskService.ts
 * @description VideoTaskService for managing video generation task records in database.
 * @author fmw666@github
 * @date 2025-07-18
 */

// =================================================================================================
// Imports
// =================================================================================================

import { supabase } from '@/services/api/supabase';
import { VideoTaskStatus, VideoOutputConfig } from '@/config/models.types';

// =================================================================================================
// Constants
// =================================================================================================

const VIDEO_TASKS_TABLE_NAME = import.meta.env.VITE_SUPABASE_VIDEO_TASKS_TABLE_NAME || 'video_tasks';

// =================================================================================================
// Type Definitions
// =================================================================================================

export interface VideoTask {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  chat_id: string | null;
  message_id: string | null;
  
  // 任务信息
  task_id: string;
  request_id: string | null;
  
  // 模型信息
  model_name: string;
  model_version: string;
  model_id: string | null;
  
  // 输入参数
  prompt: string;
  enhance_prompt: string | null;
  file_infos: Array<{ Type: string; Url: string }> | null;
  output_config: VideoOutputConfig | null;
  
  // 任务状态
  status: VideoTaskStatus;
  progress: number | null;
  error_code: string | null;
  error_message: string | null;
  
  // 输出结果（VOD API 返回的临时 URL）
  video_url: string | null;
  cover_url: string | null;
  duration: number | null;
  resolution: string | null;
  
  // Supabase S3 存储 URL（永久存储）
  supabase_video_url: string | null;
  supabase_cover_url: string | null;
  
  // 统计信息
  poll_count: number | null;
  total_time_ms: number | null;
  finish_time: string | null;
}

export interface CreateVideoTask {
  user_id: string;
  chat_id?: string;
  message_id?: string;
  task_id: string;
  request_id?: string;
  model_name: string;
  model_version: string;
  model_id?: string;
  prompt: string;
  enhance_prompt?: string;
  file_infos?: Array<{ Type: string; Url: string }>;
  output_config?: VideoOutputConfig;
}

export interface UpdateVideoTask {
  status?: VideoTaskStatus;
  progress?: number;
  error_code?: string;
  error_message?: string;
  video_url?: string;
  cover_url?: string;
  duration?: number;
  resolution?: string;
  poll_count?: number;
  total_time_ms?: number;
  finish_time?: string;
  supabase_video_url?: string;
  supabase_cover_url?: string;
}

// =================================================================================================
// Class Definition
// =================================================================================================

export class VideoTaskService {
  // --------------------------------------------------------------------------------
  // Singleton Instance
  // --------------------------------------------------------------------------------
  private static instance: VideoTaskService;
  private constructor() {}
  
  public static getInstance(): VideoTaskService {
    if (!VideoTaskService.instance) {
      VideoTaskService.instance = new VideoTaskService();
    }
    return VideoTaskService.instance;
  }

  // --------------------------------------------------------------------------------
  // Video Task CRUD Methods
  // --------------------------------------------------------------------------------

  /** 创建视频任务记录 */
  public async createVideoTask(task: CreateVideoTask): Promise<VideoTask> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const { data, error } = await supabase
        .from(VIDEO_TASKS_TABLE_NAME)
        .insert([{
          ...task,
          status: 'PROCESSING',
          progress: 0,
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      return data as VideoTask;
    } catch (error) {
      console.error('Error creating video task:', error);
      throw error;
    }
  }

  /** 根据 task_id 获取视频任务 */
  public async getVideoTaskByTaskId(taskId: string): Promise<VideoTask | null> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const { data, error } = await supabase
        .from(VIDEO_TASKS_TABLE_NAME)
        .select('*')
        .eq('task_id', taskId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      return data as VideoTask;
    } catch (error) {
      console.error('Error fetching video task:', error);
      throw error;
    }
  }

  /** 获取用户的所有视频任务 */
  public async getUserVideoTasks(
    userId: string, 
    options?: { 
      limit?: number; 
      offset?: number;
      status?: VideoTaskStatus;
      chatId?: string;
    }
  ): Promise<VideoTask[]> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      let query = supabase
        .from(VIDEO_TASKS_TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      
      if (options?.chatId) {
        query = query.eq('chat_id', options.chatId);
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching user video tasks:', error);
      throw error;
    }
  }

  /** 更新视频任务 */
  public async updateVideoTask(
    taskId: string, 
    updates: UpdateVideoTask
  ): Promise<VideoTask | null> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const { data, error } = await supabase
        .from(VIDEO_TASKS_TABLE_NAME)
        .update(updates)
        .eq('task_id', taskId)
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      return data as VideoTask;
    } catch (error) {
      console.error('Error updating video task:', error);
      throw error;
    }
  }

  /** 标记任务完成 */
  public async markTaskCompleted(
    taskId: string,
    result: {
      videoUrl: string;
      coverUrl?: string;
      duration?: number;
      resolution?: string;
      pollCount?: number;
      totalTimeMs?: number;
      supabaseVideoUrl?: string;
      supabaseCoverUrl?: string;
    }
  ): Promise<VideoTask | null> {
    return this.updateVideoTask(taskId, {
      status: 'FINISH',
      progress: 100,
      video_url: result.videoUrl,
      cover_url: result.coverUrl,
      duration: result.duration,
      resolution: result.resolution,
      poll_count: result.pollCount,
      total_time_ms: result.totalTimeMs,
      finish_time: new Date().toISOString(),
      supabase_video_url: result.supabaseVideoUrl,
      supabase_cover_url: result.supabaseCoverUrl,
    });
  }

  /** 更新 Supabase S3 存储 URL */
  public async updateSupabaseUrls(
    taskId: string,
    urls: {
      supabaseVideoUrl?: string;
      supabaseCoverUrl?: string;
    }
  ): Promise<VideoTask | null> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const updateData: Record<string, string> = {};
      if (urls.supabaseVideoUrl) {
        updateData.supabase_video_url = urls.supabaseVideoUrl;
      }
      if (urls.supabaseCoverUrl) {
        updateData.supabase_cover_url = urls.supabaseCoverUrl;
      }

      if (Object.keys(updateData).length === 0) {
        return this.getVideoTaskByTaskId(taskId);
      }

      const { data, error } = await supabase
        .from(VIDEO_TASKS_TABLE_NAME)
        .update(updateData)
        .eq('task_id', taskId)
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      return data as VideoTask;
    } catch (error) {
      console.error('Error updating Supabase URLs:', error);
      throw error;
    }
  }

  /** 标记任务失败 */
  public async markTaskFailed(
    taskId: string,
    error: {
      errorCode?: string;
      errorMessage: string;
      pollCount?: number;
      totalTimeMs?: number;
    }
  ): Promise<VideoTask | null> {
    return this.updateVideoTask(taskId, {
      status: 'FAIL',
      error_code: error.errorCode,
      error_message: error.errorMessage,
      poll_count: error.pollCount,
      total_time_ms: error.totalTimeMs,
      finish_time: new Date().toISOString(),
    });
  }

  /** 更新任务进度 */
  public async updateTaskProgress(
    taskId: string,
    progress: number,
    pollCount?: number
  ): Promise<VideoTask | null> {
    return this.updateVideoTask(taskId, {
      progress,
      poll_count: pollCount,
    });
  }

  /** 删除视频任务 */
  public async deleteVideoTask(taskId: string): Promise<boolean> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const { error } = await supabase
        .from(VIDEO_TASKS_TABLE_NAME)
        .delete()
        .eq('task_id', taskId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting video task:', error);
      throw error;
    }
  }

  /** 获取用户进行中的任务数量 */
  public async getProcessingTaskCount(userId: string): Promise<number> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const { count, error } = await supabase
        .from(VIDEO_TASKS_TABLE_NAME)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'PROCESSING');
      
      if (error) throw error;
      
      return count || 0;
    } catch (error) {
      console.error('Error counting processing tasks:', error);
      throw error;
    }
  }

  /** 清理用户的过期任务（可选） */
  public async cleanupOldTasks(
    userId: string, 
    daysOld: number = 30
  ): Promise<number> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await supabase
        .from(VIDEO_TASKS_TABLE_NAME)
        .delete()
        .eq('user_id', userId)
        .lt('created_at', cutoffDate.toISOString())
        .select('id');
      
      if (error) throw error;
      
      return data?.length || 0;
    } catch (error) {
      console.error('Error cleaning up old tasks:', error);
      throw error;
    }
  }
}

// =================================================================================================
// Singleton Export
// =================================================================================================

export const videoTaskService = VideoTaskService.getInstance();
