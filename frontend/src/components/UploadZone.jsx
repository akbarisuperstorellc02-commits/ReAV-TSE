import React, { useState } from 'react';
import { UploadCloud, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';

export default function UploadZone({ onVideoSelected }) {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      onVideoSelected(file);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onVideoSelected(file);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-muted border border-accent/20 text-lavender-300 text-xs font-medium tracking-wide mb-6">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>{t('uploadSubtitle')}</span>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-display tracking-tight text-white mb-5 leading-[1.12]">
          {t('uploadTitle')}<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 via-lavender-200 to-accent">
            {t('uploadSubtitle')}
          </span>
        </h1>
        <p className="text-neutral-400 text-lg max-w-2xl mx-auto font-light leading-relaxed">
          {t('uploadDescription')}
        </p>
      </motion.div>

      {/* Upload Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative group flex flex-col items-center justify-center w-full min-h-[300px] sm:min-h-[340px] px-6 py-12 rounded-2xl cursor-pointer transition-all duration-300 glass-panel border ${
            isDragging 
              ? 'border-accent bg-accent/10 shadow-[0_0_40px_rgba(139,92,246,0.25)]' 
              : 'border-surface-border hover:border-surface-border-hover hover:bg-surface/80'
          }`}
        >
          <input
            type="file"
            accept="video/mp4,video/avi,video/quicktime,video/mkv"
            className="hidden"
            onChange={handleFileInput}
          />

          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-surface-border flex items-center justify-center text-lavender-300 group-hover:scale-105 group-hover:border-accent/40 group-hover:text-accent transition-all duration-300 shadow-lg">
              <UploadCloud className="w-8 h-8 stroke-[1.6]" />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
          </div>

          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-white group-hover:text-lavender-200 transition-colors">
              {t('dropVideo')} <span className="text-accent underline underline-offset-4 decoration-accent/40">{t('browse')}</span>
            </p>
            <p className="text-xs uppercase tracking-widest text-neutral-500 font-mono">
              MP4 · MOV · AVI · MKV
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> {t('engineFeature')}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> {t('faceFeature')}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> {t('timelineFeature')}
            </span>
          </div>
        </label>


      </motion.div>
    </div>
  );
}
