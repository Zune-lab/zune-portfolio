package dev.zune.portfolio

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import dev.zune.portfolio.core.AppState
import dev.zune.portfolio.core.LocalApp
import dev.zune.portfolio.screens.RootScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val app = remember { AppState(applicationContext) }
            CompositionLocalProvider(LocalApp provides app) { RootScreen() }
        }
    }
}
