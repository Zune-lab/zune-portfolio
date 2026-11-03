package dev.zune.portfolio.theme

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import dev.zune.portfolio.core.SiteTime
import dev.zune.portfolio.core.storageKey

/**
 * Port of src/lib/skin.js + useSkin.js: which skin (or "auto") and which light/dark mode is active.
 * A skin with one mode forces the mode but remembers the user's own pick for when they leave it.
 */
class ThemeStore(context: Context) {
    companion object { const val AUTO = "auto" }

    private val prefs = context.getSharedPreferences("zune", Context.MODE_PRIVATE)
    private val kSkin = storageKey("skin")
    private val kTheme = storageKey("theme")
    private val kUnlocked = storageKey("skins-unlocked")

    var skinChoice by mutableStateOf(
        prefs.getString(kSkin, null)?.takeIf { it == AUTO || SkinCatalog.byId.containsKey(it) } ?: SkinData.DEFAULT_SKIN
    )
        private set
    var modePref by mutableStateOf(if (prefs.getString(kTheme, "dark") == "light") Mode.LIGHT else Mode.DARK)
        private set
    var unlocked by mutableStateOf(prefs.getStringSet(kUnlocked, emptySet())?.toSet() ?: emptySet())
        private set
    /** bumped every minute so the `auto` skin follows the clock */
    private var tick by mutableLongStateOf(0L)

    val isAuto get() = skinChoice == AUTO

    val skin: Skin
        get() {
            tick // read: makes `auto` re-evaluate when the tick changes
            val id = if (isAuto) SkinData.autoByTod[SiteTime.timeOfDay().name.lowercase()] ?: SkinData.DEFAULT_SKIN else skinChoice
            val s = SkinCatalog.byId[id] ?: return SkinCatalog.fallback
            return if (isLocked(s)) SkinCatalog.fallback else s
        }
    val mode: Mode get() = skin.lockedMode ?: modePref
    val theme: Theme get() = skin.let { Theme(it.palette(mode), it.rk) }
    val canToggleMode: Boolean get() = skin.lockedMode == null
    val isDark: Boolean get() = mode == Mode.DARK

    /** id of the skin actually shown (resolves `auto`) */
    val skinId: String get() = skin.id
    fun isUnlocked(id: String) = SkinCatalog.byId[id]?.let { !isLocked(it) } ?: false

    fun isLocked(s: Skin) = s.unlock != null && s.id !in unlocked

    fun unlockAll() {
        unlocked = SkinData.all.filter { it.unlock != null }.map { it.id }.toSet()
        prefs.edit().putStringSet(kUnlocked, unlocked).apply()
    }

    /** call with a game's record; unlocks the skins whose condition it reaches and returns them (for the "skin unlocked" note) */
    fun report(game: String, score: Int): List<Skin> {
        val add = SkinData.all.filter { s -> s.unlock?.let { it.game == game && score >= it.min } == true && s.id !in unlocked }
        if (add.isNotEmpty()) {
            unlocked = unlocked + add.map { it.id }
            prefs.edit().putStringSet(kUnlocked, unlocked).apply()
        }
        return add
    }

    fun pick(id: String) {
        val ok = id == AUTO || SkinCatalog.byId[id]?.let { !isLocked(it) } == true
        if (!ok) return
        skinChoice = id
        prefs.edit().putString(kSkin, id).apply()
    }

    fun toggleMode() {
        if (!canToggleMode) return
        modePref = if (mode == Mode.DARK) Mode.LIGHT else Mode.DARK
        prefs.edit().putString(kTheme, if (modePref == Mode.LIGHT) "light" else "dark").apply()
    }

    fun refreshAuto() { tick++ }
}
