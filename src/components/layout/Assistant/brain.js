import { CONTACT, PAGES, labelOf } from '../../../config/pages.js';
import { LAB_ITEMS } from '../../../config/lab-items.js';
import { SKINS, SKIN_AUTO, lockedMode } from '../../../config/skins.js';
import { githubUrl, repoUrl, site } from '../../../config/site.js';
import { aboutBlurb, learning, mainStack, stack, startYear } from '../../../data/profile.js';
import { socials } from '../../../data/socials.js';
import { projects } from '../../../projects/index.js';
import { slugOf } from '../../../projects/slug.js';
import { siteDateTime } from '../../../lib/siteTime.js';
import { isUnlocked } from '../../../lib/skin.js';
import { BATTERY_CELLS, getSocial, levelOf, unlockKonami } from '../../../lib/social.js';

// BỘ NÃO của Clippy: nhận một câu người dùng gõ (hoặc bấm gợi ý) và trả về { text, actions, auto, clear }.
//   text     lời đáp (xuống dòng bằng \n)
//   actions  các nút bấm kèm theo: { label, type, ... } (Assistant.jsx lo việc thực hiện, file này không đụng tới DOM)
//   auto     chỉ số trong `actions` cần chạy NGAY (vd "đưa tôi tới projects" thì chạy luôn, không bắt bấm thêm)
//   clear    xoá cuộc trò chuyện
// Hiểu tiếng Anh là chính, có thêm vài từ khoá tiếng Việt. Không hiểu thì gợi ý lại, không bịa.
// Các lệnh kiểu terminal cũ (cd, ls, cat, whoami, theme, sudo hire, battery, konami) vẫn dùng được cho ai quen tay.
const { id, role, location, email, content } = site;
const WHOAMI = `${id} - ${role.toLowerCase()}, ${location}`;
const HIRE = `hire ${id}`;
const TABS = PAGES.map((p) => p.id);

export const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
const has = (q, ...res) => res.some((r) => r.test(q));
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---- nút bấm dựng sẵn
const nav = (label, view, scroll, after) => ({ label, type: 'nav', view, scroll, after });
const top = () => ({ label: '↑ Back to top', type: 'top' });
const ask = (label, q = label) => ({ label, type: 'ask', q });
const link = (label, url) => ({ label, type: 'link', url });
const toContact = () => nav('Jump to contact', 'home', CONTACT.href);

const FILES = { 'mood.txt': content.mood, 'tea.txt': content.teaLine, 'stack.txt': stack.join('  ') };
const GAMES = LAB_ITEMS.filter((i) => i.kind === 'game');
const reply = (text, actions = [], auto = -1) => ({ text, actions, auto });

// ---- gợi ý bấm nhanh theo trang đang xem
export function suggestionsFor(view) {
  const top1 = String(view).split('/')[0];
  const base = {
    home: ['Show me the projects', 'Who is Zune?', 'How do I contact Zune?', 'Surprise me'],
    projects: ['List the projects', 'Any games in the lab?', 'How do I contact Zune?', 'Change the theme'],
    about: ['What is the stack?', 'Is Zune online?', 'Show me the projects', 'Change the theme'],
    lab: ['Pick a random toy', 'Any games?', 'Show me the projects', 'Change the theme'],
  }[top1] ?? ['Show me the projects', 'Who is Zune?', 'Surprise me', 'Change the theme'];
  if (String(view).startsWith('lab/')) return ['Another one', 'Back to the lab', 'Back to top', 'Change the theme'];
  return base;
}

export const HELLO = reply(
  `Hi, I am Clippy! It looks like you are visiting ${site.name}'s portfolio. I can take you around, scroll for you, change the look of the site, answer questions about ${site.name}, and help you get in touch.\nType a question, or pick one below. (Tip: press ? any time to call me.)`,
  [ask('Show me the projects'), ask('Who is Zune?'), ask('Change the theme'), ask('What can you do?')]
);

const HELP = reply(
  `Here is what I can do:\n• take you anywhere: "go to projects", "open the lab", "contact"\n• scroll for you: "back to top", "go to the bottom"\n• restyle the site: "dark mode", "random theme", "show skins", "use matrix"\n• tell you about ${site.name}: stack, mood, time, battery, projects, socials\n• help you get in touch: "email", "hire ${id}"\nOld terminal habits work too: cd, ls, cat mood.txt, theme list, sudo ${HIRE}.`,
  [ask('Back to top', 'back to top'), ask('Random theme'), ask('How do I contact Zune?'), ask('Pick a random toy')]
);

// ---- khối trả lời dùng lại
function whoami() {
  return reply(
    `${site.name} is a ${role.toLowerCase()} in ${location}. In ${site.name}'s words: "${aboutBlurb}"\nMood: ${content.mood}`,
    [ask('What is the stack?'), nav('More about Zune', 'about'), ask('How do I contact Zune?')]
  );
}
function contactInfo() {
  return reply(
    `The fastest way to reach ${site.name} is email: ${email}\nIntrovert by default, but replies to hellos. I can copy the address for you, or jump to the contact section.`,
    [{ label: 'Copy email', type: 'copy', text: email }, { label: 'Write an email', type: 'link', url: `mailto:${email}` }, toContact(), ask('Show social links', 'socials')]
  );
}
function projectsList() {
  const lines = projects.map((p) => `• ${p.file}: ${p.desc}`);
  return reply(`${site.name} has put ${projects.length} projects on the shelf:\n${lines.join('\n')}`, [
    nav('Open the projects page', 'projects'),
    ...projects.slice(0, 2).map((p) => link(`Open ${p.file}`, p.href)),
  ]);
}
function socialList() {
  return reply(
    `You can find ${site.name} here:\n${socials.map((s) => `• ${s.name}`).join('\n')}`,
    [link('GitHub', githubUrl), ...socials.slice(0, 3).map((s) => link(s.name, s.href))]
  );
}
function skinList() {
  const cur = document.documentElement.dataset.skin;
  const rows = SKINS.map((s) => `${s.id === cur ? '▸' : ' '} ${s.id}${s.unlock && !isUnlocked(s.id) ? ' (locked)' : ''}`);
  return reply(`The site has ${SKINS.length} skins. Say a name and I will switch ("use matrix"), or open the picker.\n${rows.join('\n')}`, [
    { label: 'Open the skin picker', type: 'palette' },
    { label: 'Random skin', type: 'skin', id: 'random' },
    { label: 'Auto (by time of day)', type: 'skin', id: SKIN_AUTO },
  ]);
}
function skinTo(s) {
  if (!isUnlocked(s.id)) return reply(`${s.label} is a secret skin and it is still locked: ${s.unlock.hint}`, [{ label: 'Open the skin picker', type: 'palette' }]);
  const lock = lockedMode(s.id);
  const bye = s.id === 'retro-os' ? '' : ' I only live in the retro-os skin, so this is goodbye. Bye!';
  return reply(`Switching to ${s.id}.${bye}${lock ? ` (It is ${lock}-only, so the torch switch will not change the mode.)` : ''}`, [{ label: `Use ${s.id}`, type: 'skin', id: s.id }, { label: 'Random skin', type: 'skin', id: 'random' }, { label: 'Open the skin picker', type: 'palette' }], 0);
}
function battery() {
  const s = getSocial();
  const lv = levelOf(s);
  const on = Math.round((lv / 100) * BATTERY_CELLS);
  const note = s.maxed ? 'Personality overflow. Please stand back.' : lv <= 0 ? `${id} is asleep. zzz` : lv <= 20 ? `Running on fumes. Maybe let ${id} rest.` : 'Ok, still some words left.';
  return reply(`social battery: ${lv}% [${'#'.repeat(on)}${'.'.repeat(BATTERY_CELLS - on)}]\n${note}`);
}
function randomToy() {
  const it = pickOne(LAB_ITEMS);
  return reply(`How about ${it.name}? ${it.blurb}`, [nav(`Play ${it.file}`, `lab/${it.slug}`), ask('Another one', 'pick a random toy')], -1);
}
const JOKES = [
  'A SQL query walks into a bar, sees two tables and asks: can I join you?',
  'There are 10 kinds of people: those who understand binary and those who do not.',
  'CSS is awesome. That is why my text is overflowing the box.',
  'It works on my machine. Ship the machine.',
  'Why do programmers prefer dark mode? Because light attracts bugs.',
];
const TIPS = [
  'Grab a letter in the big headline and throw it. It is surprisingly satisfying.',
  'Ctrl+K opens the skin picker. Some skins are secret. Type "konami" if you are brave.',
  `The torch in the corner switches light and dark mode. I can do that for you too.`,
  'Click the "class" line on the sav card. It changes.',
  'The lab has games, toys and one very serious tool. Ask me for a random one.',
  'Every skin has its own little pet. Switch skins and look at the bottom of the screen.',
];

// ---- chế độ lệnh (thói quen terminal)
function command(cmd, args, ctx) {
  const arg = args.join(' ');
  switch (cmd) {
    case 'help':
      return HELP;
    case 'whoami':
      return reply(WHOAMI);
    case 'date':
      return reply(siteDateTime());
    case 'ls':
      return reply(Object.keys(FILES).join('  ') + TABS.map((t) => `  ${t}/`).join(''), TABS.map((t) => nav(`cd ${t}`, t)));
    case 'cat':
      if (!arg) return null; // "cat" một mình là con mèo ở lab, để các luật sau xử lý
      return reply(Object.prototype.hasOwnProperty.call(FILES, arg) ? FILES[arg] : `cat: ${arg || '?'}: No such file or directory`);
    case 'cd': {
      const dir = arg.replace(/\/+$/, '');
      if (dir === '~' || dir === '' || dir === '..' || dir === 'home') return reply('-> ~', [nav('Home', 'home')], 0);
      if (TABS.includes(dir)) return reply(`-> ${dir}/`, [nav(`Open ${labelOf(dir)}`, dir)], 0);
      return reply(`cd: ${arg}: No such file or directory`);
    }
    case 'sudo':
      return arg === HIRE
        ? reply(`[sudo] password for you: ********\npermission granted. Message ${id} in the contact section, or let me copy the email.`, [toContact(), { label: 'Copy email', type: 'copy', text: email }])
        : reply('sudo: you are not in the sudoers file. This incident will be reported to Clippy.');
    case 'rm':
      return reply('Nice try. I am a paperclip, not a filesystem.');
    case 'exit':
    case 'quit':
      return { ...reply('Closing the window. You can call me back with ?'), close: true };
    case 'vim':
    case 'vi':
    case 'nano':
      return reply('You can leave any time. (Esc, then :q is not going to help here.)');
    case 'battery':
      return battery();
    case 'konami':
      unlockKonami();
      return reply(`up up down down left right left right b a\npersonality: 100%. Scroll up and look at ${id}.sav`);
    case 'clear':
      return { ...reply(''), clear: true };
    case 'theme':
    case 'skin':
      return themeCommand(args, ctx);
    default:
      return null;
  }
}
function themeCommand(args) {
  const first = (args[0] || '').toLowerCase();
  if (!first) return skinList();
  if (first === 'list' || first === 'ls') return skinList();
  if (first === 'random') return reply('Rolling the dice...', [{ label: 'Random skin', type: 'skin', id: 'random' }], 0);
  if (first === SKIN_AUTO) return reply('Switching to auto: the skin follows the time of day.', [{ label: 'Auto', type: 'skin', id: SKIN_AUTO }], 0);
  const want = args.filter((a) => a !== 'set' && a !== 'use').join('-');
  const s = SKINS.find((k) => k.id === want);
  return s ? skinTo(s) : reply(`theme: ${want}: no such skin. Try "theme list".`, [{ label: 'Show skins', type: 'ask', q: 'show skins' }]);
}

// ---- hàm chính
export function answer(raw, ctx = {}) {
  const text = raw.trim();
  if (!text) return reply('You did not say anything. I am a good listener, but not that good.');
  const q = norm(text);
  const [cmd, ...args] = q.split(' ');

  // 1) lệnh kiểu terminal
  const c = command(cmd, args, ctx);
  if (c) return c;

  // hỏi thông tin (liệt kê, giải thích) khác với ra lệnh đi tới đâu đó: "list projects" cho danh sách, "projects" / "open projects" thì dẫn đi
  const info = /^(list|what|which|how many|tell|do you have|is there)\b/.test(q) || /\b(list|what|which|how many)\b/.test(q);

  // 2) cuộn trang
  if (has(q, /\b(back )?to (the )?top\b/, /\b(scroll|go|take me|bring me) up\b/, /\bve dau trang\b/, /\blen (dau )?trang\b/, /^top$/))
    return reply('Up we go!', [top()], 0);
  if (has(q, /\b(bottom|footer|end of (the )?page)\b/, /\bscroll down\b/, /\bxuong (cuoi|duoi)\b/)) return reply('Heading to the bottom.', [{ label: '↓ Bottom', type: 'bottom' }, top()], 0);

  // 3) lời chào, cảm ơn, tạm biệt
  if (has(q, /^(hi|hello|hey|yo|hola|sup|howdy|chao|xin chao|alo)\b/)) return reply(`Hello! Ask me anything, or pick one:`, [ask('Show me the projects'), ask('Who is Zune?'), ask('Surprise me')]);
  if (has(q, /^(thanks|thank you|thx|ty|cam on|cảm ơn)\b/)) return reply(pickOne(['You are welcome!', 'Anytime. I live here.', 'Happy to help. That is literally my job.']));
  if (has(q, /^(bye|goodbye|see you|cya|tam biet)\b/)) return { ...reply('Bye! I will be right here if you need me.'), close: true };
  if (has(q, /^(help|what can you do|commands?|\?)$/, /\bwhat can you (do|help)\b/, /\bhow do (i|you) use\b/, /\bwho are you\b.*\b(clippy|bot|assistant)\b/)) return HELP;
  if (has(q, /\b(who|what) are you\b/, /\bare you (a )?(bot|ai|real|clippy)\b/, /\byour name\b/))
    return reply(`I am Clippy, a paperclip with a job: guiding people around ${site.name}'s site. I live in the bottom corner and I am not very tall.`);

  // 4) giao diện
  if (has(q, /\b(random|surprise|shuffle|roll)\b.*\b(theme|skin|look)\b/, /\b(theme|skin|look)\b.*\b(random|surprise)\b/, /^surprise me$/))
    return q === 'surprise me' ? reply(`Let's change the look of the site and see what happens.`, [{ label: 'Random skin', type: 'skin', id: 'random' }, ask('Pick a random toy')], 0) : reply('Rolling the dice...', [{ label: 'Random skin', type: 'skin', id: 'random' }], 0);
  if (has(q, /\b(skins|themes)\b/, /\bshow (me )?(the )?(skins?|themes?)\b/, /\b(list|all) (the )?(skins?|themes?)\b/, /\bpalette\b/, /\bpicker\b/)) return skinList();
  const nameRe = (n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
  const namesOf = (k) => [k.id.replace(/-/g, ' '), k.id, norm(k.label)];
  const skin = [...SKINS].sort((x, y) => y.id.length - x.id.length).find((k) => namesOf(k).some((n) => nameRe(n).test(q)));
  // phải có động từ đổi giao diện (hoặc cả câu chỉ là tên skin), nếu không "who is zune" sẽ bị hiểu là đổi sang skin `zune`
  if (skin && (has(q, /\b(use|switch|change|set|try|apply|activate|enable|put|turn|theme|skin|mode|look)\b/) || (skin.id !== 'zune' && namesOf(skin).includes(q)))) return skinTo(skin);
  if (has(q, /\b(dark|night|toi)\b/) && has(q, /\b(mode|theme|switch|turn|go|use|please|on)\b/, /^dark$/)) return reply('Lights out.', [{ label: 'Dark mode', type: 'theme', mode: 'dark' }, { label: 'Light mode', type: 'theme', mode: 'light' }], 0);
  if (has(q, /\b(light|day|bright|sang)\b/) && has(q, /\b(mode|theme|switch|turn|go|use|please|on)\b/, /^light$/)) return reply('Let there be light.', [{ label: 'Light mode', type: 'theme', mode: 'light' }, { label: 'Dark mode', type: 'theme', mode: 'dark' }], 0);
  if (has(q, /\b(theme|skin|look|colou?r|style|appearance|restyle|redecorate)\b/))
    return reply('I can restyle the whole site. Light or dark, or one of the skins:', [{ label: 'Dark mode', type: 'theme', mode: 'dark' }, { label: 'Light mode', type: 'theme', mode: 'light' }, { label: 'Random skin', type: 'skin', id: 'random' }, { label: 'Show all skins', type: 'ask', q: 'show skins' }]);

  // 5) liên hệ, mạng xã hội
  if (has(q, /\bsudo hire\b/)) return command('sudo', ['hire', id], ctx);
  if (/^(contact|lien he)$/.test(q)) return reply('Taking you to the contact section.', [toContact(), { label: 'Copy email', type: 'copy', text: email }], 0);
  if (has(q, /\b(hire|contact|email|e-mail|mail|reach|message|get in touch|talk to|work with|lien he|thue)\b/) && !/\btalk to me\b/.test(q)) return contactInfo();
  if (has(q, /\b(battery|energy)\b/)) return battery();
  if (has(q, /\b(social|socials|github|facebook|instagram|discord|zalo|twitter|follow|links?)\b/, /\bon x\b/)) {
    if (/\bgithub\b/.test(q)) return reply(`${site.name} lives on GitHub as ${site.githubUser}.`, [link('Open GitHub', githubUrl), ask('Show social links', 'socials')]);
    const one = socials.find((x) => new RegExp(`\\b${norm(x.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(q));
    if (one) return reply(`${site.name} is on ${one.name}.`, [link(`Open ${one.name}`, one.href), ask('Show social links', 'socials')]);
    return socialList();
  }

  // 6) về chủ site
  if (q === site.id.toLowerCase() || has(q, /\bwhat (does|do) (zune|he|you|the owner) do\b/, /\bwhat('s| is) (zune|he) (like|about)\b/)) return whoami();
  if (has(q, /\bwho is\b/, /\bwho('s| is) (zune|he|this|the owner)\b/, /\babout (zune|the owner|him|you)\b/, /\bintroduce\b/, /\btell me about (zune|yourself|him)\b/, /\bwho made\b/, /\bwho built\b/)) return whoami();
  if (has(q, /\b(stack|tech|technolog|skills?|tools?|language|framework|use)\b/) && has(q, /\b(what|which|stack|skills?|tech)\b/, /^stack$/)) return reply(`The toolbox: ${stack.join(', ')}.\nMain stack: ${mainStack}. Currently learning: ${learning}.`, [nav('See skills.js', 'about', undefined, '#about-skills'), ask('Show me the projects')]);
  if (has(q, /\b(learning|studying|next)\b.*\b(next|learn)\b/, /\bwhat.*learning\b/)) return reply(`${site.name} is currently learning ${learning}.`);
  if (has(q, /\b(mood|vibe|feeling)\b/, /\bhow (are|is) (you|zune)\b/)) return reply(content.mood);
  if (has(q, /\b(tea|coffee|drink)\b/)) return reply(content.teaLine);
  if (has(q, /\b(since when|how long|started|experience|years?)\b/) && has(q, /\b(cod\w*|program\w*|dev\w*|experience|started|years?)\b/)) return reply(`${site.name} has been coding since ${startYear}. Debugging CSS all night and never getting bored.`, [nav('Read log.sh', 'about', undefined, '#about-journey')]);
  if (has(q, /\b(where|location|live|city|based|from)\b/) ) return reply(`${site.name} is based in ${location}, ${site.country}. The local time is ${siteDateTime()}.`);
  if (has(q, /\b(time|date|clock|today)\b/)) return reply(`${site.name}'s clock says ${siteDateTime()}.`);
  if (has(q, /\b(online|offline|available|awake|busy|status|asleep|sleeping)\b/)) return reply(ctx.blurb ? `${ctx.blurb}` : `${site.name} keeps normal hours in ${location}.`, [toContact()]);
  if (has(q, /\bkonami\b/)) return command('konami', [], ctx);
  if (has(q, /\b(source|repo|code of this|github repo|how was this (site )?(made|built))\b/, /\bhow (did|do) you make this\b/)) return reply(`This site is built with React and Tailwind, hosted on GitHub Pages. The source is open.`, [link('Open the repo', repoUrl())]);

  // 7) dự án và lab
  const proj = projects.find((p) => q.includes(slugOf(p).replace(/-/g, ' ')) || q.includes(slugOf(p)));
  if (proj) return reply(`${proj.file}: ${proj.desc}.`, [link(`Open ${proj.file}`, proj.href), nav('All projects', 'projects')]);
  const lab = LAB_ITEMS.find((i) => q.includes(i.name.toLowerCase()) || q.includes(i.slug.replace(/-/g, ' ')) || q.includes(i.slug));
  if (lab) return reply(`${lab.name}: ${lab.blurb}`, [nav(`Open ${lab.file}`, `lab/${lab.slug}`)], info ? -1 : 0);
  if (has(q, /\b(random|surprise|another|any|pick)\b.*\b(toy|game|lab|thing|one)\b/, /\b(another one|pick a random toy)\b/)) return randomToy();
  if (has(q, /\b(game|games|play|bored|snake|puzzle)\b/)) return reply(`The lab has ${GAMES.length} games: ${GAMES.map((g) => g.name).join(', ')}. And a bunch of toys.`, [...GAMES.slice(0, 2).map((g) => nav(`Play ${g.file}`, `lab/${g.slug}`)), ask('Pick a random toy')]);
  if (has(q, /\b(projects?|work|portfolio|built|made|apps?|dự án|du an)\b/)) {
    if (info) return projectsList();
    return reply('Opening the projects page.', [nav('Projects', 'projects'), ask('List the projects', 'list projects')], 0);
  }
  if (has(q, /\b(lab|experiments?|toys?)\b/)) return reply(info ? `The lab is where the experiments live: ${LAB_ITEMS.length} things to poke at. Games, toys, and a tool.` : 'Opening the lab.', [nav('The lab', 'lab'), ask('Pick a random toy')], info ? -1 : 0);

  // 8) điều hướng trang
  if (has(q, /\b(log|journey|history|timeline|git log)\b/)) return reply('Opening log.sh, the life story as a git log.', [nav('log.sh', 'about', undefined, '#about-journey')], 0);
  if (has(q, /\bskills?(\.js)?\b/)) return reply('Opening skills.js.', [nav('skills.js', 'about', undefined, '#about-skills')], 0);
  if (has(q, /\babout\b/)) return reply('Opening about.js.', [nav('about.js', 'about')], 0);
  if (has(q, /\b(home|homepage|start|beginning|main page)\b/)) return reply('Taking you home.', [nav('Home', 'home')], 0);

  // 9) tiện ích
  if (has(q, /\bjoke\b/)) return reply(pickOne(JOKES), [ask('Another joke', 'tell me a joke')]);
  if (has(q, /\b(tip|fun fact|trick|secret|easter egg|hint|cheat)\b/)) return reply(pickOne(TIPS), [ask('Another tip', 'tip')]);
  if (has(q, /\b(quiet|shut up|stop talking|be quiet|silence|mute)\b/)) return { ...reply('Okay, I will stop volunteering tips. I am still here if you call me (press ?).', [{ label: 'Talk to me again', type: 'ask', q: 'talk to me' }]), quiet: true };
  if (has(q, /\b(talk to me|unmute|chatty)\b/)) return { ...reply('Back to being helpful, at least once a minute.'), quiet: false };

  // 10) không hiểu
  return reply(pickOne(['Hmm, I looked everywhere, but I could not find that. Try asking about the projects, the lab, the stack, or how to get in touch.', 'I am only a paperclip, and that one went over my head. Here are some things I do know:']), [ask('What can you do?'), ask('Show me the projects'), ask('Surprise me')]);
}
