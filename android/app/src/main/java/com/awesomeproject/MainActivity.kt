package com.awesomeproject

import android.content.Intent
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "AwesomeProject"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    Log.d("MainActivity", "onNewIntent called with action: ${intent?.action}")
    if (intent != null) {
      setIntent(intent)
      // Log the intent details for debugging
      Log.d("MainActivity", "Intent action: ${intent.action}")
      Log.d("MainActivity", "Intent type: ${intent.type}")
      Log.d("MainActivity", "Intent data: ${intent.data}")
      Log.d("MainActivity", "Intent extras: ${intent.extras}")
    }
  }

  override fun onCreate(savedInstanceState: android.os.Bundle?) {
    super.onCreate(savedInstanceState)
    Log.d("MainActivity", "onCreate called")
    intent?.let { intent ->
      Log.d("MainActivity", "Initial intent action: ${intent.action}")
      Log.d("MainActivity", "Initial intent type: ${intent.type}")
      Log.d("MainActivity", "Initial intent data: ${intent.data}")
    }
  }
}
