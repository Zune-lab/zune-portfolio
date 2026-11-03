package dev.zune.portfolio.core

import java.time.Instant
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

// Port of src/lib/siteTime.js: "the owner's clock" drives the online/offline status, the auto skin and the clock on zune.sav.
enum class TimeOfDay { DAWN, DAY, DUSK, NIGHT }

object SiteTime {
    private val clockFmt = DateTimeFormatter.ofPattern("HH:mm:ss")

    fun hour(): Int = ZonedDateTime.now(Site.zone).hour

    /** dawn [dawn, day) | day [day, dusk) | dusk [dusk, night) | night [night, dawn) (wraps midnight) */
    fun timeOfDay(h: Int = hour()): TimeOfDay = when {
        h >= Site.NIGHT || h < Site.DAWN -> TimeOfDay.NIGHT
        h < Site.DAY -> TimeOfDay.DAWN
        h < Site.DUSK -> TimeOfDay.DAY
        else -> TimeOfDay.DUSK
    }

    /** online = day + dusk; offline = dawn + night */
    fun isOnlineHour(h: Int = hour()): Boolean = h >= Site.DAY && h < Site.NIGHT

    /** HH:MM:SS in the owner's timezone */
    fun clock(): String = ZonedDateTime.now(Site.zone).format(clockFmt)

    private val dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy, HH:mm:ss")

    /** like JS `toLocaleString('en-GB', { timeZone })`: 31/10/2026, 14:05:09 */
    fun dateTime(): String = ZonedDateTime.now(Site.zone).format(dateFmt)

    /** e.g. "GMT+7" (follows the timezone, including DST) */
    fun gmtLabel(): String {
        val secs = Site.zone.rules.getOffset(Instant.now()).totalSeconds
        val sign = if (secs < 0) "-" else "+"
        val h = Math.abs(secs) / 3600
        val m = Math.abs(secs) % 3600 / 60
        return if (m == 0) "GMT$sign$h" else "GMT$sign$h:${"%02d".format(m)}"
    }
}
