import React, { useState, useEffect } from 'react';
import { Sparkles, Layers, ArrowLeft, Cpu, ExternalLink, HelpCircle, Headphones, Video, AudioWaveform } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import UploadZone from './components/UploadZone';
import VideoPreview from './components/VideoPreview';
import SpeakerGrid from './components/SpeakerGrid';
import ProcessingTimeline from './components/ProcessingTimeline';
import ResultPanel from './components/ResultPanel';
import { useLanguage, supportedLanguages } from './i18n/LanguageContext';
import { apiUrl } from './lib/api';

export default function App() {
  const { language, setLanguage, t } = useLanguage();
  // Navigation & Workflow Stage: 'upload' | 'selection' | 'processing' | 'results'
  const [currentStage, setCurrentStage] = useState('upload');
  const [jobId, setJobId] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [speakersData, setSpeakersData] = useState({ persons: [], tracks: [] });
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [extractionResult, setExtractionResult] = useState(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [mediaMode, setMediaMode] = useState('video');
  const [audioFile, setAudioFile] = useState(null);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioOutputs, setAudioOutputs] = useState([]);
  const [audioNotice, setAudioNotice] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setShowIntro(false), 2600);
    return () => window.clearTimeout(timer);
  }, []);

  const audioCopy = {
    en: { video: 'Video mode', audio: 'Audio-only mode', audioTitle: 'Separate voices from audio', audioDesc: 'Choose an audio file. The current two-source model creates compact WAV stems with silent gaps removed.', choose: 'Choose audio file', run: 'Separate audio', busy: 'Separating voices…', output: 'Separated audio files', note: 'Current bundled model supports two audio sources. The output labels are source 1 and source 2, not verified speaker identities.' },
    fa: { video: 'حالت ویدیویی', audio: 'حالت فقط صوتی', audioTitle: 'جداسازی گویندگان از فایل صوتی', audioDesc: 'یک فایل صوتی انتخاب کنید. مدل فعلی دو مسیر صوتی فشرده می‌سازد و فاصله‌های سکوت را حذف می‌کند.', choose: 'انتخاب فایل صوتی', run: 'جداسازی صدا', busy: 'در حال جداسازی صدا…', output: 'فایل‌های صوتی جداشده', note: 'مدل فعلی همراه برنامه دو منبع صوتی را جدا می‌کند. شماره منبع‌ها به معنی تشخیص هویت قطعی گوینده نیست.' },
    ps: { video: 'ویډیويي حالت', audio: 'یوازې غږیز حالت', audioTitle: 'له غږیز فایل څخه د ویونکو بېلول', audioDesc: 'یو غږیز فایل وټاکئ. اوسنی ماډل دوه فشرده WAV برخې جوړوي او د چوپتیا تشې لرې کوي.', choose: 'غږیز فایل وټاکئ', run: 'غږ جلا کړئ', busy: 'غږونه جلا کېږي…', output: 'جلا شوي غږیز فایلونه', note: 'اوسنی ماډل دوه غږیزې سرچینې بېلوي. د سرچینې شمېر د ویونکي تایید شوی هویت نه دی.' },
    ar: { video: 'وضع الفيديو', audio: 'وضع الصوت فقط', audioTitle: 'فصل المتحدثين من ملف صوتي', audioDesc: 'اختر ملفاً صوتياً. ينشئ النموذج الحالي مسارين WAV مضغوطين مع حذف فترات الصمت.', choose: 'اختر ملفاً صوتياً', run: 'فصل الصوت', busy: 'جارٍ فصل الأصوات…', output: 'الملفات الصوتية المفصولة', note: 'النموذج المضمّن حالياً يفصل مصدرين صوتيين. أرقام المصادر لا تعني التحقق من هوية المتحدث.' }
  }[language] || null;
  const ac = audioCopy || { video: 'Video mode', audio: 'Audio-only mode', audioTitle: 'Separate voices from audio', audioDesc: 'Choose an audio file.', choose: 'Choose audio file', run: 'Separate audio', busy: 'Separating…', output: 'Separated files', note: 'Two-source model; source labels are not verified speaker identities.' };

  const handleAudioSeparation = async () => {
    if (!audioFile) return;
    setAudioBusy(true); setAudioOutputs([]); setAudioNotice('');
    try {
      const form = new FormData(); form.append('file', audioFile);
      const upload = await fetch(apiUrl('/api/audio/upload'), { method: 'POST', body: form });
      const uploaded = await upload.json();
      if (!upload.ok) throw new Error(uploaded.detail || 'Audio upload failed');
      const response = await fetch(apiUrl('/api/audio/separate'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_id: uploaded.job_id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Audio separation failed');
      setAudioOutputs(result.separated_sources || []); setAudioNotice(result.notice || ac.note);
    } catch (error) { alert(error.message); } finally { setAudioBusy(false); }
  };

  useEffect(() => {
    // Restore latest active analyzed job if present
    fetch(apiUrl('/api/jobs/latest'))
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        if (data?.job_id) {
          console.log(`[Frontend] Found latest job_id: ${data.job_id}`);
          setJobId(data.job_id);
          setVideoUrl(apiUrl(data.video_url));

          // Fetch fresh speakers directly from /api/jobs/{CURRENT_JOB_ID}/speakers
          console.log(`[Frontend] Fetching /api/jobs/${data.job_id}/speakers`);
          const spRes = await fetch(apiUrl(`/api/jobs/${data.job_id}/speakers?t=${Date.now()}`));
          if (spRes.ok) {
            const spData = await spRes.json();
            console.log(`[Frontend] /api/jobs/${data.job_id}/speakers response:`, spData);
            console.log(`[Frontend] Loaded ${spData.persons?.length || 0} persons, ${spData.tracks?.length || 0} raw tracks`);
            setSpeakersData({
              persons: (spData.persons || []).map(p => ({ ...p, thumbnailUrl: apiUrl(p.thumbnailUrl), galleryThumbnails: (p.galleryThumbnails || []).map(apiUrl) })),
              tracks: (spData.tracks || []).map(t => ({ ...t, thumbnailUrl: apiUrl(t.thumbnailUrl) }))
            });
            if (spData.persons?.length > 0) {
              setSelectedPerson(spData.persons[0]);
            }
            setCurrentStage('selection');
          }
        }
      })
      .catch((err) => console.error("[Frontend] Initial job load error:", err));
  }, []);

  const handleVideoSelected = async (selectedFile) => {
    // 1. Immediately clear old speaker state and cache
    setSpeakersData({ persons: [], tracks: [] });
    setSelectedPerson(null);
    setExtractionResult(null);
    setIsAnalyzing(true);
    setCurrentStage('selection');

    try {
      let uploadRes;
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch(apiUrl('/api/upload'), {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Video upload failed');
      }
      uploadRes = await res.json();

      const newJobId = uploadRes.job_id;
      console.log(`[Frontend] Upload succeeded! Current job_id: ${newJobId}`);
      setJobId(newJobId);
      setVideoUrl(apiUrl(uploadRes.video_url));

      // 2. Trigger fresh video analysis for this specific job
      console.log(`[Frontend] Triggering /api/analyze for job: ${newJobId}`);
      const analyzeRes = await fetch(apiUrl('/api/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: newJobId }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.detail || 'Video analysis failed');
      console.log(`[Frontend] /api/analyze completed:`, analyzeData);

      // 3. Fetch verified speaker grouping specifically for this CURRENT_JOB_ID
      console.log(`[Frontend] Fetching: /api/jobs/${newJobId}/speakers`);
      const speakersRes = await fetch(apiUrl(`/api/jobs/${newJobId}/speakers?t=${Date.now()}`));
      const speakersDataResponse = await speakersRes.json();
      if (!speakersRes.ok) throw new Error(speakersDataResponse.detail || 'Could not load detected speakers');
      console.log(`[Frontend] /api/jobs/${newJobId}/speakers returned:`, speakersDataResponse);
      console.log(`[Frontend] Clustered persons count: ${speakersDataResponse.persons?.length || 0}`);
      console.log(`[Frontend] Raw tracks count: ${speakersDataResponse.tracks?.length || 0}`);

      setSpeakersData({
        persons: (speakersDataResponse.persons || []).map(p => ({ ...p, thumbnailUrl: apiUrl(p.thumbnailUrl), galleryThumbnails: (p.galleryThumbnails || []).map(apiUrl) })),
        tracks: (speakersDataResponse.tracks || []).map(t => ({ ...t, thumbnailUrl: apiUrl(t.thumbnailUrl) })),
      });

      if (speakersDataResponse.persons && speakersDataResponse.persons.length > 0) {
        setSelectedPerson(speakersDataResponse.persons[0]);
      }
    } catch (err) {
      console.error("[Frontend] Video processing error:", err);
      alert(t('uploadFailed') + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartExtraction = () => {
    if (!selectedPerson || !jobId) return;
    setCurrentStage('processing');
    setExtractionResult(null);

    // Trigger backend extraction API specifically for this job and selected person
    fetch(apiUrl('/api/extract'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        target: selectedPerson.id,
        mode: 'person'
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Extraction failed (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        setExtractionResult(data);
        setCurrentStage('results');
      })
      .catch((err) => {
        console.error("Extraction error:", err);
        alert(t('extractionFailed') + err.message);
        setCurrentStage('selection');
      });
  };

  const handleProcessingComplete = () => {
    setCurrentStage('results');
  };

  const handleReset = () => {
    setCurrentStage('selection');
  };

  return (
    <>
      <AnimatePresence>
        {showIntro && (
          <motion.div key="intro" className="fixed inset-0 z-[100] bg-[#08080d] flex flex-col items-center justify-center overflow-hidden"
            initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.025 }} transition={{ duration: 0.65 }}>
            <motion.div className="absolute w-[440px] h-[440px] rounded-full bg-violet-600/15 blur-[100px]"
              animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.35, 0.75, 0.35] }} transition={{ duration: 2.4, repeat: Infinity }} />
            <motion.div initial={{ scale: 0.6, opacity: 0, rotate: -18 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 130, damping: 12 }}
              className="relative w-24 h-24 rounded-[28px] border border-violet-300/30 bg-gradient-to-br from-violet-500/30 to-cyan-400/10 shadow-[0_0_70px_rgba(139,92,246,0.3)] flex items-center justify-center text-violet-200">
              <AudioWaveform className="w-12 h-12" />
            </motion.div>
            <motion.h1 initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }} className="relative mt-7 text-3xl font-bold tracking-[0.18em] text-white">ReAV-TSE</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="relative mt-2 text-xs tracking-[0.22em] uppercase text-violet-200/60">AI Audio · Visual Separation</motion.p>
            <div className="relative flex items-center gap-1.5 mt-8 h-8">{Array.from({ length: 25 }).map((_, i) => <motion.span key={i} className="w-1 rounded-full bg-gradient-to-t from-violet-600 to-cyan-300" animate={{ height: [7, 12 + ((i * 13) % 23), 7], opacity: [0.35, 1, 0.35] }} transition={{ duration: 0.55 + (i % 5) * 0.12, repeat: Infinity, delay: i * 0.025 }} />)}</div>
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="relative mt-8 text-[10px] tracking-widest text-neutral-500">INITIALIZING OFFLINE AI ENGINE</motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    <div className="min-h-screen bg-background text-neutral-200 flex flex-col font-sans selection:bg-accent/30 selection:text-white">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-50 w-full glass-panel border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & App Identity */}
          <div 
            onClick={() => setCurrentStage('upload')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-surface-border group-hover:border-accent/50 flex items-center justify-center text-accent shadow-sm transition-all">
              <Sparkles className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold font-display tracking-tight text-white text-base">ReAV-TSE</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent-muted text-lavender-300 border border-accent/20">
                  {jobId ? jobId.slice(0, 14) : t('multiJobAI')}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 -mt-0.5 hidden sm:block">
                {t('appSubtitle')}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-4 text-xs text-neutral-400">
            <label className="flex items-center gap-2">
              <span className="sr-only">{t('language')}</span>
              <select aria-label={t('language')} value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-surface-elevated border border-surface-border rounded-lg px-2 py-1.5 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-accent">
                {supportedLanguages.map((item) => <option key={item.code} value={item.code}>{item.native}</option>)}
              </select>
            </label>
            <button
              onClick={() => setCurrentStage('selection')}
              className={`transition-colors hover:text-white ${currentStage !== 'upload' ? 'text-white font-medium' : ''}`}
            >
              {t('workspace')}
            </button>
            <button
              onClick={() => setShowHowItWorks(true)}
              className="transition-colors hover:text-white flex items-center gap-1"
            >
              <span>{t('howItWorks')}</span>
              <HelpCircle className="w-3 h-3 text-neutral-500" />
            </button>
            <a
              href="https://github.com/alibaba/ClearerVoice-Studio"
              target="_blank"
              rel="noreferrer"
              className="hidden md:flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors"
            >
              <Cpu className="w-3.5 h-3.5 text-accent" />
              <span>AV-MossFormer2</span>
              <ExternalLink className="w-3 h-3 text-neutral-600" />
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content Area with Seamless Transitions */}
      <main className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* PAGE 1: Upload / Landing */}
          {currentStage === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="py-12"
            >
              <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-7">
                <div className="grid grid-cols-2 gap-3 p-2 rounded-2xl glass-panel border border-surface-border">
                  <button onClick={() => setMediaMode('video')} className={`rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm transition-all ${mediaMode === 'video' ? 'bg-accent text-white shadow-lg' : 'text-neutral-400 hover:text-white'}`}>
                    <Video className="w-4 h-4" /> {ac.video}
                  </button>
                  <button onClick={() => setMediaMode('audio')} className={`rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm transition-all ${mediaMode === 'audio' ? 'bg-accent text-white shadow-lg' : 'text-neutral-400 hover:text-white'}`}>
                    <Headphones className="w-4 h-4" /> {ac.audio}
                  </button>
                </div>
              </div>
              {mediaMode === 'video' ? (
                <UploadZone onVideoSelected={handleVideoSelected} />
              ) : (
                <section className="max-w-4xl mx-auto px-4 sm:px-6">
                  <div className="glass-panel border border-surface-border rounded-3xl p-7 sm:p-10 text-center shadow-2xl">
                    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent"><AudioWaveform className="w-8 h-8" /></div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">{ac.audioTitle}</h1>
                    <p className="text-sm text-neutral-400 max-w-xl mx-auto mb-7">{ac.audioDesc}</p>
                    <label className="block border border-dashed border-accent/40 rounded-2xl p-6 cursor-pointer hover:bg-accent/5 transition-colors">
                      <input type="file" accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.aac" className="sr-only" onChange={(e) => { setAudioFile(e.target.files?.[0] || null); setAudioOutputs([]); }} />
                      <Headphones className="w-7 h-7 mx-auto mb-2 text-accent" />
                      <span className="text-sm text-white">{audioFile ? audioFile.name : ac.choose}</span>
                      <span className="block text-xs text-neutral-500 mt-2">WAV · MP3 · M4A · FLAC · OGG · AAC</span>
                    </label>
                    <button disabled={!audioFile || audioBusy} onClick={handleAudioSeparation} className="mt-5 px-7 py-3 rounded-xl bg-accent text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all">{audioBusy ? ac.busy : ac.run}</button>
                    {audioBusy && <motion.div className="h-1 rounded-full bg-accent mt-6" initial={{ width: '5%' }} animate={{ width: '95%' }} transition={{ duration: 25, ease: 'linear' }} />}
                    {audioOutputs.length > 0 && <div className="mt-8 text-left border-t border-surface-border pt-6"><h2 className="text-white font-semibold mb-4">{ac.output}</h2><div className="grid sm:grid-cols-2 gap-3">{audioOutputs.map((item) => <a key={item.speaker} href={apiUrl(item.downloadUrl)} className="rounded-xl border border-surface-border bg-surface-elevated p-4 text-sm text-white hover:border-accent/60">Source {item.speaker} · Download WAV</a>)}</div><p className="text-xs text-amber-300/80 mt-4 leading-relaxed">{audioNotice || ac.note}</p></div>}
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {/* PAGE 2: Speaker Selection */}
          {currentStage === 'selection' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6"
            >
              {/* Back to Upload button */}
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => setCurrentStage('upload')}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors py-1 px-2 -ml-2 rounded-lg hover:bg-surface-elevated"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t('uploadDifferent')}</span>
                </button>

                {jobId && (
                  <span className="font-mono text-[11px] text-neutral-500">
                    {t('session')}: {jobId}
                  </span>
                )}
              </div>

              {/* Two-Column Workspace Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Large Video Preview */}
                <div className="lg:col-span-6 space-y-4">
                  {videoUrl ? (
                    <VideoPreview
                      videoUrl={videoUrl}
                      title={`${t('activeVideo')} (${jobId ? jobId.slice(0, 10)  : t('loaded')})`}
                    />
                  ) : (
                    <div className="aspect-video rounded-2xl glass-panel flex items-center justify-center text-neutral-500 text-xs">
                      {t('loadingVideo')}
                    </div>
                  )}
                  <div className="p-3.5 rounded-xl glass-panel border border-surface-border text-xs text-neutral-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-neutral-300">
                      <Cpu className="w-3.5 h-3.5 text-accent" />
                      {t('engineLabel')}
                    </span>
                    <span className="font-mono text-neutral-500">
                      {isAnalyzing ? t("processing") : `${speakersData.tracks?.length || 0} ${t('tracksActiveLabel')}`}
                    </span>
                  </div>
                </div>

                {/* Right Column: Speaker Selection Panel */}
                <div className="lg:col-span-6 glass-panel rounded-2xl p-6 border border-surface-border shadow-xl">
                  <SpeakerGrid
                    persons={speakersData.persons}
                    tracks={speakersData.tracks}
                    selectedPerson={selectedPerson}
                    onSelectPerson={setSelectedPerson}
                    onExtract={handleStartExtraction}
                    isExtracting={currentStage === 'processing'}
                    isAnalyzing={isAnalyzing}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* PAGE 3: Processing Screen */}
          {currentStage === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="py-12 flex-1 flex items-center justify-center"
            >
              <ProcessingTimeline
                jobId={jobId}
                selectedPerson={selectedPerson}
                isComplete={!!extractionResult}
                onComplete={handleProcessingComplete}
              />
            </motion.div>
          )}

          {/* PAGE 4: Results Workspace */}
          {currentStage === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="py-4"
            >
              <ResultPanel
                jobId={jobId}
                selectedPerson={selectedPerson}
                extractionData={extractionResult}
                onReset={handleReset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-surface-border py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500 font-mono">
          <span>ReAV-TSE · {t('poweredBy')}</span>
          <span className="text-neutral-400">{t('footerTagline')}</span>
        </div>
      </footer>

      {/* How it works modal */}
      {showHowItWorks && (
        <div 
          onClick={() => setShowHowItWorks(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg glass-panel-elevated rounded-2xl p-6 border border-surface-border shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <h3 className="text-lg font-bold font-display text-white">{t("howTitle")}</h3>
              <button 
                onClick={() => setShowHowItWorks(false)}
                className="text-neutral-400 hover:text-white text-xs px-2 py-1 rounded bg-surface border border-surface-border"
              >
                {t('close')}
              </button>
            </div>
            
            <div className="space-y-3 text-xs text-neutral-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-surface border border-surface-border">
                <strong className="text-white block mb-1">1. {t('howStep1')}</strong>
                {t('howStep1Desc')}
              </div>
              <div className="p-3 rounded-xl bg-surface border border-surface-border">
                <strong className="text-white block mb-1">2. {t('howStep2')}</strong>
                {t('howStep2Desc')}
              </div>
              <div className="p-3 rounded-xl bg-surface border border-surface-border">
                <strong className="text-white block mb-1">3. {t('howStep3')}</strong>
                {t('howStep3Desc')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
