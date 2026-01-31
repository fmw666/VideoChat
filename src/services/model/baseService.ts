/**
 * @file baseService.ts
 * @description Base service definitions for video generation services
 * @author fmw666@github
 * @date 2025-07-18
 */

import { VideoTaskStatus } from '@/config/models.types';

// 标准图片响应接口（兼容旧接口）
export interface StandardResponse {
  success: boolean;
  message?: string;
  imageUrl?: string;
  error?: string;
  text?: string;
  createdAt?: string;
}

// 视频任务创建响应
export interface VideoTaskCreateResponse {
  success: boolean;
  message?: string;
  taskId?: string;
  requestId?: string;
  error?: string;
  errorCode?: string;
}

// 视频任务状态响应
export interface VideoTaskStatusResponse {
  success: boolean;
  message?: string;
  taskId?: string;
  status?: VideoTaskStatus;
  progress?: number;          // 进度百分比 0-100
  videoUrl?: string;          // 生成的视频 URL
  coverUrl?: string;          // 视频封面 URL
  duration?: number;          // 视频时长（秒）
  resolution?: string;        // 视频分辨率
  error?: string;
  errorCode?: string;
  createTime?: string;
  finishTime?: string;
}

// 完整的视频生成响应（用于轮询完成后）
export interface VideoGenerationResponse {
  success: boolean;
  message?: string;
  taskId?: string;
  videoUrl?: string;
  coverUrl?: string;
  duration?: number;
  resolution?: string;
  error?: string;
  errorCode?: string;
  totalTime?: number;         // 总耗时（毫秒）
  pollCount?: number;         // 轮询次数
}

// VOD API 原始响应类型
export interface VodApiResponse {
  Response?: {
    TaskId?: string;
    RequestId?: string;
    Error?: {
      Code: string;
      Message: string;
    };
  };
}

// VOD 任务详情原始响应
export interface VodTaskDetailResponse {
  Response?: {
    TaskType?: string;
    TaskId?: string;
    Status?: string;
    CreateTime?: string;
    BeginProcessTime?: string;
    FinishTime?: string;
    RequestId?: string;
    Error?: {
      Code: string;
      Message: string;
    };
    // AIGC 视频任务特有字段
    AigcVideoTask?: {
      TaskId?: string;
      Status?: string;
      ErrCode?: number;
      ErrCodeExt?: string;
      Message?: string;
      Progress?: number;
      Input?: {
        Prompt?: string;
        ModelName?: string;
        ModelVersion?: string;
      };
      Output?: {
        FileInfos?: Array<{
          StorageMode?: string;
          FileId?: string;
          FileUrl?: string;
          FileType?: string;
          ExpireTime?: string;
          MetaData?: {
            Duration?: number;
            Width?: number;
            Height?: number;
            CoverUrl?: string;
          } | null;
        }>;
        CoverUrl?: string;
        Duration?: number;
      };
    };
    // 兼容旧格式（如果有的话）
    Output?: {
      MediaUrl?: string;
      CoverUrl?: string;
      Duration?: number;
      Width?: number;
      Height?: number;
    };
    Progress?: number;
    ErrCode?: number;
    ErrCodeExt?: string;
    Message?: string;
  };
}

// TC3 签名配置
export interface TC3SignatureConfig {
  secretId: string;
  secretKey: string;
  region: string;
  service: string;
  host: string;
  action: string;
  version: string;
  payload: string;
  timestamp: number;
}
