import AsyncStorage from '@react-native-async-storage/async-storage';
import { BubbleType, Settings } from './types';

export const ASSISTANT_MODE_STORAGE_KEY = 'assistantMode';
export const FLOATING_SESSION_STORAGE_KEY = 'cookie_typer_floating_session';
export const MAIN_SESSION_STORAGE_KEY = 'cookie_typer_session';

export type AssistantModePreference = 'floating' | 'inapp';

export type FloatingAssistantElement = {
  id: string;
  text: string;
  originalLine: string;
  type: string;
  color: string;
};

export type FloatingAssistantSession = {
  elements: FloatingAssistantElement[];
  currentIndex: number;
  fontSize: number;
  smartCleaner: boolean;
  updatedAt: number;
};

export function clampFloatingFontSize(fontSize: number) {
  return Math.max(10, Math.min(40, fontSize));
}

export function buildFloatingSession(
  bubbles: BubbleType[],
  currentIndex: number,
  settings: Settings
): FloatingAssistantSession {
  return {
    elements: bubbles.map((bubble, index) => {
      const tag = settings.tags.find(item => item.id === bubble.tagId);
      return {
        id: `${index}-${bubble.originalText}`,
        text: bubble.text,
        originalLine: bubble.originalText,
        type: tag?.name || 'عادي',
        color: tag?.color || '#F2A6B8',
      };
    }),
    currentIndex,
    fontSize: clampFloatingFontSize(settings.fontSize),
    smartCleaner: settings.smartCleaner,
    updatedAt: Date.now(),
  };
}

export async function persistFloatingSession(session: FloatingAssistantSession) {
  await AsyncStorage.setItem(FLOATING_SESSION_STORAGE_KEY, JSON.stringify(session));
}
