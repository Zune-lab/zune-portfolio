package dev.zune.portfolio.screens

import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.zune.portfolio.core.Site
import dev.zune.portfolio.core.Socials
import dev.zune.portfolio.core.theme
import dev.zune.portfolio.ui.Flow
import dev.zune.portfolio.ui.MText
import dev.zune.portfolio.ui.Panel
import dev.zune.portfolio.ui.TermButton
import dev.zune.portfolio.ui.box
import dev.zune.portfolio.ui.tap
import kotlinx.coroutines.delay

private enum class Mood(val tag: String, val glyph: String, val label: String) {
    GOOD(" (liked it)", "+1", "I like this page"),
    BAD(" (not a fan)", "-1", "Not a fan"),
}

/**
 * Feedback form + socials (src/components/home/Feedback.jsx, Socials.jsx).
 * No backend: the message opens the mail app, exactly like the web's mailto:.
 */
@Composable
fun ContactSection() {
    val t = theme()
    val ctx = LocalContext.current
    val uri = LocalUriHandler.current
    var text by remember { mutableStateOf("") }
    var mood by remember { mutableStateOf<Mood?>(null) }
    var note by remember { mutableStateOf("") }
    var copied by remember { mutableStateOf(false) }
    LaunchedEffect(copied) { if (copied) { delay(2000); copied = false } }

    fun send() {
        val message = text.trim()
        if (message.isEmpty()) return
        // ACTION_SENDTO + extras has no URL-length limit (the web has to trim long mailto: links)
        val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:")).apply {
            putExtra(Intent.EXTRA_EMAIL, arrayOf(Site.EMAIL))
            putExtra(Intent.EXTRA_SUBJECT, "Feedback from ${Site.HANDLE}${mood?.tag ?: ""}")
            putExtra(Intent.EXTRA_TEXT, message)
        }
        note = try {
            ctx.startActivity(intent)
            "Mail app should open. If nothing happens, email ${Site.EMAIL} directly - thanks!"
        } catch (_: ActivityNotFoundException) {
            copy(ctx, message)
            "No mail app found, your message was copied to the clipboard. Or email ${Site.EMAIL} directly."
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(28.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            MText("// even a one-line note is fine, I read everything", t.dim, 12.5f)
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    BasicTextField(
                        value = text, onValueChange = { text = it },
                        textStyle = TextStyle(color = t.text, fontSize = 15.sp),
                        cursorBrush = SolidColor(t.amber),
                        modifier = Modifier.fillMaxWidth().heightIn(min = 110.dp).box(t, t.panel, radius = 8f).padding(12.dp),
                        decorationBox = { inner ->
                            Box {
                                if (text.isEmpty()) MText("Write something about this page...", t.dim, 15f, mono = false)
                                inner()
                            }
                        },
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Mood.entries.forEach { m ->
                                val on = mood == m
                                MText(
                                    m.glyph, if (on) t.onAmber else t.dim, 13f, FontWeight.SemiBold, align = TextAlign.Center,
                                    modifier = Modifier.size(38.dp).box(t, if (on) t.amber else t.panel, radius = 8f, stroke = if (on) t.amber else t.line)
                                        .tap { mood = if (on) null else m }.padding(top = 10.dp),
                                )
                            }
                        }
                        TermButton("send →", enabled = text.isNotBlank(), onClick = ::send)
                    }
                    if (note.isNotEmpty()) MText(note, t.green, 12f)
                }
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            MText("// no mail app? copy my email and write from anywhere", t.dim, 12.5f)
            Row(
                Modifier.fillMaxWidth().box(t, t.inset, radius = 8f).tap { copy(ctx, Site.EMAIL); copied = true }.padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                MText(Site.EMAIL, t.text, 13f, modifier = Modifier.weight(1f))
                MText(if (copied) "copied ✓" else "copy", if (copied) t.green else t.amber, 12f)
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            MText("// find me elsewhere", t.dim, 12.5f)
            Flow(10f) {
                Socials.all.forEach { s ->
                    Row(
                        Modifier.box(t, t.inset, radius = 8f).tap { uri.openUri(s.url) }.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        MText(
                            s.glyph, Color.White, 11f, FontWeight.Bold, align = TextAlign.Center,
                            modifier = Modifier.size(26.dp).clip(CircleShape).background(Color(s.brand)).padding(top = 6.dp),
                        )
                        Spacer(Modifier.width(8.dp))
                        MText(s.name, t.text, 13f)
                    }
                }
            }
        }
    }
}

private fun copy(ctx: Context, s: String) {
    (ctx.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("zune", s))
}
