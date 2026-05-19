import { Platform } from 'react-native';
import { Settings, TagType } from './types';

export const ASSISTANT_SCALE_MIN = 60;
export const ASSISTANT_SCALE_MAX = 120;

export const DEFAULT_TAGS: TagType[] = [
  { id: 'default-normal', symbol: '""', name: 'فقاعة عادية', color: '#e5e7eb' },
  { id: 'default-happy', symbol: '^^', name: 'فقاعة فرح', color: '#f9a8d4' },
  { id: 'default-outside', symbol: '#', name: 'خارجي', color: '#ef4444' },
  { id: 'default-side', symbol: '**', name: 'جانبي', color: '#22c55e' },
  { id: 'default-shout', symbol: '::', name: 'صراخ', color: '#f97316' },
  { id: 'default-thinking', symbol: '()', name: 'تفكير', color: '#8b5cf6' },
  { id: 'default-square', symbol: '[]', name: 'مربع', color: '#94a3b8' },
  { id: 'default-shiver', symbol: '=', name: 'ارتجاف', color: '#06b6d4' },
  { id: 'default-sun', symbol: '{}', name: 'شمسية', color: '#f59e0b' },
];

export const DEFAULT_SETTINGS: Settings = {
  fontSize: 18,
  assistantScale: 100,
  smartCleaner: true,
  assistantMode: Platform.OS === 'android' ? null : 'inapp',
  tags: DEFAULT_TAGS,
};

export function clampAssistantScale(scale?: number) {
  if (typeof scale !== 'number' || Number.isNaN(scale)) return 100;
  return Math.max(ASSISTANT_SCALE_MIN, Math.min(ASSISTANT_SCALE_MAX, Math.round(scale)));
}

export function normalizeTag(tag: TagType): TagType {
  return {
    ...tag,
    symbol: tag.symbol || '',
    name: tag.name || '',
    color: tag.color || '#F2A6B8',
    fontName: tag.fontName || undefined,
    fontUri: tag.fontUri || undefined,
  };
}

export function mergeMissingDefaultTags(existingTags?: TagType[]) {
  if (!existingTags || existingTags.length === 0) {
    return DEFAULT_TAGS.map(normalizeTag);
  }

  const normalizedExisting = existingTags.map(normalizeTag);
  const existingSymbols = new Set(normalizedExisting.map(tag => tag.symbol));
  const additions = DEFAULT_TAGS.filter(tag => !existingSymbols.has(tag.symbol)).map(normalizeTag);

  return [...normalizedExisting, ...additions];
}

export function restoreDefaultTagsWithoutCustomLoss(existingTags: TagType[]) {
  const defaultSymbols = new Set(DEFAULT_TAGS.map(tag => tag.symbol));
  const customTags = existingTags.filter(tag => !defaultSymbols.has(tag.symbol)).map(normalizeTag);
  return [...DEFAULT_TAGS.map(normalizeTag), ...customTags];
}
