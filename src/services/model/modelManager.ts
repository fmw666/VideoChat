/**
 * @file modelManager.ts
 * @description ModelManager singleton for managing video generation models and their configuration.
 * @author fmw666@github
 * @date 2025-07-18
 */

// =================================================================================================
// Imports
// =================================================================================================

import { 
  VideoModelWithDate, 
  ModelGroupType, 
  GroupConfig,
} from '@/config/models.types';
import { 
  getAllModels, 
  getGroupConfig, 
  getAllGroupConfigs,
  getModelsByGroup,
  getModelById,
  getI2VModels,
  getAllCategories,
  getAllGroups,
} from '@/config/modelsLoader';

// =================================================================================================
// Type Definitions
// =================================================================================================

export type { 
  ModelGroupType, 
  VideoModelWithDate, 
  VideoModelWithDate as ImageModel,
  GroupConfig 
} from '@/config/models.types';

// =================================================================================================
// Class Definition
// =================================================================================================

export class ModelManager {
  // --------------------------------------------------------------------------------
  // Singleton Instance
  // --------------------------------------------------------------------------------
  private static instance: ModelManager;
  private models: VideoModelWithDate[];

  private constructor() {
    this.models = getAllModels();
  }

  public static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  // --------------------------------------------------------------------------------
  // Model Query Methods
  // --------------------------------------------------------------------------------

  /** 获取所有模型 */
  public getAllModels(): VideoModelWithDate[] {
    return this.models;
  }

  /** 获取指定类别的模型 */
  public getModelsByCategory(category: string): VideoModelWithDate[] {
    return this.models.filter(model => model.category === category);
  }

  /** 获取指定模型组的模型 */
  public getModelsByGroup(group: ModelGroupType): VideoModelWithDate[] {
    return getModelsByGroup(group);
  }

  /** 获取所有类别 */
  public getAllCategories(): string[] {
    return getAllCategories();
  }

  /** 获取所有模型组 */
  public getAllGroups(): ModelGroupType[] {
    return getAllGroups();
  }

  /** 根据ID获取模型 */
  public getModelById(id: string): VideoModelWithDate | undefined {
    return getModelById(id);
  }

  /** 根据 ModelName 和 ModelVersion 获取模型 */
  public getModelByNameAndVersion(
    modelName: string, 
    modelVersion: string
  ): VideoModelWithDate | undefined {
    return this.models.find(
      model => model.modelName === modelName && model.modelVersion === modelVersion
    );
  }

  /** 获取支持图生视频的模型 */
  public getI2VModels(): VideoModelWithDate[] {
    return getI2VModels();
  }

  /** 获取模型演示 */
  public getModelDemo(modelId: string) {
    const model = this.models.find(m => m.id === modelId);
    return model?.demo;
  }

  /** 获取模型配置 */
  public getModelConfig(model: VideoModelWithDate): GroupConfig {
    return getGroupConfig(model.group);
  }

  /** 获取模型配置 by modelGroup */
  public getModelConfigByGroup(group: ModelGroupType): GroupConfig {
    return getGroupConfig(group);
  }

  /** 获取所有组配置 */
  public getAllGroupConfigs(): Record<ModelGroupType, GroupConfig> {
    return getAllGroupConfigs();
  }

  /** 检查模型是否可用 */
  public isModelAvailable(modelId: string): boolean {
    const model = this.getModelById(modelId);
    if (!model) {
      return false;
    }
    
    // 检查模型组配置是否存在
    const groupConfig = this.getModelConfigByGroup(model.group);
    if (!groupConfig) {
      return false;
    }
    
    return true;
  }

  /** 检查模型组是否可用 */
  public isGroupAvailable(group: ModelGroupType): boolean {
    const groupConfig = this.getModelConfigByGroup(group);
    return !!groupConfig;
  }

  /** 获取模型状态信息 */
  public getModelStatus(modelId: string): {
    available: boolean;
    model?: VideoModelWithDate;
    groupConfig?: GroupConfig;
    error?: string;
  } {
    const model = this.getModelById(modelId);
    if (!model) {
      return {
        available: false,
        error: `模型不存在: ${modelId}`
      };
    }

    const groupConfig = this.getModelConfigByGroup(model.group);
    if (!groupConfig) {
      return {
        available: false,
        model,
        error: `模型组配置不存在: ${model.group}`
      };
    }

    return {
      available: true,
      model,
      groupConfig
    };
  }

  /** 获取模型支持的分辨率列表 */
  public getModelResolutions(modelId: string): string[] {
    const model = this.getModelById(modelId);
    return model?.supportedResolutions || ['720P', '1080P'];
  }

  /** 检查模型是否支持图生视频 */
  public isI2VSupported(modelId: string): boolean {
    const model = this.getModelById(modelId);
    return model?.supportI2V === true;
  }
}

// =================================================================================================
// Singleton Export
// =================================================================================================

export const modelManager = ModelManager.getInstance();
