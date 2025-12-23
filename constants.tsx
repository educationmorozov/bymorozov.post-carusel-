
import { TemplateConfig, FontPair } from './types';

export const TEMPLATES: TemplateConfig[] = [
  { id: 'white', name: 'WHITE MINIMAL', bgColor: '#ffffff', textColor: '#111111' },
  { id: 'black', name: 'BLACK MINIMAL', bgColor: '#0a0a0a', textColor: '#ffffff' },
  { id: 'pastel', name: 'PASTEL DREAM', bgColor: '#f9f3f3', textColor: '#4a4e69' },
  { id: 'gradient', name: 'DEEP GRADIENT', bgColor: 'linear-gradient(135deg, #121212 0%, #2c2c2c 100%)', textColor: '#ffffff' },
  { id: 'notes', name: 'PAPER NOTES', bgColor: '#fffcf2', textColor: '#252525' },
  { id: 'card', name: 'FLOATING CARD', bgColor: '#eeeeee', textColor: '#1a1a1a' }
];

export const FONT_PAIRS: FontPair[] = [
  { id: 'unbounded', name: 'Unbounded + Inter', headerFont: 'Unbounded', bodyFont: 'Inter' },
  { id: 'montserrat', name: 'Montserrat + Manrope', headerFont: 'Montserrat', bodyFont: 'Manrope' },
  { id: 'golos', name: 'Golos + Inter', headerFont: 'Golos Text', bodyFont: 'Inter' }
];

export const MAX_SLIDES = 20;

export const FORMAT_SPECS = {
  '1080x1080': { width: 1080, height: 1080, minFontSize: 30, padding: 85 },
  '1080x1350': { width: 1080, height: 1350, minFontSize: 36, padding: 100 }
};
