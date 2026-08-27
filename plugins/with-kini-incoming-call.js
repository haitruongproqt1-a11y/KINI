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
  const val EXTRA_MODE = "mode"
  const val EXTRA_ACTION = "callAction"
  const val ACTION_OPEN = "${packageName}.OPEN_INCOMING_CALL"
  const val ACTION_ANSWER = "answer"
  const val ACTION_DECLINE = "decline"

  fun showIncomingCall(context: Context, callId: String, callerName: String, mode: String) {
    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      notificationManager.createNotificationChannel(NotificationChannel(CHANNEL_ID, "Cuộc gọi KINI", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Cuộc gọi đến KINI"
        enableVibration(true)
        lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
      })
    }
    val contentIntent = activityIntent(context, callId, callerName, mode, ACTION_OPEN, 101)
    val answerIntent = activityIntent(context, callId, callerName, mode, ACTION_ANSWER, 102)
    val declineIntent = activityIntent(context, callId, callerName, mode, ACTION_DECLINE, 103)
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

  fun cancelIncomingCall(context: Context, callId: String) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.cancel(callId.hashCode())
  }

  private fun activityIntent(context: Context, callId: String, callerName: String, mode: String, action: String, requestCode: Int): PendingIntent {
    val intent = Intent(context, KiniIncomingCallActivity::class.java).apply {
      this.action = ACTION_OPEN
      putExtra(EXTRA_CALL_ID, callId)
      putExtra(EXTRA_CALLER_NAME, callerName)
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
      data["callId"]?.let { KiniCallNotifier.cancelIncomingCall(this, it) }
      return
    }
    if (data["type"] == "incoming_call") {
      val callId = data["callId"] ?: return
      val callerName = data["callerName"] ?: "Bạn KINI"
      val mode = data["mode"] ?: "voice"
      KiniTelecomBridge.reportIncomingCall(this, callId, callerName, mode)
      KiniCallNotifier.showIncomingCall(this, callId, callerName, mode)
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
  override fun onShowIncomingCallUi() {
    KiniCallNotifier.showIncomingCall(context, callId, callerName, "voice")
  }
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
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class KiniIncomingCallActivity : Activity() {
  private var callId = ""

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setShowWhenLocked(true)
    setTurnScreenOn(true)
    render(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    render(intent)
  }

  private fun render(intent: Intent) {
    callId = intent.getStringExtra(KiniCallNotifier.EXTRA_CALL_ID) ?: ""
    val callerName = intent.getStringExtra(KiniCallNotifier.EXTRA_CALLER_NAME) ?: "Bạn KINI"
    val mode = intent.getStringExtra(KiniCallNotifier.EXTRA_MODE) ?: "voice"
    val action = intent.getStringExtra(KiniCallNotifier.EXTRA_ACTION) ?: KiniCallNotifier.ACTION_OPEN
    if (action == KiniCallNotifier.ACTION_ANSWER || action == KiniCallNotifier.ACTION_DECLINE) {
      KiniCallNotifier.cancelIncomingCall(this, callId)
      openReactApp(this, callId, action)
      finish()
      return
    }
    val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setPadding(48, 48, 48, 48); setBackgroundColor(Color.rgb(12, 40, 70)) }
    root.addView(TextView(this).apply { text = callerName; textSize = 30f; setTextColor(Color.WHITE); gravity = Gravity.CENTER })
    root.addView(TextView(this).apply { text = if (mode == "video") "Cuộc gọi video đến" else "Cuộc gọi thoại đến"; textSize = 18f; setTextColor(Color.LTGRAY); gravity = Gravity.CENTER; setPadding(0, 16, 0, 64) })
    val actions = LinearLayout(this).apply { gravity = Gravity.CENTER; orientation = LinearLayout.HORIZONTAL }
    actions.addView(Button(this).apply { text = "Từ chối"; setOnClickListener { KiniCallNotifier.cancelIncomingCall(this@KiniIncomingCallActivity, callId); openReactApp(this@KiniIncomingCallActivity, callId, "decline"); finish() } })
    actions.addView(Button(this).apply { text = "Nghe"; setOnClickListener { KiniCallNotifier.cancelIncomingCall(this@KiniIncomingCallActivity, callId); openReactApp(this@KiniIncomingCallActivity, callId, "answer"); finish() } })
    root.addView(actions)
    setContentView(root)
  }

  companion object {
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
