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
  public void start(String sessionJson, Promise promise) {
    try {
      Context context = getReactApplicationContext();
      Intent intent = new Intent(context, FloatingAssistantService.class);
      intent.setAction(FloatingAssistantService.ACTION_START);
      intent.putExtra(FloatingAssistantService.EXTRA_SESSION_JSON, sessionJson);

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
  public void bringAppToFront(Promise promise) {
    try {
      FloatingAssistantService.openApp(getReactApplicationContext());
      promise.resolve(true);
    } catch (Exception exception) {
      promise.reject("FLOATING_ASSISTANT_OPEN_APP_FAILED", exception);
    }
  }

  @ReactMethod
  public void addListener(String eventName) {
    // Required by NativeEventEmitter. Events are emitted from the service.
  }

  @ReactMethod
  public void removeListeners(double count) {
    // Required by NativeEventEmitter.
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
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

import org.json.JSONArray;
import org.json.JSONObject;

public class FloatingAssistantService extends Service {
  public static final String ACTION_START = "${PACKAGE_NAME}.START";
  public static final String ACTION_HIDE = "${PACKAGE_NAME}.HIDE";
  public static final String ACTION_SHOW = "${PACKAGE_NAME}.SHOW";
  public static final String ACTION_STOP = "${PACKAGE_NAME}.STOP";
  public static final String EXTRA_SESSION_JSON = "sessionJson";

  private static final String CHANNEL_ID = "cookie_typer_floating_assistant";
  private static final int NOTIFICATION_ID = 1209;

  private WindowManager windowManager;
  private WindowManager.LayoutParams layoutParams;
  private LinearLayout rootView;
  private LinearLayout menuView;
  private TextView counterText;
  private TextView typeText;
  private TextView payloadText;
  private TextView dotView;
  private SeekBar progressSeek;

  private JSONArray elements = new JSONArray();
  private int currentIndex = 0;
  private int fontSize = 18;
  private int assistantScale = 100;
  private boolean startedInForeground = false;

  @Override
  public void onCreate() {
    super.onCreate();
    windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
    createNotificationChannel();
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    String action = intent != null ? intent.getAction() : ACTION_START;

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

    String sessionJson = intent != null ? intent.getStringExtra(EXTRA_SESSION_JSON) : null;
    if (sessionJson != null) {
      hydrateSession(sessionJson);
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
    super.onDestroy();
  }

  public static void openApp(Context context) {
    Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
    if (launchIntent != null) {
      launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
      context.startActivity(launchIntent);
    }
  }

  private void hydrateSession(String sessionJson) {
    try {
      JSONObject session = new JSONObject(sessionJson);
      elements = session.optJSONArray("elements");
      if (elements == null) elements = new JSONArray();
      currentIndex = clamp(session.optInt("currentIndex", 0), 0, Math.max(elements.length() - 1, 0));
      fontSize = clamp(session.optInt("fontSize", 18), 10, 40);
      assistantScale = clamp(session.optInt("assistantScale", 100), 80, 120);
    } catch (Exception exception) {
      elements = new JSONArray();
      currentIndex = 0;
      fontSize = 18;
      assistantScale = 100;
      emitError("invalid_session", exception.getMessage());
    }
  }

  private void showAssistant() {
    if (!canDrawOverlays()) {
      emitError("missing_overlay_permission", "SYSTEM_ALERT_WINDOW is not granted");
      stopSelfSafely();
      return;
    }

    if (!ensureForeground()) {
      stopSelfSafely();
      return;
    }

    try {
      if (rootView == null) {
        attachOverlayView();
      } else {
        rootView.setVisibility(View.VISIBLE);
      }
      updateUi();
    } catch (Exception exception) {
      emitError("attach_overlay_failed", exception.getMessage());
      stopSelfSafely();
    }
  }

  private void hideAssistant() {
    if (rootView != null) {
      rootView.setVisibility(View.GONE);
    }

    if (startedInForeground) {
      NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
      manager.notify(NOTIFICATION_ID, buildNotification(true));
    }

    WritableMap payload = Arguments.createMap();
    payload.putString("state", "hidden");
    FloatingAssistantModule.emitEvent("FloatingAssistantHidden", payload);
  }

  private void stopAssistant() {
    removeOverlayView();

    WritableMap payload = Arguments.createMap();
    payload.putString("state", "stopped");
    FloatingAssistantModule.emitEvent("FloatingAssistantClosed", payload);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE);
    } else {
      stopForeground(true);
    }
    stopSelf();
  }

  private boolean ensureForeground() {
    if (startedInForeground) return true;

    try {
      startForeground(NOTIFICATION_ID, buildNotification(false));
      startedInForeground = true;
      return true;
    } catch (Exception exception) {
      emitError("foreground_failed", exception.getMessage());
      return false;
    }
  }

  private void attachOverlayView() {
    rootView = new LinearLayout(this);
    rootView.setOrientation(LinearLayout.VERTICAL);
    rootView.setPadding(sdp(10), sdp(6), sdp(10), sdp(10));
    rootView.setBackground(roundedDrawable(Color.argb(238, 5, 5, 10), dp(22), Color.argb(42, 255, 255, 255), 1));

    LinearLayout grip = new LinearLayout(this);
    grip.setGravity(Gravity.CENTER);
    TextView gripBar = new TextView(this);
    gripBar.setWidth(sdp(42));
    gripBar.setHeight(sdp(3));
    gripBar.setBackground(roundedDrawable(Color.argb(45, 255, 255, 255), sdp(99), Color.TRANSPARENT, 0));
    grip.addView(gripBar);
    rootView.addView(grip, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, sdp(14)));
    installDragHandler(grip);

    LinearLayout header = new LinearLayout(this);
    header.setGravity(Gravity.CENTER_VERTICAL);
    header.setOrientation(LinearLayout.HORIZONTAL);

    TextView menuButton = smallButton("⋮");
    menuButton.setOnClickListener(view -> toggleMenu());
    header.addView(menuButton, new LinearLayout.LayoutParams(sdp(28), sdp(28)));

    LinearLayout titleBlock = new LinearLayout(this);
    titleBlock.setOrientation(LinearLayout.VERTICAL);
    titleBlock.setGravity(Gravity.CENTER);
    TextView title = new TextView(this);
    title.setText("CookieTyper");
    title.setTextColor(Color.WHITE);
    title.setTypeface(Typeface.DEFAULT_BOLD);
    title.setTextSize(scaledText(13));
    title.setGravity(Gravity.CENTER);
    counterText = new TextView(this);
    counterText.setTextColor(Color.rgb(242, 166, 184));
    counterText.setTypeface(Typeface.DEFAULT_BOLD);
    counterText.setTextSize(scaledText(11));
    counterText.setGravity(Gravity.CENTER);
    titleBlock.addView(title);
    titleBlock.addView(counterText);
    header.addView(titleBlock, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));

    dotView = new TextView(this);
    header.addView(dotView, new LinearLayout.LayoutParams(sdp(12), sdp(12)));
    rootView.addView(header);

    typeText = new TextView(this);
    typeText.setTextColor(Color.argb(120, 255, 255, 255));
    typeText.setTypeface(Typeface.DEFAULT_BOLD);
    typeText.setTextSize(scaledText(9));
    typeText.setGravity(Gravity.RIGHT);
    typeText.setPadding(0, sdp(4), sdp(2), sdp(2));
    rootView.addView(typeText);

    payloadText = new TextView(this);
    payloadText.setTextColor(Color.WHITE);
    payloadText.setTypeface(Typeface.DEFAULT_BOLD);
    payloadText.setGravity(Gravity.CENTER);
    payloadText.setMinHeight(sdp(58));
    payloadText.setMaxLines(3);
    payloadText.setPadding(sdp(10), sdp(8), sdp(10), sdp(8));
    payloadText.setOnClickListener(view -> copyCurrentText());

    LinearLayout strip = new LinearLayout(this);
    strip.setOrientation(LinearLayout.HORIZONTAL);
    strip.setGravity(Gravity.CENTER_VERTICAL);
    strip.setPadding(0, sdp(6), 0, sdp(4));
    TextView prev = navButton("‹");
    TextView next = navButton("›");
    prev.setOnClickListener(view -> goToIndex(currentIndex - 1));
    next.setOnClickListener(view -> goToIndex(currentIndex + 1));
    strip.addView(prev, new LinearLayout.LayoutParams(sdp(34), sdp(54)));
    LinearLayout.LayoutParams payloadParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
    payloadParams.setMargins(sdp(7), 0, sdp(7), 0);
    strip.addView(payloadText, payloadParams);
    strip.addView(next, new LinearLayout.LayoutParams(sdp(34), sdp(54)));
    rootView.addView(strip);

    progressSeek = new SeekBar(this);
    progressSeek.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
      @Override
      public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
        if (fromUser) goToIndex(progress);
      }

      @Override
      public void onStartTrackingTouch(SeekBar seekBar) {}

      @Override
      public void onStopTrackingTouch(SeekBar seekBar) {}
    });
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      progressSeek.setProgressTintList(ColorStateList.valueOf(Color.rgb(201, 111, 134)));
      progressSeek.setThumbTintList(ColorStateList.valueOf(Color.rgb(255, 209, 220)));
    }
    rootView.addView(progressSeek, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, sdp(28)));

    menuView = buildMenuView();
    menuView.setVisibility(View.GONE);
    rootView.addView(menuView);

    int overlayType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
      ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      : WindowManager.LayoutParams.TYPE_PHONE;

    layoutParams = new WindowManager.LayoutParams(
      getOverlayWidth(),
      WindowManager.LayoutParams.WRAP_CONTENT,
      overlayType,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
        | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
      PixelFormat.TRANSLUCENT
    );
    layoutParams.gravity = Gravity.TOP | Gravity.START;
    layoutParams.x = Math.max(dp(10), (getResources().getDisplayMetrics().widthPixels - getOverlayWidth()) / 2);
    layoutParams.y = getStatusBarHeight() + dp(22);

    windowManager.addView(rootView, layoutParams);
  }

  private LinearLayout buildMenuView() {
    LinearLayout menu = new LinearLayout(this);
    menu.setOrientation(LinearLayout.VERTICAL);
    menu.setPadding(dp(8), dp(8), dp(8), dp(8));
    menu.setBackground(roundedDrawable(Color.argb(245, 0, 0, 0), dp(16), Color.argb(35, 255, 255, 255), 1));

    TextView hide = menuItem("إخفاء مؤقت");
    hide.setOnClickListener(view -> hideAssistant());
    TextView open = menuItem("العودة للتطبيق");
    open.setOnClickListener(view -> openApp(this));
    TextView stop = menuItem("إنهاء الجلسة");
    stop.setTextColor(Color.rgb(251, 113, 133));
    stop.setOnClickListener(view -> stopAssistant());

    menu.addView(hide);
    menu.addView(open);
    menu.addView(stop);
    return menu;
  }

  private void updateUi() {
    int total = elements.length();
    if (total <= 0) {
      counterText.setText("0 / 0");
      typeText.setText("عادي");
      payloadText.setText("لا توجد جلسة نشطة");
      progressSeek.setMax(0);
      progressSeek.setProgress(0);
      return;
    }

    currentIndex = clamp(currentIndex, 0, total - 1);
    JSONObject element = elements.optJSONObject(currentIndex);
    if (element == null) return;

    String type = element.optString("type", "عادي");
    String text = element.optString("text", "");
    int color = parseColor(element.optString("color", "#F2A6B8"));

    counterText.setText((currentIndex + 1) + " / " + total);
    typeText.setText("عادي".equals(type) ? "" : type);
    payloadText.setText(text);
    payloadText.setTextSize(scaledText(fontSize));
    payloadText.setBackground(roundedDrawable(withAlpha(color, 42), sdp(16), withAlpha(color, 92), 1));
    dotView.setBackground(roundedDrawable(color, sdp(99), Color.argb(120, 255, 255, 255), 2));
    progressSeek.setMax(Math.max(total - 1, 0));
    progressSeek.setProgress(currentIndex);
  }

  private void goToIndex(int nextIndex) {
    int total = elements.length();
    if (total <= 0) return;
    currentIndex = clamp(nextIndex, 0, total - 1);
    updateUi();
    emitIndexChanged();
  }

  private void copyCurrentText() {
    JSONObject element = elements.optJSONObject(currentIndex);
    if (element == null) return;

    ClipboardManager clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
    clipboard.setPrimaryClip(ClipData.newPlainText("CookieTyper", element.optString("text", "")));
    Toast.makeText(this, "تم النسخ", Toast.LENGTH_SHORT).show();
  }

  private void emitIndexChanged() {
    WritableMap payload = Arguments.createMap();
    payload.putInt("currentIndex", currentIndex);
    FloatingAssistantModule.emitEvent("FloatingAssistantIndexChanged", payload);
  }

  private void emitError(String reason, String message) {
    WritableMap payload = Arguments.createMap();
    payload.putString("reason", reason);
    if (message != null) payload.putString("message", message);
    FloatingAssistantModule.emitEvent("FloatingAssistantError", payload);
  }

  private void toggleMenu() {
    if (menuView == null) return;
    menuView.setVisibility(menuView.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE);
  }

  private void installDragHandler(View dragView) {
    dragView.setOnTouchListener(new View.OnTouchListener() {
      private int startX;
      private int startY;
      private float touchStartX;
      private float touchStartY;

      @Override
      public boolean onTouch(View view, MotionEvent event) {
        if (layoutParams == null || windowManager == null || rootView == null) return false;

        switch (event.getAction()) {
          case MotionEvent.ACTION_DOWN:
            startX = layoutParams.x;
            startY = layoutParams.y;
            touchStartX = event.getRawX();
            touchStartY = event.getRawY();
            return true;
          case MotionEvent.ACTION_MOVE:
            int screenWidth = getResources().getDisplayMetrics().widthPixels;
            int screenHeight = getResources().getDisplayMetrics().heightPixels;
            int maxX = Math.max(dp(10), screenWidth - getOverlayWidth() - dp(10));
            int maxY = Math.max(getStatusBarHeight() + dp(10), screenHeight - Math.max(rootView.getHeight(), dp(150)) - dp(24));
            layoutParams.x = clamp(startX + (int) (event.getRawX() - touchStartX), dp(10), maxX);
            layoutParams.y = clamp(startY + (int) (event.getRawY() - touchStartY), getStatusBarHeight() + dp(10), maxY);
            windowManager.updateViewLayout(rootView, layoutParams);
            return true;
          default:
            return true;
        }
      }
    });
  }

  private void removeOverlayView() {
    if (rootView != null) {
      try {
        windowManager.removeView(rootView);
      } catch (Exception ignored) {
        // The system may have already removed the view while the service is closing.
      }
      rootView = null;
      layoutParams = null;
    }
  }

  private boolean canDrawOverlays() {
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this);
  }

  private Notification buildNotification(boolean hidden) {
    Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
    PendingIntent contentIntent = null;
    int pendingFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
      ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
      : PendingIntent.FLAG_UPDATE_CURRENT;

    if (launchIntent != null) {
      launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
      contentIntent = PendingIntent.getActivity(this, 0, launchIntent, pendingFlags);
    }

    Intent showIntent = new Intent(this, FloatingAssistantService.class);
    showIntent.setAction(ACTION_SHOW);
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
      .addAction(getApplicationInfo().icon, "استعادة", showPendingIntent)
      .addAction(getApplicationInfo().icon, "إنهاء", stopPendingIntent);

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

  private void stopSelfSafely() {
    removeOverlayView();
    if (startedInForeground) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        stopForeground(STOP_FOREGROUND_REMOVE);
      } else {
        stopForeground(true);
      }
    }
    stopSelf();
  }

  private TextView smallButton(String text) {
    TextView button = new TextView(this);
    button.setText(text);
    button.setTextColor(Color.WHITE);
    button.setTextSize(scaledText(18));
    button.setGravity(Gravity.CENTER);
    button.setTypeface(Typeface.DEFAULT_BOLD);
    button.setBackground(roundedDrawable(Color.argb(24, 255, 255, 255), sdp(99), Color.TRANSPARENT, 0));
    return button;
  }

  private TextView navButton(String text) {
    TextView button = new TextView(this);
    button.setText(text);
    button.setTextColor(Color.WHITE);
    button.setTextSize(scaledText(24));
    button.setGravity(Gravity.CENTER);
    button.setTypeface(Typeface.DEFAULT_BOLD);
    button.setBackground(roundedDrawable(Color.argb(24, 255, 255, 255), sdp(99), Color.argb(30, 255, 255, 255), 1));
    return button;
  }

  private TextView menuItem(String text) {
    TextView item = new TextView(this);
    item.setText(text);
    item.setTextColor(Color.WHITE);
    item.setTextSize(scaledText(14));
    item.setGravity(Gravity.RIGHT);
    item.setTypeface(Typeface.DEFAULT_BOLD);
    item.setPadding(sdp(14), sdp(10), sdp(14), sdp(10));
    return item;
  }

  private GradientDrawable roundedDrawable(int color, int radius, int strokeColor, int strokeWidth) {
    GradientDrawable drawable = new GradientDrawable();
    drawable.setColor(color);
    drawable.setCornerRadius(radius);
    if (strokeWidth > 0) drawable.setStroke(sdp(strokeWidth), strokeColor);
    return drawable;
  }

  private int parseColor(String color) {
    try {
      return Color.parseColor(color);
    } catch (Exception exception) {
      return Color.rgb(242, 166, 184);
    }
  }

  private int withAlpha(int color, int alpha) {
    return Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color));
  }

  private int clamp(int value, int min, int max) {
    return Math.max(min, Math.min(value, max));
  }

  private int sdp(int value) {
    return Math.max(1, Math.round(dp(value) * (assistantScale / 100f)));
  }

  private float scaledText(int value) {
    return Math.max(8f, value * (assistantScale / 100f));
  }

  private int getOverlayWidth() {
    int screenWidth = getResources().getDisplayMetrics().widthPixels;
    return Math.min(sdp(320), Math.max(sdp(240), screenWidth - dp(36)));
  }

  private int getStatusBarHeight() {
    int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
    return resourceId > 0 ? getResources().getDimensionPixelSize(resourceId) : dp(24);
  }

  private int dp(int value) {
    return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
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
