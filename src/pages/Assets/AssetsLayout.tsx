/**
 * @file AssetsLayout.tsx
 * @description AssetsLayout component, provides the layout wrapper for assets pages.
 * @author fmw666@github
 * @date 2025-07-18
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { FC, ReactNode } from 'react';

// --- Internal Libraries ---
// --- Components ---
import BaseLayout from '@/components/shared/layout/BaseLayout';

// =================================================================================================
// Type Definitions
// =================================================================================================

interface AssetsLayoutProps {
  children: ReactNode;
}

// =================================================================================================
// Component
// =================================================================================================

const AssetsLayout: FC<AssetsLayoutProps> = ({ children }) => {
  // --- Render Logic ---
  return (
    <BaseLayout type="assets">
      {children}
    </BaseLayout>
  );
};

// =================================================================================================
// Default Export
// =================================================================================================

export default AssetsLayout; 
