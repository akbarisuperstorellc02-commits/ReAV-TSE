import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const dictionaries = {
  en: {
    language: 'Language', workspace: 'Workspace', howItWorks: 'How it works',
    uploadDifferent: 'Upload different video', loadingVideo: 'Loading video player...',
    processing: 'Processing...', tracksActive: 'tracks active',
    close: 'Close', howTitle: 'How ReAV-TSE Works',
    uploadError: 'Failed to analyze video: ', extractionError: 'Extraction failed: ',
    footerTagline: 'Multi-Job Dynamic Audio-Visual Separation',
    selectSpeaker: 'Select a target speaker', analyzing: 'Analyzing video...',
    uploadTitle: 'Extract any speaker.', uploadSubtitle: 'Keep their voice.',
    browse: 'browse files', dropVideo: 'Drop your video here or',
    launchDemo: 'Launch Demo Video', loadingSample: 'Loading sample...',
    speakers: 'Speakers', rawTracks: 'Raw Tracks', extract: 'Extract Target Speech',
    chooseSpeaker: 'Please choose a target speaker above', downloadWav: 'Download WAV',
    original: 'Original', isolated: 'Isolated', play: 'Play', pause: 'Pause',
    restart: 'Restart', mute: 'Mute', unmute: 'Unmute', fullscreen: 'Fullscreen',
    results: 'Results', targetSpeaker: 'Target Speaker', activeSpeech: 'Active Speech',
    segments: 'Segments', totalTimeline: 'Total Timeline', settings: 'Settings'
  },
  fa: {
    language: 'زبان', workspace: 'محیط کار', howItWorks: 'طرز کار برنامه',
    uploadDifferent: 'بارگذاری ویدیوی دیگر', loadingVideo: 'در حال بارگذاری پخش‌کننده ویدیو...',
    processing: 'در حال پردازش...', tracksActive: 'مسیر فعال',
    close: 'بستن', howTitle: 'ReAV-TSE چگونه کار می‌کند؟',
    uploadError: 'تحلیل ویدیو ناموفق بود: ', extractionError: 'استخراج صدا ناموفق بود: ',
    footerTagline: 'جداسازی هوشمند صدا و تصویر با چندین وظیفه',
    selectSpeaker: 'گوینده موردنظر را انتخاب کنید', analyzing: 'در حال تحلیل ویدیو...',
    uploadTitle: 'صدای هر گوینده را جدا کنید.', uploadSubtitle: 'فقط صدای او را نگه دارید.',
    browse: 'انتخاب فایل', dropVideo: 'ویدیو را اینجا رها کنید یا',
    launchDemo: 'اجرای ویدیوی نمونه', loadingSample: 'در حال بارگذاری نمونه...',
    speakers: 'گویندگان', rawTracks: 'مسیرهای خام', extract: 'استخراج صدای گوینده',
    chooseSpeaker: 'لطفاً ابتدا یک گوینده را انتخاب کنید', downloadWav: 'دانلود WAV',
    original: 'صدای اصلی', isolated: 'صدای جداشده', play: 'پخش', pause: 'توقف',
    restart: 'شروع دوباره', mute: 'بی‌صدا', unmute: 'فعال‌کردن صدا', fullscreen: 'تمام‌صفحه',
    results: 'نتایج', targetSpeaker: 'گوینده هدف', activeSpeech: 'مدت گفتار فعال',
    segments: 'بخش‌ها', totalTimeline: 'مدت کل', settings: 'تنظیمات'
  },
  ps: {
    language: 'ژبه', workspace: 'کاري ځای', howItWorks: 'دا څنګه کار کوي',
    uploadDifferent: 'بله ویډیو پورته کړئ', loadingVideo: 'ویډیو چمتو کېږي...',
    processing: 'پروسس روان دی...', tracksActive: 'فعالې برخې',
    close: 'بندول', howTitle: 'ReAV-TSE څنګه کار کوي؟',
    uploadError: 'د ویډیو تحلیل ناکام شو: ', extractionError: 'د غږ ایستل ناکام شول: ',
    footerTagline: 'د غږ او انځور هوښیار بېلول',
    selectSpeaker: 'هدف ویونکی وټاکئ', analyzing: 'ویډیو تحلیل کېږي...',
    uploadTitle: 'د هر ویونکي غږ جلا کړئ.', uploadSubtitle: 'یوازې د هغه غږ وساتئ.',
    browse: 'فایلونه وټاکئ', dropVideo: 'ویډیو دلته واچوئ یا',
    launchDemo: 'نمونوي ویډیو پیل کړئ', loadingSample: 'نمونه پورته کېږي...',
    speakers: 'ویونکي', rawTracks: 'خامې برخې', extract: 'د ویونکي غږ وباسئ',
    chooseSpeaker: 'لومړی یو ویونکی وټاکئ', downloadWav: 'WAV ښکته کړئ',
    original: 'اصلي غږ', isolated: 'جلا شوی غږ', play: 'غږول', pause: 'درول',
    restart: 'بیا پیل', mute: 'غلی کول', unmute: 'غږ فعالول', fullscreen: 'بشپړه پرده',
    results: 'پایلې', targetSpeaker: 'هدف ویونکی', activeSpeech: 'د فعالې وینا موده',
    segments: 'برخې', totalTimeline: 'ټوله موده', settings: 'امستنې'
  },
  ar: {
    language: 'اللغة', workspace: 'مساحة العمل', howItWorks: 'كيف يعمل',
    uploadDifferent: 'تحميل فيديو آخر', loadingVideo: 'جارٍ تحميل مشغل الفيديو...',
    processing: 'جارٍ المعالجة...', tracksActive: 'مسارات نشطة',
    close: 'إغلاق', howTitle: 'كيف يعمل ReAV-TSE؟',
    uploadError: 'فشل تحليل الفيديو: ', extractionError: 'فشل استخراج الصوت: ',
    footerTagline: 'فصل سمعي بصري ذكي متعدد المهام',
    selectSpeaker: 'اختر المتحدث المستهدف', analyzing: 'جارٍ تحليل الفيديو...',
    uploadTitle: 'استخرج صوت أي متحدث.', uploadSubtitle: 'احتفظ بصوته فقط.',
    browse: 'تصفح الملفات', dropVideo: 'أفلت الفيديو هنا أو',
    launchDemo: 'تشغيل فيديو تجريبي', loadingSample: 'جارٍ تحميل العينة...',
    speakers: 'المتحدثون', rawTracks: 'المسارات الخام', extract: 'استخراج صوت المتحدث',
    chooseSpeaker: 'يرجى اختيار متحدث أولاً', downloadWav: 'تنزيل WAV',
    original: 'الصوت الأصلي', isolated: 'الصوت المعزول', play: 'تشغيل', pause: 'إيقاف مؤقت',
    restart: 'إعادة التشغيل', mute: 'كتم الصوت', unmute: 'إلغاء كتم الصوت', fullscreen: 'ملء الشاشة',
    results: 'النتائج', targetSpeaker: 'المتحدث المستهدف', activeSpeech: 'مدة الكلام النشط',
    segments: 'المقاطع', totalTimeline: 'المدة الإجمالية', settings: 'الإعدادات'
  }
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem('reav-language') || 'en'; } catch { return 'en'; }
  });

  useEffect(() => {
    try { localStorage.setItem('reav-language', language); } catch {}
    const rtl = language !== 'en';
    document.documentElement.lang = language;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.body.dir = rtl ? 'rtl' : 'ltr';
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (key) => dictionaries[language]?.[key] ?? dictionaries.en[key] ?? key,
    isRTL: language !== 'en'
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}

export const supportedLanguages = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'fa', label: 'Dari', native: 'دری' },
  { code: 'ps', label: 'Pashto', native: 'پښتو' },
  { code: 'ar', label: 'Arabic', native: 'العربية' }
];
