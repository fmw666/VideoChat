/**
 * @file modelsLoader.ts
 * @description 模型配置加载器，用于从 JSON 配置文件加载视频模型配置。
 * @author fmw666@github
 * @date 2025-07-18
 */

import modelsConfig from './models.json';
import { 
  ModelsConfig, 
  VideoModel, 
  VideoModelWithDate, 
  GroupConfig, 
  ModelGroupType,
  // 兼容性导出
  ImageModel,
  ImageModelWithDate
} from './models.types';

/**
 * 从 JSON 配置文件加载模型配置
 */
export function loadModelsConfig(): ModelsConfig {
  return modelsConfig as ModelsConfig;
}

/**
 * 将字符串日期转换为 Date 对象
 */
export function parseModelDates(models: VideoModel[]): VideoModelWithDate[] {
  return models.map(model => ({
    ...model,
    publishDate: new Date(model.publishDate),
  }));
}

/**
 * 获取所有视频模型（包含转换后的日期）
 */
export function getAllModels(): VideoModelWithDate[] {
  const config = loadModelsConfig();
  return parseModelDates(config.models);
}

/**
 * 根据模型组获取模型列表
 */
export function getModelsByGroup(group: ModelGroupType): VideoModelWithDate[] {
  return getAllModels().filter(model => model.group === group);
}

/**
 * 根据 ID 获取模型
 */
export function getModelById(id: string): VideoModelWithDate | undefined {
  return getAllModels().find(model => model.id === id);
}

/**
 * 根据 ModelName 和 ModelVersion 获取模型
 */
export function getModelByNameAndVersion(
  modelName: string, 
  modelVersion: string
): VideoModelWithDate | undefined {
  return getAllModels().find(
    model => model.modelName === modelName && model.modelVersion === modelVersion
  );
}

/**
 * 获取组配置
 */
export function getGroupConfig(group: ModelGroupType): GroupConfig {
  const config = loadModelsConfig();
  return config.configs[group];
}

/**
 * 获取所有组配置
 */
export function getAllGroupConfigs(): Record<ModelGroupType, GroupConfig> {
  const config = loadModelsConfig();
  return config.configs;
}

/**
 * 获取所有支持图生视频的模型
 */
export function getI2VModels(): VideoModelWithDate[] {
  return getAllModels().filter(model => model.supportI2V === true);
}

/**
 * 获取所有模型分类
 */
export function getAllCategories(): string[] {
  const models = getAllModels();
  return [...new Set(models.map(model => model.category))];
}

/**
 * 获取所有模型组
 */
export function getAllGroups(): ModelGroupType[] {
  const config = loadModelsConfig();
  return Object.keys(config.configs) as ModelGroupType[];
}

// 兼容性导出（保持向后兼容）
export type { ImageModel, ImageModelWithDate };
