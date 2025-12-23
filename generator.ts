
import { CarouselFormat, CarouselType, NicknamePosition, SlideData, TemplateId, ValidationResult, FontPair, TextAlign, SlideCountPosition } from './types';
import { FORMAT_SPECS, TEMPLATES } from './constants';

interface RenderParams {
  slide: SlideData;
  format: CarouselFormat;
  carouselType: CarouselType;
  templateId: TemplateId;
  nickname: string;
  nicknamePosition: NicknamePosition;
  avatarUrl: string | null;
  fontPair: FontPair;
  totalSlides: number;
  slideIndex: number;
  customBgColor?: string;
  customTextColor?: string;
  bgImageUrl?: string | null;
  fontSizeScale?: number;
  lineHeightScale?: number;
  textAlign?: TextAlign;
  showSlideCount: boolean;
  slideCountPosition: SlideCountPosition;
  finalSlideData?: { 
    textBefore: string, 
    codeWord: string, 
    textAfter: string, 
    blogTopic: string, 
    verticalOffset: number,
    brandingOffset: number,
    variant: number
  };
}

interface TextSegment {
  text: string;
  isBold: boolean;
  color: string | null;
}

const parseRichTextSegments = (text: string): TextSegment[] => {
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
    } else if (part.startsWith('[')) {
      const textMatch = part.match(/\[(.*?)\]/);
      const colorMatch = part.match(/\((#?[a-fA-F0-9]{3,8})\)/);
      if (textMatch && colorMatch) {
        segments.push({ text: textMatch[1], isBold: false, color: colorMatch[1] });
      }
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
  ctx.closePath();
  ctx.clip();
  const scale = Math.max(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, x + (size - w) / 2, y + (size - h) / 2, w, h);
  ctx.restore();
};

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
};

export const validateAndRender = async (params: RenderParams): Promise<{ blob: Blob | null, validation: ValidationResult }> => {
  await document.fonts.ready;

  const spec = FORMAT_SPECS[params.format];
  const template = TEMPLATES.find(t => t.id === params.templateId)!;
  const canvas = document.createElement('canvas');
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return { blob: null, validation: { slideId: params.slide.id, isValid: false } };

  const baseTextColor = params.templateId === 'custom-color' ? (params.customTextColor || template.textColor) : template.textColor;

  if (params.templateId === 'custom-image' && params.bgImageUrl) {
    try {
      const bgImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = params.bgImageUrl!;
      });
      const scale = Math.max(spec.width / bgImg.width, spec.height / bgImg.height);
      const w = bgImg.width * scale;
      const h = bgImg.height * scale;
      ctx.drawImage(bgImg, (spec.width - w) / 2, (spec.height - h) / 2, w, h);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, spec.width, spec.height);
    } catch (e) {
      console.warn("Failed to load background image", e);
      ctx.fillStyle = template.bgColor;
      ctx.fillRect(0, 0, spec.width, spec.height);
    }
  } else {
    ctx.fillStyle = params.templateId === 'custom-color' ? (params.customBgColor || '#737373') : template.bgColor;
    ctx.fillRect(0, 0, spec.width, spec.height);
  }

  const hFont = params.fontPair.headerFont;
  const bFont = params.fontPair.bodyFont;

  if (params.slide.isSpecialFinal && params.finalSlideData) {
    const { textBefore, codeWord, textAfter, blogTopic, verticalOffset, brandingOffset, variant } = params.finalSlideData;
    const avatarImg = params.avatarUrl ? await new Promise<HTMLImageElement>((res) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => res(img);
      img.onerror = () => res(new Image()); // Fallback to empty if error
      img.src = params.avatarUrl!;
    }).catch(() => null) : null;

    ctx.fillStyle = baseTextColor;
    const safeMaxWidth = spec.width - (spec.padding * 2);
    
    const baseY = (spec.height * 0.15) + ((spec.height * 0.45) * (verticalOffset / 100));

    ctx.textAlign = 'center';
    ctx.font = `400 ${spec.width * 0.045}px "${bFont}"`;
    const beforeLines = wrapText(ctx, textBefore, safeMaxWidth);
    let currentY = baseY;
    beforeLines.forEach(line => {
      ctx.fillText(line, spec.width / 2, currentY);
      currentY += spec.width * 0.06;
    });

    currentY += spec.width * 0.05;
    ctx.font = `900 ${spec.width * 0.07}px "${hFont}"`;
    const wordWidth = ctx.measureText(codeWord).width;
    const paddingH = 70;
    const paddingV = 35;
    const ovalHeight = spec.width * 0.08 + paddingV * 2;
    const ovalWidth = Math.max(wordWidth + paddingH * 2, 200);

    ctx.strokeStyle = baseTextColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    // Use standard roundRect or fallback
    if (ctx.roundRect) {
        ctx.roundRect(spec.width / 2 - ovalWidth / 2, currentY - ovalHeight / 2, ovalWidth, ovalHeight, 100);
    } else {
        ctx.rect(spec.width / 2 - ovalWidth / 2, currentY - ovalHeight / 2, ovalWidth, ovalHeight);
    }
    ctx.stroke();

    ctx.textBaseline = 'middle';
    ctx.fillText(codeWord, spec.width / 2, currentY);
    ctx.textBaseline = 'alphabetic';

    currentY += ovalHeight / 2 + spec.width * 0.08;
    ctx.font = `400 ${spec.width * 0.045}px "${bFont}"`;
    const afterLines = wrapText(ctx, textAfter, safeMaxWidth);
    afterLines.forEach(line => {
      ctx.fillText(line, spec.width / 2, currentY);
      currentY += spec.width * 0.06;
    });

    const brandBaseY = (spec.height * 0.65) + ((spec.height * 0.25) * (brandingOffset / 100));
    const avSize = spec.width * 0.16;
    const brandX = spec.padding;
    
    if (avatarImg && avatarImg.width > 0) {
      drawAvatar(ctx, avatarImg as HTMLImageElement, brandX, brandBaseY, avSize);
    }
    
    const textX = brandX + (avatarImg && avatarImg.width > 0 ? avSize + 40 : 0);
    const textSafeWidth = spec.width - textX - spec.padding;
    ctx.textAlign = 'left';
    
    ctx.font = `900 ${spec.width * 0.05}px "${hFont}"`;
    const nickY = brandBaseY + avSize / 2 - 5;
    ctx.fillText(params.nickname || 'username', textX, nickY);
    
    ctx.font = `400 ${spec.width * 0.035}px "${bFont}"`;
    ctx.globalAlpha = 0.6;
    const subText = blogTopic.trim() 
      ? `у меня в блоге все про ${blogTopic}` 
      : `Подписывайся!`;
    
    const topicLines = wrapText(ctx, subText, textSafeWidth);
    let topicY = nickY + 45;
    topicLines.forEach(tLine => {
       ctx.fillText(tLine, textX, topicY);
       topicY += spec.width * 0.045;
    });
    ctx.globalAlpha = 1;

  } else {
    const isCover = params.slideIndex === 0;
    const isLast = params.slideIndex === params.totalSlides - 1;
    const hScale = isCover ? 1.6 : 1.1;
    const bScale = isCover ? 1.0 : 0.75;
    const baseLineSpacing = params.lineHeightScale || 1.35;
    const userScale = params.fontSizeScale || 1;
    
    let baseFontSize = 64 * userScale; 
    const minFontSize = spec.minFontSize;
    const padding = spec.padding;
    const maxWidth = spec.width - (padding * 2);
    const maxHeight = spec.height - (padding * 3.5);
    
    let finalFontSize = baseFontSize;
    let finalLayout: { lines: { segments: TextSegment[], isHeader: boolean, width: number }[], totalHeight: number } = { lines: [], totalHeight: 0 };

    const calculateLayout = (size: number) => {
      const lines: { segments: TextSegment[], isHeader: boolean, width: number }[] = [];
      const paragraphs = params.slide.text.split('\n');
      let totalH = 0;

      paragraphs.forEach((p, pIdx) => {
        const isBullets = params.carouselType === 'bullets';
        let isHeaderLine = false;
        if (isCover) {
          isHeaderLine = pIdx === 0 && p.length < 80;
        } else if (isBullets && !isLast) {
          isHeaderLine = pIdx === 0;
        } else {
          isHeaderLine = pIdx === 0 && p.length < 80 && params.carouselType === 'standard';
        }

        const currentFontSize = isHeaderLine ? size * hScale : size * bScale;
        const segments = parseRichTextSegments(p);
        let currentLineSegments: TextSegment[] = [];
        let currentLineWidth = 0;

        segments.forEach(seg => {
          const words = seg.text.split(' ');
          words.forEach((word, wordIdx) => {
            const isLastWord = wordIdx === words.length - 1;
            const wordToMeasure = word + (isLastWord ? '' : ' ');
            ctx.font = `${seg.isBold || isHeaderLine ? '900' : '400'} ${currentFontSize}px "${isHeaderLine ? hFont : bFont}"`;
            const wordWidth = ctx.measureText(wordToMeasure).width;

            if (currentLineWidth + wordWidth > maxWidth && currentLineSegments.length > 0) {
              lines.push({ segments: currentLineSegments, isHeader: isHeaderLine, width: currentLineWidth });
              totalH += currentFontSize * baseLineSpacing;
              currentLineSegments = [];
              currentLineWidth = 0;
            }
            currentLineSegments.push({ ...seg, text: wordToMeasure });
            currentLineWidth += wordWidth;
          });
        });

        if (currentLineSegments.length > 0) {
          lines.push({ segments: currentLineSegments, isHeader: isHeaderLine, width: currentLineWidth });
          totalH += currentFontSize * baseLineSpacing;
        }
        if (pIdx < paragraphs.length - 1) totalH += currentFontSize * 0.3;
      });
      return { lines, totalHeight: totalH };
    };

    while (finalFontSize >= minFontSize) {
      const layout = calculateLayout(finalFontSize);
      if (layout.totalHeight <= maxHeight) {
        finalLayout = layout;
        break;
      }
      finalFontSize -= 2;
    }
    const verticalBias = isCover ? 0.48 : 0.5;
    let startY = (spec.height - finalLayout.totalHeight) * verticalBias;
    let textAlign = params.textAlign || 'left';
    if (!isCover && (params.carouselType === 'daily-plan' || params.carouselType === 'list' || params.carouselType === 'bullets')) textAlign = 'left';

    finalLayout.lines.forEach((line) => {
      const currentFontSize = line.isHeader ? finalFontSize * hScale : finalFontSize * bScale;
      const lineHeight = currentFontSize * baseLineSpacing;
      let currentX = padding;
      if (textAlign === 'center') currentX = (spec.width - line.width) / 2;
      line.segments.forEach(seg => {
        ctx.font = `${seg.isBold || line.isHeader ? '900' : '400'} ${currentFontSize}px "${line.isHeader ? hFont : bFont}"`;
        ctx.fillStyle = seg.color || baseTextColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(seg.text, currentX, startY + (lineHeight / 2));
        currentX += ctx.measureText(seg.text).width;
      });
      startY += lineHeight;
    });
  }

  if (!params.slide.isSpecialFinal) {
    const bottomY = spec.height - spec.padding / 1.1;
    const topY = spec.padding / 1.1;
    const avatarSize = spec.width * 0.06;
    
    ctx.font = `700 ${spec.width * 0.028}px "${bFont}"`;
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = baseTextColor;
    
    if (params.nickname || params.avatarUrl) {
      const nick = params.nickname ? (params.nickname.startsWith('@') ? params.nickname : `@${params.nickname}`) : '';
      const avatarImg = params.avatarUrl ? await new Promise<HTMLImageElement>((res) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => res(img);
        img.onerror = () => res(new Image());
        img.src = params.avatarUrl!;
      }).catch(() => null) : null;

      const drawBranding = (y: number, align: 'left' | 'center' | 'right') => {
        ctx.textAlign = align;
        const tw = ctx.measureText(nick).width;
        if (align === 'center') {
          const totalW = avatarImg && (avatarImg as HTMLImageElement).width > 0 ? tw + avatarSize + 20 : tw;
          const sx = (spec.width - totalW) / 2;
          if (avatarImg && (avatarImg as HTMLImageElement).width > 0) drawAvatar(ctx, avatarImg as HTMLImageElement, sx, y - avatarSize / 2, avatarSize);
          ctx.fillText(nick, sx + (avatarImg && (avatarImg as HTMLImageElement).width > 0 ? avatarSize + 20 : 0) + tw / 2, y);
        } else if (align === 'left') {
          if (avatarImg && (avatarImg as HTMLImageElement).width > 0) drawAvatar(ctx, avatarImg as HTMLImageElement, spec.padding, y - avatarSize / 2, avatarSize);
          ctx.fillText(nick, spec.padding + (avatarImg && (avatarImg as HTMLImageElement).width > 0 ? avatarSize + 20 : 0), y);
        } else if (align === 'right') {
          ctx.fillText(nick, spec.width - spec.padding, y);
          if (avatarImg && (avatarImg as HTMLImageElement).width > 0) drawAvatar(ctx, avatarImg as HTMLImageElement, spec.width - spec.padding - tw - avatarSize - 20, y - avatarSize / 2, avatarSize);
        }
      };

      switch (params.nicknamePosition) {
        case 'bottom-left': drawBranding(bottomY, 'left'); break;
        case 'bottom-center': drawBranding(bottomY, 'center'); break;
        case 'bottom-right': drawBranding(bottomY, 'right'); break;
        case 'top-left': drawBranding(topY, 'left'); break;
        case 'top-center': drawBranding(topY, 'center'); break;
        case 'top-right': drawBranding(topY, 'right'); break;
      }
    }

    if (params.showSlideCount) {
      ctx.textAlign = 'right';
      ctx.globalAlpha = 0.6;
      const countY = params.slideCountPosition === 'top-right' ? topY : bottomY;
      ctx.fillText(`${params.slideIndex + 1}/${params.totalSlides}`, spec.width - spec.padding, countY);
    }
  }

  ctx.globalAlpha = 1.0;
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve({ blob, validation: { slideId: params.slide.id, isValid: true } });
    }, 'image/png');
  });
};
