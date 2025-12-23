
export type CarouselFormat = '1080x1080' | '1080x1350';

export type CarouselType = 'standard' | 'daily-plan' | 'bullets' | 'list';

export type NicknamePosition = 'bottom-left' | 'bottom-right' | 'bottom-center' | 'top-right' | 'top-center' | 'top-left';

export type TextAlign = 'left' | 'center' | 'justify';

export type SlideCountPosition = 'top-right' | 'bottom-right';

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

export type TemplateId = 'white' | 'black' | 'red' | 'green' | 'gray' | 'navy' | 'blue' | 'orange' | 'custom-color' | 'custom-image';

export interface TemplateConfig {
  id: TemplateId;
  name: string;
  bgColor: string;
  textColor: string;
}

export interface FontPair {
  id: string;
  name: string;
  headerFont: string;
  bodyFont: string;
}

export interface SlideOverride {
  fontSizeScale: number;
  lineHeightScale: number;
  textAlign?: TextAlign;
}

export interface FinalSlideConfig {
  enabled: boolean;
  textBefore: string;
  codeWord: string;
  textAfter: string;
  blogTopic: string;
  verticalOffset: number; // 0 to 100
  brandingOffset: number; // 0 to 100
  designVariant: number;
}
