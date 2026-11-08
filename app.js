function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState,
  useEffect,
  useMemo,
  useRef
} = React;

// 공유 저장소가 막히면 개인 저장소로 자동 전환 (게시 전에는 공유 쓰기가 안 될 수 있음)
let shared = true;
const box = {
  async get(key) {
    return store.get(key, shared);
  },
  async set(key, value) {
    if (shared) {
      try {
        return await store.set(key, value);
      } catch (e) {
        shared = false;
      }
    }
    return store.set(key, value, false);
  }
};
const sb = window.supabase.createClient(window.CONFIG.url, window.CONFIG.anonKey);
const store = {
  async get(key) {
    const {
      data,
      error
    } = await sb.from('app_state').select('value').eq('key', key).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('no value');
    return {
      key,
      value: data.value
    };
  },
  async set(key, value) {
    const {
      error
    } = await sb.from('app_state').upsert({
      key,
      value,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    return {
      key,
      value
    };
  }
};
const PALETTE = ['#FFD84D', '#7FD9C4', '#FF9EB5', '#A3B8FF', '#C7A6FF', '#FFB877'];
const FACES = ['🐰', '🐻', '🐯', '🐼', '🦊', '🐨', '🐸', '🦁', '🐥', '🐙', '🦄', '🐢'];
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const CONFIG_KEY = 'family:config';
const PHOTOS_KEY = 'family:photos';
const WALLET_KEY = 'family:wallet';
const logKey = ym => `family:log:${ym}`;
const uid = () => Math.random().toString(36).slice(2, 9);

// 업로드한 사진을 200px 정사각형으로 줄여 용량을 아낀다
const shrinkPhoto = file => new Promise((resolve, reject) => {
  const fr = new FileReader();
  fr.onerror = () => reject(new Error('파일을 읽지 못했어요'));
  fr.onload = () => {
    const img = new Image();
    img.onerror = () => reject(new Error('사진 파일이 아닌 것 같아요'));
    img.onload = () => {
      const S = 200;
      const c = document.createElement('canvas');
      c.width = S;
      c.height = S;
      const side = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
      resolve(c.toDataURL('image/jpeg', 0.75));
    };
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
});
const pad = n => String(n).padStart(2, '0');
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const DEFAULT_CONFIG = {
  kids: [{
    id: 'k1',
    name: '첫째',
    color: PALETTE[0],
    face: '🐰'
  }, {
    id: 'k2',
    name: '둘째',
    color: PALETTE[1],
    face: '🐻'
  }, {
    id: 'k3',
    name: '셋째',
    color: PALETTE[2],
    face: '🐯'
  }],
  tasks: [{
    id: 't1',
    title: '아침에 일어나서 이불 정리',
    time: '07:30',
    days: [1, 2, 3, 4, 5],
    kids: 'all'
  }, {
    id: 't2',
    title: '숙제 끝내기',
    time: '17:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    kids: 'all'
  }, {
    id: 't3',
    title: '책 20분 읽기',
    time: '20:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    kids: 'all'
  }, {
    id: 't4',
    title: '피아노 학원',
    time: '16:00',
    days: [2, 4],
    kids: ['k1']
  }, {
    id: 't5',
    title: '태권도',
    time: '16:30',
    days: [1, 3, 5],
    kids: ['k2', 'k3']
  }, {
    id: 't6',
    title: '뇌파훈련',
    time: '19:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    kids: 'all',
    reward: 1000
  }]
};
const INK = '#2B2A4C';
const RAINBOW = ['#FF5C8A', '#FF9F1C', '#F2B705', '#2EC4B6', '#3A86FF', '#8338EC'];
// 할 일 이름을 보고 어울리는 이모지를 붙인다
const EMOJI_RULES = [[/합기도|태권도|검도|유도|주짓수|무술/, '🥋'], [/줄넘기/, '🪢'], [/수영/, '🏊'], [/피아노/, '🎹'], [/바이올린|첼로/, '🎻'], [/기타|우쿨렐레/, '🎸'], [/미술|그림/, '🎨'], [/축구/, '⚽'], [/농구/, '🏀'], [/야구/, '⚾'], [/발레|댄스|춤/, '🩰'], [/숙제|학습지|문제집|공부/, '📝'], [/수학|연산/, '🔢'], [/영어/, '🔤'], [/책|독서|읽기/, '📚'], [/일기|글쓰기/, '✏️'], [/이불|정리|청소/, '🧹'], [/양치/, '🪥'], [/치과/, '🦷'], [/병원/, '🏥'], [/뇌파|명상/, '🧠'], [/운동|달리기|산책/, '🏃'], [/샤워|목욕|씻/, '🛁'], [/밥|식사/, '🍚'], [/잠|취침/, '🌙'], [/학원|수업/, '🏫']];
const taskEmoji = t => t.emoji || EMOJI_RULES.find(([r]) => r.test(t.title))?.[1] || '⭐';
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Jua&family=Gaegu:wght@400;700&family=Gothic+A1:wght@400;500;700&display=swap');

.wrap { font-family:'Gothic A1', system-ui, sans-serif; color:${INK}; min-height:100vh; box-sizing:border-box;
  --kc:#FFD84D;
  background-color:#FFF6E4;
  background-image:
    radial-gradient(#FFB3C7 2.2px, transparent 2.8px),
    radial-gradient(#9FD3FF 2.2px, transparent 2.8px),
    radial-gradient(#B9F0C9 2.2px, transparent 2.8px),
    linear-gradient(180deg, #FFF2D9 0%, #FFEAF2 55%, #E8F3FF 100%);
  background-size:46px 46px, 46px 46px, 46px 46px, 100% 100%;
  background-position:0 0, 23px 23px, 23px 0, 0 0;
  background-attachment:fixed; }
.display { font-family:'Jua','Gothic A1',sans-serif; letter-spacing:-.3px; }
.hand { font-family:'Gaegu','Gothic A1',cursive; }
.title { font-family:'Jua',sans-serif; font-size:36px; line-height:1; margin:4px 0 0; letter-spacing:-.5px; }
.title b { font-weight:400; display:inline-block; text-shadow:2px 3px 0 ${INK}; -webkit-text-stroke:1px ${INK}; }
.title b:nth-child(odd) { transform:rotate(-4deg); } .title b:nth-child(even) { transform:rotate(3deg) translateY(2px); }
.datepill { display:inline-block; background:#fff; border:2.5px solid ${INK}; border-radius:999px; padding:3px 12px; font-family:'Jua',sans-serif; font-size:15px; box-shadow:0 3px 0 ${INK}; }
.card { position:relative; background:#FFFFFF; border:3px solid ${INK}; border-radius:22px; box-shadow:0 5px 0 ${INK}; }
.tape { position:absolute; top:-12px; left:50%; margin-left:-30px; width:60px; height:20px; border-radius:6px; background:var(--kc); border:2.5px solid ${INK}; transform:rotate(-3deg); }
.tab { font-family:'Jua',sans-serif; font-size:17px; padding:8px 18px; border-radius:999px; border:3px solid ${INK}; background:#fff; cursor:pointer; color:${INK}; box-shadow:0 3px 0 ${INK}; }
.tab[data-on="true"] { color:#fff; background:#FF5C8A; text-shadow:1px 1px 0 ${INK}; }
.navbar { position:fixed; left:0; right:0; bottom:0; z-index:8; display:flex; justify-content:center; padding:8px 8px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:3px solid ${INK}; }
.navbar > div { display:flex; gap:6px; width:100%; max-width:560px; }
.nav { flex:1; display:flex; flex-direction:column; align-items:center; gap:1px; padding:5px 0 4px; border-radius:16px; border:2.5px solid transparent; background:none; cursor:pointer; font-family:'Jua',sans-serif; font-size:13px; color:#8A88A6; transition:transform .18s cubic-bezier(.2,1.6,.4,1); }
.nav span { font-size:24px; line-height:1.1; filter:grayscale(.5); opacity:.75; }
.nav[data-on="true"] { background:var(--tc); color:${INK}; border-color:${INK}; box-shadow:0 3px 0 ${INK}; transform:translateY(-3px); }
.nav[data-on="true"] span { filter:none; opacity:1; }
.chip { border:2.5px solid ${INK}; background:#fff; border-radius:999px; padding:6px 12px; font-size:13px; cursor:pointer; color:${INK}; font-family:'Jua',sans-serif; }
.chip[data-on="true"] { background:var(--kc); box-shadow:0 3px 0 ${INK}; transform:translateY(-1px); }
.kid { display:flex; align-items:center; gap:7px; border:3px solid ${INK}; border-radius:999px; padding:5px 16px 5px 5px; background:#fff; cursor:pointer; font-family:'Jua',sans-serif; font-size:17px; color:${INK}; transition:transform .18s cubic-bezier(.2,1.6,.4,1); }
.kid[data-on="true"] { box-shadow:0 4px 0 ${INK}; transform:translateY(-3px) rotate(-2deg); }
.face { border-radius:50%; display:grid; place-items:center; overflow:hidden; flex:none; border:2.5px solid ${INK}; }
.face img { width:100%; height:100%; object-fit:cover; display:block; }
.list { display:flex; flex-direction:column; gap:9px; padding:12px; }
.row { position:relative; display:flex; align-items:center; gap:12px; padding:13px 12px; border:3px solid ${INK}; border-radius:18px; cursor:pointer; background:#fff; width:100%; text-align:left; box-shadow:0 4px 0 ${INK}; overflow:hidden; font-family:inherit; color:inherit; }
.row:active { transform:translateY(3px); box-shadow:0 1px 0 ${INK}; }
.emo { position:relative; z-index:1; font-size:24px; width:40px; height:40px; flex:none; display:grid; place-items:center; border-radius:12px; background:#F4F1FF; border:2px solid ${INK}; }
.swipe { position:absolute; inset:0; transform-origin:left center; transform:scaleX(0); transition:transform .35s cubic-bezier(.2,.9,.3,1); pointer-events:none; }
.row[data-done="true"] .swipe { transform:scaleX(1); }
.row .label { position:relative; z-index:1; }
.row[data-done="true"] .emo { background:#fff; }
.row[data-done="true"] .label ~ .label { opacity:0; }
.box { position:relative; z-index:1; width:30px; height:30px; border:3px solid ${INK}; border-radius:50%; flex:none; display:grid; place-items:center; background:#fff; }
.tick { width:15px; height:15px; stroke:${INK}; stroke-width:3.6; fill:none; stroke-linecap:round; stroke-dasharray:22; stroke-dashoffset:22; transition:stroke-dashoffset .25s ease .05s; }
.row[data-done="true"] .tick { stroke-dashoffset:0; }
.stamp { position:absolute; right:10px; top:50%; z-index:2; width:58px; height:58px; margin-top:-29px; border:3px double #E63946; border-radius:50%; color:#E63946; background:rgba(255,255,255,.75); font-family:'Gaegu',cursive; font-size:15px; font-weight:700; line-height:1.05; display:grid; place-items:center; text-align:center; pointer-events:none;
  opacity:0; transform:rotate(-24deg) scale(2.2); transition:opacity .16s, transform .2s cubic-bezier(.2,1.8,.4,1); }
.row[data-done="true"] .stamp { opacity:.9; transform:rotate(-14deg) scale(1); }
.stroke { height:20px; background:#F1EEF8; border-radius:999px; overflow:hidden; border:2.5px solid ${INK}; }
.stroke i { display:block; height:100%; border-radius:999px; transition:width .5s cubic-bezier(.2,1.3,.4,1);
  background-image:repeating-linear-gradient(-45deg, rgba(255,255,255,.45) 0 7px, transparent 7px 14px); }
.inp { border:2.5px solid ${INK}; border-radius:12px; background:#fff; padding:9px 11px; font-family:'Gothic A1',sans-serif; font-size:15px; color:${INK}; outline:none; width:100%; box-sizing:border-box; min-width:0; }
.btn { font-family:'Jua',sans-serif; font-size:16px; border:3px solid ${INK}; background:#FFD84D; color:${INK}; border-radius:999px; padding:9px 18px; cursor:pointer; box-shadow:0 4px 0 ${INK}; }
.btn:active { transform:translateY(3px); box-shadow:0 1px 0 ${INK}; }
.btn.ghost { background:#fff; }
.btn { white-space:nowrap; }
.btn.tiny { padding:4px 11px; font-size:13px; background:#fff; box-shadow:0 2px 0 ${INK}; border-width:2px; }
button:focus-visible, .inp:focus-visible { outline:3px solid #3A86FF; outline-offset:2px; }
.cal { display:grid; grid-template-columns:repeat(7,1fr); gap:5px; }
.cell { aspect-ratio:1; border:2.5px solid ${INK}; border-radius:12px; display:grid; place-items:center; font-size:12px; font-family:'Jua',sans-serif; position:relative; overflow:hidden; background:#fff; }
.cell .fill { position:absolute; left:0; right:0; bottom:0; }
.cell span { position:relative; z-index:1; }
.pop { animation:pop .5s cubic-bezier(.2,1.6,.4,1); }
@keyframes pop { 0%{transform:scale(.6) rotate(-8deg);opacity:0} 100%{transform:none;opacity:1} }
.confetti { position:absolute; top:0; width:9px; height:13px; border-radius:3px; animation:fall 1.4s linear infinite; }
@keyframes fall { 0%{transform:translateY(-14px) rotate(0);opacity:1} 100%{transform:translateY(150px) rotate(420deg);opacity:0} }
.fab { position:fixed; right:18px; bottom:calc(92px + env(safe-area-inset-bottom)); width:64px; height:64px; border-radius:50%; border:3px solid ${INK}; background:conic-gradient(#FF5C8A, #FF9F1C, #F2B705, #2EC4B6, #3A86FF, #8338EC, #FF5C8A); box-shadow:0 5px 0 ${INK}; font-family:'Jua',sans-serif; font-size:38px; line-height:1; color:#fff; text-shadow:0 0 4px ${INK}, 2px 2px 0 ${INK}; cursor:pointer; z-index:9; }
.fab:active { transform:translateY(4px); box-shadow:0 1px 0 ${INK}; }
.lbl { font-size:12px; letter-spacing:1px; color:#6E6A8E; display:block; margin-bottom:6px; font-family:'Jua',sans-serif; }
.krow { border:2.5px dashed #C9C3E0; border-radius:16px; padding:10px; margin-bottom:8px; }
.krow[data-on="true"] { border-style:solid; border-color:${INK}; }
.linkbtn { background:none; border:none; padding:4px 0; font-size:13px; color:#5B4FC4; text-decoration:underline; cursor:pointer; font-family:'Gothic A1',sans-serif; }
.kidcol { border-radius:20px; padding:10px 8px 12px; border:3px solid ${INK}; min-width:0; }
.tile { position:relative; border:2.5px solid ${INK}; border-radius:14px; padding:9px 9px; cursor:pointer; text-align:left; overflow:hidden; background:#fff; box-shadow:0 3px 0 ${INK}; font-family:inherit; color:inherit; }
.tile:active { transform:translateY(2px); box-shadow:0 1px 0 ${INK}; }
@media (prefers-reduced-motion: reduce) { *, .confetti { animation:none !important; transition:none !important; } }
`;
function App() {
  const [cfg, setCfg] = useState(null);
  const [logs, setLogs] = useState({});
  const [tab, setTab] = useState('home');
  const [kidId, setKidId] = useState(null);
  const [cursor, setCursor] = useState(new Date());
  const [photos, setPhotos] = useState({});
  const [wallet, setWallet] = useState({});
  const [err, setErr] = useState('');
  const today = new Date();
  const tKey = dateKey(today);
  const tMonth = monthKey(today);
  useEffect(() => {
    (async () => {
      let conf = DEFAULT_CONFIG;
      try {
        const r = await box.get(CONFIG_KEY);
        if (r?.value) conf = JSON.parse(r.value);
      } catch (e) {
        try {
          await box.set(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
        } catch (_) {}
      }
      setCfg(conf);
      setKidId(conf.kids[0]?.id ?? null);
      try {
        const r = await box.get(PHOTOS_KEY);
        if (r?.value) setPhotos(JSON.parse(r.value));
      } catch (e) {/* 아직 올린 사진이 없음 */}
      try {
        const r = await box.get(WALLET_KEY);
        if (r?.value) setWallet(JSON.parse(r.value));
      } catch (e) {/* 아직 용돈 기록이 없음 */}
      try {
        const r = await box.get(logKey(tMonth));
        if (r?.value) setLogs({
          [tMonth]: JSON.parse(r.value)
        });else setLogs({
          [tMonth]: {}
        });
      } catch (e) {
        setLogs({
          [tMonth]: {}
        });
      }
    })();
  }, []);
  useEffect(() => {
    const ch = sb.channel('sync').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'app_state'
    }, p => {
      const k = p.new?.key,
        v = p.new?.value;
      if (!k || v == null) return;
      try {
        if (k === CONFIG_KEY) setCfg(JSON.parse(v));else if (k === PHOTOS_KEY) setPhotos(JSON.parse(v));else if (k === WALLET_KEY) setWallet(JSON.parse(v));else if (k.startsWith('family:log:')) setLogs(prev => ({
          ...prev,
          [k.slice(11)]: JSON.parse(v)
        }));
      } catch (e) {}
    }).subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, []);
  const loadMonth = async ym => {
    if (logs[ym]) return;
    try {
      const r = await box.get(logKey(ym));
      setLogs(p => ({
        ...p,
        [ym]: r?.value ? JSON.parse(r.value) : {}
      }));
    } catch (e) {
      setLogs(p => ({
        ...p,
        [ym]: {}
      }));
    }
  };
  const saveCfg = async next => {
    setCfg(next);
    setErr('');
    for (let i = 0; i < 3; i++) {
      try {
        await box.set(CONFIG_KEY, JSON.stringify(next));
        return;
      } catch (e) {
        await new Promise(r => setTimeout(r, 400 * (i + 1)));
      }
    }
    setErr('저장이 안 됐어요. 잠시 후 다시 눌러주세요.');
  };
  const saveWallet = async next => {
    setWallet(next);
    setErr('');
    try {
      await box.set(WALLET_KEY, JSON.stringify(next));
    } catch (e) {
      setErr('용돈 기록 저장이 안 됐어요. 인터넷 확인 후 다시 해주세요.');
    }
  };
  const savePhotos = async next => {
    setPhotos(next);
    try {
      await box.set(PHOTOS_KEY, JSON.stringify(next));
    } catch (e) {
      setErr('사진 저장이 안 됐어요. 조금 더 작은 사진으로 해보세요.');
    }
  };
  const tasksFor = (kid, date) => (cfg?.tasks ?? []).flatMap(t => {
    // 아이·요일별 시간표가 있는 할 일: 그 아이의 그 요일 칸에 시간이 있을 때만 보인다
    if (t.sched && !t.date) {
      const tm = t.sched[kid]?.[date.getDay()];
      return tm == null ? [] : [{
        ...t,
        time: tm
      }];
    }
    const hit = (t.kids === 'all' || t.kids.includes(kid)) && (t.date ? t.date === dateKey(date) : t.days.includes(date.getDay()));
    return hit ? [t] : [];
  }).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState(null);
  const [unlocked, setUnlocked] = useState(false);
  const saveTaskApp = t => {
    const exists = cfg.tasks.some(x => x.id === t.id);
    saveCfg({
      ...cfg,
      tasks: exists ? cfg.tasks.map(x => x.id === t.id ? t : x) : [...cfg.tasks, t]
    });
  };
  const doneList = (dk, kid) => logs[dk.slice(0, 7)]?.[dk]?.[kid] ?? [];

  // 아무 아이·아무 날짜나 체크할 수 있는 범용 토글 (대시보드에서 사용)
  const toggleFor = async (kid, dk, taskId) => {
    const ym = dk.slice(0, 7);
    const month = logs[ym] ?? {};
    const day = month[dk] ?? {};
    const cur = day[kid] ?? [];
    const next = cur.includes(taskId) ? cur.filter(x => x !== taskId) : [...cur, taskId];
    const nextMonth = {
      ...month,
      [dk]: {
        ...day,
        [kid]: next
      }
    };
    setLogs(p => ({
      ...p,
      [ym]: nextMonth
    }));
    try {
      await box.set(logKey(ym), JSON.stringify(nextMonth));
    } catch (e) {
      setErr('체크 저장이 안 됐어요. 인터넷 확인 후 다시 눌러주세요.');
    }
  };
  const toggle = taskId => toggleFor(kidId, tKey, taskId);
  if (!cfg) return /*#__PURE__*/React.createElement("div", {
    className: "wrap",
    style: {
      padding: 40
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "display",
    style: {
      fontSize: 22
    }
  }, "\uBD88\uB7EC\uC624\uB294 \uC911\u2026"));
  const kid = cfg.kids.find(k => k.id === kidId) ?? cfg.kids[0];
  return /*#__PURE__*/React.createElement("div", {
    className: "wrap",
    style: {
      padding: '18px 14px 120px',
      '--kc': tab === 'home' ? '#FFD84D' : kid.color
    }
  }, /*#__PURE__*/React.createElement("style", null, CSS), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: tab === 'home' ? 1100 : 620,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, h("span", {
    className: "datepill"
  }, today.getMonth() + 1, "\uC6D4 ", today.getDate(), "\uC77C ", DOW[today.getDay()], "\uC694\uC77C")), /*#__PURE__*/React.createElement("h1", {
    className: "title"
  }, [...'우리집'].map((c, i) => h("b", {
    key: i,
    style: {
      color: RAINBOW[i]
    }
  }, c)), ' ', [...'스케줄러'].map((c, i) => h("b", {
    key: 'b' + i,
    style: {
      color: RAINBOW[(i + 3) % 6]
    }
  }, c)), h("span", {
    style: {
      fontSize: 28,
      marginLeft: 6
    }
  }, "\uD83C\uDF08"))), h("nav", {
    className: "navbar"
  }, h("div", null, [['home', '종합', '🏠', '#FFD84D'], ['today', '오늘', '☀️', '#FFB3C7'], ['record', '기록', '📅', '#9FD3FF'], ['wallet', '용돈', '🐷', '#B9F0C9'], ['setup', '설정', '⚙️', '#D9C8FF']].map(([k, l, e, c]) => h("button", {
    key: k,
    className: "nav",
    "data-on": tab === k,
    onClick: () => setTab(k),
    style: {
      '--tc': c
    }
  }, h("span", null, e), l)))), err && /*#__PURE__*/React.createElement("p", {
    style: {
      background: '#FFF0F0',
      border: '1px solid #E8B4B4',
      padding: 10,
      fontSize: 13,
      borderRadius: 3
    }
  }, err), tab !== 'home' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      marginBottom: 14
    }
  }, cfg.kids.map(k => /*#__PURE__*/React.createElement("button", {
    key: k.id,
    className: "kid",
    "data-on": k.id === kidId,
    onClick: () => setKidId(k.id),
    style: {
      background: k.id === kidId ? k.color : '#fff'
    }
  }, /*#__PURE__*/React.createElement(Face, {
    kid: k,
    photo: photos[k.id],
    size: 34
  }), k.name))), tab === 'home' && /*#__PURE__*/React.createElement(Dashboard, {
    cfg: cfg,
    photos: photos,
    logs: logs,
    today: today,
    tasksFor: tasksFor,
    doneList: doneList,
    onToggle: toggleFor,
    ensureMonth: loadMonth
  }), tab === 'today' && /*#__PURE__*/React.createElement(Today, {
    kid: kid,
    tasks: tasksFor(kid.id, today),
    done: doneList(tKey, kid.id),
    onToggle: toggle,
    today: today
  }), tab === 'record' && /*#__PURE__*/React.createElement(Record, {
    cfg: cfg,
    kid: kid,
    logs: logs,
    cursor: cursor,
    setCursor: d => {
      setCursor(d);
      loadMonth(monthKey(d));
    },
    tasksFor: tasksFor,
    today: today
  }), tab === 'wallet' && /*#__PURE__*/React.createElement(Wallet, {
    cfg: cfg,
    kid: kid,
    wallet: wallet,
    save: saveWallet,
    logs: logs,
    today: today,
    ensureMonth: loadMonth
  }), tab === 'setup' && /*#__PURE__*/React.createElement(Setup, {
    cfg: cfg,
    save: saveCfg,
    photos: photos,
    savePhotos: savePhotos,
    setErr: setErr
  })), tab !== 'setup' && tab !== 'wallet' && !adding && !detail && /*#__PURE__*/React.createElement("button", {
    className: "fab",
    "aria-label": "\uD560 \uC77C \uBC14\uB85C \uCD94\uAC00",
    onClick: () => setAdding(true)
  }, "+"), adding && /*#__PURE__*/React.createElement(QuickAdd, {
    cfg: cfg,
    kidId: kidId,
    today: today,
    unlocked: unlocked,
    onUnlock: () => setUnlocked(true),
    onClose: () => setAdding(false),
    onSave: t => {
      saveTaskApp(t);
      setAdding(false);
    },
    onDetail: t => {
      setAdding(false);
      setDetail(t);
    }
  }), detail && /*#__PURE__*/React.createElement(TaskEditor, {
    task: detail,
    kids: cfg.kids,
    onSave: t => {
      saveTaskApp(t);
      setDetail(null);
    },
    onDelete: () => setDetail(null),
    onCancel: () => setDetail(null)
  }));
}

// 입력이 멈춘 뒤에만 저장한다 (글자마다 저장하면 서버 제한에 걸림)
function LazyInput({
  value,
  onCommit,
  delay = 800,
  ...rest
}) {
  const [v, setV] = useState(value);
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) setV(value);
  }, [value]);
  useEffect(() => {
    if (!dirty.current || v === value) return;
    const t = setTimeout(() => {
      dirty.current = false;
      onCommit(v);
    }, delay);
    return () => clearTimeout(t);
  }, [v]);
  return /*#__PURE__*/React.createElement("input", _extends({}, rest, {
    value: v,
    onChange: e => {
      dirty.current = true;
      setV(e.target.value);
    },
    onBlur: () => {
      if (dirty.current && v !== value) {
        dirty.current = false;
        onCommit(v);
      }
    }
  }));
}
function Face({
  kid,
  photo,
  size = 30
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "face",
    style: {
      background: kid.color,
      width: size,
      height: size,
      fontSize: Math.round(size * 0.55)
    }
  }, photo ? /*#__PURE__*/React.createElement("img", {
    src: photo,
    alt: ""
  }) : kid.face ?? '🙂');
}
function Dashboard({
  cfg,
  photos,
  logs,
  today,
  tasksFor,
  doneList,
  onToggle,
  ensureMonth
}) {
  const [view, setView] = useState('day'); // 'day' | 'week'
  const [offset, setOffset] = useState(0); // 주 이동 (week 모드)

  // 이번 주(월~일) 날짜 배열
  const weekDates = useMemo(() => {
    const base = new Date(today);
    const mondayDiff = (base.getDay() + 6) % 7; // 월요일 기준
    base.setDate(base.getDate() - mondayDiff + offset * 7);
    return Array.from({
      length: 7
    }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, [today, offset]);

  // week 모드에서 필요한 달 데이터 미리 로드
  useEffect(() => {
    if (view === 'week') [...new Set(weekDates.map(monthKey))].forEach(ensureMonth);
  }, [view, weekDates]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "tab",
    "data-on": view === 'day',
    onClick: () => setView('day'),
    style: {
      fontSize: 19,
      padding: '9px 20px'
    }
  }, "\uC624\uB298 \uD558\uB8E8"), /*#__PURE__*/React.createElement("button", {
    className: "tab",
    "data-on": view === 'week',
    onClick: () => setView('week'),
    style: {
      fontSize: 19,
      padding: '9px 20px'
    }
  }, "\uC774\uBC88 \uC8FC")), view === 'day' ? /*#__PURE__*/React.createElement(DayGrid, {
    cfg: cfg,
    photos: photos,
    today: today,
    tasksFor: tasksFor,
    doneList: doneList,
    onToggle: onToggle
  }) : /*#__PURE__*/React.createElement(WeekGrid, {
    cfg: cfg,
    photos: photos,
    today: today,
    weekDates: weekDates,
    offset: offset,
    setOffset: setOffset,
    tasksFor: tasksFor,
    doneList: doneList,
    onToggle: onToggle
  }));
}

// ── 오늘 하루: 아이를 가로 열로, 시간순 할 일을 세로로 ──
function DayGrid({
  cfg,
  photos,
  today,
  tasksFor,
  doneList,
  onToggle
}) {
  const dk = dateKey(today);
  const cols = cfg.kids.map(k => ({
    kid: k,
    tasks: tasksFor(k.id, today),
    done: doneList(dk, k.id)
  }));
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "display",
    style: {
      fontSize: 28
    }
  }, today.getMonth() + 1, "\uC6D4 ", today.getDate(), "\uC77C (", DOW[today.getDay()], ")"), /*#__PURE__*/React.createElement("span", {
    className: "hand",
    style: {
      fontSize: 17,
      color: '#6E6A8E'
    }
  }, "\uC774\uB984\uC744 \uB20C\uB7EC \uCCB4\uD06C")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${cfg.kids.length}, 1fr)`,
      gap: 12
    }
  }, cols.map(({
    kid,
    tasks,
    done
  }) => {
    const rate = tasks.length ? Math.round(done.filter(d => tasks.some(t => t.id === d)).length / tasks.length * 100) : 0;
    const money = tasks.filter(t => done.includes(t.id)).reduce((s, t) => s + (t.reward || 0), 0);
    return /*#__PURE__*/React.createElement("div", {
      key: kid.id,
      className: "kidcol",
      style: {
        background: kid.color + '55'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement(Face, {
      kid: kid,
      photo: photos[kid.id],
      size: 56
    }), /*#__PURE__*/React.createElement("span", {
      className: "display",
      style: {
        fontSize: 19
      }
    }, kid.name), /*#__PURE__*/React.createElement("div", {
      className: "stroke",
      style: {
        width: '100%',
        height: 13
      }
    }, /*#__PURE__*/React.createElement("i", {
      style: {
        width: `${rate}%`,
        background: kid.color
      }
    })), /*#__PURE__*/React.createElement("span", {
      className: "hand",
      style: {
        fontSize: 17,
        color: '#6E6A8E'
      }
    }, rate, "%", money > 0 && ` · ${money.toLocaleString()}원`)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 7
      }
    }, tasks.length === 0 && /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 13,
        color: '#A5A1BF',
        textAlign: 'center',
        margin: '8px 0'
      }
    }, "\uC5C6\uC74C"), tasks.map(t => {
      const on = done.includes(t.id);
      return /*#__PURE__*/React.createElement("button", {
        key: t.id,
        className: "tile",
        onClick: () => onToggle(kid.id, dk, t.id),
        style: {
          background: on ? kid.color : '#fff'
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "display",
        style: {
          fontSize: 15,
          lineHeight: 1.3,
          textDecoration: on ? 'line-through' : 'none'
        }
      }, on ? '✅ ' : taskEmoji(t) + ' ', t.date && '★ ', t.title), (t.time || t.reward > 0) && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: '#4A4766',
          marginTop: 3
        }
      }, t.time, t.reward > 0 && ` · ${t.reward.toLocaleString()}원`));
    })));
  })));
}

// ── 이번 주: 요일 7칸 × 아이별로 달성률과 할 일 ──
function WeekGrid({
  cfg,
  photos,
  today,
  weekDates,
  offset,
  setOffset,
  tasksFor,
  doneList,
  onToggle
}) {
  const tk = dateKey(today);
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn tiny",
    onClick: () => setOffset(offset - 1)
  }, "\u2190 \uC9C0\uB09C\uC8FC"), /*#__PURE__*/React.createElement("span", {
    className: "display",
    style: {
      fontSize: 18
    }
  }, weekDates[0].getMonth() + 1, "/", weekDates[0].getDate(), " ~ ", weekDates[6].getMonth() + 1, "/", weekDates[6].getDate()), /*#__PURE__*/React.createElement("button", {
    className: "btn tiny",
    onClick: () => setOffset(offset + 1)
  }, "\uB2E4\uC74C\uC8FC \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 680
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '70px repeat(7, 1fr)',
      gap: 5,
      marginBottom: 5
    }
  }, /*#__PURE__*/React.createElement("div", null), weekDates.map(d => {
    const isToday = dateKey(d) === tk;
    return /*#__PURE__*/React.createElement("div", {
      key: +d,
      style: {
        textAlign: 'center',
        fontSize: 13,
        padding: '5px 0',
        borderRadius: 7,
        background: isToday ? INK : 'transparent',
        color: isToday ? '#FBF7EE' : d.getDay() === 0 ? '#C08080' : '#4A4766',
        fontWeight: isToday ? 700 : 400
      }
    }, DOW[d.getDay()], /*#__PURE__*/React.createElement("br", null), d.getDate());
  })), cfg.kids.map(kid => /*#__PURE__*/React.createElement("div", {
    key: kid.id,
    style: {
      display: 'grid',
      gridTemplateColumns: '70px repeat(7, 1fr)',
      gap: 5,
      marginBottom: 5,
      alignItems: 'stretch'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3
    }
  }, /*#__PURE__*/React.createElement(Face, {
    kid: kid,
    photo: photos[kid.id],
    size: 36
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12
    }
  }, kid.name)), weekDates.map(d => {
    const dk = dateKey(d);
    const tasks = tasksFor(kid.id, d);
    const done = doneList(dk, kid.id);
    const doneCount = tasks.filter(t => done.includes(t.id)).length;
    const all = tasks.length > 0 && doneCount === tasks.length;
    return /*#__PURE__*/React.createElement("div", {
      key: dk,
      style: {
        border: '2px solid #C9C3E0',
        borderRadius: 9,
        padding: 6,
        minHeight: 84,
        background: all ? kid.color : '#fff'
      }
    }, tasks.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#C7C0AC',
        textAlign: 'center',
        paddingTop: 22
      }
    }, "\u2013") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        textAlign: 'right',
        color: '#4A4766',
        marginBottom: 3
      }
    }, doneCount, "/", tasks.length), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 3
      }
    }, tasks.map(t => {
      const on = done.includes(t.id);
      return /*#__PURE__*/React.createElement("button", {
        key: t.id,
        onClick: () => onToggle(kid.id, dk, t.id),
        title: t.title,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          border: 'none',
          background: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 15,
          height: 15,
          flex: 'none',
          borderRadius: 4,
          border: '2px solid #23303F',
          background: on ? INK : 'transparent',
          color: '#FBF7EE',
          fontSize: 10,
          lineHeight: '12px',
          textAlign: 'center'
        }
      }, on ? '✓' : ''), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11.5,
          lineHeight: 1.15,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textDecoration: on ? 'line-through' : 'none',
          color: on ? '#6E6A8E' : INK
        }
      }, t.title));
    }))));
  }))))), /*#__PURE__*/React.createElement("p", {
    className: "hand",
    style: {
      fontSize: 15,
      color: '#6E6A8E',
      margin: '10px 0 0',
      textAlign: 'center'
    }
  }, "\uCE78 \uC548\uC758 \uD560 \uC77C\uC744 \uB20C\uB7EC \uBC14\uB85C \uCCB4\uD06C\uD560 \uC218 \uC788\uC5B4\uC694. \uC606\uC73C\uB85C \uBC00\uBA74 \uC8FC\uB9D0\uAE4C\uC9C0 \uBCF4\uC5EC\uC694."));
}
function Today({
  kid,
  tasks,
  done,
  onToggle,
  today
}) {
  const rate = tasks.length ? Math.round(done.filter(d => tasks.some(t => t.id === d)).length / tasks.length * 100) : 0;
  const earned = tasks.filter(t => done.includes(t.id)).reduce((s, t) => s + (t.reward || 0), 0);
  const possible = tasks.reduce((s, t) => s + (t.reward || 0), 0);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "display",
    style: {
      fontSize: 24
    }
  }, today.getMonth() + 1, "\uC6D4 ", today.getDate(), "\uC77C (", DOW[today.getDay()], ")"), /*#__PURE__*/React.createElement("span", {
    className: "display",
    style: {
      fontSize: 30,
      color: rate === 100 ? INK : '#6E6A8E'
    }
  }, rate, "%")), /*#__PURE__*/React.createElement("div", {
    className: "stroke"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: `${rate}%`,
      background: kid.color
    }
  })), possible > 0 && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      margin: '10px 0 0',
      color: '#4A4766'
    }
  }, "\uC624\uB298 \uBC1B\uC740 \uC6A9\uB3C8 ", /*#__PURE__*/React.createElement("b", {
    className: "display",
    style: {
      fontSize: 22,
      color: INK
    }
  }, earned.toLocaleString(), "\uC6D0"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#6E6A8E'
    }
  }, " / ", possible.toLocaleString(), "\uC6D0")), rate === 100 && tasks.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "pop",
    style: {
      position: 'relative',
      marginTop: 10,
      textAlign: 'center',
      overflow: 'hidden',
      paddingBottom: 4
    }
  }, PALETTE.map((c, i) => /*#__PURE__*/React.createElement("i", {
    key: c,
    className: "confetti",
    style: {
      background: c,
      left: `${8 + i * 16}%`,
      animationDelay: `${i * 0.18}s`
    }
  })), /*#__PURE__*/React.createElement("p", {
    className: "display",
    style: {
      fontSize: 22,
      margin: 0
    }
  }, "\uC624\uB298 \uD560 \uC77C \uC804\uBD80 \uB05D! \uCD5C\uACE0\uC608\uC694 \uD83C\uDF89"))), /*#__PURE__*/React.createElement("div", {
    className: "card list"
  }, tasks.length === 0 && /*#__PURE__*/React.createElement("p", {
    style: {
      padding: 24,
      textAlign: 'center',
      color: '#6E6A8E',
      fontSize: 14,
      margin: 0
    }
  }, "\uC624\uB298\uC740 \uD560 \uC77C\uC774 \uC5C6\uC5B4\uC694. \uC124\uC815\uC5D0\uC11C \uCD94\uAC00\uD560 \uC218 \uC788\uC5B4\uC694."), tasks.map(t => {
    const on = done.includes(t.id);
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      className: "row",
      "data-done": on,
      onClick: () => onToggle(t.id)
    }, /*#__PURE__*/React.createElement("i", {
      className: "swipe",
      style: {
        background: kid.color
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "stamp"
    }, "\uCC38", /*#__PURE__*/React.createElement("br", null), "\uC798\uD588\uC5B4\uC694"), /*#__PURE__*/React.createElement("span", {
      className: "box"
    }, /*#__PURE__*/React.createElement("svg", {
      className: "tick",
      viewBox: "0 0 14 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M2 7.5 L5.5 11 L12 3"
    }))), h("span", {
      className: "emo"
    }, taskEmoji(t)), /*#__PURE__*/React.createElement("span", {
      className: "label display",
      style: {
        flex: 1,
        fontSize: 17
      }
    }, t.date && '★ ', t.title), t.reward > 0 && /*#__PURE__*/React.createElement("span", {
      className: "label display",
      style: {
        fontSize: 13,
        border: `2px solid ${INK}`,
        background: '#FFF3B0',
        borderRadius: 999,
        padding: '2px 8px'
      }
    }, t.reward.toLocaleString(), "\uC6D0"), t.time && /*#__PURE__*/React.createElement("span", {
      className: "label",
      style: {
        fontSize: 12,
        color: '#6E6A8E'
      }
    }, t.time));
  })));
}
function Record({
  cfg,
  kid,
  logs,
  cursor,
  setCursor,
  tasksFor,
  today
}) {
  const ym = monthKey(cursor);
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const rates = useMemo(() => {
    const out = {};
    for (let d = 1; d <= days; d++) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), d);
      if (date > today) continue;
      const total = tasksFor(kid.id, date).length;
      const dk = dateKey(date);
      const done = (logs[ym]?.[dk]?.[kid.id] ?? []).length;
      out[d] = total ? Math.min(100, Math.round(done / total * 100)) : null;
    }
    return out;
  }, [logs, ym, kid.id, cursor, cfg]);
  const vals = Object.values(rates).filter(v => v !== null);
  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  let streak = 0;
  for (let d = today.getMonth() === cursor.getMonth() ? today.getDate() : days; d >= 1; d--) {
    if (rates[d] === 100) streak++;else if (rates[d] !== null) break;
  }
  const money = useMemo(() => {
    const price = Object.fromEntries(cfg.tasks.map(t => [t.id, t.reward || 0]));
    let sum = 0;
    for (const [, byKid] of Object.entries(logs[ym] ?? {})) {
      for (const id of byKid[kid.id] ?? []) sum += price[id] ?? 0;
    }
    return sum;
  }, [logs, ym, kid.id, cfg]);
  const move = n => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn tiny",
    onClick: () => move(-1)
  }, "\u2190 \uC9C0\uB09C\uB2EC"), /*#__PURE__*/React.createElement("span", {
    className: "display",
    style: {
      fontSize: 24
    }
  }, cursor.getFullYear(), "\uB144 ", cursor.getMonth() + 1, "\uC6D4"), /*#__PURE__*/React.createElement("button", {
    className: "btn tiny",
    onClick: () => move(1)
  }, "\uB2E4\uC74C\uB2EC \u2192")), /*#__PURE__*/React.createElement("div", {
    className: "cal",
    style: {
      marginBottom: 6
    }
  }, DOW.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: d,
    style: {
      textAlign: 'center',
      fontSize: 11,
      color: i === 0 ? '#C08080' : '#6E6A8E'
    }
  }, d))), /*#__PURE__*/React.createElement("div", {
    className: "cal"
  }, Array.from({
    length: first.getDay()
  }).map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: 'e' + i
  })), Array.from({
    length: days
  }).map((_, i) => {
    const d = i + 1;
    const r = rates[d];
    const isToday = today.getDate() === d && today.getMonth() === cursor.getMonth() && today.getFullYear() === cursor.getFullYear();
    return /*#__PURE__*/React.createElement("div", {
      key: d,
      className: "cell",
      style: {
        borderColor: isToday ? INK : '#E7E0CE',
        borderWidth: isToday ? 2 : 1
      }
    }, r !== null && r !== undefined && /*#__PURE__*/React.createElement("div", {
      className: "fill",
      style: {
        height: `${r}%`,
        background: kid.color
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: isToday ? 700 : 400
      }
    }, d));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14,
      marginBottom: 10,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      letterSpacing: 2,
      color: '#6E6A8E',
      margin: 0
    }
  }, cursor.getMonth() + 1, "\uC6D4 \uC6A9\uB3C8 \uD569\uACC4"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: '#6E6A8E',
      margin: '2px 0 0'
    }
  }, kid.name)), /*#__PURE__*/React.createElement("p", {
    className: "display",
    style: {
      fontSize: 40,
      margin: 0
    }
  }, money.toLocaleString(), "\uC6D0")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      letterSpacing: 2,
      color: '#6E6A8E',
      margin: 0
    }
  }, "\uC774\uBC88 \uB2EC \uD3C9\uADE0"), /*#__PURE__*/React.createElement("p", {
    className: "display",
    style: {
      fontSize: 36,
      margin: 0
    }
  }, avg, "%")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      letterSpacing: 2,
      color: '#6E6A8E',
      margin: 0
    }
  }, "\uC5F0\uC18D 100% \uB2EC\uC131"), /*#__PURE__*/React.createElement("p", {
    className: "display",
    style: {
      fontSize: 36,
      margin: 0
    }
  }, streak, "\uC77C"))));
}
function Setup({
  cfg,
  save,
  photos,
  savePhotos,
  setErr
}) {
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(!cfg.pin);
  const [tryPin, setTryPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');
  if (!open) {
    const submit = () => {
      if (tryPin === cfg.pin) {
        setOpen(true);
        setTryPin('');
        setPinMsg('');
      } else {
        setPinMsg('비밀번호가 달라요. 엄마한테 물어보세요 🙂');
        setTryPin('');
      }
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "card",
      style: {
        padding: 22,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("i", {
      className: "tape"
    }), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 40,
        margin: 0
      }
    }, "\uD83D\uDD12"), /*#__PURE__*/React.createElement("h2", {
      className: "display",
      style: {
        fontSize: 22,
        margin: '4px 0 2px'
      }
    }, "\uC5EC\uAE30\uB294 \uC5C4\uB9C8 \uC544\uBE60\uB9CC"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 13,
        color: '#6E6A8E',
        margin: '0 0 14px'
      }
    }, "\uBE44\uBC00\uBC88\uD638 4\uC790\uB9AC\uB97C \uB123\uC5B4\uC8FC\uC138\uC694."), /*#__PURE__*/React.createElement("input", {
      className: "inp",
      type: "password",
      inputMode: "numeric",
      maxLength: 4,
      value: tryPin,
      autoFocus: true,
      onChange: e => setTryPin(e.target.value.replace(/\D/g, '')),
      onKeyDown: e => e.key === 'Enter' && submit(),
      style: {
        maxWidth: 160,
        margin: '0 auto 12px',
        textAlign: 'center',
        fontSize: 26,
        letterSpacing: 10,
        fontFamily: "'Jua', sans-serif"
      }
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
      className: "btn",
      onClick: submit
    }, "\uC5F4\uAE30")), pinMsg && /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 13,
        color: '#D6483B',
        margin: '12px 0 0'
      }
    }, pinMsg));
  }
  const addKid = () => {
    if (cfg.kids.length >= 6) return;
    save({
      ...cfg,
      kids: [...cfg.kids, {
        id: uid(),
        name: '새 아이',
        color: PALETTE[cfg.kids.length],
        face: FACES[cfg.kids.length]
      }]
    });
  };
  const upKid = (id, patch) => save({
    ...cfg,
    kids: cfg.kids.map(k => k.id === id ? {
      ...k,
      ...patch
    } : k)
  });
  const pickPhoto = async (id, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      savePhotos({
        ...photos,
        [id]: await shrinkPhoto(file)
      });
    } catch (err) {
      setErr(err.message);
    }
  };
  const dropPhoto = id => {
    const next = {
      ...photos
    };
    delete next[id];
    savePhotos(next);
  };
  const delKid = id => save({
    ...cfg,
    kids: cfg.kids.filter(k => k.id !== id),
    tasks: cfg.tasks.map(t => {
      let n = t.kids === 'all' ? t : {
        ...t,
        kids: t.kids.filter(x => x !== id)
      };
      if (n.sched && n.sched[id]) {
        const sched = {
          ...n.sched
        };
        delete sched[id];
        n = {
          ...n,
          sched
        };
      }
      return n;
    })
  });
  const saveTask = t => {
    const exists = cfg.tasks.some(x => x.id === t.id);
    save({
      ...cfg,
      tasks: exists ? cfg.tasks.map(x => x.id === t.id ? t : x) : [...cfg.tasks, t]
    });
    setEditing(null);
  };
  const delTask = id => {
    save({
      ...cfg,
      tasks: cfg.tasks.filter(t => t.id !== id)
    });
    setEditing(null);
  };
  const todayKey = dateKey(new Date());
  const missions = cfg.tasks.filter(t => t.date).sort((a, b) => b.date.localeCompare(a.date));
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "tape"
  }), /*#__PURE__*/React.createElement("h2", {
    className: "display",
    style: {
      fontSize: 22,
      margin: '0 0 10px'
    }
  }, "\uC544\uC774"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: '#6E6A8E',
      margin: '0 0 12px'
    }
  }, "\uB3D9\uADF8\uB77C\uBBF8\uB97C \uB204\uB974\uBA74 \uC0AC\uC9C4\uC744 \uC62C\uB9B4 \uC218 \uC788\uC5B4\uC694. \uC0AC\uC9C4\uC774 \uC5C6\uC73C\uBA74 \uCE90\uB9AD\uD130\uB85C \uB098\uC640\uC694."), cfg.kids.map(k => /*#__PURE__*/React.createElement("div", {
    key: k.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      cursor: 'pointer'
    },
    title: "\uC0AC\uC9C4 \uC62C\uB9AC\uAE30"
  }, /*#__PURE__*/React.createElement(Face, {
    kid: k,
    photo: photos[k.id],
    size: 38
  }), /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/*",
    style: {
      display: 'none'
    },
    onChange: e => pickPhoto(k.id, e)
  })), /*#__PURE__*/React.createElement(LazyInput, {
    type: "color",
    value: k.color,
    onCommit: v => upKid(k.id, {
      color: v
    }),
    delay: 600,
    style: {
      width: 30,
      height: 30,
      border: '2px solid #23303F',
      borderRadius: 8,
      background: 'none',
      padding: 0,
      cursor: 'pointer'
    },
    "aria-label": `${k.name} 색깔`
  }), /*#__PURE__*/React.createElement(LazyInput, {
    className: "inp",
    value: k.name,
    onCommit: v => upKid(k.id, {
      name: v.trim() || '이름'
    })
  }), photos[k.id] ? /*#__PURE__*/React.createElement("button", {
    className: "btn tiny",
    onClick: () => dropPhoto(k.id)
  }, "\uC0AC\uC9C4 \uBE7C\uAE30") : /*#__PURE__*/React.createElement("button", {
    className: "btn tiny",
    onClick: () => upKid(k.id, {
      face: FACES[(FACES.indexOf(k.face ?? '🐰') + 1) % FACES.length]
    })
  }, "\uCE90\uB9AD\uD130 \uBC14\uAFB8\uAE30"), /*#__PURE__*/React.createElement("button", {
    className: "btn tiny",
    onClick: () => delKid(k.id)
  }, "\uC0AD\uC81C"))), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: addKid,
    style: {
      marginTop: 6
    }
  }, "+ \uC544\uC774 \uCD94\uAC00")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "display",
    style: {
      fontSize: 24,
      margin: '0 0 10px'
    }
  }, "\uD560 \uC77C \xB7 \uC2DC\uAC04\uD45C"), cfg.tasks.filter(t => !t.date).map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    style: {
      borderBottom: '1px dashed #C9C3E0',
      padding: '8px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 14
    }
  }, t.title), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: '#6E6A8E'
    }
  }, t.sched ? schedSummary(t, cfg.kids) : (t.days.length === 7 ? '매일' : t.days.map(d => DOW[d]).join('')) + " " + t.time, " ", t.reward > 0 ? `· ${t.reward.toLocaleString()}원` : ''), /*#__PURE__*/React.createElement("button", {
    className: "btn tiny",
    onClick: () => setEditing(t)
  }, "\uC218\uC815")))), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      marginTop: 10
    },
    onClick: () => setEditing({
      id: uid(),
      title: '',
      time: '',
      days: [0, 1, 2, 3, 4, 5, 6],
      kids: 'all',
      reward: 0
    })
  }, "+ \uD560 \uC77C \uCD94\uAC00")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "display",
    style: {
      fontSize: 24,
      margin: '0 0 2px'
    }
  }, "\uD2B9\uBCC4 \uBBF8\uC158"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: '#6E6A8E',
      margin: '0 0 10px'
    }
  }, "\uC815\uD55C \uB0A0\uC9DC\uC5D0\uB9CC \uBAA9\uB85D\uC5D0 \uB728\uACE0, \uADF8\uB0A0\uC774 \uC9C0\uB098\uBA74 \uC0AC\uB77C\uC838\uC694."), missions.length === 0 && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: '#6E6A8E',
      margin: '0 0 4px'
    }
  }, "\uC544\uC9C1 \uC5C6\uC5B4\uC694. \uBCF4\uC0C1 \uAC78\uACE0 \uC2F6\uC740 \uC77C\uC744 \uD558\uB098 \uB123\uC5B4\uBCF4\uC138\uC694."), missions.map(t => {
    const past = t.date < todayKey;
    return /*#__PURE__*/React.createElement("div", {
      key: t.id,
      style: {
        borderBottom: '1px dashed #C9C3E0',
        padding: '8px 0',
        opacity: past ? 0.45 : 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 14
      }
    }, t.title), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#6E6A8E'
      }
    }, t.date.slice(5).replace('-', '/'), " ", t.reward > 0 ? `· ${t.reward.toLocaleString()}원` : ''), /*#__PURE__*/React.createElement("button", {
      className: "btn tiny",
      onClick: () => setEditing(t)
    }, "\uC218\uC815")));
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      marginTop: 10
    },
    onClick: () => setEditing({
      id: uid(),
      title: '',
      time: '',
      days: [],
      date: todayKey,
      kids: 'all',
      reward: 1000
    })
  }, "+ \uD2B9\uBCC4 \uBBF8\uC158 \uCD94\uAC00"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: '#6E6A8E',
      marginTop: 14,
      lineHeight: 1.6
    }
  }, "\uC774 \uC2A4\uCF00\uC904\uB7EC\uC758 \uB0B4\uC6A9\uACFC \uCCB4\uD06C \uAE30\uB85D\uC740 \uB9C1\uD06C\uB97C \uBC1B\uC740 \uBAA8\uB4E0 \uC0AC\uB78C\uC774 \uD568\uAED8 \uBCF4\uACE0 \uC218\uC815\uD560 \uC218 \uC788\uC5B4\uC694. \uC544\uC774\uB4E4\uC5D0\uAC8C \uB9C1\uD06C\uB97C \uBCF4\uB0B4\uC8FC\uC138\uC694.")), /*#__PURE__*/React.createElement(PinCard, {
    cfg: cfg,
    save: save
  }), editing && /*#__PURE__*/React.createElement(TaskEditor, {
    task: editing,
    kids: cfg.kids,
    onSave: saveTask,
    onDelete: delTask,
    onCancel: () => setEditing(null)
  }));
}
function PinCard({
  cfg,
  save
}) {
  const [v, setV] = useState('');
  const [msg, setMsg] = useState('');
  const apply = () => {
    if (v.length !== 4) {
      setMsg('숫자 4자리로 정해주세요.');
      return;
    }
    save({
      ...cfg,
      pin: v
    });
    setV('');
    setMsg('비밀번호를 저장했어요. 다음에 설정을 열 때부터 물어봐요.');
  };
  const clear = () => {
    save({
      ...cfg,
      pin: ''
    });
    setMsg('비밀번호를 없앴어요. 이제 누구나 설정을 열 수 있어요.');
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "display",
    style: {
      fontSize: 22,
      margin: '0 0 2px'
    }
  }, "\uC124\uC815 \uC7A0\uAE08 \uD83D\uDD12"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: '#6E6A8E',
      margin: '0 0 10px'
    }
  }, cfg.pin ? '지금 잠겨 있어요. 아이들은 오늘·기록 탭만 쓸 수 있어요.' : '비밀번호를 정하면 이 설정 탭은 엄마 아빠만 열 수 있어요.'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "inp",
    type: "password",
    inputMode: "numeric",
    maxLength: 4,
    value: v,
    placeholder: "\uC22B\uC790 4\uC790\uB9AC",
    onChange: e => {
      setV(e.target.value.replace(/\D/g, ''));
      setMsg('');
    },
    style: {
      width: 130,
      textAlign: 'center',
      letterSpacing: 6
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: apply
  }, cfg.pin ? '비밀번호 바꾸기' : '비밀번호 걸기'), cfg.pin && /*#__PURE__*/React.createElement("button", {
    className: "btn tiny",
    onClick: clear
  }, "\uC7A0\uAE08 \uD574\uC81C")), msg && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: '#4A4766',
      margin: '10px 0 0'
    }
  }, msg));
}
function TaskEditor({
  task,
  kids,
  onSave,
  onDelete,
  onCancel
}) {
  const [t, setT] = useState(task);
  const toggleDay = d => setT({
    ...t,
    days: t.days.includes(d) ? t.days.filter(x => x !== d) : [...t.days, d].sort()
  });
  const allOn = t.kids === 'all';
  const each = !!t.sched && !t.date;
  const setEach = on => {
    if (on) {
      // 지금 정한 요일·시간·아이로 시간표를 미리 채워둔다
      const sched = {};
      const ids = allOn ? kids.map(k => k.id) : t.kids;
      ids.forEach(id => {
        sched[id] = {};
        t.days.forEach(d => {
          sched[id][d] = t.time || '';
        });
      });
      setT({
        ...t,
        sched
      });
    } else {
      const next = {
        ...t
      };
      delete next.sched;
      setT(next);
    }
  };
  const finish = x => {
    if (!x.sched || x.date) return x;
    // 예전 화면과 호환되도록 요일·아이 목록도 함께 맞춰 둔다
    const sched = {};
    Object.entries(x.sched).forEach(([id, m]) => {
      if (kids.some(k => k.id === id) && Object.keys(m).length) sched[id] = m;
    });
    const days = [...new Set(Object.values(sched).flatMap(m => Object.keys(m).map(Number)))].sort();
    const times = Object.values(sched).flatMap(m => Object.values(m)).filter(Boolean).sort();
    return {
      ...x,
      sched,
      days,
      kids: Object.keys(sched),
      time: times[0] || ''
    };
  };
  const toggleKid = id => {
    const cur = allOn ? kids.map(k => k.id) : t.kids;
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    setT({
      ...t,
      kids: next.length === kids.length ? 'all' : next
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(35,48,63,0.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 18,
      width: '100%',
      maxWidth: 400,
      background: '#fff',
      maxHeight: 'calc(100vh - 28px)',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    className: "display",
    style: {
      fontSize: 26,
      margin: '0 0 12px'
    }
  }, t.date ? '특별 미션 정하기' : '할 일 정하기'), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      letterSpacing: 2,
      color: '#6E6A8E'
    }
  }, "\uC774\uB984"), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    value: t.title,
    onChange: e => setT({
      ...t,
      title: e.target.value
    }),
    placeholder: t.date ? '예: 방 대청소' : '예: 책 20분 읽기',
    style: {
      marginBottom: 14
    }
  }), !t.date && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "chip",
    "data-on": !each,
    onClick: () => setEach(false),
    style: {
      flex: 1
    }
  }, "\uBAA8\uB450 \uAC19\uC544\uC694"), /*#__PURE__*/React.createElement("button", {
    className: "chip",
    "data-on": each,
    onClick: () => setEach(true),
    style: {
      flex: 1
    }
  }, "\uC544\uC774\uB9C8\uB2E4 \uB2EC\uB77C\uC694")), each && /*#__PURE__*/React.createElement(SchedEditor, {
    kids: kids,
    sched: t.sched,
    setSched: sched => setT({
      ...t,
      sched
    })
  }), !each && /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      letterSpacing: 2,
      color: '#6E6A8E'
    }
  }, "\uC2DC\uAC04 (\uC5C6\uC5B4\uB3C4 \uB3FC\uC694)"), !each && /*#__PURE__*/React.createElement("input", {
    className: "inp",
    type: "time",
    value: t.time,
    onChange: e => setT({
      ...t,
      time: e.target.value
    }),
    style: {
      marginBottom: 14
    }
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      letterSpacing: 2,
      color: '#6E6A8E'
    }
  }, "\uD558\uBA74 \uBC1B\uB294 \uC6A9\uB3C8 (\uC6D0, \uC5C6\uC73C\uBA74 0)"), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    type: "number",
    min: "0",
    step: "100",
    value: t.reward ?? 0,
    onChange: e => setT({
      ...t,
      reward: Math.max(0, Number(e.target.value) || 0)
    }),
    style: {
      marginBottom: 14
    }
  }), t.date ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      letterSpacing: 2,
      color: '#6E6A8E'
    }
  }, "\uD558\uB294 \uB0A0\uC9DC"), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    type: "date",
    value: t.date,
    onChange: e => setT({
      ...t,
      date: e.target.value
    }),
    style: {
      marginBottom: 14
    }
  })) : each ? null : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      letterSpacing: 2,
      color: '#6E6A8E',
      display: 'block',
      marginBottom: 6
    }
  }, "\uC694\uC77C"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5,
      marginBottom: 14
    }
  }, DOW.map((d, i) => /*#__PURE__*/React.createElement("button", {
    key: d,
    className: "chip",
    "data-on": t.days.includes(i),
    onClick: () => toggleDay(i),
    style: {
      padding: '5px 0',
      flex: 1
    }
  }, d)))), !each && /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      letterSpacing: 2,
      color: '#6E6A8E',
      display: 'block',
      marginBottom: 6
    }
  }, "\uB204\uAD6C \uAC83"), !each && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      marginBottom: 18
    }
  }, kids.map(k => /*#__PURE__*/React.createElement("button", {
    key: k.id,
    className: "chip",
    "data-on": allOn || t.kids.includes(k.id),
    onClick: () => toggleKid(k.id),
    style: {
      borderLeft: `6px solid ${k.color}`
    }
  }, k.name))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    style: {
      flex: '1 1 120px'
    },
    onClick: () => t.title.trim() && onSave(finish({
      ...t,
      title: t.title.trim()
    }))
  }, "\uC800\uC7A5"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: onCancel
  }, "\uCDE8\uC18C"), /*#__PURE__*/React.createElement("button", {
    className: "btn tiny",
    onClick: () => onDelete(t.id)
  }, "\uC0AD\uC81C"))));
}

// 아이·요일별 시간표를 한 줄로 요약 (예: "첫째 월수 16:00 / 둘째 화목 17:00")
function schedSummary(t, kids) {
  return kids.filter(k => t.sched?.[k.id] && Object.keys(t.sched[k.id]).length).map(k => {
    const m = t.sched[k.id];
    const ds = Object.keys(m).map(Number).sort();
    const times = new Set(ds.map(d => m[d]));
    if (times.size > 1) return k.name + ' ' + ds.map(d => DOW[d] + (m[d] || '')).join(',');
    return k.name + ' ' + (ds.length === 7 ? '매일' : ds.map(d => DOW[d]).join('')) + (m[ds[0]] ? ' ' + m[ds[0]] : '');
  }).join(' / ');
}
const h = React.createElement;

// 아이마다 요일·시간을 따로 정하는 표
function SchedEditor({
  kids,
  sched,
  setSched
}) {
  const valsOf = id => Object.values(sched[id] || {});
  const [open, setOpen] = useState(() => Object.fromEntries(kids.map(k => [k.id, new Set(valsOf(k.id)).size > 1])));
  const [base, setBase] = useState(() => Object.fromEntries(kids.map(k => [k.id, valsOf(k.id).find(Boolean) || ''])));
  const upKid = (id, m) => setSched({
    ...sched,
    [id]: m
  });
  const toggleDay = (id, d) => {
    const m = {
      ...(sched[id] || {})
    };
    if (d in m) delete m[d];else m[d] = base[id] || '';
    upKid(id, m);
  };
  const setAll = (id, tm) => {
    setBase({
      ...base,
      [id]: tm
    });
    const m = {};
    Object.keys(sched[id] || {}).forEach(d => {
      m[d] = tm;
    });
    upKid(id, m);
  };
  const setOne = (id, d, tm) => upKid(id, {
    ...sched[id],
    [d]: tm
  });
  return h("div", {
    style: {
      marginBottom: 14
    }
  }, h("span", {
    className: "lbl"
  }, "아이별 요일 \xB7 시간 (안 다니는 아이는 비워두세요)"), kids.map((k, idx) => {
    const m = sched[k.id] || {};
    const ds = Object.keys(m).map(Number).sort();
    const isOpen = open[k.id];
    return h("div", {
      key: k.id,
      className: "krow",
      "data-on": ds.length > 0
    }, h("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8
      }
    }, h("i", {
      style: {
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: k.color,
        border: '2px solid #23303F',
        flex: 'none'
      }
    }), h("span", {
      className: "display",
      style: {
        flex: 1,
        fontSize: 16
      }
    }, k.name), !isOpen && h("input", {
      className: "inp",
      type: "time",
      value: base[k.id] || '',
      onChange: e => setAll(k.id, e.target.value),
      style: {
        width: 120,
        padding: '5px 8px'
      }
    })), h("div", {
      style: {
        display: 'flex',
        gap: 4
      }
    }, DOW.map((d, i) => h("button", {
      key: d,
      className: "chip",
      "data-on": i in m,
      onClick: () => toggleDay(k.id, i),
      style: {
        padding: '5px 0',
        flex: 1
      }
    }, d))), isOpen && ds.map(d => h("div", {
      key: d,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 6
      }
    }, h("span", {
      className: "display",
      style: {
        width: 24
      }
    }, DOW[d]), h("input", {
      className: "inp",
      type: "time",
      value: m[d] || '',
      onChange: e => setOne(k.id, d, e.target.value),
      style: {
        padding: '5px 8px'
      }
    }))), h("div", {
      style: {
        display: 'flex',
        gap: 14,
        marginTop: 4
      }
    }, h("button", {
      className: "linkbtn",
      onClick: () => {
        if (isOpen) setAll(k.id, base[k.id] || valsOf(k.id).find(Boolean) || '');
        setOpen({
          ...open,
          [k.id]: !isOpen
        });
      }
    }, isOpen ? '시간 하나로 맞추기' : '요일마다 시간이 달라요'), idx > 0 && h("button", {
      className: "linkbtn",
      onClick: () => {
        const src = kids[idx - 1].id;
        upKid(k.id, {
          ...(sched[src] || {})
        });
        setBase({
          ...base,
          [k.id]: base[src]
        });
        setOpen({
          ...open,
          [k.id]: open[src]
        });
      }
    }, '↑ ' + kids[idx - 1].name + '와 같게')));
  }));
}

// 설정에 들어가지 않고 어디서든 바로 할 일을 추가하는 창
function QuickAdd({
  cfg,
  kidId,
  today,
  unlocked,
  onUnlock,
  onClose,
  onSave,
  onDetail
}) {
  const [title, setTitle] = useState('');
  const [who, setWho] = useState(kidId ? [kidId] : cfg.kids.map(k => k.id));
  const [when, setWhen] = useState('today');
  const [days, setDays] = useState([today.getDay()]);
  const [time, setTime] = useState('');
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState('');
  const needPin = cfg.pin && !unlocked;
  const build = () => {
    const base = {
      id: uid(),
      title: title.trim(),
      time,
      reward: 0,
      kids: who.length === cfg.kids.length ? 'all' : who
    };
    return when === 'today' ? {
      ...base,
      days: [],
      date: dateKey(today)
    } : {
      ...base,
      days
    };
  };
  const submit = () => {
    if (!title.trim()) return setMsg('무엇을 할지 적어주세요.');
    if (!who.length) return setMsg('누가 할지 골라주세요.');
    if (when === 'weekly' && !days.length) return setMsg('요일을 하나 이상 골라주세요.');
    onSave(build());
  };
  const checkPin = () => {
    if (pin === cfg.pin) onUnlock();else {
      setMsg('비밀번호가 달라요.');
      setPin('');
    }
  };
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v].sort());
  return h("div", {
    onClick: e => e.target === e.currentTarget && onClose(),
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(35,48,63,0.45)',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      padding: 10,
      zIndex: 10
    }
  }, h("div", {
    className: "card pop",
    style: {
      padding: 18,
      width: '100%',
      maxWidth: 420,
      maxHeight: 'calc(100vh - 20px)',
      overflowY: 'auto',
      marginBottom: 'env(safe-area-inset-bottom)'
    }
  }, h("h3", {
    className: "display",
    style: {
      fontSize: 24,
      margin: '0 0 12px'
    }
  }, "바로 추가"), needPin ? h(React.Fragment, null, h("span", {
    className: "lbl"
  }, "비밀번호 4자리"), h("input", {
    className: "inp",
    type: "password",
    inputMode: "numeric",
    maxLength: 4,
    autoFocus: true,
    value: pin,
    onChange: e => setPin(e.target.value.replace(/\D/g, '')),
    onKeyDown: e => e.key === 'Enter' && checkPin(),
    style: {
      marginBottom: 12,
      fontSize: 22,
      letterSpacing: 8,
      textAlign: 'center'
    }
  }), h("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, h("button", {
    className: "btn",
    onClick: checkPin
  }, "열기"), h("button", {
    className: "btn ghost",
    onClick: onClose
  }, "취소"))) : h(React.Fragment, null, h("span", {
    className: "lbl"
  }, "무엇을?"), h("input", {
    className: "inp",
    autoFocus: true,
    value: title,
    placeholder: "예: 합기도, 치과, 수학 숙제",
    onChange: e => setTitle(e.target.value),
    onKeyDown: e => e.key === 'Enter' && submit(),
    style: {
      marginBottom: 14
    }
  }), h("span", {
    className: "lbl"
  }, "누가?"), h("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      marginBottom: 14
    }
  }, cfg.kids.map(k => h("button", {
    key: k.id,
    className: "chip",
    "data-on": who.includes(k.id),
    onClick: () => toggle(who, setWho, k.id),
    style: {
      borderLeft: `6px solid ${k.color}`
    }
  }, k.name))), h("span", {
    className: "lbl"
  }, "언제?"), h("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 8
    }
  }, h("button", {
    className: "chip",
    "data-on": when === 'today',
    onClick: () => setWhen('today'),
    style: {
      flex: 1
    }
  }, "오늘만"), h("button", {
    className: "chip",
    "data-on": when === 'weekly',
    onClick: () => setWhen('weekly'),
    style: {
      flex: 1
    }
  }, "매주 반복")), when === 'weekly' && h("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginBottom: 8
    }
  }, DOW.map((d, i) => h("button", {
    key: d,
    className: "chip",
    "data-on": days.includes(i),
    onClick: () => toggle(days, setDays, i),
    style: {
      padding: '5px 0',
      flex: 1
    }
  }, d))), h("span", {
    className: "lbl",
    style: {
      marginTop: 6
    }
  }, "시간 (없어도 돼요)"), h("input", {
    className: "inp",
    type: "time",
    value: time,
    onChange: e => setTime(e.target.value),
    style: {
      marginBottom: 14
    }
  }), msg && h("p", {
    style: {
      fontSize: 13,
      color: '#D6483B',
      margin: '0 0 10px'
    }
  }, msg), h("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      alignItems: 'center'
    }
  }, h("button", {
    className: "btn",
    style: {
      flex: '1 1 100px'
    },
    onClick: submit
  }, "추가"), h("button", {
    className: "btn ghost",
    onClick: onClose
  }, "취소")), h("button", {
    className: "linkbtn",
    style: {
      marginTop: 10
    },
    onClick: () => {
      const t = build();
      delete t.date;
      t.days = when === 'today' ? [today.getDay()] : days;
      // 고른 아이·요일·시간으로 아이별 시간표를 채워서 연다
      t.sched = Object.fromEntries((who.length ? who : cfg.kids.map(k => k.id)).map(id => [id, Object.fromEntries(t.days.map(d => [d, time]))]));
      onDetail(t);
    }
  }, "아이마다 요일\xB7시간이 달라요 / 용돈 정하기 →"))));
}

// 아이별 용돈기입장. 데이터 모양: { [아이id]: [{ id, date, amt(+들어옴/-씀), memo, mission?: 'YYYY-MM' }] }
function Wallet({
  cfg,
  kid,
  wallet,
  save,
  logs,
  today,
  ensureMonth
}) {
  const [sign, setSign] = useState(1);
  const [amt, setAmt] = useState('');
  const [memo, setMemo] = useState('');
  const [date, setDate] = useState(dateKey(today));
  const [msg, setMsg] = useState('');
  const thisYm = monthKey(today);
  const prevYm = monthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  useEffect(() => {
    ensureMonth(prevYm);
  }, []);
  const list = wallet[kid.id] ?? [];
  const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0));
  const balance = list.reduce((s, e) => s + e.amt, 0);
  const price = Object.fromEntries(cfg.tasks.map(t => [t.id, t.reward || 0]));
  const earnedIn = ym => {
    let sum = 0;
    for (const byKid of Object.values(logs[ym] ?? {})) for (const id of byKid[kid.id] ?? []) sum += price[id] ?? 0;
    return sum;
  };
  const paidIn = ym => list.filter(e => e.mission === ym).reduce((s, e) => s + e.amt, 0);
  const put = entries => save({
    ...wallet,
    [kid.id]: entries
  });
  const add = () => {
    const n = Math.round(Number(String(amt).replace(/[^\d]/g, '')));
    if (!n) return setMsg('금액을 적어주세요.');
    put([...list, {
      id: uid(),
      date,
      amt: sign * n,
      memo: memo.trim() || (sign > 0 ? '받은 돈' : '쓴 돈'),
      ts: Date.now()
    }]);
    setAmt('');
    setMemo('');
    setMsg('');
  };
  const settle = ym => {
    const diff = earnedIn(ym) - paidIn(ym);
    if (diff <= 0) return;
    put([...list, {
      id: uid(),
      date: ym === thisYm ? dateKey(today) : ym + '-' + pad(new Date(+ym.slice(0, 4), +ym.slice(5), 0).getDate()),
      amt: diff,
      memo: `${+ym.slice(5)}월 미션 용돈`,
      mission: ym,
      ts: Date.now()
    }]);
  };
  const del = e => {
    if (confirm(`"${e.memo}" ${Math.abs(e.amt).toLocaleString()}원 기록을 지울까요?`)) put(list.filter(x => x.id !== e.id));
  };
  const monthIn = list.filter(e => e.date.startsWith(thisYm) && e.amt > 0).reduce((s, e) => s + e.amt, 0);
  const monthOut = list.filter(e => e.date.startsWith(thisYm) && e.amt < 0).reduce((s, e) => s - e.amt, 0);
  let lastYm = '';
  return h(React.Fragment, null, h("div", {
    className: "card",
    style: {
      padding: 16,
      marginBottom: 12,
      textAlign: 'center'
    }
  }, h("i", {
    className: "tape"
  }), h("p", {
    className: "hand",
    style: {
      fontSize: 17,
      color: '#6E6A8E',
      margin: 0
    }
  }, kid.name, "의 지갑"), h("p", {
    className: "display",
    style: {
      fontSize: 40,
      margin: '2px 0 6px',
      color: balance < 0 ? '#D6483B' : INK
    }
  }, balance.toLocaleString(), "원"), h("p", {
    style: {
      fontSize: 13,
      color: '#4A4766',
      margin: 0
    }
  }, "이번 달 들어온 돈 ", h("b", null, monthIn.toLocaleString(), "원"), " \xB7 쓴 돈 ", h("b", null, monthOut.toLocaleString(), "원"))), [prevYm, thisYm].map(ym => {
    const earned = earnedIn(ym);
    const left = earned - paidIn(ym);
    if (earned <= 0) return null;
    return h("div", {
      key: ym,
      className: "card",
      style: {
        padding: 12,
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, h("span", {
      style: {
        fontSize: 26
      }
    }, "🏅"), h("span", {
      style: {
        flex: 1,
        fontSize: 14
      }
    }, +ym.slice(5), "월 미션으로 번 용돈 ", h("b", null, earned.toLocaleString(), "원"), left > 0 ? '' : ' · 기입장에 넣었어요'), left > 0 && h("button", {
      className: "btn",
      onClick: () => settle(ym)
    }, left.toLocaleString(), "원 넣기"));
  }), h("div", {
    className: "card",
    style: {
      padding: 14,
      marginBottom: 12
    }
  }, h("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 10
    }
  }, h("button", {
    className: "chip",
    "data-on": sign > 0,
    onClick: () => setSign(1),
    style: {
      flex: 1,
      fontSize: 15
    }
  }, "💰 들어온 돈"), h("button", {
    className: "chip",
    "data-on": sign < 0,
    onClick: () => setSign(-1),
    style: {
      flex: 1,
      fontSize: 15
    }
  }, "🛒 쓴 돈")), h("input", {
    className: "inp",
    inputMode: "numeric",
    placeholder: "얼마? (원)",
    value: amt ? Number(String(amt).replace(/[^\d]/g, '')).toLocaleString() : '',
    onChange: e => setAmt(e.target.value.replace(/[^\d]/g, '')),
    style: {
      marginBottom: 6,
      fontSize: 18
    }
  }), h("div", {
    style: {
      display: 'flex',
      gap: 5,
      marginBottom: 10,
      flexWrap: 'wrap'
    }
  }, [500, 1000, 5000, 10000].map(v => h("button", {
    key: v,
    className: "btn tiny",
    onClick: () => setAmt(String((Number(amt) || 0) + v))
  }, "+", v.toLocaleString()))), h("input", {
    className: "inp",
    placeholder: sign > 0 ? '어디서? 예: 할머니 용돈, 세뱃돈' : '어디에? 예: 과자, 문구점',
    value: memo,
    onChange: e => setMemo(e.target.value),
    onKeyDown: e => e.key === 'Enter' && add(),
    style: {
      marginBottom: 6
    }
  }), h("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, h("input", {
    className: "inp",
    type: "date",
    value: date,
    onChange: e => setDate(e.target.value || dateKey(today)),
    style: {
      flex: 1
    }
  }), h("button", {
    className: "btn",
    onClick: add
  }, "적기")), msg && h("p", {
    style: {
      fontSize: 13,
      color: '#D6483B',
      margin: '8px 0 0'
    }
  }, msg)), h("div", {
    className: "card",
    style: {
      padding: '6px 14px'
    }
  }, sorted.length === 0 && h("p", {
    style: {
      padding: 18,
      textAlign: 'center',
      color: '#6E6A8E',
      fontSize: 14,
      margin: 0
    }
  }, "아직 기록이 없어요. 첫 용돈을 적어보세요!"), sorted.map(e => {
    const ym = e.date.slice(0, 7);
    const head = ym !== lastYm;
    lastYm = ym;
    return h(React.Fragment, {
      key: e.id
    }, head && h("p", {
      className: "display",
      style: {
        fontSize: 16,
        margin: '12px 0 2px',
        color: '#6E6A8E'
      }
    }, ym.slice(0, 4), "년 ", +ym.slice(5), "월"), h("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 0',
        borderBottom: '1px dashed #C9C3E0'
      }
    }, h("span", {
      style: {
        fontSize: 12,
        color: '#6E6A8E',
        width: 34
      }
    }, +e.date.slice(5, 7), "/", +e.date.slice(8)), h("span", {
      style: {
        flex: 1,
        fontSize: 14
      }
    }, e.mission ? '🏅 ' : '', e.memo), h("b", {
      className: "display",
      style: {
        fontSize: 17,
        color: e.amt > 0 ? '#1E8A6E' : '#D6483B'
      }
    }, e.amt > 0 ? '+' : '−', Math.abs(e.amt).toLocaleString()), h("button", {
      className: "btn tiny",
      "aria-label": "지우기",
      onClick: () => del(e)
    }, "✕")));
  })));
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));