/**
 * @file VideoGenerationExample.tsx
 * @description 视频生成服务使用示例
 * @author fmw666@github
 * @date 2025-07-18
 * 
 * 此文件演示如何使用 VodAigcService 进行视频生成
 */

import { useState, useCallback } from 'react';
import { 
  createVodAigcClient, 
  type VideoTaskStatusResponse,
} from '@/services/model';
import { getModelById } from '@/config/modelsLoader';

// =================================================================================================
// 类型定义
// =================================================================================================

interface VideoGenerationState {
  isLoading: boolean;
  progress: number;
  status: string;
  videoUrl: string | null;
  error: string | null;
}

// =================================================================================================
// 示例组件
// =================================================================================================

export function VideoGenerationExample() {
  const [prompt, setPrompt] = useState('一只可爱的熊猫在竹林中玩耍，阳光透过竹叶洒落');
  const [selectedModelId, setSelectedModelId] = useState('GV-3.1');
  const [state, setState] = useState<VideoGenerationState>({
    isLoading: false,
    progress: 0,
    status: '',
    videoUrl: null,
    error: null,
  });

  // 处理进度更新回调
  const handleProgress = useCallback((statusResponse: VideoTaskStatusResponse) => {
    setState(prev => ({
      ...prev,
      progress: statusResponse.progress || 0,
      status: statusResponse.status || 'PROCESSING',
    }));
  }, []);

  // 生成视频
  const handleGenerate = useCallback(async () => {
    // 获取模型配置
    const model = getModelById(selectedModelId);
    if (!model) {
      setState(prev => ({ ...prev, error: '模型不存在' }));
      return;
    }

    // 创建客户端（实际使用时从环境变量获取配置）
    const client = createVodAigcClient({
      secretId: import.meta.env.VITE_VOD_SECRET_ID || '',
      secretKey: import.meta.env.VITE_VOD_SECRET_KEY || '',
      subAppId: parseInt(import.meta.env.VITE_VOD_SUB_APP_ID || '0', 10),
    });

    setState({
      isLoading: true,
      progress: 0,
      status: 'PROCESSING',
      videoUrl: null,
      error: null,
    });

    try {
      // 生成视频（创建任务并等待完成）
      const result = await client.generateVideo(
        {
          model,
          prompt,
          enhancePrompt: 'Enabled',
          outputConfig: {
            storageMode: 'Temporary',
            resolution: '1080P',
          },
        },
        handleProgress
      );

      if (result.success && result.videoUrl) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          progress: 100,
          status: 'FINISH',
          videoUrl: result.videoUrl || null,
        }));

        // 保存到数据库（可选）
        // 注意：实际使用时需要从 auth context 获取 userId
        // await videoTaskService.createVideoTask({
        //   user_id: userId,
        //   task_id: result.taskId!,
        //   model_name: model.modelName,
        //   model_version: model.modelVersion,
        //   model_id: model.id,
        //   prompt,
        // });

        console.log('视频生成成功:', result);
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          status: 'FAIL',
          error: result.error || '视频生成失败',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        status: 'FAIL',
        error: error instanceof Error ? error.message : '未知错误',
      }));
    }
  }, [prompt, selectedModelId, handleProgress]);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">视频生成示例</h1>
      
      {/* 模型选择 */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">选择模型</label>
        <select
          value={selectedModelId}
          onChange={(e) => setSelectedModelId(e.target.value)}
          className="w-full p-2 border rounded-lg"
          disabled={state.isLoading}
        >
          <optgroup label="GV">
            <option value="GV-3.1">GV 3.1</option>
            <option value="GV-3.1-fast">GV 3.1 Fast</option>
          </optgroup>
          <optgroup label="可灵">
            <option value="Kling-2.6">可灵 2.6</option>
            <option value="Kling-2.5">可灵 2.5</option>
            <option value="Kling-2.1">可灵 2.1</option>
          </optgroup>
          <optgroup label="海螺">
            <option value="Hailuo-2.3">海螺 2.3</option>
            <option value="Hailuo-2.3-fast">海螺 2.3 快速版</option>
          </optgroup>
          <optgroup label="Seedance">
            <option value="Seedance-1.5-pro">Seedance 1.5 Pro</option>
            <option value="Seedance-1.0-pro">Seedance 1.0 Pro</option>
          </optgroup>
        </select>
      </div>

      {/* 提示词输入 */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">提示词</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-2 border rounded-lg h-32"
          placeholder="描述你想要生成的视频内容..."
          disabled={state.isLoading}
        />
      </div>

      {/* 生成按钮 */}
      <button
        onClick={handleGenerate}
        disabled={state.isLoading || !prompt.trim()}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium
                   hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                   transition-colors"
      >
        {state.isLoading ? '生成中...' : '生成视频'}
      </button>

      {/* 进度显示 */}
      {state.isLoading && (
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>状态: {state.status}</span>
            <span>{state.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 错误显示 */}
      {state.error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {state.error}
        </div>
      )}

      {/* 视频预览 */}
      {state.videoUrl && (
        <div className="mt-6">
          <h2 className="text-lg font-medium mb-2">生成结果</h2>
          <video
            src={state.videoUrl}
            controls
            className="w-full rounded-lg"
          />
          <a
            href={state.videoUrl}
            download
            className="mt-2 inline-block text-blue-600 hover:underline"
          >
            下载视频
          </a>
        </div>
      )}
    </div>
  );
}

// =================================================================================================
// Hook 使用示例
// =================================================================================================

/**
 * 自定义 Hook 示例：使用视频生成服务
 */
export function useVideoGeneration() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    videoUrl?: string;
    error?: string;
  } | null>(null);

  const generate = useCallback(async (
    modelId: string,
    prompt: string,
    options?: {
      enhancePrompt?: 'Enabled' | 'Disabled';
      resolution?: '720P' | '1080P' | '2K' | '4K';
      imageUrl?: string;
    }
  ) => {
    const model = getModelById(modelId);
    if (!model) {
      setResult({ error: '模型不存在' });
      return;
    }

    const client = createVodAigcClient({
      secretId: import.meta.env.VITE_VOD_SECRET_ID || '',
      secretKey: import.meta.env.VITE_VOD_SECRET_KEY || '',
      subAppId: parseInt(import.meta.env.VITE_VOD_SUB_APP_ID || '0', 10),
    });

    setIsLoading(true);
    setProgress(0);
    setResult(null);

    try {
      const response = await client.generateVideo(
        {
          model,
          prompt,
          enhancePrompt: options?.enhancePrompt || 'Enabled',
          fileInfos: options?.imageUrl ? [{ Type: 'Url', Url: options.imageUrl }] : undefined,
          outputConfig: {
            storageMode: 'Temporary',
            resolution: options?.resolution || '1080P',
          },
        },
        (status) => {
          setProgress(status.progress || 0);
        }
      );

      setResult({
        videoUrl: response.videoUrl,
        error: response.error,
      });
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    generate,
    isLoading,
    progress,
    result,
  };
}

export default VideoGenerationExample;
