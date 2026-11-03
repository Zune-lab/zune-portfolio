@file:OptIn(ExperimentalLayoutApi::class)

package dev.zune.portfolio.ui

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.zune.portfolio.core.Profile
import dev.zune.portfolio.core.Site
import dev.zune.portfolio.core.Tone
import dev.zune.portfolio.theme.Theme
import dev.zune.portfolio.core.theme
import kotlinx.coroutines.delay

// ------------------------------------------------------------------ text

/** Monospace text (the web's --f-mono); pass mono = false for the sans body copy. */
@Composable
fun MText(
    text: AnnotatedString, color: Color, size: Float = 13f, weight: FontWeight = FontWeight.Normal,
    modifier: Modifier = Modifier, mono: Boolean = true, italic: Boolean = false, align: TextAlign? = null,
    lineHeight: TextUnit = TextUnit.Unspecified,
) {
    BasicText(
        text = text, modifier = modifier,
        style = TextStyle(
            color = color, fontSize = size.sp, fontWeight = weight,
            fontFamily = if (mono) FontFamily.Monospace else FontFamily.SansSerif,
            fontStyle = if (italic) FontStyle.Italic else FontStyle.Normal,
            textAlign = align ?: TextAlign.Unspecified, lineHeight = lineHeight,
        ),
    )
}

@Composable
fun MText(
    text: String, color: Color, size: Float = 13f, weight: FontWeight = FontWeight.Normal, modifier: Modifier = Modifier,
    mono: Boolean = true, italic: Boolean = false, align: TextAlign? = null, lineHeight: TextUnit = TextUnit.Unspecified,
) = MText(AnnotatedString(text), color, size, weight, modifier, mono, italic, align, lineHeight)

/** body copy in the sans font, with a comfortable line height */
@Composable
fun Body(text: String, color: Color, size: Float = 16f, modifier: Modifier = Modifier) =
    MText(text, color, size, modifier = modifier, mono = false, lineHeight = (size * 1.5f).sp)

/** coloured pieces of a code-looking line */
fun code(vararg parts: Pair<String, Color>): AnnotatedString = buildAnnotatedString {
    parts.forEach { (s, c) -> withStyle(SpanStyle(color = c)) { append(s) } }
}

// ------------------------------------------------------------------ modifiers

/** bordered surface with the skin's corner roundness */
fun Modifier.box(t: Theme, fill: Color, radius: Float = 10f, stroke: Color = t.line): Modifier {
    val s = RoundedCornerShape(t.r(radius).dp)
    return this.clip(s).background(fill, s).border(1.dp, stroke, s)
}

/** clickable without a ripple (the web has hover colours, not ripples) */
fun Modifier.tap(onClick: () -> Unit): Modifier = composed {
    clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onClick)
}

// ------------------------------------------------------------------ building blocks

/** `01  projects/ ────────` section title (src/components/ui/SectionHead.jsx) */
@Composable
fun SectionHead(num: String, title: String, modifier: Modifier = Modifier) {
    val t = theme()
    Row(modifier.fillMaxWidth().padding(bottom = 20.dp), verticalAlignment = Alignment.CenterVertically) {
        MText(num, t.amber, 12f)
        Spacer(Modifier.width(12.dp))
        MText(title, t.text, 22f, FontWeight.Bold)
        Spacer(Modifier.width(12.dp))
        Box(Modifier.weight(1f).height(1.dp).background(t.line))
    }
}

@Composable
fun Panel(
    modifier: Modifier = Modifier, raised: Boolean = false, padding: Float = 16f, content: @Composable () -> Unit,
) {
    val t = theme()
    Column(modifier.fillMaxWidth().box(t, if (raised) t.panel else t.inset).padding(padding.dp)) { content() }
}

/** editor / terminal window with the three dots and a title bar (about.js, log.sh, skills.js) */
@Composable
fun WinCard(
    title: String, lang: String, footer: List<String> = emptyList(), content: @Composable () -> Unit,
) {
    val t = theme()
    Column(Modifier.fillMaxWidth().box(t, t.inset)) {
        Row(Modifier.fillMaxWidth().background(t.panel).padding(horizontal = 14.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf(t.danger, t.dotYellow, t.dotGreen).forEach { Box(Modifier.size(10.dp).background(it, CircleShape)) }
            }
            Spacer(Modifier.width(10.dp))
            MText(title, t.dim, 12f, modifier = Modifier.weight(1f))
            MText(lang, t.dim, 11f)
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(t.line))
        Column(Modifier.fillMaxWidth().padding(16.dp)) { content() }
        if (footer.isNotEmpty()) {
            Box(Modifier.fillMaxWidth().height(1.dp).background(t.line))
            Row(Modifier.fillMaxWidth().background(t.panel).padding(horizontal = 14.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                footer.forEach { MText(it, t.dim, 10.5f) }
            }
        }
    }
}

@Composable
fun Chip(text: String, tint: Color? = null, modifier: Modifier = Modifier) {
    val t = theme()
    val c = tint ?: t.amber
    val s = RoundedCornerShape(t.r(6f).dp)
    MText(
        text, c, 12.5f,
        modifier = modifier.clip(s).background(c.copy(alpha = 0.12f), s).border(BorderStroke(1.dp, c.copy(alpha = 0.4f)), s)
            .padding(horizontal = 10.dp, vertical = 5.dp),
    )
}

/** primary action (Btn31): filled amber, dark text; `ghost` = outlined */
@Composable
fun TermButton(title: String, ghost: Boolean = false, enabled: Boolean = true, onClick: () -> Unit) {
    val t = theme()
    val s = RoundedCornerShape(t.r(8f).dp)
    MText(
        title, if (ghost) t.text else t.onAmber, 14f, FontWeight.SemiBold,
        modifier = Modifier.alpha(if (enabled) 1f else 0.4f)
            .clip(s).background(if (ghost) Color.Transparent else t.amber, s)
            .border(1.dp, if (ghost) t.line else t.amber, s)
            .then(if (enabled) Modifier.tap(onClick) else Modifier)
            .padding(horizontal = 18.dp, vertical = 11.dp),
    )
}

/** `Scroll to continue ↓` style link */
@Composable
fun HeroLink(title: String, arrow: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    MText("$title $arrow", theme().text, 13f, modifier = modifier.tap(onClick).padding(vertical = 6.dp))
}

/** blinking block cursor (`.term-cursor`) */
@Composable
fun BlinkCursor(width: Float = 10f, height: Float = 22f) {
    val t = theme()
    val phase by rememberInfiniteTransition(label = "cursor").animateFloat(0f, 1f, infiniteRepeatable(tween(1000), RepeatMode.Restart), label = "p")
    Box(Modifier.width(width.dp).height(height.dp).alpha(if (phase < 0.5f) 1f else 0f).background(t.amber))
}

/** wrap-to-next-line row for chips */
@Composable
fun Flow(spacing: Float = 8f, content: @Composable () -> Unit) {
    FlowRow(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(spacing.dp),
        verticalArrangement = Arrangement.spacedBy(spacing.dp),
    ) { content() }
}

@Composable
fun Divider(color: Color, modifier: Modifier = Modifier) = Box(modifier.fillMaxWidth().height(1.dp).background(color))

fun tintFor(tech: String, t: Theme): Color = Profile.techColors[tech]?.let { Color(0xFF000000 or it) } ?: t.text

fun Tone.pick(t: Theme): Color = when (this) { Tone.HI -> t.green; Tone.MID -> t.amber; Tone.LO -> t.danger }

/** types the owner's phrases, deletes them, types the next (Hero.jsx Typewriter) */
@Composable
fun Typewriter(color: Color, size: Float) {
    var text by remember { mutableStateOf(Site.phrases[0]) }
    LaunchedEffect(Unit) {
        val phrases = Site.phrases
        var i = 0
        delay(2800)
        while (true) {
            for (n in phrases[i].length - 1 downTo 0) { text = phrases[i].take(n); delay(32) }
            i = (i + 1) % phrases.size
            delay(280)
            for (n in 1..phrases[i].length) { text = phrases[i].take(n); delay(75) }
            delay(2600)
        }
    }
    Row(verticalAlignment = Alignment.Bottom) {
        MText(text, color, size, FontWeight.Bold)
        Spacer(Modifier.width(6.dp))
        BlinkCursor(width = 12f, height = size * 0.9f)
    }
}
