/**
 * @file useVideoTaskRecovery.ts
 * @description Hook for recovering incomplete video generation tasks after page refresh
 * @author fmw666@github
 * @date 2025-07-18
 */

// =================================================================================================
// Imports
// =================================================================================================

import { useEffect, useRef, useCallback } from 'react';
import { getDefaultVodAigcClient } from '@/services/model/vodAigcService';
import { videoTaskService } from '@/services/model/videoTaskService';
import { storageService } from '@/services/storage';
import { modelManager } from '@/services/model';
import type { Chat, Message, Results, VideoResult } from '@/services/chat';

// =================================================================================================
// Types
// =================================================================================================

interface UseVideoTaskRecoveryProps {
  currentChat: Chat | null;
  onUpdateMessageResults: (messageId: string, results: Results, updateInDatabase?: boolean) => Promise<void>;
}

interface RecoveryTask {
  messageId: string;
  modelName: string;
  videoIndex: number;
  taskId: string;
  result: VideoResult;
}

// =================================================================================================
// Hook
// =================================================================================================

export const useVideoTaskRecovery = ({
  currentChat,
  onUpdateMessageResults,
}: UseVideoTaskRecoveryProps) => {
  const isRecoveringRef = useRef(false);
  const recoveredTasksRef = useRef<Set<string>>(new Set());

  /**
   * 从 VOD API 恢复单个任务的状态
   */
  const recoverSingleTask = useCallback(async (
    task: RecoveryTask,
    message: Message
  ): Promise<VideoResult> => {
    const vodClient = getDefaultVodAigcClient();
    
    try {
      console.log(`[Recovery] 正在恢复任务: ${task.taskId}`);
      
      // 获取任务详情
      const status = await vodClient.describeTaskDetail(task.taskId);
      
      if (!status.success) {
        console.warn(`[Recovery] 查询任务状态失败: ${task.taskId}`, status.error);
        return {
          ...task.result,
          status: 'FAIL',
          error: '任务状态查询失败',
          errorMessage: status.error || '无法恢复任务状态',
          isGenerating: false,
        };
      }

      // 任务仍在处理中，继续轮询
      if (status.status === 'PROCESSING') {
        console.log(`[Recovery] 任务仍在处理中: ${task.taskId}, 进度: ${status.progress}%`);
        
        // 获取模型配置用于轮询
        const model = modelManager.getModelById(message.models[0]?.id || '');
        
        if (model) {
          // 继续等待完成
          const finalResult = await vodClient.waitForCompletion(
            task.taskId,
            model,
            (progressStatus) => {
              console.log(`[Recovery] 任务进度更新: ${task.taskId}, ${progressStatus.progress}%`);
            }
          );

          if (finalResult.success && finalResult.videoUrl) {
            // 上传到 Supabase S3
            let supabaseVideoUrl = finalResult.videoUrl;
            let supabaseCoverUrl = finalResult.coverUrl;

            try {
              const videoUpload = await storageService.uploadVideoFromUrl(finalResult.videoUrl);
              if (videoUpload.success && videoUpload.url) {
                supabaseVideoUrl = videoUpload.url;
              }
              
              if (finalResult.coverUrl) {
                const coverUpload = await storageService.uploadImageFromUrl(finalResult.coverUrl);
                if (coverUpload.success && coverUpload.url) {
                  supabaseCoverUrl = coverUpload.url;
                }
              }
            } catch (uploadError) {
              console.warn('[Recovery] 上传到 Supabase 失败:', uploadError);
            }

            // 更新数据库
            await videoTaskService.markTaskCompleted(task.taskId, {
              videoUrl: finalResult.videoUrl,
              coverUrl: finalResult.coverUrl,
              duration: finalResult.duration,
              supabaseVideoUrl,
              supabaseCoverUrl,
            }).catch(() => {});

            return {
              ...task.result,
              status: 'FINISH',
              progress: 100,
              videoUrl: supabaseVideoUrl,
              coverUrl: supabaseCoverUrl || null,
              duration: finalResult.duration || null,
              isGenerating: false,
            };
          } else {
            await videoTaskService.markTaskFailed(task.taskId, {
              errorCode: finalResult.errorCode,
              errorMessage: finalResult.error || '视频生成失败',
            }).catch(() => {});

            return {
              ...task.result,
              status: 'FAIL',
              error: '生成失败',
              errorMessage: finalResult.error || '视频生成失败',
              isGenerating: false,
            };
          }
        }
      }

      // 任务已完成
      if (status.status === 'FINISH' && status.videoUrl) {
        console.log(`[Recovery] 任务已完成: ${task.taskId}`);
        
        // 检查是否已有 Supabase URL
        const dbTask = await videoTaskService.getVideoTaskByTaskId(task.taskId);
        let finalVideoUrl = dbTask?.supabase_video_url || status.videoUrl;
        let finalCoverUrl = dbTask?.supabase_cover_url || status.coverUrl;

        // 如果没有 Supabase URL，尝试上传
        if (!dbTask?.supabase_video_url && status.videoUrl) {
          try {
            const videoUpload = await storageService.uploadVideoFromUrl(status.videoUrl);
            if (videoUpload.success && videoUpload.url) {
              finalVideoUrl = videoUpload.url;
              await videoTaskService.updateSupabaseUrls(task.taskId, {
                supabaseVideoUrl: videoUpload.url,
              });
            }
          } catch (e) {
            console.warn('[Recovery] 上传视频失败:', e);
          }
        }

        if (!dbTask?.supabase_cover_url && status.coverUrl) {
          try {
            const coverUpload = await storageService.uploadImageFromUrl(status.coverUrl);
            if (coverUpload.success && coverUpload.url) {
              finalCoverUrl = coverUpload.url;
              await videoTaskService.updateSupabaseUrls(task.taskId, {
                supabaseCoverUrl: coverUpload.url,
              });
            }
          } catch (e) {
            console.warn('[Recovery] 上传封面失败:', e);
          }
        }

        return {
          ...task.result,
          status: 'FINISH',
          progress: 100,
          videoUrl: finalVideoUrl || null,
          coverUrl: finalCoverUrl || null,
          duration: status.duration || null,
          isGenerating: false,
        };
      }

      // 任务失败
      if (status.status === 'FAIL') {
        console.log(`[Recovery] 任务已失败: ${task.taskId}`);
        return {
          ...task.result,
          status: 'FAIL',
          error: '生成失败',
          errorMessage: status.error || '任务执行失败',
          isGenerating: false,
        };
      }

      // 未知状态，返回当前进度
      return {
        ...task.result,
        progress: status.progress || task.result.progress,
      };

    } catch (error) {
      console.error(`[Recovery] 恢复任务异常: ${task.taskId}`, error);
      return {
        ...task.result,
        status: 'FAIL',
        error: '恢复失败',
        errorMessage: error instanceof Error ? error.message : '任务恢复异常',
        isGenerating: false,
      };
    }
  }, []);

  /**
   * 恢复聊天中所有未完成的任务
   */
  const recoverTasks = useCallback(async () => {
    if (!currentChat || isRecoveringRef.current) return;
    
    // 收集所有需要恢复的任务
    const tasksToRecover: Array<{ message: Message; task: RecoveryTask }> = [];

    // 收集没有 taskId 但仍在生成中且创建时间较早的任务（需要标记为失败）
    // 任务创建超过此时间（毫秒）且没有 taskId，视为丢失的任务
    const TASK_CREATION_TIMEOUT_MS = 60 * 1000; // 60 秒
    const tasksToMarkFailed: Array<{ message: Message; modelName: string; videoIndex: number; result: VideoResult }> = [];

    for (const message of currentChat.messages) {
      if (!message.results?.videos) continue;

      for (const [modelName, videos] of Object.entries(message.results.videos)) {
        videos.forEach((video, index) => {
          if (video.isGenerating) {
            const taskKey = `${message.id}-${video.id}`;
            
            // 避免重复处理
            if (recoveredTasksRef.current.has(taskKey)) return;

            // 有 taskId 的任务可以恢复
            if (video.taskId) {
              recoveredTasksRef.current.add(taskKey);
              tasksToRecover.push({
                message,
                task: {
                  messageId: message.id,
                  modelName,
                  videoIndex: index,
                  taskId: video.taskId,
                  result: video,
                }
              });
            } else {
              // 没有 taskId，检查是否是刚创建的任务
              // 使用消息创建时间作为参考（视频创建时间可能为 null）
              const messageCreatedAt = new Date(message.createdAt).getTime();
              const timeSinceCreation = Date.now() - messageCreatedAt;
              
              if (timeSinceCreation > TASK_CREATION_TIMEOUT_MS) {
                // 创建时间超过阈值，视为丢失的任务
                recoveredTasksRef.current.add(taskKey);
                console.warn(`[Recovery] 任务 ${video.id} 没有 taskId 且创建时间已超过 ${TASK_CREATION_TIMEOUT_MS / 1000} 秒，将标记为失败`);
                tasksToMarkFailed.push({
                  message,
                  modelName,
                  videoIndex: index,
                  result: video,
                });
              } else {
                // 刚创建的任务，可能正在等待 API 返回 taskId，暂不处理
                console.log(`[Recovery] 任务 ${video.id} 没有 taskId 但创建时间较短（${Math.round(timeSinceCreation / 1000)}秒），可能正在创建中，跳过`);
              }
            }
          }
        });
      }
    }

    // 处理没有 taskId 的丢失任务，标记为失败
    if (tasksToMarkFailed.length > 0) {
      console.log(`[Recovery] 发现 ${tasksToMarkFailed.length} 个无法恢复的任务（无 taskId 且已超时），将标记为失败`);
      
      // 按消息分组
      const failedMessageGroups = new Map<string, Array<{ modelName: string; videoIndex: number; result: VideoResult }>>();
      for (const item of tasksToMarkFailed) {
        const existing = failedMessageGroups.get(item.message.id) || [];
        existing.push(item);
        failedMessageGroups.set(item.message.id, existing);
      }

      // 更新每个消息
      for (const [messageId, items] of failedMessageGroups) {
        const message = currentChat.messages.find(m => m.id === messageId);
        if (!message) continue;

        const updatedVideos = { ...message.results.videos };
        
        for (const item of items) {
          const modelVideos = [...(updatedVideos[item.modelName] || [])];
          modelVideos[item.videoIndex] = {
            ...item.result,
            status: 'FAIL',
            error: '任务丢失',
            errorMessage: '页面刷新时任务尚未创建完成，无法恢复',
            isGenerating: false,
          };
          updatedVideos[item.modelName] = modelVideos;
        }

        // 重新计算状态
        const allVideos = Object.values(updatedVideos).flat();
        const updatedResults: Results = {
          ...message.results,
          videos: updatedVideos,
          status: {
            total: allVideos.length,
            success: allVideos.filter(v => v.status === 'FINISH' && v.videoUrl).length,
            failed: allVideos.filter(v => v.status === 'FAIL' || v.error).length,
            generating: allVideos.filter(v => v.isGenerating).length,
          }
        };

        await onUpdateMessageResults(messageId, updatedResults, true);
        console.log(`[Recovery] 消息 ${messageId} 的无效任务已标记为失败`);
      }
    }

    if (tasksToRecover.length === 0) return;

    console.log(`[Recovery] 发现 ${tasksToRecover.length} 个需要恢复的任务`);
    isRecoveringRef.current = true;

    try {
      // 按消息分组处理
      const messageGroups = new Map<string, Array<{ task: RecoveryTask; message: Message }>>();
      
      for (const item of tasksToRecover) {
        const existing = messageGroups.get(item.message.id) || [];
        existing.push(item);
        messageGroups.set(item.message.id, existing);
      }

      // 并行恢复每个消息中的任务
      for (const [messageId, items] of messageGroups) {
        const message = items[0].message;
        const recoveryPromises = items.map(({ task }) => 
          recoverSingleTask(task, message)
        );

        const recoveredResults = await Promise.all(recoveryPromises);

        // 更新消息结果
        const updatedVideos = { ...message.results.videos };
        
        items.forEach(({ task }, idx) => {
          const modelVideos = [...(updatedVideos[task.modelName] || [])];
          modelVideos[task.videoIndex] = recoveredResults[idx];
          updatedVideos[task.modelName] = modelVideos;
        });

        // 重新计算状态
        const allVideos = Object.values(updatedVideos).flat();
        const updatedResults: Results = {
          ...message.results,
          videos: updatedVideos,
          status: {
            total: allVideos.length,
            success: allVideos.filter(v => v.status === 'FINISH' && v.videoUrl).length,
            failed: allVideos.filter(v => v.status === 'FAIL' || v.error).length,
            generating: allVideos.filter(v => v.isGenerating).length,
          }
        };

        // 更新 UI 和数据库
        await onUpdateMessageResults(messageId, updatedResults, true);
        console.log(`[Recovery] 消息 ${messageId} 的任务已恢复`);
      }

    } finally {
      isRecoveringRef.current = false;
    }
  }, [currentChat, recoverSingleTask, onUpdateMessageResults]);

  // 当聊天切换或页面加载时自动恢复
  useEffect(() => {
    if (currentChat) {
      // 延迟执行，确保 UI 已渲染
      const timer = setTimeout(() => {
        recoverTasks();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [currentChat?.id]); // 只在聊天 ID 变化时触发

  return {
    recoverTasks,
    isRecovering: isRecoveringRef.current,
  };
};

export default useVideoTaskRecovery;
