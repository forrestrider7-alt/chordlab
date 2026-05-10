import { useState, useReducer, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────────
const C = {
  bg:'#0f0f0f', surf:'#1a1a1a', surf2:'#242424', border:'#2e2e2e',
  cyan:'#00e5ff', em:'#10b981', amber:'#f59e0b', purple:'#a78bfa',
  red:'#ef4444', text:'#f0f0f0', muted:'#6b7280',
};

// ─────────────────────────────────────────────
// MUSIC MATH ENGINE
// ─────────────────────────────────────────────
const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const ni = n => { const i = NOTES.indexOf(n); return i >= 0 ? i : 0; };
const nn = i => NOTES[((i % 12) + 12) % 12];

const CHORD_DEF = {
  major: {i:[0,4,7],        f:'1–3–5',        n:'Major'},
  minor: {i:[0,3,7],        f:'1–♭3–5',       n:'Minor'},
  dim:   {i:[0,3,6],        f:'1–♭3–♭5',      n:'Diminished'},
  aug:   {i:[0,4,8],        f:'1–3–♯5',       n:'Augmented'},
  sus2:  {i:[0,2,7],        f:'1–2–5',        n:'Sus2'},
  sus4:  {i:[0,5,7],        f:'1–4–5',        n:'Sus4'},
  '7':   {i:[0,4,7,10],     f:'1–3–5–♭7',     n:'Dom7'},
  maj7:  {i:[0,4,7,11],     f:'1–3–5–7',      n:'Maj7'},
  min7:  {i:[0,3,7,10],     f:'1–♭3–5–♭7',    n:'Min7'},
  dim7:  {i:[0,3,6,9],      f:'1–♭3–♭5–♭♭7',  n:'Dim7'},
  '9':   {i:[0,4,7,10,14],  f:'1–3–5–♭7–9',   n:'Dom9'},
  maj9:  {i:[0,4,7,11,14],  f:'1–3–5–7–9',    n:'Maj9'},
  min9:  {i:[0,3,7,10,14],  f:'1–♭3–5–♭7–9',  n:'Min9'},
  add9:  {i:[0,4,7,14],     f:'1–3–5–9',      n:'Add9'},
  min11: {i:[0,3,7,10,17],  f:'1–♭3–5–♭7–11', n:'Min11'},
  '13':  {i:[0,4,7,10,21],  f:'1–3–5–♭7–13',  n:'Dom13'},
  '7b5': {i:[0,4,6,10],     f:'1–3–♭5–♭7',    n:'7♭5'},
  '6':   {i:[0,4,7,9],      f:'1–3–5–6',      n:'Maj6'},
  min6:  {i:[0,3,7,9],      f:'1–♭3–5–6',     n:'Min6'},
  '5':   {i:[0,7],          f:'1–5',          n:'Power'},
};

const SCALE_DEF = {
  major:         {i:[0,2,4,5,7,9,11], n:'Major'},
  minor:         {i:[0,2,3,5,7,8,10], n:'Natural Minor'},
  harmonicMinor: {i:[0,2,3,5,7,8,11], n:'Harmonic Minor'},
  dorian:        {i:[0,2,3,5,7,9,10], n:'Dorian'},
  phrygian:      {i:[0,1,3,5,7,8,10], n:'Phrygian'},
  lydian:        {i:[0,2,4,6,7,9,11], n:'Lydian'},
  mixolydian:    {i:[0,2,4,5,7,9,10], n:'Mixolydian'},
  pentatonicMaj: {i:[0,2,4,7,9],      n:'Pentatonic Major'},
  pentatonicMin: {i:[0,3,5,7,10],     n:'Pentatonic Minor'},
  blues:         {i:[0,3,5,6,7,10],   n:'Blues'},
};

const TUNING_DEF = {
  standard: {n:'Standard', notes:['E','A','D','G','B','E']},
  dropD:    {n:'Drop D',   notes:['D','A','D','G','B','E']},
  openG:    {n:'Open G',   notes:['D','G','D','G','B','D']},
  dadgad:   {n:'DADGAD',   notes:['D','A','D','G','A','D']},
};

const ROMANS = ['I','II','III','IV','V','VI','VII'];
const DIA_TYPES = {
  major:        ['major','minor','minor','major','major','minor','dim'],
  minor:        ['minor','dim','major','minor','minor','major','major'],
  harmonicMinor:['minor','dim','aug','minor','major','major','dim'],
  dorian:       ['minor','minor','major','major','minor','dim','major'],
  phrygian:     ['minor','major','major','minor','dim','major','minor'],
  lydian:       ['major','major','minor','dim','major','minor','minor'],
  mixolydian:   ['major','minor','dim','major','minor','minor','major'],
};

function cNotes(root, type) {
  const d = CHORD_DEF[type] || CHORD_DEF.major;
  return d.i.map(x => nn(ni(root) + x));
}
function sNotes(root, scale) {
  const d = SCALE_DEF[scale] || SCALE_DEF.major;
  return d.i.map(x => nn(ni(root) + x));
}
function diaChords(root, scale) {
  const s = SCALE_DEF[scale] || SCALE_DEF.major;
  const types = DIA_TYPES[scale] || DIA_TYPES.major;
  return s.i.slice(0, 7).map((iv, i) => {
    const r = nn(ni(root) + iv);
    const t = types[i] || 'major';
    return { root: r, type: t, numeral: ROMANS[i], notes: cNotes(r, t) };
  });
}
function nColor(note, rootNote, allNotes) {
  if (!allNotes?.length || !rootNote) return C.text;
  const diff = ((ni(note) - ni(rootNote)) + 12) % 12;
  if (diff === 0) return C.cyan;
  if (diff === 3 || diff === 4) return C.em;
  if (diff === 7) return C.amber;
  if (allNotes.includes(note)) return C.purple;
  return C.muted;
}

// ─────────────────────────────────────────────
// GUITAR FINGERINGS DATABASE
// [lowE(0), A(1), D(2), G(3), B(4), highE(5)]
// -1=muted, 0=open, n=fret number
// ─────────────────────────────────────────────
const FING = {
  'C-major':   [{s:[-1,3,2,0,1,0], f:[0,3,2,0,1,0]},
                {s:[-1,3,5,5,5,3], f:[0,1,3,3,3,1], bar:{fret:3,lo:1,hi:5}}],
  'C#-major':  [{s:[-1,4,6,6,6,4], f:[0,1,3,3,3,1], bar:{fret:4,lo:1,hi:5}}],
  'D-major':   [{s:[-1,-1,0,2,3,2],f:[0,0,0,1,3,2]},
                {s:[-1,5,7,7,7,5], f:[0,1,3,3,3,1], bar:{fret:5,lo:1,hi:5}}],
  'D#-major':  [{s:[-1,6,8,8,8,6], f:[0,1,3,3,3,1], bar:{fret:6,lo:1,hi:5}}],
  'E-major':   [{s:[0,2,2,1,0,0],  f:[0,2,3,1,0,0]},
                {s:[0,7,9,9,9,7],  f:[0,1,3,3,3,1], bar:{fret:7,lo:0,hi:5}}],
  'F-major':   [{s:[1,3,3,2,1,1],  f:[1,3,4,2,1,1], bar:{fret:1,lo:0,hi:5}}],
  'F#-major':  [{s:[2,4,4,3,2,2],  f:[1,3,4,2,1,1], bar:{fret:2,lo:0,hi:5}}],
  'G-major':   [{s:[3,2,0,0,0,3],  f:[2,1,0,0,0,4]},
                {s:[3,5,5,4,3,3],  f:[1,3,4,2,1,1], bar:{fret:3,lo:0,hi:5}}],
  'G#-major':  [{s:[4,6,6,5,4,4],  f:[1,3,4,2,1,1], bar:{fret:4,lo:0,hi:5}}],
  'A-major':   [{s:[-1,0,2,2,2,0], f:[0,0,1,2,3,0]},
                {s:[-1,0,2,2,2,0], f:[0,0,1,1,1,0]}],
  'A#-major':  [{s:[-1,1,3,3,3,1], f:[0,1,3,3,3,1], bar:{fret:1,lo:1,hi:5}}],
  'B-major':   [{s:[-1,2,4,4,4,2], f:[0,1,3,3,3,1], bar:{fret:2,lo:1,hi:5}}],
  'C-minor':   [{s:[-1,3,5,5,4,3], f:[0,1,3,4,2,1], bar:{fret:3,lo:1,hi:5}}],
  'C#-minor':  [{s:[-1,4,6,6,5,4], f:[0,1,3,4,2,1], bar:{fret:4,lo:1,hi:5}}],
  'D-minor':   [{s:[-1,-1,0,2,3,1],f:[0,0,0,2,3,1]}],
  'D#-minor':  [{s:[-1,6,8,8,7,6], f:[0,1,3,4,2,1], bar:{fret:6,lo:1,hi:5}}],
  'E-minor':   [{s:[0,2,2,0,0,0],  f:[0,2,3,0,0,0]}],
  'F-minor':   [{s:[1,3,3,1,1,1],  f:[1,3,4,1,1,1], bar:{fret:1,lo:0,hi:5}}],
  'F#-minor':  [{s:[2,4,4,2,2,2],  f:[1,3,4,1,1,1], bar:{fret:2,lo:0,hi:5}}],
  'G-minor':   [{s:[3,5,5,3,3,3],  f:[1,3,4,1,1,1], bar:{fret:3,lo:0,hi:5}}],
  'G#-minor':  [{s:[4,6,6,4,4,4],  f:[1,3,4,1,1,1], bar:{fret:4,lo:0,hi:5}}],
  'A-minor':   [{s:[-1,0,2,2,1,0], f:[0,0,2,3,1,0]}],
  'A#-minor':  [{s:[-1,1,3,3,2,1], f:[0,1,3,4,2,1], bar:{fret:1,lo:1,hi:5}}],
  'B-minor':   [{s:[-1,2,4,4,3,2], f:[0,1,3,4,2,1], bar:{fret:2,lo:1,hi:5}}],
  'E-5':       [{s:[0,2,2,-1,-1,-1],f:[0,1,2,0,0,0]}],
  'A-5':       [{s:[-1,0,2,2,-1,-1],f:[0,0,1,2,0,0]}],
  'D-5':       [{s:[-1,-1,0,2,3,-1],f:[0,0,0,1,2,0]}],
  'G-5':       [{s:[3,5,5,-1,-1,-1],f:[1,2,3,0,0,0]}],
  'C-maj7':    [{s:[-1,3,2,0,0,0], f:[0,3,2,0,0,0]}],
  'G-maj7':    [{s:[3,2,0,0,0,2],  f:[3,2,0,0,0,1]}],
  'D-maj7':    [{s:[-1,-1,0,2,2,2],f:[0,0,0,1,1,1]}],
  'A-min7':    [{s:[-1,0,2,0,1,0], f:[0,0,2,0,1,0]}],
  'D-min7':    [{s:[-1,-1,0,2,1,1],f:[0,0,0,2,1,1]}],
  'E-min7':    [{s:[0,2,2,0,3,0],  f:[0,2,3,0,4,0]}],
  'G-7':       [{s:[3,2,0,0,0,1],  f:[3,2,0,0,0,1]}],
  'C-7':       [{s:[-1,3,2,3,1,0], f:[0,3,2,4,1,0]}],
  'E-7':       [{s:[0,2,0,1,0,0],  f:[0,2,0,1,0,0]}],
  'A-7':       [{s:[-1,0,2,0,2,0], f:[0,0,2,0,3,0]}],
  'D-7':       [{s:[-1,-1,0,2,1,2],f:[0,0,0,2,1,3]}],
  'A-sus2':    [{s:[-1,0,2,2,0,0], f:[0,0,1,2,0,0]}],
  'D-sus2':    [{s:[-1,-1,0,2,3,0],f:[0,0,0,1,2,0]}],
  'E-sus4':    [{s:[0,2,2,2,0,0],  f:[0,1,2,3,0,0]}],
  'A-sus4':    [{s:[-1,0,2,2,3,0], f:[0,0,1,2,3,0]}],
  'D-sus4':    [{s:[-1,-1,0,2,3,3],f:[0,0,0,1,2,3]}],
  'E-aug':     [{s:[0,3,2,1,1,0],  f:[0,3,2,1,1,0]}],
  'E-dim':     [{s:[0,1,2,3,-1,-1],f:[0,1,2,3,0,0]}],
  'C-6':       [{s:[-1,3,2,2,1,0], f:[0,3,2,2,1,0]}],
};

function getFing(root, type, variant = 0) {
  const arr = FING[`${root}-${type}`];
  if (arr?.length) return arr[Math.min(variant, arr.length - 1)];
  const ri = ni(root);
  let aFret = ((ri - ni('A')) + 12) % 12; if (aFret === 0) aFret = 12;
  let eFret = ((ri - ni('E')) + 12) % 12; if (eFret === 0) eFret = 12;
  if (aFret <= 7) {
    return type === 'minor'
      ? { s:[-1,aFret,aFret+2,aFret+2,aFret+1,aFret], f:[0,1,3,4,2,1], bar:{fret:aFret,lo:1,hi:5} }
      : { s:[-1,aFret,aFret+2,aFret+2,aFret+2,aFret], f:[0,1,3,3,3,1], bar:{fret:aFret,lo:1,hi:5} };
  }
  return type === 'minor'
    ? { s:[eFret,eFret+2,eFret+2,eFret,eFret,eFret], f:[1,3,4,1,1,1], bar:{fret:eFret,lo:0,hi:5} }
    : { s:[eFret,eFret+2,eFret+2,eFret+1,eFret,eFret], f:[1,3,4,2,1,1], bar:{fret:eFret,lo:0,hi:5} };
}
function varCount(root, type) { return (FING[`${root}-${type}`] || []).length || 1; }

// ─────────────────────────────────────────────
// AUDIO ENGINE
// ─────────────────────────────────────────────
let _ctx = null;
const getCtx = () => { if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)(); return _ctx; };

function playTone(freq, t, dur, vol = 0.12) {
  const ctx = getCtx();
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.type = 'triangle'; osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.04);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.start(t); osc.stop(t + dur + 0.01);
}
function playChord(notes, dur = 1.5) {
  const ctx = getCtx(); if (ctx.state === 'suspended') ctx.resume();
  const now = ctx.currentTime;
  notes.forEach((n, i) => playTone(440 * Math.pow(2, (60 + ni(n) - 69) / 12), now + i * 0.025, dur));
}
function playClick(strong = false) {
  const ctx = getCtx(); if (ctx.state === 'suspended') ctx.resume();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination); osc.type = 'sine';
  osc.frequency.value = strong ? 1000 : 800;
  g.gain.setValueAtTime(0.35, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  osc.start(now); osc.stop(now + 0.07);
}

// ─────────────────────────────────────────────
// PROGRESSION LOGIC
// ─────────────────────────────────────────────
const PROG = {
  pop:     { n:'Pop',      idx:[0,4,5,3], desc:'I–V–vi–IV' },
  blues:   { n:'Blues',    idx:[0,3,4,0], desc:'I–IV–V–I'  },
  jazz:    { n:'Jazz',     idx:[1,4,0,5], desc:'ii–V–I–VI' },
  rock:    { n:'Rock',     idx:[0,6,3,0], desc:'I–VII–IV–I'},
  neosoul: { n:'Neo-Soul', idx:[0,2,5,3], desc:'I–iii–vi–IV'},
  folk:    { n:'Folk',     idx:[0,3,0,4], desc:'I–IV–I–V'  },
};
const MOODS = { bright:'Bright', dark:'Dark', tense:'Tense', dreamy:'Dreamy' };

function buildProg(root, scale, genre, mood) {
  const dia = diaChords(root, scale);
  const preset = PROG[genre] || PROG.pop;
  return preset.idx.map(idx => {
    const ch = dia[idx % dia.length] || dia[0];
    let t = ch.type;
    if (mood === 'bright' && t === 'minor') t = 'major';
    if (mood === 'dark'   && t === 'major') t = 'minor';
    if (mood === 'tense'  && t === 'major') t = '7';
    if (mood === 'tense'  && t === 'minor') t = 'min7';
    if (mood === 'dreamy' && t === 'major') t = 'maj7';
    return { root: ch.root, type: t, numeral: ch.numeral, notes: cNotes(ch.root, t) };
  });
}

// ─────────────────────────────────────────────
// CHORD LIBRARY
// ─────────────────────────────────────────────
const LIB = {
  basic:    { label:'Basic',     chords:[{r:'C',t:'major'},{r:'D',t:'major'},{r:'E',t:'major'},{r:'F',t:'major'},{r:'G',t:'major'},{r:'A',t:'major'},{r:'B',t:'major'},{r:'A',t:'minor'},{r:'E',t:'minor'},{r:'D',t:'minor'},{r:'E',t:'5'},{r:'A',t:'5'},{r:'D',t:'5'}] },
  beautiful:{ label:'Beautiful', chords:[{r:'C',t:'maj7'},{r:'G',t:'maj7'},{r:'D',t:'maj7'},{r:'A',t:'add9'},{r:'D',t:'sus2'},{r:'A',t:'sus2'},{r:'E',t:'sus4'},{r:'D',t:'sus4'},{r:'A',t:'sus4'},{r:'C',t:'6'}] },
  jazz:     { label:'Jazz',      chords:[{r:'D',t:'min7'},{r:'G',t:'7'},{r:'C',t:'maj7'},{r:'E',t:'7b5'},{r:'B',t:'dim7'},{r:'A',t:'min9'},{r:'D',t:'9'},{r:'C',t:'7'}] },
  neosoul:  { label:'Neo-Soul',  chords:[{r:'A',t:'min11'},{r:'D',t:'maj9'},{r:'G',t:'maj7'},{r:'E',t:'min9'},{r:'C',t:'maj9'},{r:'F',t:'maj7'},{r:'A',t:'min7'}] },
  rock:     { label:'Rock',      chords:[{r:'E',t:'5'},{r:'A',t:'5'},{r:'D',t:'5'},{r:'G',t:'5'},{r:'E',t:'major'},{r:'A',t:'major'},{r:'E',t:'aug'},{r:'E',t:'7'}] },
};

// ─────────────────────────────────────────────
// TAB TEXT EXPORT
// ─────────────────────────────────────────────
function tabTxt(workspace, tuning = 'standard') {
  const tn = TUNING_DEF[tuning]?.notes || TUNING_DEF.standard.notes;
  const labels = [...tn].reverse();
  const slots = workspace.filter(Boolean);
  if (!slots.length) return '';
  return labels.map((label, li) => {
    const si = 5 - li;
    const frts = slots.map(sl => {
      const fg = getFing(sl.root, sl.type, sl.variant || 0);
      const f = fg.s[si];
      return f === -1 ? '-x-' : `-${f}-`;
    }).join('');
    return `${label}|${frts}|`;
  }).join('\n');
}

// ─────────────────────────────────────────────
// STATE MANAGEMENT
// ─────────────────────────────────────────────
const INIT = {
  root:'C', scale:'major', instrument:'guitar', tuning:'standard', handedness:'right',
  workspace:[null,null,null,null],
  mood:'bright', genre:'pop',
  modal:null, tab:'library', group:'basic',
  favorites:[], history:[],
  bpm:120, playing:false, playSlot:-1,
  metro:false, octave:4, confirmReset:false,
};

function reducer(s, a) {
  const hist = d => [{ d, t: Date.now() }, ...s.history.slice(0, 9)];
  switch (a.type) {
    case 'ROOT':    return { ...s, root: a.v, history: hist(`Root → ${a.v}`) };
    case 'SCALE':   return { ...s, scale: a.v };
    case 'XPOSE': {
      const nr = nn(ni(s.root) + a.v);
      const nw = s.workspace.map(sl => sl ? { ...sl, root: nn(ni(sl.root) + a.v) } : null);
      return { ...s, root: nr, workspace: nw, history: hist(`Transpose ${a.v > 0 ? '+' : ''}${a.v}`) };
    }
    case 'INST':    return { ...s, instrument: a.v };
    case 'TUNING':  return { ...s, tuning: a.v };
    case 'HAND':    return { ...s, handedness: a.v };
    case 'MODAL':   return { ...s, modal: a.v };
    case 'VARIANT': return { ...s, modal: { ...s.modal, variant: a.v } };
    case 'ADD_WS': {
      const i = s.workspace.findIndex(x => !x);
      if (i < 0) return s;
      const nw = [...s.workspace]; nw[i] = { root: a.v.root, type: a.v.type, variant: a.v.variant || 0 };
      return { ...s, workspace: nw, history: hist(`Add ${a.v.root} ${a.v.type}`) };
    }
    case 'REM_WS': { const nw = [...s.workspace]; nw[a.v] = null; return { ...s, workspace: nw }; }
    case 'MOVE_WS': {
      const nw = [...s.workspace]; [nw[a.v.f], nw[a.v.t]] = [nw[a.v.t], nw[a.v.f]];
      return { ...s, workspace: nw };
    }
    case 'CLR_WS':  return { ...s, workspace: [null, null, null, null] };
    case 'GEN': {
      const prog = buildProg(s.root, s.scale, s.genre, s.mood);
      const nw = [null, null, null, null];
      prog.forEach((c, i) => { nw[i] = { root: c.root, type: c.type, variant: 0 }; });
      return { ...s, workspace: nw, history: hist(`Generated ${s.genre}`) };
    }
    case 'SHUFFLE': {
      const filled = s.workspace.filter(Boolean);
      for (let i = filled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); [filled[i], filled[j]] = [filled[j], filled[i]];
      }
      const nw = [null, null, null, null]; filled.forEach((c, i) => { nw[i] = c; });
      return { ...s, workspace: nw };
    }
    case 'MOOD':    return { ...s, mood: a.v };
    case 'GENRE':   return { ...s, genre: a.v };
    case 'TAB':     return { ...s, tab: a.v };
    case 'GROUP':   return { ...s, group: a.v };
    case 'FAV_ADD': {
      if (s.favorites.some(f => f.root === a.v.root && f.type === a.v.type)) return s;
      return { ...s, favorites: [...s.favorites, a.v] };
    }
    case 'FAV_REM': return { ...s, favorites: s.favorites.filter((_, i) => i !== a.v) };
    case 'FAV_CLR': return { ...s, favorites: [] };
    case 'BPM':     return { ...s, bpm: a.v };
    case 'PLAY':    return { ...s, playing: a.v };
    case 'PSLOT':   return { ...s, playSlot: a.v };
    case 'METRO':   return { ...s, metro: !s.metro };
    case 'OCTAVE':  return { ...s, octave: a.v };
    case 'CR':      return { ...s, confirmReset: a.v };
    case 'RESET':   return { ...INIT };
    default:        return s;
  }
}

// ─────────────────────────────────────────────
// GUITAR SVG
// ─────────────────────────────────────────────
function Guitar({ root, type, variant = 0, hand = 'right', tuning = 'standard', mini = false }) {
  const fg = getFing(root, type, variant);
  const { s: frets, f: fingers, bar } = fg;
  const W = mini ? 78 : 220, H = mini ? 88 : 268;
  const PL = mini ? 10 : 34, PT = mini ? 14 : 54, PR = mini ? 8 : 14, PB = mini ? 8 : 18;
  const gW = W - PL - PR, gH = H - PT - PB;
  const SS = gW / 5, FS = gH / 5;
  const tn = TUNING_DEF[tuning]?.notes || TUNING_DEF.standard.notes;
  const dF   = hand === 'right' ? frets             : [...frets].reverse();
  const dFing = hand === 'right' ? fingers           : [...fingers].reverse();
  const dTn  = hand === 'right' ? tn                : [...tn].reverse();
  const valid = dF.filter(f => f > 0);
  const offset = valid.length ? Math.max(0, Math.min(...valid) - 1) : 0;
  const sx = i => PL + i * SS;
  const fy = f => PT + (f - offset - 0.5) * FS;
  const allN = cNotes(root, type);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* Nut */}
      <rect x={PL} y={PT - 3} width={gW} height={offset === 0 ? 5 : 2} fill={offset === 0 ? '#ccc' : '#555'} rx={1} />
      {offset > 0 && <text x={PL - 3} y={PT + FS * 0.55} fill={C.muted} fontSize={9} textAnchor="end" fontFamily="monospace">{offset + 1}fr</text>}
      {/* Fret lines */}
      {[0,1,2,3,4,5].map(i => <line key={i} x1={PL} y1={PT + i * FS} x2={PL + gW} y2={PT + i * FS} stroke="#333" strokeWidth={1} />)}
      {/* Strings */}
      {[0,1,2,3,4,5].map(i => <line key={i} x1={sx(i)} y1={PT} x2={sx(i)} y2={PT + gH} stroke={i === 0 || i === 5 ? '#666' : '#444'} strokeWidth={i === 0 || i === 5 ? 1.5 : 1} />)}
      {/* Open/muted indicators */}
      {!mini && dF.map((fret, i) => {
        if (fret === 0) return <circle key={i} cx={sx(i)} cy={PT - 22} r={6} fill="none" stroke={C.cyan} strokeWidth={1.5} />;
        if (fret === -1) return <g key={i}><line x1={sx(i)-5} y1={PT-27} x2={sx(i)+5} y2={PT-17} stroke={C.red} strokeWidth={1.5} /><line x1={sx(i)+5} y1={PT-27} x2={sx(i)-5} y2={PT-17} stroke={C.red} strokeWidth={1.5} /></g>;
        return null;
      })}
      {/* Tuning labels */}
      {!mini && dTn.map((n, i) => <text key={i} x={sx(i)} y={PT - 32} fill={C.muted} fontSize={8} textAnchor="middle" fontFamily="monospace">{n}</text>)}
      {/* Barre */}
      {bar && (() => {
        const adj = bar.fret - offset;
        if (adj < 1 || adj > 5) return null;
        const lo = hand === 'right' ? bar.lo : 5 - bar.hi;
        const hi = hand === 'right' ? bar.hi : 5 - bar.lo;
        return <rect x={sx(lo) - 9} y={fy(bar.fret) - 9} width={sx(Math.min(hi, 5)) - sx(lo) + 18} height={18} rx={9} fill={C.cyan} opacity={0.83} />;
      })()}
      {/* Finger dots */}
      {dF.map((fret, i) => {
        if (fret <= 0 || fret === -1) return null;
        const adj = fret - offset; if (adj < 1 || adj > 5) return null;
        if (bar && fret === bar.fret) return null;
        const strNote = nn(ni(dTn[i]) + fret);
        const col = nColor(strNote, root, allN);
        return <g key={i}>
          <circle cx={sx(i)} cy={fy(fret)} r={mini ? 5 : 9} fill={col} opacity={0.9} />
          {!mini && <text x={sx(i)} y={fy(fret) + 4} fill="#000" fontSize={8} textAnchor="middle" fontFamily="monospace" fontWeight="bold">{strNote}</text>}
        </g>;
      })}
      {/* Barre note labels */}
      {bar && !mini && dF.map((fret, i) => {
        if (fret !== bar.fret) return null;
        const adj = fret - offset; if (adj < 1 || adj > 5) return null;
        const strNote = nn(ni(dTn[i]) + fret);
        return <text key={i} x={sx(i)} y={fy(fret) + 4} fill="#000" fontSize={8} textAnchor="middle" fontFamily="monospace" fontWeight="bold">{strNote}</text>;
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────
// PIANO SVG
// ─────────────────────────────────────────────
const WN = ['C','D','E','F','G','A','B'];

function Piano({ notes, octStart = 4, mini = false }) {
  if (!notes?.length) return null;
  const root = notes[0];
  const numOct = mini ? 1 : 2;
  const ww = mini ? 18 : 28, wh = mini ? 72 : 120, bw = mini ? 10 : 16, bh = mini ? 44 : 74;
  const bOff = { 'C#': ww * 1 - bw / 2, 'D#': ww * 2 - bw / 2, 'F#': ww * 4 - bw / 2, 'G#': ww * 5 - bw / 2, 'A#': ww * 6 - bw / 2 };
  const whites = [], blacks = [];
  for (let o = 0; o < numOct; o++) {
    const ox = o * 7 * ww;
    WN.forEach((n, i) => whites.push({ note: n, x: ox + i * ww, hi: notes.includes(n) }));
    Object.entries(bOff).forEach(([n, dx]) => blacks.push({ note: n, x: ox + dx, hi: notes.includes(n) }));
  }
  const tw = numOct * 7 * ww;
  const gc = n => nColor(n, root, notes);

  return (
    <svg width={tw} height={wh + 4} viewBox={`0 0 ${tw} ${wh + 4}`}>
      {whites.map(({ note, x, hi }, i) => <g key={`w${i}`}>
        <rect x={x + 0.5} y={0} width={ww - 1} height={wh} fill={hi ? gc(note) : '#e0e0e0'} stroke="#555" strokeWidth={0.5} rx={2} />
        {!mini && <text x={x + ww / 2} y={wh - 6} fill={hi ? '#000' : '#888'} fontSize={8} textAnchor="middle" fontFamily="monospace">{note}</text>}
      </g>)}
      {blacks.map(({ note, x, hi }, i) => <rect key={`b${i}`} x={x} y={0} width={bw} height={bh} fill={hi ? gc(note) : '#111'} stroke="#000" strokeWidth={0.5} rx={2} />)}
    </svg>
  );
}

// ─────────────────────────────────────────────
// TABLATURE STAFF
// ─────────────────────────────────────────────
function TabStaff({ workspace, tuning }) {
  const tn = TUNING_DEF[tuning]?.notes || TUNING_DEF.standard.notes;
  const labels = [...tn].reverse();
  const slots = workspace.filter(Boolean);
  if (!slots.length) return <div style={{ color: C.muted, textAlign: 'center', padding: 20, fontFamily: 'monospace', fontSize: 12 }}>Add chords to workspace to see tabs</div>;

  return (
    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.text, overflowX: 'auto' }}>
      <div style={{ display: 'flex', marginBottom: 4, paddingLeft: 22 }}>
        {slots.map((sl, i) => {
          const d = CHORD_DEF[sl.type] || CHORD_DEF.major;
          return <div key={i} style={{ width: 60, textAlign: 'center', fontSize: 10, color: C.cyan, fontWeight: 700 }}>
            {sl.root}{sl.type === 'major' ? '' : sl.type === 'minor' ? 'm' : sl.type}
          </div>;
        })}
      </div>
      {labels.map((label, li) => {
        const si = 5 - li;
        return <div key={li} style={{ display: 'flex', alignItems: 'center', lineHeight: '1.8' }}>
          <span style={{ width: 22, color: C.muted, flexShrink: 0 }}>{label}|</span>
          {slots.map((sl, i) => {
            const fg = getFing(sl.root, sl.type, sl.variant || 0);
            const f = fg.s[si];
            const isX = f === -1;
            return <span key={i} style={{ width: 60, textAlign: 'center', color: isX ? C.red : C.text, borderBottom: `1px solid ${C.border}` }}>{isX ? '--x--' : `--${f}--`}</span>;
          })}
          <span style={{ color: C.muted }}>|</span>
        </div>;
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// CHORD MODAL
// ─────────────────────────────────────────────
function Modal({ chord, state, dispatch }) {
  if (!chord) return null;
  const { root, type, variant = 0 } = chord;
  const notes = cNotes(root, type);
  const d = CHORD_DEF[type] || CHORD_DEF.major;
  const vc = varCount(root, type);
  const isFav = state.favorites.some(f => f.root === root && f.type === type);
  const badgeColors = [C.cyan, C.em, C.amber, C.purple, C.text, C.text, C.text];

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') dispatch({ type: 'MODAL', v: null }); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [dispatch]);

  return (
    <div onClick={() => dispatch({ type: 'MODAL', v: null })} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, width: 500, maxWidth: '95vw', maxHeight: '88vh', overflowY: 'auto', animation: 'scaleIn 0.17s ease' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'monospace', letterSpacing: -1 }}>
              <span style={{ color: C.cyan }}>{root}</span>
              <span style={{ color: C.text, fontWeight: 400, fontSize: 18 }}> {d.n}</span>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Formula: <span style={{ color: C.amber }}>{d.f}</span></div>
          </div>
          <button onClick={() => dispatch({ type: 'MODAL', v: null })} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18, padding: 4 }}>✕</button>
        </div>

        {/* Note badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {notes.map((n, i) => <div key={i} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontFamily: 'monospace', background: badgeColors[i] + '22', border: `1px solid ${badgeColors[i]}`, color: badgeColors[i] }}>{n}</div>)}
        </div>

        {/* Variant picker */}
        {vc > 1 && <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
          {Array.from({ length: vc }, (_, i) => <button key={i} onClick={() => dispatch({ type: 'VARIANT', v: i })} style={{ padding: '4px 12px', borderRadius: 8, fontSize: 11, background: variant === i ? C.cyan : 'transparent', border: `1px solid ${variant === i ? C.cyan : C.border}`, color: variant === i ? '#000' : C.muted, cursor: 'pointer', fontFamily: 'monospace' }}>Var {i + 1}</button>)}
        </div>}

        {/* Diagram */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18, padding: '8px 0' }}>
          {state.instrument === 'guitar'
            ? <Guitar root={root} type={type} variant={variant} hand={state.handedness} tuning={state.tuning} />
            : <Piano notes={notes} octStart={state.octave} />}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => { dispatch({ type: 'ADD_WS', v: { root, type, variant } }); dispatch({ type: 'MODAL', v: null }); }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: C.cyan, color: '#000', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>+ Add to Workspace</button>
          <button onClick={() => playChord(notes)} style={{ padding: '10px 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.em, cursor: 'pointer', fontSize: 16 }}>▶</button>
          <button onClick={() => { isFav ? dispatch({ type: 'FAV_REM', v: state.favorites.findIndex(f => f.root === root && f.type === type) }) : dispatch({ type: 'FAV_ADD', v: { root, type } }); }} style={{ padding: '10px 14px', borderRadius: 10, background: isFav ? C.amber + '22' : 'transparent', border: `1px solid ${isFav ? C.amber : C.border}`, color: isFav ? C.amber : C.muted, cursor: 'pointer', fontSize: 16 }}>{isFav ? '★' : '☆'}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// WORKSPACE SLOT
// ─────────────────────────────────────────────
function WSlot({ slot, idx, state, dispatch, isOver, onDS, onDO, onDrop }) {
  if (!slot) return (
    <div onDragOver={onDO} onDrop={onDrop} style={{ flex: 1, minWidth: 0, minHeight: 120, border: `2px dashed ${isOver ? C.cyan : C.border}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 12, cursor: 'default', transition: 'border-color 0.15s', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 22, opacity: 0.3 }}>+</span>
      <span>Slot {idx + 1}</span>
    </div>
  );
  const { root, type, variant = 0 } = slot;
  const notes = cNotes(root, type);
  const d = CHORD_DEF[type] || CHORD_DEF.major;
  const isActive = state.playSlot === idx;

  return (
    <div draggable onDragStart={onDS} onDragOver={onDO} onDrop={onDrop} style={{ flex: 1, minWidth: 0, border: `1px solid ${isOver ? C.cyan : isActive ? C.cyan : C.border}`, borderRadius: 12, padding: '12px 8px', background: C.surf2, cursor: 'grab', transition: 'border-color 0.15s, box-shadow 0.15s', boxShadow: isActive ? `0 0 0 3px ${C.cyan}33` : 'none' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.cyan, fontFamily: 'monospace', lineHeight: 1 }}>{root}<span style={{ color: C.text, fontSize: 11, fontWeight: 400 }}> {d.n}</span></div>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>{d.f}</div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        {state.instrument === 'guitar' ? <Guitar root={root} type={type} variant={variant} hand={state.handedness} tuning={state.tuning} mini /> : <Piano notes={notes} octStart={state.octave} mini />}
      </div>
      <div style={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[
          ['⛶', C.text,  () => dispatch({ type: 'MODAL', v: { root, type, variant } }), false],
          ['▶', C.em,    () => playChord(notes), false],
          ['◀', C.muted, () => idx > 0 && dispatch({ type: 'MOVE_WS', v: { f: idx, t: idx - 1 } }), idx === 0],
          ['▶', C.muted, () => idx < 3 && dispatch({ type: 'MOVE_WS', v: { f: idx, t: idx + 1 } }), idx === 3],
          ['✕', C.red,   () => dispatch({ type: 'REM_WS', v: idx }), false],
        ].map(([icon, col, fn, dis], i) => (
          <button key={i} onClick={fn} disabled={dis} style={{ padding: '3px 7px', borderRadius: 6, background: 'transparent', border: `1px solid ${C.border}`, color: dis ? C.border : col, cursor: dis ? 'not-allowed' : 'pointer', fontSize: 11 }}>{icon}</button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SCALE BAR
// ─────────────────────────────────────────────
function ScaleBar({ root, scale }) {
  const sn = sNotes(root, scale);
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      {NOTES.map(n => {
        const inS = sn.includes(n), isR = n === root;
        return <div key={n} style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, fontFamily: 'monospace', background: isR ? C.cyan : inS ? C.surf2 : 'transparent', border: `1px solid ${isR ? C.cyan : inS ? C.border : 'transparent'}`, color: isR ? '#000' : inS ? C.text : C.muted }}>{n}</div>;
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
const TABS = [
  { id: 'library',   icon: '📚', l: 'Library'   },
  { id: 'generator', icon: '⚡', l: 'Generator' },
  { id: 'favorites', icon: '★',  l: 'Saved'     },
  { id: 'settings',  icon: '⚙',  l: 'Settings'  },
];

export default function App() {
  const [s, dispatch] = useReducer(reducer, INIT);
  const [isMobile, setMobile] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [copied, setCopied] = useState(false);

  const wsRef    = useRef(s.workspace);
  const bpmRef   = useRef(s.bpm);
  const playRef  = useRef(false);
  const timerRef = useRef(null);
  const metroRef = useRef(null);
  const metroCount = useRef(0);
  const spaceRef = useRef(null);

  useEffect(() => { wsRef.current  = s.workspace; }, [s.workspace]);
  useEffect(() => { bpmRef.current = s.bpm; },       [s.bpm]);

  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    h(); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h);
  }, []);

  const stopPlay = useCallback(() => {
    clearTimeout(timerRef.current); playRef.current = false;
    dispatch({ type: 'PLAY', v: false }); dispatch({ type: 'PSLOT', v: -1 });
  }, []);

  const startPlay = useCallback(() => {
    playRef.current = true; dispatch({ type: 'PLAY', v: true });
    let si = 0;
    const tick = () => {
      if (!playRef.current) return;
      const ws = wsRef.current;
      const valid = ws.map((sl, i) => sl ? i : null).filter(i => i !== null);
      if (!valid.length) { stopPlay(); return; }
      const vi = valid[si % valid.length];
      dispatch({ type: 'PSLOT', v: vi });
      const sl = ws[vi]; if (sl) playChord(cNotes(sl.root, sl.type));
      si++; timerRef.current = setTimeout(tick, (60 / bpmRef.current) * 4 * 1000);
    };
    tick();
  }, [stopPlay]);

  spaceRef.current = () => { if (playRef.current) stopPlay(); else startPlay(); };

  useEffect(() => {
    const h = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'Escape') dispatch({ type: 'MODAL', v: null });
      if (e.key === ' ') { e.preventDefault(); spaceRef.current?.(); }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    if (s.metro) {
      metroCount.current = 0;
      const ms = (60 / s.bpm) * 1000;
      metroRef.current = setInterval(() => { playClick(metroCount.current % 4 === 0); metroCount.current++; }, ms);
    } else clearInterval(metroRef.current);
    return () => clearInterval(metroRef.current);
  }, [s.metro, s.bpm]);

  useEffect(() => () => { clearTimeout(timerRef.current); clearInterval(metroRef.current); }, []);

  const copyTab = () => {
    navigator.clipboard.writeText(tabTxt(s.workspace, s.tuning))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  // ── Sidebar ──
  const sidebarContent = (
    <div style={{ width: 220, background: C.surf, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', flexShrink: 0 }}>
      <div style={{ padding: '18px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: -1, fontFamily: 'monospace' }}>
          <span style={{ color: C.cyan }}>CHORD</span><span style={{ color: C.amber }}>LAB</span>
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Music Theory Tool</div>
      </div>
      <nav style={{ padding: '10px 8px', flex: 1 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { dispatch({ type: 'TAB', v: t.id }); if (isMobile) setSideOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 8, marginBottom: 3, background: s.tab === t.id ? C.cyan + '18' : 'transparent', border: `1px solid ${s.tab === t.id ? C.cyan + '44' : 'transparent'}`, color: s.tab === t.id ? C.cyan : C.muted, cursor: 'pointer', fontSize: 13, textAlign: 'left', transition: 'all 0.12s' }}>
            <span>{t.icon}</span><span>{t.l}</span>
          </button>
        ))}
      </nav>
      <div style={{ padding: '10px 8px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 9, color: C.muted, marginBottom: 5, fontFamily: 'monospace', letterSpacing: 1 }}>HISTORY</div>
        {s.history.slice(0, 5).map((h, i) => <div key={i} style={{ fontSize: 9, color: i === 0 ? C.text : C.muted, padding: '1px 4px', fontFamily: 'monospace' }}>{h.d}</div>)}
        {!s.history.length && <div style={{ fontSize: 9, color: C.muted }}>No actions yet</div>}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui,sans-serif', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes scaleIn { from { opacity:0; transform:scale(0.94) } to { opacity:1; transform:scale(1) } }
        * { box-sizing:border-box; margin:0; padding:0 }
        ::-webkit-scrollbar { width:5px }
        ::-webkit-scrollbar-track { background:#1a1a1a }
        ::-webkit-scrollbar-thumb { background:#333; border-radius:3px }
        select option { background:#1a1a1a }
        button { transition:opacity 0.1s }
        button:hover:not(:disabled) { opacity:0.8 }
        button:disabled { opacity:0.25; cursor:not-allowed !important }
      `}</style>

      {/* Desktop sidebar */}
      {!isMobile && sidebarContent}

      {/* Mobile sidebar overlay */}
      {isMobile && sideOpen && <>
        <div onClick={() => setSideOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 490 }} />
        <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 500 }}>{sidebarContent}</div>
      </>}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* ── GLOBAL CONTROL BAR ── */}
        <div style={{ background: C.surf, borderBottom: `1px solid ${C.border}`, padding: '10px 14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 7 }}>

            {isMobile && <button onClick={() => setSideOpen(true)} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.text, padding: '5px 9px', borderRadius: 6, cursor: 'pointer' }}>☰</button>}

            {/* Instrument toggle */}
            <div style={{ display: 'flex', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
              {['guitar', 'piano'].map(inst => <button key={inst} onClick={() => dispatch({ type: 'INST', v: inst })} style={{ padding: '5px 11px', background: s.instrument === inst ? C.cyan + '22' : 'transparent', border: 'none', borderRight: inst === 'guitar' ? `1px solid ${C.border}` : 'none', color: s.instrument === inst ? C.cyan : C.muted, cursor: 'pointer', fontSize: 12 }}>{inst === 'guitar' ? '🎸' : '🎹'} {inst}</button>)}
            </div>

            {/* Root note selector */}
            <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {NOTES.map(n => <button key={n} onClick={() => dispatch({ type: 'ROOT', v: n })} style={{ padding: '3px 7px', borderRadius: 5, background: s.root === n ? C.cyan : 'transparent', border: `1px solid ${s.root === n ? C.cyan : C.border}`, color: s.root === n ? '#000' : C.muted, cursor: 'pointer', fontSize: 10, fontFamily: 'monospace' }}>{n}</button>)}
            </div>

            {/* Scale selector */}
            <select value={s.scale} onChange={e => dispatch({ type: 'SCALE', v: e.target.value })} style={{ background: C.surf2, border: `1px solid ${C.border}`, color: C.text, padding: '5px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
              {Object.entries(SCALE_DEF).map(([k, v]) => <option key={k} value={k}>{v.n}</option>)}
            </select>

            {/* Transpose */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => dispatch({ type: 'XPOSE', v: -1 })} style={{ padding: '4px 9px', borderRadius: 6, background: 'transparent', border: `1px solid ${C.border}`, color: C.amber, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>−1</button>
              <button onClick={() => dispatch({ type: 'XPOSE', v:  1 })} style={{ padding: '4px 9px', borderRadius: 6, background: 'transparent', border: `1px solid ${C.border}`, color: C.amber, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>+1</button>
            </div>

            {/* BPM + metronome */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <input type="number" value={s.bpm} min={40} max={240} onChange={e => dispatch({ type: 'BPM', v: Math.max(40, Math.min(240, Number(e.target.value))) })} style={{ width: 52, background: C.surf2, border: `1px solid ${C.border}`, color: C.text, padding: '4px 6px', borderRadius: 6, fontSize: 11, fontFamily: 'monospace', textAlign: 'center' }} />
              <button onClick={() => dispatch({ type: 'METRO' })} style={{ padding: '4px 9px', borderRadius: 6, background: s.metro ? C.em + '22' : 'transparent', border: `1px solid ${s.metro ? C.em : C.border}`, color: s.metro ? C.em : C.muted, cursor: 'pointer', fontSize: 11 }}>♩{s.metro ? ' ON' : ''}</button>
            </div>

            {/* Reset */}
            {s.confirmReset
              ? <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: C.red }}>Reset?</span>
                  <button onClick={() => { stopPlay(); dispatch({ type: 'RESET' }); }} style={{ padding: '3px 10px', borderRadius: 6, background: C.red + '22', border: `1px solid ${C.red}`, color: C.red, cursor: 'pointer', fontSize: 11 }}>Yes</button>
                  <button onClick={() => dispatch({ type: 'CR', v: false })} style={{ padding: '3px 10px', borderRadius: 6, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 11 }}>No</button>
                </div>
              : <button onClick={() => dispatch({ type: 'CR', v: true })} style={{ padding: '4px 10px', borderRadius: 6, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 11 }}>⟳ Reset</button>
            }
          </div>
          <ScaleBar root={s.root} scale={s.scale} />
        </div>

        {/* ── PAGE CONTENT ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '18px', paddingBottom: isMobile ? 72 : 18 }}>

          {/* ════ LIBRARY TAB ════ */}
          {s.tab === 'library' && <div>
            <div style={{ display: 'flex', gap: 5, marginBottom: 14, flexWrap: 'wrap' }}>
              {Object.entries(LIB).map(([k, g]) => <button key={k} onClick={() => dispatch({ type: 'GROUP', v: k })} style={{ padding: '5px 13px', borderRadius: 8, fontSize: 12, background: s.group === k ? C.cyan + '22' : 'transparent', border: `1px solid ${s.group === k ? C.cyan : C.border}`, color: s.group === k ? C.cyan : C.muted, cursor: 'pointer' }}>{g.label}</button>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8 }}>
              {(LIB[s.group]?.chords || []).map((chord, i) => {
                const d = CHORD_DEF[chord.t] || CHORD_DEF.major;
                const notes = cNotes(chord.r, chord.t);
                return (
                  <div key={i}
                    onClick={() => dispatch({ type: 'MODAL', v: { root: chord.r, type: chord.t, variant: 0 } })}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.cyan; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = ''; }}
                    style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 8px', cursor: 'pointer', transition: 'all 0.14s' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.cyan, fontFamily: 'monospace' }}>{chord.r}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 7 }}>{d.n}</div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {s.instrument === 'guitar'
                        ? <Guitar root={chord.r} type={chord.t} hand={s.handedness} tuning={s.tuning} mini />
                        : <Piano notes={notes} octStart={s.octave} mini />}
                    </div>
                    <div style={{ fontSize: 9, color: C.muted, marginTop: 5, textAlign: 'center', fontFamily: 'monospace' }}>{notes.slice(0, 4).join('·')}</div>
                  </div>
                );
              })}
            </div>
          </div>}

          {/* ════ GENERATOR TAB ════ */}
          {s.tab === 'generator' && <div>

            {/* Mood + Genre */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 5, fontFamily: 'monospace', letterSpacing: 1 }}>MOOD</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {Object.entries(MOODS).map(([k, v]) => <button key={k} onClick={() => dispatch({ type: 'MOOD', v: k })} style={{ padding: '5px 11px', borderRadius: 8, fontSize: 11, background: s.mood === k ? C.amber + '22' : 'transparent', border: `1px solid ${s.mood === k ? C.amber : C.border}`, color: s.mood === k ? C.amber : C.muted, cursor: 'pointer' }}>{v}</button>)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 5, fontFamily: 'monospace', letterSpacing: 1 }}>GENRE</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {Object.entries(PROG).map(([k, v]) => <button key={k} onClick={() => dispatch({ type: 'GENRE', v: k })} style={{ padding: '5px 11px', borderRadius: 8, fontSize: 11, background: s.genre === k ? C.purple + '22' : 'transparent', border: `1px solid ${s.genre === k ? C.purple : C.border}`, color: s.genre === k ? C.purple : C.muted, cursor: 'pointer' }}>
                    <span>{v.n}</span>
                    {!isMobile && <span style={{ fontSize: 9, opacity: 0.5, display: 'block' }}>{v.desc}</span>}
                  </button>)}
                </div>
              </div>
            </div>

            {/* Diatonic chord strip */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, fontFamily: 'monospace', letterSpacing: 1 }}>DIATONIC — {s.root} {SCALE_DEF[s.scale]?.n}</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {diaChords(s.root, s.scale).map((ch, i) => (
                  <button key={i} onClick={() => dispatch({ type: 'ADD_WS', v: { root: ch.root, type: ch.type } })} style={{ padding: '5px 10px', borderRadius: 7, background: C.surf, border: `1px solid ${C.border}`, color: C.text, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }}>
                    <span style={{ color: C.amber }}>{ch.numeral}</span> {ch.root}<span style={{ opacity: 0.5, fontSize: 9 }}>{ch.type === 'major' ? '' : ch.type === 'minor' ? 'm' : ch.type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 7, marginBottom: 16, flexWrap: 'wrap' }}>
              <button onClick={() => dispatch({ type: 'GEN' })} style={{ padding: '9px 18px', borderRadius: 10, background: C.cyan, color: '#000', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>⚡ Generate</button>
              <button onClick={() => dispatch({ type: 'SHUFFLE' })} style={{ padding: '9px 12px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.amber, cursor: 'pointer', fontSize: 13 }}>🔀 Shuffle</button>
              <button onClick={() => dispatch({ type: 'CLR_WS' })} style={{ padding: '9px 12px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.red, cursor: 'pointer', fontSize: 13 }}>✕ Clear</button>
              <button onClick={() => s.playing ? stopPlay() : startPlay()} style={{ padding: '9px 12px', borderRadius: 10, background: s.playing ? C.em + '22' : 'transparent', border: `1px solid ${s.playing ? C.em : C.border}`, color: s.playing ? C.em : C.muted, cursor: 'pointer', fontSize: 13 }}>{s.playing ? '⏹ Stop' : '▶ Loop'}</button>
            </div>

            {/* Workspace */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, fontFamily: 'monospace', letterSpacing: 1 }}>
                WORKSPACE {s.playing && <span style={{ color: C.em, marginLeft: 8 }}>● PLAYING</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                {s.workspace.map((slot, i) => (
                  <div key={i} style={{ flex: isMobile ? '1 1 44%' : 1, minWidth: 0 }}>
                    <WSlot slot={slot} idx={i} state={s} dispatch={dispatch}
                      isOver={dragOver === i}
                      onDS={() => setDragFrom(i)}
                      onDO={e => { e.preventDefault(); setDragOver(i); }}
                      onDrop={() => { if (dragFrom !== null && dragFrom !== i) dispatch({ type: 'MOVE_WS', v: { f: dragFrom, t: i } }); setDragFrom(null); setDragOver(null); }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Tablature panel */}
            <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace', letterSpacing: 1 }}>TABLATURE</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button onClick={copyTab} style={{ padding: '4px 10px', borderRadius: 6, background: copied ? C.em + '22' : 'transparent', border: `1px solid ${copied ? C.em : C.border}`, color: copied ? C.em : C.muted, cursor: 'pointer', fontSize: 11 }}>{copied ? '✓ Copied' : '📋 Copy Tab'}</button>
                  <button onClick={() => navigator.clipboard.writeText(s.workspace.filter(Boolean).map(sl => `${sl.root}${sl.type === 'major' ? '' : sl.type === 'minor' ? 'm' : sl.type}`).join(' – '))} style={{ padding: '4px 10px', borderRadius: 6, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 11 }}>Copy Names</button>
                </div>
              </div>
              <TabStaff workspace={s.workspace} tuning={s.tuning} />
            </div>
          </div>}

          {/* ════ FAVORITES TAB ════ */}
          {s.tab === 'favorites' && <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Saved Chords</div>
              <button onClick={() => dispatch({ type: 'FAV_CLR' })} style={{ padding: '4px 10px', borderRadius: 6, background: 'transparent', border: `1px solid ${C.border}`, color: C.red, cursor: 'pointer', fontSize: 11 }}>Clear All</button>
            </div>
            {!s.favorites.length
              ? <div style={{ color: C.muted, textAlign: 'center', padding: 48, fontSize: 13 }}>No saved chords yet.<br />Click ☆ in chord details to save.</div>
              : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 8 }}>
                  {s.favorites.map((ch, i) => {
                    const d = CHORD_DEF[ch.type] || CHORD_DEF.major;
                    const notes = cNotes(ch.root, ch.type);
                    return <div key={i} style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div><span style={{ fontWeight: 700, color: C.cyan, fontFamily: 'monospace' }}>{ch.root}</span><span style={{ fontSize: 10, color: C.muted, marginLeft: 4 }}>{d.n}</span></div>
                        <button onClick={() => dispatch({ type: 'FAV_REM', v: i })} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13 }}>✕</button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 7 }}>
                        {s.instrument === 'guitar' ? <Guitar root={ch.root} type={ch.type} hand={s.handedness} tuning={s.tuning} mini /> : <Piano notes={notes} octStart={s.octave} mini />}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => dispatch({ type: 'MODAL', v: { root: ch.root, type: ch.type, variant: 0 } })} style={{ flex: 1, padding: 4, borderRadius: 6, background: 'transparent', border: `1px solid ${C.border}`, color: C.text, cursor: 'pointer', fontSize: 11 }}>View</button>
                        <button onClick={() => dispatch({ type: 'ADD_WS', v: { root: ch.root, type: ch.type } })} style={{ flex: 1, padding: 4, borderRadius: 6, background: C.cyan + '15', border: `1px solid ${C.cyan + '44'}`, color: C.cyan, cursor: 'pointer', fontSize: 11 }}>Add</button>
                      </div>
                    </div>;
                  })}
                </div>
            }
          </div>}

          {/* ════ SETTINGS TAB ════ */}
          {s.tab === 'settings' && <div style={{ maxWidth: 480 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Settings</div>

            {/* Tuning */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 8, fontFamily: 'monospace', letterSpacing: 1 }}>GUITAR TUNING</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {Object.entries(TUNING_DEF).map(([k, t]) => <button key={k} onClick={() => dispatch({ type: 'TUNING', v: k })} style={{ padding: '6px 10px', borderRadius: 7, fontSize: 11, background: s.tuning === k ? C.cyan + '22' : 'transparent', border: `1px solid ${s.tuning === k ? C.cyan : C.border}`, color: s.tuning === k ? C.cyan : C.muted, cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{t.notes.join('-')}</div>
                  <div style={{ fontSize: 9, opacity: 0.6 }}>{t.n}</div>
                </button>)}
              </div>
            </div>

            {/* Handedness */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 8, fontFamily: 'monospace', letterSpacing: 1 }}>HANDEDNESS</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {['right', 'left'].map(h => <button key={h} onClick={() => dispatch({ type: 'HAND', v: h })} style={{ padding: '6px 14px', borderRadius: 7, fontSize: 11, background: s.handedness === h ? C.cyan + '22' : 'transparent', border: `1px solid ${s.handedness === h ? C.cyan : C.border}`, color: s.handedness === h ? C.cyan : C.muted, cursor: 'pointer', textTransform: 'capitalize' }}>{h}-handed</button>)}
              </div>
            </div>

            {/* Piano octave */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 8, fontFamily: 'monospace', letterSpacing: 1 }}>PIANO START OCTAVE</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {[3, 4, 5].map(o => <button key={o} onClick={() => dispatch({ type: 'OCTAVE', v: o })} style={{ padding: '6px 14px', borderRadius: 7, fontSize: 11, background: s.octave === o ? C.cyan + '22' : 'transparent', border: `1px solid ${s.octave === o ? C.cyan : C.border}`, color: s.octave === o ? C.cyan : C.muted, cursor: 'pointer', fontFamily: 'monospace' }}>C{o}</button>)}
              </div>
            </div>

            {/* Keyboard shortcuts */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 8, fontFamily: 'monospace', letterSpacing: 1 }}>KEYBOARD SHORTCUTS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px', fontFamily: 'monospace', fontSize: 11, alignItems: 'center' }}>
                {[['Space', 'Play / Stop loop'], ['Esc', 'Close chord modal']].map(([k, v], i) => (
                  <div key={i} style={{ display: 'contents' }}>
                    <span style={{ background: C.surf2, border: `1px solid ${C.border}`, padding: '2px 8px', borderRadius: 4, color: C.cyan, display: 'inline-block' }}>{k}</span>
                    <span style={{ color: C.muted }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Color legend */}
            <div>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 8, fontFamily: 'monospace', letterSpacing: 1 }}>NOTE COLORS (DIAGRAMS)</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[[C.cyan,'Root'],[C.em,'Third'],[C.amber,'Fifth'],[C.purple,'Extension']].map(([col,label]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: col }} />
                    <span style={{ color: C.muted }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>}

        </div>{/* end content */}
      </div>{/* end main */}

      {/* ── CHORD MODAL ── */}
      {s.modal && <Modal chord={s.modal} state={s} dispatch={dispatch} />}

      {/* ── MOBILE BOTTOM NAV ── */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.surf, borderTop: `1px solid ${C.border}`, display: 'flex', zIndex: 400 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => dispatch({ type: 'TAB', v: t.id })} style={{ flex: 1, padding: '10px 0', background: 'transparent', border: 'none', color: s.tab === t.id ? C.cyan : C.muted, cursor: 'pointer', fontSize: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 18 }}>{t.icon}</span>
              <span>{t.l}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
