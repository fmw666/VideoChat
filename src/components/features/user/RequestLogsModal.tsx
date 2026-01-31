/**
 * @file RequestLogsModal.tsx
 * @description Modal component for displaying video task logs (using video_tasks table)
 * @author fmw666@github
 * @date 2025-01-31
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useEffect, useState, useCallback, useMemo } from 'react';
import type { FC } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';

// --- Third-party Libraries ---
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  FilmIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

// --- Internal Libraries ---
// --- Components ---
import { Modal } from '@/components/shared/common/Modal';
// --- Services ---
import { videoTaskService, type VideoTask } from '@/services/model/videoTaskService';
import { supabase } from '@/services/api/supabase';
import type { VideoTaskStatus } from '@/config/models.types';

// =================================================================================================
// Type Definitions
// =================================================================================================

interface RequestLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = 'all' | 'FINISH' | 'FAIL' | 'PROCESSING';

// =================================================================================================
// Constants
// =================================================================================================

const STATUS_STYLES: Record<VideoTaskStatus, string> = {
  PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  FINISH: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  FAIL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_ICONS: Record<VideoTaskStatus, typeof ClockIcon> = {
  PROCESSING: ArrowPathIcon,
  FINISH: CheckCircleIcon,
  FAIL: XCircleIcon,
};

// =================================================================================================
// Sub Components
// =================================================================================================

interface LogItemProps {
  task: VideoTask;
  isExpanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}

const LogItem: FC<LogItemProps> = ({ task, isExpanded, onToggle, t }) => {
  const StatusIcon = STATUS_ICONS[task.status] || ArrowPathIcon;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatDuration = (ms?: number | null) => {
    if (!ms) return null;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getStatusKey = (status: VideoTaskStatus) => {
    switch (status) {
      case 'FINISH': return 'success';
      case 'FAIL': return 'failed';
      case 'PROCESSING': return 'processing';
      default: return 'pending';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800/50 overflow-hidden transition-shadow duration-200 hover:shadow-md"
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        {/* Status Icon */}
        <div className={`flex-shrink-0 p-2 rounded-lg ${STATUS_STYLES[task.status]}`}>
          <StatusIcon className={`w-5 h-5 ${task.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FilmIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {task.model_name} {task.model_version}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_STYLES[task.status]}`}>
              {t(`requestLogs.status.${getStatusKey(task.status)}`)}
            </span>
          </div>
          {task.prompt && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {truncateText(task.prompt)}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{formatTime(task.created_at)}</span>
            {task.total_time_ms && (
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                {formatDuration(task.total_time_ms)}
              </span>
            )}
            {task.status === 'PROCESSING' && task.progress !== null && (
              <span className="text-blue-600 dark:text-blue-400">
                {task.progress}%
              </span>
            )}
          </div>
        </div>

        {/* Expand Icon */}
        <div className="flex-shrink-0 text-gray-400 dark:text-gray-500">
          {isExpanded ? (
            <ChevronUpIcon className="w-5 h-5" />
          ) : (
            <ChevronDownIcon className="w-5 h-5" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-200 dark:border-gray-700"
          >
            <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
              {/* Model Info */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('requestLogs.detail.model')}
                </h4>
                <p className="text-sm text-gray-900 dark:text-white">
                  {task.model_name} {task.model_version}
                  {task.model_id && <span className="text-gray-500 dark:text-gray-400 ml-2">({task.model_id})</span>}
                </p>
              </div>

              {/* Task ID */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('requestLogs.detail.requestId')}
                </h4>
                <p className="text-sm text-gray-900 dark:text-white font-mono">
                  {task.task_id}
                </p>
              </div>

              {/* Full Prompt */}
              {task.prompt && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('requestLogs.detail.prompt')}
                  </h4>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap break-words">
                    {task.prompt}
                  </p>
                </div>
              )}

              {/* Output Config */}
              {task.output_config && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('requestLogs.detail.params')}
                  </h4>
                  <pre className="text-xs text-gray-900 dark:text-gray-200 bg-gray-100 dark:bg-gray-800/80 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(task.output_config, null, 2)}
                  </pre>
                </div>
              )}

              {/* Video Result */}
              {task.status === 'FINISH' && task.supabase_video_url && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('requestLogs.detail.response')}
                  </h4>
                  <div className="flex items-center gap-4">
                    {task.supabase_cover_url && (
                      <img 
                        src={task.supabase_cover_url} 
                        alt="Video cover" 
                        className="w-24 h-auto rounded-lg"
                      />
                    )}
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {task.duration && <p>时长: {task.duration}s</p>}
                      {task.resolution && <p>分辨率: {task.resolution}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {task.error_message && (
                <div>
                  <h4 className="text-xs font-medium text-red-500 dark:text-red-400 mb-1">
                    {t('requestLogs.detail.error')}
                  </h4>
                  <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    {task.error_message}
                    {task.error_code && <span className="ml-2">({task.error_code})</span>}
                  </p>
                </div>
              )}

              {/* Statistics */}
              {(task.total_time_ms || task.poll_count) && (
                <div className="flex gap-6 text-xs text-gray-500 dark:text-gray-400">
                  {task.total_time_ms && (
                    <span>{t('requestLogs.detail.duration')}: {formatDuration(task.total_time_ms)}</span>
                  )}
                  {task.poll_count && (
                    <span>轮询次数: {task.poll_count}</span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// =================================================================================================
// Main Component
// =================================================================================================

export const RequestLogsModal: FC<RequestLogsModalProps> = ({ isOpen, onClose }) => {
  // --- State ---
  const [tasks, setTasks] = useState<VideoTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, processing: 0 });

  // --- Hooks ---
  const { t } = useTranslation();

  // --- Filter Buttons Configuration ---
  const filterButtons = useMemo(() => [
    { id: 'all' as FilterType, label: t('requestLogs.filter.all') },
    { id: 'FINISH' as FilterType, label: t('requestLogs.filter.success') },
    { id: 'FAIL' as FilterType, label: t('requestLogs.filter.failed') },
    { id: 'PROCESSING' as FilterType, label: t('requestLogs.filter.pending') },
  ], [t]);

  // --- Data Fetching ---
  const fetchTasks = useCallback(async (pageNum: number, statusFilter: FilterType, append = false) => {
    setIsLoading(true);
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTasks([]);
        return;
      }

      const pageSize = 20;
      const from = (pageNum - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('video_tasks')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      if (append) {
        setTasks((prev) => [...prev, ...(data || [])]);
      } else {
        setTasks(data || []);
      }
      setHasMore((count || 0) > to + 1);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('video_tasks')
        .select('status')
        .eq('user_id', user.id);

      if (error) throw error;

      const taskList = data || [];
      setStats({
        total: taskList.length,
        success: taskList.filter(t => t.status === 'FINISH').length,
        failed: taskList.filter(t => t.status === 'FAIL').length,
        processing: taskList.filter(t => t.status === 'PROCESSING').length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // --- Side Effects ---
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setExpandedTaskId(null);
      fetchTasks(1, filter);
      fetchStats();
    }
  }, [isOpen, filter, fetchTasks, fetchStats]);

  // --- Event Handlers ---
  const handleFilterChange = useCallback((newFilter: FilterType) => {
    setFilter(newFilter);
    setPage(1);
    setExpandedTaskId(null);
  }, []);

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTasks(nextPage, filter, true);
  }, [page, filter, fetchTasks]);

  const handleToggleExpand = useCallback((taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  }, []);

  // --- Render ---
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('requestLogs.title')}
      maxWidth="3xl"
      className="w-[800px]"
      closeOnBackdropClick={true}
      zIndex={998}
    >
      <div className="flex flex-col h-[600px]">
        {/* Stats Bar */}
        <div className="flex items-center gap-6 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="flex items-center gap-2">
            <FilmIcon className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {t('requestLogs.stats.total')}: <strong>{stats.total}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {t('requestLogs.stats.success')}: <strong className="text-green-600 dark:text-green-400">{stats.success}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <XCircleIcon className="w-5 h-5 text-red-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {t('requestLogs.stats.failed')}: <strong className="text-red-600 dark:text-red-400">{stats.failed}</strong>
            </span>
          </div>
          {stats.processing > 0 && (
            <div className="flex items-center gap-2">
              <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                处理中: <strong className="text-blue-600 dark:text-blue-400">{stats.processing}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 mb-4">
          {filterButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => handleFilterChange(btn.id)}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                filter === btn.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Tasks List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {isLoading && tasks.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                <span>{t('requestLogs.loading')}</span>
              </div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <FilmIcon className="w-12 h-12 mb-3 opacity-50" />
              <p>{t('requestLogs.empty')}</p>
            </div>
          ) : (
            <AnimatePresence>
              {tasks.map((task) => (
                <LogItem
                  key={task.id}
                  task={task}
                  isExpanded={expandedTaskId === task.id}
                  onToggle={() => handleToggleExpand(task.id)}
                  t={t}
                />
              ))}
            </AnimatePresence>
          )}

          {/* Load More Button */}
          {hasMore && !isLoading && (
            <button
              onClick={handleLoadMore}
              className="w-full py-3 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
            >
              {t('requestLogs.loadMore')}
            </button>
          )}

          {/* Loading More Indicator */}
          {isLoading && tasks.length > 0 && (
            <div className="flex items-center justify-center py-4">
              <ArrowPathIcon className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

// =================================================================================================
// Default Export
// =================================================================================================

export default RequestLogsModal;
