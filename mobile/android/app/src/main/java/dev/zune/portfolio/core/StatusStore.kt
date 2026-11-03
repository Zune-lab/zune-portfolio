package dev.zune.portfolio.core

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

// Port of src/lib/status.js. online/offline is inferred from the owner's clock (no backend);
// busy/focus can only be picked by hand. The choice is saved on this device only.
enum class StatusKey { ONLINE, OFFLINE, BUSY, FOCUS; val label get() = name.lowercase() }
enum class StatusOverride { AUTO, BUSY, FOCUS, OFFLINE }
enum class ColorRole { GREEN, DIM, AMBER, CSS_LANG, DANGER, TEXT }

data class StatusInfo(
    val key: StatusKey, val isAuto: Boolean,
    val label: String,   // shown on the zune.sav badge
    val blurb: String,   // printed by the terminal
    val color: ColorRole, val pulse: Boolean,
)

class StatusStore(context: Context) {
    private val prefs = context.getSharedPreferences("zune", Context.MODE_PRIVATE)
    private val storeKey = storageKey("status-override")

    var choice by mutableStateOf(
        prefs.getString(storeKey, null)?.let { s -> StatusOverride.entries.firstOrNull { it.name.equals(s, true) } } ?: StatusOverride.AUTO
    )
        private set
    /** bumped once a minute so an `auto` status re-evaluates the clock */
    private var minute by mutableIntStateOf(0)

    fun minuteTick() { minute++ }

    val key: StatusKey
        get() {
            minute
            return when (choice) {
                StatusOverride.AUTO -> if (SiteTime.isOnlineHour()) StatusKey.ONLINE else StatusKey.OFFLINE
                StatusOverride.BUSY -> StatusKey.BUSY
                StatusOverride.FOCUS -> StatusKey.FOCUS
                StatusOverride.OFFLINE -> StatusKey.OFFLINE
            }
        }

    val info: StatusInfo
        get() {
            val k = key
            val auto = choice == StatusOverride.AUTO
            return when (k) {
                StatusKey.ONLINE -> StatusInfo(k, auto, "online", "open to new projects", ColorRole.GREEN, true)
                StatusKey.OFFLINE -> StatusInfo(k, auto, "offline", "offline right now, will reply later", ColorRole.DIM, false)
                StatusKey.BUSY -> StatusInfo(k, auto, "busy - replies may be slow", "busy, replies may be slow", ColorRole.AMBER, false)
                StatusKey.FOCUS -> StatusInfo(k, auto, "in focus mode", "in focus mode, replies may be slow", ColorRole.CSS_LANG, false)
            }
        }

    /** auto → busy → focus → offline → auto */
    fun cycle() {
        val all = StatusOverride.entries
        choice = all[(choice.ordinal + 1) % all.size]
        prefs.edit().apply { if (choice == StatusOverride.AUTO) remove(storeKey) else putString(storeKey, choice.name.lowercase()) }.apply()
    }
}
