package dev.zune.portfolio.core

import dev.zune.portfolio.screens.Tab
import dev.zune.portfolio.theme.SkinCatalog
import dev.zune.portfolio.theme.SkinData
import dev.zune.portfolio.theme.ThemeStore

/**
 * Port of the command interpreter in src/components/home/Terminal/Terminal.jsx (`exec`, `themeCmd`, FILES, QUICK).
 * Pure logic: the composable (TerminalScreen) only types text and prints what this returns.
 */
object TerminalEngine {
    val whoami = "${Site.ID} - ${Site.ROLE.lowercase()}, ${Site.LOCATION}"
    val hire = "hire ${Site.ID}"
    /** the pages `cd` can enter (src/config/pages.js) */
    val pages = listOf(Tab.ABOUT, Tab.PROJECTS, Tab.LAB)
    private fun id(t: Tab) = t.name.lowercase()

    val files = listOf(
        "mood.txt" to Site.MOOD,
        "tea.txt" to Site.TEA_LINE,
        "stack.txt" to Profile.stack.joinToString("  "),
    )

    val quick = listOf(
        "who are you?" to "whoami",
        "your mood?" to "cat mood.txt",
        "what do you use?" to "cat stack.txt",
        "show projects" to "cd projects",
        "can I hire you?" to "sudo $hire",
        "surprise me" to "theme random",
    )

    /** the status line follows the badge in the hero (same store), so the two never contradict each other */
    fun intro(blurb: String) = listOf(
        "whoami" to whoami,
        "cat mood.txt" to Site.MOOD,
        "echo \$STATUS" to "$blurb - type help to play around",
    )

    class Context(val app: AppState, val navigate: (Tab) -> Unit)
    class Result(val lines: List<String>, val clear: Boolean = false)

    fun exec(raw: String, cx: Context): Result {
        val words = raw.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
        val cmd = words.firstOrNull() ?: ""
        val arg = words.drop(1).joinToString(" ")
        val dir = arg.replaceFirst("/", "") // JS: arg.replace('/', '') (first slash only)

        return when (cmd) {
            "" -> Result(emptyList())
            "help" -> Result(listOf(
                "help | ls | cat <file> | cd <${pages.joinToString("|") { id(it) }}> | whoami | date | battery | theme | clear",
                "try: sudo $hire, or theme list",
            ))
            "whoami" -> Result(listOf(whoami))
            "ls" -> Result(listOf(files.joinToString("  ") { it.first } + pages.joinToString("") { "  ${id(it)}/" }))
            "cat" -> Result(listOf(files.firstOrNull { it.first == arg }?.second ?: "cat: ${arg.ifEmpty { "?" }}: No such file or directory"))
            "cd" -> {
                val tab = pages.firstOrNull { id(it) == dir }
                if (tab != null) { cx.navigate(tab); Result(listOf("-> $dir/")) }
                else Result(listOf("cd: ${arg.ifEmpty { "?" }}: No such file or directory"))
            }
            "date" -> Result(listOf(SiteTime.dateTime()))
            "theme", "skin" -> Result(themeCmd(arg, cx.app.themeStore))
            "sudo" -> if (arg == hire) Result(listOf("[sudo] password for you: ********", "permission granted - message me in the contact section!"))
                      else Result(listOf("sudo: you are not in the sudoers file. this incident will be reported."))
            "battery" -> {
                // the same battery as the sav card in the hero
                val lv = cx.app.social.level(cx.app.status.key)
                val on = Math.round(lv / 100f * BATTERY_CELLS)
                val bar = "#".repeat(on) + ".".repeat(BATTERY_CELLS - on)
                val note = when {
                    cx.app.social.maxed -> "personality overflow. please stand back."
                    lv <= 0 -> "${Site.ID} is asleep. zzz"
                    lv <= 20 -> "running on fumes. maybe let ${Site.ID} rest."
                    else -> "ok, still some words left."
                }
                Result(listOf("social battery: $lv% [$bar]", note))
            }
            "konami" -> { cx.app.social.konami(); Result(listOf("up up down down left right left right b a", "personality: 100%. scroll up and look at ${Site.ID}.sav")) }
            "clear" -> Result(emptyList(), clear = true)
            else -> Result(listOf("$cmd: command not found - type help"))
        }
    }

    // ------------------------------------------------ theme  (theme | list | set <name> | <name> | random | auto)
    private fun pad(s: String, n: Int) = s + " ".repeat(maxOf(1, n - s.length))
    private fun modeNote(s: dev.zune.portfolio.theme.Skin) =
        if (s.modes.size > 1) "dark+light" else "${s.modes[0].name.lowercase()} only"

    private fun themeCmd(arg: String, ts: ThemeStore): List<String> {
        val parts = arg.lowercase().split(Regex("\\s+")).filter { it.isNotEmpty() }
        if (parts.isEmpty()) {
            val now = if (ts.isAuto) "auto (${ts.skinId})" else ts.skinId
            return listOf("skin: $now", "theme list | theme set <name> | theme random | theme auto   (or tap the skin chip)")
        }
        val first = parts[0]
        val rest = parts.drop(1)

        if (first == "list" || first == "ls") {
            val rows = mutableListOf("${if (ts.isAuto) "*" else " "} ${pad("auto", 13)}follows the time of day")
            for (s in SkinData.all) {
                val locked = s.unlock != null && !ts.isUnlocked(s.id)
                val info = if (locked) "[locked] ${s.unlock?.hint ?: ""}" else modeNote(s)
                rows += "${if (!ts.isAuto && ts.skinChoice == s.id) "*" else " "} ${pad(s.id, 13)}$info"
            }
            return listOf(rows.joinToString("\n"))
        }
        if (first == "random") {
            val s = SkinData.all.filter { ts.isUnlocked(it.id) && it.id != ts.skinId }.randomOrNull()
                ?: return listOf("theme: nothing else to pick yet")
            ts.pick(s.id)
            return listOf("-> ${s.id}")
        }
        val target = (if (first == "set" || first == "use") rest else listOf(first) + rest).joinToString("-")
        if (target.isEmpty()) return listOf("theme: set what? try theme list")
        if (target == ThemeStore.AUTO) { ts.pick(ThemeStore.AUTO); return listOf("-> auto (changes with the time of day)") }
        val s = SkinCatalog.byId[target] ?: return listOf("theme: $target: no such skin - try theme list")
        if (!ts.isUnlocked(target)) return listOf("theme: $target is locked - ${s.unlock?.hint ?: ""}")
        ts.pick(target)
        val lock = s.lockedMode
        return listOf(if (lock != null) "-> $target (${lock.name.lowercase()} only: the torch switch is locked)" else "-> $target")
    }
}
