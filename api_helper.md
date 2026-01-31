# VOD AIGC Video Test Integration Guide

> 用于复用的视频模型测试接入说明，包含模型列表、参数、调用与轮询流程。

## 概述

本指南基于 VOD AIGC 接入文档与当前项目实现，整理「生视频」模型的统一调用方式。适用于在其他项目中快速搭建测试或集成能力。

## 架构与调用流程

```
+---------------+     +----------------+     +---------------------+
|   Frontend    |---->|  Proxy (Dev)   |---->|  VOD API Endpoint   |
+---------------+     +----------------+     +---------------------+
        |                        |                       |
        v                        v                       v
  Create Task             TC3 Signature           TaskId, RequestId
        |
        v
  Poll Task Detail  ------------------------------------>
        |
        v
    Output URLs
```

| 模块             | 职责               | 说明                                   |
| ---------------- | ------------------ | -------------------------------------- |
| Frontend         | 参数收集与结果展示 | 负责表单、并发调用、日志               |
| Proxy (Dev)      | 解决 CORS          | 本项目使用 Vite 代理 `/api/vod`        |
| VOD API Endpoint | 任务处理           | `vod.ap-guangzhou.tencentcloudapi.com` |

## 目标 Endpoint

- Region: `ap-guangzhou`
- Endpoint: `vod.ap-guangzhou.tencentcloudapi.com`
- API Version: `2018-07-17`

## 支持模型（生视频）

| 模型                  | ModelName | ModelVersion |
| --------------------- | --------- | ------------ |
| Hailuo 02             | Hailuo    | 02           |
| Hailuo 2.3            | Hailuo    | 2.3          |
| Hailuo 2.3-fast       | Hailuo    | 2.3-fast     |
| Kling 1.6             | Kling     | 1.6          |
| Kling 2.0             | Kling     | 2.0          |
| Kling 2.1             | Kling     | 2.1          |
| Kling 2.5             | Kling     | 2.5          |
| Kling o1              | Kling     | o1           |
| Kling 2.6             | Kling     | 2.6          |
| Vidu q2               | Vidu      | q2           |
| Vidu q2-turbo         | Vidu      | q2-turbo     |
| Vidu q2-pro           | Vidu      | q2-pro       |
| Jimeng 3.0pro         | Jimeng    | 3.0pro       |
| Seedance 1.0-pro      | Seedance  | 1.0-pro      |
| Seedance 1.0-lite-i2v | Seedance  | 1.0-lite-i2v |
| Seedance 1.0-pro-fast | Seedance  | 1.0-pro-fast |
| Seedance 1.5-pro      | Seedance  | 1.5-pro      |
| GV 3.1                | GV        | 3.1          |
| GV 3.1-fast           | GV        | 3.1-fast     |
| OS 2.0                | OS        | 2.0          |

## 接口清单

| 接口          | Action                | 说明                 |
| ------------- | --------------------- | -------------------- |
| Create Task   | `CreateAigcVideoTask` | 创建 AIGC 生视频任务 |
| Describe Task | `DescribeTaskDetail`  | 查询任务状态与结果   |

## CreateAigcVideoTask 参数

| 参数                         | 类型   | 必填 | 说明                       |
| ---------------------------- | ------ | ---- | -------------------------- |
| `SubAppId`                   | Number | 是   | VOD 子应用 ID              |
| `ModelName`                  | String | 是   | 模型名                     |
| `ModelVersion`               | String | 是   | 模型版本                   |
| `FileInfos`                  | Array  | 否   | 参考输入，支持 Url         |
| `Prompt`                     | String | 是   | 文本提示词                 |
| `EnhancePrompt`              | String | 否   | `Enabled` or `Disabled`    |
| `OutputConfig.StorageMode`   | String | 是   | `Temporary` or `Permanent` |
| `OutputConfig.Resolution`    | String | 否   | `720P` `1080P` `2K` `4K`   |
| `OutputConfig.EnhanceSwitch` | String | 否   | `Enabled` or `Disabled`    |

### JSON 示例

```json
{
  "SubAppId": 1500044236,
  "ModelName": "GV",
  "ModelVersion": "3.1",
  "FileInfos": [
    { "Type": "Url", "Url": "https://example.com/ref.jpg" }
  ],
  "Prompt": "a cat walking",
  "EnhancePrompt": "Enabled",
  "OutputConfig": {
    "StorageMode": "Temporary",
    "Resolution": "1080P",
    "EnhanceSwitch": "Enabled"
  }
}
```

## DescribeTaskDetail 参数

| 参数       | 类型   | 必填 | 说明                    |
| ---------- | ------ | ---- | ----------------------- |
| `TaskId`   | String | 是   | 创建任务返回的 `TaskId` |
| `SubAppId` | Number | 是   | VOD 子应用 ID           |

## 轮询建议

| 项目     | 建议值  |
| -------- | ------- |
| 轮询间隔 | 4 秒    |
| 轮询超时 | 12 分钟 |
| 最大次数 | 120     |

## TC3-HMAC-SHA256 签名要点

- CanonicalRequest 需包含 `content-type` 与 `host`
- SignedHeaders 固定为 `content-type;host`
- Header 需包含:
  - `Authorization`
  - `X-TC-Action`
  - `X-TC-Timestamp`
  - `X-TC-Version`
  - `X-TC-Region`

## CORS 与代理

VOD API 不支持浏览器直接跨域请求。开发环境建议使用代理：

```
proxy:
  /api/vod -> https://vod.ap-guangzhou.tencentcloudapi.com
```

前端请求地址使用 `/api/vod`，签名仍按 `vod.ap-guangzhou.tencentcloudapi.com` 生成。

## 错误处理与日志

| 字段            | 说明        |
| --------------- | ----------- |
| `RequestId`     | 请求 ID     |
| `Error.Code`    | 错误码      |
| `Error.Message` | 错误信息    |
| `HTTP Status`   | HTTP 状态码 |
| `TaskId`        | 任务 ID     |

## TypeScript 调用示例

```ts
import type { VideoTaskRequest } from "@/features/video-test/types/videoTestTypes";
import { createVodAigcClient } from "@/features/video-test/services/vodAigcClient";

const client = createVodAigcClient({
  secretId: "<SECRET_ID>",
  secretKey: "<SECRET_KEY>",
  region: "ap-guangzhou",
  endpointHost: "vod.ap-guangzhou.tencentcloudapi.com",
  requestUrl: "/api/vod",
});

const request: VideoTaskRequest = {
  subAppId: 1500044236,
  model: { id: "GV-3.1", name: "GV", version: "3.1", label: "GV 3.1" },
  input: {
    prompt: "a cat walking",
    enhancePrompt: "Enabled",
    fileInfos: [],
    outputConfig: { storageMode: "Temporary" },
  },
};

const { taskId } = await client.createVideoTask(request);
const detail = await client.describeTaskDetail(taskId, request.subAppId);
```

## 参考资料

- `接入文档.md`
- https://cloud.tencent.com/document/product/266/126239
- https://cloud.tencent.com/document/product/266/33431
