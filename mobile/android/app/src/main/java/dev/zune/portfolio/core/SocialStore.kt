package dev.zune.portfolio.core

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

// Port of src/lib/social.js: Zune's "social battery". Saying hi drains it, it recharges ~1%/second,
// and tapping the personality bar 6 times unlocks the 100% easter egg (which also unlocks the secret skins).
const val BATTERY_CELLS = 10
enum class Tone { HI, MID, LO }
fun toneOf(level: Int) = if (level > 50) Tone.HI else if (level > 20) Tone.MID else Tone.LO

class SocialStore {
    private val base = mapOf(StatusKey.ONLINE to 80, StatusKey.BUSY to 40, StatusKey.FOCUS to 20, StatusKey.OFFLINE to 10)
    private val replies = listOf("hi.", "oh. hello again.", "ok, that was a lot of talking", "running low on words...")

    var drain by mutableIntStateOf(0); private set
    var months by mutableIntStateOf(0); private set
    var maxed by mutableStateOf(false); private set
    var reply by mutableStateOf(""); private set
    var onKonami: (() -> Unit)? = null
    private var maxedUntil = 0L

    private fun b(key: StatusKey) = base.getValue(key)

    fun level(key: StatusKey) = if (maxed) 100 else maxOf(0, b(key) - drain)
    fun isAsleep(key: StatusKey) = !maxed && b(key) - drain <= 0
    val personality get() = if (maxed) 100 else 12 + months

    /** called once a second by the root composable: recharge 1%/s and end the easter egg after 9 s */
    fun tick() {
        if (drain > 0) drain -= 1
        if (maxed && System.currentTimeMillis() >= maxedUntil) {
            maxed = false
            reply = "ok. that is enough personality for today."
        }
    }

    fun sayHi(key: StatusKey) {
        if (maxed) { reply = "HI!!! :D (this is not normal)"; return }
        if (b(key) - drain <= 0) return // out of battery: no more talking
        val next = drain + 20
        drain = next
        reply = if (b(key) - next <= 0) "${Site.ID} has left the chat. (recharging...)"
        else replies[minOf(Math.ceil(next / 20.0).toInt() - 1, replies.size - 1)]
    }

    fun friendship() {
        if (maxed) return
        if (months + 1 >= 6) return unlock("6 months of friendship in 6 clicks. speedrun accepted.")
        months += 1
        reply = "month $months/6... keep going"
    }

    fun konami() = unlock("konami accepted. personality 100%. who let this happen?")

    private fun unlock(msg: String) {
        maxed = true; months = 0; reply = msg
        maxedUntil = System.currentTimeMillis() + 9_000
        onKonami?.invoke() // bonus: unlock every secret skin
    }
}
