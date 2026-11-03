package dev.zune.portfolio.core

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import dev.zune.portfolio.theme.Theme
import dev.zune.portfolio.theme.ThemeStore

/** The three app-wide stores (the Swift app injects them as environment objects). */
class AppState(context: Context) {
    val themeStore = ThemeStore(context)
    val status = StatusStore(context)
    val social = SocialStore().also { it.onKonami = { themeStore.unlockAll() } }
}

val LocalApp = staticCompositionLocalOf<AppState> { error("AppState not provided") }

/** Resolved colours of the current skin; recomposes the caller when the skin or mode changes. */
@Composable fun theme(): Theme = LocalApp.current.themeStore.theme
