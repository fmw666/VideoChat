/**
 * @file modelStore.ts
 * @description Model store for managing video models from local configuration.
 * @author fmw666@github
 * @date 2025-07-17
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { create } from 'zustand';

// --- Internal Libraries ---
// --- Services ---
import { modelManager, type ImageModel } from '@/services/model/modelManager';
import { modelConfigService } from '@/services/model/modelService';
import { supabase } from '@/services/api/supabase';

// =================================================================================================
// Local Type Definitions (不再依赖数据库)
// =================================================================================================

// 测试状态枚举（与原 modelService 保持兼容）
export enum TestStatus {
  NOT_TESTED = 0,
  TESTING = 1,
  TESTED_FAILED = 2,
  TESTED_PASSED = 3
}

// 配置JSON结构（用于 API 密钥等）
export interface ModelConfigJson {
  api_key?: string;
  api_secret?: string;
  ark_api_key?: string;
  system_prompt?: string;
  [key: string]: unknown;
}

// 简化的模型配置类型（本地使用）
export interface ModelConfig {
  id: string;
  model_id: string;
  enabled: boolean;
  test_status: TestStatus;
  config_json?: ModelConfigJson | null;
}

// =================================================================================================
// Type Definitions
// =================================================================================================

export interface AvailableModel extends ImageModel {
  isEnabled: boolean;
  testStatus: TestStatus;
}

export interface ModelState {
  // --- State ---
  modelConfigs: ModelConfig[];
  availableModels: AvailableModel[];
  selectedCategory: string;
  selectedStatus: string;
  isLoading: boolean;
  isInitialized: boolean;

  // --- Visibility State ---
  modelVisibility: Map<string, boolean>;

  // --- State Setters ---
  setModelConfigs: (configs: ModelConfig[] | ((prev: ModelConfig[]) => ModelConfig[])) => void;
  setAvailableModels: (models: AvailableModel[]) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedStatus: (status: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsInitialized: (isInitialized: boolean) => void;

  // --- Operations ---
  initialize: () => Promise<void>;
  filterModels: () => void;
  getEnabledAndTestedModels: () => AvailableModel[];
  getVisibleModels: () => AvailableModel[];
  generateCategoriesFromModels: (models: AvailableModel[]) => Array<{ id: string; name: string; count: number }>;
  calculateStatusCounts: (configs: ModelConfig[]) => Record<string, number>;
  updateModelConfig: (modelId: string, updatedConfig: ModelConfig) => void;
  addOrUpdateModelConfig: (config: ModelConfig) => void;
  toggleModelEnabled: (modelId: string, enabled: boolean) => Promise<void>;
  updateModelTestStatus: (modelId: string, testStatus: TestStatus) => void;
  updateModelConfigJson: (modelId: string, updatedConfigJson: ModelConfigJson) => void;

  // --- Visibility Operations ---
  loadVisibilitySettings: () => Promise<void>;
  toggleModelVisibility: (modelId: string) => Promise<void>;
  setModelVisibility: (modelId: string, visible: boolean) => Promise<void>;
  resetAllVisibility: () => Promise<void>;
}

// =================================================================================================
// Constants
// =================================================================================================

const DEFAULT_MODEL_CONFIGS: ModelConfig[] = [];
const DEFAULT_AVAILABLE_MODELS: AvailableModel[] = [];
const DEFAULT_SELECTED_CATEGORY = 'all';
const DEFAULT_SELECTED_STATUS = 'all';
const DEFAULT_IS_INITIALIZED = false;
const DEFAULT_IS_LOADING = false;

// =================================================================================================
// Store Configuration
// =================================================================================================

/**
 * Model store for managing user model configurations and filtering
 * Provides model config CRUD operations, filtering, and state persistence
 */
export const useModelStore = create<ModelState>((set, get) => ({
  // --- Initial State ---
  modelConfigs: DEFAULT_MODEL_CONFIGS,
  availableModels: DEFAULT_AVAILABLE_MODELS,
  selectedCategory: DEFAULT_SELECTED_CATEGORY,
  selectedStatus: DEFAULT_SELECTED_STATUS,
  isLoading: DEFAULT_IS_LOADING,
  isInitialized: DEFAULT_IS_INITIALIZED,
  modelVisibility: new Map(),

  // --- State Setters ---
  setModelConfigs: (configs) => {
    const newConfigs = typeof configs === 'function' ? configs(get().modelConfigs) : configs;
    set({ modelConfigs: newConfigs });
  },
  setAvailableModels: (availableModels) => set({ availableModels }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSelectedStatus: (selectedStatus) => set({ selectedStatus }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsInitialized: (isInitialized) => set({ isInitialized }),

  /**
   * Update a specific model config in the store (local only, no API call)
   */
  updateModelConfig: (modelId: string, updatedConfig: ModelConfig) => {
    const { modelConfigs, filterModels } = get();
    
    // Find and update the specific config
    const updatedConfigs = modelConfigs.map(config => 
      config.model_id === modelId ? updatedConfig : config
    );
    
    // Update available models with new config
    const allModels = modelManager.getAllModels();
    const availableModels: AvailableModel[] = allModels.map(model => {
      const userConfig = updatedConfigs.find(c => c.model_id === model.id);
      return {
        ...model,
        isEnabled: userConfig?.enabled ?? false,
        testStatus: userConfig?.test_status ?? TestStatus.NOT_TESTED
      };
    });
    
    set({ availableModels, modelConfigs: updatedConfigs });
    
    // Re-apply filtering to update filtered results
    setTimeout(() => filterModels(), 0);
  },

  updateModelConfigJson: (_modelId: string, _updatedConfigJson: ModelConfigJson) => {
    // 不再需要更新数据库，本地配置已从 models.json 加载
  },

  /**
   * Add or update a model config in the store (local only, no API call)
   */
  addOrUpdateModelConfig: (config: ModelConfig) => {
    const { modelConfigs, setModelConfigs, filterModels } = get();
    
    // Check if config already exists
    const existingIndex = modelConfigs.findIndex(
      existing => existing.model_id === config.model_id
    );
    
    let updatedConfigs: ModelConfig[] = [];
    
    if (existingIndex >= 0) {
      // Update existing config
      updatedConfigs = modelConfigs.map((existing, index) => 
        index === existingIndex ? config : existing
      );
    } else {
      // Add new config at the beginning
      updatedConfigs = [config, ...modelConfigs];
    }
    
    // Update configs in store (local only)
    setModelConfigs(updatedConfigs);
    
    // Update available models with new config
    const allModels = modelManager.getAllModels();
    const availableModels: AvailableModel[] = allModels.map(model => {
      const userConfig = updatedConfigs.find(c => c.model_id === model.id);
      return {
        ...model,
        isEnabled: userConfig?.enabled ?? false,
        testStatus: userConfig?.test_status ?? TestStatus.NOT_TESTED
      };
    });
    
    set({ availableModels });
    
    // Re-apply filtering to update filtered results
    setTimeout(() => filterModels(), 0);
  },

  /**
   * Toggle model enabled status (本地操作，不再调用数据库)
   */
  toggleModelEnabled: async (_modelId: string, _enabled: boolean) => {
    // 不再需要切换启用状态，所有本地模型默认启用
  },

  /**
   * Update model test status (本地操作，不再调用数据库)
   */
  updateModelTestStatus: (_modelId: string, _testStatus: TestStatus) => {
    // 不再需要更新测试状态，所有本地模型默认测试通过
  },

  // --- Model Operations ---
  /**
   * Initialize model store from local configuration
   * 直接从本地 models.json 加载所有模型，不再依赖数据库
   */
  initialize: async () => {
    if (get().isLoading || get().isInitialized) return;

    set(state => ({
      ...state,
      isLoading: true
    }));
    
    // 直接从本地配置获取所有模型
    const allModels = modelManager.getAllModels();
    
    // 所有本地模型默认启用且测试通过
    const availableModels: AvailableModel[] = allModels.map(model => ({
      ...model,
      isEnabled: true,
      testStatus: TestStatus.TESTED_PASSED
    }));

    set(state => ({
      ...state,
      modelConfigs: [],
      availableModels,
      isLoading: false,
      isInitialized: true
    }));
  },

  /**
   * Get all available models from local config
   * 直接返回本地配置的所有模型，不再依赖数据库中的启用和测试状态
   */
  getEnabledAndTestedModels: (): AvailableModel[] => {
    // 直接从 modelManager 获取本地配置的所有模型
    const allModels = modelManager.getAllModels();
    return allModels.map(model => ({
      ...model,
      isEnabled: true,  // 本地模型默认启用
      testStatus: TestStatus.TESTED_PASSED  // 本地模型默认测试通过
    }));
  },

  /**
   * 获取可见的模型（基于用户的可见性设置）
   */
  getVisibleModels: (): AvailableModel[] => {
    const allModels = modelManager.getAllModels();
    const visibility = get().modelVisibility;

    // 过滤出可见的模型
    return allModels
      .filter(model => visibility.get(model.id) !== false)
      .map(model => ({
        ...model,
        isEnabled: true,
        testStatus: TestStatus.TESTED_PASSED
      }));
  },

  /**
   * Generate categories from available models
   */
  generateCategoriesFromModels: (models: AvailableModel[]) => {
    const categoryCounts: Record<string, number> = {};
    
    models.forEach(model => {
      const category = model.category;
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    return Object.entries(categoryCounts)
      .map(([category, count]) => ({
        id: category,
        name: category,
        count
      }))
      .sort((a, b) => b.count - a.count);
  },

  /**
   * Calculate status counts from model configurations
   */
  calculateStatusCounts: (configs: ModelConfig[]) => {
    const counts = {
      all: configs.length,
      enabled: 0,
      disabled: 0,
      tested: 0,
      notTested: 0,
      passed: 0,
      failed: 0
    };

    configs.forEach(config => {
      if (config.enabled) {
        counts.enabled++;
      } else {
        counts.disabled++;
      }

      if (config.test_status === TestStatus.NOT_TESTED || config.test_status === null) {
        counts.notTested++;
      } else {
        counts.tested++;
      }

      if (config.test_status === TestStatus.TESTED_PASSED) {
        counts.passed++;
      } else if (config.test_status === TestStatus.TESTED_FAILED) {
        counts.failed++;
      }
    });

    return counts;
  },

  /**
   * Filter models based on current category and status
   */
  filterModels: () => {
    const { availableModels, selectedCategory, selectedStatus } = get();

    let filteredModels = availableModels;

    // 根据分类过滤
    if (selectedCategory !== 'all') {
      filteredModels = filteredModels.filter(model => 
        model.category === selectedCategory
      );
    }

    // 根据状态过滤
    if (selectedStatus !== 'all') {
      filteredModels = filteredModels.filter(model => {
        switch (selectedStatus) {
          case 'enabled':
            return model.isEnabled;
          case 'disabled':
            return !model.isEnabled;
          case 'tested':
            return model.testStatus !== TestStatus.NOT_TESTED;
          case 'notTested':
            return model.testStatus === TestStatus.NOT_TESTED;
          case 'passed':
            return model.testStatus === TestStatus.TESTED_PASSED;
          case 'failed':
            return model.testStatus === TestStatus.TESTED_FAILED;
          default:
            return true;
        }
      });
    }

    set({ availableModels: filteredModels });
  },

  // --------------------------------------------------------------------------------
  // Visibility Operations
  // --------------------------------------------------------------------------------

  /**
   * 加载用户的可见性设置
   */
  loadVisibilitySettings: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // 未登录时所有模型默认可见
        const allModels = modelManager.getAllModels();
        const defaultVisibility = new Map<string, boolean>();
        allModels.forEach(model => {
          defaultVisibility.set(model.id, true);
        });
        set({ modelVisibility: defaultVisibility });
        return;
      }

      const visibility = await modelConfigService.getVisibilitySettings(user.id);

      // 对于没有设置的模型，默认可见
      const allModels = modelManager.getAllModels();
      allModels.forEach(model => {
        if (!visibility.has(model.id)) {
          visibility.set(model.id, true);
        }
      });

      set({ modelVisibility: visibility });
    } catch (error) {
      console.error('Error loading visibility settings:', error);
    }
  },

  /**
   * 切换模型可见性
   */
  toggleModelVisibility: async (modelId: string) => {
    const current = get().modelVisibility.get(modelId) ?? true;
    await get().setModelVisibility(modelId, !current);
  },

  /**
   * 设置模型可见性
   */
  setModelVisibility: async (modelId: string, visible: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const success = await modelConfigService.updateModelVisibility(user.id, modelId, visible);
      if (success) {
        const newMap = new Map(get().modelVisibility);
        newMap.set(modelId, visible);
        set({ modelVisibility: newMap });
      }
    } catch (error) {
      console.error('Error setting model visibility:', error);
    }
  },

  /**
   * 重置所有模型为可见
   */
  resetAllVisibility: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const allModels = modelManager.getAllModels();
      const updates = allModels.map(model => ({
        modelId: model.id,
        visible: true
      }));

      const success = await modelConfigService.updateMultipleVisibility(user.id, updates);
      if (success) {
        const newMap = new Map<string, boolean>();
        allModels.forEach(model => {
          newMap.set(model.id, true);
        });
        set({ modelVisibility: newMap });
      }
    } catch (error) {
      console.error('Error resetting all visibility:', error);
    }
  },
}));
