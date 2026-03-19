package com.nestora.app

import android.os.Bundle
import android.view.WindowManager
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // Apply system bar insets as padding so content doesn't overlap
    ViewCompat.setOnApplyWindowInsetsListener(window.decorView.findViewById(android.R.id.content)) { view, insets ->
      val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      view.updatePadding(
        top = systemBars.top,
        bottom = systemBars.bottom,
        left = systemBars.left,
        right = systemBars.right
      )
      insets
    }
  }
}
