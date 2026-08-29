const fs = require("fs");
const path = require("path");
const {
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withMainActivity,
  withMainApplication,
} = require("@expo/config-plugins");

const PERMISSIONS = [
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.USE_FULL_SCREEN_INTENT",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.WAKE_LOCK",
];

function addComponent(application, key, name, extra = {}) {
  const components = application[key] ?? [];
  if (!components.some((component) => component.$?.["android:name"] === name)) {
    components.push({ $: { "android:name": name, ...extra } });
  }
  application[key] = components;
}

function nativeSources(packageName, deepLinkScheme) {
  const packagePath = packageName.replace(/\./g, "/");
  const dir = path.join(packagePath, "kini", "incomingcall");

  const notifier = `package ${packageName}.kini.incomingcall

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.AudioAttributes
import android.net.Uri
import android.media.MediaPlayer
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ProcessLifecycleOwner

object KiniCallNotifier {
  // Kênh mới tránh giữ lại cấu hình âm thanh của channel calls từ APK cũ.
  const val CHANNEL_ID = "kini_calls_v2"
  const val EXTRA_CALL_ID = "callId"
  const val EXTRA_CALLER_NAME = "callerName"
  const val EXTRA_CALLER_AVATAR = "callerAvatar"
  const val EXTRA_MODE = "mode"
  const val EXTRA_ACTION = "callAction"
  const val ACTION_OPEN = "${packageName}.OPEN_INCOMING_CALL"
  const val ACTION_ANSWER = "answer"
  const val ACTION_DECLINE = "decline"

  private fun ensureChannel(manager: NotificationManager) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, "Cuộc gọi KINI", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Cuộc gọi KINI"
        enableVibration(true)
        setSound(null, null)
        lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
      })
    }
  }

  /** Chỉ coi KINI foreground khi activity đang tương tác thật sự; STARTED có thể còn giữ ngắn sau khi bấm Home. */
  fun isAppInForeground(context: Context): Boolean = try {
    ProcessLifecycleOwner.get().lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)
  } catch (_: Exception) {
    false
  }

  fun isDeviceLocked(context: Context): Boolean = try {
    val keyguard = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
    keyguard.isKeyguardLocked
  } catch (_: Exception) {
    true
  }

  fun showIncomingCall(context: Context, callId: String, callerName: String, mode: String, callerAvatar: String = "") {
    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    ensureChannel(notificationManager)
    KiniCallRinger.start(context, callId)
    val contentIntent = activityIntent(context, callId, callerName, mode, callerAvatar, ACTION_OPEN, 101)
    // Đây chỉ là bootstrap im lặng cho Android mở Activity full-screen; tuyệt đối không dùng CallStyle
    // vì CallStyle hiển thị heads-up/banner chồng lên giao diện KINI có nút Nghe/Từ chối riêng.
    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setSilent(true)
      .setOnlyAlertOnce(true)
      // Một số ROM trì hoãn khởi động Activity từ FCM data-only khi máy đang khóa.
      // Activity tự hủy bootstrap ở onResume; timeout dài chỉ là fallback nếu Android chặn mở UI.
      .setTimeoutAfter(55_000L)
      .setFullScreenIntent(contentIntent, true)
      .build()
    notificationManager.notify(callId.hashCode(), notification)
  }

  fun showMissedCall(context: Context, callId: String, callerName: String, mode: String) {
    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    ensureChannel(notificationManager)
    val modeText = if (mode == "video") "Cuộc gọi video nhỡ" else "Cuộc gọi thoại nhỡ"
    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setCategory(NotificationCompat.CATEGORY_MISSED_CALL)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setAutoCancel(true)
      .setContentTitle(modeText)
      .setContentText("$callerName đã gọi cho bạn.")
      .build()
    notificationManager.notify(("missed:" + callId).hashCode(), notification)
  }

  fun cancelIncomingCall(context: Context, callId: String) {
    cancelIncomingNotification(context, callId)
    KiniCallRinger.stop(callId)
  }

  /** Activity KINI hủy bootstrap nhưng ringtone chỉ dừng khi call kết thúc hoặc người dùng thao tác. */
  fun cancelIncomingNotification(context: Context, callId: String) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.cancel(callId.hashCode())
  }

  /** Chỉ phát file âm thanh KINI đã đóng gói, không đọc ringtone mặc định của điện thoại. */
  object KiniCallRinger {
    private var currentCallId: String? = null
    private var player: MediaPlayer? = null
    private val handler = Handler(Looper.getMainLooper())
    private var timeout: Runnable? = null

    @Synchronized fun start(context: Context, callId: String) {
      if (currentCallId == callId && player?.isPlaying == true) return
      stop()
      try {
        val next = MediaPlayer().apply {
          setAudioAttributes(AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build())
          setDataSource(context.applicationContext, Uri.parse("android.resource://${packageName}/raw/kini_incoming_ring"))
          isLooping = true
          prepare()
          start()
        }
        currentCallId = callId
        player = next
        timeout = Runnable { stop(callId) }.also { handler.postDelayed(it, 55_000L) }
      } catch (_: Exception) {
        try { player?.release() } catch (_: Exception) { }
        player = null
        currentCallId = null
        // Full-screen call vẫn hiển thị nếu ROM chặn audio focus nền.
      }
    }

    @Synchronized fun stop(callId: String? = null) {
      if (callId != null && currentCallId != callId) return
      timeout?.let { handler.removeCallbacks(it) }
      timeout = null
      try { player?.stop() } catch (_: Exception) { }
      try { player?.release() } catch (_: Exception) { }
      player = null
      currentCallId = null
    }
  }

  private fun activityIntent(context: Context, callId: String, callerName: String, mode: String, callerAvatar: String, action: String, requestCode: Int): PendingIntent {
    val intent = Intent(context, KiniIncomingCallActivity::class.java).apply {
      this.action = ACTION_OPEN
      putExtra(EXTRA_CALL_ID, callId)
      putExtra(EXTRA_CALLER_NAME, callerName)
      putExtra(EXTRA_CALLER_AVATAR, callerAvatar)
      putExtra(EXTRA_MODE, mode)
      putExtra(EXTRA_ACTION, action)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }
}
`;

  const messagingService = `package ${packageName}.kini.incomingcall

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class KiniFirebaseMessagingService : FirebaseMessagingService() {
  override fun onMessageReceived(message: RemoteMessage) {
    val data = message.data
    if (data["type"] == "call_ended" || data["type"] == "call_cancelled") {
      data["callId"]?.let { callId ->
        KiniCallNotifier.cancelIncomingCall(this, callId)
        KiniIncomingCallActivity.dismissIncomingCall(callId)
      }
      return
    }
    if (data["type"] == "missed_call") {
      val callId = data["callId"] ?: return
      KiniCallNotifier.showMissedCall(this, callId, data["callerName"] ?: "Người gọi", data["mode"] ?: "voice")
      return
    }
    if (data["type"] == "incoming_call") {
      val callId = data["callId"] ?: return
      val callerName = data["callerName"] ?: "Người gọi"
      val callerAvatar = data["callerAvatar"] ?: ""
      val mode = data["mode"] ?: "voice"
      val shouldUseFullScreen = !KiniCallNotifier.isAppInForeground(this) || KiniCallNotifier.isDeviceLocked(this)
      if (shouldUseFullScreen) {
        KiniCallNotifier.showIncomingCall(this, callId, callerName, mode, callerAvatar)
      } else {
        // App đang mở: tầng socket/React hiển thị overlay call KINI, không tạo notification hoặc fullScreenIntent.
        KiniIncomingCallActivity.openReactApp(this, callId, KiniCallNotifier.ACTION_OPEN)
      }
      return
    }
    super.onMessageReceived(message)
  }
}
`;

  const audioSessionModule = `package ${packageName}.kini.incomingcall

import android.app.Activity
import android.content.Context
import android.media.AudioManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.uimanager.ViewManager

/** Audio session duy nhất của KINI: không đọc/ghi bất kỳ system volume nào. */
object KiniAudioSession {
  private var callActive = false

  @Synchronized
  fun enterCall(context: Context) {
    val activity = (context as? ReactApplicationContext)?.currentActivity
    activity?.setVolumeControlStream(AudioManager.STREAM_VOICE_CALL)
    try {
      val manager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      manager.mode = AudioManager.MODE_IN_COMMUNICATION
    } catch (_: Exception) { }
    callActive = true
  }

  @Synchronized
  fun release(context: Context) {
    val manager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    try { manager.mode = AudioManager.MODE_NORMAL } catch (_: Exception) { }
    if (callActive) {
      try { manager.isSpeakerphoneOn = false } catch (_: Exception) { }
    }
    (context as? ReactApplicationContext)?.currentActivity?.setVolumeControlStream(AudioManager.STREAM_MUSIC)
    callActive = false
  }

  @Synchronized fun isCallActive() = callActive

  @Synchronized fun setDefaultActivityAudio(activity: Activity) {
    if (!callActive) {
      activity.setVolumeControlStream(AudioManager.STREAM_MUSIC)
      val manager = activity.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      try { manager.mode = AudioManager.MODE_NORMAL } catch (_: Exception) { }
    }
  }

  @Synchronized fun onActivityPause(context: Context) { if (!callActive) release(context) }
  @Synchronized fun onActivityStop(context: Context) { if (!callActive) release(context) }
  @Synchronized fun onActivityDestroy(context: Context) { release(context) }
}

class KiniAudioSessionModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "KiniAudioSession"

  @ReactMethod
  fun enterCall(promise: Promise) {
    KiniAudioSession.enterCall(context)
    promise.resolve(true)
  }

  @ReactMethod
  fun release(promise: Promise) {
    KiniAudioSession.release(context)
    promise.resolve(true)
  }

  override fun invalidate() {
    KiniAudioSession.release(context)
    super.invalidate()
  }
}

class KiniAudioSessionPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> = listOf(KiniAudioSessionModule(reactContext))
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}

`;

  const fullScreenSettingsModule = `package ${packageName}.kini.incomingcall

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

/** Mở quyền Android 14+ mà full-screen intent cần để hiện cuộc gọi khi KINI ở nền hoặc màn khóa. */
class KiniIncomingCallSettingsModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "KiniIncomingCallSettings"

  @ReactMethod
  fun canUseFullScreenIntent(promise: Promise) {
    try {
      val allowed = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.canUseFullScreenIntent()
      } else true
      promise.resolve(allowed)
    } catch (error: Exception) {
      promise.reject("full_screen_check", "Không thể kiểm tra quyền hiển thị cuộc gọi toàn màn hình.", error)
    }
  }

  @ReactMethod
  fun requestFullScreenIntentPermission(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      promise.resolve(true)
      return
    }
    try {
      val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + context.packageName)).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
      promise.resolve(false)
    } catch (error: Exception) {
      promise.reject("full_screen_permission", "Không thể mở phần quyền hiển thị cuộc gọi toàn màn hình.", error)
    }
  }
}

class KiniIncomingCallSettingsPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> = listOf(KiniIncomingCallSettingsModule(reactContext))
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
`;

  const incomingActivity = `package ${packageName}.kini.incomingcall

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewOutlineProvider
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import java.net.HttpURLConnection
import java.net.URL
import java.lang.ref.WeakReference

class KiniIncomingCallActivity : Activity() {
  private var callId = ""

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setShowWhenLocked(true)
    setTurnScreenOn(true)
    window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    render(intent)
  }

  override fun onResume() {
    super.onResume()
    activeActivity = WeakReference(this)
    // Activity đã hiện: bỏ bootstrap khỏi shade/status bar nhưng phải giữ ringtone tới khi call kết thúc.
    if (!isFinishing && callId.isNotBlank()) KiniCallNotifier.cancelIncomingNotification(this, callId)
  }

  override fun onDestroy() {
    if (activeActivity?.get() === this) activeActivity = null
    if (isFinishing && callId.isNotBlank()) KiniCallNotifier.cancelIncomingCall(this, callId)
    super.onDestroy()
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    render(intent)
  }

  private fun render(intent: Intent) {
    callId = intent.getStringExtra(KiniCallNotifier.EXTRA_CALL_ID) ?: ""
    val callerName = intent.getStringExtra(KiniCallNotifier.EXTRA_CALLER_NAME) ?: "Người gọi"
    val callerAvatar = intent.getStringExtra(KiniCallNotifier.EXTRA_CALLER_AVATAR) ?: ""
    val mode = intent.getStringExtra(KiniCallNotifier.EXTRA_MODE) ?: "voice"
    val action = intent.getStringExtra(KiniCallNotifier.EXTRA_ACTION) ?: KiniCallNotifier.ACTION_OPEN
    if (action == KiniCallNotifier.ACTION_ANSWER || action == KiniCallNotifier.ACTION_DECLINE) {
      KiniCallNotifier.cancelIncomingCall(this, callId)
      openReactApp(this, callId, action)
      finish()
      return
    }
    // Full-screen UI đã xuất hiện: bỏ bootstrap nhưng tiếp tục ringtone cho tới khi user thao tác hoặc remote end.
    KiniCallNotifier.cancelIncomingNotification(this, callId)
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(24), dp(48), dp(24), dp(28))
      setBackgroundColor(Color.rgb(13, 39, 69))
    }
    val spacerTop = View(this)
    root.addView(spacerTop, LinearLayout.LayoutParams(1, 0, 1.25f))
    val avatarRing = FrameLayout(this).apply {
      background = rounded(Color.argb(34, 255, 255, 255), dp(68), Color.argb(84, 255, 255, 255), dp(1))
      setPadding(dp(7), dp(7), dp(7), dp(7))
    }
    val initial = callerName.split(Regex("\\\\s+")).filter { it.isNotBlank() }.take(2).joinToString("") { it.take(1) }.uppercase().ifBlank { "K" }
    avatarRing.addView(TextView(this).apply {
      text = initial
      textSize = 34f
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      background = rounded(Color.rgb(83, 47, 150), dp(58))
    }, FrameLayout.LayoutParams(dp(116), dp(116)))
    val avatar = ImageView(this).apply {
      scaleType = ImageView.ScaleType.CENTER_CROP
      background = rounded(Color.TRANSPARENT, dp(58))
      clipToOutline = true
      outlineProvider = ViewOutlineProvider.BACKGROUND
      contentDescription = "Ảnh đại diện của $callerName"
    }
    avatarRing.addView(avatar, FrameLayout.LayoutParams(dp(116), dp(116)))
    root.addView(avatarRing, LinearLayout.LayoutParams(dp(130), dp(130)))
    if (callerAvatar.startsWith("https://")) loadAvatar(avatar, callerAvatar)
    root.addView(TextView(this).apply {
      text = callerName
      textSize = 28f
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      setTypeface(typeface, android.graphics.Typeface.BOLD)
      setPadding(0, dp(24), 0, 0)
      maxLines = 1
    }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
    root.addView(TextView(this).apply {
      text = if (mode == "video") "Cuộc gọi video đến" else "Cuộc gọi thoại đến"
      textSize = 16f
      setTextColor(Color.rgb(206, 225, 243))
      gravity = Gravity.CENTER
      setPadding(0, dp(9), 0, 0)
    }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
    val spacerBottom = View(this)
    root.addView(spacerBottom, LinearLayout.LayoutParams(1, 0, 0.9f))
    root.addView(TextView(this).apply {
      text = "Chạm để trả lời hoặc từ chối"
      textSize = 13f
      setTextColor(Color.rgb(191, 213, 233))
      gravity = Gravity.CENTER
      setPadding(0, 0, 0, dp(18))
    })
    val actions = LinearLayout(this).apply { gravity = Gravity.CENTER; orientation = LinearLayout.HORIZONTAL }
    actions.addView(actionButton("✕", "Từ chối", Color.rgb(239, 91, 99)) { answer(false) }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { marginEnd = dp(18) })
    actions.addView(actionButton("☎", "Nhận cuộc gọi", Color.rgb(22, 119, 255)) { answer(true) }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { marginStart = dp(18) })
    root.addView(actions, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
    setContentView(root)
  }

  private fun answer(accept: Boolean) {
    KiniCallNotifier.cancelIncomingCall(this, callId)
    openReactApp(this, callId, if (accept) "answer" else "decline")
    finish()
  }

  private fun actionButton(icon: String, label: String, color: Int, onTap: () -> Unit) = LinearLayout(this).apply {
    orientation = LinearLayout.VERTICAL
    gravity = Gravity.CENTER
    isClickable = true
    isFocusable = true
    contentDescription = label
    val button = TextView(this@KiniIncomingCallActivity).apply {
      text = icon
      textSize = 29f
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      background = rounded(color, dp(30), Color.argb(115, 255, 255, 255), dp(1))
    }
    addView(button, LinearLayout.LayoutParams(dp(60), dp(60)))
    addView(TextView(this@KiniIncomingCallActivity).apply {
      text = label
      textSize = 12f
      setTextColor(Color.WHITE)
      setTypeface(typeface, android.graphics.Typeface.BOLD)
      gravity = Gravity.CENTER
      setPadding(0, dp(8), 0, 0)
      maxLines = 1
    }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
    setOnClickListener { onTap() }
  }

  private fun loadAvatar(target: ImageView, url: String) {
    Thread {
      try {
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.connectTimeout = 5000
        connection.readTimeout = 5000
        connection.instanceFollowRedirects = true
        val bitmap = connection.inputStream.use { BitmapFactory.decodeStream(it) }
        connection.disconnect()
        if (bitmap != null) target.post { if (!isFinishing) target.setImageBitmap(bitmap) }
      } catch (_: Exception) {
        // Giữ initials nếu ảnh đại diện chưa tải được hoặc URL không còn hiệu lực.
      }
    }.start()
  }

  private fun rounded(color: Int, radius: Int, strokeColor: Int? = null, strokeWidth: Int = 0) = GradientDrawable().apply {
    shape = GradientDrawable.RECTANGLE
    cornerRadius = radius.toFloat()
    setColor(color)
    if (strokeColor != null && strokeWidth > 0) setStroke(strokeWidth, strokeColor)
  }

  private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

  companion object {
    private var activeActivity: WeakReference<KiniIncomingCallActivity>? = null

    fun dismissIncomingCall(callId: String) {
      val activity = activeActivity?.get() ?: return
      KiniCallNotifier.cancelIncomingCall(activity, callId)
      if (activity.callId == callId) activity.runOnUiThread { activity.finish() }
    }

    fun openReactApp(context: Context, callId: String, action: String) {
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
      launch.data = Uri.parse("${deepLinkScheme}://incoming-call?callId=" + Uri.encode(callId) + "&action=" + action)
      launch.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      context.startActivity(launch)
    }
  }
}
`;

  return [
    [path.join(dir, "KiniCallNotifier.kt"), notifier],
    [path.join(dir, "KiniAudioSessionModule.kt"), audioSessionModule],
    [path.join(dir, "KiniFirebaseMessagingService.kt"), messagingService],
    [path.join(dir, "KiniIncomingCallSettingsModule.kt"), fullScreenSettingsModule],
    [path.join(dir, "KiniIncomingCallActivity.kt"), incomingActivity],
  ];
}

module.exports = function withKiniIncomingCall(config) {
  const packageName = config.android?.package;
  if (!packageName) throw new Error("KINI incoming call cần android.package.");
  const deepLinkScheme = Array.isArray(config.scheme) ? config.scheme[0] : config.scheme;
  if (!deepLinkScheme) throw new Error("KINI incoming call cần Expo scheme.");

  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const permissions = manifest["uses-permission"] ?? [];
    const existingPermissions = new Set(permissions.map((item) => item.$?.["android:name"]));
    for (const permission of PERMISSIONS) if (!existingPermissions.has(permission)) permissions.push({ $: { "android:name": permission } });
    manifest["uses-permission"] = permissions;

    const application = manifest.application?.[0];
    if (!application) throw new Error("Không tìm thấy application Android cho KINI incoming call.");
    const namespace = `${packageName}.kini.incomingcall`;
    addComponent(application, "service", `${namespace}.KiniFirebaseMessagingService`, { "android:exported": "false" });
    const firebaseService = application.service.find((service) => service.$?.["android:name"] === `${namespace}.KiniFirebaseMessagingService`);
    firebaseService["intent-filter"] = firebaseService["intent-filter"] ?? [{ action: [{ $: { "android:name": "com.google.firebase.MESSAGING_EVENT" } }] }];
    addComponent(application, "activity", `${namespace}.KiniIncomingCallActivity`, { "android:exported": "false", "android:showWhenLocked": "true", "android:turnScreenOn": "true", "android:excludeFromRecents": "true" });
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;
    if (!contents.includes("firebase-messaging")) {
      contents = contents.replace(/dependencies\s*\{/, "dependencies {\n    implementation(\"com.google.firebase:firebase-messaging:24.1.2\")\n    implementation(\"androidx.core:core-ktx:1.13.1\")");
    }
    if (!contents.includes("lifecycle-process")) {
      contents = contents.replace(/dependencies\s*\{/, "dependencies {\n    implementation(\"androidx.lifecycle:lifecycle-process:2.8.4\")");
    }
    mod.modResults.contents = contents;
    return mod;
  });

  config = withMainActivity(config, (mod) => {
    if (mod.modResults.language !== "kt") return mod;
    let contents = mod.modResults.contents;
    if (!contents.includes("KiniAudioSession.setDefaultActivityAudio")) {
      const firstImport = contents.indexOf("import ");
      const audioImport = `import android.media.AudioManager\nimport ${packageName}.kini.incomingcall.KiniAudioSession\n`;
      if (firstImport >= 0) contents = `${contents.slice(0, firstImport)}${audioImport}${contents.slice(firstImport)}`;
      contents = contents.replace(
        "  override fun onCreate(savedInstanceState: Bundle?) {\n",
        "  override fun onCreate(savedInstanceState: Bundle?) {\n    KiniAudioSession.setDefaultActivityAudio(this)\n",
      );
      contents = contents.replace(
        "    super.onCreate(null)\n  }\n",
        "    super.onCreate(null)\n    KiniAudioSession.setDefaultActivityAudio(this)\n  }\n",
      );
      const lifecycleAnchor = "  /**\n   * Returns the name of the main component";
      const lifecycle = `  override fun onResume() {\n    super.onResume()\n    if (!KiniAudioSession.isCallActive()) setVolumeControlStream(AudioManager.STREAM_MUSIC)\n  }\n\n  override fun onPause() {\n    KiniAudioSession.onActivityPause(this)\n    super.onPause()\n  }\n\n  override fun onStop() {\n    KiniAudioSession.onActivityStop(this)\n    super.onStop()\n  }\n\n  override fun onDestroy() {\n    KiniAudioSession.onActivityDestroy(this)\n    super.onDestroy()\n  }\n\n`;
      contents = contents.replace(lifecycleAnchor, lifecycle + lifecycleAnchor);
    }
    mod.modResults.contents = contents;
    return mod;
  });

  config = withMainApplication(config, (mod) => {
    if (mod.modResults.language !== "kt") return mod;
    let contents = mod.modResults.contents;
    const firstImport = contents.indexOf("import ");
    const packagesMarker = "PackageList(this).packages.apply {";
    if (!contents.includes("KiniIncomingCallSettingsPackage")) {
      const settingsImport = `import ${packageName}.kini.incomingcall.KiniIncomingCallSettingsPackage\n`;
      if (firstImport >= 0) contents = `${contents.slice(0, firstImport)}${settingsImport}${contents.slice(firstImport)}`;
    }
    if (!contents.includes("KiniAudioSessionPackage")) {
      const audioImport = `import ${packageName}.kini.incomingcall.KiniAudioSessionPackage\n`;
      const importIndex = contents.indexOf("import ");
      if (importIndex >= 0) contents = `${contents.slice(0, importIndex)}${audioImport}${contents.slice(importIndex)}`;
    }
    if (contents.includes(packagesMarker)) {
      if (!contents.includes("add(KiniIncomingCallSettingsPackage())")) contents = contents.replace(packagesMarker, `${packagesMarker}\n              add(KiniIncomingCallSettingsPackage())`);
      if (!contents.includes("add(KiniAudioSessionPackage())")) contents = contents.replace(packagesMarker, `${packagesMarker}\n              add(KiniAudioSessionPackage())`);
    }
    mod.modResults.contents = contents;
    return mod;
  });

  return withDangerousMod(config, ["android", async (mod) => {
    const sourceRoot = path.join(mod.modRequest.platformProjectRoot, "app", "src", "main", "java");
    for (const [relativePath, contents] of nativeSources(packageName, deepLinkScheme)) {
      const target = path.join(sourceRoot, relativePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, contents);
    }
    const rawSource = path.join(__dirname, "..", "assets", "audio", "kini-incoming-ring.mp3");
    const rawTarget = path.join(mod.modRequest.platformProjectRoot, "app", "src", "main", "res", "raw", "kini_incoming_ring.mp3");
    if (!fs.existsSync(rawSource)) throw new Error("Thiếu assets/audio/kini-incoming-ring.mp3 cho incoming call KINI.");
    fs.mkdirSync(path.dirname(rawTarget), { recursive: true });
    fs.copyFileSync(rawSource, rawTarget);
    return mod;
  }]);
};
