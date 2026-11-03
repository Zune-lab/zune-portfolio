package dev.zune.portfolio.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.zune.portfolio.core.Lab
import dev.zune.portfolio.core.LabItem
import dev.zune.portfolio.games.BugSquashGame
import dev.zune.portfolio.games.MemoryMatchGame
import dev.zune.portfolio.games.SnakeGame
import dev.zune.portfolio.core.LabKind
import dev.zune.portfolio.core.theme
import dev.zune.portfolio.ui.Body
import dev.zune.portfolio.ui.Chip
import dev.zune.portfolio.ui.Flow
import dev.zune.portfolio.ui.MText
import dev.zune.portfolio.ui.Panel
import dev.zune.portfolio.ui.SectionHead
import dev.zune.portfolio.ui.box
import dev.zune.portfolio.ui.tap

/**
 * lab.css: grid of tiny toys, games and tools (src/components/lab/Lab/Lab.jsx).
 * The 10 experiments themselves (canvas games, creatures, sound) are ported in phase 4: for now each card shows its blurb.
 */
/** slugs that already have a native version (the rest arrive in the next phase) */
private val PLAYABLE = setOf("snake", "bug-squash", "memory-match", "reptile", "moths", "banner-maker", "cat")

@Composable
fun LabScreen() {
    val t = theme()
    var kind by remember { mutableStateOf<LabKind?>(null) }
    var playing by remember { mutableStateOf<LabItem?>(null) }
    val items = Lab.items.filter { kind == null || it.kind == kind }

    playing?.let { item ->
        // detail page of one experiment (a back arrow + the game)
        androidx.activity.compose.BackHandler { playing = null }
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 24.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
            MText("← ${Tab.LAB.label}", t.amber, 13f, modifier = Modifier.tap { playing = null })
            Row(verticalAlignment = Alignment.CenterVertically) {
                MText(item.file, t.text, 20f, FontWeight.Bold, modifier = Modifier.weight(1f))
                Chip(item.kind.label, labTint(item.kind, t))
            }
            Body(item.blurb, t.dim, 14f)
            when (item.slug) {
                "snake" -> SnakeGame()
                "bug-squash" -> BugSquashGame()
                "memory-match" -> MemoryMatchGame()
                "reptile" -> dev.zune.portfolio.creatures.CreatureStage(dev.zune.portfolio.creatures::makeReptile)
                "moths" -> dev.zune.portfolio.creatures.CreatureStage(dev.zune.portfolio.creatures::makeMoths)
                "banner-maker" -> dev.zune.portfolio.banner.BannerMakerScreen()
                "cat" -> dev.zune.portfolio.creatures.CatToy()
            }
        }
        return
    }

    Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 24.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        SectionHead("01", Tab.LAB.label, Modifier.padding(bottom = 0.dp))
        Body("Tiny games and toys I build just to see if they work.", t.dim)

        Flow {
            FilterChip("all", kind == null) { kind = null }
            LabKind.entries.forEach { k -> FilterChip(k.label, kind == k) { kind = if (kind == k) null else k } }
        }

        items.forEach { i ->
            val playable = i.slug in PLAYABLE
            Panel(Modifier.tap { if (playable) playing = i }) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        MText(i.file, t.text, 15f, FontWeight.SemiBold, modifier = Modifier.weight(1f))
                        Chip(i.kind.label, labTint(i.kind, t))
                    }
                    Body(i.blurb, t.dim, 14f)
                    if (playable) MText("play →", t.amber, 11.5f)
                    else MText("// native port: coming in the next phase", t.dim.copy(alpha = 0.7f), 11.5f)
                }
            }
        }
    }
}

@Composable
private fun FilterChip(label: String, on: Boolean, onClick: () -> Unit) {
    val t = theme()
    MText(
        label, if (on) t.onAmber else t.dim, 12.5f,
        modifier = Modifier.box(t, if (on) t.amber else Color.Transparent, radius = 6f, stroke = if (on) t.amber else t.line)
            .tap(onClick).padding(horizontal = 10.dp, vertical = 5.dp),
    )
}
