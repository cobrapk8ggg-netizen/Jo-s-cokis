export type TagType = {
  id: string;
  symbol: string;
  name: string;
  color: string;
};

export type BubbleType = {
  text: string;
  originalText: string;
  tagId: string | null;
};

export type AssistantModePreference = 'floating' | 'inapp';

export type Settings = {
  fontSize: number;
  tags: TagType[];
  smartCleaner: boolean;
  assistantMode?: AssistantModePreference | null;
};

export type SessionData = {
  bubbles: BubbleType[];
  currentIndex: number;
  inputText: string;
};
