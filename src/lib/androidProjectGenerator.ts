import JSZip from 'jszip';

export interface AndroidProjectConfig {
  appName: string;
  packageName: string;
  webAppUrl: string;
  versionCode: number;
  versionName: string;
  googleServicesJson?: string;
  isEmbeddedApp?: boolean;
}

export const DEFAULT_GOOGLE_SERVICES_JSON = JSON.stringify({
  project_info: {
    project_number: "414995152902",
    project_id: "care-elevator-accounts",
    storage_bucket: "care-elevator-accounts.firebasestorage.app"
  },
  client: [
    {
      client_info: {
        mobilesdk_app_id: "1:414995152902:android:24503f72098ac2470dc387",
        android_client_info: {
          package_name: "com.cecaccounts.app"
        }
      },
      oauth_client: [],
      api_key: [
        {
          current_key: "AIzaSyA3snKCkFSk5rG0Kim4HVyDa1lvDLrX3k4"
        }
      ],
      services: {
        appinvite_service: {
          other_platform_oauth_client: []
        }
      }
    }
  ],
  configuration_version: "1"
}, null, 2);

export async function generateAndroidStudioProjectZip(config: AndroidProjectConfig): Promise<Blob> {
  const zip = new JSZip();

  const {
    appName = 'CEC Accounts',
    packageName = 'com.cecaccounts.app',
    webAppUrl,
    versionCode = 1,
    versionName = '1.0.0',
    googleServicesJson = DEFAULT_GOOGLE_SERVICES_JSON,
    isEmbeddedApp = true
  } = config;

  const packagePath = packageName.replace(/\./g, '/');

  // 1. Root build.gradle.kts
  const rootBuildGradle = `// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    id("com.android.application") version "8.2.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.22" apply false
}
`;

  // 2. settings.gradle.kts
  const settingsGradle = `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "${appName.replace(/[^a-zA-Z0-9_-]/g, '') || 'CECAccounts'}"
include(":app")
`;

  // 3. gradle.properties
  const gradleProperties = `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
kotlin.code.style=official
`;

  // 4. gradle/wrapper/gradle-wrapper.properties
  const gradleWrapperProperties = `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.5-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`;

  // 5. app/build.gradle.kts
  const appBuildGradle = `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "${packageName}"
    compileSdk = 34

    defaultConfig {
        applicationId = "${packageName}"
        minSdk = 26
        targetSdk = 34
        versionCode = ${versionCode}
        versionName = "${versionName}"

        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        debug {
            isDebuggable = true
        }
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // AndroidX & Material UI
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.activity:activity-ktx:1.8.2")
    implementation("androidx.coordinatorlayout:coordinatorlayout:1.2.0")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation("androidx.webkit:webkit:1.10.0")
}
`;

  // 6. app/proguard-rules.pro
  const proguardRules = `# Add project specific ProGuard rules here.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
`;

  // 7. app/src/main/AndroidManifest.xml
  const androidManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <!-- Permissions for Web & Network & Downloads -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
    <uses-permission android:name="android.permission.DOWNLOAD_WITHOUT_NOTIFICATION" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.CECAccounts"
        android:usesCleartextTraffic="true"
        android:hardwareAccelerated="true"
        android:networkSecurityConfig="@xml/network_security_config"
        tools:targetApi="31">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>
`;

  // 8. app/src/main/java/com/careelevator/app/MainActivity.kt
  const mainActivityKt = `package ${packageName}

import android.annotation.SuppressLint
import android.app.Activity
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.util.Base64
import android.view.View
import android.webkit.*
import android.webkit.WebChromeClient.FileChooserParams
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import androidx.webkit.WebViewAssetLoader
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var offlineLayout: View
    private lateinit var retryBtn: Button

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var backPressedTime: Long = 0

    // Whether this APK is running with bundled standalone web assets (No Google AI Studio login needed!)
    private val isEmbeddedApp = ${isEmbeddedApp ? "true" : "false"}

    // Target URL of the cloud web app (used if isEmbeddedApp is false)
    private val webAppUrl = "${webAppUrl}"

    // File picker launcher for file upload / camera capture
    private val filePickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (filePathCallback != null) {
            val results: Array<Uri>? = if (result.resultCode == Activity.RESULT_OK) {
                val data = result.data
                val dataString = data?.dataString
                val clipData = data?.clipData
                if (clipData != null && clipData.itemCount > 0) {
                    val list = mutableListOf<Uri>()
                    for (i in 0 until clipData.itemCount) {
                        val uri = clipData.getItemAt(i).uri
                        if (uri != null) list.add(uri)
                    }
                    if (list.isNotEmpty()) list.toTypedArray() else null
                } else if (dataString != null) {
                    arrayOf(Uri.parse(dataString))
                } else {
                    null
                }
            } else {
                null
            }
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        swipeRefresh = findViewById(R.id.swipeRefresh)
        progressBar = findViewById(R.id.progressBar)
        offlineLayout = findViewById(R.id.offlineLayout)
        retryBtn = findViewById(R.id.btnRetry)

        setupBackPressHandler()
        setupWebView()
        setupSwipeRefresh()

        retryBtn.setOnClickListener {
            if (isEmbeddedApp) {
                offlineLayout.visibility = View.GONE
                webView.visibility = View.VISIBLE
                webView.loadUrl("https://appassets.androidplatform.net/index.html")
            } else if (isNetworkAvailable()) {
                offlineLayout.visibility = View.GONE
                webView.visibility = View.VISIBLE
                webView.reload()
            } else {
                Toast.makeText(this, "No internet connection detected. Please connect to Wi-Fi or Mobile Data.", Toast.LENGTH_SHORT).show()
            }
        }

        if (isEmbeddedApp) {
            webView.loadUrl("https://appassets.androidplatform.net/index.html")
        } else if (isNetworkAvailable()) {
            webView.loadUrl(webAppUrl)
        } else {
            showOfflineView()
        }
    }

    private fun setupBackPressHandler() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    if (backPressedTime + 2000 > System.currentTimeMillis()) {
                        finish()
                    } else {
                        Toast.makeText(this@MainActivity, "Press BACK again to exit", Toast.LENGTH_SHORT).show()
                        backPressedTime = System.currentTimeMillis()
                    }
                }
            }
        })
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.allowFileAccessFromFileURLs = true
        settings.allowUniversalAccessFromFileURLs = true
        settings.javaScriptCanOpenWindowsAutomatically = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.setSupportMultipleWindows(false)
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.userAgentString = settings.userAgentString + " CECAccountsMobileApp/1.0"
        webView.setBackgroundColor(android.graphics.Color.parseColor("#0f172a"))

        // Handle downloads (like CSV exports & report files)
        webView.setDownloadListener { url, userAgent, contentDisposition, mimetype, _ ->
            handleDownload(url, contentDisposition, mimetype)
        }

        // Setup WebViewAssetLoader for clean, instant, secure local asset loading without CORS hurdles
        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                if (request != null) {
                    val url = request.url

                    // Fast, reliable direct local asset loading for standalone embedded app
                    if (url.host == "appassets.androidplatform.net") {
                        val path = (url.path ?: "").removePrefix("/")
                        val cleanPath = if (path.isEmpty() || path == "/") "index.html" else path
                        val fileName = cleanPath.substringAfterLast("/")

                        val candidates = listOf(
                            cleanPath,
                            if (cleanPath.startsWith("assets/")) cleanPath.removePrefix("assets/") else "assets/$cleanPath",
                            fileName,
                            "assets/$fileName"
                        ).distinct()

                        for (cand in candidates) {
                            try {
                                val stream = assets.open(cand)
                                val mime = when {
                                    cand.endsWith(".html") -> "text/html"
                                    cand.endsWith(".js") || cand.endsWith(".mjs") -> "application/javascript"
                                    cand.endsWith(".css") -> "text/css"
                                    cand.endsWith(".svg") -> "image/svg+xml"
                                    cand.endsWith(".json") -> "application/json"
                                    cand.endsWith(".png") -> "image/png"
                                    cand.endsWith(".jpg") || cand.endsWith(".jpeg") -> "image/jpeg"
                                    cand.endsWith(".ico") -> "image/x-icon"
                                    cand.endsWith(".woff2") -> "font/woff2"
                                    cand.endsWith(".woff") -> "font/woff"
                                    cand.endsWith(".ttf") -> "font/ttf"
                                    else -> "application/octet-stream"
                                }
                                val headers = mapOf(
                                    "Access-Control-Allow-Origin" to "*",
                                    "Access-Control-Allow-Methods" to "GET, POST, OPTIONS",
                                    "Access-Control-Allow-Headers" to "*",
                                    "Cache-Control" to "no-cache"
                                )
                                return WebResourceResponse(mime, "UTF-8", 200, "OK", headers, stream)
                            } catch (_: Exception) {}
                        }
                    }

                    val assetResponse = assetLoader.shouldInterceptRequest(url)
                    if (assetResponse != null) return assetResponse
                }
                return super.shouldInterceptRequest(view, request)
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                progressBar.visibility = View.GONE
                swipeRefresh.isRefreshing = false
                offlineLayout.visibility = View.GONE
                webView.visibility = View.VISIBLE
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (!isEmbeddedApp && request?.isForMainFrame == true && !isNetworkAvailable()) {
                    showOfflineView()
                }
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.startsWith("https://appassets.androidplatform.net") ||
                    (!isEmbeddedApp && webAppUrl.isNotEmpty() && url.startsWith(webAppUrl))) {
                    return false
                }
                // Keep app navigation inside WebView, open external dialer/whatsapp/mailto externally
                return when {
                    url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("whatsapp:") -> {
                        try {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                            startActivity(intent)
                        } catch (e: Exception) {
                            Toast.makeText(this@MainActivity, "No app found to handle this action", Toast.LENGTH_SHORT).show()
                        }
                        true
                    }
                    else -> false
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                val msg = consoleMessage?.message() ?: ""
                val line = consoleMessage?.lineNumber() ?: 0
                val src = consoleMessage?.sourceId() ?: ""
                android.util.Log.d("CEC_APP", "[$line:$src] $msg")
                return true
            }

            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                if (newProgress == 100) {
                    progressBar.visibility = View.GONE
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: WebChromeClient.FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }

                try {
                    filePickerLauncher.launch(intent)
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback = null
                    return false
                }
                return true
            }
        }
    }

    private fun setupSwipeRefresh() {
        swipeRefresh.setColorSchemeResources(
            android.R.color.holo_green_dark,
            android.R.color.holo_blue_dark
        )
        swipeRefresh.setOnRefreshListener {
            if (isNetworkAvailable()) {
                webView.reload()
            } else {
                swipeRefresh.isRefreshing = false
                Toast.makeText(this, "Cannot refresh: Offline", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun handleDownload(url: String, contentDisposition: String?, mimeType: String?) {
        try {
            if (url.startsWith("data:")) {
                // Handle Base64 Data URL downloads (e.g. CSV, images, generated reports)
                val parts = url.split(",")
                if (parts.size > 1) {
                    val base64Data = parts[1]
                    val bytes = Base64.decode(base64Data, Base64.DEFAULT)
                    val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
                    val ext = if (url.contains("csv")) "csv" else "bin"
                    val fileName = "CECAccounts_\${timestamp}.\${ext}"

                    val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    val file = File(downloadsDir, fileName)
                    val fos = FileOutputStream(file)
                    fos.write(bytes)
                    fos.flush()
                    fos.close()

                    Toast.makeText(this, "Saved to Downloads: \${fileName}", Toast.LENGTH_LONG).show()
                }
            } else {
                // Handle regular HTTP/HTTPS downloads
                val request = DownloadManager.Request(Uri.parse(url)).apply {
                    setMimeType(mimeType)
                    addRequestHeader("User-Agent", webView.settings.userAgentString)
                    setDescription("Downloading CEC Accounts document...")
                    setTitle(URLUtil.guessFileName(url, contentDisposition, mimeType))
                    setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    setDestinationInExternalPublicDir(
                        Environment.DIRECTORY_DOWNLOADS,
                        URLUtil.guessFileName(url, contentDisposition, mimeType)
                    )
                }
                val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                dm.enqueue(request)
                Toast.makeText(this, "Download started...", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            Toast.makeText(this, "Download error: \${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun showOfflineView() {
        webView.visibility = View.GONE
        progressBar.visibility = View.GONE
        swipeRefresh.isRefreshing = false
        offlineLayout.visibility = View.VISIBLE
    }

    private fun isNetworkAvailable(): Boolean {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }
}
`;

  // 9. app/src/main/res/layout/activity_main.xml
  const activityMainXml = `<?xml version="1.0" encoding="utf-8"?>
<androidx.coordinatorlayout.widget.CoordinatorLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#0f172a">

    <ProgressBar
        android:id="@+id/progressBar"
        style="?android:attr/progressBarStyleHorizontal"
        android:layout_width="match_parent"
        android:layout_height="3dp"
        android:max="100"
        android:progress="0"
        android:progressBackgroundTint="#334155"
        android:progressTint="#10b981"
        android:visibility="gone" />

    <androidx.swiperefreshlayout.widget.SwipeRefreshLayout
        android:id="@+id/swipeRefresh"
        android:layout_width="match_parent"
        android:layout_height="match_parent">

        <WebView
            android:id="@+id/webView"
            android:layout_width="match_parent"
            android:layout_height="match_parent" />
    </androidx.swiperefreshlayout.widget.SwipeRefreshLayout>

    <!-- Clean Native Offline Screen -->
    <LinearLayout
        android:id="@+id/offlineLayout"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:background="#0f172a"
        android:gravity="center"
        android:orientation="vertical"
        android:padding="32dp"
        android:visibility="gone">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="📶"
            android:textSize="54sp" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="16dp"
            android:fontFamily="sans-serif-black"
            android:text="Offline Mode"
            android:textColor="#ffffff"
            android:textSize="20sp" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="8dp"
            android:gravity="center"
            android:text="Cannot reach the CEC Accounts server. Please check your mobile data or Wi-Fi connection and tap Retry."
            android:textColor="#94a3b8"
            android:textSize="14sp" />

        <Button
            android:id="@+id/btnRetry"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="24dp"
            android:backgroundTint="#10b981"
            android:paddingStart="28dp"
            android:paddingEnd="28dp"
            android:text="Retry Connection"
            android:textAllCaps="false"
            android:textColor="#ffffff"
            android:textSize="14sp" />
    </LinearLayout>

</androidx.coordinatorlayout.widget.CoordinatorLayout>
`;

  // 10. app/src/main/res/values/strings.xml
  const escapedAppName = (appName || 'CEC Accounts')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '\\\'');

  const stringsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${escapedAppName}</string>
</resources>
`;

  // 11. app/src/main/res/values/colors.xml
  const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="primary">#0f172a</color>
    <color name="primary_dark">#020617</color>
    <color name="accent">#10b981</color>
    <color name="background">#0f172a</color>
</resources>
`;

  // 12. app/src/main/res/values/themes.xml
  const themesXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.CECAccounts" parent="Theme.MaterialComponents.DayNight.NoActionBar">
        <item name="colorPrimary">@color/primary</item>
        <item name="colorPrimaryVariant">@color/primary_dark</item>
        <item name="colorOnPrimary">#ffffff</item>
        <item name="colorSecondary">@color/accent</item>
        <item name="android:statusBarColor">@color/primary_dark</item>
        <item name="android:navigationBarColor">@color/primary_dark</item>
        <item name="android:windowLightStatusBar">false</item>
    </style>
</resources>
`;

  // 13. Launcher Icon Drawables & Adaptive Icons (Fixes AAPT2 processDebugResources missing icon error)
  const icLauncherBackgroundXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#0f172a"
        android:pathData="M0,0h108v108h-108z" />
</vector>
`;

  const icLauncherForegroundXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <group
        android:scaleX="0.65"
        android:scaleY="0.65"
        android:translateX="18.9"
        android:translateY="18.9">
        <!-- Emerald rounded container -->
        <path
            android:fillColor="#10b981"
            android:pathData="M16,4h76c6.6,0 12,5.4 12,12v76c0,6.6 -5.4,12 -12,12H16c-6.6,0 -12,-5.4 -12,-12V16c0,-6.6 5.4,-12 12,-12z" />
        <!-- Slate elevator frame -->
        <path
            android:fillColor="#0f172a"
            android:pathData="M22,16h28v76H22V16z M58,16h28v76H58V16z" />
        <!-- White navigation arrows -->
        <path
            android:fillColor="#ffffff"
            android:pathData="M36,36l-8,11h16L36,36z M72,72l8,-11H64L72,72z" />
    </group>
</vector>
`;

  const icLauncherAdaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`;

  // 14. app/src/main/res/xml/network_security_config.xml
  const networkSecurityXml = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;

  // 15. app/src/main/res/xml/file_paths.xml
  const filePathsXml = `<?xml version="1.0" encoding="utf-8"?>
<paths>
    <external-path name="external_files" path="." />
    <external-cache-path name="external_cache" path="." />
    <cache-path name="cache" path="." />
    <files-path name="files" path="." />
</paths>
`;

  // 16. README.md
  const readmeMd = `# ${appName} - Android Studio Kotlin Project

This is a complete, production-ready Android Studio Kotlin project for **${appName}**.

## Features Included
1. **Full Web-to-Native Integration**: Renders the complete, real-time ${appName} accounting suite (Incomes, Expenses, Reports, Owners, Google Sheets sync, Firebase database).
2. **Pull-to-Refresh**: Swipe down from top to immediately reload records.
3. **CSV & File Download Handler**: Seamlessly handles downloads like "Export CSV" and saves files to the user's standard Android **Downloads** folder.
4. **File Picker / Upload Support**: Enables uploading invoice receipts or photos through standard Android file/camera pickers.
5. **Offline Protection**: Gracefully informs the user if there is no internet connection with a quick "Retry" button.
6. **Smart Back Navigation**: Tapping Back navigates within the app's history instead of accidentally closing the application. Double-tap to exit.
7. **Edge-to-Edge Design**: Matches the sleek dark theme of the app with custom status bar color.

---

## How to Build the APK in Android Studio:

### Step 1: Extract the ZIP
Unzip this \`${appName.replace(/\s+/g, '')}-AndroidStudio-Kotlin.zip\` file on your computer.

### Step 2: Open in Android Studio
1. Launch **Android Studio**. Make sure your PC is connected to the internet.
2. Click **Open** (or **File > Open**).
3. Select the extracted folder containing \`build.gradle.kts\` and click **OK**.
4. Android Studio will automatically download the Gradle wrapper and sync the dependencies.
   *(Note: If you see a Gradle Sync notice, click "Sync Project with Gradle Files" at top-right).*

### Step 3: Build the APK
1. In the top menu bar, click:
   **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. Wait a few moments for Gradle to compile.
3. A notification will pop up at the bottom right saying:
   *"APK(s) generated successfully for 1 module"*.
4. Click **locate** in that notification. The generated APK file is located in:
   \`app/build/outputs/apk/debug/app-debug.apk\`

### Step 4: Install on Mobile
Transfer \`app-debug.apk\` to your Android phone (via WhatsApp, Google Drive, USB, or email) and tap on it to install. You can now use the exact same app on both computer and mobile with real-time sync!

---

### Troubleshooting Common Android Studio Issues:
- **"Unknown host / No such host is known"**:
  Ensure your computer is connected to the internet during the very first Gradle sync so Android Studio can download the Gradle tooling from Google's repository. Also ensure your firewall or antivirus is not blocking Android Studio.
- **"Offline Mode"**:
  If Gradle offline mode was previously enabled in your Android Studio, disable it via:
  **Settings / Preferences > Build, Execution, Deployment > Build Tools > Gradle** and uncheck "Offline work", then click Sync.
`;

  // Add files to zip
  zip.file('build.gradle.kts', rootBuildGradle);
  zip.file('settings.gradle.kts', settingsGradle);
  zip.file('gradle.properties', gradleProperties);
  zip.file('README.md', readmeMd);

  zip.file('gradle/wrapper/gradle-wrapper.properties', gradleWrapperProperties);

  zip.file('app/build.gradle.kts', appBuildGradle);
  zip.file('app/proguard-rules.pro', proguardRules);
  zip.file('app/src/main/AndroidManifest.xml', androidManifest);
  zip.file('app/google-services.json', googleServicesJson || DEFAULT_GOOGLE_SERVICES_JSON);

  zip.file(`app/src/main/java/${packagePath}/MainActivity.kt`, mainActivityKt);

  zip.file('app/src/main/res/layout/activity_main.xml', activityMainXml);
  zip.file('app/src/main/res/values/strings.xml', stringsXml);
  zip.file('app/src/main/res/values/colors.xml', colorsXml);
  zip.file('app/src/main/res/values/themes.xml', themesXml);
  zip.file('app/src/main/res/xml/network_security_config.xml', networkSecurityXml);
  zip.file('app/src/main/res/xml/file_paths.xml', filePathsXml);

  // App Launcher Icons: Vectors in drawable, Adaptive Icons in mipmap-anydpi-v26 (standard Android pattern)
  zip.file('app/src/main/res/drawable/ic_launcher_background.xml', icLauncherBackgroundXml);
  zip.file('app/src/main/res/drawable/ic_launcher_foreground.xml', icLauncherForegroundXml);

  zip.file('app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml', icLauncherAdaptiveXml);
  zip.file('app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml', icLauncherAdaptiveXml);

  // 13. Standalone Embedded Assets Bundle (Ensures the APK runs locally without white screens or login prompts)
  if (isEmbeddedApp) {
    try {
      let indexHtml = '';
      let assetList: string[] = [];

      // 1. Try to get production manifest from server endpoint
      try {
        const manifestRes = await fetch('/api/embedded-assets-info');
        if (manifestRes.ok) {
          const data = await manifestRes.json();
          if (data.indexHtml && !data.indexHtml.includes('/src/main.tsx')) {
            indexHtml = data.indexHtml;
            assetList = Array.isArray(data.assets) ? data.assets : [];
          }
        }
      } catch (_) {}

      // 2. Fallback to direct fetch of production index.html
      if (!indexHtml) {
        const candidates = ['/dist/index.html', '/embedded-index.html'];
        for (const candidate of candidates) {
          try {
            const res = await fetch(candidate);
            if (res.ok) {
              const text = await res.text();
              if (text && !text.includes('/src/main.tsx')) {
                indexHtml = text;
                break;
              }
            }
          } catch (_) {}
        }
      }

      if (indexHtml) {
        // Remove crossorigin attributes to avoid Android WebView CORS blocks on local assets
        const cleanIndexHtml = indexHtml
          .replace(/\s+crossorigin(="[^"]*")?/gi, '');

        zip.file('app/src/main/assets/index.html', cleanIndexHtml);
        zip.file('app/src/main/assets/assets/index.html', cleanIndexHtml);

        // Collect all assets (scripts and stylesheets)
        const discoveredAssets = new Set<string>(assetList);

        const scriptMatches = [...cleanIndexHtml.matchAll(/src="([^"]+)"/g)];
        for (const m of scriptMatches) {
          discoveredAssets.add(m[1]);
        }

        const linkMatches = [...cleanIndexHtml.matchAll(/href="([^"]+)"/g)];
        for (const m of linkMatches) {
          discoveredAssets.add(m[1]);
        }

        for (const assetPath of discoveredAssets) {
          if (!assetPath || assetPath.startsWith('http') || assetPath.startsWith('//') || assetPath.includes('icon.svg') || assetPath.includes('manifest.json')) {
            continue;
          }
          const cleanPath = assetPath.replace(/^\/+/, '');
          const fileNameOnly = cleanPath.split('/').pop() || cleanPath;

          const fetchCandidates = [
            assetPath.startsWith('/') ? assetPath : '/' + assetPath,
            '/dist/' + cleanPath,
            '/assets/' + fileNameOnly
          ];

          for (const fetchUrl of fetchCandidates) {
            try {
              const res = await fetch(fetchUrl);
              if (res.ok) {
                const blob = await res.blob();
                // Store in all standard Android asset location formats for 100% path resolution
                zip.file(`app/src/main/assets/${cleanPath}`, blob);
                zip.file(`app/src/main/assets/${fileNameOnly}`, blob);
                zip.file(`app/src/main/assets/assets/${fileNameOnly}`, blob);
                break;
              }
            } catch (_) {}
          }
        }

        // Fetch icon.svg and manifest.json
        try {
          const iconRes = await fetch('/icon.svg');
          if (iconRes.ok) {
            const iconBlob = await iconRes.blob();
            zip.file('app/src/main/assets/icon.svg', iconBlob);
            zip.file('app/src/main/assets/assets/icon.svg', iconBlob);
          }
        } catch (_) {}

        try {
          const manifestRes = await fetch('/manifest.json');
          if (manifestRes.ok) {
            const manifestBlob = await manifestRes.blob();
            zip.file('app/src/main/assets/manifest.json', manifestBlob);
            zip.file('app/src/main/assets/assets/manifest.json', manifestBlob);
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Failed to embed web assets:', err);
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}
