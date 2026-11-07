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
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Jua&family=Gaegu:wght@400;700&family=Gothic+A1:wght@400;500;700&display=swap');

.wrap { font-family:'Gothic A1', system-ui, sans-serif; color:#23303F;
  background-color:#FBF7EE;
  background-image: radial-gradient(#E2DAC5 1.4px, transparent 1.4px);
  background-size: 20px 20px; min-height:100%; }
.display { font-family:'Jua','Gothic A1',sans-serif; letter-spacing:-.5px; }
.hand { font-family:'Gaegu','Gothic A1',cursive; }
.card { position:relative; background:#FFFDF7; border:2px solid #23303F; border-radius:14px; box-shadow:3px 4px 0 #E4DBC4; }
.tape { position:absolute; top:-9px; left:50%; margin-left:-28px; width:56px; height:17px; background:rgba(255,216,77,.6); border-left:1px dashed rgba(0,0,0,.12); border-right:1px dashed rgba(0,0,0,.12); transform:rotate(-2deg); }
.tab { font-family:'Jua',sans-serif; font-size:17px; padding:7px 16px; border-radius:999px; border:2px solid #23303F; background:#FFFDF7; cursor:pointer; color:#8C8570; box-shadow:2px 2px 0 #E4DBC4; }
.tab[data-on="true"] { color:#FFFDF7; background:#23303F; }
.chip { border:2px solid #23303F; background:#FFFDF7; border-radius:999px; padding:5px 12px; font-size:13px; cursor:pointer; color:#5A6472; font-family:'Gothic A1',sans-serif; }
.chip[data-on="true"] { color:#23303F; font-weight:700; background:#FFD84D; box-shadow:2px 2px 0 #23303F; }
.kid { display:flex; align-items:center; gap:7px; border:2px solid #23303F; border-radius:999px; padding:5px 14px 5px 6px; background:#FFFDF7; cursor:pointer; font-family:'Jua',sans-serif; font-size:15px; color:#8C8570; transition:transform .18s cubic-bezier(.2,1.6,.4,1); }
.face { border-radius:50%; display:grid; place-items:center; overflow:hidden; flex:none; border:2px solid #23303F; }
.face img { width:100%; height:100%; object-fit:cover; display:block; }
.kid[data-on="true"] { color:#23303F; box-shadow:3px 3px 0 #23303F; transform:rotate(-2deg) translateY(-2px); }
.row { position:relative; display:flex; align-items:center; gap:12px; padding:14px 12px; border-bottom:2px dashed #E4DBC4; cursor:pointer; background:none; width:100%; text-align:left; }
.row:last-child { border-bottom:none; }
.row:active { transform:scale(.99); }
.swipe { position:absolute; left:6px; right:6px; top:6px; bottom:6px; border-radius:8px; transform-origin:left center; transform:scaleX(0); opacity:.5; transition:transform .3s cubic-bezier(.2,.9,.3,1); pointer-events:none; }
.row[data-done="true"] .swipe { transform:scaleX(1); }
.row .label { position:relative; z-index:1; transition:color .2s; }
.box { position:relative; z-index:1; width:26px; height:26px; border:2.5px solid #23303F; border-radius:8px; flex:none; display:grid; place-items:center; background:#FFFDF7; }
.tick { width:14px; height:14px; stroke:#23303F; stroke-width:3.4; fill:none; stroke-linecap:round; stroke-dasharray:22; stroke-dashoffset:22; transition:stroke-dashoffset .25s ease .05s; }
.row[data-done="true"] .tick { stroke-dashoffset:0; }
.stamp { position:absolute; right:10px; top:50%; z-index:2; width:56px; height:56px; margin-top:-28px; border:3px double #D6483B; border-radius:50%; color:#D6483B; font-family:'Gaegu',cursive; font-size:15px; font-weight:700; line-height:1.05; display:grid; place-items:center; text-align:center; pointer-events:none;
  opacity:0; transform:rotate(-24deg) scale(2.2); transition:opacity .16s, transform .16s cubic-bezier(.2,1.8,.4,1); }
.row[data-done="true"] .stamp { opacity:.82; transform:rotate(-14deg) scale(1); }
.stroke { height:18px; background:#EDE7D8; border-radius:999px; overflow:hidden; border:2px solid #23303F; }
.stroke i { display:block; height:100%; transition:width .45s cubic-bezier(.2,1.3,.4,1); }
.inp { border:2px solid #23303F; border-radius:8px; background:#FFFDF7; padding:8px 10px; font-family:'Gothic A1',sans-serif; font-size:14px; color:#23303F; outline:none; width:100%; }
.btn { font-family:'Jua',sans-serif; font-size:14px; border:2px solid #23303F; background:#FFD84D; color:#23303F; border-radius:999px; padding:8px 16px; cursor:pointer; box-shadow:2px 2px 0 #23303F; }
.btn:active { transform:translate(2px,2px); box-shadow:none; }
.btn.ghost { background:#FFFDF7; }
.btn.tiny { padding:4px 10px; font-size:12px; background:#FFFDF7; box-shadow:none; border-color:#DED6C2; color:#7A8492; }
button:focus-visible, .inp:focus-visible { outline:3px solid #7FD9C4; outline-offset:2px; }
.cal { display:grid; grid-template-columns:repeat(7,1fr); gap:5px; }
.cell { aspect-ratio:1; border:2px solid #E4DBC4; border-radius:8px; display:grid; place-items:center; font-size:11px; position:relative; overflow:hidden; background:#FFFDF7; }
.cell .fill { position:absolute; left:0; right:0; bottom:0; }
.cell span { position:relative; z-index:1; }
.pop { animation:pop .5s cubic-bezier(.2,1.6,.4,1); }
@keyframes pop { 0%{transform:scale(.6) rotate(-8deg);opacity:0} 100%{transform:none;opacity:1} }
.confetti { position:absolute; top:0; width:8px; height:12px; border-radius:2px; animation:fall 1.4s linear infinite; }
@keyframes fall { 0%{transform:translateY(-14px) rotate(0);opacity:1} 100%{transform:translateY(150px) rotate(420deg);opacity:0} }
@media (prefers-reduced-motion: reduce) { *, .confetti { animation:none !important; transition:none !important; } }
`;
function App() {
  const [cfg, setCfg] = useState(null);
  const [logs, setLogs] = useState({});
  const [tab, setTab] = useState('home');
  const [kidId, setKidId] = useState(null);
  const [cursor, setCursor] = useState(new Date());
  const [photos, setPhotos] = useState({});
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
        if (k === CONFIG_KEY) setCfg(JSON.parse(v));else if (k === PHOTOS_KEY) setPhotos(JSON.parse(v));else if (k.startsWith('family:log:')) setLogs(prev => ({
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
  const savePhotos = async next => {
    setPhotos(next);
    try {
      await box.set(PHOTOS_KEY, JSON.stringify(next));
    } catch (e) {
      setErr('사진 저장이 안 됐어요. 조금 더 작은 사진으로 해보세요.');
    }
  };
  const tasksFor = (kid, date) => (cfg?.tasks ?? []).filter(t => (t.kids === 'all' || t.kids.includes(kid)) && (t.date ? t.date === dateKey(date) : t.days.includes(date.getDay()))).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
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
      padding: '18px 14px 40px'
    }
  }, /*#__PURE__*/React.createElement("style", null, CSS), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: tab === 'home' ? 1100 : 620,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "hand",
    style: {
      fontSize: 16,
      color: '#8C8570',
      margin: 0
    }
  }, today.getFullYear(), "\uB144 ", today.getMonth() + 1, "\uC6D4"), /*#__PURE__*/React.createElement("h1", {
    className: "display",
    style: {
      fontSize: 34,
      margin: '2px 0 0',
      lineHeight: 1
    }
  }, "\uC6B0\uB9AC\uC9D1 \uC2A4\uCF00\uC904\uB7EC ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 26
    }
  }, "\u270F\uFE0F"))), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 14,
      flexWrap: 'wrap'
    }
  }, [['home', '종합'], ['today', '오늘'], ['record', '기록'], ['setup', '설정']].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: "tab",
    "data-on": tab === k,
    onClick: () => setTab(k)
  }, l))), err && /*#__PURE__*/React.createElement("p", {
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
    onClick: () => setKidId(k.id)
  }, /*#__PURE__*/React.createElement(Face, {
    kid: k,
    photo: photos[k.id],
    size: 30
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
  }), tab === 'setup' && /*#__PURE__*/React.createElement(Setup, {
    cfg: cfg,
    save: saveCfg,
    photos: photos,
    savePhotos: savePhotos,
    setErr: setErr
  })));
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
      color: '#8C8570'
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
      style: {
        minWidth: 0
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
        color: '#8C8570'
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
        color: '#B4AD98',
        textAlign: 'center',
        margin: '8px 0'
      }
    }, "\uC5C6\uC74C"), tasks.map(t => {
      const on = done.includes(t.id);
      return /*#__PURE__*/React.createElement("button", {
        key: t.id,
        onClick: () => onToggle(kid.id, dk, t.id),
        style: {
          position: 'relative',
          border: '2.5px solid #23303F',
          borderRadius: 11,
          padding: '11px 10px',
          cursor: 'pointer',
          textAlign: 'left',
          overflow: 'hidden',
          background: on ? kid.color : '#FFFDF7',
          opacity: on ? 1 : 0.94
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 15,
          fontWeight: on ? 700 : 500,
          lineHeight: 1.3,
          textDecoration: on ? 'line-through' : 'none'
        }
      }, t.date && '★ ', on && '✓ ', t.title), (t.time || t.reward > 0) && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: '#5A6472',
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
        background: isToday ? '#23303F' : 'transparent',
        color: isToday ? '#FBF7EE' : d.getDay() === 0 ? '#C08080' : '#5A6472',
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
        border: '2px solid #E4DBC4',
        borderRadius: 9,
        padding: 6,
        minHeight: 84,
        background: all ? kid.color : '#FFFDF7'
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
        color: '#5A6472',
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
          background: on ? '#23303F' : 'transparent',
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
          color: on ? '#8C8570' : '#23303F'
        }
      }, t.title));
    }))));
  }))))), /*#__PURE__*/React.createElement("p", {
    className: "hand",
    style: {
      fontSize: 15,
      color: '#8C8570',
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
      color: rate === 100 ? '#23303F' : '#7A8492'
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
      color: '#5A6472'
    }
  }, "\uC624\uB298 \uBC1B\uC740 \uC6A9\uB3C8 ", /*#__PURE__*/React.createElement("b", {
    className: "display",
    style: {
      fontSize: 22,
      color: '#23303F'
    }
  }, earned.toLocaleString(), "\uC6D0"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#8C8570'
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
    className: "card"
  }, tasks.length === 0 && /*#__PURE__*/React.createElement("p", {
    style: {
      padding: 24,
      textAlign: 'center',
      color: '#7A8492',
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
    }))), /*#__PURE__*/React.createElement("span", {
      className: "label",
      style: {
        flex: 1,
        fontSize: 15,
        fontWeight: on ? 700 : 500
      }
    }, t.date && '★ ', t.title), t.reward > 0 && /*#__PURE__*/React.createElement("span", {
      className: "label",
      style: {
        fontSize: 12,
        fontWeight: 700,
        border: '1px solid #23303F',
        borderRadius: 999,
        padding: '1px 7px'
      }
    }, t.reward.toLocaleString(), "\uC6D0"), t.time && /*#__PURE__*/React.createElement("span", {
      className: "label",
      style: {
        fontSize: 12,
        color: '#7A8492'
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
      color: i === 0 ? '#C08080' : '#8C8570'
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
        borderColor: isToday ? '#23303F' : '#E7E0CE',
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
      color: '#8C8570',
      margin: 0
    }
  }, cursor.getMonth() + 1, "\uC6D4 \uC6A9\uB3C8 \uD569\uACC4"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: '#8C8570',
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
      color: '#8C8570',
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
      color: '#8C8570',
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
        color: '#8C8570',
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
    tasks: cfg.tasks.map(t => t.kids === 'all' ? t : {
      ...t,
      kids: t.kids.filter(x => x !== id)
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
      color: '#8C8570',
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
      borderBottom: '1px dashed #DED6C2',
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
      color: '#7A8492'
    }
  }, t.days.length === 7 ? '매일' : t.days.map(d => DOW[d]).join(''), " ", t.time, " ", t.reward > 0 ? `· ${t.reward.toLocaleString()}원` : ''), /*#__PURE__*/React.createElement("button", {
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
      color: '#8C8570',
      margin: '0 0 10px'
    }
  }, "\uC815\uD55C \uB0A0\uC9DC\uC5D0\uB9CC \uBAA9\uB85D\uC5D0 \uB728\uACE0, \uADF8\uB0A0\uC774 \uC9C0\uB098\uBA74 \uC0AC\uB77C\uC838\uC694."), missions.length === 0 && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: '#7A8492',
      margin: '0 0 4px'
    }
  }, "\uC544\uC9C1 \uC5C6\uC5B4\uC694. \uBCF4\uC0C1 \uAC78\uACE0 \uC2F6\uC740 \uC77C\uC744 \uD558\uB098 \uB123\uC5B4\uBCF4\uC138\uC694."), missions.map(t => {
    const past = t.date < todayKey;
    return /*#__PURE__*/React.createElement("div", {
      key: t.id,
      style: {
        borderBottom: '1px dashed #DED6C2',
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
        color: '#7A8492'
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
      color: '#8C8570',
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
      color: '#8C8570',
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
      color: '#5A6472',
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
      background: '#FFFDF7',
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
      color: '#8C8570'
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
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      letterSpacing: 2,
      color: '#8C8570'
    }
  }, "\uC2DC\uAC04 (\uC5C6\uC5B4\uB3C4 \uB3FC\uC694)"), /*#__PURE__*/React.createElement("input", {
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
      color: '#8C8570'
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
      color: '#8C8570'
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
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      letterSpacing: 2,
      color: '#8C8570',
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
  }, d)))), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      letterSpacing: 2,
      color: '#8C8570',
      display: 'block',
      marginBottom: 6
    }
  }, "\uB204\uAD6C \uAC83"), /*#__PURE__*/React.createElement("div", {
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
    onClick: () => t.title.trim() && onSave({
      ...t,
      title: t.title.trim()
    })
  }, "\uC800\uC7A5"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: onCancel
  }, "\uCDE8\uC18C"), /*#__PURE__*/React.createElement("button", {
    className: "btn tiny",
    onClick: () => onDelete(t.id)
  }, "\uC0AD\uC81C"))));
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));