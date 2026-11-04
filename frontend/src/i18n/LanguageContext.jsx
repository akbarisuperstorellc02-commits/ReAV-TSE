import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const dictionaries = {
  en: {
    language: 'Language', workspace: 'Workspace', howItWorks: 'How it works',
    uploadDifferent: 'Upload different video', loadingVideo: 'Loading video player...',
    processing: 'Processing...', tracksActive: 'tracks active', tracksLabel: 'Tracks', personLabel: 'Person',
    close: 'Close', howTitle: 'How ReAV-TSE Works',
    uploadError: 'Failed to analyze video: ', extractionError: 'Extraction failed: ',
    footerTagline: 'Multi-Job Dynamic Audio-Visual Separation',
    selectSpeaker: 'Select a target speaker', analyzing: 'Analyzing video...',
    uploadTitle: 'Extract any speaker.', uploadSubtitle: 'Keep their voice.', uploadDescription: 'Select a person from a multi-speaker video and isolate their speech using lip-motion cues and neural audio extraction.', resultTitle: 'Target speaker extracted', resultSubtitle: 'Audio-visual neural extraction complete', extractAnother: 'Extract another speaker', targetSpeakerLabel: 'Target speaker', extractedFrom: 'Extracted from multi-speaker video', downloadWavLabel: 'Download WAV', combinedTimeline: 'Combined speech timeline segments', segmentTrack: 'Segment #{n} (Track {track})', framesLabel: 'Frames', timeLabel: 'Time', evaluationTitle: 'A/B audio evaluation', comparisonTitle: 'Original mix vs isolated target speech', comparisonDescription: 'Compare the original multi-speaker soundtrack with the isolated target voice.', stackedView: 'Stacked view', isolatedOnly: 'Isolated only', originalOnly: 'Original only', extractedTargetSpeech: 'Extracted target speech', interferingSuppressed: 'Interfering speakers suppressed', originalVideoAudio: 'Original video audio (full mix)', allVoices: 'All voices + background audio', cleanTargetVoice: 'Clean target voice', preservedSilence: 'Reconstructed speech timeline with silent gaps preserved', originalMixedAudio: 'Original 16kHz mixed audio', rawSoundtrack: 'Raw soundtrack extracted from input video', downloadWavTitle: 'Download WAV file', replayStart: 'Replay from start',
    browse: 'browse files', dropVideo: 'Drop your video here or',
    speakers: 'Speakers', rawTracks: 'Raw Tracks', extract: 'Extract Target Speech',
    chooseSpeaker: 'Please choose a target speaker above', downloadWav: 'Download WAV',
    original: 'Original', isolated: 'Isolated', play: 'Play', pause: 'Pause',
    restart: 'Restart', mute: 'Mute', unmute: 'Unmute', fullscreen: 'Fullscreen',
    results: 'Results', targetSpeaker: 'Target Speaker', activeSpeech: 'Active Speech',
    segments: 'Segments', totalTimeline: 'Total Timeline', settings: 'Settings', appSubtitle: 'Audio-Visual Target Speaker Extraction', session: 'Session', poweredBy: 'Powered by ClearVoice AV-MossFormer2 & YuNet', engineFeature: 'AV-MossFormer2 16K Engine', faceFeature: 'YuNet Lip & Face Tracking', timelineFeature: 'Timeline Reconstruction', trackLabel: 'Track', rawSegment: 'Raw segment', targetPrefix: 'Target:', extractThisSpeaker: 'Extract this speaker', analysisInProgress: 'Analysis in progress...', detectedIn: 'Detected in', isolatedTrack: 'Isolated vocal track', timelineSubtitle: 'Reconstructed timeline with non-target speech removed', activeVideo: 'Active video', multiJobAI: 'Multi-job AI', tracksActiveLabel: 'tracks active', howStep1: 'Isolated job workspaces', howStep1Desc: 'Every uploaded video receives a unique job ID and workspace to keep its data separate.', howStep2: 'Visual lip-sync tracking', howStep2Desc: 'YuNet and S3FD track face and mouth regions across video shots.', howStep3: 'Target speaker extraction', howStep3Desc: 'AV-MossFormer2 uses lip movement as a visual cue to isolate the selected speaker.', uploadFailed: 'Video analysis failed: ', extractionFailed: 'Extraction failed: ', speech: 'speech', segment: 'segment', segmentsCount: 'segments', span: 'Span', targetSelected: 'Target selected', clickToSelect: 'Click to select', selectTarget: 'Select a target speaker', runningFaceDetection: 'Running YuNet face detection and tracking on the uploaded video...', detectedSpeakers: 'distinct speakers detected in this video', analyzingFrames: 'Analyzing video frames', analysisDescription: 'YuNet is detecting faces, tracking lip movements, and grouping speaker identities.', extractingTracks: 'Extracting face tracks', noFaces: 'No faces detected. Try a video with clearly visible speakers.', extractingTarget: 'Extracting target speaker', pipelineLabel: 'Audio + visual neural extraction', running: 'Running', uploaded: 'Video uploaded', detectFaces: 'Detecting faces', trackSpeakers: 'Tracking speakers', speakersDetected: 'Speakers detected', targetChosen: 'Target selected', extractingSpeech: 'Extracting speech', combiningSpeech: 'Combining speech segments', complete: 'Complete', decodeFrames: 'Decoding audio and video frames', detectDesc: 'YuNet is detecting faces in video frames', trackDesc: 'Connecting face and mouth tracks across shots', clusterDesc: 'Grouping visual features into speaker identities', targetDesc: 'The selected speaker is ready for extraction', extractDesc: 'AV-MossFormer2 is isolating the selected voice', combineDesc: 'Rebuilding the audio timeline and preserving silence', completeDesc: 'The extracted speaker audio is ready' 
  },
  fa: {
    language: 'زبان', workspace: 'محیط کار', howItWorks: 'طرز کار برنامه',
    uploadDifferent: 'بارگذاری ویدیوی دیگر', loadingVideo: 'در حال بارگذاری پخش‌کننده ویدیو...',
    processing: 'در حال پردازش...', tracksActive: 'مسیر فعال', tracksLabel: 'مسیرها', personLabel: 'گوینده',
    close: 'بستن', howTitle: 'ReAV-TSE چگونه کار می‌کند؟',
    uploadError: 'تحلیل ویدیو ناموفق بود: ', extractionError: 'استخراج صدا ناموفق بود: ',
    footerTagline: 'جداسازی هوشمند صدا و تصویر با چندین وظیفه',
    selectSpeaker: 'گوینده موردنظر را انتخاب کنید', analyzing: 'در حال تحلیل ویدیو...',
    uploadTitle: 'صدای هر گوینده را جدا کنید.', uploadSubtitle: 'فقط صدای او را نگه دارید.', uploadDescription: 'یک شخص را از ویدیوی چندگوینده انتخاب کنید و با کمک حرکت لب‌ها و هوش مصنوعی، گفتار او را جدا سازید.', resultTitle: 'صدای گوینده جدا شد', resultSubtitle: 'استخراج عصبی صدا و تصویر تکمیل شد', extractAnother: 'استخراج صدای گوینده دیگر', targetSpeakerLabel: 'گوینده هدف', extractedFrom: 'جداشده از ویدیوی چندگوینده', downloadWavLabel: 'دانلود WAV', combinedTimeline: 'بخش‌های ترکیب‌شده خط زمانی گفتار', segmentTrack: 'بخش #{n} (مسیر {track})', framesLabel: 'فریم‌ها', timeLabel: 'زمان', evaluationTitle: 'ارزیابی و مقایسه صدا', comparisonTitle: 'صدای اصلی در برابر گفتار جداشده', comparisonDescription: 'صدای اصلی چندگوینده را با صدای جداشده گوینده هدف مقایسه کنید.', stackedView: 'نمای هم‌زمان', isolatedOnly: 'فقط صدای جداشده', originalOnly: 'فقط صدای اصلی', extractedTargetSpeech: 'گفتار استخراج‌شده گوینده هدف', interferingSuppressed: 'صدای گویندگان مزاحم کاهش یافته است', originalVideoAudio: 'صدای اصلی ویدیو (ترکیب کامل)', allVoices: 'همه صداها و صدای پس‌زمینه', cleanTargetVoice: 'صدای پاک گوینده هدف', preservedSilence: 'خط زمانی بازسازی‌شده با حفظ بخش‌های سکوت', originalMixedAudio: 'صدای ترکیبی اصلی ۱۶ کیلوهرتز', rawSoundtrack: 'صدای خام استخراج‌شده از ویدیوی ورودی', downloadWavTitle: 'دانلود فایل WAV', replayStart: 'پخش دوباره از آغاز',,
    browse: 'انتخاب فایل', dropVideo: 'ویدیو را اینجا رها کنید یا',
    speakers: 'گویندگان', rawTracks: 'مسیرهای خام', extract: 'استخراج صدای گوینده',
    chooseSpeaker: 'لطفاً ابتدا یک گوینده را انتخاب کنید', downloadWav: 'دانلود WAV',
    original: 'صدای اصلی', isolated: 'صدای جداشده', play: 'پخش', pause: 'توقف',
    restart: 'شروع دوباره', mute: 'بی‌صدا', unmute: 'فعال‌کردن صدا', fullscreen: 'تمام‌صفحه',
    results: 'نتایج', targetSpeaker: 'گوینده هدف', activeSpeech: 'مدت گفتار فعال',
    segments: 'بخش‌ها', totalTimeline: 'مدت کل', settings: 'تنظیمات', appSubtitle: 'استخراج گوینده با تحلیل صدا و تصویر', session: 'جلسه', poweredBy: 'با پشتیبانی ClearVoice AV-MossFormer2 و YuNet', engineFeature: 'موتور AV-MossFormer2 با فرکانس ۱۶ کیلوهرتز', faceFeature: 'ردیابی لب و چهره با YuNet', timelineFeature: 'بازسازی خط زمانی صدا', trackLabel: 'مسیر', rawSegment: 'بخش خام', targetPrefix: 'هدف:', extractThisSpeaker: 'استخراج صدای این گوینده', analysisInProgress: 'تحلیل در جریان است...', detectedIn: 'شناسایی‌شده در', isolatedTrack: 'مسیر صدای جداشده', timelineSubtitle: 'خط زمانی بازسازی‌شده با حذف صدای گویندگان دیگر', activeVideo: 'ویدیوی فعال', multiJobAI: 'هوش مصنوعی چندوظیفه‌ای', tracksActiveLabel: 'مسیر فعال', howStep1: 'فضای کاری جداگانه برای هر ویدیو', howStep1Desc: 'برای هر ویدیوی بارگذاری‌شده شناسه و فضای کاری جداگانه ساخته می‌شود تا اطلاعات ویدیوها با هم مخلوط نشود.', howStep2: 'ردیابی هماهنگی لب و صدا', howStep2Desc: 'YuNet و S3FD چهره و ناحیه دهان را در نماهای ویدیو ردیابی می‌کنند.', howStep3: 'استخراج صدای گوینده هدف', howStep3Desc: 'AV-MossFormer2 از حرکت لب‌ها برای جداکردن صدای گوینده انتخاب‌شده استفاده می‌کند.', uploadFailed: 'تحلیل ویدیو ناموفق بود: ', extractionFailed: 'استخراج صدا ناموفق بود: ', speech: 'گفتار', segment: 'بخش', segmentsCount: 'بخش‌ها', span: 'بازه', targetSelected: 'گوینده انتخاب شده', clickToSelect: 'برای انتخاب کلیک کنید', selectTarget: 'گویندهٔ موردنظر را انتخاب کنید', runningFaceDetection: 'در حال تشخیص چهره و ردیابی در ویدیوی بارگذاری‌شده...', detectedSpeakers: 'گویندهٔ جداگانه در این ویدیو شناسایی شد', analyzingFrames: 'در حال تحلیل فریم‌های ویدیو', analysisDescription: 'سیستم در حال تشخیص چهره‌ها، ردیابی حرکت لب‌ها و گروه‌بندی گویندگان است.', extractingTracks: 'در حال استخراج مسیرهای چهره', noFaces: 'چهره‌ای شناسایی نشد. ویدیویی با چهره‌های واضح انتخاب کنید.', extractingTarget: 'در حال استخراج صدای گویندهٔ هدف', pipelineLabel: 'استخراج عصبی صدا و تصویر', running: 'در حال اجرا', uploaded: 'ویدیو بارگذاری شد', detectFaces: 'تشخیص چهره‌ها', trackSpeakers: 'ردیابی گویندگان', speakersDetected: 'گویندگان شناسایی شدند', targetChosen: 'گوینده انتخاب شد', extractingSpeech: 'استخراج گفتار', combiningSpeech: 'ترکیب بخش‌های گفتار', complete: 'تکمیل شد', decodeFrames: 'رمزگشایی صدا و فریم‌های ویدیو', detectDesc: 'تشخیص چهره‌ها در فریم‌های ویدیو', trackDesc: 'اتصال مسیر چهره و لب میان نماها', clusterDesc: 'گروه‌بندی ویژگی‌های تصویری بر اساس هویت گوینده', targetDesc: 'گویندهٔ انتخاب‌شده برای استخراج آماده است', extractDesc: 'AV-MossFormer2 در حال جداکردن صدای گوینده است', combineDesc: 'بازسازی خط زمانی صدا و حفظ سکوت‌ها', completeDesc: 'صدای جداشدهٔ گوینده آماده است'
  },
  ps: {
    language: 'ژبه', workspace: 'کاري ځای', howItWorks: 'دا څنګه کار کوي',
    uploadDifferent: 'بله ویډیو پورته کړئ', loadingVideo: 'ویډیو چمتو کېږي...',
    processing: 'پروسس روان دی...', tracksActive: 'فعالې برخې', tracksLabel: 'لارې', personLabel: 'ویونکی',
    close: 'بندول', howTitle: 'ReAV-TSE څنګه کار کوي؟',
    uploadError: 'د ویډیو تحلیل ناکام شو: ', extractionError: 'د غږ ایستل ناکام شول: ',
    footerTagline: 'د غږ او انځور هوښیار بېلول',
    selectSpeaker: 'هدف ویونکی وټاکئ', analyzing: 'ویډیو تحلیل کېږي...',
    uploadTitle: 'د هر ویونکي غږ جلا کړئ.', uploadSubtitle: 'یوازې د هغه غږ وساتئ.', uploadDescription: 'له څو ویونکو ویډیو څخه یو کس وټاکئ او د شونډو د حرکت او عصبي غږیز تحلیل په مرسته یې وینا جلا کړئ.', resultTitle: 'د هدف ویونکي غږ جلا شو', resultSubtitle: 'د غږ او انځور عصبي استخراج بشپړ شو', extractAnother: 'د بل ویونکي غږ وباسئ', targetSpeakerLabel: 'هدف ویونکی', extractedFrom: 'له څو ویونکو ویډیو څخه جلا شوی', downloadWavLabel: 'WAV ښکته کړئ', combinedTimeline: 'د وینا د مهال‌وېش یوځای شوې برخې', segmentTrack: 'برخه #{n} (لار {track})', framesLabel: 'چوکاټونه', timeLabel: 'وخت', evaluationTitle: 'د غږ پرتله او ارزونه', comparisonTitle: 'اصلي غږ او جلا شوې وینا', comparisonDescription: 'اصلي ګډ غږ د هدف ویونکي له جلا شوي غږ سره پرتله کړئ.', stackedView: 'یوځای لید', isolatedOnly: 'یوازې جلا شوی غږ', originalOnly: 'یوازې اصلي غږ', extractedTargetSpeech: 'د هدف ویونکي ایستل شوې وینا', interferingSuppressed: 'د نورو ویونکو غږونه کم شوي', originalVideoAudio: 'د ویډیو اصلي غږ (بشپړ ترکیب)', allVoices: 'ټول غږونه او شالیدي غږ', cleanTargetVoice: 'د هدف ویونکي پاک غږ', preservedSilence: 'بیا جوړ شوی مهال‌وېش چې چوپتیا پکې ساتل شوې', originalMixedAudio: 'اصلي ګډ ۱۶ کیلوهرتز غږ', rawSoundtrack: 'له اصلي ویډیو څخه ایستل شوی خام غږ', downloadWavTitle: 'د WAV فایل ښکته کول', replayStart: 'له سره غږول',,
    browse: 'فایلونه وټاکئ', dropVideo: 'ویډیو دلته واچوئ یا',
    speakers: 'ویونکي', rawTracks: 'خامې برخې', extract: 'د ویونکي غږ وباسئ',
    chooseSpeaker: 'لومړی یو ویونکی وټاکئ', downloadWav: 'WAV ښکته کړئ',
    original: 'اصلي غږ', isolated: 'جلا شوی غږ', play: 'غږول', pause: 'درول',
    restart: 'بیا پیل', mute: 'غلی کول', unmute: 'غږ فعالول', fullscreen: 'بشپړه پرده',
    results: 'پایلې', targetSpeaker: 'هدف ویونکی', activeSpeech: 'د فعالې وینا موده',
    segments: 'برخې', totalTimeline: 'ټوله موده', settings: 'امستنې', appSubtitle: 'د غږ او انځور له لارې د ویونکي غږ ایستل', session: 'ناسته', poweredBy: 'د ClearVoice AV-MossFormer2 او YuNet په مرسته', engineFeature: 'د AV-MossFormer2 ۱۶ کیلوهرتز انجن', faceFeature: 'د YuNet له لارې د شونډو او مخ تعقیب', timelineFeature: 'د غږ مهال‌وېش بیا جوړول', trackLabel: 'لار', rawSegment: 'خامه برخه', targetPrefix: 'هدف:', extractThisSpeaker: 'د دې ویونکي غږ وباسئ', analysisInProgress: 'تحلیل روان دی...', detectedIn: 'په دې کې موندل شوی', isolatedTrack: 'د جلا شوي غږ لار', timelineSubtitle: 'بیا جوړ شوی مهال‌وېش چې د نورو ویونکو غږ پکې لرې شوی', activeVideo: 'اوسنۍ ویډیو', multiJobAI: 'څو دندیزه ځیرکتیا', tracksActiveLabel: 'فعالې لارې', howStep1: 'د هرې ویډیو لپاره جلا کاري ځای', howStep1Desc: 'هره پورته شوې ویډیو ځانګړی پېژند او جلا کاري ځای لري، څو معلومات سره ګډ نه شي.', howStep2: 'د شونډو او غږ همغږي تعقیبول', howStep2Desc: 'YuNet او S3FD د ویډیو په صحنو کې مخ او د خولې سیمه تعقیبوي.', howStep3: 'د هدف ویونکي غږ ایستل', howStep3Desc: 'AV-MossFormer2 د شونډو حرکت د لیدیزې نښې په توګه کاروي او د ټاکل شوي ویونکي غږ جلا کوي.', uploadFailed: 'د ویډیو تحلیل ناکام شو: ', extractionFailed: 'د غږ ایستل ناکام شول: ', speech: 'وینا', segment: 'برخه', segmentsCount: 'برخې', span: 'موده', targetSelected: 'هدف ویونکی ټاکل شوی', clickToSelect: 'د ټاکلو لپاره کلیک وکړئ', selectTarget: 'هدف ویونکی وټاکئ', runningFaceDetection: 'په پورته شوې ویډیو کې د مخونو پېژندنه او تعقیب روان دی...', detectedSpeakers: 'بېلابېل ویونکي په دې ویډیو کې وموندل شول', analyzingFrames: 'د ویډیو چوکاټونه تحلیل کېږي', analysisDescription: 'سیستم مخونه پېژني، د شونډو حرکت تعقیبوي او د ویونکو پېژندنې سره ډلبندي کوي.', extractingTracks: 'د مخونو لارې ایستل کېږي', noFaces: 'مخونه ونه موندل شول. داسې ویډیو وټاکئ چې مخونه پکې روښانه ښکاري.', extractingTarget: 'د هدف ویونکي غږ ایستل کېږي', pipelineLabel: 'د غږ او انځور عصبي استخراج', running: 'چلېږي', uploaded: 'ویډیو پورته شوه', detectFaces: 'د مخونو پېژندنه', trackSpeakers: 'د ویونکو تعقیب', speakersDetected: 'ویونکي وموندل شول', targetChosen: 'هدف وټاکل شو', extractingSpeech: 'د وینا ایستل', combiningSpeech: 'د وینا برخې یوځای کول', complete: 'بشپړ شو', decodeFrames: 'د غږ او ویډیو چوکاټونو لوستل', detectDesc: 'په ویډیويي چوکاټونو کې د مخونو پېژندنه', trackDesc: 'د صحنو ترمنځ د مخ او شونډو لارو نښلول', clusterDesc: 'د ویونکو د پېژندنې له مخې د انځوریزو ځانګړنو ډلبندي', targetDesc: 'ټاکل شوی ویونکی د غږ ایستلو لپاره چمتو دی', extractDesc: 'AV-MossFormer2 د ټاکل شوي ویونکي غږ جلا کوي', combineDesc: 'د غږ مهال‌وېش بیا جوړول او چوپتیا ساتل', completeDesc: 'د ویونکي جلا شوی غږ چمتو دی'
  },
  ar: {
    language: 'اللغة', workspace: 'مساحة العمل', howItWorks: 'كيف يعمل',
    uploadDifferent: 'تحميل فيديو آخر', loadingVideo: 'جارٍ تحميل مشغل الفيديو...',
    processing: 'جارٍ المعالجة...', tracksActive: 'مسارات نشطة', tracksLabel: 'المسارات', personLabel: 'المتحدث',
    close: 'إغلاق', howTitle: 'كيف يعمل ReAV-TSE؟',
    uploadError: 'فشل تحليل الفيديو: ', extractionError: 'فشل استخراج الصوت: ',
    footerTagline: 'فصل سمعي بصري ذكي متعدد المهام',
    selectSpeaker: 'اختر المتحدث المستهدف', analyzing: 'جارٍ تحليل الفيديو...',
    uploadTitle: 'استخرج صوت أي متحدث.', uploadSubtitle: 'احتفظ بصوته فقط.', uploadDescription: 'اختر شخصًا من فيديو يضم عدة متحدثين واعزل كلامه باستخدام حركة الشفاه وتحليل الصوت العصبي.', resultTitle: 'تم عزل صوت المتحدث المستهدف', resultSubtitle: 'اكتمل الاستخراج العصبي السمعي البصري', extractAnother: 'استخراج صوت متحدث آخر', targetSpeakerLabel: 'المتحدث المستهدف', extractedFrom: 'معزول من فيديو متعدد المتحدثين', downloadWavLabel: 'تنزيل WAV', combinedTimeline: 'مقاطع الخط الزمني للكلام المدمجة', segmentTrack: 'المقطع #{n} (المسار {track})', framesLabel: 'الإطارات', timeLabel: 'الوقت', evaluationTitle: 'مقارنة الصوت وتقييمه', comparisonTitle: 'المزيج الأصلي مقابل كلام المتحدث المعزول', comparisonDescription: 'قارن الصوت الأصلي متعدد المتحدثين بصوت المتحدث المستهدف بعد عزله.', stackedView: 'عرض متزامن', isolatedOnly: 'المعزول فقط', originalOnly: 'الأصلي فقط', extractedTargetSpeech: 'كلام المتحدث المستهدف المستخرج', interferingSuppressed: 'تم تقليل أصوات المتحدثين المتداخلين', originalVideoAudio: 'صوت الفيديو الأصلي (المزيج الكامل)', allVoices: 'جميع الأصوات والصوت الخلفي', cleanTargetVoice: 'صوت المتحدث المستهدف النقي', preservedSilence: 'خط زمني معاد بناؤه مع الحفاظ على فترات الصمت', originalMixedAudio: 'الصوت المختلط الأصلي بتردد 16 كيلوهرتز', rawSoundtrack: 'المسار الصوتي الخام المستخرج من الفيديو', downloadWavTitle: 'تنزيل ملف WAV', replayStart: 'إعادة التشغيل من البداية',,
    browse: 'تصفح الملفات', dropVideo: 'أفلت الفيديو هنا أو',
    speakers: 'المتحدثون', rawTracks: 'المسارات الخام', extract: 'استخراج صوت المتحدث',
    chooseSpeaker: 'يرجى اختيار متحدث أولاً', downloadWav: 'تنزيل WAV',
    original: 'الصوت الأصلي', isolated: 'الصوت المعزول', play: 'تشغيل', pause: 'إيقاف مؤقت',
    restart: 'إعادة التشغيل', mute: 'كتم الصوت', unmute: 'إلغاء كتم الصوت', fullscreen: 'ملء الشاشة',
    results: 'النتائج', targetSpeaker: 'المتحدث المستهدف', activeSpeech: 'مدة الكلام النشط',
    segments: 'المقاطع', totalTimeline: 'المدة الإجمالية', settings: 'الإعدادات', appSubtitle: 'استخراج المتحدث المستهدف بالصوت والصورة', session: 'الجلسة', poweredBy: 'بدعم ClearVoice AV-MossFormer2 وYuNet', engineFeature: 'محرك AV-MossFormer2 بتردد 16 كيلوهرتز', faceFeature: 'تتبع الشفاه والوجه بواسطة YuNet', timelineFeature: 'إعادة بناء الخط الزمني', trackLabel: 'المسار', rawSegment: 'مقطع خام', targetPrefix: 'الهدف:', extractThisSpeaker: 'استخراج صوت هذا المتحدث', analysisInProgress: 'التحليل قيد التنفيذ...', detectedIn: 'تم اكتشافه في', isolatedTrack: 'المسار الصوتي المعزول', timelineSubtitle: 'خط زمني معاد بناؤه بعد إزالة أصوات المتحدثين الآخرين', activeVideo: 'الفيديو النشط', multiJobAI: 'ذكاء اصطناعي متعدد المهام', tracksActiveLabel: 'مسارات نشطة', howStep1: 'مساحات عمل منفصلة لكل فيديو', howStep1Desc: 'يحصل كل فيديو مرفوع على معرّف ومساحة عمل مستقلين لمنع اختلاط البيانات.', howStep2: 'تتبع تزامن حركة الشفاه', howStep2Desc: 'يتتبع YuNet وS3FD الوجه ومنطقة الفم عبر لقطات الفيديو.', howStep3: 'استخراج صوت المتحدث المستهدف', howStep3Desc: 'يستخدم AV-MossFormer2 حركة الشفاه كإشارة مرئية لعزل صوت المتحدث المحدد.', uploadFailed: 'فشل تحليل الفيديو: ', extractionFailed: 'فشل استخراج الصوت: ', speech: 'كلام', segment: 'مقطع', segmentsCount: 'مقاطع', span: 'النطاق', targetSelected: 'تم اختيار المتحدث', clickToSelect: 'انقر للاختيار', selectTarget: 'اختر المتحدث المستهدف', runningFaceDetection: 'جارٍ اكتشاف الوجوه وتتبعها في الفيديو المرفوع...', detectedSpeakers: 'متحدثين متميزين تم اكتشافهم في هذا الفيديو', analyzingFrames: 'جارٍ تحليل إطارات الفيديو', analysisDescription: 'يكتشف النظام الوجوه ويتتبع حركة الشفاه ويجمع هويات المتحدثين.', extractingTracks: 'جارٍ استخراج مسارات الوجوه', noFaces: 'لم يتم اكتشاف وجوه. جرّب فيديو تظهر فيه الوجوه بوضوح.', extractingTarget: 'جارٍ استخراج صوت المتحدث المستهدف', pipelineLabel: 'استخراج عصبي للصوت والصورة', running: 'قيد التشغيل', uploaded: 'تم رفع الفيديو', detectFaces: 'اكتشاف الوجوه', trackSpeakers: 'تتبع المتحدثين', speakersDetected: 'تم اكتشاف المتحدثين', targetChosen: 'تم اختيار الهدف', extractingSpeech: 'استخراج الكلام', combiningSpeech: 'دمج مقاطع الكلام', complete: 'اكتمل', decodeFrames: 'فك ترميز الصوت وإطارات الفيديو', detectDesc: 'اكتشاف الوجوه في إطارات الفيديو', trackDesc: 'ربط مسارات الوجه والشفاه بين اللقطات', clusterDesc: 'تجميع السمات المرئية حسب هوية المتحدث', targetDesc: 'المتحدث المحدد جاهز للاستخراج', extractDesc: 'يعزل AV-MossFormer2 صوت المتحدث المحدد', combineDesc: 'إعادة بناء الخط الزمني للصوت مع الحفاظ على فترات الصمت', completeDesc: 'الصوت المعزول للمتحدث جاهز'
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

export function localizeSpeakerTitle(title, t) {
  const match = /^Person\s+(\d+)$/i.exec(title || '');
  return match ? `${t('personLabel')} ${match[1]}` : title;
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
