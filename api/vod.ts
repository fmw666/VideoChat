/**
 * @file api/vod.ts
 * @description Vercel Serverless Function - 腾讯云 VOD API 代理
 * 解决浏览器端直接调用腾讯云 API 的 CORS 问题
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const VOD_API_ENDPOINT = 'https://vod.ap-guangzhou.tencentcloudapi.com';

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-TC-Action, X-TC-Timestamp, X-TC-Version, X-TC-Region',
  'Access-Control-Max-Age': '86400',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 设置 CORS 头
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 转发所有相关的头信息到腾讯云 API
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 转发腾讯云 TC3 签名相关的头
    const tcHeaders = [
      'authorization',
      'x-tc-action',
      'x-tc-timestamp',
      'x-tc-version',
      'x-tc-region',
    ];

    for (const header of tcHeaders) {
      const value = req.headers[header];
      if (value) {
        headers[header] = Array.isArray(value) ? value[0] : value;
      }
    }

    // 发送请求到腾讯云 VOD API
    const response = await fetch(VOD_API_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('VOD API proxy error:', error);
    return res.status(500).json({
      error: 'Proxy error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// 处理 OPTIONS 预检请求
export const config = {
  api: {
    bodyParser: true,
  },
};
