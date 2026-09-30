# zune.dev

Personal portfolio of **Zune**, a website "about me" with a terminal / code-editor look, built with React + Tailwind and hosted on GitHub Pages.

🔗 **Live site:** https://zune-lab.github.io/zune-portfolio/

> `chillax guys. code for fun, ship small weird things.`

---

## About this site

This is where everything about me lives in one place: who I am, what I've been through, what I'm working on, and how to reach me. The whole page "plays" a terminal: section titles are file names (`about.js`, `log.sh`, `projects/`), the journey log is written like `git log`, and there's even a real terminal you can type commands into at the top of the page.

## Why I made it

- **Everything in one place.** My projects are scattered across GitHub and my socials are all different. A single page helps people quickly understand what I do without having to go looking.
- **A place to experiment.** It's also a playground for UI and animation: the flashlight switch, the preloader, card effects, a background that changes with the time of day... things that are hard to fit into a serious project but are a lot of fun to build.
- **A place to look back.** The `log.sh` section records my coding journey, so someday I can look back and see how far I've come.
- **Learning by doing.** I moved the site from plain HTML/CSS/JS to React (Vite) + Tailwind to make it easier to grow and maintain, and to practice organizing a real frontend project.

## Tech and why

| Tech | Why |
|---|---|
| **React 18 + Vite** | Splits the page into small components so changing one thing doesn't break another; Vite makes dev and build very fast. |
| **Tailwind CSS + CSS variables** | Fast to style; theme colors and time-of-day colors live in CSS variables (`src/index.css`), so changing a theme doesn't touch any component. |
| **Plain CSS for complex animation** | The 3D flashlight, preloader, wipe effects and so on are hard to express cleanly with utility classes, so they get their own CSS next to each component. |
| **No backend** | Time-based status, `mailto:` feedback and everything else runs in the browser: simple, free, and no visitor data is stored. |
| **GitHub Pages + GitHub Actions** | Free hosting; every push to `main` builds and deploys automatically. |

---

## About me

I'm an introvert by default and I get to know people slowly. I like the kind of frontend work where a small detail (an animation, a hover state, a color that changes with the time of day) makes something feel alive. Most of what I build starts as "this would be fun" and ends up shipped.

## Things I've made

| Project | What it is |
|---|---|
| [a-dumb-gift](https://github.com/Zune-lab/a-dumb-gift) | A small gift, hand-coded, runs straight in the browser |
| [symphony](https://github.com/Zune-lab/symphony) | Experiments with sound and interaction on the web |
| [illusion](https://github.com/Zune-lab/illusion) | Playing with visual illusions in pure CSS |
| [le-tot-nghiep](https://github.com/Zune-lab/le-tot-nghiep) | A keepsake page for graduation day |
| [calender](https://github.com/Zune-lab/calender) | A compact little calendar app, built by hand |
| [a-gift-for-u](https://github.com/Zune-lab/a-gift-for-u) | Another gift page, focused on CSS details |

## Find me

- GitHub: [Zune-lab](https://github.com/Zune-lab)
- Facebook: [zuongnguyn06](https://www.facebook.com/zuongnguyn06)
- Instagram: [@zun.nguyn](https://www.instagram.com/zun.nguyn/)
- X: [@Zunne06](https://x.com/Zunne06)
- Discord: [Zune](https://discord.com/users/1537980605940105331)

## Credits

Many of the small effects on the site are inspired by and adapted from [uiverse.io](https://uiverse.io): the flashlight switch, contact button, back-to-top button, scroll arrow and loader.
