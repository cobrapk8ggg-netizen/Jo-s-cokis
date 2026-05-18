import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, SessionData, BubbleType, AssistantModePreference } from '../types';
import { ASSISTANT_MODE_STORAGE_KEY, MAIN_SESSION_STORAGE_KEY } from '../floatingSession';

const DEFAULT_SETTINGS: Settings = {
  fontSize: 18,
  smartCleaner: true,
  assistantMode: Platform.OS === 'android' ? null : 'inapp',
  tags: [
    { id: '1', symbol: '#', name: 'خارجي', color: '#ef4444' },
    { id: '2', symbol: '*', name: 'جانبي', color: '#22c55e' },
    { id: '3', symbol: '"', name: 'مؤثر', color: '#eab308' },
  ],
};

const DEFAULT_SESSION: SessionData = {
  bubbles: [],
  currentIndex: 0,
  inputText: '',
};

export function useCookieTyper() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [session, setSession] = useState<SessionData>(DEFAULT_SESSION);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from persistent storage
  useEffect(() => {
    async function loadData() {
      try {
        const savedSettings = await AsyncStorage.getItem('cookie_typer_settings');
        const savedSession = await AsyncStorage.getItem(MAIN_SESSION_STORAGE_KEY);
        const savedAssistantMode = await AsyncStorage.getItem(ASSISTANT_MODE_STORAGE_KEY) as AssistantModePreference | null;
        
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setSettings({
            ...DEFAULT_SETTINGS,
            ...parsedSettings,
            assistantMode: Platform.OS === 'android'
              ? savedAssistantMode || parsedSettings.assistantMode || null
              : 'inapp',
          });
        } else {
          setSettings({
            ...DEFAULT_SETTINGS,
            assistantMode: Platform.OS === 'android' ? savedAssistantMode : 'inapp',
          });
        }

        if (savedSession) setSession(JSON.parse(savedSession));
      } catch (e) {
        console.error('Failed to load storage', e);
      } finally {
        setIsLoaded(true);
      }
    }
    loadData();
  }, []);

  // Persist settings changes
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem('cookie_typer_settings', JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  // Persist assistant mode in its own stable key for native/floating lookups
  useEffect(() => {
    if (isLoaded && Platform.OS === 'android' && settings.assistantMode) {
      AsyncStorage.setItem(ASSISTANT_MODE_STORAGE_KEY, settings.assistantMode);
    }
  }, [settings.assistantMode, isLoaded]);

  // Persist session changes
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(MAIN_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }, [session, isLoaded]);

  const cleanText = (text: string) => {
    if (!settings.smartCleaner) return text.trim();
    
    // Smart Cleaner Logic
    return text
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/\s*([\.،؟!,:])\s*/g, '$1 ') // Punctuation fixes
      .replace(/\s*(\.+)\s*/g, '$1 ') // Multiple dots
      .replace(/\s+$/g, '') // End trim
      .replace(/^\s+/g, '') // Start trim
      .trim();
  };

  const buildSessionFromText = (text: string): SessionData => {
    // Each non-empty line is a bubble
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const parsedBubbles: BubbleType[] = lines.map(line => {
      const trimmedLine = line.trim();
      let matchedTagId: string | null = null;
      let finalContent = trimmedLine;

      // Check for tags at the beginning of the line
      for (const tag of settings.tags) {
        if (tag.symbol && trimmedLine.startsWith(tag.symbol)) {
          matchedTagId = tag.id;
          finalContent = trimmedLine.slice(tag.symbol.length).trim();
          break;
        }
      }

      return {
        text: cleanText(finalContent),
        originalText: trimmedLine,
        tagId: matchedTagId,
      };
    });

    return {
      bubbles: parsedBubbles,
      inputText: text,
      currentIndex: session.inputText === text && session.bubbles.length > 0
        ? Math.min(session.currentIndex, parsedBubbles.length - 1)
        : 0,
    };
  };

  const parseText = (text: string) => {
    const nextSession = buildSessionFromText(text);
    setSession(prev => ({
      ...prev,
      ...nextSession,
    }));
    return nextSession;
  };

  const nextBubble = () => {
    setSession(prev => ({
      ...prev,
      currentIndex: Math.min(prev.currentIndex + 1, prev.bubbles.length - 1),
    }));
  };

  const prevBubble = () => {
    setSession(prev => ({
      ...prev,
      currentIndex: Math.max(prev.currentIndex - 1, 0),
    }));
  };

  const goToBubble = (index: number) => {
    if (index >= 0 && index < session.bubbles.length) {
      setSession(prev => ({
        ...prev,
        currentIndex: index,
      }));
    }
  };

  const updateAssistantMode = (assistantMode: AssistantModePreference) => {
    setSettings(prev => ({
      ...prev,
      assistantMode,
    }));
  };

  const resetSession = () => {
    setSession(DEFAULT_SESSION);
  };

  return {
    settings,
    setSettings,
    updateAssistantMode,
    session,
    setSession,
    parseText,
    buildSessionFromText,
    nextBubble,
    prevBubble,
    goToBubble,
    resetSession,
    isLoaded
  };
}
