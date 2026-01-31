/**
 * @file models.types.ts
 * @description 视频生成模型类型定义
 * @author fmw666@github
 * @date 2025-07-18
 */

// VOD AIGC 支持的模型组类型
export type ModelGroupType =
  | 'Hailuo' // 海螺
  | 'Kling' // 可灵
  | 'Vidu' // Vidu
  | 'Jimeng' // 即梦
  | 'Seedance' // Seedance
  | 'GV' // GV
  | 'OS'; // OS

// 模型组配置
export interface GroupConfig {
  maxConcurrent: number; // 最大并发数
  cooldownMs: number; // 冷却时间（毫秒）
  pollIntervalMs: number; // 轮询间隔（毫秒）
  pollTimeoutMs: number; // 轮询超时（毫秒）
  maxPollAttempts: number; // 最大轮询次数
}

// 配置选项
export interface ConfigOption {
  value: string;
  label: string;
  labelEn: string;
}

// 配置字段定义
export interface ConfigField {
  type: 'select' | 'input' | 'checkbox';
  label: string;
  labelEn: string;
  options?: ConfigOption[];
  default: string | boolean;
  placeholder?: string;
}

// 模型特定配置
export type ModelSpecificConfig = Record<string, ConfigField>;

// 公共配置
export interface CommonConfig {
  enhancePrompt: ConfigField;
  storageMode: ConfigField;
  enhanceSwitch: ConfigField;
}

// 视频模型定义
export interface VideoModel {
  id: string; // 模型唯一标识（格式：ModelName-ModelVersion）
  name: string; // 模型显示名称
  modelName: string; // VOD API 模型名
  modelVersion: string; // VOD API 模型版本
  publishDate: string; // 发布日期（JSON 中的字符串格式）
  description: string; // 模型描述
  category: string; // 分类（用于 UI 分组）
  group: ModelGroupType; // 模型组（同一组的模型共享相同的配置）
  supportedResolutions?: string[]; // 支持的分辨率列表
  supportedAspectRatios?: string[]; // 支持的宽高比列表
  supportT2V?: boolean; // 是否支持文生视频（Text-to-Video）
  supportI2V?: boolean; // 是否支持图生视频（Image-to-Video）
  maxImages?: number; // 最大支持的图片数量（0 表示不支持图片输入）
  supportLastFrame?: boolean; // 是否支持首尾帧
  lastFrameResolutions?: string[]; // 支持首尾帧的分辨率（如果有限制）
  lastFrameNote?: string; // 首尾帧使用说明
  modelSpecificConfig?: ModelSpecificConfig; // 模型特定的配置选项
  demo?: {
    prompt: string;
    videos?: string[];
    images?: string[];
  };
}

// 转换后的模型类型（日期已转换为 Date 对象）
export interface VideoModelWithDate extends Omit<VideoModel, 'publishDate'> {
  publishDate: Date;
}

// 模型配置文件结构
export interface ModelsConfig {
  configs: Record<ModelGroupType, GroupConfig>;
  commonConfig: CommonConfig;
  models: VideoModel[];
}

// 视频输出配置
export interface VideoOutputConfig {
  storageMode: 'Temporary' | 'Permanent'; // 存储模式
  resolution?: '720P' | '1080P' | '2K' | '4K'; // 输出分辨率
  aspectRatio?: '16:9' | '9:16' | '1:1'; // 宽高比
  enhanceSwitch?: 'Enabled' | 'Disabled'; // 画质增强开关
}

// 视频任务输入
export interface VideoTaskInput {
  prompt: string; // 文本提示词
  enhancePrompt?: 'Enabled' | 'Disabled'; // 提示词优化
  fileInfos?: Array<{
    Type: 'Url';
    Url: string;
    ObjectId?: string; // Vidu 模型的主体 ID
  }>;
  lastFrameUrl?: string; // 尾帧图片 URL
  outputConfig: VideoOutputConfig;
  sceneType?: string; // 场景类型（Kling 特有）
}

// 视频任务请求
export interface VideoTaskRequest {
  subAppId: number; // VOD 子应用 ID
  model: VideoModelWithDate; // 选择的模型
  input: VideoTaskInput; // 输入配置
}

// 视频任务状态
export type VideoTaskStatus =
  | 'PROCESSING' // 处理中
  | 'FINISH' // 完成
  | 'FAIL'; // 失败

// 视频任务详情
export interface VideoTaskDetail {
  taskId: string;
  status: VideoTaskStatus;
  progress?: number;
  videoUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  createTime?: string;
  finishTime?: string;
}

// 用户上传的图片信息
export interface UploadedImage {
  id: string; // 唯一标识
  file?: File; // 本地文件对象
  url: string; // 图片 URL（可以是 blob URL 或远程 URL）
  name: string; // 文件名
  size?: number; // 文件大小
  uploadedAt: Date; // 上传时间
  objectId?: string; // Vidu 模型的主体 ID（可选）
}

// 模型输入模式
export type InputMode = 'text' | 'image' | 'both';

// 获取模型支持的输入模式
export function getModelInputMode(model: VideoModel | VideoModelWithDate): InputMode {
  if (model.supportT2V && model.supportI2V) return 'both';
  if (model.supportI2V) return 'image';
  return 'text';
}

// 检查模型是否在当前输入模式下可用
export function isModelAvailableForInput(
  model: VideoModel | VideoModelWithDate,
  hasImage: boolean,
  imageCount: number = hasImage ? 1 : 0
): { available: boolean; reason?: 'onlyT2V' | 'onlyI2V' | 'tooManyImages'; maxImages?: number } {
  // 如果有图片
  if (hasImage) {
    // 检查是否支持图生视频
    if (!model.supportI2V) {
      return { available: false, reason: 'onlyT2V' };
    }
    
    // 检查图片数量是否超过模型限制
    const maxImages = model.maxImages ?? 1; // 默认最多1张
    if (imageCount > maxImages) {
      return { available: false, reason: 'tooManyImages', maxImages };
    }
    
    return { available: true };
  }
  
  // 如果没有图片
  if (!model.supportT2V) {
    return { available: false, reason: 'onlyI2V' };
  }
  return { available: true };
}

// 检查模型是否可以使用首尾帧功能
export function canUseLastFrame(
  model: VideoModel | VideoModelWithDate,
  resolution: string,
  firstFrameCount: number
): { canUse: boolean; reason?: 'klingResolution' | 'gvMultiImage' } {
  // 如果模型不支持首尾帧，直接返回
  if (!model.supportLastFrame) {
    return { canUse: false };
  }
  
  // Kling 2.1 分辨率限制：只有特定分辨率才支持首尾帧
  if (model.modelName === 'Kling' && model.lastFrameResolutions) {
    if (!model.lastFrameResolutions.includes(resolution)) {
      return { canUse: false, reason: 'klingResolution' };
    }
  }
  
  // GV 多图限制：使用多图输入时不可使用首尾帧
  if (model.modelName === 'GV' && firstFrameCount > 1) {
    return { canUse: false, reason: 'gvMultiImage' };
  }
  
  return { canUse: true };
}

// 兼容性导出（保持向后兼容）
export type ImageModel = VideoModel;
export type ImageModelWithDate = VideoModelWithDate;
