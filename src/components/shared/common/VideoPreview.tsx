/**
 * @file VideoPreview.tsx
 * @description Full-screen video preview modal with playback controls and download functionality.
 * @author fmw666@github
 * @date 2025-07-18
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useState, useRef, useCallback, useEffect } from 'react';
import type { FC } from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';

// --- Third-party Libraries ---
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowDownTrayIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from '@heroicons/react/24/solid';

// =================================================================================================
// Type Definitions
// =================================================================================================

interface VideoPreviewProps {
  videoUrl: string;
  coverUrl?: string | null;
  duration?: number | null;
  onClose: () => void;
}

// =================================================================================================
// Component
// =================================================================================================

export const VideoPreview: FC<VideoPreviewProps> = ({
  videoUrl,
  coverUrl,
  duration,
  onClose,
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(duration || 0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  // Hide controls after inactivity
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      clearTimeout(timer);
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [isPlaying]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'm':
        case 'M':
          handleMuteToggle();
          break;
        case 'f':
        case 'F':
          handleFullscreenToggle();
          break;
        case 'ArrowLeft':
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
          }
          break;
        case 'ArrowRight':
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(videoDuration, videoRef.current.currentTime + 5);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, videoDuration]);

  // Event Handlers
  const handlePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleMuteToggle = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleFullscreenToggle = useCallback(async () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Fullscreen error:', err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error('Exit fullscreen error:', err);
      }
    }
  }, [isFullscreen]);

  const handleDownload = useCallback(async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  }, [videoUrl, isDownloading]);

  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
    setShowControls(true);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
        onClick={onClose}
      >
        <div
          ref={containerRef}
          className="relative w-full h-full max-w-6xl max-h-[90vh] mx-4 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Video */}
          <video
            ref={videoRef}
            src={videoUrl}
            poster={coverUrl || undefined}
            className="max-w-full max-h-full object-contain rounded-lg"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleVideoEnded}
            onClick={handlePlayPause}
          />

          {/* Controls Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showControls ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col justify-between pointer-events-none"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-auto">
              <h3 className="text-white font-medium">
                {t('chat.video.preview')}
              </h3>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Center Play Button (when paused) */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                <button
                  onClick={handlePlayPause}
                  className="w-20 h-20 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-all"
                >
                  <PlayIcon className="h-10 w-10 text-white ml-1" />
                </button>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="p-4 bg-gradient-to-t from-black/50 to-transparent pointer-events-auto">
              {/* Progress Bar */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-white text-sm min-w-[45px]">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={videoDuration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-1 bg-white/30 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-3
                    [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:bg-white
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <span className="text-white text-sm min-w-[45px]">
                  {formatTime(videoDuration)}
                </span>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Play/Pause */}
                  <button
                    onClick={handlePlayPause}
                    className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                  >
                    {isPlaying ? (
                      <PauseIcon className="h-6 w-6" />
                    ) : (
                      <PlayIcon className="h-6 w-6" />
                    )}
                  </button>

                  {/* Mute/Unmute */}
                  <button
                    onClick={handleMuteToggle}
                    className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                  >
                    {isMuted ? (
                      <SpeakerXMarkIcon className="h-6 w-6" />
                    ) : (
                      <SpeakerWaveIcon className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Download */}
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="p-2 rounded-full hover:bg-white/20 text-white transition-colors disabled:opacity-50"
                    title={t('chat.video.download')}
                  >
                    <ArrowDownTrayIcon className={`h-6 w-6 ${isDownloading ? 'animate-bounce' : ''}`} />
                  </button>

                  {/* Fullscreen */}
                  <button
                    onClick={handleFullscreenToggle}
                    className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                    title={t('chat.video.fullscreen')}
                  >
                    {isFullscreen ? (
                      <ArrowsPointingInIcon className="h-6 w-6" />
                    ) : (
                      <ArrowsPointingOutIcon className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoPreview;
