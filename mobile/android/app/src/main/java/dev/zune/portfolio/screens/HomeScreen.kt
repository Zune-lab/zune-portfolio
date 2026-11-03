package dev.zune.portfolio.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import dev.zune.portfolio.core.Lab
import dev.zune.portfolio.core.LabKind
import dev.zune.portfolio.core.Profile
import dev.zune.portfolio.core.Projects
import dev.zune.portfolio.core.Site
import dev.zune.portfolio.core.theme
import dev.zune.portfolio.theme.Theme
import dev.zune.portfolio.ui.Body
import dev.zune.portfolio.ui.Chip
import dev.zune.portfolio.ui.Flow
import dev.zune.portfolio.ui.HeroLink
import dev.zune.portfolio.ui.MText
import dev.zune.portfolio.ui.Panel
import dev.zune.portfolio.ui.SectionHead
import dev.zune.portfolio.ui.TermButton
import dev.zune.portfolio.ui.Typewriter
import dev.zune.portfolio.ui.box
import dev.zune.portfolio.ui.code
import dev.zune.portfolio.ui.tap
import dev.zune.portfolio.ui.tintFor
import kotlinx.coroutines.launch

enum class Tab(val label: String, val glyph: String) {
    HOME("home", ">_"), ABOUT("about.js", "{ }"), PROJECTS("projects/", "/"), LAB("lab.css", "~")
}

fun labTint(k: LabKind, t: Theme) = when (k) { LabKind.GAME -> t.green; LabKind.TOY -> t.cssLang; LabKind.TOOL -> t.amber }

private const val TERMINAL = 1
private const val FEATURED = 2
private const val CONTACT = 5

/** Home = Hero → Terminal → Featured → About teaser → Lab teaser → Contact (same order as App.jsx) */
@Composable
fun HomeScreen(onNavigate: (Tab) -> Unit) {
    val state = rememberLazyListState()
    val scope = rememberCoroutineScope()
    fun scrollTo(i: Int) { scope.launch { state.animateScrollToItem(i) } }

    LazyColumn(
        state = state,
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(56.dp),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(start = 20.dp, end = 20.dp, top = 24.dp, bottom = 40.dp),
    ) {
        item { Hero(onContinue = { scrollTo(TERMINAL) }, onProjects = { scrollTo(FEATURED) }, onContact = { scrollTo(CONTACT) }, onNavigate = onNavigate) }
        // the web hides the terminal on the retro-os skin, where Clippy takes over: Clippy arrives in phase 4
        item {
            Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
                MText("// type a command, or just tap a question below", theme().dim, 12.5f)
                TerminalScreen(onNavigate)
            }
        }
        item { Featured(onNavigate) }
        item { AboutTeaser(onNavigate) }
        item { LabTeaser(onNavigate) }
        item { Column { SectionHead("04", "contact.sh"); ContactSection() } }
        item { Footer() }
    }
}

@Composable
private fun Hero(onContinue: () -> Unit, onProjects: () -> Unit, onContact: () -> Unit, onNavigate: (Tab) -> Unit) {
    val t = theme()
    Column(verticalArrangement = Arrangement.spacedBy(22.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            MText(code("Hi, I'm " to t.text, Site.NAME to t.amber, "." to t.text), t.text, 34f, FontWeight.Bold)
            Typewriter(t.text, 34f)
        }
        Body(Site.HERO_INTRO, t.text, 17f)
        MText(Site.HERO_NOTE, t.dim, 13f)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            TermButton("view projects", onClick = onProjects)
            TermButton("contact", ghost = true, onClick = onContact)
        }
        SheetCard()
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            HeroLink("Scroll to continue", "↓", onClick = onContinue)
            HeroLink("Projects", "↗") { onNavigate(Tab.PROJECTS) }
        }
    }
}

/** accordion of the featured projects (the web swaps a CSS art preview, which is a phase-4 item) */
@Composable
private fun Featured(onNavigate: (Tab) -> Unit) {
    val t = theme()
    val uri = LocalUriHandler.current
    val list = Projects.featured
    var selected by remember { mutableIntStateOf(0) }
    val p = list[selected.coerceIn(0, list.lastIndex)]

    Column {
        SectionHead("01", Tab.PROJECTS.label)
        Box(
            Modifier.fillMaxWidth().height(180.dp).box(t, t.panel).tap { uri.openUri(p.href) }
                .background(Brush.linearGradient(listOf(t.color(p.color).copy(alpha = 0.22f), androidx.compose.ui.graphics.Color.Transparent))),
        ) {
            MText("</>", t.color(p.color).copy(alpha = 0.85f), 54f, FontWeight.Bold, modifier = Modifier.align(Alignment.Center))
            MText(p.file, t.dim, 12f, modifier = Modifier.align(Alignment.BottomStart).padding(start = 16.dp, bottom = 12.dp))
        }
        Spacer(Modifier.height(20.dp))

        list.forEachIndexed { n, q ->
            val on = n == selected
            Box(Modifier.fillMaxWidth().height(1.dp).background(t.line))
            // the amber bar on the left of the open row
            Row(Modifier.fillMaxWidth().drawBehind { if (on) drawRect(t.amber, size = Size(2.dp.toPx(), size.height)) }) {
                Column(Modifier.fillMaxWidth().padding(start = 14.dp)) {
                    Row(Modifier.fillMaxWidth().tap { selected = n }.padding(vertical = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                        MText("%02d".format(n + 1), t.dim, 12f)
                        Spacer(Modifier.width(12.dp))
                        MText(q.file, if (on) t.amber else t.text, 15f, modifier = Modifier.weight(1f))
                        MText(if (on) "⌄" else "›", t.dim, 15f)
                    }
                    AnimatedVisibility(visible = on) {
                        Column(Modifier.padding(start = 28.dp, bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Body(q.desc, t.dim, 14f)
                            q.facts.forEach { f ->
                                Row { MText(f.key, t.dim, 13f, modifier = Modifier.width(84.dp)); MText(f.value, t.text, 13f) }
                            }
                            MText("open →", t.amber, 13f, modifier = Modifier.tap { uri.openUri(q.href) }.padding(top = 4.dp))
                        }
                    }
                }
            }
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(t.line))
        HeroLink("All projects", "→", Modifier.padding(top = 22.dp)) { onNavigate(Tab.PROJECTS) }
    }
}

@Composable
private fun AboutTeaser(onNavigate: (Tab) -> Unit) {
    val t = theme()
    Column {
        SectionHead("02", Tab.ABOUT.label)
        Body("${Site.ROLE} in ${Site.LOCATION}, ${Profile.aboutBlurb}", t.text, 17f)
        Spacer(Modifier.height(20.dp))
        Flow { Profile.stack.forEach { Chip(it, tintFor(it, t)) } }
        Spacer(Modifier.height(24.dp))
        Panel {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                MText("\$ git log --oneline -5", t.dim, 13f)
                Profile.gitLog.takeLast(5).forEach { e ->
                    Column(Modifier.padding(bottom = 4.dp)) {
                        MText(code(e.hash + "  " to t.amber, e.date to t.green), t.text, 13f)
                        MText(e.msg, t.text, 13f)
                    }
                }
            }
        }
        HeroLink("More about me", "→", Modifier.padding(top = 18.dp)) { onNavigate(Tab.ABOUT) }
    }
}

@Composable
private fun LabTeaser(onNavigate: (Tab) -> Unit) {
    val t = theme()
    Column {
        SectionHead("03", Tab.LAB.label)
        Body("Tiny games and toys I build just to see if they work.", t.dim)
        Spacer(Modifier.height(20.dp))
        Flow(10f) { Lab.items.forEach { Chip(it.file, labTint(it.kind, t), Modifier.tap { onNavigate(Tab.LAB) }) } }
        HeroLink("Open the lab", "→", Modifier.padding(top = 18.dp)) { onNavigate(Tab.LAB) }
    }
}

@Composable
private fun Footer() {
    val t = theme()
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Box(Modifier.fillMaxWidth().height(1.dp).background(t.line))
        Spacer(Modifier.height(8.dp))
        MText("© ${Site.YEAR} ${Site.NAME} · ${Site.MOOD}", t.dim, 11.5f)
        MText("code: MIT · personal content: all rights reserved", t.dim.copy(alpha = 0.8f), 11f)
    }
}
