-- =================================================================================================
-- Model Configs Table Schema and Policy (Updated)
-- =================================================================================================

-- 1. 确保 model_configs 表结构正确（基于现有表结构）
DO $$
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'model_configs'
  ) THEN
    -- Create table if it doesn't exist
    CREATE TABLE public.model_configs (
      id uuid not null default gen_random_uuid(),
      created_at timestamp with time zone not null default now(),
      updated_at timestamp with time zone default now(),
      user_id uuid null,
      name text null,
      model_id text null, -- 'doubao', 'tongyi', etc.

      -- 可见性设置（新增字段，用于模型偏好）
      visible boolean not null default true,
      sort_order int default 0,

      -- API 配置
      enabled boolean null,
      test_status int null, -- 0: not tested, 1: testing, 2: tested failed, 3: tested passed
      last_tested_at timestamp with time zone null,
      config_json json null,

      constraint model_configs_pkey primary key (id),
      constraint model_configs_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete cascade,
      constraint model_configs_user_id_model_id_unique unique (user_id, model_id)
    ) TABLESPACE pg_default;
  ELSE
    -- 如果表已存在，添加新字段
    ALTER TABLE public.model_configs
      ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true;
    ALTER TABLE public.model_configs
      ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;
    ALTER TABLE public.model_configs
      ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
  END IF;
END $$;

-- 2. 数据迁移：将 enabled 字段的值迁移到 visible（如果需要）
-- 只对那些 visible 为 null 或默认值的记录进行迁移
UPDATE public.model_configs
SET visible = COALESCE(enabled, true)
WHERE visible = true AND enabled IS NOT NULL;

-- 3. Enable RLS and create policy if not exists
ALTER TABLE public.model_configs ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'model_configs'
    AND policyname = 'Allow users to access their own data'
  ) THEN
    -- Create policy if it doesn't exist
    CREATE POLICY "Allow users to access their own data" ON public.model_configs
    TO public
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Create Index and Composite Index
CREATE INDEX IF NOT EXISTS idx_model_configs_user_id ON public.model_configs (user_id);
CREATE INDEX IF NOT EXISTS idx_model_configs_user_id_model_id ON public.model_configs (user_id, model_id);
CREATE INDEX IF NOT EXISTS idx_model_configs_user_visible ON public.model_configs (user_id, visible);
