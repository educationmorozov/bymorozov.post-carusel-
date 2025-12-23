
import { CarouselFormat, NicknamePosition, SlideData, TemplateId, ValidationResult, FontPair, TextAlign, FinalSlideConfig } from './types';
import { FORMAT_SPECS, TEMPLATES } from './constants';

interface RenderParams {
  slide: SlideData;
  format: CarouselFormat;
  templateId: TemplateId;
  nickname: string;
  nicknamePosition: NicknamePosition;
  avatarUrl: string | null;
  fontPair: FontPair;
  totalSlides: number;
  slideIndex: number;
  textAlign: TextAlign;
  finalSlideConfig?: FinalSlideConfig;
}

interface TextSegment {
  text: string;
  isBold: boolean;
  color: string | null;
}

const parseRichText = (text: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  const regex = /(\*\*.*?\*\*|\[.*?\]\(#?[a-fA-F0-9]{3,8}\))/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.substring(lastIndex, match.index), isBold: false, color: null });
    }
    const part = match[0];
    if (part.startsWith('**')) {
      segments.push({ text: part.slice(2, -2), isBold: true, color: null });
    } else {
      const tMatch = part.match(/\[(.*?)\]/);
      const cMatch = part.match(/\((#?[a-fA-F0-9]{3,8})\)/);
      if (tMatch && cMatch) segments.push({ text: tMatch[1], isBold: false, color: cMatch[1] });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.substring(lastIndex), isBold: false, color: null });
  }
  return segments;
};

const drawAvatar = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, size: number) => {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  const scale = Math.max(size / img.width, size / img.height);
  ctx.drawImage(img, x + (size - img.width * scale) / 2, y + (size - img.height * scale) / 2, img.width * scale, img.height * scale);
  ctx.restore();
};

export const validateAndRender = async (params: RenderParams): Promise<{ blob: Blob | null, validation: ValidationResult }> => {
  try { await document.fonts.ready; } catch (e) {}
  
  const spec = FORMAT_SPECS[params.format];
  const template = TEMPLATES.find(t => t.id === params.templateId) || TEMPLATES[0];
  const canvas = document.createElement('canvas');
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return { blob: null, validation: { slideId: params.slide.id, isValid: false, error: 'Canvas not supported' } };

  // Background
  if (template.id === 'gradient') {
    const g = ctx.createLinearGradient(0, 0, spec.width, spec.height);
    g.addColorStop(0, '#121212'); g.addColorStop(1, '#2c2c2c');
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = template.bgColor;
  }
  ctx.fillRect(0, 0, spec.width, spec.height);

  // Notes decor
  if (template.id === 'notes') {
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 2;
    for (let i = 180; i < spec.height; i += 65) {
      ctx.beginPath(); ctx.moveTo(spec.padding, i); ctx.lineTo(spec.width - spec.padding, i); ctx.stroke();
    }
  }

  let drawPadding = spec.padding;
  if (template.id === 'card') {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 80;
    ctx.fillStyle = '#ffffff';
    const r = 50; const mx = 70, my = 70, mw = spec.width - 140, mh = spec.height - 140;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(mx, my, mw, mh, r);
    } else {
      ctx.rect(mx, my, mw, mh);
    }
    ctx.fill();
    ctx.restore();
    drawPadding = 140;
  }

  const baseTextColor = template.textColor;
  const hFont = params.fontPair.headerFont;
  const bFont = params.fontPair.bodyFont;

  let isValid = true;

  if (params.slide.isSpecialFinal && params.finalSlideConfig) {
    const c = params.finalSlideConfig;
    ctx.fillStyle = baseTextColor;
    ctx.textAlign = 'center';
    const midY = (spec.height * 0.15) + (spec.height * 0.45 * (c.verticalOffset / 100));
    ctx.font = `400 ${spec.width * 0.045}px "${bFont}"`;
    ctx.fillText(c.textBefore, spec.width / 2, midY);
    ctx.font = `900 ${spec.width * 0.08}px "${hFont}"`;
    ctx.fillText(c.codeWord, spec.width / 2, midY + 110);
    ctx.font = `400 ${spec.width * 0.045}px "${bFont}"`;
    ctx.fillText(c.textAfter, spec.width / 2, midY + 220);

    const bY = (spec.height * 0.65) + (spec.height * 0.25 * (c.brandingOffset / 100));
    if (params.avatarUrl) {
      const img = new Image();
      img.src = params.avatarUrl;
      await new Promise(r => {
        img.onload = r;
        img.onerror = r;
      });
      if (img.complete && img.naturalWidth > 0) {
        drawAvatar(ctx, img, spec.padding, bY, 160);
      }
    }
    ctx.textAlign = 'left';
    ctx.font = `900 ${spec.width * 0.052}px "${hFont}"`;
    ctx.fillText(params.nickname || '@username', params.avatarUrl ? spec.padding + 190 : spec.padding, bY + 65);
    ctx.font = `400 ${spec.width * 0.034}px "${bFont}"`;
    ctx.globalAlpha = 0.5;
    ctx.fillText(`блог про ${c.blogTopic || 'контент'}`, params.avatarUrl ? spec.padding + 190 : spec.padding, bY + 115);
    ctx.globalAlpha = 1;
  } else {
    let fSize = spec.width * (params.slideIndex === 0 ? 0.088 : 0.065);
    const minSize = spec.minFontSize;
    const maxWidth = spec.width - drawPadding * 2;
    const maxHeight = spec.height - drawPadding * 3.5;
    let lines: any[] = [];

    const layout = (size: number) => {
      const res: any[] = [];
      const paragraphs = params.slide.text.split('\n');
      paragraphs.forEach((p, idx) => {
        const isH = template.id === 'white' && idx === 0 && p.length < 50;
        const curSize = isH ? size * 1.35 : size;
        const segs = parseRichText(p);
        let curLineSegs: any[] = [];
        let curW = 0;
        segs.forEach(s => {
          const words = s.text.split(' ');
          words.forEach((w, wi) => {
            const word = w + (wi === words.length - 1 ? '' : ' ');
            // Fix: Replace undefined 'l.h' with 'isH' which is in scope from paragraphs.forEach
            ctx.font = `${s.isBold || isH ? '900' : '400'} ${curSize}px "${isH ? hFont : bFont}"`;
            const ww = ctx.measureText(word).width;
            if (curW + ww > maxWidth && curLineSegs.length > 0) {
              res.push({ segs: curLineSegs, h: isH, w: curW, f: curSize });
              curLineSegs = []; curW = 0;
            }
            curLineSegs.push({ ...s, text: word });
            curW += ww;
          });
        });
        if (curLineSegs.length > 0) res.push({ segs: curLineSegs, h: isH, w: curW, f: curSize });
      });
      return res;
    };

    while (fSize >= minSize) {
      lines = layout(fSize);
      const h = lines.reduce((acc, l) => acc + l.f * 1.4, 0);
      if (h <= maxHeight) break;
      fSize -= 1.5;
    }

    isValid = fSize >= minSize;
    const totalH = lines.reduce((acc, l) => acc + l.f * 1.4, 0);
    let curY = (spec.height - totalH) / 2;

    lines.forEach(l => {
      let curX = drawPadding;
      if (params.textAlign === 'center') curX = (spec.width - l.w) / 2;
      l.segs.forEach((s: any) => {
        ctx.font = `${s.isBold || l.h ? '900' : '400'} ${l.f}px "${l.h ? hFont : bFont}"`;
        ctx.fillStyle = s.color || baseTextColor;
        ctx.textAlign = 'left';
        ctx.fillText(s.text, curX, curY + l.f);
        curX += ctx.measureText(s.text).width;
      });
      curY += l.f * 1.4;
    });

    ctx.globalAlpha = 0.4;
    ctx.fillStyle = baseTextColor;
    ctx.font = `600 ${spec.width * 0.03}px "${bFont}"`;
    const nick = params.nickname || '@username';
    if (params.nicknamePosition === 'bottom-left') {
      ctx.textAlign = 'left';
      ctx.fillText(nick, spec.padding, spec.height - spec.padding / 2);
    } else if (params.nicknamePosition === 'bottom-right') {
      ctx.textAlign = 'right';
      ctx.fillText(nick, spec.width - spec.padding, spec.height - spec.padding / 2);
    } else {
      ctx.textAlign = 'right';
      ctx.fillText(nick, spec.width - spec.padding, spec.padding / 2 + 40);
    }
    ctx.textAlign = 'right';
    ctx.fillText(`${params.slideIndex + 1}/${params.totalSlides}`, spec.width - spec.padding, spec.height - spec.padding / 2);
    ctx.globalAlpha = 1;
  }

  return new Promise(r => canvas.toBlob(blob => r({ blob, validation: { slideId: params.slide.id, isValid } }), 'image/png'));
};
