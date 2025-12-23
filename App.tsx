
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Download, AlertCircle, RefreshCcw, Image as ImageIcon,
  User, ChevronRight, ChevronLeft, Layout, Type as TypeIcon, Trash2,
  Smartphone, Zap, Upload
} from 'lucide-react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { 
  CarouselFormat, NicknamePosition, SplitMethod, SlideData, 
  TemplateId, ValidationResult, FontPair, TextAlign, FinalSlideConfig
} from './types';
import { parseTextToSlides } from './parser';
import { validateAndRender } from './generator';
import { TEMPLATES, MAX_SLIDES, FONT_PAIRS } from './constants';

const App: React.FC = () => {
  const [text, setText] = useState<string>('Заголовок карусели\n\nВторой слайд с **важным** текстом.\n\nТретий слайд: [цветной текст](#3498db) и обычный.');
  const [nickname, setNickname] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('empty-line');
  const [format, setFormat] = useState<CarouselFormat>('1080x1350');
  const [nicknamePosition, setNicknamePosition] = useState<NicknamePosition>('bottom-right');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('black');
  const [selectedFontPair, setSelectedFontPair] = useState<FontPair>(FONT_PAIRS[0]);
  const [textAlign, setTextAlign] = useState<TextAlign>('left');
  const [finalConfig, setFinalConfig] = useState<FinalSlideConfig>({ enabled: false, textBefore: 'Пиши слово', codeWord: 'БОНУС', textAfter: 'в директ!', blogTopic: 'контент', verticalOffset: 50, brandingOffset: 50 });

  const [images, setImages] = useState<string[]>([]);
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const slides = useMemo(() => {
    const base = parseTextToSlides(text, splitMethod).slice(0, MAX_SLIDES);
    if (finalConfig.enabled) base.push({ id: 999, text: 'Final', isSpecialFinal: true });
    return base;
  }, [text, splitMethod, finalConfig.enabled]);

  const updatePreview = async () => {
    const imgs: string[] = []; const vals: ValidationResult[] = [];
    for (let i = 0; i < slides.length; i++) {
      const { blob, validation } = await validateAndRender({
        slide: slides[i], format, templateId: selectedTemplate, nickname, nicknamePosition,
        avatarUrl, fontPair: selectedFontPair, totalSlides: slides.length, slideIndex: i, textAlign, finalSlideConfig: finalConfig
      });
      if (blob) imgs.push(URL.createObjectURL(blob));
      vals.push(validation);
    }
    setImages(imgs); setValidations(vals);
  };

  useEffect(() => { const t = setTimeout(updatePreview, 600); return () => clearTimeout(t); }, 
    [slides, format, selectedTemplate, nickname, avatarUrl, selectedFontPair, textAlign, finalConfig]);

  const downloadZip = async () => {
    setIsGenerating(true); const zip = new JSZip();
    for (let i = 0; i < images.length; i++) {
      const res = await fetch(images[i]);
      zip.file(`bymorozov_slide_${i+1}.png`, await res.blob());
    }
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'carousel_bymorozov.zip');
    setIsGenerating(false);
  };

  const hasErrors = validations.some(v => !v.isValid);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/20">
      <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 p-6 text-center">
        <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase font-header leading-none">Акселератор</h1>
        <p className="text-[9px] tracking-[0.4em] font-bold opacity-30 mt-2">BYMOROZOV</p>
      </header>

      <main className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-12 mt-8 items-start">
        {/* НАСТРОЙКИ (ЛЕВАЯ ЧАСТЬ) */}
        <div className="space-y-12 pb-20">
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black uppercase tracking-tight">1. Текст</h2>
              <button onClick={() => setText('')} className="p-2 text-white/10 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
            </div>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Напишите текст..." className="w-full h-64 bg-white/[0.03] border border-white/10 rounded-[32px] p-8 outline-none focus:border-white/30 text-lg resize-none" />
            <div className="grid grid-cols-3 gap-2">
              {['empty-line', 'separator-line', 'slide-number'].map(m => (
                <button key={m} onClick={() => setSplitMethod(m as SplitMethod)} className={`py-4 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all ${splitMethod === m ? 'bg-white text-black border-white' : 'border-white/5 bg-white/[0.02] text-white/40 hover:border-white/20'}`}>
                  {m === 'empty-line' ? 'Абзац' : m === 'separator-line' ? '---' : 'Слайд N:'}
                </button>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <section className="space-y-4">
               <h2 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 flex items-center gap-2"><Smartphone size={12}/> Формат</h2>
               <div className="flex gap-2">
                 {['1080x1350', '1080x1080'].map(f => (
                   <button key={f} onClick={() => setFormat(f as CarouselFormat)} className={`flex-1 py-4 rounded-2xl border text-[10px] font-black tracking-widest transition-all ${format === f ? 'bg-white text-black border-white' : 'border-white/5 bg-white/[0.02] text-white/40'}`}>{f === '1080x1350' ? '4:5 (POST)' : '1:1 (SQ)'}</button>
                 ))}
               </div>
            </section>
            <section className="space-y-4">
               <h2 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 flex items-center gap-2"><TypeIcon size={12}/> Текст</h2>
               <div className="flex gap-2">
                 {['left', 'center'].map(a => (
                   <button key={a} onClick={() => setTextAlign(a as TextAlign)} className={`flex-1 py-4 rounded-2xl border text-[10px] font-black tracking-widest transition-all ${textAlign === a ? 'bg-white text-black border-white' : 'border-white/5 bg-white/[0.02] text-white/40'}`}>{a === 'left' ? 'СЛЕВА' : 'ЦЕНТР'}</button>
                 ))}
               </div>
            </section>
          </div>

          <section className="space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Дизайн шаблона</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setSelectedTemplate(t.id)} className={`p-4 rounded-2xl border aspect-square flex flex-col items-center justify-center gap-2 transition-all ${selectedTemplate === t.id ? 'border-white scale-105 shadow-xl bg-white/[0.05]' : 'border-white/5 opacity-40 hover:opacity-100 bg-white/[0.02]'}`} style={{ background: t.bgColor, color: t.textColor }}>
                  <Layout size={20}/>
                  <span className="text-[7px] font-black uppercase text-center leading-tight">{t.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Личный бренд</h2>
            <div className="bg-white/[0.03] p-8 rounded-[40px] space-y-6 border border-white/5 shadow-2xl">
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <div onClick={() => fileRef.current?.click()} className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center cursor-pointer border-2 border-dashed border-white/10 overflow-hidden group hover:border-white/40 transition-all">
                  {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover"/> : <ImageIcon className="opacity-10" size={32}/>}
                  <input ref={fileRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setAvatarUrl(r.result as string); r.readAsDataURL(f); } }}/>
                </div>
                <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="@bymorozov" className="flex-1 w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none font-bold placeholder:opacity-10" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['bottom-left', 'bottom-right', 'top-right'].map(p => (
                  <button key={p} onClick={() => setNicknamePosition(p as NicknamePosition)} className={`py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all ${nicknamePosition === p ? 'bg-white text-black border-white' : 'border-white/5 text-white/40 bg-black/20'}`}>{p.replace('-',' ')}</button>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between bg-white/5 p-6 rounded-[32px] border border-white/5">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-4"><Zap size={20}/> Lead Magnet</h2>
              <button onClick={() => setFinalConfig(p => ({...p, enabled: !p.enabled}))} className={`w-14 h-7 rounded-full relative transition-all ${finalConfig.enabled ? 'bg-white' : 'bg-white/10'}`}>
                <div className={`absolute top-1.5 w-4 h-4 rounded-full transition-all ${finalConfig.enabled ? 'right-1.5 bg-black' : 'left-1.5 bg-white/30'}`} />
              </button>
            </div>
            {finalConfig.enabled && (
              <div className="bg-white/[0.03] p-10 rounded-[40px] space-y-6 border border-white/5 animate-in slide-in-from-top-6 duration-500">
                <div className="grid grid-cols-2 gap-4">
                  <input value={finalConfig.codeWord} onChange={e => setFinalConfig(p => ({...p, codeWord: e.target.value}))} placeholder="Слово" className="bg-white/5 border border-white/10 rounded-2xl p-4 font-bold" />
                  <input value={finalConfig.blogTopic} onChange={e => setFinalConfig(p => ({...p, blogTopic: e.target.value}))} placeholder="Тема блога" className="bg-white/5 border border-white/10 rounded-2xl p-4 font-bold" />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-black uppercase opacity-40"><span>Высота текста</span><span>{finalConfig.verticalOffset}%</span></div>
                  <input type="range" min="0" max="100" value={finalConfig.verticalOffset} onChange={e => setFinalConfig(p => ({...p, verticalOffset: parseInt(e.target.value)}))} className="w-full accent-white" />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ПРЕДПРОСМОТР (ПРАВАЯ ЧАСТЬ) */}
        <div className="lg:sticky lg:top-32 space-y-12 flex flex-col items-center">
          <div className="w-full max-w-[400px] aspect-[4/5] bg-[#0a0a0a] rounded-[60px] overflow-hidden shadow-[0_60px_120px_-30px_rgba(0,0,0,0.9)] border border-white/10 relative group">
            {images.length > 0 ? (
              <img src={images[previewIdx]} className="w-full h-full object-contain animate-in fade-in duration-500" />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-12 text-center text-[10px] font-black uppercase tracking-[0.5em] opacity-10">Ожидание...</div>
            )}
            {validations[previewIdx] && !validations[previewIdx].isValid && (
              <div className="absolute inset-0 bg-red-600/30 backdrop-blur-md flex items-center justify-center p-10 text-center animate-in fade-in duration-300">
                <div className="bg-black p-8 rounded-[40px] text-[10px] font-black uppercase border border-red-500 shadow-2xl tracking-widest leading-relaxed">Текст не помещается!</div>
              </div>
            )}
            <div className="absolute top-1/2 -translate-y-1/2 flex justify-between w-full px-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setPreviewIdx(p => Math.max(0, p-1))} className="w-14 h-14 bg-black/80 backdrop-blur-xl rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-all"><ChevronLeft size={24}/></button>
              <button onClick={() => setPreviewIdx(p => Math.min(images.length-1, p+1))} className="w-14 h-14 bg-black/80 backdrop-blur-xl rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-all"><ChevronRight size={24}/></button>
            </div>
          </div>

          <div className="w-full max-w-sm space-y-6">
            <button onClick={downloadZip} disabled={isGenerating || images.length === 0 || hasErrors} className="w-full py-8 bg-white text-black rounded-full font-black uppercase tracking-[0.25em] shadow-[0_20px_60px_-10px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-10 flex items-center justify-center gap-5">
              {isGenerating ? <RefreshCcw className="animate-spin" size={24}/> : <Download size={24}/>} 
              {isGenerating ? 'РЕНДЕРИНГ...' : 'СКАЧАТЬ ZIP'}
            </button>
            <div className="grid grid-cols-2 gap-4">
               <button onClick={() => saveAs(images[previewIdx], `bymorozov_slide_${previewIdx+1}.png`)} disabled={images.length === 0} className="p-5 bg-white/[0.03] border border-white/10 rounded-[28px] text-[10px] font-black uppercase tracking-widest hover:bg-white/[0.06] transition-all flex items-center justify-center gap-3"><Download size={16}/> СЛАЙД</button>
               <button onClick={updatePreview} className="p-5 bg-white/[0.03] border border-white/10 rounded-[28px] text-[10px] font-black uppercase tracking-widest hover:bg-white/[0.06] transition-all flex items-center justify-center gap-3"><RefreshCcw size={16}/> ОБНОВИТЬ</button>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="mt-32 p-16 text-center border-t border-white/5 opacity-10">
        <p className="text-[10px] font-black uppercase tracking-[0.8em]">© 2024 • АКСЕЛЕРАТОР • BYMOROZOV</p>
      </footer>
    </div>
  );
};

export default App;
