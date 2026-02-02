/**
 * @file vodAigcService.ts
 * @description VOD AIGC 视频生成服务，基于腾讯云 VOD API
 * @author fmw666@github
 * @date 2025-07-18
 * 
 * 参考文档：
 * - https://cloud.tencent.com/document/product/266/126239
 * - https://cloud.tencent.com/document/product/266/33431
 */

import {
  VideoTaskCreateResponse,
  VideoTaskStatusResponse,
  VideoGenerationResponse,
  VodApiResponse,
  VodTaskDetailResponse,
  TC3SignatureConfig,
} from './baseService';
import {
  VideoModelWithDate,
  VideoTaskStatus,
  VideoOutputConfig,
  GroupConfig,
} from '@/config/models.types';
import { getGroupConfig } from '@/config/modelsLoader';

// =================================================================================================
// 类型定义
// =================================================================================================

export interface VodAigcClientConfig {
  secretId: string;
  secretKey: string;
  subAppId: number;
  region?: string;
  endpointHost?: string;
  requestUrl?: string;        // 代理地址，开发环境使用
}

export interface CreateVideoTaskParams {
  model: VideoModelWithDate;
  prompt: string;
  enhancePrompt?: 'Enabled' | 'Disabled';
  fileInfos?: Array<{
    Type: 'Url';
    Url: string;
    ObjectId?: string; // Vidu 模型的主体 ID
  }>;
  lastFrameUrl?: string; // 尾帧图片 URL（GV、Kling 2.1、Vidu q2-pro/q2-turbo 支持）
  outputConfig?: Partial<VideoOutputConfig>;
  sceneType?: string; // 场景类型（Kling 特有，如 motion_control）
}

// =================================================================================================
// 工具函数
// =================================================================================================

/**
 * 将字符串编码为 UTF-8 字节数组
 */
function utf8Encode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * 将字节数组转换为十六进制字符串
 */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * SHA256 哈希
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = utf8Encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer as BufferSource);
  return toHex(new Uint8Array(hashBuffer));
}

/**
 * HMAC-SHA256 签名
 */
async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, utf8Encode(message) as BufferSource);
}

/**
 * 生成 TC3-HMAC-SHA256 签名
 */
async function generateTC3Signature(config: TC3SignatureConfig): Promise<{
  authorization: string;
  timestamp: string;
}> {
  const { secretId, secretKey, region: _region, service, host, action: _action, version: _version, payload, timestamp } = config;
  // Note: _region, _action, _version are unused but part of the TC3 signature config
  void _region; void _action; void _version;
  
  const date = new Date(timestamp * 1000).toISOString().split('T')[0];
  const credentialScope = `${date}/${service}/tc3_request`;
  
  // Step 1: 拼接规范请求串
  const httpRequestMethod = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const contentType = 'application/json';
  const hashedRequestPayload = await sha256(payload);
  
  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    '',
  ].join('\n');
  
  const signedHeaders = 'content-type;host';
  
  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload,
  ].join('\n');
  
  // Step 2: 拼接待签名字符串
  const algorithm = 'TC3-HMAC-SHA256';
  const hashedCanonicalRequest = await sha256(canonicalRequest);
  
  const stringToSign = [
    algorithm,
    timestamp.toString(),
    credentialScope,
    hashedCanonicalRequest,
  ].join('\n');
  
  // Step 3: 计算签名
  const secretDate = await hmacSha256(utf8Encode(`TC3${secretKey}`), date);
  const secretService = await hmacSha256(secretDate, service);
  const secretSigning = await hmacSha256(secretService, 'tc3_request');
  const signature = toHex(new Uint8Array(await hmacSha256(secretSigning, stringToSign)));
  
  // Step 4: 拼接 Authorization
  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  return {
    authorization,
    timestamp: timestamp.toString(),
  };
}

// =================================================================================================
// VodAigcService 类
// =================================================================================================

export class VodAigcService {
  private config: Required<VodAigcClientConfig>;
  
  constructor(config: VodAigcClientConfig) {
    this.config = {
      region: 'ap-guangzhou',
      endpointHost: 'vod.ap-guangzhou.tencentcloudapi.com',
      // 开发和生产环境都使用代理路径，避免 CORS 问题
      requestUrl: '/api/vod',
      ...config,
    };
  }

  // --------------------------------------------------------------------------------
  // 私有方法
  // --------------------------------------------------------------------------------

  /**
   * 发送 VOD API 请求
   */
  private async sendRequest<T>(action: string, payload: Record<string, unknown>): Promise<T> {
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadJson = JSON.stringify(payload);
    
    const { authorization } = await generateTC3Signature({
      secretId: this.config.secretId,
      secretKey: this.config.secretKey,
      region: this.config.region,
      service: 'vod',
      host: this.config.endpointHost,
      action,
      version: '2018-07-17',
      payload: payloadJson,
      timestamp,
    });
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': authorization,
      'X-TC-Action': action,
      'X-TC-Timestamp': timestamp.toString(),
      'X-TC-Version': '2018-07-17',
      'X-TC-Region': this.config.region,
    };
    
    const response = await fetch(this.config.requestUrl, {
      method: 'POST',
      headers,
      body: payloadJson,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json() as T;
  }

  // --------------------------------------------------------------------------------
  // 公共方法
  // --------------------------------------------------------------------------------

  /**
   * 创建 AIGC 视频生成任务
   */
  async createVideoTask(params: CreateVideoTaskParams): Promise<VideoTaskCreateResponse> {
    try {
      const { 
        model, 
        prompt, 
        enhancePrompt = 'Enabled', 
        fileInfos = [], 
        lastFrameUrl,
        outputConfig = {},
        sceneType
      } = params;
      
      // 构建输出配置
      const outputConfigPayload: Record<string, string> = {
        StorageMode: outputConfig.storageMode || 'Temporary',
        Resolution: outputConfig.resolution || '1080P',
        EnhanceSwitch: outputConfig.enhanceSwitch || 'Disabled',
      };
      
      // 添加宽高比（如果指定）
      if (outputConfig.aspectRatio) {
        outputConfigPayload.AspectRatio = outputConfig.aspectRatio;
      }
      
      const payload: Record<string, unknown> = {
        SubAppId: this.config.subAppId,
        ModelName: model.modelName,
        ModelVersion: model.modelVersion,
        Prompt: prompt,
        EnhancePrompt: enhancePrompt,
        OutputConfig: outputConfigPayload,
      };
      
      // 添加图片输入（FileInfos）
      if (fileInfos.length > 0) {
        payload.FileInfos = fileInfos.map(info => {
          const fileInfo: Record<string, string> = {
            Type: info.Type,
            Url: info.Url,
          };
          // Vidu 模型支持 ObjectId
          if (info.ObjectId) {
            fileInfo.ObjectId = info.ObjectId;
          }
          return fileInfo;
        });
      }
      
      // 添加尾帧图片（GV、Kling 2.1、Vidu q2-pro/q2-turbo 支持）
      if (lastFrameUrl && model.supportLastFrame) {
        payload.LastFrameUrl = lastFrameUrl;
      }
      
      // 添加场景类型（Kling 特有）
      if (sceneType && model.modelName === 'Kling') {
        payload.SceneType = sceneType;
      }
      
      const response = await this.sendRequest<VodApiResponse>('CreateAigcVideoTask', payload);
      
      if (response.Response?.Error) {
        return {
          success: false,
          error: response.Response.Error.Message,
          errorCode: response.Response.Error.Code,
          requestId: response.Response.RequestId,
        };
      }
      
      return {
        success: true,
        message: '视频任务创建成功',
        taskId: response.Response?.TaskId,
        requestId: response.Response?.RequestId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 查询任务详情
   */
  async describeTaskDetail(taskId: string): Promise<VideoTaskStatusResponse> {
    try {
      const payload = {
        TaskId: taskId,
        SubAppId: this.config.subAppId,
      };
      
      const response = await this.sendRequest<VodTaskDetailResponse>('DescribeTaskDetail', payload);
      
      if (response.Response?.Error) {
        return {
          success: false,
          error: response.Response.Error.Message,
          errorCode: response.Response.Error.Code,
          taskId,
        };
      }

      // 优先从 AigcVideoTask 中获取信息（新版 API 格式）
      const aigcTask = response.Response?.AigcVideoTask;
      
      if (aigcTask) {
        const status = this.mapTaskStatus(aigcTask.Status);
        const fileInfo = aigcTask.Output?.FileInfos?.[0];
        
        // 从 FileInfos 中获取视频 URL
        const videoUrl = fileInfo?.FileUrl;
        // 封面可能在 MetaData 或 Output 根级别
        const coverUrl = fileInfo?.MetaData?.CoverUrl || aigcTask.Output?.CoverUrl;
        // 时长可能在 MetaData 或 Output 根级别
        const duration = fileInfo?.MetaData?.Duration || aigcTask.Output?.Duration;
        const width = fileInfo?.MetaData?.Width;
        const height = fileInfo?.MetaData?.Height;
        
        // 判断是否真正成功：ErrCode 为 0 且有视频 URL
        const hasError = aigcTask.ErrCode !== 0 && aigcTask.ErrCode !== undefined;
        const isReallySuccess = status === 'FINISH' && !hasError && videoUrl;
        
        console.log('[VOD] 解析 AigcVideoTask 响应:', {
          taskId: aigcTask.TaskId,
          status: aigcTask.Status,
          errCode: aigcTask.ErrCode,
          progress: aigcTask.Progress,
          videoUrl,
          coverUrl,
          duration,
          hasError,
          isReallySuccess,
          message: aigcTask.Message,
        });
        
        // 如果有错误码，即使状态是 FINISH 也应该返回失败
        if (hasError) {
          return {
            success: false,
            taskId: aigcTask.TaskId || taskId,
            status: 'FAIL',
            progress: aigcTask.Progress,
            createTime: response.Response?.CreateTime,
            finishTime: response.Response?.FinishTime,
            error: aigcTask.Message || `任务失败 (错误码: ${aigcTask.ErrCode})`,
            errorCode: aigcTask.ErrCodeExt || String(aigcTask.ErrCode),
          };
        }
        
        return {
          success: isReallySuccess || status === 'PROCESSING' ? true : false,
          taskId: aigcTask.TaskId || taskId,
          status: isReallySuccess ? 'FINISH' : status,
          progress: aigcTask.Progress,
          videoUrl: isReallySuccess ? videoUrl : undefined,
          coverUrl: isReallySuccess ? coverUrl : undefined,
          duration: isReallySuccess ? duration : undefined,
          resolution: width && height ? `${width}x${height}` : undefined,
          createTime: response.Response?.CreateTime,
          finishTime: response.Response?.FinishTime,
        };
      }
      
      // 兼容旧格式（直接在 Response 下的 Output）
      const status = this.mapTaskStatus(response.Response?.Status);
      const output = response.Response?.Output;
      
      return {
        success: status !== 'FAIL',
        taskId,
        status,
        progress: response.Response?.Progress,
        videoUrl: output?.MediaUrl,
        coverUrl: output?.CoverUrl,
        duration: output?.Duration,
        resolution: output?.Width && output?.Height ? `${output.Width}x${output.Height}` : undefined,
        createTime: response.Response?.CreateTime,
        finishTime: response.Response?.FinishTime,
        error: response.Response?.Message,
        errorCode: response.Response?.ErrCodeExt,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        taskId,
      };
    }
  }

  /**
   * 映射任务状态
   */
  private mapTaskStatus(status?: string): VideoTaskStatus {
    switch (status) {
      case 'FINISH':
        return 'FINISH';
      case 'FAIL':
        return 'FAIL';
      default:
        return 'PROCESSING';
    }
  }

  /**
   * 轮询等待视频生成完成
   */
  async waitForCompletion(
    taskId: string,
    model: VideoModelWithDate,
    onProgress?: (status: VideoTaskStatusResponse) => void
  ): Promise<VideoGenerationResponse> {
    const groupConfig: GroupConfig = getGroupConfig(model.group);
    const { pollIntervalMs, pollTimeoutMs, maxPollAttempts } = groupConfig;
    
    const startTime = Date.now();
    let pollCount = 0;
    
    while (pollCount < maxPollAttempts) {
      const elapsed = Date.now() - startTime;
      
      if (elapsed > pollTimeoutMs) {
        return {
          success: false,
          error: `轮询超时（${pollTimeoutMs / 1000}秒）`,
          taskId,
          totalTime: elapsed,
          pollCount,
        };
      }
      
      const status = await this.describeTaskDetail(taskId);
      pollCount++;
      
      if (onProgress) {
        onProgress(status);
      }
      
      if (!status.success) {
        return {
          success: false,
          error: status.error,
          errorCode: status.errorCode,
          taskId,
          totalTime: Date.now() - startTime,
          pollCount,
        };
      }
      
      if (status.status === 'FINISH') {
        return {
          success: true,
          message: '视频生成成功',
          taskId,
          videoUrl: status.videoUrl,
          coverUrl: status.coverUrl,
          duration: status.duration,
          resolution: status.resolution,
          totalTime: Date.now() - startTime,
          pollCount,
        };
      }
      
      if (status.status === 'FAIL') {
        return {
          success: false,
          error: status.error || '视频生成失败',
          errorCode: status.errorCode,
          taskId,
          totalTime: Date.now() - startTime,
          pollCount,
        };
      }
      
      // 等待下一次轮询
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    
    return {
      success: false,
      error: `超过最大轮询次数（${maxPollAttempts}次）`,
      taskId,
      totalTime: Date.now() - startTime,
      pollCount,
    };
  }

  /**
   * 生成视频（创建任务并等待完成）
   */
  async generateVideo(
    params: CreateVideoTaskParams,
    onProgress?: (status: VideoTaskStatusResponse) => void
  ): Promise<VideoGenerationResponse> {
    // 创建任务
    const createResult = await this.createVideoTask(params);
    
    if (!createResult.success || !createResult.taskId) {
      return {
        success: false,
        error: createResult.error,
        errorCode: createResult.errorCode,
      };
    }
    
    // 等待完成
    return await this.waitForCompletion(createResult.taskId, params.model, onProgress);
  }

  /**
   * 测试服务配置是否正确
   */
  async testService(): Promise<{ success: boolean; message: string; details?: unknown }> {
    try {
      console.log('🧪 开始测试 VodAigcService...');
      console.log('📋 配置信息:', {
        region: this.config.region,
        endpointHost: this.config.endpointHost,
        requestUrl: this.config.requestUrl,
        subAppId: this.config.subAppId,
        hasSecretId: !!this.config.secretId,
        hasSecretKey: !!this.config.secretKey,
      });

      // 检查必需的配置
      if (!this.config.secretId || !this.config.secretKey) {
        return {
          success: false,
          message: '❌ API 密钥配置缺失',
          details: {
            hasSecretId: !!this.config.secretId,
            hasSecretKey: !!this.config.secretKey,
          }
        };
      }

      if (!this.config.subAppId) {
        return {
          success: false,
          message: '❌ SubAppId 配置缺失',
        };
      }

      return {
        success: true,
        message: '✅ VodAigcService 配置检查通过',
        details: {
          region: this.config.region,
          subAppId: this.config.subAppId,
        }
      };
    } catch (error) {
      console.error('💥 测试过程中发生错误:', error);
      return {
        success: false,
        message: `💥 测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: error
      };
    }
  }
}

// =================================================================================================
// 工厂函数
// =================================================================================================

/**
 * 创建 VOD AIGC 客户端
 */
export function createVodAigcClient(config: VodAigcClientConfig): VodAigcService {
  return new VodAigcService(config);
}

// =================================================================================================
// 默认实例（使用环境变量配置）
// =================================================================================================

let defaultClient: VodAigcService | null = null;

/**
 * 获取默认的 VOD AIGC 客户端
 */
export function getDefaultVodAigcClient(): VodAigcService {
  if (!defaultClient) {
    defaultClient = new VodAigcService({
      secretId: import.meta.env.VITE_VOD_SECRET_ID || '',
      secretKey: import.meta.env.VITE_VOD_SECRET_KEY || '',
      subAppId: parseInt(import.meta.env.VITE_VOD_SUB_APP_ID || '0', 10),
    });
  }
  return defaultClient;
}
