
import { TemplateConfig, FontPair } from './types';

export const TEMPLATES: TemplateConfig[] = [
  { id: 'black', name: 'Черный', bgColor: '#121212', textColor: '#ffffff' },
  { id: 'white', name: 'Белый', bgColor: '#ffffff', textColor: '#1a1a1a' },
  { id: 'red', name: 'Темно-красный', bgColor: '#660810', textColor: '#f1ebeb' },
  { id: 'green', name: 'Темно-зеленый', bgColor: '#465940', textColor: '#fdfbf0' },
  { id: 'navy', name: 'Глубокий синий', bgColor: '#102e4a', textColor: '#fff7e6' },
  { id: 'blue', name: 'Королевский', bgColor: '#001166', textColor: '#f0f0e7' },
  { id: 'custom-color', name: 'Свой цвет', bgColor: '#737373', textColor: '#ffffff' },
  { id: 'custom-image', name: 'Свое фото', bgColor: '#000000', textColor: '#ffffff' }
];

export const FONT_PAIRS: FontPair[] = [
  { id: 'gilroy', name: 'Gilroy ExtraBold + Manrope', headerFont: 'Montserrat', bodyFont: 'Manrope' },
  { id: 'mont-alt', name: 'Montserrat Alternates + Manrope', headerFont: 'Montserrat Alternates', bodyFont: 'Manrope' },
  { id: 'dmsans', name: 'DM Sans Bold + Manrope', headerFont: 'DM Sans', bodyFont: 'Manrope' },
  { id: 'humanist', name: 'Bold Humanist Sans', headerFont: 'Golos Text', bodyFont: 'Manrope' },
  { id: 'experimental', name: 'Experimental + Neutral', headerFont: 'Unbounded', bodyFont: 'Inter' },
  { id: 'custom', name: 'Свой шрифт', headerFont: 'Inter', bodyFont: 'Inter' }
];

export const SELECTABLE_FONTS = [
  'Inter', 'Manrope', 'Montserrat', 'Montserrat Alternates', 
  'Unbounded', 'Golos Text', 'DM Sans', 'Plus Jakarta Sans', 
  'Oswald', 'Ubuntu', 'Playfair Display', 'Rubik', 'Sora', 
  'Raleway', 'Work Sans', 'Cabin', 'Archivo'
];

export const MAX_SLIDES = 20;

export const FORMAT_SPECS = {
  '1080x1080': { width: 1080, height: 1080, minFontSize: 30, padding: 80 },
  '1080x1350': { width: 1080, height: 1350, minFontSize: 36, padding: 100 }
};
