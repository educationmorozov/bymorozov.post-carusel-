
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Check, Download, AlertCircle, RefreshCcw, Upload, Image as ImageIcon,
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal,
  Palette, Camera, AlignLeft, AlignCenter, AlignJustify, Eye, EyeOff, Smartphone,
  Calendar, List as ListIcon, CheckSquare, Type as TypeIcon, Star, Move, User
} from 'lucide-react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { 
  CarouselFormat, CarouselType, NicknamePosition, SplitMethod, SlideData, 
  TemplateId, ValidationResult, FontPair, TextAlign, SlideOverride, SlideCountPosition, FinalSlideConfig
} from './types';
import { parseTextToSlides } from './parser';
import { validateAndRender } from './generator';
import { TEMPLATES, MAX_SLIDES, FONT_PAIRS, SELECTABLE_FONTS } from './constants';

const DEFAULT_TEXT = 'Ура, рад, что мы будем делать пост-карусель! Вставь сюда свой текст!';

const App: React.FC = () => {
  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [nickname, setNickname] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [customBgColor, setCustomBgColor] = useState<string>('#121212');
  const [customTextColor, setCustomTextColor] = useState<string>('#ffffff');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('empty-line');
  const [format, setFormat] = useState<CarouselFormat>('1080x1350');
  const [carouselType, setCarouselType] = useState<CarouselType>('standard');
  const [nicknamePosition, setNicknamePosition] = useState<NicknamePosition>('bottom-right');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('black');
  const [selectedFontPair, setSelectedFontPair] = useState<FontPair>(FONT_PAIRS[0]);
  const [globalTextAlign, setGlobalTextAlign] = useState<TextAlign>('left');
  
  const [showSlideCount, setShowSlideCount] = useState(true);
  const [slideCountPosition, setSlideCountPosition] = useState<SlideCountPosition>('bottom-right');

  const [slideOverrides, setSlideOverrides] = useState<Record<number, SlideOverride>>({});
  const [customHeaderFont, setCustomHeaderFont] = useState(SELECTABLE_FONTS[2]);
  const [customBodyFont, setCustomBodyFont] = useState(SELECTABLE_FONTS[1]);

  const [finalSlideConfig, setFinalSlideConfig] = useState<FinalSlideConfig>({
    enabled: false,
    textBefore: 'Пиши в комментариях',
    codeWord: 'СЛОВО',
    textAfter: 'и я отправлю тебе бонус в директ!',
    blogTopic: '',
    verticalOffset: 50,
    brandingOffset: 50,
    designVariant: 1
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [currentMockupIndex, setCurrentMockupIndex] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const mockupScrollRef = useRef<HTMLDivElement>(null);

  const slides = useMemo(() => {
    const baseSlides = parseTextToSlides(text, splitMethod).slice(0, MAX_SLIDES);
    if (finalSlideConfig.enabled) {
      baseSlides.push({
        id: 999,
        text: 'Special Final Slide',
        isSpecialFinal: true
      });
    }
    return baseSlides;
  }, [text, splitMethod, finalSlideConfig.enabled]);

  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (slides.length === 0 || text === '' || text === DEFAULT_TEXT) {
        setGeneratedImages([]);
        return;
      }
      
      const fontPairToUse = selectedFontPair.id === 'custom' 
        ? { ...selectedFontPair, headerFont: customHeaderFont, bodyFont: customBodyFont }
        : selectedFontPair;

      const newImages: string[] = [];
      const newValidations: ValidationResult[] = [];

      for (let i = 0; i < slides.length; i++) {
        const override = slideOverrides[slides[i].id] || { fontSizeScale: 1, lineHeightScale: 1.35 };
        const { blob, validation } = await validateAndRender({
          slide: slides[i],
          format,
          carouselType,
          templateId: selectedTemplate,
          nickname,
          nicknamePosition,
          avatarUrl,
          bgImageUrl,
          customBgColor,
          customTextColor,
          fontPair: fontPairToUse,
          totalSlides: slides.length,
          slideIndex: i,
          fontSizeScale: override.fontSizeScale,
          lineHeightScale: override.lineHeightScale,
          textAlign: override.textAlign || globalTextAlign,
          showSlideCount,
          slideCountPosition,
          finalSlideData: slides[i].isSpecialFinal ? {
            textBefore: finalSlideConfig.textBefore,
            codeWord: finalSlideConfig.codeWord,
            textAfter: finalSlideConfig.textAfter,
            blogTopic: finalSlideConfig.blogTopic,
            verticalOffset: finalSlideConfig.verticalOffset,
            brandingOffset: finalSlideConfig.brandingOffset,
            variant: finalSlideConfig.designVariant
          } : undefined
        });

        if (blob) newImages.push(URL.createObjectURL(blob));
        newValidations.push(validation);
      }

      setGeneratedImages(newImages);
      setValidationResults(newValidations);
    }, 400);

    return () => clearTimeout(debounceTimer);
  }, [slides, text, format, carouselType, selectedTemplate, selectedFontPair, nickname, nicknamePosition, avatarUrl, customHeaderFont, customBodyFont, customBgColor, customTextColor, bgImageUrl, globalTextAlign, slideOverrides, showSlideCount, slideCountPosition, finalSlideConfig]);

  // Восстановление позиции прокрутки
  useEffect(() => {
    if (mockupScrollRef.current && generatedImages.length > 0) {
       const width = mockupScrollRef.current.offsetWidth;
       const safeIndex = Math.min(currentMockupIndex, generatedImages.length - 1);
       mockupScrollRef.current.scrollTo({ left: safeIndex * width, behavior: 'auto' });
    }
  }, [generatedImages, slides.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const updateSlideScale = (slideId: number, value: number) => {
    const newScale = parseFloat(value.toFixed(1));
    const idx = slides.findIndex(s => s.id === slideId);
    setSlideOverrides(prev => {
      const nextOverrides = { ...prev };
      if (idx === 1 && slides.length > (finalSlideConfig.enabled ? 3 : 2)) {
        const lastIdx = finalSlideConfig.enabled ? slides.length - 2 : slides.length - 1; 
        for (let j = 1; j < lastIdx; j++) {
          nextOverrides[slides[j].id] = { 
            ...(nextOverrides[slides[j].id] || { fontSizeScale: 1, lineHeightScale: 1.35 }), 
            fontSizeScale: newScale 
          };
        }
      } else {
        nextOverrides[slideId] = { 
          ...(nextOverrides[slideId] || { fontSizeScale: 1, lineHeightScale: 1.35 }), 
          fontSizeScale: newScale 
        };
      }
      return nextOverrides;
    });
  };

  const updateSlideLineHeight = (slideId: number, value: number) => {
    const newScale = parseFloat(value.toFixed(2));
    const idx = slides.findIndex(s => s.id === slideId);
    setSlideOverrides(prev => {
      const nextOverrides = { ...prev };
      if (idx === 1 && slides.length > (finalSlideConfig.enabled ? 3 : 2)) {
        const lastIdx = finalSlideConfig.enabled ? slides.length - 2 : slides.length - 1; 
        for (let j = 1; j < lastIdx; j++) {
          nextOverrides[slides[j].id] = { 
            ...(nextOverrides[slides[j].id] || { fontSizeScale: 1, lineHeightScale: 1.35 }), 
            lineHeightScale: newScale 
          };
        }
      } else {
        nextOverrides[slideId] = { 
          ...(nextOverrides[slideId] || { fontSizeScale: 1, lineHeightScale: 1.35 }), 
          lineHeightScale: newScale 
        };
      }
      return nextOverrides;
    });
  };

  const downloadAllZip = async () => {
    setIsGenerating(true);
    const zip = new JSZip();
    for (let i = 0; i < generatedImages.length; i++) {
      const res = await fetch(generatedImages[i]);
      zip.file(`carousel_${i + 1}.png`, await res.blob());
    }
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'carousel_bymorozov.zip');
    setIsGenerating(false);
  };

  const downloadSingle = (url: string, index: number) => {
    saveAs(url, `carousel_${index + 1}.png`);
  };

  const handleTextFocus = () => {
    if (text === DEFAULT_TEXT) {
      setText('');
    }
  };

  const StepHeader = ({ num, title }: { num: number, title: string }) => (
    <div className="flex items-center gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shrink-0">
        <Check className="w-4 h-4 text-white" />
      </div>
      <h2 className="text-2xl font-black uppercase tracking-tight">{title}</h2>
    </div>
  );

  const InstagramMockupPreview = () => {
    const handleScroll = () => {
      if (mockupScrollRef.current) {
        const scrollPos = mockupScrollRef.current.scrollLeft;
        const width = mockupScrollRef.current.offsetWidth;
        const index = Math.round(scrollPos / width);
        if (index !== currentMockupIndex && index >= 0 && index < generatedImages.length) {
          setCurrentMockupIndex(index);
        }
      }
    };

    const previewAspect = format === '1080x1350' ? 'aspect-[4/5]' : 'aspect-square';

    return (
      <div className="mt-12 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 w-full">
        <div className="flex items-center gap-3 mb-8">
           <Smartphone className="w-5 h-5 text-white/40" />
           <label className="text-[10px] text-white/40 uppercase font-black tracking-[0.3em] block">Предпросмотр</label>
        </div>
        
        <div className="relative w-full max-w-[340px] h-[680px] bg-black rounded-[3.5rem] border-[12px] border-[#1a1a1a] shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">
          <div className="h-10 flex items-center justify-between px-8 text-[11px] font-bold z-20 shrink-0">
            <span>9:41</span>
            <div className="w-6 h-3 bg-white/20 rounded-sm"></div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide bg-black">
            <div className="pt-2 pb-1 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px]">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                    {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 opacity-20" />}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold leading-tight">{nickname || 'username'}</span>
                  <span className="text-[10px] opacity-60">Акселератор</span>
                </div>
              </div>
              <MoreHorizontal className="w-5 h-5 opacity-40" />
            </div>

            <div className={`relative ${previewAspect} w-full bg-neutral-900 overflow-hidden`}>
              <div 
                ref={mockupScrollRef}
                onScroll={handleScroll}
                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide h-full w-full items-start"
              >
                {generatedImages.length > 0 ? generatedImages.map((img, i) => (
                  <div key={i} className="min-w-full h-full snap-center relative bg-black flex items-start">
                    <img src={img} className="w-full h-full object-contain object-top" />
                  </div>
                )) : (
                  <div className="min-w-full flex items-center justify-center bg-white/5 px-12 text-center h-full">
                    <span className="text-[10px] font-black opacity-20 uppercase tracking-widest leading-loose text-center">
                      Напишите текст,<br/>чтобы оживить пост
                    </span>
                  </div>
                )}
              </div>
              
              {generatedImages.length > 1 && (
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-lg px-2.5 py-1 rounded-full text-[10px] font-black border border-white/10 z-10 tabular-nums">
                  {currentMockupIndex + 1}/{generatedImages.length}
                </div>
              )}
            </div>

            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Heart className="w-6 h-6" />
                  <MessageCircle className="w-6 h-6" />
                  <Send className="w-6 h-6" />
                </div>
                {generatedImages.length > 1 && (
                  <div className="flex gap-1">
                    {generatedImages.map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentMockupIndex ? 'bg-[#0095f6]' : 'bg-white/20'}`} />
                    ))}
                  </div>
                )}
                <Bookmark className="w-6 h-6 ml-auto" />
              </div>
              <div className="text-[13px] font-bold">14,281 отметок "Нравится"</div>
              <div className="text-[13px] leading-relaxed">
                <span className="font-bold mr-2">{nickname || 'username'}</span>
                <span className="opacity-80">Как вам такой дизайн? Создано в Акселераторе. 🚀</span>
              </div>
            </div>
          </div>
          
          <div className="h-16 border-t border-white/5 bg-black flex items-center justify-around px-6 pb-2 shrink-0">
            <div className="w-6 h-6 rounded border-2 border-white/20"></div>
            <div className="w-6 h-6 rounded border-2 border-white/20"></div>
            <div className="w-6 h-6 rounded-lg border-2 border-white/20"></div>
          </div>
        </div>
      </div>
    );
  };

  const getVisibleOverrideControls = () => {
    if (slides.length === 0) return [];
    const controls = [];
    controls.push({ id: slides[0].id, label: 'Обложка (#1)' });
    
    const hasSpecialFinal = finalSlideConfig.enabled;
    const contentLimit = hasSpecialFinal ? slides.length - 2 : slides.length - 1;

    if (slides.length > (hasSpecialFinal ? 3 : 2)) {
      controls.push({ id: slides[1].id, label: `Контент (#2 - #${contentLimit})` });
    }
    
    if (slides.length > 1) {
      const finalId = hasSpecialFinal ? slides[slides.length-2].id : slides[slides.length-1].id;
      controls.push({ id: finalId, label: `Финал (#${contentLimit + 1})` });
    }
    return controls;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-white/20 font-sans pb-20 overflow-x-hidden">
      <header className="border-b border-white/5 p-8 flex flex-col items-center">
        <h1 className="text-4xl md:text-6xl font-black font-header tracking-tighter uppercase mb-1">Акселератор</h1>
        <p className="text-[10px] md:text-xs text-white/20 uppercase tracking-[0.4em] font-bold">bymorozov</p>
      </header>

      <main className="max-w-4xl mx-auto p-6 md:p-12 space-y-24">
        {/* STEP 1: TEXT */}
        <section className="space-y-8">
          <StepHeader num={1} title="ШАГ 1: ТЕКСТ КАРУСЕЛИ" />
          <div className="relative">
            <textarea
              value={text}
              onFocus={handleTextFocus}
              onChange={(e) => setText(e.target.value)}
              placeholder="Текст для первого слайда...&#10;&#10;Текст для второго слайда..."
              className="w-full h-80 bg-white/[0.03] border border-white/10 rounded-2xl p-6 focus:ring-1 focus:ring-white/40 outline-none text-lg leading-relaxed custom-scrollbar transition-all"
            />
            {slides.length >= MAX_SLIDES && (
              <div className="mt-2 flex items-center gap-2 text-red-500 font-bold text-xs bg-red-500/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                Внимание! Максимум 20 слайдов.
              </div>
            )}
          </div>
          
          <div className="p-5 bg-white/[0.05] rounded-2xl border border-white/10 space-y-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-white/60">Как оформить текст?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="flex flex-col gap-1">
                <span className="font-bold text-white/90">Жирный текст:</span>
                <p className="opacity-70">Оберни в две звездочки. <code className="bg-black/40 px-1 rounded text-white">**слово**</code></p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold text-white/90">Цветной текст:</span>
                <p className="opacity-70">Используй скобки. <code className="bg-black/40 px-1 rounded text-white">[слово](#FF0000)</code></p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] text-white/40 uppercase font-black tracking-widest">Разделитель слайдов</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'empty-line', title: 'Пустая строка' },
                { id: 'separator-line', title: 'Линии ---' },
                { id: 'slide-number', title: 'Слово "Слайд"' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSplitMethod(m.id as SplitMethod)}
                  className={`p-3 rounded-xl border text-left transition-all text-[10px] font-black uppercase tracking-tighter ${splitMethod === m.id ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'}`}
                >
                  {m.title}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* STEP 2: CONTENT TYPE */}
        <section className="space-y-8">
          <StepHeader num={2} title="ШАГ 2: ТИП КОНТЕНТА" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'standard', title: 'Обычный', icon: <TypeIcon className="w-5 h-5"/> },
              { id: 'daily-plan', title: 'Планы на недели/месяца', icon: <Calendar className="w-5 h-5"/> },
              { id: 'bullets', title: 'Пункт + расшифровка', icon: <CheckSquare className="w-5 h-5"/> },
              { id: 'list', title: 'Список', icon: <ListIcon className="w-5 h-5"/> }
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setCarouselType(type.id as CarouselType)}
                className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-4 text-center ${carouselType === type.id ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'}`}
              >
                {type.icon}
                <span className="text-[10px] font-black uppercase tracking-tighter">{type.title}</span>
              </button>
            ))}
          </div>
        </section>

        {/* STEP 3: FONTS & SIZE */}
        <section className="space-y-8">
          <StepHeader num={3} title="ШАГ 3: ШРИФТ И РАЗМЕР" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FONT_PAIRS.map(f => (
              <button 
                key={f.id} 
                onClick={() => setSelectedFontPair(f)} 
                className={`p-6 rounded-2xl border transition-all text-left ${selectedFontPair.id === f.id ? 'bg-white text-black border-white scale-[1.02] shadow-xl' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'}`}
              >
                <p className="text-[9px] opacity-40 uppercase font-black mb-3 tracking-[0.2em]">{f.name}</p>
                <p className="text-xl leading-none mb-2" style={{ fontFamily: f.headerFont, fontWeight: 900 }}>
                  {selectedFontPair.id === 'custom' && f.id === 'custom' ? 'Ваш шрифт' : 'Заголовок'}
                </p>
                <p className="text-xs opacity-70" style={{ fontFamily: f.bodyFont }}>Текст поста</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-[10px] text-white/40 uppercase font-black tracking-widest">Выравнивание текста</label>
              <div className="flex gap-2">
                {[
                  { id: 'left', icon: <AlignLeft className="w-4 h-4"/>, label: 'Слева' },
                  { id: 'center', icon: <AlignCenter className="w-4 h-4"/>, label: 'Центр' },
                  { id: 'justify', icon: <AlignJustify className="w-4 h-4"/>, label: 'Ширина' }
                ].map((a) => (
                  <button key={a.id} onClick={() => setGlobalTextAlign(a.id as TextAlign)} className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${globalTextAlign === a.id ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/60'}`}>
                    {a.icon} <span className="text-[9px] font-black uppercase">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <label className="text-[10px] text-white/40 uppercase font-black tracking-widest">Настройки шрифта</label>
              <div className="space-y-8 p-6 bg-white/[0.03] rounded-3xl border border-white/5">
                {getVisibleOverrideControls().map((ctrl) => (
                  <div key={ctrl.id} className="space-y-4">
                    <p className="text-[9px] font-black uppercase tracking-tighter text-white/30">{ctrl.label}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] font-bold uppercase opacity-50">Размер</span>
                        <span className="text-[11px] font-bold tabular-nums text-white/80">{Math.round((slideOverrides[ctrl.id]?.fontSizeScale || 1) * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.5" 
                        max="2.5" 
                        step="0.1"
                        value={slideOverrides[ctrl.id]?.fontSizeScale || 1}
                        onChange={(e) => updateSlideScale(ctrl.id, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] font-bold uppercase opacity-50">Межстрочный</span>
                        <span className="text-[11px] font-bold tabular-nums text-white/80">{(slideOverrides[ctrl.id]?.lineHeightScale || 1.35).toFixed(2)}</span>
                      </div>
                      <input 
                        type="range" 
                        min="1.0" 
                        max="2.0" 
                        step="0.05"
                        value={slideOverrides[ctrl.id]?.lineHeightScale || 1.35}
                        onChange={(e) => updateSlideLineHeight(ctrl.id, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <InstagramMockupPreview />
        </section>

        {/* STEP 4: DESIGN/COLOR */}
        <section className="space-y-8">
          <StepHeader num={4} title="ШАГ 4: ДИЗАЙН И ЦВЕТ" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TEMPLATES.map(t => (
              <button 
                key={t.id} 
                onClick={() => setSelectedTemplate(t.id)} 
                className={`relative aspect-[4/3] rounded-2xl border transition-all overflow-hidden flex flex-col items-center justify-center gap-2 p-4 ${selectedTemplate === t.id ? 'border-white ring-4 ring-white/10 scale-105 z-10' : 'border-white/5 opacity-80 hover:opacity-100 hover:border-white/20'}`}
                style={{ background: t.bgColor, color: t.textColor }}
              >
                 <span className="text-[9px] font-black uppercase tracking-widest text-center">{t.name}</span>
                 {selectedTemplate === t.id && t.id === 'custom-image' && (
                  <input ref={bgInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setBgImageUrl)} />
                )}
                {selectedTemplate === t.id && t.id === 'custom-image' && (
                  <button onClick={() => bgInputRef.current?.click()} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"></button>
                )}
              </button>
            ))}
          </div>

          {selectedTemplate === 'custom-color' && (
            <div className="p-6 bg-white/[0.03] rounded-2xl border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4">
              <div className="space-y-2">
                <label className="text-[9px] text-white/40 uppercase font-black tracking-widest">Цвет фона</label>
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                  <input type="color" value={customBgColor} onChange={(e) => setCustomBgColor(e.target.value)} className="w-10 h-10 rounded-lg bg-transparent border-none cursor-pointer" />
                  <input type="text" value={customBgColor} onChange={(e) => setCustomBgColor(e.target.value)} className="bg-transparent outline-none font-mono text-xs uppercase w-full" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] text-white/40 uppercase font-black tracking-widest">Цвет текста</label>
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                  <input type="color" value={customTextColor} onChange={(e) => setCustomTextColor(e.target.value)} className="w-10 h-10 rounded-lg bg-transparent border-none cursor-pointer" />
                  <input type="text" value={customTextColor} onChange={(e) => setCustomTextColor(e.target.value)} className="bg-transparent outline-none font-mono text-xs uppercase w-full" />
                </div>
              </div>
            </div>
          )}
          <InstagramMockupPreview />
        </section>

        {/* STEP 5: BRANDING & ACCOUNT DATA */}
        <section className="space-y-8">
          <StepHeader num={5} title="ШАГ 5: АККАУНТ И БРЕНДИНГ" />
          <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl space-y-12">
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              <div className="flex flex-col items-center gap-3 shrink-0">
                <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 overflow-hidden relative group">
                  {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-white/10" />}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Upload className="w-5 h-5 text-white" /></div>
                </div>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setAvatarUrl)} />
                <span className="text-[10px] text-white/30 uppercase font-black tracking-widest text-center">аватарка</span>
              </div>
              <div className="flex-1 w-full space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-black tracking-widest">Никнейм</label>
                  <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="@username" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 outline-none focus:border-white/40 transition-all" />
                </div>
                
                <div className="space-y-4">
                  <label className="text-[10px] text-white/40 uppercase font-black tracking-widest text-center block">Расположение ника</label>
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'top-left', label: 'Вверху слева' },
                        { id: 'top-center', label: 'Вверху центр' },
                        { id: 'top-right', label: 'Вверху справа' }
                      ].map(pos => (
                        <button key={pos.id} onClick={() => setNicknamePosition(pos.id as NicknamePosition)} className={`py-3 text-[9px] font-black rounded-lg border transition-all uppercase tracking-tighter ${nicknamePosition === pos.id ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}>
                          {pos.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'bottom-left', label: 'Внизу слева' },
                        { id: 'bottom-center', label: 'По центру внизу' },
                        { id: 'bottom-right', label: 'Внизу справа' }
                      ].map(pos => (
                        <button key={pos.id} onClick={() => setNicknamePosition(pos.id as NicknamePosition)} className={`py-3 text-[9px] font-black rounded-lg border transition-all uppercase tracking-tighter ${nicknamePosition === pos.id ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}>
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-8 border-t border-white/5">
              <div className="flex items-center justify-between">
                  <label className="text-[10px] text-white/40 uppercase font-black tracking-widest">Нумерация слайдов</label>
                  <button 
                    onClick={() => setShowSlideCount(!showSlideCount)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${showSlideCount ? 'bg-white text-black' : 'bg-white/10 text-white/60'}`}
                  >
                    {showSlideCount ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <span className="text-[10px] font-black uppercase tracking-tighter">{showSlideCount ? 'Вкл' : 'Выкл'}</span>
                  </button>
              </div>
              
              {showSlideCount && (
                  <div className="flex gap-2 animate-in fade-in zoom-in-95">
                    {[
                      { id: 'top-right', label: 'Вверху справа' },
                      { id: 'bottom-right', label: 'Внизу справа' }
                    ].map(pos => (
                      <button 
                        key={pos.id} 
                        onClick={() => setSlideCountPosition(pos.id as SlideCountPosition)}
                        className={`flex-1 p-3 rounded-xl border text-[10px] font-black uppercase tracking-tighter transition-all ${slideCountPosition === pos.id ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
              )}
            </div>
          </div>
          <InstagramMockupPreview />
        </section>

        {/* STEP 6: SPECIAL FINAL SLIDE */}
        <section className="space-y-8">
          <StepHeader num={6} title="ШАГ 6: БОНУСНЫЙ СЛАЙД" />
          <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl space-y-8">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
              <div className="space-y-1">
                 <p className="text-sm font-bold">Включить бонусный слайд</p>
                 <p className="text-[10px] text-white/40 uppercase">Для роста комментариев и подписок</p>
              </div>
              <button 
                onClick={() => {
                  const newState = !finalSlideConfig.enabled;
                  setFinalSlideConfig(prev => ({ ...prev, enabled: newState }));
                  if (newState) {
                    setTimeout(() => {
                        if (mockupScrollRef.current) {
                            const width = mockupScrollRef.current.offsetWidth;
                            const idx = slides.length; 
                            mockupScrollRef.current.scrollTo({ left: idx * width, behavior: 'smooth' });
                            setCurrentMockupIndex(idx);
                        }
                    }, 300);
                  }
                }}
                className={`w-14 h-8 rounded-full transition-all relative ${finalSlideConfig.enabled ? 'bg-sky-500' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${finalSlideConfig.enabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            {finalSlideConfig.enabled && (
              <div className="space-y-10 animate-in slide-in-from-top-4">
                <div className="space-y-6">
                   <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase font-black tracking-widest">Текст до слова</label>
                      <input 
                        type="text" 
                        value={finalSlideConfig.textBefore} 
                        onChange={(e) => setFinalSlideConfig(prev => ({ ...prev, textBefore: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 outline-none focus:border-sky-500 transition-all text-white" 
                        placeholder="Пиши в комментариях"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase font-black tracking-widest">Кодовое слово</label>
                      <input 
                        type="text" 
                        value={finalSlideConfig.codeWord} 
                        onChange={(e) => setFinalSlideConfig(prev => ({ ...prev, codeWord: e.target.value.toUpperCase() }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 outline-none focus:border-sky-500 transition-all font-black text-white" 
                        placeholder="СЛОВО"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase font-black tracking-widest">Текст после слова</label>
                      <input 
                        type="text" 
                        value={finalSlideConfig.textAfter} 
                        onChange={(e) => setFinalSlideConfig(prev => ({ ...prev, textAfter: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 outline-none focus:border-sky-500 transition-all text-white/80" 
                        placeholder="и я отправлю бонус"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase font-black tracking-widest">О чем ваш блог?</label>
                    <input 
                      type="text" 
                      value={finalSlideConfig.blogTopic} 
                      placeholder="дизайн, маркетинг, котиков..."
                      onChange={(e) => setFinalSlideConfig(prev => ({ ...prev, blogTopic: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 outline-none focus:border-sky-500 transition-all text-white/80" 
                    />
                    <p className="text-[9px] text-white/30 uppercase font-bold px-1">
                      {finalSlideConfig.blogTopic.trim() 
                        ? `Будет выведено: «у меня в блоге все про ${finalSlideConfig.blogTopic}»` 
                        : "Будет выведено только «username» и аватар"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
                   <div className="space-y-6">
                     <div className="flex items-center justify-between">
                        <label className="text-[10px] text-white/40 uppercase font-black tracking-widest">Положение текста и слова</label>
                        <Move className="w-4 h-4 text-white/20" />
                     </div>
                     <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="1"
                        value={finalSlideConfig.verticalOffset}
                        onChange={(e) => setFinalSlideConfig(prev => ({ ...prev, verticalOffset: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                   </div>

                   <div className="space-y-6">
                     <div className="flex items-center justify-between">
                        <label className="text-[10px] text-white/40 uppercase font-black tracking-widest">Положение аватарки и темы</label>
                        <User className="w-4 h-4 text-white/20" />
                     </div>
                     <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="1"
                        value={finalSlideConfig.brandingOffset}
                        onChange={(e) => setFinalSlideConfig(prev => ({ ...prev, brandingOffset: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                   </div>
                </div>
              </div>
            )}
          </div>
          <InstagramMockupPreview />
        </section>

        {/* FINAL STEP: DOWNLOAD */}
        <section className="space-y-12 flex flex-col items-center">
          <StepHeader num={7} title="ШАГ 7: СКАЧИВАНИЕ" />
          <div className="flex flex-col items-center gap-12 w-full max-w-4xl">
            {generatedImages.length > 0 ? (
              <>
                <button 
                  onClick={downloadAllZip} 
                  disabled={isGenerating}
                  className="w-full max-w-md py-6 rounded-full bg-white text-black text-xl font-black uppercase tracking-widest flex items-center justify-center gap-4 hover:scale-110 transition-all shadow-[0_20px_60px_rgba(255,255,255,0.1)] disabled:opacity-50"
                >
                  {isGenerating ? <RefreshCcw className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                  Скачать всё (ZIP)
                </button>

                <div className="w-full space-y-8">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/20 text-center">Скачать по одному</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {generatedImages.map((img, i) => (
                      <div key={i} className="group relative aspect-[4/5] bg-neutral-900 rounded-xl overflow-hidden border border-white/5 hover:border-white/30 transition-all">
                        <img src={img} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/40 gap-2">
                           <button 
                            onClick={() => downloadSingle(img, i)}
                            className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform"
                           >
                            <Download className="w-4 h-4" />
                           </button>
                           <span className="text-[10px] font-black uppercase">Слайд {i + 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-white/20 font-black uppercase tracking-widest text-sm text-center">Заполните текст для скачивания</p>
            )}
            
            <p className="text-[10px] text-white/20 font-bold uppercase tracking-[0.4em] text-center leading-relaxed">
              Акселератор • bymorozov
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
