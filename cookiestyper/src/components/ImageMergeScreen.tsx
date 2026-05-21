import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Home,
  RefreshCw,
} from 'lucide-react-native';

const COOKIES_PINK = '#F2A6B8';
const COOKIES_PINK_DARK = '#C96F86';
const TEXT_SECONDARY = 'rgba(255,255,255,0.7)';
const TEXT_HINT = 'rgba(255,255,255,0.38)';

// رابط موقع الدمج
const WEBSITE_URL = 'https://imge-indol.vercel.app';

export function ImageMergeScreen({
  onOpenMenu,
  onAddOperation,
}: {
  onOpenMenu: () => void;
  onAddOperation: (payload: {
    tool: string;
    description: string;
    details?: string;
  }) => void;
}) {
  const webViewRef = useRef<WebView>(null);

  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(WEBSITE_URL);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // أنميشن للواجهة
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const getStatusBarHeight = () => {
    if (Platform.OS === 'android') {
      return StatusBar.currentHeight || 0;
    }
    return 44;
  };

  const getErrorMessage = (error: any) => {
    return (
      error?.message ||
      error?.toString?.() ||
      'خطأ غير معروف'
    );
  };

  const sanitizeFileName = (name: string) => {
    return name
      .replace(/[^\w\u0600-\u06FF.-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const guessExtensionFromMime = (mimeType?: string | null) => {
    if (!mimeType) return 'png';

    const cleanMime = mimeType.toLowerCase();

    if (cleanMime.includes('jpeg') || cleanMime.includes('jpg')) return 'jpg';
    if (cleanMime.includes('png')) return 'png';
    if (cleanMime.includes('webp')) return 'webp';
    if (cleanMime.includes('gif')) return 'gif';

    return 'png';
  };

  const guessExtensionFromUrl = (url: string) => {
    const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();

    if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'jpg';
    if (cleanUrl.endsWith('.png')) return 'png';
    if (cleanUrl.endsWith('.webp')) return 'webp';
    if (cleanUrl.endsWith('.gif')) return 'gif';

    return 'png';
  };

  const requestSavePermission = async () => {
    const permission = await MediaLibrary.requestPermissionsAsync(true);

    if (!permission.granted) {
      throw new Error('مطلوب إذن الوصول إلى الصور لحفظ النتيجة.');
    }
  };

  const saveLocalImageToLibrary = async (localUri: string) => {
    const fileInfo = await FileSystem.getInfoAsync(localUri, {
      size: true,
    });

    if (!fileInfo.exists) {
      throw new Error('ملف الصورة غير موجود داخل التطبيق.');
    }

    if ('size' in fileInfo && typeof fileInfo.size === 'number' && fileInfo.size <= 0) {
      throw new Error('ملف الصورة موجود لكنه فارغ.');
    }

    await requestSavePermission();

    try {
      await MediaLibrary.saveToLibraryAsync(localUri);
    } catch (saveError) {
      console.error('saveToLibraryAsync failed, trying createAssetAsync:', saveError);

      const asset = await MediaLibrary.createAssetAsync(localUri);
      const album = await MediaLibrary.getAlbumAsync('CookieTyper');

      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      } else {
        await MediaLibrary.createAlbumAsync('CookieTyper', asset, false);
      }
    }
  };

  const saveBase64Image = async ({
    base64,
    mimeType,
    fileName,
  }: {
    base64: string;
    mimeType?: string | null;
    fileName?: string | null;
  }) => {
    setIsSaving(true);

    try {
      const extension = guessExtensionFromMime(mimeType);
      const safeName = sanitizeFileName(
        fileName || `merged_${Date.now()}.${extension}`
      );

      const finalName = safeName.toLowerCase().endsWith(`.${extension}`)
        ? safeName
        : `${safeName}.${extension}`;

      const localUri = `${FileSystem.cacheDirectory}${finalName}`;

      await FileSystem.writeAsStringAsync(localUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await saveLocalImageToLibrary(localUri);

      onAddOperation({
        tool: 'دمج الصور',
        description: `تم حفظ الصورة الناتجة من الموقع باسم ${finalName}.`,
      });

      Alert.alert('تم الحفظ', 'تم حفظ الصورة في الاستوديو بنجاح.');
    } catch (error) {
      console.error('Save base64 image failed:', error);
      Alert.alert('فشل الحفظ', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const saveImageFromUrl = async ({
    url,
    fileName,
  }: {
    url: string;
    fileName?: string | null;
  }) => {
    setIsSaving(true);

    try {
      const extension = guessExtensionFromUrl(url);
      const safeName = sanitizeFileName(
        fileName || `merged_${Date.now()}.${extension}`
      );

      const finalName = safeName.toLowerCase().endsWith(`.${extension}`)
        ? safeName
        : `${safeName}.${extension}`;

      const localUri = `${FileSystem.cacheDirectory}${finalName}`;

      const downloaded = await FileSystem.downloadAsync(
        url,
        localUri,
        {
          headers: {
            Accept: 'image/png,image/jpeg,image/webp,image/*,*/*',
            'Cache-Control': 'no-cache',
          },
        }
      );

      if (downloaded.status !== 200) {
        throw new Error(`فشل تحميل الصورة. كود الخطأ: ${downloaded.status}`);
      }

      await saveLocalImageToLibrary(downloaded.uri);

      onAddOperation({
        tool: 'دمج الصور',
        description: `تم حفظ الصورة الناتجة من الموقع باسم ${finalName}.`,
      });

      Alert.alert('تم الحفظ', 'تم حفظ الصورة في الاستوديو بنجاح.');
    } catch (error) {
      console.error('Save image from URL failed:', error);
      Alert.alert('فشل الحفظ', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const injectedDownloadBridge = useMemo(() => {
    return `
      (function () {
        if (window.__COOKIE_TYPER_DOWNLOAD_BRIDGE_INSTALLED__) {
          true;
          return;
        }

        window.__COOKIE_TYPER_DOWNLOAD_BRIDGE_INSTALLED__ = true;

        function postToApp(payload) {
          try {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          } catch (error) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'DOWNLOAD_ERROR',
              message: error && error.message ? error.message : String(error)
            }));
          }
        }

        function getFileNameFromUrl(url) {
          try {
            var clean = String(url || '').split('?')[0].split('#')[0];
            var parts = clean.split('/');
            var last = parts[parts.length - 1];
            return last || ('merged_' + Date.now() + '.png');
          } catch (error) {
            return 'merged_' + Date.now() + '.png';
          }
        }

        function isProbablyImageUrl(url) {
          if (!url) return false;
          var clean = String(url).split('?')[0].split('#')[0].toLowerCase();
          return (
            clean.endsWith('.png') ||
            clean.endsWith('.jpg') ||
            clean.endsWith('.jpeg') ||
            clean.endsWith('.webp') ||
            clean.endsWith('.gif')
          );
        }

        function dataUrlToPayload(dataUrl, fileName) {
          try {
            var match = String(dataUrl).match(/^data:([^;]+);base64,(.*)$/);
            if (!match) {
              postToApp({
                type: 'DOWNLOAD_ERROR',
                message: 'صيغة data URL غير مدعومة'
              });
              return;
            }

            postToApp({
              type: 'DOWNLOAD_BASE64',
              mimeType: match[1],
              base64: match[2],
              fileName: fileName || ('merged_' + Date.now() + '.png')
            });
          } catch (error) {
            postToApp({
              type: 'DOWNLOAD_ERROR',
              message: error && error.message ? error.message : String(error)
            });
          }
        }

        async function blobUrlToPayload(blobUrl, fileName) {
          try {
            var response = await fetch(blobUrl);
            var blob = await response.blob();

            var reader = new FileReader();

            reader.onloadend = function () {
              try {
                dataUrlToPayload(
                  reader.result,
                  fileName || ('merged_' + Date.now() + '.png')
                );
              } catch (error) {
                postToApp({
                  type: 'DOWNLOAD_ERROR',
                  message: error && error.message ? error.message : String(error)
                });
              }
            };

            reader.onerror = function () {
              postToApp({
                type: 'DOWNLOAD_ERROR',
                message: 'فشل قراءة ملف الصورة من داخل WebView'
              });
            };

            reader.readAsDataURL(blob);
          } catch (error) {
            postToApp({
              type: 'DOWNLOAD_ERROR',
              message: error && error.message ? error.message : String(error)
            });
          }
        }

        document.addEventListener('click', function (event) {
          var target = event.target;

          while (target && target.tagName && target.tagName.toLowerCase() !== 'a') {
            target = target.parentElement;
          }

          if (!target || !target.href) {
            return;
          }

          var href = target.href;
          var downloadName = target.getAttribute('download') || getFileNameFromUrl(href);
          var hasDownloadAttribute = target.hasAttribute('download');

          if (String(href).startsWith('blob:')) {
            event.preventDefault();
            event.stopPropagation();
            blobUrlToPayload(href, downloadName);
            return false;
          }

          if (String(href).startsWith('data:image')) {
            event.preventDefault();
            event.stopPropagation();
            dataUrlToPayload(href, downloadName);
            return false;
          }

          if (hasDownloadAttribute || isProbablyImageUrl(href)) {
            event.preventDefault();
            event.stopPropagation();

            postToApp({
              type: 'DOWNLOAD_URL',
              url: href,
              fileName: downloadName
            });

            return false;
          }
        }, true);

        var originalCreateObjectURL = URL.createObjectURL;

        URL.createObjectURL = function (object) {
          var objectUrl = originalCreateObjectURL.call(URL, object);

          try {
            if (object && object.type && String(object.type).startsWith('image/')) {
              window.__COOKIE_TYPER_LAST_IMAGE_BLOB_URL__ = objectUrl;
            }
          } catch (error) {}

          return objectUrl;
        };

        window.CookieTyperSaveLastImage = function () {
          if (window.__COOKIE_TYPER_LAST_IMAGE_BLOB_URL__) {
            blobUrlToPayload(
              window.__COOKIE_TYPER_LAST_IMAGE_BLOB_URL__,
              'merged_' + Date.now() + '.png'
            );
            return true;
          }

          postToApp({
            type: 'DOWNLOAD_ERROR',
            message: 'لا توجد صورة جاهزة محفوظة داخل الموقع بعد.'
          });

          return false;
        };

        true;
      })();
    `;
  }, []);

  const onMessage = async (event: WebViewMessageEvent) => {
    try {
      const raw = event.nativeEvent.data;
      const data = JSON.parse(raw);

      if (data?.type === 'DOWNLOAD_BASE64') {
        await saveBase64Image({
          base64: data.base64,
          mimeType: data.mimeType,
          fileName: data.fileName,
        });
        return;
      }

      if (data?.type === 'DOWNLOAD_URL') {
        await saveImageFromUrl({
          url: data.url,
          fileName: data.fileName,
        });
        return;
      }

      if (data?.type === 'DOWNLOAD_ERROR') {
        Alert.alert('فشل الحفظ', data.message || 'حدث خطأ أثناء محاولة حفظ الصورة.');
        return;
      }
    } catch (error) {
      console.error('WebView message parse failed:', error);
    }
  };

  const onNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setCurrentUrl(navState.url);
  };

  const shouldStartLoad = (request: any) => {
    const url = request?.url || '';

    if (!url) return true;

    if (
      url.startsWith('about:blank') ||
      url.startsWith('https://imge-indol.vercel.app') ||
      url.startsWith('http://imge-indol.vercel.app')
    ) {
      return true;
    }

    if (
      url.startsWith('blob:') ||
      url.startsWith('data:image')
    ) {
      return false;
    }

    const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();

    if (
      cleanUrl.endsWith('.png') ||
      cleanUrl.endsWith('.jpg') ||
      cleanUrl.endsWith('.jpeg') ||
      cleanUrl.endsWith('.webp') ||
      cleanUrl.endsWith('.gif')
    ) {
      saveImageFromUrl({
        url,
        fileName: cleanUrl.split('/').pop() || null,
      });
      return false;
    }

    if (
      url.startsWith('mailto:') ||
      url.startsWith('tel:') ||
      url.startsWith('whatsapp:') ||
      url.startsWith('tg:')
    ) {
      Linking.openURL(url).catch((error) => {
        console.error('Open external URL failed:', error);
      });
      return false;
    }

    return true;
  };

  const goHome = () => {
    webViewRef.current?.injectJavaScript(`
      window.location.href = '${WEBSITE_URL}';
      true;
    `);
  };

  const goBack = () => {
    if (canGoBack) {
      webViewRef.current?.goBack();
    }
  };

  const goForward = () => {
    if (canGoForward) {
      webViewRef.current?.goForward();
    }
  };

  const reload = () => {
    webViewRef.current?.reload();
  };

  const trySaveFromWebsite = () => {
    webViewRef.current?.injectJavaScript(`
      if (window.CookieTyperSaveLastImage) {
        window.CookieTyperSaveLastImage();
      } else {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'DOWNLOAD_ERROR',
          message: 'لم يتم العثور على صورة جاهزة للحفظ داخل الموقع.'
        }));
      }
      true;
    `);
  };

  const pageSubtitle = useMemo(() => {
    if (currentUrl.includes('imge-indol.vercel.app')) {
      return 'أداة دمج الصور';
    }

    return currentUrl;
  }, [currentUrl]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <Animated.View
        style={[
          styles.screen,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.fixedHeader,
            { paddingTop: getStatusBarHeight() + 8 },
          ]}
        >
          <View style={styles.topRow}>
            <TouchableOpacity onPress={onOpenMenu} style={styles.menuBtn}>
              <Text style={styles.menuText}>☰</Text>
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <View>
                <Text style={styles.pageTitle}>دمج الصور</Text>
                <Text numberOfLines={1} style={styles.pageSubtitle}>
                  {pageSubtitle}
                </Text>
              </View>
              <View style={styles.titleBadge} />
            </View>
          </View>

          <View style={styles.browserBar}>
            <TouchableOpacity
              onPress={goBack}
              disabled={!canGoBack}
              style={[styles.browserBtn, { opacity: canGoBack ? 1 : 0.35 }]}
            >
              <ArrowRight color="white" size={18} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={goForward}
              disabled={!canGoForward}
              style={[styles.browserBtn, { opacity: canGoForward ? 1 : 0.35 }]}
            >
              <ArrowLeft color="white" size={18} />
            </TouchableOpacity>

            <TouchableOpacity onPress={goHome} style={styles.browserBtn}>
              <Home color="white" size={18} />
            </TouchableOpacity>

            <TouchableOpacity onPress={reload} style={styles.browserBtn}>
              <RefreshCw color="white" size={18} />
            </TouchableOpacity>

            <TouchableOpacity onPress={trySaveFromWebsite} style={styles.downloadBtn}>
              <Download color="white" size={18} />
              <Text style={styles.downloadBtnText}>حفظ</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.webContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: WEBSITE_URL }}
            style={styles.webView}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            startInLoadingState
            allowsBackForwardNavigationGestures
            setSupportMultipleWindows={false}
            mixedContentMode="always"
            allowsInlineMediaPlayback
            allowFileAccess
            allowUniversalAccessFromFileURLs
            injectedJavaScript={injectedDownloadBridge}
            injectedJavaScriptBeforeContentLoaded={injectedDownloadBridge}
            onMessage={onMessage}
            onNavigationStateChange={onNavigationStateChange}
            onShouldStartLoadWithRequest={shouldStartLoad}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => {
              setIsLoading(false);
              webViewRef.current?.injectJavaScript(injectedDownloadBridge);
            }}
            onError={(event) => {
              console.error('WebView error:', event.nativeEvent);
              setIsLoading(false);
            }}
            onHttpError={(event) => {
              console.error('WebView HTTP error:', event.nativeEvent);
            }}
            onFileDownload={(event) => {
              const downloadUrl = event.nativeEvent.downloadUrl;

              if (downloadUrl) {
                saveImageFromUrl({
                  url: downloadUrl,
                  fileName: null,
                });
              }
            }}
          />

          {(isLoading || isSaving) && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={COOKIES_PINK} />
                <Text style={styles.loadingText}>
                  {isSaving ? 'جاري حفظ الصورة...' : 'جاري تحميل أداة الدمج...'}
                </Text>
                <Text style={styles.loadingSubText}>
                  {isSaving ? 'يرجى الانتظار حتى يكتمل الحفظ' : 'يتم فتح الموقع داخل التطبيق'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  screen: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  fixedHeader: {
    backgroundColor: 'rgba(10,10,10,0.98)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  menuText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  headerTitleContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginLeft: 12,
  },
  pageTitle: {
    color: 'white',
    fontWeight: '900',
    fontSize: 24,
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  pageSubtitle: {
    color: TEXT_HINT,
    fontWeight: '700',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
    maxWidth: 240,
  },
  titleBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COOKIES_PINK,
    shadowColor: COOKIES_PINK,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  browserBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  browserBtn: {
    width: 42,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: COOKIES_PINK_DARK,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginRight: 'auto',
  },
  downloadBtnText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 14,
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#050505',
  },
  webView: {
    flex: 1,
    backgroundColor: '#050505',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  loadingBox: {
    backgroundColor: 'rgba(22, 22, 22, 0.9)',
    padding: 26,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    minWidth: 240,
    shadowColor: COOKIES_PINK,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  loadingText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 17,
    marginTop: 14,
    textAlign: 'center',
  },
  loadingSubText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
});