const fs = require("fs");
const path = require("path");
const { withAndroidManifest, withDangerousMod, withMainApplication } = require("@expo/config-plugins");

const MEDIA_PROJECTION_PERMISSIONS = [
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION",
  "android.permission.FOREGROUND_SERVICE_MICROPHONE",
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.WAKE_LOCK",
];

function nativeOverlaySource(packageName, deepLinkScheme) {
  return `package ${packageName}.kini.screenshare

import android.content.Context
import android.content.Intent
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.WindowManager
import android.widget.TextView
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.uimanager.ViewManager

class KiniScreenShareOverlayModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
  private var bubble: TextView? = null
  private var params: WindowManager.LayoutParams? = null

  override fun getName() = "KiniScreenShareOverlay"

  @ReactMethod
  fun hasPermission(promise: Promise) {
    promise.resolve(Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context))
  }

  @ReactMethod
  fun requestPermission(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)) {
      promise.resolve(true)
      return
    }
    try {
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + context.packageName)).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
      promise.resolve(false)
    } catch (error: Exception) {
      promise.reject("overlay_permission", "Không thể mở phần cấp quyền hiển thị trên ứng dụng khác.", error)
    }
  }

  @ReactMethod
  fun show(initials: String, promise: Promise) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
      promise.reject("overlay_permission", "KINI chưa có quyền hiển thị nút quay lại trên màn hình chính.")
      return
    }
    if (bubble != null) {
      promise.resolve(true)
      return
    }
    try {
      val size = dp(58)
      val layout = WindowManager.LayoutParams(
        size,
        size,
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else WindowManager.LayoutParams.TYPE_PHONE,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
        PixelFormat.TRANSLUCENT,
      ).apply {
        gravity = Gravity.TOP or Gravity.END
        x = dp(14)
        y = dp(148)
      }
      val view = TextView(context).apply {
        text = initials.ifBlank { "K" }.take(2).uppercase()
        textSize = 18f
        gravity = Gravity.CENTER
        setTextColor(Color.WHITE)
        contentDescription = "Quay lại chia sẻ màn hình KINI"
        background = GradientDrawable().apply {
          shape = GradientDrawable.OVAL
          setColor(Color.rgb(83, 47, 150))
          setStroke(dp(3), Color.argb(210, 255, 255, 255))
        }
      }
      var startX = 0
      var startY = 0
      var initialX = 0
      var initialY = 0
      view.setOnTouchListener { _, event ->
        when (event.actionMasked) {
          MotionEvent.ACTION_DOWN -> {
            initialX = layout.x
            initialY = layout.y
            startX = event.rawX.toInt()
            startY = event.rawY.toInt()
            true
          }
          MotionEvent.ACTION_MOVE -> {
            layout.x = (initialX - (event.rawX.toInt() - startX)).coerceAtLeast(0)
            layout.y = (initialY + (event.rawY.toInt() - startY)).coerceAtLeast(0)
            windowManager.updateViewLayout(view, layout)
            true
          }
          MotionEvent.ACTION_UP -> {
            if (kotlin.math.abs(event.rawX.toInt() - startX) < dp(8) && kotlin.math.abs(event.rawY.toInt() - startY) < dp(8)) openKini()
            true
          }
          else -> true
        }
      }
      windowManager.addView(view, layout)
      bubble = view
      params = layout
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("overlay_show", "Không thể hiện nút quay lại chia sẻ màn hình.", error)
    }
  }

  @ReactMethod
  fun hide(promise: Promise) {
    try {
      bubble?.let { windowManager.removeView(it) }
      bubble = null
      params = null
      promise.resolve(true)
    } catch (error: Exception) {
      bubble = null
      params = null
      promise.reject("overlay_hide", "Không thể ẩn nút quay lại chia sẻ màn hình.", error)
    }
  }

  private fun openKini() {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
    launch.data = Uri.parse("${deepLinkScheme}://call-restore")
    launch.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
    context.startActivity(launch)
  }

  private fun dp(value: Int) = (value * context.resources.displayMetrics.density).toInt()
}

/** Foreground service riêng giữ quyền microphone khi MediaProjection chạy sau khi KINI vào nền. */
class KiniScreenShareAudioService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channelId = "kini_screen_share_audio"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(NotificationChannel(channelId, "Chia sẻ màn hình KINI", NotificationManager.IMPORTANCE_LOW).apply {
        setSound(null, null)
        setShowBadge(false)
      })
    }
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, channelId) else Notification.Builder(this)
    builder
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("KINI đang chia sẻ màn hình")
      .setContentText("Đang giữ micro cho cuộc gọi.")
      .setOngoing(true)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) builder.setSilent(true)
    val notification = builder.build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(74_421, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
    } else {
      startForeground(74_421, notification)
    }
    return START_NOT_STICKY
  }
}

class KiniScreenShareAudioModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "KiniScreenShareAudio"

  @ReactMethod
  fun start(promise: Promise) {
    try {
      val intent = Intent(context, KiniScreenShareAudioService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("screen_share_audio", "Không thể duy trì micro khi chia sẻ màn hình.", error)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      context.stopService(Intent(context, KiniScreenShareAudioService::class.java))
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("screen_share_audio", "Không thể dừng dịch vụ micro chia sẻ màn hình.", error)
    }
  }
}

class KiniScreenShareOverlayPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> = listOf(KiniScreenShareOverlayModule(reactContext), KiniScreenShareAudioModule(reactContext))
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
`;
}

/** Bổ sung foreground service WebRTC cần thiết cho MediaProjection trên Android 14+. */
module.exports = function withKiniWebRtcScreenShare(config) {
  config = withAndroidManifest(config, (mod) => {
    const permissions = mod.modResults.manifest["uses-permission"] ?? [];
    const existing = new Set(permissions.map((item) => item.$?.["android:name"]));
    for (const permission of MEDIA_PROJECTION_PERMISSIONS) {
      if (!existing.has(permission)) permissions.push({ $: { "android:name": permission } });
    }
    const application = mod.modResults.manifest.application?.[0];
    if (application) {
      const services = application.service ?? [];
      const serviceName = "com.oney.WebRTCModule.MediaProjectionService";
      const mediaProjectionService = services.find((service) => service.$?.["android:name"] === serviceName);
      if (mediaProjectionService) mediaProjectionService.$["android:foregroundServiceType"] = "mediaProjection|microphone";
      else services.push({ $: { "android:name": serviceName, "android:foregroundServiceType": "mediaProjection|microphone" } });
      const audioServiceName = `${config.android.package}.kini.screenshare.KiniScreenShareAudioService`;
      if (!services.some((service) => service.$?.["android:name"] === audioServiceName)) {
        services.push({ $: { "android:name": audioServiceName, "android:foregroundServiceType": "microphone", "android:exported": "false" } });
      }
      application.service = services;
    }
    mod.modResults.manifest["uses-permission"] = permissions;
    return mod;
  });

  config = withMainApplication(config, (mod) => {
    if (mod.modResults.language !== "kt") return mod;
    let contents = mod.modResults.contents;
    if (!contents.includes("com.oney.WebRTCModule.WebRTCModuleOptions")) {
      const firstImport = contents.indexOf("import ");
      if (firstImport >= 0) contents = `${contents.slice(0, firstImport)}import com.oney.WebRTCModule.WebRTCModuleOptions\n${contents.slice(firstImport)}`;
    }
    const marker = "override fun onCreate() {";
    if (!contents.includes("enableMediaProjectionService") && contents.includes(marker)) {
      contents = contents.replace(marker, `${marker}\n    WebRTCModuleOptions.getInstance().enableMediaProjectionService = true`);
    }
    if (!contents.includes("KiniScreenShareOverlayPackage")) {
      const firstImport = contents.indexOf("import ");
      const overlayImport = `import ${config.android.package}.kini.screenshare.KiniScreenShareOverlayPackage\n`;
      if (firstImport >= 0) contents = `${contents.slice(0, firstImport)}${overlayImport}${contents.slice(firstImport)}`;
      const packagesMarker = "PackageList(this).packages.apply {";
      if (contents.includes(packagesMarker)) contents = contents.replace(packagesMarker, `${packagesMarker}\n              add(KiniScreenShareOverlayPackage())`);
    }
    mod.modResults.contents = contents;
    return mod;
  });

  return withDangerousMod(config, ["android", async (mod) => {
    const packageName = config.android?.package;
    if (!packageName) throw new Error("KINI screen share cần android.package.");
    const target = path.join(mod.modRequest.platformProjectRoot, "app", "src", "main", "java", ...packageName.split("."), "kini", "screenshare", "KiniScreenShareOverlayModule.kt");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const deepLinkScheme = Array.isArray(config.scheme) ? config.scheme[0] : config.scheme;
    if (!deepLinkScheme) throw new Error("KINI screen share cần Expo scheme.");
    fs.writeFileSync(target, nativeOverlaySource(packageName, deepLinkScheme));
    return mod;
  }]);
};
