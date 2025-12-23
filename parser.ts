
import { SlideData, SplitMethod } from './types';

export const parseTextToSlides = (text: string, method: SplitMethod): SlideData[] => {
  let chunks: string[] = [];
  const trimmed = text.trim();

  if (!trimmed) return [];

  switch (method) {
    case 'empty-line':
      chunks = trimmed.split(/\n\s*\n/);
      break;
    case 'separator-line':
      chunks = trimmed.split(/---/);
      break;
    case 'slide-number':
      chunks = trimmed.split(/Слайд\s*\d+\s*:/i);
      if (chunks[0]?.trim() === '') chunks.shift();
      break;
  }

  return chunks
    .map(c => c.trim())
    .filter(c => c.length > 0)
    .map((text, index) => ({
      id: index + 1,
      text
    }));
};
