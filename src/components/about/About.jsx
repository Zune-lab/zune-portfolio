import { useEffect, useRef, useState } from 'react';
import SectionHead from '../ui/SectionHead.jsx';
import { aboutBlurb, gitLog, stack, role, location, startYear, mainStack, learning } from '../../data/profile.js';
import { useStatus } from '../../lib/status.js';
import { useNap } from '../../lib/nap.js';
import { has, prefersReducedMotion } from '../../lib/env.js';
import { observeOnce } from '../../lib/observe.js';
import { useAsleep } from '../../lib/social.js';
import './About.css';
import { WRAP } from '../../config/ui.js';

// các dòng trong object `zune` ở about.js (role / based_in lấy từ data/profile.js); dòng `status` bên dưới lấy trạng thái thật
const FACTS = [
  ['role', role],
  ['based_in', `${location}, VN`],
  ['started_coding', startYear],
  ['favorite_stack', mainStack],
  ['currently_learning', learning],
  ['fun_fact', 'debugging CSS all night and never getting bored'],
  ['coffee_or_tea', 'tea'],
];

// màu theo loại commit trong log.sh (tiền tố "feat:", "fix:"... của msg)
const TYPES = {
  init: 'var(--text)', feat: 'var(--green)', fix: '#ff5f56', chore: 'var(--text-dim)',
  refactor: 'var(--css-lang)', revert: 'var(--amber)', wip: 'var(--amber)',
};
const parseMsg = (msg) => {
  const type = msg.slice(0, Math.max(0, msg.indexOf(':')));
  return has(TYPES, type) ? [type, msg.slice(type.length + 1).trim()] : ['', msg];
};

// skills.js: nhóm lại từ danh sách `stack` trong profile.js; mục nào chưa xếp nhóm tự rơi vào "other"
const GROUPS = [
  ['languages', ['HTML', 'CSS', 'JavaScript', 'TypeScript']],
  ['frameworks', ['React', 'Next.js', 'Tailwind CSS', 'Node.js']],
  ['design', ['Figma']],
];
const MIN_SLEEP_MS = 3000;
const LEARNING = new Set(['TypeScript', 'Next.js']);
const SKILLS = (() => {
  const grouped = new Set(GROUPS.flatMap(([, items]) => items));
  return [...GROUPS, ['other', stack.filter((s) => !grouped.has(s))]]
    .map(([name, items]) => [name, items.filter((s) => stack.includes(s))])
    .filter(([, items]) => items.length);
})();

// dòng cuối của code: zune ngủ thì tự gõ `hello` -> `sleep`, dậy thì gõ lại `hello` và nói một câu (câu nằm thêm 3s rồi mất).
// Hai cách làm zune ngủ: ~45s không đụng gì (screensaver DVD bật, why='idle') hoặc hết pin xã hội (why='battery')
function HelloLine({ sleeping, why }) {
  const [word, setWord] = useState('hello');
  const [note, setNote] = useState('');
  const cur = useRef('hello'); // từ đang hiện, để lượt gõ mới biết phải xoá bao nhiêu chữ
  const lastWhy = useRef(why);
  const sleptAt = useRef(0); // lúc bắt đầu ngủ: pin sạc 1%/giây nên ngủ vì hết pin chỉ ~1s, giữ `sleep` hiện đủ lâu để kịp đọc
  useEffect(() => {
    const reduce = prefersReducedMotion();
    let dead = false;
    let timer = 0;
    const wait = (ms) => new Promise((r) => { timer = window.setTimeout(r, reduce ? 0 : ms); });
    const show = (w) => { cur.current = w; setWord(w); };
    const retype = async (target) => {
      while (cur.current) { await wait(60); if (dead) return false; show(cur.current.slice(0, -1)); }
      for (const ch of target) { await wait(90); if (dead) return false; show(cur.current + ch); }
      return true;
    };
    (async () => {
      if (sleeping) {
        lastWhy.current = why;
        sleptAt.current ||= performance.now();
        setNote('');
        if (cur.current !== 'sleep' && !(await retype('sleep'))) return;
        setNote(why === 'battery' ? ' // zzz... social battery: 0%' : ' // zzz...');
        return;
      }
      if (cur.current !== 'hello') {
        await wait(MIN_SLEEP_MS - (performance.now() - sleptAt.current));
        if (dead) return;
        sleptAt.current = 0;
        setNote('');
        if (!(await retype('hello'))) return;
        setNote(lastWhy.current === 'battery' ? ' // oh. hi. battery recharged' : ' // oh. hi. i was just resting my eyes');
      }
      await wait(3000);
      if (!dead) setNote('');
    })();
    return () => { dead = true; clearTimeout(timer); };
  }, [sleeping, why]);
  return (
    <span className="ab-line">
      zune.<span className="ab-fn">{word}</span>()
      {note && <span className="ab-cm">{note}</span>}
      <span className="ab-caret" aria-hidden="true" />
    </span>
  );
}

// các phần tử .ab-rev hiện dần khi cuộn tới (tắt khi người dùng bật "giảm chuyển động")
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    return observeOnce(ref.current.querySelectorAll('.ab-rev'), (el) => el.classList.add('is-in'), 0.12);
  }, []);
  return ref;
}

function Win({ title, lang, foot, children }) {
  return (
    <div className="ab-win ab-rev">
      <div className="ab-bar">
        <span className="ab-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="ab-title">{title}</span>
        <span className="ab-lang">{lang}</span>
      </div>
      {children}
      {foot && <div className="ab-foot">{foot}</div>}
    </div>
  );
}

// khối code ở about.js: tự lấy trạng thái online/busy..., pin xã hội và screensaver, nên chỉ nó render lại khi các thứ đó đổi
function CodeWindow() {
  const status = useStatus();
  const nap = useNap();
  const tired = useAsleep(); // hết pin xã hội
  const sleeping = nap === 'nap' || tired;
  return (
    <Win
      title="about.js"
      lang="JavaScript"
      foot={<><span>Ln {FACTS.length + 5}, Col 1</span><span>UTF-8</span><span>Spaces: 2</span></>}
    >
      <pre className={`ab-code${sleeping ? ' is-asleep' : ''}`}>
        <span className="ab-line"><b className="ab-kw">const</b> zune = {'{'}</span>
        {FACTS.map(([k, v]) => (
          <span key={k} className="ab-line ab-ind">
            {k}:{' '}
            {typeof v === 'number' ? <span className="ab-num">{v}</span> : <span className="ab-str">"{v}"</span>},
          </span>
        ))}
        <span className="ab-line ab-ind">
          status: <span style={{ color: status.color }}>"{status.key}"</span>,
          <span className={`ab-live${status.pulse ? ' is-pulse' : ''}`} style={{ '--c': status.color }} aria-hidden="true" />
          <span className="ab-cm">// chillax guys</span>
        </span>
        <span className="ab-line">{'};'}</span>
        <span className="ab-line"><span className="ab-cm">// hover a line, it lights up</span></span>
        <HelloLine sleeping={sleeping} why={nap === 'nap' ? 'idle' : 'battery'} />
      </pre>
    </Win>
  );
}

const Label = ({ children }) => (
  <h3 className="font-mono text-[12.5px] uppercase tracking-[0.08em] text-dim mb-4">{children}</h3>
);

export default function About() {
  const root = useReveal();
  const years = new Date().getFullYear() - startYear;
  const stats = [
    [years, 'years coding'],
    [gitLog.length, 'commits in life.log'],
    [stack.length, 'tools in the stack'],
  ];

  return (
    <section id="about" ref={root} className="py-20 border-t border-line">
      <div className={WRAP}>
        <SectionHead num="01" title="about.js" level={1} />
        <p className="font-mono text-[12.5px] text-dim -mt-6 mb-10">// a few things about me</p>

        {/* intro: editor + readme + số liệu */}
        <div id="about-intro" className="mb-14 scroll-mt-20 grid gap-5 lg:grid-cols-[1.35fr_1fr] items-start">
          <CodeWindow />

          <div className="flex flex-col gap-5 min-w-0">
            <div className="ab-card ab-rev">
              <div className="ab-k">// readme.md</div>
              <p className="text-[15px] leading-[1.75] text-ink">
                {aboutBlurb.charAt(0).toUpperCase() + aboutBlurb.slice(1)}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {stats.map(([n, label], i) => (
                <div key={label} className="ab-rev" style={{ '--i': i + 1 }}>
                  <div className="ab-stat">
                    <b>{n}</b>
                    <span>{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* hành trình: git graph */}
        <div id="about-journey" className="mb-14 scroll-mt-20">
          <Label>// log.sh</Label>
          <Win title="log.sh" lang="bash">
            <div className="ab-term">
              <div className="text-dim mb-5">$ git log --graph --oneline --reverse life</div>
              <ol className="ab-tl">
                {gitLog.map((e, i) => {
                  const [type, text] = parseMsg(e.msg);
                  return (
                    <li
                      key={e.hash}
                      className={`ab-rev${e.date === 'now' ? ' is-now' : ''}`}
                      style={{ '--i': i, '--c': TYPES[type] ?? 'var(--text-dim)' }}
                    >
                      <span className="ab-dot" aria-hidden="true" />
                      <div className="ab-meta">
                        <span className="ab-hash">{e.hash}</span>
                        <span className="ab-date">{e.date}</span>
                        {type && <span className="ab-badge">{type}</span>}
                        {e.date === 'now' && <span className="ab-head">HEAD → main</span>}
                      </div>
                      <p className="ab-msg">{text}</p>
                    </li>
                  );
                })}
              </ol>
              <div className="text-dim mt-5">$ <span className="ab-caret" aria-hidden="true" /></div>
            </div>
          </Win>
        </div>

        {/* kỹ năng */}
        <div id="about-skills" className="scroll-mt-20">
          <Label>// skills.js</Label>
          <Win title="skills.js" lang="JavaScript">
            <div className="ab-skills">
              {SKILLS.map(([name, items]) => (
                <div key={name}>
                  <div className="ab-k">// {name}</div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((s) => (
                      <span key={s} className="ab-chip">
                        {s}
                        {LEARNING.has(s) && <em>learning</em>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Win>
        </div>
      </div>
    </section>
  );
}
