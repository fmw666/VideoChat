/**
 * @file modelApiManager.ts
 * @description Service manager for handling video generation requests with VOD AIGC API
 * @author fmw666@github
 * @date 2025-07-18
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Internal Libraries ---
// --- Services ---
import { AuthMiddleware } from '@/services/auth/authMiddleware';
import { modelManager, type ModelGroupType } from '@/services/model';
import { getDefaultVodAigcClient } from '@/services/model/vodAigcService';
import type { VideoTaskStatusResponse, VideoGenerationResponse } from '@/services/model/baseService';
import { videoTaskService, type CreateVideoTask } from '@/services/model/videoTaskService';
import { storageService } from '@/services/storage';
import { authService } from '@/services/auth/authService';
import type { VideoModelWithDate, VideoOutputConfig } from '@/config/models.types';

// =================================================================================================
// Type Definitions
// =================================================================================================

/** 视频生成状态更新 */
export interface VideoStatusUpdate {
  success: boolean;
  taskId?: string;
  status: 'PROCESSING' | 'FINISH' | 'FAIL';
  progress: number;
  videoUrl?: string;        // Supabase S3 URL (永久)
  coverUrl?: string;        // Supabase S3 URL (永久)
  duration?: number;
  error?: string;
  errorCode?: string;
  createdAt?: string;
}

/** 视频生成请求 */
export interface VideoGenerationRequest {
  prompt: string;
  count?: number;
  enhancePrompt?: 'Enabled' | 'Disabled';
  fileInfos?: Array<{ Type: 'Url'; Url: string }>;
  outputConfig?: Partial<VideoOutputConfig>;
  lastFrameUrl?: string; // 尾帧图片 URL
  negativePrompt?: string; // 负面提示词
  sceneType?: string; // 场景类型（Kling 特有）
}

/** 流式处理回调函数类型 */
export type VideoStreamCallback = (result: VideoStatusUpdate, index: number, total: number) => void;

/** 流式处理请求接口 */
export interface VideoStreamRequest {
  count?: number;
  onProgress?: VideoStreamCallback;
  onComplete?: (response: VideoGenerationResponse) => void;
  onError?: (error: Error) => void;
}

// =================================================================================================
// Constants
// =================================================================================================

const POLLING_INTERVAL = 100; // milliseconds for availability check
const DEFAULT_COUNT = 1;

// =================================================================================================
// Service Manager Class
// =================================================================================================

export class ModelApiManager {
  // --- Private Properties ---
  private static instance: ModelApiManager;
  private activeRequests: Map<ModelGroupType, number>;
  private lastRequestTime: Map<ModelGroupType, number>;
  private authMiddleware: AuthMiddleware;

  // --- Constructor ---
  private constructor() {
    this.activeRequests = new Map();
    this.lastRequestTime = new Map();
    this.authMiddleware = AuthMiddleware.getInstance();

    this.initializeCounters();
  }

  // --- Public Static Methods ---
  public static getInstance(): ModelApiManager {
    if (!ModelApiManager.instance) {
      ModelApiManager.instance = new ModelApiManager();
    }
    return ModelApiManager.instance;
  }

  // --- Private Methods ---
  private initializeCounters(): void {
    Object.keys(modelManager.getAllGroupConfigs()).forEach((group: string) => {
      this.activeRequests.set(group as ModelGroupType, 0);
      this.lastRequestTime.set(group as ModelGroupType, 0);
    });
  }

  private async waitForServiceAvailability(group: ModelGroupType): Promise<void> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const activeCount = this.activeRequests.get(group) || 0;
      const lastRequest = this.lastRequestTime.get(group) || 0;
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequest;
      const modelConfig = modelManager.getModelConfigByGroup(group);

      if (activeCount < modelConfig.maxConcurrent && 
          timeSinceLastRequest >= modelConfig.cooldownMs) {
        break;
      }

      // Wait for a short time before checking again
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
    }
  }

  private async executeRequest<T>(
    group: ModelGroupType,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // First perform authentication check
    const isAuthenticated = await this.authMiddleware.checkAuth();
    if (!isAuthenticated) {
      throw new Error('AUTH_REQUIRED');
    }

    await this.waitForServiceAvailability(group);

    // Update counters
    this.activeRequests.set(group, (this.activeRequests.get(group) || 0) + 1);
    this.lastRequestTime.set(group, Date.now());

    try {
      const result = await requestFn();
      return result;
    } finally {
      // Decrease active requests count
      this.activeRequests.set(group, (this.activeRequests.get(group) || 0) - 1);
    }
  }

  /**
   * 将 VOD 临时 URL 转存到 Supabase S3
   */
  private async uploadToSupabase(
    videoUrl: string | undefined,
    coverUrl: string | undefined
  ): Promise<{ supabaseVideoUrl?: string; supabaseCoverUrl?: string }> {
    const result: { supabaseVideoUrl?: string; supabaseCoverUrl?: string } = {};

    // 上传视频
    if (videoUrl) {
      try {
        const uploadResult = await storageService.uploadVideoFromUrl(videoUrl);
        if (uploadResult.success && uploadResult.url) {
          result.supabaseVideoUrl = uploadResult.url;
          console.log('视频已上传到 Supabase S3:', uploadResult.url);
        } else {
          console.warn('视频上传失败:', uploadResult.error);
        }
      } catch (e) {
        console.error('视频上传异常:', e);
      }
    }

    // 上传封面
    if (coverUrl) {
      try {
        const uploadResult = await storageService.uploadImageFromUrl(coverUrl);
        if (uploadResult.success && uploadResult.url) {
          result.supabaseCoverUrl = uploadResult.url;
          console.log('封面已上传到 Supabase S3:', uploadResult.url);
        } else {
          console.warn('封面上传失败:', uploadResult.error);
        }
      } catch (e) {
        console.error('封面上传异常:', e);
      }
    }

    return result;
  }

  /**
   * 生成单个视频任务
   */
  private async generateSingleVideo(
    model: VideoModelWithDate,
    request: VideoGenerationRequest,
    onStatusUpdate?: (status: VideoStatusUpdate) => void
  ): Promise<VideoStatusUpdate> {
    const vodClient = getDefaultVodAigcClient();
    const startTime = Date.now();

    try {
      // 1. 创建视频任务
      const createResult = await vodClient.createVideoTask({
        model,
        prompt: request.prompt,
        enhancePrompt: request.enhancePrompt,
        fileInfos: request.fileInfos,
        outputConfig: request.outputConfig,
        lastFrameUrl: request.lastFrameUrl,
        sceneType: request.sceneType,
      });

      if (!createResult.success || !createResult.taskId) {
        return {
          success: false,
          status: 'FAIL',
          progress: 0,
          error: createResult.error || '创建任务失败',
          errorCode: createResult.errorCode,
          createdAt: new Date().toISOString(),
        };
      }

      const taskId = createResult.taskId;
      console.log(`视频任务创建成功: ${taskId}`);

      // 2. 尝试记录到数据库（可选，不阻塞主流程）
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          const dbTask: CreateVideoTask = {
            user_id: currentUser.id,
            task_id: taskId,
            request_id: createResult.requestId,
            model_name: model.modelName,
            model_version: model.modelVersion,
            model_id: model.id,
            prompt: request.prompt,
            enhance_prompt: request.enhancePrompt,
            file_infos: request.fileInfos,
            output_config: request.outputConfig as VideoOutputConfig,
          };
          await videoTaskService.createVideoTask(dbTask);
        }
      } catch (dbError) {
        console.warn('记录任务到数据库失败:', dbError);
      }

      // 3. 轮询等待完成，并实时回调进度
      const result = await vodClient.waitForCompletion(
        taskId,
        model,
        (status: VideoTaskStatusResponse) => {
          // 实时回调进度
          if (onStatusUpdate) {
            onStatusUpdate({
              success: status.success,
              taskId,
              status: status.status || 'PROCESSING',
              progress: status.progress || 0,
              error: status.error,
              errorCode: status.errorCode,
              createdAt: new Date().toISOString(),
            });
          }

          // 更新数据库进度（可选）
          videoTaskService.updateTaskProgress(taskId, status.progress || 0).catch(() => {});
        }
      );

      // 4. 处理最终结果
      if (result.success && result.videoUrl) {
        // 上传到 Supabase S3
        const supabaseUrls = await this.uploadToSupabase(result.videoUrl, result.coverUrl);

        // 更新数据库完成状态
        await videoTaskService.markTaskCompleted(taskId, {
          videoUrl: result.videoUrl,
          coverUrl: result.coverUrl,
          duration: result.duration,
          resolution: result.resolution,
          pollCount: result.pollCount,
          totalTimeMs: Date.now() - startTime,
          supabaseVideoUrl: supabaseUrls.supabaseVideoUrl,
          supabaseCoverUrl: supabaseUrls.supabaseCoverUrl,
        }).catch(() => {});

        return {
          success: true,
          taskId,
          status: 'FINISH',
          progress: 100,
          videoUrl: supabaseUrls.supabaseVideoUrl || result.videoUrl,
          coverUrl: supabaseUrls.supabaseCoverUrl || result.coverUrl,
          duration: result.duration,
          createdAt: new Date().toISOString(),
        };
      } else {
        // 更新数据库失败状态
        await videoTaskService.markTaskFailed(taskId, {
          errorCode: result.errorCode,
          errorMessage: result.error || '视频生成失败',
          pollCount: result.pollCount,
          totalTimeMs: Date.now() - startTime,
        }).catch(() => {});

        return {
          success: false,
          taskId,
          status: 'FAIL',
          progress: 0,
          error: result.error || '视频生成失败',
          errorCode: result.errorCode,
          createdAt: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('视频生成错误:', error);
      return {
        success: false,
        status: 'FAIL',
        progress: 0,
        error: error instanceof Error ? error.message : '未知错误',
        createdAt: new Date().toISOString(),
      };
    }
  }

  // --- Public Methods ---

  /**
   * 流式视频生成方法
   * 按顺序生成多个视频，每完成一个立即回调
   */
  public async generateVideoStream(
    modelId: string,
    request: VideoGenerationRequest,
    streamRequest: VideoStreamRequest
  ): Promise<void> {
    // 检查模型状态
    const modelStatus = modelManager.getModelStatus(modelId);
    if (!modelStatus.available) {
      streamRequest.onError?.(new Error(modelStatus.error || '模型不可用'));
      return;
    }

    const model = modelStatus.model!;
    const group = model.group;
    const count = streamRequest.count || request.count || DEFAULT_COUNT;
    const results: VideoStatusUpdate[] = [];

    try {
      for (let i = 0; i < count; i++) {
        try {
          // 等待服务可用并执行请求
          const result = await this.executeRequest(group, async () => {
            return await this.generateSingleVideo(
              model,
              request,
              // 进度回调
              (status) => {
                streamRequest.onProgress?.(status, i, count);
              }
            );
          });

          results.push(result);
          
          // 最终结果回调
          streamRequest.onProgress?.(result, i, count);

        } catch (error) {
          const errorResult: VideoStatusUpdate = {
            success: false,
            status: 'FAIL',
            progress: 0,
            error: error instanceof Error ? error.message : '未知错误',
            createdAt: new Date().toISOString(),
          };
          results.push(errorResult);
          streamRequest.onProgress?.(errorResult, i, count);
        }
      }

      // 完成回调
      const finalResponse: VideoGenerationResponse = {
        success: results.some(r => r.success),
        message: results.every(r => r.success) ? '全部生成成功' : '部分生成失败',
        taskId: results[0]?.taskId,
        videoUrl: results[0]?.videoUrl,
        coverUrl: results[0]?.coverUrl,
        duration: results[0]?.duration,
      };
      streamRequest.onComplete?.(finalResponse);

    } catch (error) {
      streamRequest.onError?.(error as Error);
    }
  }

  /**
   * 非流式视频生成方法
   * 等待所有视频生成完成后返回
   */
  public async generateVideo(
    modelId: string,
    request: VideoGenerationRequest
  ): Promise<VideoGenerationResponse> {
    // 检查模型状态
    const modelStatus = modelManager.getModelStatus(modelId);
    if (!modelStatus.available) {
      return {
        success: false,
        error: modelStatus.error || '模型不可用',
      };
    }

    const model = modelStatus.model!;
    const group = model.group;

    try {
      const result = await this.executeRequest(group, async () => {
        return await this.generateSingleVideo(model, request);
      });

      return {
        success: result.success,
        taskId: result.taskId,
        videoUrl: result.videoUrl,
        coverUrl: result.coverUrl,
        duration: result.duration,
        error: result.error,
        errorCode: result.errorCode,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  public getActiveRequests(group: ModelGroupType): number {
    return this.activeRequests.get(group) || 0;
  }

  public getLastRequestTime(group: ModelGroupType): number {
    return this.lastRequestTime.get(group) || 0;
  }
}

// =================================================================================================
// Singleton Export
// =================================================================================================

export const modelApiManager = ModelApiManager.getInstance();
