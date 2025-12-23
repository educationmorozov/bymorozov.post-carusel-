import { CarouselFormat, NicknamePosition, SlideData, TemplateId, ValidationResult } from '../types';
// Removed invalid imports of PASTEL_COLORS and GRADIENTS which were not exported from constants
import { FORMAT_SPECS, TEMPLATES } from '../constants';

interface RenderParams {
  slide: SlideData;
  format: CarouselFormat;
  templateId: TemplateId;
  nickname: string;
  nicknamePosition: NicknamePosition;
  totalSlides: number;
  slideIndex: number;
}

export const validateAndRender = async (params: RenderParams): Promise<{ blob: Blob | null, validation: ValidationResult }> => {
  const spec = FORMAT_SPECS[params.format];
  const template = TEMPLATES.find(t => t.id === params.templateId)!;
  
  const canvas = document.createElement('canvas');
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext('2d');
  
  // ValidationResult now includes 'error' property
  if (!ctx) return { blob: null, validation: { slideId: params.slide.id, isValid: false, error: 'Canvas error' } };

  // 1. Draw Background
  // Removed unreachable checks for 'gradient' and 'pastel' as they are not in the TemplateId union
  ctx.fillStyle = template.bgColor;
  ctx.fillRect(0, 0, spec.width, spec.height);

  // 2. Prepare Text Rendering
  ctx.fillStyle = template.textColor;
  ctx.textBaseline = 'top';
  
  let fontSize = spec.width * 0.08; // Base font size ~86px
  const minFontSize = spec.minFontSize;
  // Removed unreachable check for 'card' template
  const padding = spec.padding;
  const maxWidth = spec.width - (padding * 2);
  const maxHeight = spec.height - (padding * 2);
  
  let currentY = padding;
  let finalFontSize = fontSize;
  let lines: string[] = [];

  // Functional wrap text to find best font size
  const tryFit = (size: number) => {
    ctx.font = `700 ${size}px 'Inter', sans-serif`;
    const tempLines: string[] = [];
    const paragraphs = params.slide.text.split('\n');
    
    for (const p of paragraphs) {
      if (p.trim() === '') {
        tempLines.push('');
        continue;
      }
      const words = p.split(' ');
      let line = '';
      for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
          tempLines.push(line.trim());
          line = word + ' ';
        } else {
          line = testLine;
        }
      }
      tempLines.push(line.trim());
    }
    
    const totalHeight = tempLines.length * (size * 1.3);
    return { lines: tempLines, height: totalHeight };
  };

  // Shrink font size until it fits
  while (finalFontSize >= minFontSize) {
    const result = tryFit(finalFontSize);
    if (result.height <= maxHeight) {
      lines = result.lines;
      break;
    }
    finalFontSize -= 2;
  }

  // Validation
  const tooMuchText = finalFontSize < minFontSize;
  if (tooMuchText) {
    // If it doesn't fit at min size, we still show what we can but mark invalid
    const result = tryFit(minFontSize);
    lines = result.lines;
    finalFontSize = minFontSize;
  }

  // 3. Render Content
  ctx.font = `700 ${finalFontSize}px 'Inter', sans-serif`;
  ctx.textAlign = 'left';
  
  // Vertical centering calculation
  const totalTextHeight = lines.length * (finalFontSize * 1.3);
  currentY = (spec.height - totalTextHeight) / 2;
  
  lines.forEach((line, i) => {
    // Handle "First line as header" logic for Template 1
    if (params.templateId === 'white' && i === 0 && line.length < 40) {
       ctx.font = `800 ${finalFontSize * 1.2}px 'Inter', sans-serif`;
    } else {
       // Removed invalid 'gradient' check; defaults to 600 weight
       ctx.font = `600 ${finalFontSize}px 'Inter', sans-serif`;
    }
    ctx.fillText(line, padding, currentY + (i * finalFontSize * 1.3));
  });

  // 4. Nickname and Slide Number
  ctx.font = `500 ${spec.width * 0.03}px 'Inter', sans-serif`;
  ctx.globalAlpha = 0.6;
  
  // Nickname
  if (params.nickname) {
    const nickText = params.nickname.startsWith('@') ? params.nickname : `@${params.nickname}`;
    if (params.nicknamePosition === 'bottom-left') {
      ctx.textAlign = 'left';
      ctx.fillText(nickText, spec.padding, spec.height - spec.padding / 2);
    } else if (params.nicknamePosition === 'bottom-right') {
      ctx.textAlign = 'right';
      ctx.fillText(nickText, spec.width - spec.padding, spec.height - spec.padding / 2);
    } else if (params.nicknamePosition === 'top-right') {
      ctx.textAlign = 'right';
      ctx.fillText(nickText, spec.width - spec.padding, spec.padding / 2 + 20);
    }
  }

  // Slide Number (1/10)
  ctx.textAlign = 'right';
  ctx.fillText(`${params.slideIndex + 1}/${params.totalSlides}`, spec.width - spec.padding, spec.height - spec.padding / 2);

  ctx.globalAlpha = 1.0;

  // Final validation object using the updated ValidationResult interface
  const validation: ValidationResult = {
    slideId: params.slide.id,
    isValid: !tooMuchText,
    error: tooMuchText ? `Текст не помещается на слайд` : undefined,
    fontSizeUsed: finalFontSize
  };

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve({ blob, validation });
    }, 'image/png');
  });
};