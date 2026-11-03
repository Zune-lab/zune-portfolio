# zune.dev: native mobile apps

The web portfolio (React) rewritten natively, one app per platform, sharing one design source.

| | Language | UI toolkit | Folder |
|---|---|---|---|
| iPhone / iPad | Swift | SwiftUI (iOS 16+) | `ios/` |
| Android | Kotlin | Jetpack Compose (Android 8+, API 26) | `android/` |

## Status

| Phase | Scope | State |
|---|---|---|
| 1 | Data (`Site`), 17 skins × light/dark, auto skin by time of day, status, social battery, navigation | done |
| 2 | Home (hero, `zune.sav` card, featured, about/lab teasers, contact + feedback + socials), About (`about.js`, `log.sh`, `skills.js`), Projects (search + tags), skin picker | done |
| 3 | Terminal (self-typing intro, `help ls cat cd date battery theme clear konami sudo`, question chips, command history), torch light/dark switch | done |
| 4a | Lab games: Snake, Bug squash, Memory match (records saved, they unlock the secret skins `matrix` and `vaporwave`) | done |
| 4b-1 | Creature stage (canvas-2D shim + shared stage: pointer, wander, respawn, drag play/scroll) and **Reptile** | done |
| 4b-2 | **Moths** (lamp, candle, bat, wing dust, sparks, shake-to-scare) | done |
| 4b-3 | Mother, Choir (they need generated sound: AVAudioEngine / AudioTrack) | todo |
| 4b-4 | **Banner maker** (34 patterns, layers, frame, hand drawing with undo/mirror, save .png, copy code) | done |
| 4b-5 | **Upside-down cat** (CSS shapes + keyframes redrawn on a canvas) | done |
| 4b-6 | Floating ghost (SVG body, day/night, graves, ~10 easter eggs) | todo |
| 4c | Pets (Cameo), Clippy, per-project CSS art, background effects | todo |

> The code was written without a compiler available. Expect to fix a few small compile errors on the first build, and tell me the messages.

## Run

**iOS** (needs a Mac with Xcode 15+):
```bash
brew install xcodegen
cd mobile/ios && xcodegen && open ZunePortfolio.xcodeproj
```

**Android** (Android Studio Ladybug or newer, JDK 17): open `mobile/android` as a project, let Gradle sync (it creates the wrapper), then Run.

## One source of truth

- Skin colours are **extracted from the web CSS**, not retyped:
  ```bash
  python3 mobile/tools/extract_skins.py    # src/styles/skins/*.css + src/config/skins.js -> tools/skins.json
  python3 mobile/tools/generate_native.py  # -> ios/.../Theme/SkinData.swift and android/.../theme/SkinData.kt
  ```
  Re-run both after changing a skin on the web. The two `SkinData` files are generated: do not edit them by hand.
- Owner content (name, projects, socials, git log, lab list) lives in one file per app: `ios/ZunePortfolio/Core/Site.swift` and `android/app/src/main/java/dev/zune/portfolio/core/Site.kt`. Keep them in sync with `src/config/*`, `src/data/*` and `src/projects/*/meta.js`.

## Mapping web → native

| Web | iOS | Android |
|---|---|---|
| `src/config/site.js`, `data/*`, `projects/*/meta.js` | `Core/Site.swift` | `core/Site.kt` |
| `lib/siteTime.js` | `Core/SiteTime.swift` | `core/SiteTime.kt` |
| `lib/status.js` | `Core/StatusStore.swift` | `core/StatusStore.kt` |
| `lib/social.js` | `Core/SocialStore.swift` | `core/SocialStore.kt` |
| `lib/skin.js`, `useSkin` | `Theme/ThemeStore.swift` | `theme/ThemeStore.kt` |
| `SheetCard.jsx` | `Screens/SheetCard.swift` | `screens/SheetCard.kt` |
| `Feedback.jsx`, `Socials.jsx` | `Screens/ContactSection.swift` | `screens/ContactSection.kt` |
| `Hero`, `HomeSections` | `Screens/HomeView.swift` | `screens/HomeScreen.kt` |
| `About.jsx` | `Screens/AboutView.swift` | `screens/AboutScreen.kt` |
| `Projects.jsx` | `Screens/ProjectsView.swift` | `screens/ProjectsScreen.kt` |
| `Lab.jsx` | `Screens/LabView.swift` | `screens/LabScreen.kt` |
| `games/*`, `config/games.js`, `useBest` | `Games/*.swift` | `games/*.kt` |
| `BannerMaker/banner.js` + `BannerMaker.jsx` | `Banner/BannerEngine.swift`, `BannerModel.swift`, `BannerMakerView.swift` | `banner/BannerEngine.kt`, `BannerModel.kt`, `BannerMakerScreen.kt` |
| `Cat/Cat.jsx` + `Cat.css` | `Creatures/Cat.swift`, `CanvasFrame.swift` | `creatures/Cat.kt`, `CanvasFrame.kt` |
| `CreatureStage`, `Reptile/creature.js` | `Creatures/Ctx2D.swift`, `CreatureStage.swift`, `MathUtil.swift`, `Reptile.swift`, `Moths.swift` | `creatures/Ctx2D.kt`, `CreatureStage.kt`, `MathUtil.kt`, `Reptile.kt`, `Moths.kt` |
| `SkinPalette.jsx` | `Screens/SkinPickerView.swift` | `screens/SkinPicker.kt` |
| `Navbar.jsx` | `Screens/RootView.swift` | `screens/RootScreen.kt` |
| `Terminal.jsx` | `Core/TerminalEngine.swift` + `Screens/TerminalView.swift` | `core/TerminalEngine.kt` + `screens/TerminalScreen.kt` |
| `ThemeToggleTorch` | `UI/TorchSwitch.swift` | `ui/TorchSwitch.kt` |

## Differences from the web (on purpose)

- Social icons are brand-coloured badges with a short label (the web draws Font Awesome SVG paths).
- Feedback opens the mail app (`mailto:` on iOS, `ACTION_SENDTO` on Android) like the web, with no backend.
- The torch is the same Minecraft cube (same projection and cell colours) drawn as flat polygons instead of CSS 3D; tap it to switch light/dark. Single-mode skins lock it, same as the web.
- The phone has no arrow keys, so the terminal gets ↑ / ↓ buttons for command history. `Ctrl+K` becomes the skin chip in the top bar.
- The terminal stays visible on the `retro-os` skin until Clippy (which replaces it on the web) is ported in phase 4.
- The font is the system monospace (the web loads its own).
- Banner maker: the preview sits above the controls instead of beside them; "save .png" opens the share sheet (Photos, Files, AirDrop…); the custom colour is the system colour picker on iOS and three RGB sliders on Android; the soft drop shadow is a simple ellipse on Android.

## Porting a CSS-drawn toy

`CanvasFrame` is a framed canvas that redraws every frame with the elapsed time (frozen when the OS asks to reduce motion). `cssBox` draws a box with `border-radius: rx / tl tr br bl` and applies the CSS rule that shrinks all radii together when they don't fit; `rotated` is `transform: rotate()` with its origin; `keyframes` / `tri` evaluate CSS keyframes. The cat uses all four, with the web's own coordinates.

## Porting a lab creature

`Ctx2D` mimics the browser's `canvas.getContext('2d')` (beginPath, moveTo, lineTo, arc, ellipse, bezier/quadratic curves, fill, stroke, fillRect, fillText, save/restore, translate/rotate/scale, gradients, globalAlpha), so a creature written for the web ports almost line by line: implement `Creature` (`label`, `step(api)`, optional `caption`, `unlock`, `destroy`) and pass a factory to `CreatureStage`. Unlike the web, the stage never skips frames (the screen is redrawn from scratch every frame), so a creature that was capped at 30 fps runs its physics on its own fixed 30 Hz timer and draws every frame (see `Reptile`).
