/**
 * @file index.ts
 * @description Model service exports
 * @author fmw666@github
 * @date 2025-07-18
 */

// =================================================================================================
// Exports
// =================================================================================================

// 测试状态枚举（从 modelStore 导出，不再依赖数据库服务）
export { TestStatus } from '@/store/modelStore';

// 模型管理器
export { modelManager, type ImageModel, type ModelGroupType } from './modelManager';

// 基础服务类型
export {
  type StandardResponse,
  type VideoTaskCreateResponse,
  type VideoTaskStatusResponse,
  type VideoGenerationResponse,
} from './baseService';

// VOD AIGC 视频生成服务
export {
  VodAigcService,
  createVodAigcClient,
  getDefaultVodAigcClient,
  type VodAigcClientConfig,
  type CreateVideoTaskParams,
} from './vodAigcService';

// 视频任务数据库服务
export {
  videoTaskService,
  VideoTaskService,
  type VideoTask,
  type CreateVideoTask,
  type UpdateVideoTask,
} from './videoTaskService';

// 兼容旧服务（可选，保留以便迁移）
export { type DoubaoModel, type DoubaoRequest } from './doubaoService';
export { type GPT4oRequest } from './gpt4oService';
