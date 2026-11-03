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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.zune.portfolio.core.Project
import dev.zune.portfolio.core.Projects
import dev.zune.portfolio.core.theme
import dev.zune.portfolio.ui.Body
import dev.zune.portfolio.ui.Flow
import dev.zune.portfolio.ui.MText
import dev.zune.portfolio.ui.SectionHead
import dev.zune.portfolio.ui.box
import dev.zune.portfolio.ui.tap

/** projects/: `$ ls projects/ | grep <q>` + tag chips (src/projects/Projects.jsx; the per-project CSS art is phase 4) */
@Composable
fun ProjectsScreen() {
    val t = theme()
    var query by remember { mutableStateOf("") }
    var tag by remember { mutableStateOf("") }

    // matches name, description or tag, like the web
    val s = query.trim().lowercase()
    val list = Projects.all.filter { p ->
        (tag.isEmpty() || tag in p.tags) &&
            (s.isEmpty() || (listOf(p.file, p.desc) + p.tags).joinToString(" ").lowercase().contains(s))
    }

    Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 24.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        SectionHead("01", Tab.PROJECTS.label, Modifier.padding(bottom = 0.dp))

        Row(Modifier.fillMaxWidth().box(t, t.inset, radius = 8f).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            MText("\$ ls projects/ | grep", t.dim, 13f)
            Spacer(Modifier.width(8.dp))
            BasicTextField(
                value = query, onValueChange = { query = it }, singleLine = true,
                textStyle = TextStyle(color = t.text, fontSize = 14.sp, fontFamily = FontFamily.Monospace),
                cursorBrush = SolidColor(t.amber),
                modifier = Modifier.weight(1f),
            )
            if (query.isNotEmpty()) MText("✕", t.dim, 13f, modifier = Modifier.tap { query = "" }.padding(horizontal = 8.dp))
            MText("${list.size}/${Projects.all.size}", t.dim, 12f)
        }

        Flow {
            listOf("") .plus(Projects.tags).forEach { tg ->
                val on = tag == tg
                MText(
                    if (tg.isEmpty()) "all" else "--$tg", if (on) t.onAmber else t.dim, 12.5f,
                    modifier = Modifier.box(t, if (on) t.amber else Color.Transparent, radius = 6f, stroke = if (on) t.amber else t.line)
                        .tap { tag = if (on) "" else tg }.padding(horizontal = 10.dp, vertical = 5.dp),
                )
            }
        }

        if (list.isEmpty()) {
            Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                MText("grep: no match.", t.dim, 13f)
                MText("clear filters", t.amber, 13f, modifier = Modifier.tap { query = ""; tag = "" })
            }
        } else list.forEach { ProjectCard(it) }
    }
}

@Composable
private fun ProjectCard(p: Project) {
    val t = theme()
    val uri = LocalUriHandler.current
    Column(Modifier.fillMaxWidth().box(t, t.inset).tap { uri.openUri(p.href) }) {
        Box(Modifier.fillMaxWidth().height(110.dp).background(t.panel).background(Brush.linearGradient(listOf(t.color(p.color).copy(alpha = 0.25f), Color.Transparent)))) {
            MText("</>", t.color(p.color).copy(alpha = 0.85f), 40f, FontWeight.Bold, modifier = Modifier.align(Alignment.Center))
            MText(p.tags.joinToString(" "), t.dim, 11f, modifier = Modifier.align(Alignment.BottomStart).padding(12.dp))
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(t.line))
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                MText(p.file, t.color(p.color), 15f, FontWeight.SemiBold, modifier = Modifier.weight(1f))
                MText("open ↗", t.amber, 12f)
            }
            Body(p.desc, t.dim, 14f)
            p.facts.forEach { f ->
                Row { MText(f.key, t.dim, 12.5f, modifier = Modifier.width(84.dp)); MText(f.value, t.text, 12.5f) }
            }
        }
    }
}
