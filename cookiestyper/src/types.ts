export type TagType = {
  id: string;
  symbol: string;
  name: string;
  color: string;
  fontUri?: string;
  fontName?: string;
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
  assistantScale: number;
};

export type SessionData = {
  bubbles: BubbleType[];
  currentIndex: number;
  inputText: string;
};

export type OperationLogItem = {
  id: string;
  tool: string;
  description: string;
  timeLabel: string;
  createdAt?: number;
};
