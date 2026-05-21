import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const COOKIES_PINK = '#F2A6B8';
const TEXT_SECONDARY = 'rgba(255,255,255,0.7)';

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

  const [isLoading, setIsLoading] = useState(true);
  const [isPreparingFile, setIsPreparingFile] = useState(false);

  // أنميشن للواجهة
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
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

  const getMimeTypeFromExtension = (extension: string) => {
    const cleanExtension = extension.toLowerCase();

    if (cleanExtension === 'jpg' || cleanExtension === 'jpeg') return 'image/jpeg';
    if (cleanExtension === 'png') return 'image/png';
    if (cleanExtension === 'webp') return 'image/webp';
    if (cleanExtension === 'gif') return 'image/gif';

    return 'image/png';
  };

  const getUtiFromExtension = (extension: string) => {
    const cleanExtension = extension.toLowerCase();

    if (cleanExtension === 'jpg' || cleanExtension === 'jpeg') return 'public.jpeg';
    if (cleanExtension === 'png') return 'public.png';
    if (cleanExtension === 'webp') return 'org.webmproject.webp';
    if (cleanExtension === 'gif') return 'com.compuserve.gif';

    return 'public.png';
  };

  const openFilePickerForSaving = async ({
    localUri,
    mimeType,
    extension,
  }: {
    localUri: string;
    mimeType: string;
    extension: string;
  }) => {
    const fileInfo = await FileSystem.getInfoAsync(localUri, {
      size: true,
    });

    if (!fileInfo.exists) {
      throw new Error('ملف الصورة غير موجود داخل التطبيق.');
    }

    if ('size' in fileInfo && typeof fileInfo.size === 'number' && fileInfo.size <= 0) {
      throw new Error('ملف الصورة موجود لكنه فارغ.');
    }

    const sharingAvailable = await Sharing.isAvailableAsync();

    if (!sharingAvailable) {
      throw new Error('المشاركة غير متاحة على هذا الجهاز.');
    }

    await Sharing.shareAsync(localUri, {
      mimeType,
      UTI: getUtiFromExtension(extension),
      dialogTitle: 'حفظ الصورة الناتجة',
    });
  };

  const saveBase64ImageToFiles = async ({
    base64,
    mimeType,
    fileName,
  }: {
    base64: string;
    mimeType?: string | null;
    fileName?: string | null;
  }) => {
    setIsPreparingFile(true);

    try {
      const extension = guessExtensionFromMime(mimeType);
      const finalMimeType = mimeType || getMimeTypeFromExtension(extension);

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

      await openFilePickerForSaving({
        localUri,
        mimeType: finalMimeType,
        extension,
      });

      onAddOperation({
        tool: 'دمج الصور',
        description: `تم تجهيز الصورة الناتجة من الموقع باسم ${finalName} وفتح نافذة الحفظ.`,
      });
    } catch (error) {
      console.error('Save base64 image failed:', error);
      Alert.alert('فشل تجهيز الملف', getErrorMessage(error));
    } finally {
      setIsPreparingFile(false);
    }
  };

  const injectedAppBridge = useMemo(() => {
    return `
      (function () {
        if (window.__COOKIE_TYPER_APP_BRIDGE_INSTALLED__) {
          true;
          return;
        }

        window.__COOKIE_TYPER_APP_BRIDGE_INSTALLED__ = true;

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

        function getCleanFileName(name) {
          try {
            var value = String(name || '').trim();
            if (!value) return 'merged_' + Date.now() + '.png';
            value = value.replace(/\\s+/g, '_');
            if (!value.toLowerCase().endsWith('.png')) value = value + '.png';
            return value;
          } catch (error) {
            return 'merged_' + Date.now() + '.png';
          }
        }

        function dataUrlToPayload(dataUrl, fileName) {
          try {
            var match = String(dataUrl || '').match(/^data:([^;]+);base64,(.*)$/);

            if (!match) {
              postToApp({
                type: 'DOWNLOAD_ERROR',
                message: 'لم يتم العثور على صورة جاهزة للحفظ. قم بالدمج أولاً.'
              });
              return false;
            }

            postToApp({
              type: 'DOWNLOAD_BASE64',
              mimeType: match[1],
              base64: match[2],
              fileName: getCleanFileName(fileName)
            });

            return true;
          } catch (error) {
            postToApp({
              type: 'DOWNLOAD_ERROR',
              message: error && error.message ? error.message : String(error)
            });
            return false;
          }
        }

        function getResultImageDataUrl() {
          var image = document.getElementById('resultImage');

          if (image && image.src && String(image.src).startsWith('data:image')) {
            return image.src;
          }

          return null;
        }

        function getOutputFileName() {
          var outputNameInput = document.getElementById('outputNameInput');

          if (outputNameInput && outputNameInput.value && outputNameInput.value.trim()) {
            return outputNameInput.value.trim().replace(/\\s+/g, '_') + '.png';
          }

          return 'merged_' + Date.now() + '.png';
        }

        function triggerNativeSaveFromCurrentResult() {
          var dataUrl = getResultImageDataUrl();

          if (!dataUrl) {
            postToApp({
              type: 'DOWNLOAD_ERROR',
              message: 'لا توجد صورة جاهزة للحفظ. اضغط ابدأ الدمج أولاً.'
            });
            return false;
          }

          return dataUrlToPayload(dataUrl, getOutputFileName());
        }

        function createNativePreviewOverlay() {
          if (document.getElementById('cookieTyperNativePreviewOverlay')) {
            return;
          }

          var overlay = document.createElement('div');
          overlay.id = 'cookieTyperNativePreviewOverlay';
          overlay.style.position = 'fixed';
          overlay.style.left = '0';
          overlay.style.top = '0';
          overlay.style.right = '0';
          overlay.style.bottom = '0';
          overlay.style.zIndex = '999999';
          overlay.style.background = '#050505';
          overlay.style.display = 'none';
          overlay.style.flexDirection = 'column';

          overlay.innerHTML = ''
            + '<div style="height:64px;display:flex;flex-direction:row-reverse;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(15,15,15,0.92);border-bottom:1px solid rgba(255,255,255,0.08);">'
            + '  <button id="cookieTyperClosePreview" style="width:40px;height:40px;border-radius:20px;border:0;background:rgba(255,255,255,0.1);color:white;font-size:24px;font-weight:900;">‹</button>'
            + '  <div style="color:white;font-weight:900;font-size:18px;">معاينة حقيقية للمخرج</div>'
            + '  <button id="cookieTyperPreviewScale" style="width:40px;height:40px;border-radius:20px;border:0;background:rgba(255,255,255,0.1);color:white;font-size:18px;font-weight:900;">100</button>'
            + '</div>'
            + '<div id="cookieTyperPreviewScroll" style="flex:1;overflow:auto;-webkit-overflow-scrolling:touch;">'
            + '  <img id="cookieTyperPreviewImage" src="" style="display:block;width:100vw;max-width:none;height:auto;margin:0 auto;" />'
            + '</div>';

          document.body.appendChild(overlay);

          var currentScale = 100;
          var scales = [50, 70, 80, 100];
          var scaleIndex = 3;

          function applyScale() {
            var image = document.getElementById('cookieTyperPreviewImage');
            var scaleButton = document.getElementById('cookieTyperPreviewScale');
            var viewportWidth = window.visualViewport && window.visualViewport.width ? window.visualViewport.width : window.innerWidth;

            if (image) {
              image.style.width = ((viewportWidth * currentScale) / 100) + 'px';
            }

            if (scaleButton) {
              scaleButton.textContent = String(currentScale);
            }
          }

          document.getElementById('cookieTyperClosePreview').addEventListener('click', function () {
            overlay.style.display = 'none';
          });

          document.getElementById('cookieTyperPreviewScale').addEventListener('click', function () {
            scaleIndex = (scaleIndex + 1) % scales.length;
            currentScale = scales[scaleIndex];
            applyScale();
          });

          window.addEventListener('resize', applyScale);

          window.CookieTyperOpenNativePreview = function () {
            var dataUrl = getResultImageDataUrl();

            if (!dataUrl) {
              postToApp({
                type: 'DOWNLOAD_ERROR',
                message: 'لا توجد صورة جاهزة للمعاينة. اضغط ابدأ الدمج أولاً.'
              });
              return false;
            }

            var image = document.getElementById('cookieTyperPreviewImage');
            image.src = dataUrl;
            overlay.style.display = 'flex';
            currentScale = 100;
            scaleIndex = 3;
            setTimeout(applyScale, 50);
            return true;
          };
        }

        createNativePreviewOverlay();

        document.addEventListener('click', function (event) {
          var saveButton = event.target && event.target.closest ? event.target.closest('#saveBtn') : null;

          if (saveButton) {
            event.preventDefault();
            event.stopPropagation();
            if (event.stopImmediatePropagation) event.stopImmediatePropagation();
            triggerNativeSaveFromCurrentResult();
            return false;
          }

          var previewButton = event.target && event.target.closest ? event.target.closest('#previewToggleBtn') : null;

          if (previewButton) {
            event.preventDefault();
            event.stopPropagation();
            if (event.stopImmediatePropagation) event.stopImmediatePropagation();

            if (window.CookieTyperOpenNativePreview) {
              window.CookieTyperOpenNativePreview();
            }

            return false;
          }

          var link = event.target && event.target.closest ? event.target.closest('a') : null;

          if (link && link.href && String(link.href).startsWith('data:image')) {
            event.preventDefault();
            event.stopPropagation();
            if (event.stopImmediatePropagation) event.stopImmediatePropagation();
            dataUrlToPayload(link.href, link.getAttribute('download') || getOutputFileName());
            return false;
          }
        }, true);

        var originalCreateElement = document.createElement.bind(document);

        document.createElement = function (tagName) {
          var element = originalCreateElement(tagName);

          try {
            if (String(tagName).toLowerCase() === 'a') {
              var originalClick = element.click ? element.click.bind(element) : null;

              element.click = function () {
                try {
                  if (element.href && String(element.href).startsWith('data:image')) {
                    dataUrlToPayload(element.href, element.getAttribute('download') || getOutputFileName());
                    return;
                  }
                } catch (error) {}

                if (originalClick) {
                  return originalClick();
                }
              };
            }
          } catch (error) {}

          return element;
        };

        window.open = function () {
          if (window.CookieTyperOpenNativePreview) {
            window.CookieTyperOpenNativePreview();
          }

          return {
            closed: false,
            addEventListener: function (eventName, callback) {
              if (eventName === 'load' && typeof callback === 'function') {
                setTimeout(callback, 0);
              }
            },
            postMessage: function (message) {
              try {
                if (message && message.type === 'mergedImage' && message.dataURL) {
                  var overlay = document.getElementById('cookieTyperNativePreviewOverlay');
                  var image = document.getElementById('cookieTyperPreviewImage');

                  if (overlay && image) {
                    image.src = message.dataURL;
                    overlay.style.display = 'flex';
                  }
                }
              } catch (error) {}
            },
            close: function () {}
          };
        };

        window.CookieTyperSaveCurrentResultToFiles = triggerNativeSaveFromCurrentResult;

        true;
      })();
    `;
  }, []);

  const onMessage = async (event: WebViewMessageEvent) => {
    try {
      const raw = event.nativeEvent.data;
      const data = JSON.parse(raw);

      if (data?.type === 'DOWNLOAD_BASE64') {
        await saveBase64ImageToFiles({
          base64: data.base64,
          mimeType: data.mimeType,
          fileName: data.fileName,
        });
        return;
      }

      if (data?.type === 'DOWNLOAD_ERROR') {
        Alert.alert('تنبيه', data.message || 'حدث خطأ أثناء محاولة تجهيز الصورة.');
        return;
      }
    } catch (error) {
      console.error('WebView message parse failed:', error);
    }
  };

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
            { paddingTop: getStatusBarHeight() + 4 },
          ]}
        >
          <TouchableOpacity onPress={onOpenMenu} style={styles.menuBtn}>
            <Text style={styles.menuText}>☰</Text>
          </TouchableOpacity>
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
            allowsBackForwardNavigationGestures={false}
            setSupportMultipleWindows={false}
            mixedContentMode="always"
            allowsInlineMediaPlayback
            allowFileAccess
            allowUniversalAccessFromFileURLs
            injectedJavaScript={injectedAppBridge}
            injectedJavaScriptBeforeContentLoaded={injectedAppBridge}
            onMessage={onMessage}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => {
              setIsLoading(false);
              webViewRef.current?.injectJavaScript(injectedAppBridge);
            }}
            onError={(event) => {
              console.error('WebView error:', event.nativeEvent);
              setIsLoading(false);
            }}
            onHttpError={(event) => {
              console.error('WebView HTTP error:', event.nativeEvent);
            }}
          />

          {(isLoading || isPreparingFile) && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={COOKIES_PINK} />
                <Text style={styles.loadingText}>
                  {isPreparingFile ? 'جاري تجهيز ملف الصورة...' : 'جاري فتح الأداة...'}
                </Text>
                <Text style={styles.loadingSubText}>
                  {isPreparingFile ? 'سيتم فتح نافذة الحفظ بعد لحظات' : 'يرجى الانتظار'}
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
    borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingBottom: 6,
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 10,
  },
  menuBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  menuText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
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