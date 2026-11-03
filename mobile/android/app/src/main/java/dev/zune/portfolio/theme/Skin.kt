package dev.zune.portfolio.theme

import androidx.compose.ui.graphics.Color
import dev.zune.portfolio.core.ColorRole
import dev.zune.portfolio.core.ProjectColor

// Port of src/config/skins.js (types + helpers). The data itself is generated into SkinData.kt.
enum class Mode { DARK, LIGHT }

enum class SkinGroup(val title: String) {
    ORIGINAL("default"), EDITOR("editor themes"), SPECIAL("whole-site skins"), SECRET("secret")
}

data class Unlock(val game: String, val min: Int, val hint: String)

/** The 15 colour tokens every skin defines (same names as the CSS variables, camel-cased). 0xAARRGGBB. */
data class Palette(
    val bg: Long, val panel: Long, val inset: Long, val line: Long, val text: Long, val textDim: Long,
    val amber: Long, val amberDim: Long, val onAmber: Long, val glow: Long, val glowGreen: Long,
    val green: Long, val js: Long, val cssLang: Long, val danger: Long,
)

data class Skin(
    val id: String,
    val group: SkinGroup,
    val label: String,
    val note: String,
    val modes: List<Mode>,
    val rk: Float,            // corner-roundness factor (0 = square)
    val unlock: Unlock?,
    val palettes: Map<Mode, Palette>,
) {
    /** a skin with a single mode locks light/dark to it */
    val lockedMode: Mode? get() = if (modes.size == 1) modes[0] else null
    fun palette(mode: Mode): Palette = palettes[lockedMode ?: mode] ?: palettes.values.first()
}

object SkinCatalog {
    val byId: Map<String, Skin> = SkinData.all.associateBy { it.id }
    val fallback: Skin = byId.getValue(SkinData.DEFAULT_SKIN)
}

/** Resolved colours for the current skin + mode: what composables read. */
class Theme(val p: Palette, val rk: Float) {
    val bg = Color(p.bg)
    val panel = Color(p.panel)
    val inset = Color(p.inset)
    val line = Color(p.line)
    val text = Color(p.text)
    val dim = Color(p.textDim)
    val amber = Color(p.amber)
    val amberDim = Color(p.amberDim)
    val onAmber = Color(p.onAmber)
    val glow = Color(p.glow)
    val green = Color(p.green)
    val js = Color(p.js)
    val cssLang = Color(p.cssLang)
    val danger = Color(p.danger)
    // fixed "macOS window" dots (same in every skin on the web)
    val dotYellow = Color(0xFFFFBD2E)
    val dotGreen = Color(0xFF27C93F)

    /** every border-radius on the web is multiplied by the skin's --rk */
    fun r(base: Float): Float = base * rk

    fun color(role: ColorRole): Color = when (role) {
        ColorRole.GREEN -> green
        ColorRole.DIM -> dim
        ColorRole.AMBER -> amber
        ColorRole.CSS_LANG -> cssLang
        ColorRole.DANGER -> danger
        ColorRole.TEXT -> text
    }

    fun color(c: ProjectColor): Color = if (c == ProjectColor.JS) js else cssLang
}
