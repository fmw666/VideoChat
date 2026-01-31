# Supabase Database

## 架构图

![overview](../images/supabase-db-overview.png)

## 数据表说明

| 表名 | 说明 |
| --- | --- |
| `chat_msgs` | 聊天会话消息表 |
| `assets` | 资产表（图片/视频生成记录） |
| `model_configs` | 模型配置表（用户的 API 密钥等） |
| `video_tasks` | 视频生成任务表（VOD AIGC 任务状态） |

## 环境变量说明

- `VITE_SUPABASE_POSTGRES_URL`：Supabase 数据库连接字符串。
  - 获取方式：
    1. 登录 Supabase 控制台，进入你的项目。
    2. 依次点击 **Settings > Database**。
    3. 滚动到 **Connection string**，选择 **URI** 格式，复制连接字符串。
    4. 替换 `[YOUR-PASSWORD]` 为你的数据库密码。
    
<div align="center"><img src="../images/supabase-db-0.png" alt="supabase-db-0" width="80%" /></div>

<div align="center"><img src="../images/supabase-db-1.png" alt="supabase-db-1" width="80%" /></div>

## 初始化

### 通过脚本自动化

推荐使用自动化脚本快速创建数据库表结构。

#### 依赖环境变量

- `VITE_SUPABASE_POSTGRES_URL`（见上）

#### 操作步骤

1. 如果本地有 Node.js 环境，可以通过内置脚本创建数据库表：
   ```bash
   npm run init:tables
   ```
2. （推荐）如果本地没有 Node.js 环境，可以通过 Docker 运行：
   ```bash
   docker run --rm -v %cd%:/app -w /app node:20 npm run init:tables
   ```

#### 脚本作用
- 自动创建 `chat_msgs`、`assets`、`model_configs`、`video_tasks` 等核心表。
- 自动应用基础表结构、索引和 RLS 策略。

#### 常见问题
- **环境变量未配置**：请确保 `.env` 文件中已正确填写 `VITE_SUPABASE_POSTGRES_URL`。
- **连接失败**：请检查数据库连接字符串和网络。
- **表已存在**：脚本会自动跳过已存在的表。


### 手动配置

如需手动创建数据库表，可在 Supabase Dashboard 的 SQL Editor 执行 SQL 脚本。

1. 打开 Supabase 控制台，进入你的项目。
2. 进入 **SQL Editor**。
3. 打开本目录下的 SQL 文件，依次粘贴并运行：
   - `chat_msgs_table.sql` - 聊天消息表
   - `assets_table.sql` - 资产表
   - `model_configs_table.sql` - 模型配置表
   - `video_tasks_table.sql` - 视频任务表

**注意**：需按顺序执行，因为 `assets` 和 `video_tasks` 表依赖 `chat_msgs` 表。

---

## 表结构详情

### video_tasks 表

视频生成任务表用于存储 VOD AIGC 视频生成任务的状态和结果。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | uuid | 主键 |
| `task_id` | text | VOD API 返回的任务 ID（唯一） |
| `user_id` | uuid | 用户 ID |
| `chat_id` | uuid | 关联的聊天会话 ID |
| `model_name` | text | 模型名称 (Hailuo, Kling 等) |
| `model_version` | text | 模型版本 |
| `prompt` | text | 提示词 |
| `status` | text | 任务状态 (PROCESSING/FINISH/FAIL) |
| `progress` | integer | 进度百分比 0-100 |
| `video_url` | text | 生成的视频 URL |
| `cover_url` | text | 视频封面 URL |
| `duration` | integer | 视频时长（秒） |
| `error_message` | text | 错误信息 |
| `created_at` | timestamp | 创建时间 |
| `finish_time` | timestamp | 完成时间 |

---

## 常见问题 FAQ

- **Q: 脚本执行报错"missing required environment variables"？**
  - A: 请检查 `.env` 文件是否存在且变量名拼写正确。
- **Q: 数据库连接失败？**
  - A: 检查连接字符串、数据库密码和网络。
- **Q: 表结构能否自定义？**
  - A: 可以，建议先 fork 脚本并修改 SQL 文件后再运行。
- **Q: 如何查看视频任务状态？**
  - A: 可以通过 Supabase Dashboard 或 API 查询 `video_tasks` 表。

如有更多问题请查阅主项目文档或提交 issue。
