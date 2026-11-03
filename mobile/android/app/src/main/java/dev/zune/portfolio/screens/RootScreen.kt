package dev.zune.portfolio.screens

import android.app.Activity
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import dev.zune.portfolio.core.LocalApp
import dev.zune.portfolio.core.Site
import dev.zune.portfolio.core.theme
import dev.zune.portfolio.ui.Divider
import dev.zune.portfolio.ui.MText
import dev.zune.portfolio.ui.TorchSwitch
import dev.zune.portfolio.ui.box
import dev.zune.portfolio.ui.code
import dev.zune.portfolio.ui.tap
import kotlinx.coroutines.delay

/** Shell: top bar (logo, skin chip, light/dark switch) + page + bottom nav. Replaces Navbar.jsx. */
@Composable
fun RootScreen() {
    val app = LocalApp.current
    val store = app.themeStore
    val t = theme()
    var tab by rememberSaveable { mutableStateOf(Tab.HOME) }
    var showSkins by rememberSaveable { mutableStateOf(false) }

    // 1 s heartbeat: social battery recharge; every minute the status and the `auto` skin re-read the clock
    LaunchedEffect(Unit) {
        var s = 0
        while (true) {
            delay(1000)
            app.social.tick()
            if (++s % 60 == 0) { app.status.minuteTick(); store.refreshAuto() }
        }
    }

    // system bar icons follow the skin
    val view = LocalView.current
    SideEffect {
        val window = (view.context as? Activity)?.window ?: return@SideEffect
        WindowCompat.getInsetsController(window, view).apply {
            isAppearanceLightStatusBars = !store.isDark
            isAppearanceLightNavigationBars = !store.isDark
        }
    }

    Box(Modifier.fillMaxSize().background(t.bg).systemBarsPadding().imePadding()) {
        Column(Modifier.fillMaxSize()) {
            TopBar(onHome = { tab = Tab.HOME }, onSkins = { showSkins = true })
            Divider(t.line)
            Box(Modifier.weight(1f).fillMaxWidth()) {
                when (tab) {
                    Tab.HOME -> HomeScreen(onNavigate = { tab = it })
                    Tab.ABOUT -> AboutScreen()
                    Tab.PROJECTS -> ProjectsScreen()
                    Tab.LAB -> LabScreen()
                }
            }
            Divider(t.line)
            BottomBar(tab) { tab = it }
        }
        if (showSkins) SkinPicker(onClose = { showSkins = false })
    }
}

@Composable
private fun TopBar(onHome: () -> Unit, onSkins: () -> Unit) {
    val t = theme()
    val store = LocalApp.current.themeStore
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        MText(code("> " to t.amber, Site.HANDLE to t.text), t.text, 15f, FontWeight.Bold, modifier = Modifier.tap(onHome))
        Spacer(Modifier.weight(1f))
        Row(Modifier.box(t, androidx.compose.ui.graphics.Color.Transparent, radius = 50f).tap(onSkins).padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(9.dp).background(t.amber, CircleShape))
            Spacer(Modifier.width(6.dp))
            MText(if (store.isAuto) "auto · ${store.skin.label}" else store.skin.label, t.text, 12f)
        }
        Spacer(Modifier.width(8.dp))
        // light/dark: a single-mode skin locks it (the web's torch does the same)
        TorchSwitch(lit = store.isDark, enabled = store.canToggleMode) { store.toggleMode() }
    }
}

@Composable
private fun BottomBar(current: Tab, onSelect: (Tab) -> Unit) {
    val t = theme()
    Row(Modifier.fillMaxWidth().background(t.panel).padding(horizontal = 8.dp)) {
        Tab.entries.forEach { item ->
            val on = item == current
            Column(Modifier.weight(1f).tap { onSelect(item) }.padding(vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(3.dp)) {
                MText(item.glyph, if (on) t.amber else t.dim, 16f, FontWeight.Bold)
                MText(item.label, if (on) t.amber else t.dim, 10.5f, if (on) FontWeight.SemiBold else FontWeight.Normal)
            }
        }
    }
}
