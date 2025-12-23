
export type CarouselFormat = '1080x1080' | '1080x1350';
export type NicknamePosition = 'bottom-left' | 'bottom-right' | 'top-right';
export type TextAlign = 'left' | 'center';
export type SplitMethod = 'empty-line' | 'separator-line' | 'slide-number';

export interface SlideData {
  id: number;
  text: string;
  isSpecialFinal?: boolean;
}

export interface ValidationResult {
  slideId: number;
  isValid: boolean;
  error?: string;
  fontSizeUsed?: number;
}

export type TemplateId = 'white' | 'black' | 'pastel' | 'gradient' | 'notes' | 'card';

export interface TemplateConfig {
  id: TemplateId;
  name: string;
  bgColor: string;
  textColor: string;
  accentColor?: string;
}

export interface FontPair {
  id: string;
  name: string;
  headerFont: string;
  bodyFont: string;
}

export interface FinalSlideConfig {
  enabled: boolean;
  textBefore: string;
  codeWord: string;
  textAfter: string;
  blogTopic: string;
  verticalOffset: number; 
  brandingOffset: number;
}
