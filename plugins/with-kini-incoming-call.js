const fs = require("fs");
const path = require("path");
const {
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
} = require("@expo/config-plugins");

const PERMISSIONS = [
  "android.permission.USE_FULL_SCREEN_INTENT",
  "android.permission.MANAGE_OWN_CALLS",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_PHONE_CALL",
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
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.Person

object KiniCallNotifier {
  const val CHANNEL_ID = "calls"
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
        lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
      })
    }
  }

  fun showIncomingCall(context: Context, callId: String, callerName: String, mode: String, callerAvatar: String = "") {
    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    ensureChannel(notificationManager)
    val contentIntent = activityIntent(context, callId, callerName, mode, callerAvatar, ACTION_OPEN, 101)
    val answerIntent = activityIntent(context, callId, callerName, mode, callerAvatar, ACTION_ANSWER, 102)
    val declineIntent = activityIntent(context, callId, callerName, mode, callerAvatar, ACTION_DECLINE, 103)
    val caller = Person.Builder().setName(callerName).setImportant(true).build()
    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setColor(Color.rgb(22, 119, 255))
      .setFullScreenIntent(contentIntent, true)
      .setStyle(NotificationCompat.CallStyle.forIncomingCall(caller, declineIntent, answerIntent))
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
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.cancel(callId.hashCode())
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
      KiniCallNotifier.showMissedCall(this, callId, data["callerName"] ?: "Bạn KINI", data["mode"] ?: "voice")
      return
    }
    if (data["type"] == "incoming_call") {
      val callId = data["callId"] ?: return
      val callerName = data["callerName"] ?: "Bạn KINI"
      val callerAvatar = data["callerAvatar"] ?: ""
      val mode = data["mode"] ?: "voice"
      KiniCallNotifier.showIncomingCall(this, callId, callerName, mode, callerAvatar)
      KiniTelecomBridge.reportIncomingCall(this, callId, callerName, mode)
      return
    }
    super.onMessageReceived(message)
  }
}
`;

  const connectionService = `package ${packageName}.kini.incomingcall

import android.content.ComponentName
import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.telecom.Connection
import android.telecom.ConnectionRequest
import android.telecom.ConnectionService
import android.telecom.DisconnectCause
import android.telecom.PhoneAccount
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager

object KiniTelecomBridge {
  private const val ACCOUNT_ID = "kini_voip"
  private fun handle(context: Context) = PhoneAccountHandle(ComponentName(context, KiniConnectionService::class.java), ACCOUNT_ID)

  fun reportIncomingCall(context: Context, callId: String, callerName: String, mode: String) {
    try {
      val telecom = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
      val account = PhoneAccount.Builder(handle(context), "KINI").setCapabilities(PhoneAccount.CAPABILITY_SELF_MANAGED).setSupportedUriSchemes(listOf("kini")).build()
      telecom.registerPhoneAccount(account)
      val extras = Bundle().apply {
        putString(KiniCallNotifier.EXTRA_CALL_ID, callId)
        putString(KiniCallNotifier.EXTRA_CALLER_NAME, callerName)
        putString(KiniCallNotifier.EXTRA_MODE, mode)
      }
      telecom.addNewIncomingCall(handle(context), extras)
    } catch (_: SecurityException) {
      // Notification full-screen vẫn hoạt động nếu thiết bị chặn Telecom self-managed.
    } catch (_: UnsupportedOperationException) {
      // Một số ROM hạn chế self-managed ConnectionService; giữ CallStyle fallback.
    }
  }
}

class KiniConnectionService : ConnectionService() {
  override fun onCreateIncomingConnection(phoneAccountHandle: PhoneAccountHandle, request: ConnectionRequest): Connection {
    val extras = request.extras
    return KiniConnection(applicationContext, extras.getString(KiniCallNotifier.EXTRA_CALL_ID) ?: "", extras.getString(KiniCallNotifier.EXTRA_CALLER_NAME) ?: "Bạn KINI").apply {
      connectionProperties = Connection.PROPERTY_SELF_MANAGED
      setAddress(Uri.parse("kini:" + callId), TelecomManager.PRESENTATION_ALLOWED)
      setCallerDisplayName(callerName, TelecomManager.PRESENTATION_ALLOWED)
      setAudioModeIsVoip(true)
      setRinging()
    }
  }
}

private class KiniConnection(private val context: Context, val callId: String, val callerName: String) : Connection() {
  override fun onAnswer() {
    setActive()
    KiniCallNotifier.cancelIncomingCall(context, callId)
    KiniIncomingCallActivity.openReactApp(context, callId, "answer")
  }
  override fun onReject() {
    setDisconnected(DisconnectCause(DisconnectCause.REJECTED))
    destroy()
    KiniCallNotifier.cancelIncomingCall(context, callId)
    KiniIncomingCallActivity.openReactApp(context, callId, "decline")
  }
  override fun onDisconnect() {
    setDisconnected(DisconnectCause(DisconnectCause.LOCAL))
    destroy()
    KiniCallNotifier.cancelIncomingCall(context, callId)
  }
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
    // Full-screen KINI đã hiện; chờ notification được post xong rồi hủy CallStyle để không chồng banner lên UI.
    android.os.Handler(mainLooper).postDelayed({
      if (!isFinishing && callId.isNotBlank()) KiniCallNotifier.cancelIncomingCall(this, callId)
    }, 450)
  }

  override fun onDestroy() {
    if (activeActivity?.get() === this) activeActivity = null
    super.onDestroy()
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    render(intent)
  }

  private fun render(intent: Intent) {
    callId = intent.getStringExtra(KiniCallNotifier.EXTRA_CALL_ID) ?: ""
    val callerName = intent.getStringExtra(KiniCallNotifier.EXTRA_CALLER_NAME) ?: "Bạn KINI"
    val callerAvatar = intent.getStringExtra(KiniCallNotifier.EXTRA_CALLER_AVATAR) ?: ""
    val mode = intent.getStringExtra(KiniCallNotifier.EXTRA_MODE) ?: "voice"
    val action = intent.getStringExtra(KiniCallNotifier.EXTRA_ACTION) ?: KiniCallNotifier.ACTION_OPEN
    if (action == KiniCallNotifier.ACTION_ANSWER || action == KiniCallNotifier.ACTION_DECLINE) {
      KiniCallNotifier.cancelIncomingCall(this, callId)
      openReactApp(this, callId, action)
      finish()
      return
    }
    // Full-screen UI đã xuất hiện: giữ màn gọi KINI, không để CallStyle nằm lại trên thanh thông báo.
    KiniCallNotifier.cancelIncomingCall(this, callId)
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(24), dp(36), dp(24), dp(28))
      setBackgroundColor(Color.rgb(13, 39, 69))
    }
    root.addView(TextView(this).apply {
      text = "Kết nối riêng tư KINI"
      textSize = 12f
      setTextColor(Color.rgb(215, 233, 250))
      gravity = Gravity.CENTER
      setPadding(dp(14), dp(8), dp(14), dp(8))
      background = rounded(Color.argb(28, 255, 255, 255), dp(18))
    })
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
    [path.join(dir, "KiniFirebaseMessagingService.kt"), messagingService],
    [path.join(dir, "KiniConnectionService.kt"), connectionService],
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
    addComponent(application, "service", `${namespace}.KiniConnectionService`, { "android:permission": "android.permission.BIND_TELECOM_CONNECTION_SERVICE", "android:exported": "true" });
    const connectionService = application.service.find((service) => service.$?.["android:name"] === `${namespace}.KiniConnectionService`);
    connectionService["intent-filter"] = connectionService["intent-filter"] ?? [{ action: [{ $: { "android:name": "android.telecom.ConnectionService" } }] }];
    addComponent(application, "activity", `${namespace}.KiniIncomingCallActivity`, { "android:exported": "false", "android:showWhenLocked": "true", "android:turnScreenOn": "true", "android:excludeFromRecents": "true" });
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;
    if (!contents.includes("firebase-messaging")) {
      contents = contents.replace(/dependencies\s*\{/, "dependencies {\n    implementation(\"com.google.firebase:firebase-messaging:24.1.2\")\n    implementation(\"androidx.core:core-ktx:1.13.1\")");
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
    return mod;
  }]);
};
