// js/chordVisualizer.js
(function () {
  // ===== Notes map & tuning =====
  const NOTES = ["A","A#","B","C","C#","D","D#","E","F","F#","G","G#"];
  const OPEN_TUNING = ["E","A","D","G","B","E"]; // 6 -> 1

  const nIndex = n => NOTES.indexOf(n);
  const up = (note, semis) => NOTES[(nIndex(note) + semis) % 12];

  // ===== Small library of open chords (string 6..1, fret from nut, 0=open, X=muted) =====
  // Fingering numbers optional; barre null if none
  // We’ll render 4 frets tall; if highest > 3, we’ll slide window and show fret number.
  const OPEN_LIB = {
  // ===== Major open chords =====
  "C:maj": [
    { frets: ["X",3,2,0,1,0], fingers:[null,3,2,null,1,null], label:"Open" },
    { frets: [8,10,10,9,8,8], fingers:[1,3,4,2,1,1], barre:{fret:8,from:6,to:1}, label:"Barre E-shape" }
  ],
  "A:maj":   [{ frets: [0,0,2,2,2,0], fingers:[null,null,2,1,3,null], label:"Open" }],
  "G:maj": [
    { frets: [3,2,0,0,0,3], fingers:[2,1,null,null,null,3], label:"Standard" },
    { frets: [3,2,0,0,3,3], fingers:[2,1,null,null,3,4], label:"Full open" },
    { frets: [3,5,5,4,3,3], fingers:[1,3,4,2,1,1], barre:{fret:3,from:6,to:1}, label:"Barre E-shape" }
  ],
  "E:maj":   [{ frets: [0,2,2,1,0,0], fingers:[null,2,3,1,null,null], label:"Open" }],
"D:maj": [
  { frets: ["X","X",0,2,3,2], fingers:[null,null,null,1,3,2], label:"Open" },
  { frets: ["X",5,7,7,7,5], fingers:[1,3,4,2,1,1], barre:{fret:5,from:5,to:1}, startFret:5, label:"Barre A-shape" }
],

  // ===== Minor chords =====
  "A:min":   [{ frets: [0,0,2,2,1,0], fingers:[null,null,3,2,1,null], label:"Open" }],
  "E:min": [
    { frets: [0,2,2,0,0,0], fingers:[null,2,3,null,null,null], label:"Open" },
    { frets: [0,7,9,9,8,7], fingers:[null,1,3,4,2,1], label:"Barre" }
  ],
  "D:min":   [{ frets: ["X","X",0,2,3,1], fingers:[null,null,null,2,3,1], label:"Open" }],

  // ===== Dominant 7, m7, maj7 =====
  "A:7":     [{ frets: [0,0,2,0,2,0], fingers:[null,null,2,null,3,null], label:"Open" }],
  "E:7":     [{ frets: [0,2,0,1,0,0], fingers:[null,2,null,1,null,null], label:"Open" }],
  "D:7":     [{ frets: ["X","X",0,2,1,2], fingers:[null,null,null,2,1,3], label:"Open" }],
  "C:maj7":  [{ frets: ["X",3,2,0,0,0], fingers:[null,3,2,null,null,null], label:"Open" }],
  "A:maj7":  [{ frets: [0,0,2,1,2,0], fingers:[null,null,3,1,2,null], label:"Open" }],
  "E:maj7":  [{ frets: [0,2,1,1,0,0], fingers:[null,3,1,2,null,null], label:"Open" }],
  "A:m7":    [{ frets: [0,0,2,0,1,0], fingers:[null,null,3,null,1,null], label:"Open" }],
  "E:m7": [
    { frets: [0,2,2,0,3,0], fingers:[null,2,3,null,4,null], label:"Open" },
    { frets: [0,7,9,7,8,7], fingers:[null,1,3,1,2,1], barre:{fret:7,from:5,to:1}, label:"Barre" }
  ],

  // ===== Sus / add9 =====
  "D:sus2":  [{ frets: ["X","X",0,2,3,0], fingers:[null,null,null,1,3,null], label:"Open" }],
  "D:sus4":  [{ frets: ["X","X",0,2,3,3], fingers:[null,null,null,1,2,3], label:"Open" }],
  "A:sus2":  [{ frets: [0,0,2,2,0,0], fingers:[null,null,2,3,null,null], label:"Open" }],
  "A:sus4":  [{ frets: [0,0,2,2,3,0], fingers:[null,null,1,2,3,null], label:"Open" }],
  "C:add9": [
    { frets: ["X",3,2,0,3,0], fingers:[null,3,2,null,4,null], label:"Common" },
    { frets: [8,10,10,9,8,10], fingers:[1,3,4,2,1,4], label:"Alt voicing" }
  ],
  "G:add9":  [{ frets: [3,2,0,0,0,2], fingers:[2,1,null,null,null,3], label:"Open" }],

  // ===== Popular slash chords =====
  "G/B":  [{ frets: ["X",2,0,0,0,3], fingers:[null,1,null,null,null,3], label:"Slash" }],
  "D/F#": [{ frets: [2,0,0,2,3,2], fingers:[2,null,null,1,3,4], label:"Slash" }],
  "C/G":  [{ frets: [3,3,2,0,1,0], fingers:[3,4,2,null,1,null], label:"Slash" }],
  "Am/E": [{ frets: [0,0,2,2,1,0], fingers:[null,null,3,2,1,null], label:"Slash" }],
  "F/C":  [{ frets: ["X",3,3,2,1,1], fingers:[null,3,4,2,1,1], label:"Slash" }],
};


  // ===== Barre generators (E-shape on 6th string, A-shape on 5th string) =====
  function eshapeVoicing(root, quality) {
    // Map qualities to E-shape templates (relative to index finger barre fret)
    // Template: per string fret offsets from barre (0..3 within the diagram if possible), X allowed
    // Fingering numbers roughly standard: 1 barre, rest typical
    const tpl = {
      maj: { frets: [1,3,3,2,1,1], fingers:[1,3,4,2,1,1], barre:{fret:1, from:6, to:1} },
      min: { frets: [1,3,3,1,1,1], fingers:[1,3,4,1,1,1], barre:{fret:1, from:6, to:1} },
      "7": { frets: [1,3,1,2,1,1], fingers:[1,3,1,2,1,1], barre:{fret:1, from:6, to:1} },
      m7:  { frets: [1,3,1,1,1,1], fingers:[1,3,1,1,1,1], barre:{fret:1, from:6, to:1} },
      maj7:{ frets: [1,3,2,2,1,1], fingers:[1,3,2,2,1,1], barre:{fret:1, from:6, to:1} },
    }[quality];
    if (!tpl) return null;

    // Find fret of root on 6th string
    const rootOn6 = (nIndex(root) - nIndex("E") + 12) % 12; // 0..11 semitones above open E
    const baseFret = Math.max(1, rootOn6); // shift up neck; if 0, use 12 or 0? prefer 1..11
    return bakeBarreVoicing(baseFret, tpl, "E-shape", baseFret);
  }

  function ashapeVoicing(root, quality) {
    const tpl = {
      maj: { frets: ["X",1,3,3,3,1], fingers:[null,1,3,4,2,1], barre:{fret:1, from:5, to:1} },
      min: { frets: ["X",1,3,3,2,1], fingers:[null,1,3,4,2,1], barre:{fret:1, from:5, to:1} },
      "7": { frets: ["X",1,3,1,3,1], fingers:[null,1,3,1,4,1], barre:{fret:1, from:5, to:1} },
      m7:  { frets: ["X",1,3,1,2,1], fingers:[null,1,3,1,2,1], barre:{fret:1, from:5, to:1} },
      maj7:{ frets: ["X",1,3,2,3,1], fingers:[null,1,3,2,4,1], barre:{fret:1, from:5, to:1} },
    }[quality];
    if (!tpl) return null;

    // Root on 5th string
    const rootOn5 = (nIndex(root) - nIndex("A") + 12) % 12;
    const baseFret = Math.max(1, rootOn5);
    return bakeBarreVoicing(baseFret, tpl, "A-shape", baseFret);
  }

  function bakeBarreVoicing(baseFret, tpl, label, fretNumForBadge) {
    const absFrets = tpl.frets.map(f => (f === "X" ? "X" : (baseFret - 1) + f));
    const minFret = Math.min(...absFrets.filter(f => f !== "X"));
    const maxFret = Math.max(...absFrets.filter(f => f !== "X"));
  
    // choose a window so the chord fits in 4 frets
    const startFret = Math.max(1, Math.min(minFret, maxFret - 3));
  
    return {
      frets: absFrets,
      fingers: tpl.fingers,
      barre: tpl.barre ? { 
        fret: (baseFret - 1) + tpl.barre.fret, 
        from: tpl.barre.from, 
        to: tpl.barre.to 
      } : null,
      startFret,
      label
    };
  }
  

  // ===== Build list of voicings for (root, type, shapeMode) =====
 function makeVoicings(root, type, shapeMode) {
  const key = `${root}:${type}`;
  const v = [];

  if ((shapeMode === "auto" || shapeMode === "open") && OPEN_LIB[key]) {
    const arr = Array.isArray(OPEN_LIB[key]) ? OPEN_LIB[key] : [OPEN_LIB[key]];
    arr.forEach(entry => v.push(normalizeOpen(entry, root, type)));
  }

  if (shapeMode === "auto" || shapeMode === "eshape") {
    const e = eshapeVoicing(root, type);
    if (e) v.push(e);
  }
  if (shapeMode === "auto" || shapeMode === "ashape") {
    const a = ashapeVoicing(root, type);
    if (a) v.push(a);
  }
  return v.length ? v : [{ frets: ["X","X","X","X","X","X"], startFret: 1, label: "No voicing" }];
}


function normalizeOpen(entry, root, type) {
  const numericFrets = entry.frets.map(f => (f === "X" ? "X" : f));
  const maxF = Math.max(...numericFrets.filter(f => f !== "X"));

  // Keep startFret if entry provides it (for barre chords)
  const startFret = entry.startFret || 1;

  return {
    frets: entry.frets,             // absolute from nut, 0=open
    fingers: entry.fingers || [],
    barre: entry.barre || null,
    startFret,
    label: entry.label || "Open"
  };
}


  // ===== Rendering (SVG) =====
function renderChord(diagramEl, voicing) {
  const W = 260, H = 230;
  const topPad = 40, leftPad = 18, rightPad = 18, bottomPad = 20; // ⬅ increased topPad for label room
  const strings = 6, fretsTall = 4;

  const innerW = W - leftPad - rightPad;
  const innerH = H - topPad - bottomPad;

  const xStep = innerW / (strings - 1);
  const yStep = innerH / fretsTall;

  const startFret = voicing.startFret || 1;
  const endFret = startFret + fretsTall - 1; // ⬅ new: show fret range

  const svg = [
    `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`,

    // ⬅ Fret range label at the very top
    ...(startFret > 1
      ? [`<text x="${W/2}" y="18" text-anchor="middle" class="chord-fret-label">Frets ${startFret}–${endFret}</text>`]
      : []),

    // Strings (vertical)
    ...Array.from({length: strings}, (_, i) => {
      const x = leftPad + i * xStep;
      return `<line x1="${x}" y1="${topPad}" x2="${x}" y2="${topPad + innerH}" class="chord-line" />`;
    }),

    // Frets (horizontal) – 4 lines; nut if startFret==1
    ...(startFret === 1
      ? [`<line x1="${leftPad}" y1="${topPad}" x2="${leftPad + innerW}" y2="${topPad}" class="chord-nut" />`]
      : []),
    ...Array.from({length: fretsTall}, (_, i) => {
      const y = topPad + (i+1) * yStep;
      return `<line x1="${leftPad}" y1="${y}" x2="${leftPad + innerW}" y2="${y}" class="chord-fret" />`;
    }),

    // X/O above strings
    `<g class="chord-xo">` +
      OPEN_TUNING.map((_, sIdx) => {
        const f = voicing.frets[sIdx];
        const x = leftPad + sIdx * xStep;
        if (f === "X") return `<text x="${x}" y="${topPad - 10}" text-anchor="middle">X</text>`;
        if (f === 0)    return `<text x="${x}" y="${topPad - 10}" text-anchor="middle">O</text>`;
        return "";
      }).join("") +
    `</g>`,

    // Barre (if any)
    ...(voicing.barre ? (() => {
    const fretY = yForFret(voicing.barre.fret);
    const x1 = xForString(voicing.barre.from);
    const x2 = xForString(voicing.barre.to);
    const fromX = Math.min(x1, x2);
    const toX   = Math.max(x1, x2);
    const h = yStep * 0.6;
    const y = fretY - h/2;
    return [`<rect x="${fromX}" y="${y}" width="${toX - fromX}" height="${h}" class="chord-barre" />`];
    })() : []),

    // Dots
    ...dotsForVoicing(voicing).map(d => {
      return `
        <g>
          <circle cx="${d.x}" cy="${d.y}" r="${d.r}" class="chord-dot" />
          ${d.txt ? `<text x="${d.x}" y="${d.y+3}" class="chord-dot-text">${d.txt}</text>` : ""}
        </g>`;
    }),

    `</svg>`
  ].join("");

  diagramEl.innerHTML = svg;

  function xForString(stringNumber) {
    const sIdx = 6 - stringNumber;
    return leftPad + sIdx * xStep;
  }

  function yForFret(absFret) {
    if (absFret === 0) return topPad - 9999; // O marker only
    const rel = absFret - startFret + 1;     // relative to window start
    const slotY = topPad + (rel - 0.5) * yStep;
    return slotY;
  }

  
  function dotsForVoicing(v) {
    const r = 10;
    const out = [];
    for (let s = 6; s >= 1; s--) {
      const idx = 6 - s;
      const f = v.frets[idx];
      if (typeof f === "number" && f > 0) {
        const x = xForString(s);
        const y = yForFret(f);
        const txt = v.fingers && v.fingers[idx] ? v.fingers[idx] : "";
        out.push({x,y,r,txt});
      }
    }
    return out;
  }
}



    // ===== Controller / UI =====
  const state = {
    voicings: [],
    index: 0,
  };

  // Helper: refresh available chord types
  function refreshChordTypes(root) {
    const typeSel = document.getElementById("chord-type");
    let valid = false;

    [...typeSel.options].forEach(opt => {
      const chordId = `${root}:${opt.value}`;
      if (OPEN_LIB[chordId] || eshapeVoicing(root, opt.value) || ashapeVoicing(root, opt.value)) {
        opt.disabled = false;
        if (opt.value === typeSel.value) valid = true;
      } else {
        opt.disabled = true;
      }
    });

    // fallback if current type is invalid
    if (!valid) {
      typeSel.value = "maj";
    }
  }

  function update() {
    const root = document.getElementById("chord-root").value;
    const type = document.getElementById("chord-type").value;
    const shape = document.getElementById("chord-shape").value;

    refreshChordTypes(root); // 👈 update types for this root

    state.voicings = makeVoicings(root, type, shape);
    state.index = Math.min(state.index, state.voicings.length - 1) || 0;

    const v = state.voicings[state.index];
    const diagram = document.getElementById("chord-diagram");
    renderChord(diagram, v);

    document.getElementById("voicing-label").textContent =
      `Voicing ${state.index + 1}/${state.voicings.length}${v.label ? " • " + v.label : ""}`;

    document.getElementById("chord-hints").textContent =
      "Tip: Use shapes (Open / E-shape / A-shape) and use Next/Prev to browse voicings.";
  }

  function init() {
    const rootSel  = document.getElementById("chord-root");
    const typeSel  = document.getElementById("chord-type");
    const shapeSel = document.getElementById("chord-shape");

    ["change","input"].forEach(ev => {
      rootSel.addEventListener(ev, update);
      typeSel.addEventListener(ev, update);
      shapeSel.addEventListener(ev, update);
    });

    document.getElementById("chord-prev").addEventListener("click", () => {
      state.index = (state.index - 1 + state.voicings.length) % state.voicings.length;
      update();
    });
    document.getElementById("chord-next").addEventListener("click", () => {
      state.index = (state.index + 1) % state.voicings.length;
      update();
    });

    // sensible defaults
    rootSel.value = "A";
    typeSel.value = "maj";
    shapeSel.value = "auto";
    update();
  }

  window.ChordVisualizer = { init };
})();

