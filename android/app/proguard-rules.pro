# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Capacitor 基础防混淆
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }

# WebView JS交互必须保留
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# 保留webview相关
-keep class android.webkit.** {*;}

# 如果有自定义原生插件，自行添加包名
# -keep class cn.com.tmiot.plugin.** {*;}

# 不删除注解
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
