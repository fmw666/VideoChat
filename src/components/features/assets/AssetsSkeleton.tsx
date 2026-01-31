/**
 * @file AssetsSkeleton.tsx
 * @description Skeleton loading component for video grid
 * @author fmw666@github
 * @date 2025-01-31
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import type { FC } from 'react';

// --- Third-party Libraries ---
import { motion } from 'framer-motion';

// =================================================================================================
// Type Definitions
// =================================================================================================

interface AssetsSkeletonProps {
  count?: number;
}

// =================================================================================================
// Component
// =================================================================================================

const AssetsSkeleton: FC<AssetsSkeletonProps> = ({ count = 12 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          className="relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.03 }}
        >
          <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-gray-800 border border-gray-700/50">
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-700/50 to-gray-800 animate-pulse">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                  ease: 'easeInOut'
                }}
              />
            </div>

            {/* Top Badge Skeleton */}
            <div className="absolute top-2 left-2">
              <div className="h-5 w-16 bg-gray-700/50 rounded-lg animate-pulse" />
            </div>

            {/* Bottom Content Skeleton */}
            <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
              {/* Title Lines */}
              <div className="h-4 bg-gray-700/50 rounded-md w-full animate-pulse" />
              <div className="h-4 bg-gray-700/50 rounded-md w-3/4 animate-pulse" />
              {/* Time */}
              <div className="h-3 bg-gray-700/30 rounded-md w-24 animate-pulse" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// =================================================================================================
// Default Export
// =================================================================================================

export default AssetsSkeleton;
