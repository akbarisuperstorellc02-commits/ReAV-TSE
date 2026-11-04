import React, { useState } from 'react';
import { ArrowRight, Users, Layers, Sparkles, Loader2 } from 'lucide-react';
import SpeakerCard from './SpeakerCard';
import { useLanguage } from '../i18n/LanguageContext';

export default function SpeakerGrid({
  persons = [],
  tracks = [],
  selectedPerson,
  onSelectPerson,
  onExtract,
  isExtracting,
  isAnalyzing = false
}) {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' or 'tracks'

  return (
    <div className="flex flex-col h-full space-y-5">
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
            <span>{t('selectTarget')}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            {isAnalyzing 
              ? t('runningFaceDetection')
              : `${persons.length} ${t('detectedSpeakers')}`
            }
          </p>
        </div>

        {/* View Toggle */}
        {!isAnalyzing && (
          <div className="flex items-center p-0.5 rounded-lg bg-surface-elevated border border-surface-border text-xs">
            <button
              onClick={() => setViewMode('grouped')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'grouped'
                  ? 'bg-accent/20 text-white font-medium border border-accent/30 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t('speakers')} ({persons.length})</span>
            </button>
            <button
              onClick={() => setViewMode('tracks')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'tracks'
                  ? 'bg-accent/20 text-white font-medium border border-accent/30 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('rawTracks')} ({tracks.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Grid of Cards or Analyzing Skeleton */}
      <div className="flex-1 overflow-y-auto pr-1 max-h-[460px] space-y-3 min-h-[300px]">
        {isAnalyzing ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-xl bg-surface/50 border border-surface-border">
            <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-accent/30 flex items-center justify-center text-accent shadow-[0_0_25px_rgba(139,92,246,0.3)]">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">{t('analyzingFrames')}</h3>
              <p className="text-xs text-neutral-400 max-w-sm mt-1">
                {t('analysisDescription')}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-lavender-300 bg-accent-muted px-3 py-1 rounded-full border border-accent/20">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
              <span>{t('extractingTracks')}</span>
            </div>
          </div>
        ) : persons.length === 0 ? (
          <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-6 text-neutral-500 text-xs">
            {t('noFaces')}
          </div>
        ) : viewMode === 'grouped' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {persons.map((person) => (
              <SpeakerCard
                key={person.id}
                person={person}
                isSelected={selectedPerson?.id === person.id}
                onSelect={onSelectPerson}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {tracks.map((track) => {
              const isSelected = selectedPerson?.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => onSelectPerson({
                    id: track.id,
                    title: `Track ${track.trackNumber}`,
                    role: `Raw Segment (${track.belongsTo})`,
                    detectedDuration: track.duration,
                    timeSpan: track.timeSpan,
                    tracksCount: 1,
                    trackIds: [track.trackNumber],
                    thumbnailUrl: track.thumbnailUrl
                  })}
                  className={`cursor-pointer p-2 rounded-xl border transition-all text-xs ${
                    isSelected
                      ? 'bg-surface-elevated border-accent ring-1 ring-accent'
                      : 'bg-surface/70 hover:bg-surface-elevated border-surface-border'
                  }`}
                >
                  <img
                    src={track.thumbnailUrl}
                    alt={`Track ${track.trackNumber}`}
                    className="w-full aspect-square object-cover rounded-lg mb-1.5"
                    loading="lazy"
                  />
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="font-semibold text-white">#{track.trackNumber}</span>
                    <span className="text-neutral-400">{track.duration}s</span>
                  </div>
                  <p className="text-[10px] text-neutral-500 font-mono truncate">{track.timeSpan}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom CTA Bar */}
      <div className="pt-4 border-t border-surface-border flex items-center justify-between gap-3">
        <div className="text-xs text-neutral-400">
          {isAnalyzing ? (
            <span className="text-neutral-500 font-mono text-[11px]">Analysis in progress...</span>
          ) : selectedPerson ? (
            <span className="text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Target: <strong className="text-lavender-200">{selectedPerson.title}</strong> ({selectedPerson.detectedDuration}s)
            </span>
          ) : (
            <span>Please choose a target speaker above</span>
          )}
        </div>

        <button
          type="button"
          onClick={onExtract}
          disabled={!selectedPerson || isExtracting || isAnalyzing}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${
            selectedPerson && !isExtracting && !isAnalyzing
              ? 'bg-accent hover:bg-accent-hover text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_28px_rgba(139,92,246,0.6)] cursor-pointer'
              : 'bg-surface-elevated text-neutral-500 border border-surface-border cursor-not-allowed'
          }`}
        >
          <span>Extract this speaker</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
