# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Keep our FileShareModule classes
-keep class com.awesomeproject.FileShareModule { *; }
-keep class com.awesomeproject.FileSharePackage { *; }

# Keep React Native bridge methods
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
}

# Keep React Native modules
-keep,allowobfuscation @interface com.facebook.react.bridge.ReactModule
-keep,allowobfuscation @interface com.facebook.react.bridge.ReactMethod

-keep @com.facebook.react.bridge.ReactModule class * { *; }

-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

-keepclassmembers class * {
    @com.facebook.react.bridge.ReactProp *;
    @com.facebook.react.bridge.ReactPropGroup *;
}
