package dev.zune.portfolio.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInParent
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import dev.zune.portfolio.core.LocalApp
import dev.zune.portfolio.core.Profile
import dev.zune.portfolio.core.Site
import dev.zune.portfolio.core.theme
import dev.zune.portfolio.theme.Theme
import dev.zune.portfolio.ui.BlinkCursor
import dev.zune.portfolio.ui.Body
import dev.zune.portfolio.ui.Flow
import dev.zune.portfolio.ui.MText
import dev.zune.portfolio.ui.Panel
import dev.zune.portfolio.ui.SectionHead
import dev.zune.portfolio.ui.WinCard
import dev.zune.portfolio.ui.box
import dev.zune.portfolio.ui.code
import dev.zune.portfolio.ui.tap
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.compose.runtime.rememberCoroutineScope
import java.time.LocalDate

private val facts = listOf(
    "role" to Site.ROLE,
    "based_in" to "${Site.LOCATION}, ${Site.COUNTRY}",
    "started_coding" to Profile.START_YEAR.toString(),
    "favorite_stack" to Profile.MAIN_STACK,
    "currently_learning" to Profile.LEARNING,
    "fun_fact" to Site.FUN_FACT,
    "coffee_or_tea" to Site.DRINK,
)

/** about.js / log.sh / skills.js (src/components/about/About.jsx) */
@Composable
fun AboutScreen() {
    val t = theme()
    val scroll = rememberScrollState()
    val scope = rememberCoroutineScope()
    val offsets = remember { mutableMapOf<String, Int>() }
    fun Modifier.anchor(id: String) = onGloballyPositioned { offsets[id] = it.positionInParent().y.toInt() }

    Box(Modifier.fillMaxWidth()) {
        Column(Modifier.verticalScroll(scroll).padding(horizontal = 20.dp, vertical = 24.dp), verticalArrangement = Arrangement.spacedBy(40.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                SectionHead("01", Tab.ABOUT.label, Modifier.padding(bottom = 0.dp))
                MText("// a few things about me", t.dim, 12.5f)
            }
            Column(Modifier.anchor("intro")) { Intro() }
            Column(Modifier.anchor("journey")) { Journey() }
            Column(Modifier.anchor("skills")) { Skills() }
        }
        // sub-nav (about.js · log.sh · skills.js)
        Row(
            Modifier.align(Alignment.BottomEnd).padding(12.dp).box(t, t.panel.copy(alpha = 0.95f), radius = 50f)
                .padding(horizontal = 14.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            listOf("about.js" to "intro", "log.sh" to "journey", "skills.js" to "skills").forEach { (label, id) ->
                MText(label, t.dim, 11.5f, modifier = Modifier.tap { scope.launch { scroll.animateScrollTo(offsets[id] ?: 0) } })
            }
        }
    }
}

@Composable
private fun Intro() {
    val t = theme()
    val info = LocalApp.current.status.info
    val years = LocalDate.now().year - Profile.START_YEAR
    Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
        WinCard("about.js", "JavaScript", footer = listOf("Ln ${facts.size + 5}, Col 1", "UTF-8", "Spaces: 2")) {
            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                MText(code("const " to t.cssLang, Site.ID to t.text, " = {" to t.dim), t.text)
                facts.forEach { (k, v) ->
                    val num = k == "started_coding"
                    MText(code("  $k: " to t.text, (if (num) v else "\"$v\"") to (if (num) t.js else t.green), "," to t.dim), t.text)
                }
                MText(code("  status: " to t.text, "\"${info.key.label}\"" to t.color(info.color), ",  " to t.dim, "// chillax guys" to t.dim), t.text)
                MText("};", t.dim)
                MText("// tap the status on the hero card to change it", t.dim, modifier = Modifier.padding(top = 6.dp))
                HelloLine()
            }
        }
        Panel(Modifier, padding = 18f) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                MText("// readme.md", t.dim, 12f)
                Body(Profile.aboutBlurb.replaceFirstChar { it.uppercase() }, t.text, 15f)
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Stat(years.toString(), "years coding", Modifier.weight(1f))
            Stat(Profile.gitLog.size.toString(), "commits in life.log", Modifier.weight(1f))
            Stat(Profile.stack.size.toString(), "tools in the stack", Modifier.weight(1f))
        }
    }
}

@Composable
private fun Stat(n: String, label: String, modifier: Modifier) {
    val t = theme()
    Column(modifier.box(t, t.inset).padding(vertical = 14.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        MText(n, t.amber, 26f, FontWeight.Bold)
        MText(label, t.dim, 10.5f, align = TextAlign.Center)
    }
}

/** `zune.hello()`: falls asleep when the social battery is empty (port of HelloLine in About.jsx, without the idle screensaver) */
@Composable
private fun HelloLine() {
    val t = theme()
    val app = LocalApp.current
    val asleep = app.social.isAsleep(app.status.key)
    var word by remember { mutableStateOf("hello") }
    var note by remember { mutableStateOf("") }
    LaunchedEffect(asleep) {
        val target = if (asleep) "sleep" else "hello"
        if (word == target) return@LaunchedEffect
        note = ""
        while (word.isNotEmpty()) { delay(60); word = word.dropLast(1) }
        for (ch in target) { delay(90); word += ch }
        note = if (asleep) " // zzz... social battery: 0%" else " // oh. hi. battery recharged"
        if (!asleep) { delay(3000); note = "" }
    }
    Row(Modifier.padding(top = 6.dp).alpha(if (asleep) 0.55f else 1f), verticalAlignment = Alignment.CenterVertically) {
        MText(code("${Site.ID}." to t.text, word to t.amber, "()" to t.text, note to t.dim), t.text)
        Spacer(Modifier.width(2.dp))
        BlinkCursor(7f, 14f)
    }
}

private fun typeColor(type: String, t: Theme): Color = when (type) {
    "init" -> t.text
    "feat" -> t.green
    "fix" -> t.danger
    "chore" -> t.dim
    "refactor" -> t.cssLang
    "revert", "wip" -> t.amber
    else -> t.dim
}

@Composable
private fun Journey() {
    val t = theme()
    val log = Profile.gitLog
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        MText("// log.sh", t.dim, 12.5f)
        WinCard("log.sh", "bash") {
            Column {
                MText("\$ git log --graph --oneline --reverse life", t.dim, 13f, modifier = Modifier.padding(bottom = 16.dp))
                log.forEachIndexed { i, e ->
                    val (type, text) = e.parts
                    val c = typeColor(type, t)
                    val isNow = e.date == "now"
                    Row(Modifier.height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(Modifier.size(10.dp).background(c, CircleShape))
                            if (i < log.lastIndex) Box(Modifier.width(1.dp).fillMaxHeight().background(t.line))
                        }
                        Column(Modifier.padding(bottom = 18.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                MText(e.hash, t.amber, 12f)
                                MText(e.date, t.green, 12f)
                                if (type.isNotEmpty()) MText(type, c, 10.5f, modifier = Modifier.box(t, Color.Transparent, radius = 4f, stroke = c.copy(alpha = 0.5f)).padding(horizontal = 6.dp, vertical = 1.dp))
                                if (isNow) MText("HEAD → main", t.amber, 10.5f, FontWeight.Bold)
                            }
                            Body(text, t.text, 14f)
                        }
                    }
                }
                Row(Modifier.padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    MText("$", t.dim, 13f); Spacer(Modifier.width(6.dp)); BlinkCursor(8f, 15f)
                }
            }
        }
    }
}

@Composable
private fun Skills() {
    val t = theme()
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        MText("// skills.js", t.dim, 12.5f)
        WinCard("skills.js", "JavaScript") {
            Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
                Profile.skills.forEach { (name, items) ->
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        MText("// $name", t.dim, 12f)
                        Flow {
                            items.forEach { s ->
                                Row(Modifier.box(t, t.panel, radius = 6f).padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                                    MText(s, t.text, 13f)
                                    if (s in Profile.learningSkills) { Spacer(Modifier.width(6.dp)); MText("learning", t.amber, 10f, italic = true) }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
