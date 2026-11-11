import { CSSProperties, FC } from 'react';

export interface TechTextProps {
  text?: string;
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  letterSpacing?: number;
  color?: string;
  accentColor?: string;
  align?: 'left' | 'center' | 'right';
  reach?: number;
  softness?: number;
  dashLength?: number;
  dashGap?: number;
  strokeWidth?: number;
  lineStyle?: 'dashed' | 'solid';
  reveal?: 'area' | 'letter' | 'off';
  specks?: number;
  selection?: boolean;
  labels?: boolean;
  draggable?: boolean;
  bounce?: number;
  sweep?: boolean;
  speed?: number;
  clickKick?: boolean;
  intro?: 'none' | 'type' | 'assemble' | 'metrics';
  introDuration?: number;
  guides?: boolean;
  className?: string;
  style?: CSSProperties;
}

declare const TechText: FC<TechTextProps>;
export default TechText;

