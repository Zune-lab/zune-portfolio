package dev.zune.portfolio.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.zune.portfolio.core.BATTERY_CELLS
import dev.zune.portfolio.core.LocalApp
import dev.zune.portfolio.core.Profile
import dev.zune.portfolio.core.Site
import dev.zune.portfolio.core.SiteTime
import dev.zune.portfolio.core.theme
import dev.zune.portfolio.core.toneOf
import dev.zune.portfolio.ui.MText
import dev.zune.portfolio.ui.box
import dev.zune.portfolio.ui.code
import dev.zune.portfolio.ui.pick
import dev.zune.portfolio.ui.tap
import kotlinx.coroutines.delay

/** `zune.sav`: the little character sheet in the hero (src/components/home/SheetCard.jsx) */
@Composable
fun SheetCard() {
    val t = theme()
    val app = LocalApp.current
    val status = app.status
    val social = app.social
    val info = status.info
    val level = social.level(status.key)
    val tone = toneOf(level).pick(t)
    val maxed = social.maxed
    val classes = remember { listOf<String?>(null) + Site.classes }
    var cls by remember { mutableIntStateOf(0) }
    var clock by remember { mutableStateOf(SiteTime.clock()) }
    LaunchedEffect(Unit) { while (true) { clock = SiteTime.clock(); delay(1000) } } // 1 s clock

    Column(Modifier.fillMaxWidth().box(t, t.inset, stroke = if (maxed) t.amber else t.line)) {
        Row(Modifier.fillMaxWidth().background(t.panel).padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            MText(if (maxed) "${Site.ID}.sav [MAX]" else "${Site.ID}.sav", t.dim, 13f, modifier = Modifier.weight(1f))
            Row(Modifier.tap { status.cycle() }, verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(8.dp).background(t.color(info.color), CircleShape))
                Spacer(Modifier.width(6.dp))
                MText(info.label + if (info.isAuto) " · auto" else "", t.color(info.color), 10.5f, FontWeight.SemiBold)
            }
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(t.line))

        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row {
                MText("class", t.dim, 13f, modifier = Modifier.width(84.dp))
                MText(code((classes[cls] ?: Site.ROLE) + " " to t.text, "↻" to t.dim), t.text, 13f, modifier = Modifier.tap { cls = (cls + 1) % classes.size })
            }
            Row {
                MText("location", t.dim, 13f, modifier = Modifier.width(84.dp))
                MText(code(Site.LOCATION to t.text, " · $clock ${SiteTime.gmtLabel()}" to t.dim), t.text, 13f)
            }
            Row { MText("main quest", t.dim, 13f, modifier = Modifier.width(84.dp)); MText(Profile.MAIN_STACK, t.text, 13f) }
            Row { MText("side quest", t.dim, 13f, modifier = Modifier.width(84.dp)); MText(Profile.LEARNING, t.text, 13f) }

            Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row { MText("social battery", t.dim, 13f, modifier = Modifier.weight(1f)); MText("$level%", tone, 13f) }
                Meter(level, tone, maxed)
            }
            Column(Modifier.fillMaxWidth().tap { social.friendship() }, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row { MText("personality unlocked", t.dim, 13f, modifier = Modifier.weight(1f)); MText("${social.personality}%", t.amber, 13f) }
                Meter(social.personality, t.amber, maxed)
                MText("// needs 6+ months of friendship", t.dim, 12f)
            }

            val asleep = social.isAsleep(status.key)
            Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                MText(
                    "\$ say hi", t.text, 13f,
                    modifier = Modifier.alpha(if (asleep) 0.4f else 1f)
                        .box(t, Color.Transparent, radius = 4f)
                        .then(if (asleep) Modifier else Modifier.tap { social.sayHi(status.key) })
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                )
                MText(social.reply, t.dim, 12.5f, modifier = Modifier.weight(1f).padding(top = 6.dp))
            }
        }
    }
}

/** 10-cell battery bar (BATTERY_CELLS); `rainbow` when the personality easter egg is on */
@Composable
fun Meter(value: Int, color: Color, rainbow: Boolean = false) {
    val t = theme()
    val on = Math.round(value / 100f * BATTERY_CELLS)
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(3.dp)) {
        for (i in 0 until BATTERY_CELLS) {
            val fill = if (i < on) (if (rainbow) Color.hsv(i * 36f, 0.7f, 0.95f) else color) else t.line
            Box(Modifier.weight(1f).height(12.dp).clip(RoundedCornerShape(t.r(2f).dp)).background(fill))
        }
    }
}
