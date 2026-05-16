import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

export type FloatingAssistantNativeModule = {
  hasOverlayPermission: () => Promise<boolean>;
  openOverlaySettings: () => Promise<boolean>;
  start: (sessionJson: string) => Promise<boolean>;
  hide: () => Promise<boolean>;
  stop: () => Promise<boolean>;
  bringAppToFront: () => Promise<boolean>;
};

const nativeModule = Platform.OS === 'android'
  ? NativeModules.FloatingAssistant as FloatingAssistantNativeModule | undefined
  : undefined;

export const FloatingAssistantNative = {
  isAvailable: Platform.OS === 'android' && Boolean(nativeModule),

  async hasOverlayPermission() {
    if (!nativeModule) return false;
    return nativeModule.hasOverlayPermission();
  },

  async openOverlaySettings() {
    if (!nativeModule) return false;
    return nativeModule.openOverlaySettings();
  },

  async start(sessionJson: string) {
    if (!nativeModule) return false;
    return nativeModule.start(sessionJson);
  },

  async hide() {
    if (!nativeModule) return false;
    return nativeModule.hide();
  },

  async stop() {
    if (!nativeModule) return false;
    return nativeModule.stop();
  },

  async bringAppToFront() {
    if (!nativeModule) return false;
    return nativeModule.bringAppToFront();
  },
};

export const floatingAssistantEvents = nativeModule
  ? new NativeEventEmitter(nativeModule as any)
  : null;
