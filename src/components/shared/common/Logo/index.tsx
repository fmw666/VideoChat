/**
 * @file Logo.tsx
 * @description Logo component, provides a logo for the application.
 * @author fmw666@github
 * @date 2025-07-18
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import type { FC } from 'react';

// --- Third-party Libraries ---
import { motion } from 'framer-motion';

// =================================================================================================
// Component
// =================================================================================================

export const Logo: FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center py-6"
    >
      <div className="relative flex items-center gap-2">
        {/* 简约的视频图标 */}
        <div className="w-8 h-8 rounded-lg bg-primary-900 dark:bg-primary-100 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-white dark:text-primary-900"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        {/* 品牌名称 - 简约字体 */}
        <h1 className="text-xl font-semibold text-primary-900 dark:text-primary-100 tracking-tight">
          VideoChat
        </h1>
      </div>
    </motion.div>
  );
};
