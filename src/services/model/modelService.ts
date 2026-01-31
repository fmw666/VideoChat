/**
 * @file modelService.ts
 * @description ModelService for managing model configuration records and database operations.
 * @author fmw666@github
 * @date 2025-07-18
 */

// =================================================================================================
// Imports
// =================================================================================================

import { supabase } from '@/services/api/supabase';

// =================================================================================================
// Constants
// =================================================================================================

const MODEL_CONFIGS_TABLE_NAME = import.meta.env.VITE_SUPABASE_MODEL_TABLE_NAME || 'model_configs';

// =================================================================================================
// Type Definitions
// =================================================================================================

// 测试状态枚举
export enum TestStatus {
  NOT_TESTED = 0,
  TESTING = 1,
  TESTED_FAILED = 2,
  TESTED_PASSED = 3
}

// 配置JSON结构
export interface ModelConfigJson {
  api_key?: string;
  api_secret?: string;
  system_prompt?: string;
  [key: string]: any; // 允许其他配置项
}

export interface ModelConfig {
  id: string;
  created_at: string;
  updated_at?: string;
  user_id: string | null;
  name: string | null;
  model_id: string | null; // 'doubao', 'tongyi', etc.
  visible: boolean; // 新字段：是否在模型列表中显示
  sort_order?: number; // 新字段：排序顺序
  enabled: boolean | null;
  test_status: number | null; // 0: not tested, 1: testing, 2: tested failed, 3: tested passed
  last_tested_at: string | null;
  config_json: ModelConfigJson | null; // 存储 API key, secret, system prompt 等配置
}

export interface CreateModelConfig {
  user_id: string;
  name: string;
  model_id: string;
  visible?: boolean;
  sort_order?: number;
  enabled?: boolean;
  test_status?: number;
  config_json?: ModelConfigJson;
}

export interface UpdateModelConfig {
  name?: string;
  visible?: boolean;
  sort_order?: number;
  enabled?: boolean;
  test_status?: number;
  last_tested_at?: string | null;
  config_json?: ModelConfigJson;
  updated_at?: string;
}

// =================================================================================================
// Class Definition
// =================================================================================================

export class ModelConfigService {
  // --------------------------------------------------------------------------------
  // Singleton Instance
  // --------------------------------------------------------------------------------
  private static instance: ModelConfigService;
  private constructor() {}
  public static getInstance(): ModelConfigService {
    if (!ModelConfigService.instance) {
      ModelConfigService.instance = new ModelConfigService();
    }
    return ModelConfigService.instance;
  }

  // --------------------------------------------------------------------------------
  // Model Config public Methods
  // --------------------------------------------------------------------------------

  /** 从配置JSON中获取API密钥 */
  public getApiKey(config: ModelConfig): string | undefined {
    return config.config_json?.api_key;
  }

  /** 从配置JSON中获取API密钥 */
  public getApiSecret(config: ModelConfig): string | undefined {
    return config.config_json?.api_secret;
  }

  /** 从配置JSON中获取系统提示词 */
  public getSystemPrompt(config: ModelConfig): string | undefined {
    return config.config_json?.system_prompt;
  }

  // --------------------------------------------------------------------------------
  // Model Config CRUD Methods
  // --------------------------------------------------------------------------------

  /** 获取用户的所有模型配置 */
  public async getAllModelConfigs(userId: string): Promise<ModelConfig[]> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const { data, error } = await supabase
        .from(MODEL_CONFIGS_TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching all model configs:', error);
      throw error;
    }
  }

  /** 创建或更新模型配置 */
  public async createOrUpdateModelConfig(config: CreateModelConfig): Promise<ModelConfig> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      // 使用 upsert 操作，基于 user_id 和 model_id 的唯一约束
      const { data, error } = await supabase
        .from(MODEL_CONFIGS_TABLE_NAME)
        .upsert([config], {
          onConflict: 'user_id,model_id', // 指定冲突检测的列
          ignoreDuplicates: false // 不忽略重复，而是更新
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return data as ModelConfig;
    } catch (error) {
      console.error('Error creating or updating model config:', error);
      throw error;
    }
  }

  /** 更新模型配置 */
  public async updateModelConfig(
    userId: string, 
    modelId: string, 
    updates: UpdateModelConfig
  ): Promise<ModelConfig | null> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const { data, error } = await supabase
        .from(MODEL_CONFIGS_TABLE_NAME)
        .update(updates)
        .eq('user_id', userId)
        .eq('model_id', modelId)
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }
      
      return data as ModelConfig;
    } catch (error) {
      console.error('Error updating model config:', error);
      throw error;
    }
  }

  /** 更新模型连接状态 */
  public async updateModelConnectionStatus(
    userId: string, 
    modelId: string, 
    testStatus: TestStatus
  ): Promise<ModelConfig | null> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const updates: UpdateModelConfig = {
        test_status: testStatus,
        last_tested_at: testStatus !== TestStatus.NOT_TESTED ? new Date().toISOString() : null
      };

      const { data, error } = await supabase
        .from(MODEL_CONFIGS_TABLE_NAME)
        .update(updates)
        .eq('user_id', userId)
        .eq('model_id', modelId)
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }
      
      return data as ModelConfig;
    } catch (error) {
      console.error('Error updating model connection status:', error);
      throw error;
    }
  }

  /** 更新模型配置JSON */
  public async updateModelConfigJson(
    userId: string,
    modelId: string,
    configJson: ModelConfigJson
  ): Promise<ModelConfig | null> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const { data, error } = await supabase
        .from(MODEL_CONFIGS_TABLE_NAME)
        .update({ config_json: configJson })
        .eq('user_id', userId)
        .eq('model_id', modelId)
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned, create a new config
          const { data, error } = await supabase
            .from(MODEL_CONFIGS_TABLE_NAME)
            .insert({
              user_id: userId,
              model_id: modelId,
              name: modelId,
              enabled: false,
              test_status: TestStatus.NOT_TESTED,
              config_json: configJson
            })
            .select()
            .single();
          if (error) throw error;
          return data as ModelConfig;
        }
        throw error;
      }
      
      return data as ModelConfig;
    } catch (error) {
      console.error('Error updating model config JSON:', error);
      throw error;
    }
  }

  /** 创建默认模型配置 */
  public async createDefaultModelConfigs(userId: string): Promise<ModelConfig[]> {
    if (!supabase) throw new Error('Supabase client is not initialized');

    const defaultConfigs: CreateModelConfig[] = [
      {
        user_id: userId,
        model_id: 'doubao',
        name: '豆包',
        visible: true,
        enabled: false,
        test_status: TestStatus.NOT_TESTED,
        config_json: {
          api_key: '',
          api_secret: '',
          system_prompt: ''
        }
      },
      {
        user_id: userId,
        model_id: 'tongyi',
        name: '通义万相',
        visible: true,
        enabled: false,
        test_status: TestStatus.NOT_TESTED,
        config_json: {
          api_key: '',
          api_secret: '',
          system_prompt: ''
        }
      }
    ];

    try {
      const { data, error } = await supabase
        .from(MODEL_CONFIGS_TABLE_NAME)
        .upsert(defaultConfigs, {
          onConflict: 'user_id,model_id',
          ignoreDuplicates: true
        })
        .select();

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error creating default model configs:', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------------
  // Model Visibility Methods
  // --------------------------------------------------------------------------------

  /**
   * 更新模型可见性
   */
  public async updateModelVisibility(userId: string, modelId: string, visible: boolean): Promise<boolean> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      // 使用 upsert 确保配置存在
      const { error } = await supabase
        .from(MODEL_CONFIGS_TABLE_NAME)
        .upsert({
          user_id: userId,
          model_id: modelId,
          visible: visible,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,model_id',
        })
        .select();

      if (error) {
        console.error('Error updating model visibility:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error updating model visibility:', error);
      return false;
    }
  }

  /**
   * 批量更新模型可见性
   */
  public async updateMultipleVisibility(
    userId: string,
    updates: { modelId: string; visible: boolean }[]
  ): Promise<boolean> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const records = updates.map(u => ({
        user_id: userId,
        model_id: u.modelId,
        visible: u.visible,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from(MODEL_CONFIGS_TABLE_NAME)
        .upsert(records, {
          onConflict: 'user_id,model_id',
        });

      if (error) {
        console.error('Error batch updating visibility:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error batch updating visibility:', error);
      return false;
    }
  }

  /**
   * 获取用户的模型可见性配置
   * 返回所有模型的可见性状态（合并静态配置和用户设置）
   */
  public async getVisibilitySettings(userId: string): Promise<Map<string, boolean>> {
    const visibilityMap = new Map<string, boolean>();

    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      // 获取用户的自定义设置
      const { data, error } = await supabase
        .from(MODEL_CONFIGS_TABLE_NAME)
        .select('model_id, visible')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching visibility settings:', error);
        return visibilityMap;
      }

      // 填充可见性映射
      data?.forEach(config => {
        if (config.model_id) {
          visibilityMap.set(config.model_id, config.visible ?? true);
        }
      });

      return visibilityMap;
    } catch (error) {
      console.error('Error fetching visibility settings:', error);
      return visibilityMap;
    }
  }

  /**
   * 初始化用户的默认模型可见性配置（所有模型默认可见）
   */
  public async initializeUserModelVisibility(userId: string, modelIds: string[]): Promise<void> {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const records = modelIds.map(modelId => ({
        user_id: userId,
        model_id: modelId,
        visible: true,
        sort_order: 0,
      }));

      // 使用 upsert 避免重复
      await supabase
        .from(MODEL_CONFIGS_TABLE_NAME)
        .upsert(records, {
          onConflict: 'user_id,model_id',
          ignoreDuplicates: true,
        });
    } catch (error) {
      console.error('Error initializing user model visibility:', error);
    }
  }
}

// =================================================================================================
// Singleton Export
// =================================================================================================

export const modelConfigService = ModelConfigService.getInstance(); 