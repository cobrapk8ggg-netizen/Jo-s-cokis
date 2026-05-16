const { withAndroidManifest, withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.zeus.cookietyper.floating';
const JAVA_DIR = ['app', 'src', 'main', 'java', 'com', 'zeus', 'cookietyper', 'floating'];

const FLOATING_ASSISTANT_MODULE = `package ${PACKAGE_NAME};

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class FloatingAssistantModule extends ReactContextBaseJavaModule {
  public static final String NAME = "FloatingAssistant";
  private static ReactApplicationContext reactContext;

  public FloatingAssistantModule(ReactApplicationContext context) {
    super(context);
    reactContext = context;
  }

  @NonNull
  @Override
  public String getName() {
    return NAME;
  }

  public static void emitEvent(String eventName, @Nullable WritableMap payload) {
    if (reactContext != null && reactContext.hasActiveCatalystInstance()) {
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
        .emit(eventName, payload == null ? Arguments.createMap() : payload);
    }
  }

  @ReactMethod
  public void hasOverlayPermission(Promise promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      promise.resolve(true);
      return;
    }

    promise.resolve(Settings.canDrawOverlays(getReactApplicationContext()));
  }

  @ReactMethod
  public void openOverlaySettings(Promise promise) {
    try {
      Context context = getReactApplicationContext();
      Intent intent = new Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:" + context.getPackageName())
      );
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      context.startActivity(intent);
      promise.resolve(true);
    } catch (Exception exception) {
      promise.reject("OPEN_OVERLAY_SETTINGS_FAILED", exception);
    }
  }

  @ReactMethod
  public void start(Promise promise) {
    try {
      Context context = getReactApplicationContext();
      Intent intent = new Intent(context, FloatingAssistantService.class);
      intent.setAction(FloatingAssistantService.ACTION_START);

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent);
      } else {
        context.startService(intent);
      }

      promise.resolve(true);
    } catch (Exception exception) {
      promise.reject("FLOATING_ASSISTANT_START_FAILED", exception);
    }
  }

  @ReactMethod
  public void hide(Promise promise) {
    try {
      Context context = getReactApplicationContext();
      Intent intent = new Intent(context, FloatingAssistantService.class);
      intent.setAction(FloatingAssistantService.ACTION_HIDE);
      context.startService(intent);
      promise.resolve(true);
    } catch (Exception exception) {
      promise.reject("FLOATING_ASSISTANT_HIDE_FAILED", exception);
    }
  }

  @ReactMethod
  public void stop(Promise promise) {
    try {
      Context context = getReactApplicationContext();
      Intent intent = new Intent(context, FloatingAssistantService.class);
      intent.setAction(FloatingAssistantService.ACTION_STOP);
      context.startService(intent);
      promise.resolve(true);
    } catch (Exception exception) {
      promise.reject("FLOATING_ASSISTANT_STOP_FAILED", exception);
    }
  }

  @ReactMethod
  public void moveBy(double dx, double dy) {
    FloatingAssistantService.moveBy((int) dx, (int) dy);
  }

  @ReactMethod
  public void addListener(String eventName) {
    // Required by NativeEventEmitter. Events are emitted from the service.
  }

  @ReactMethod
  public void removeListeners(double count) {
    // Required by NativeEventEmitter.
  }

  @ReactMethod
  public void bringAppToFront(Promise promise) {
    try {
      Context context = getReactApplicationContext();
      Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
      if (launchIntent != null) {
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        context.startActivity(launchIntent);
      }
      promise.resolve(true);
    } catch (Exception exception) {
      promise.reject("FLOATING_ASSISTANT_OPEN_APP_FAILED", exception);
    }
  }
}
`;

const FLOATING_ASSISTANT_PACKAGE = `package ${PACKAGE_NAME};

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class FloatingAssistantPackage implements ReactPackage {
  @NonNull
  @Override
  public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
    List<NativeModule> modules = new ArrayList<>();
    modules.add(new FloatingAssistantModule(reactContext));
    return modules;
  }

  @NonNull
  @Override
  public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
    return Collections.emptyList();
  }
}
`;

const FLOATING_ASSISTANT_SERVICE = `package ${PACKAGE_NAME};

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactRootView;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

public class FloatingAssistantService extends Service {
  public static final String ACTION_START = "${PACKAGE_NAME}.START";
  public static final String ACTION_HIDE = "${PACKAGE_NAME}.HIDE";
  public static final String ACTION_SHOW = "${PACKAGE_NAME}.SHOW";
  public static final String ACTION_STOP = "${PACKAGE_NAME}.STOP";

  private static final String CHANNEL_ID = "cookie_typer_floating_assistant";
  private static final int NOTIFICATION_ID = 1209;

  private static WindowManager windowManager;
  private static WindowManager.LayoutParams layoutParams;
  private static ReactRootView reactRootView;
  private static FloatingAssistantService activeService;

  @Override
  public void onCreate() {
    super.onCreate();
    activeService = this;
    windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
    createNotificationChannel();
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    String action = intent != null ? intent.getAction() : ACTION_START;
    startForeground(NOTIFICATION_ID, buildNotification(false));

    if (ACTION_STOP.equals(action)) {
      stopAssistant();
      return START_NOT_STICKY;
    }

    if (ACTION_HIDE.equals(action)) {
      hideAssistant();
      return START_STICKY;
    }

    if (ACTION_SHOW.equals(action)) {
      showAssistant();
      return START_STICKY;
    }

    showAssistant();
    return START_STICKY;
  }

  @Nullable
  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  @Override
  public void onDestroy() {
    removeOverlayView();
    activeService = null;
    super.onDestroy();
  }

  public static void moveBy(int dx, int dy) {
    if (windowManager == null || layoutParams == null || reactRootView == null) return;

    layoutParams.x += dx;
    layoutParams.y += dy;
    windowManager.updateViewLayout(reactRootView, layoutParams);
  }

  private void showAssistant() {
    if (!canDrawOverlays()) {
      WritableMap payload = Arguments.createMap();
      payload.putString("reason", "missing_overlay_permission");
      FloatingAssistantModule.emitEvent("FloatingAssistantClosed", payload);
      stopSelf();
      return;
    }

    if (reactRootView == null) {
      attachOverlayView();
    } else {
      reactRootView.setVisibility(View.VISIBLE);
    }

    NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    manager.notify(NOTIFICATION_ID, buildNotification(false));
  }

  private void hideAssistant() {
    if (reactRootView != null) {
      reactRootView.setVisibility(View.GONE);
    }

    NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    manager.notify(NOTIFICATION_ID, buildNotification(true));

    WritableMap payload = Arguments.createMap();
    payload.putString("state", "hidden");
    FloatingAssistantModule.emitEvent("FloatingAssistantHidden", payload);
  }

  private void stopAssistant() {
    removeOverlayView();

    WritableMap payload = Arguments.createMap();
    payload.putString("state", "stopped");
    FloatingAssistantModule.emitEvent("FloatingAssistantClosed", payload);

    stopForeground(true);
    stopSelf();
  }

  private void attachOverlayView() {
    ReactApplication application = (ReactApplication) getApplication();
    ReactInstanceManager reactInstanceManager = application.getReactNativeHost().getReactInstanceManager();

    reactRootView = new ReactRootView(this);
    reactRootView.startReactApplication(reactInstanceManager, "FloatingAssistant", null);

    int overlayType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
      ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      : WindowManager.LayoutParams.TYPE_PHONE;

    layoutParams = new WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      overlayType,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
        | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
      PixelFormat.TRANSLUCENT
    );
    layoutParams.gravity = Gravity.TOP | Gravity.START;
    layoutParams.x = 24;
    layoutParams.y = 160;

    windowManager.addView(reactRootView, layoutParams);
  }

  private void removeOverlayView() {
    if (reactRootView != null) {
      try {
        reactRootView.unmountReactApplication();
        windowManager.removeView(reactRootView);
      } catch (Exception ignored) {
        // The system may have already removed the view while the service is closing.
      }
      reactRootView = null;
      layoutParams = null;
    }
  }

  private boolean canDrawOverlays() {
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this);
  }

  private Notification buildNotification(boolean hidden) {
    Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
    PendingIntent contentIntent = null;
    if (launchIntent != null) {
      launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
      int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
        ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        : PendingIntent.FLAG_UPDATE_CURRENT;
      contentIntent = PendingIntent.getActivity(this, 0, launchIntent, flags);
    }

    Intent showIntent = new Intent(this, FloatingAssistantService.class);
    showIntent.setAction(ACTION_SHOW);
    int pendingFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
      ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
      : PendingIntent.FLAG_UPDATE_CURRENT;
    PendingIntent showPendingIntent = PendingIntent.getService(this, 1, showIntent, pendingFlags);

    Intent stopIntent = new Intent(this, FloatingAssistantService.class);
    stopIntent.setAction(ACTION_STOP);
    PendingIntent stopPendingIntent = PendingIntent.getService(this, 2, stopIntent, pendingFlags);

    NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(getApplicationInfo().icon)
      .setContentTitle("CookieTyper")
      .setContentText(hidden ? "المساعد العائم مخفي مؤقتًا" : "المساعد العائم يعمل")
      .setOngoing(!hidden)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .addAction(0, "استعادة", showPendingIntent)
      .addAction(0, "إنهاء", stopPendingIntent);

    if (contentIntent != null) {
      builder.setContentIntent(contentIntent);
    }

    return builder.build();
  }

  private void createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

    NotificationChannel channel = new NotificationChannel(
      CHANNEL_ID,
      "CookieTyper Floating Assistant",
      NotificationManager.IMPORTANCE_LOW
    );
    channel.setDescription("Keeps the CookieTyper floating assistant available over other apps.");

    NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    manager.createNotificationChannel(channel);
  }
}
`;

function ensurePermission(androidManifest, permissionName) {
  const manifest = androidManifest.manifest;
  const permissions = manifest['uses-permission'] || [];
  const exists = permissions.some((permission) => permission.$['android:name'] === permissionName);

  if (!exists) {
    permissions.push({ $: { 'android:name': permissionName } });
    manifest['uses-permission'] = permissions;
  }
}

function ensureService(androidManifest) {
  const application = androidManifest.manifest.application?.[0];
  if (!application) return;

  const services = application.service || [];
  const serviceName = `${PACKAGE_NAME}.FloatingAssistantService`;
  const exists = services.some((service) => service.$['android:name'] === serviceName);

  if (!exists) {
    services.push({
      $: {
        'android:name': serviceName,
        'android:exported': 'false',
        'android:foregroundServiceType': 'specialUse',
      },
      property: [
        {
          $: {
            'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
            'android:value': 'Floating assistant overlay for active CookieTyper sessions',
          },
        },
      ],
    });
    application.service = services;
  }
}

function patchMainApplication(contents) {
  const importLine = `import ${PACKAGE_NAME}.FloatingAssistantPackage;`;
  if (!contents.includes(importLine)) {
    const importMatch = contents.match(/(package[^\n]+\n)/);
    if (importMatch) {
      contents = contents.replace(importMatch[1], `${importMatch[1]}\n${importLine}\n`);
    }
  }

  if (contents.includes('new FloatingAssistantPackage()') || contents.includes('FloatingAssistantPackage()')) {
    return contents;
  }

  if (contents.includes('PackageList(this).packages')) {
    contents = contents.replace(
      /(PackageList\(this\)\.packages\.apply \{\n)/,
      `$1              add(FloatingAssistantPackage())\n`
    );
    contents = contents.replace(
      /(val packages = PackageList\(this\)\.packages\s*)/,
      `$1\n          packages.add(FloatingAssistantPackage())`
    );
    contents = contents.replace(
      /(List<ReactPackage> packages = new PackageList\(this\)\.getPackages\(\);\s*)/,
      `$1\n        packages.add(new FloatingAssistantPackage());`
    );
  } else if (contents.includes('new PackageList(this).getPackages()')) {
    contents = contents.replace(
      /(List<ReactPackage> packages = new PackageList\(this\)\.getPackages\(\);\s*)/,
      `$1\n        packages.add(new FloatingAssistantPackage());`
    );
  }

  return contents;
}

module.exports = function withFloatingAssistant(config) {
  config = withAndroidManifest(config, (config) => {
    ensurePermission(config.modResults, 'android.permission.SYSTEM_ALERT_WINDOW');
    ensurePermission(config.modResults, 'android.permission.FOREGROUND_SERVICE');
    ensurePermission(config.modResults, 'android.permission.FOREGROUND_SERVICE_SPECIAL_USE');
    ensureService(config.modResults);
    return config;
  });

  config = withMainApplication(config, (config) => {
    config.modResults.contents = patchMainApplication(config.modResults.contents);
    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const targetDir = path.join(config.modRequest.platformProjectRoot, ...JAVA_DIR);
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, 'FloatingAssistantModule.java'), FLOATING_ASSISTANT_MODULE);
      fs.writeFileSync(path.join(targetDir, 'FloatingAssistantPackage.java'), FLOATING_ASSISTANT_PACKAGE);
      fs.writeFileSync(path.join(targetDir, 'FloatingAssistantService.java'), FLOATING_ASSISTANT_SERVICE);
      return config;
    },
  ]);

  return config;
};
