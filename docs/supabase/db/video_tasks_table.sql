-- =================================================================================================
-- Video Tasks Table Schema and Policy
-- =================================================================================================
-- 视频生成任务表，用于存储 VOD AIGC 视频生成任务的状态和结果

-- 1. 确保 video_tasks 表结构正确
DO $$ 
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'video_tasks'
  ) THEN
    -- Create table if it doesn't exist
    CREATE TABLE public.video_tasks (
      id uuid not null default gen_random_uuid(),
      created_at timestamp with time zone not null default now(),
      updated_at timestamp with time zone not null default now(),
      user_id uuid null,
      chat_id uuid null,
      message_id text null,
      
      -- 任务信息
      task_id text not null,                          -- VOD API 返回的任务 ID
      request_id text null,                           -- VOD API 请求 ID
      
      -- 模型信息
      model_name text not null,                       -- 模型名称 (Hailuo, Kling, etc.)
      model_version text not null,                    -- 模型版本 (2.3, 2.0, etc.)
      model_id text null,                             -- 完整模型 ID (Hailuo-2.3)
      
      -- 输入参数
      prompt text not null,                           -- 提示词
      enhance_prompt text null default 'Enabled',     -- 提示词优化
      file_infos json null default '[]'::json,        -- 参考图片/视频
      output_config json null,                        -- 输出配置
      
      -- 任务状态
      status text not null default 'PROCESSING',      -- PROCESSING, FINISH, FAIL
      progress integer null default 0,                -- 进度 0-100
      error_code text null,                           -- 错误码
      error_message text null,                        -- 错误信息
      
      -- 输出结果（VOD API 返回的临时 URL）
      video_url text null,                            -- VOD 生成的视频临时 URL
      cover_url text null,                            -- VOD 视频封面临时 URL
      duration integer null,                          -- 视频时长（秒）
      resolution text null,                           -- 视频分辨率
      
      -- Supabase S3 存储 URL（永久存储）
      supabase_video_url text null,                   -- 转存到 Supabase 后的视频 URL
      supabase_cover_url text null,                   -- 转存到 Supabase 后的封面 URL
      
      -- 统计信息
      poll_count integer null default 0,              -- 轮询次数
      total_time_ms integer null,                     -- 总耗时（毫秒）
      finish_time timestamp with time zone null,      -- 完成时间

      constraint video_tasks_pkey primary key (id),
      constraint video_tasks_task_id_unique unique (task_id),
      constraint video_tasks_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete cascade,
      constraint video_tasks_chat_id_fkey foreign KEY (chat_id) references chat_msgs (id) on delete cascade
    ) TABLESPACE pg_default;
  END IF;
END $$;

-- 2. 创建 updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION update_video_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS video_tasks_updated_at_trigger ON public.video_tasks;
CREATE TRIGGER video_tasks_updated_at_trigger
  BEFORE UPDATE ON public.video_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_video_tasks_updated_at();

-- 3. Enable RLS and create policy if not exists
ALTER TABLE public.video_tasks ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'video_tasks'
    AND policyname = 'Allow users to access their own data'
  ) THEN
    -- Create policy if it doesn't exist
    CREATE POLICY "Allow users to access their own data" ON public.video_tasks
    TO public
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_video_tasks_user_id ON public.video_tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_video_tasks_task_id ON public.video_tasks (task_id);
CREATE INDEX IF NOT EXISTS idx_video_tasks_user_id_chat_id ON public.video_tasks (user_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_video_tasks_status ON public.video_tasks (status);
CREATE INDEX IF NOT EXISTS idx_video_tasks_created_at ON public.video_tasks (created_at DESC);
