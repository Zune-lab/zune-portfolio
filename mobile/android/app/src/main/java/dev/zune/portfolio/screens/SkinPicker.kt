package dev.zune.portfolio.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.zune.portfolio.core.LocalApp
import dev.zune.portfolio.core.Site
import dev.zune.portfolio.core.theme
import dev.zune.portfolio.theme.Skin
import dev.zune.portfolio.theme.SkinCatalog
import dev.zune.portfolio.theme.SkinData
import dev.zune.portfolio.theme.SkinGroup
import dev.zune.portfolio.theme.ThemeStore
import dev.zune.portfolio.ui.Divider
import dev.zune.portfolio.ui.MText
import dev.zune.portfolio.ui.box
import dev.zune.portfolio.ui.tap

/** Skin picker (src/components/layout/Skin/SkinPalette.jsx): tap = apply live, secret skins stay locked until earned. */
@Composable
fun SkinPicker(onClose: () -> Unit) {
    val t = theme()
    val store = LocalApp.current.themeStore
    BackHandler(onBack = onClose)

    Column(Modifier.fillMaxSize().background(t.bg)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
            MText("skins", t.text, 18f, FontWeight.Bold, modifier = Modifier.weight(1f))
            MText("done", t.amber, 14f, modifier = Modifier.tap(onClose).padding(8.dp))
        }
        Divider(t.line)
        Column(Modifier.verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(22.dp)) {
            Section("auto") {
                val accents = SkinData.autoByTod.values.sorted().mapNotNull { SkinCatalog.byId[it] }.map { swatch(it, store) }.map { it[2] }
                SkinRow(store, ThemeStore.AUTO, "auto", "picks a skin by the time of day in ${Site.LOCATION}", accents, false)
            }
            SkinGroup.entries.forEach { g ->
                Section(g.title) {
                    SkinData.all.filter { it.group == g }.forEach { s ->
                        val locked = store.isLocked(s)
                        SkinRow(store, s.id, s.label, if (locked) s.unlock?.hint ?: "locked" else s.note, swatch(s, store), locked)
                    }
                }
            }
        }
    }
}

/** [bg, panel, accent, text] of the skin in the current mode (the web's swatch) */
private fun swatch(s: Skin, store: ThemeStore): List<Color> {
    val p = s.palette(store.mode)
    return listOf(p.bg, p.panel, p.amber, p.text).map { Color(it) }
}

@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    val t = theme()
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        MText(title.uppercase(), t.dim, 12f)
        content()
    }
}

@Composable
private fun SkinRow(store: ThemeStore, id: String, label: String, note: String, swatch: List<Color>, locked: Boolean) {
    val t = theme()
    val on = store.skinChoice == id
    Row(
        Modifier.fillMaxWidth().alpha(if (locked) 0.55f else 1f)
            .box(t, t.inset, radius = 8f, stroke = if (on) t.amber else t.line)
            .then(if (locked) Modifier else Modifier.tap { store.pick(id) })
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(Modifier.width(56.dp).height(28.dp).clip(RoundedCornerShape(5.dp))) {
            swatch.forEach { Box(Modifier.weight(1f).fillMaxSize().background(it)) }
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            MText(label, t.text, 14f, FontWeight.SemiBold)
            MText(note, t.dim, 11.5f)
        }
        if (locked) MText("locked", t.dim, 11f) else if (on) MText("✓", t.amber, 16f)
    }
}
