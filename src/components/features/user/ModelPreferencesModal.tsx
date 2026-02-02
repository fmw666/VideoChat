/**
 * @file ModelPreferencesModal.tsx
 * @description Modal for managing user model visibility preferences
 * @author fmw666@github
 * @date 2025-01-31
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { FC, useState, useEffect } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

// --- Third-party Libraries ---
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

// --- Internal Libraries ---
// --- Components ---
import { Modal } from '@/components/shared/common/Modal';
// --- Services ---
import { modelManager } from '@/services/model/modelManager';
// --- Store ---
import { useModelStore } from '@/store/modelStore';

// =================================================================================================
// Type Definitions
// =================================================================================================

interface ModelPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ModelItem {
  id: string;
  name: string;
  description: string;
  category: string;
  isVisible: boolean;
}

// =================================================================================================
// Component
// =================================================================================================

export const ModelPreferencesModal: FC<ModelPreferencesModalProps> = ({
  isOpen,
  onClose,
}) => {
  // --- State and Refs ---
  const [models, setModels] = useState<ModelItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // --- Hooks ---
  const { t } = useTranslation();
  const { setModelVisibility, loadVisibilitySettings, resetAllVisibility } = useModelStore();

  // --- Side Effects ---
  useEffect(() => {
    if (isOpen) {
      loadVisibilitySettings().then(() => {
        // 从 store 获取最新的 visibility 状态
        const currentVisibility = useModelStore.getState().modelVisibility;
        const allModels = modelManager.getAllModels();
        const modelItems: ModelItem[] = allModels.map(model => ({
          id: model.id,
          name: model.name,
          description: model.description || '',
          category: model.category,
          isVisible: currentVisibility.get(model.id) ?? true,
        }));
        setModels(modelItems);
      });
    }
  }, [isOpen, loadVisibilitySettings]);

  // --- Logic and Event Handlers ---
  const handleToggle = async (modelId: string, visible: boolean) => {
    setIsSaving(true);
    try {
      await setModelVisibility(modelId, visible);

      // Update local state
      setModels(prev =>
        prev.map(m => (m.id === modelId ? { ...m, isVisible: visible } : m))
      );

      toast.success(
        visible
          ? t('settings.modelPreferences.showSuccess')
          : t('settings.modelPreferences.hideSuccess')
      );
    } catch (error) {
      console.error('Error toggling model visibility:', error);
      toast.error(t('settings.modelPreferences.updateError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAll = async () => {
    setIsSaving(true);
    try {
      await resetAllVisibility();
      setModels(prev => prev.map(m => ({ ...m, isVisible: true })));
      toast.success(t('settings.modelPreferences.resetSuccess'));
    } catch (error) {
      console.error('Error resetting visibility:', error);
      toast.error(t('settings.modelPreferences.resetError'));
    } finally {
      setIsSaving(false);
    }
  };

  // --- Render Logic ---
  const categories = ['all', ...Array.from(new Set(models.map(m => m.category)))];

  const filteredModels =
    selectedCategory === 'all'
      ? models
      : models.filter(m => m.category === selectedCategory);

  const visibleCount = models.filter(m => m.isVisible).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('settings.modelPreferences.title')} maxWidth="3xl" closeOnBackdropClick={true}>
      <div className="space-y-4">
        {/* Header Description */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {t('settings.modelPreferences.subtitle')}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
            {t('settings.modelPreferences.visibleCount', { count: visibleCount, total: models.length })}
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {category === 'all' ? t('common.all') : category}
            </button>
          ))}
        </div>

        {/* Models List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          <AnimatePresence mode="popLayout">
            {filteredModels.map((model, index) => (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Model Icon/Status */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                      model.isVisible
                        ? 'bg-indigo-100 dark:bg-indigo-900/30'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                  >
                    {model.isVisible ? (
                      <EyeIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <EyeSlashIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>

                  {/* Model Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {model.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {model.description}
                    </p>
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {model.category}
                    </span>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggle(model.id, !model.isVisible)}
                  disabled={isSaving}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    model.isVisible ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  role="switch"
                  aria-checked={model.isVisible}
                  aria-label={`Toggle ${model.name}`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      model.isVisible ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredModels.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {t('settings.modelPreferences.noModels')}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleResetAll}
            disabled={isSaving}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('settings.modelPreferences.resetAll')}
          </button>

          <button
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          >
            {t('common.done')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// =================================================================================================
// Default Export
// =================================================================================================

export default ModelPreferencesModal;
