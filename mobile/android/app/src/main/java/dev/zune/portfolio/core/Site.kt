package dev.zune.portfolio.core

import java.time.ZoneId

// Port of src/config/site.js + src/data/profile.js + src/data/socials.js + src/projects/*/meta.js + src/config/lab-items.js.
// Single source of "everything that belongs to the site owner" on Android: fork the app and edit only this file.

object Site {
    const val NAME = "Zune"
    const val REAL_NAME = "Vuong"
    const val ID = "zune"
    const val HANDLE = "zune.dev"
    const val YEAR = 2026

    const val ROLE = "Web Developer"
    const val LOCATION = "Ho Chi Minh City"
    const val COUNTRY = "VN"
    const val HOST = "hcmc"
    const val EMAIL = "nguyenhaivuong06@gmail.com"
    const val PHONE = "84909840611"

    val zone: ZoneId = ZoneId.of("Asia/Ho_Chi_Minh")
    /** Start hour of each part of the day (owner's timezone). online = [day, night) */
    const val DAWN = 5
    const val DAY = 8
    const val DUSK = 17
    const val NIGHT = 23

    const val GITHUB_USER = "Zune-lab"
    const val REPO = "zune-portfolio"
    const val DESCRIPTION = "Zune's portfolio: a web developer building small, playful things with React."

    val phrases = listOf("I code for fun.", "I fix 3am bugs.", "I play with CSS.", "I make tiny pages.")
    const val HERO_INTRO = "I love messing around with CSS and building tiny pages just to see if they work."
    const val HERO_NOTE = "// introvert by default. say hi anyway →"
    const val MOOD = "chillax guys. code for fun, ship small weird things."
    const val TEA_LINE = "tea > coffee. always."
    const val FUN_FACT = "debugging CSS all night and never getting bored"
    const val DRINK = "tea"
    val classes = listOf("Bug Summoner", "CSS Wizard", "Tea Enjoyer", "Introvert (lvl 99)")

    const val GITHUB_URL = "https://github.com/$GITHUB_USER"
    fun repoUrl(name: String = REPO) = "https://github.com/$GITHUB_USER/$name"
}

fun storageKey(name: String) = "${Site.ID}-$name"

object Profile {
    const val START_YEAR = 2022
    const val MAIN_STACK = "React + Tailwind"
    const val LEARNING = "Next.js App Router"
    val aboutBlurb = "coding since $START_YEAR. Favorite stack is $MAIN_STACK, and I'm currently learning the $LEARNING."

    val stack = listOf("HTML", "CSS", "JavaScript", "TypeScript", "React", "Node.js", "Next.js", "Tailwind CSS", "Figma")
    val skillGroups = listOf(
        "languages" to listOf("HTML", "CSS", "JavaScript", "TypeScript"),
        "frameworks" to listOf("React", "Next.js", "Tailwind CSS", "Node.js"),
        "design" to listOf("Figma"),
    )
    val learningSkills = setOf("TypeScript", "Next.js")

    /** skills.js: groups from `skillGroups`, anything left over falls into "other" */
    val skills: List<Pair<String, List<String>>>
        get() {
            val grouped = skillGroups.flatMap { it.second }.toSet()
            return (skillGroups + ("other" to stack.filter { it !in grouped }))
                .map { (n, items) -> n to items.filter { it in stack } }
                .filter { it.second.isNotEmpty() }
        }

    /** Brand colours of the tech chips (0xRRGGBB); missing = follow the text colour (Next.js) */
    val techColors = mapOf(
        "HTML" to 0xFF6B3DL, "CSS" to 0xA98AE8L, "JavaScript" to 0xF1C40FL, "TypeScript" to 0x3B8EEAL, "React" to 0x61DAFBL,
        "Node.js" to 0x6CC24AL, "Tailwind CSS" to 0x38BDF8L, "Figma" to 0xF24E8FL,
    )

    val gitLog = listOf(
        GitEntry("9f3a1c0", "day-0", "init: born (no consent was asked)"),
        GitEntry("a1b2c3d", "2022-01", "chore: started learning HTML/CSS"),
        GitEntry("d4e5f6a", "2022-06", "feat: wrote my first line of JavaScript"),
        GitEntry("3c8e2f1", "2022-09", "fix: introvert mode enabled by default"),
        GitEntry("b7c8d9e", "2023-03", "feat: got to know React"),
        GitEntry("e0f1a2b", "2023-11", "feat: build a-dumb-gift, a-gift-for-u"),
        GitEntry("6d1a9b4", "2024-01", "revert: \"rewrite everything in one night\""),
        GitEntry("c3d4e5f", "2024-05", "feat: tried symphony (audio + JS)"),
        GitEntry("4e7b0c2", "2024-08", "fix: 3am CSS bug. it was a missing semicolon"),
        GitEntry("f6a7b8c", "2025-01", "refactor: learning TypeScript"),
        GitEntry("8a2d5e7", "2025-09", "wip: unlock full personality (requires 6+ months of friendship)"),
        GitEntry("a9b0c1d", "now", "feat: building ${Site.HANDLE}"),
    )
}

data class GitEntry(val hash: String, val date: String, val msg: String) {
    /** "feat: x" -> ("feat", "x"); unknown prefix -> ("", whole message) */
    val parts: Pair<String, String>
        get() {
            val i = msg.indexOf(':')
            if (i < 0) return "" to msg
            val type = msg.substring(0, i)
            return if (type in KNOWN) type to msg.substring(i + 1).trim() else "" to msg
        }

    private companion object { val KNOWN = setOf("init", "feat", "fix", "chore", "refactor", "revert", "wip") }
}

/** The web draws Font Awesome paths; natively we show a brand-coloured badge with a short glyph. */
data class Social(val name: String, val url: String, val brand: Long, val glyph: String)

object Socials {
    val all = listOf(
        Social("facebook", "https://www.facebook.com/zuongnguyn06", 0xFF1877F2, "f"),
        Social("instagram", "https://www.instagram.com/zun.nguyn/", 0xFFD6249F, "ig"),
        Social("x", "https://x.com/Zunne06", 0xFF181818, "X"),
        Social("discord", "https://discord.com/users/1537980605940105331", 0xFF7289DA, "dc"),
        Social("zalo", "https://zalo.me/${Site.PHONE}", 0xFF0068FF, "Z"),
        Social("whatsapp", "https://wa.me/${Site.PHONE}", 0xFF075E54, "wa"),
        Social("github", Site.GITHUB_URL, 0xFF181818, "gh"),
    )
}

enum class ProjectColor { JS, CSS_LANG }

data class Fact(val key: String, val value: String)

data class Project(
    val order: Int, val file: String, val desc: String, val color: ProjectColor,
    val href: String, val tags: List<String>, val facts: List<Fact>,
)

object Projects {
    val all = listOf(
        Project(1, "a-dumb-gift.js", "a small gift, hand-coded, runs straight in the browser", ProjectColor.JS,
            Site.repoUrl("a-dumb-gift"), listOf("gift", "html"),
            listOf(Fact("type", "gift page"), Fact("runs", "straight in the browser"), Fact("mood", "dumb but cute"))),
        Project(2, "symphony.js", "experiments with sound and interaction on the web", ProjectColor.JS,
            Site.repoUrl("symphony"), listOf("sound", "js"),
            listOf(Fact("type", "sound toy"), Fact("made with", "audio + JS"), Fact("mood", "press things, hear things"))),
        Project(3, "illusion.css", "playing with visual illusions in pure CSS", ProjectColor.CSS_LANG,
            Site.repoUrl("illusion"), listOf("css", "visual"),
            listOf(Fact("type", "visual illusion"), Fact("made with", "pure CSS"), Fact("mood", "stare at it for a while"))),
        Project(4, "le-tot-nghiep.js", "a keepsake page for graduation day", ProjectColor.JS,
            Site.repoUrl("le-tot-nghiep"), listOf("page", "css"),
            listOf(Fact("type", "keepsake page"), Fact("made for", "graduation day"))),
        Project(5, "calendar.js", "a compact little calendar app, built by hand", ProjectColor.JS,
            Site.repoUrl("calender"), listOf("app", "js"),
            listOf(Fact("type", "calendar app"), Fact("built", "by hand"))),
        Project(6, "a-gift-for-u.css", "another gift page, focused on CSS details", ProjectColor.CSS_LANG,
            Site.repoUrl("a-gift-for-u"), listOf("gift", "css"),
            listOf(Fact("type", "gift page"), Fact("focus", "CSS details"))),
    ).sortedBy { it.order }

    val tags: List<String> get() = all.flatMap { it.tags }.toSortedSet().toList()
    /** the web shows the first 3 by order when none is flagged `featured` */
    val featured: List<Project> get() = all.take(3)
}

enum class LabKind { GAME, TOY, TOOL;  val label get() = name.lowercase() }

data class LabItem(val slug: String, val file: String, val name: String, val kind: LabKind, val blurb: String)

object Lab {
    val items = listOf(
        LabItem("reptile", "reptile.js", "Reptile", LabKind.TOY, "A procedural lizard with a random number of legs. Hit the button for a new one."),
        LabItem("mother", "mother.js", "Mother", LabKind.TOY, "She sleeps in the dark under a lot of hair. Poke her and her children crawl out. When she opens her eyes, do not move."),
        LabItem("choir", "choir.js", "Choir", LabKind.TOY, "They stand in the dark and stare straight out of the screen. Keep them singing. If you stop, they come closer. Sound on."),
        LabItem("moths", "moths.js", "Moths", LabKind.TOY, "Your cursor is a lamp and the moths cannot leave it alone. Switch it off, blow out the candle, shake the lamp, and watch out for the bat."),
        LabItem("cat", "cat.css", "Upside-down cat", LabKind.TOY, "A cat running upside-down. Pure CSS animation, no JavaScript state."),
        LabItem("ghost", "ghost.css", "Floating ghost", LabKind.TOY, "A floating CSS ghost. Poke it, flip day and night, find the hidden lines."),
        LabItem("banner-maker", "banner-maker.js", "Banner maker", LabKind.TOOL, "Stack patterns and dyes into a banner, then copy the code."),
        LabItem("bug-squash", "bug-squash.js", "Bug squash", LabKind.GAME, "Squash bugs for 30 seconds. Beat your best score."),
        LabItem("memory-match", "memory-match.js", "Memory match", LabKind.GAME, "Flip cards and match the code symbols in the fewest moves."),
        LabItem("snake", "snake.js", "Snake", LabKind.GAME, "Classic snake on an 18×18 grid. Keyboard or on-screen pad."),
    )
}
