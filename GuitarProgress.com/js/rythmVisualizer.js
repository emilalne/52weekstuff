(function(){
  // ----- timing: 24 slots per quarter (handles triplets & 16ths cleanly)
  const PPQ = 24; // “internal slots” per quarter note

  const SYMBOLS = {
    note: {
      96: "𝅝",  // whole
      48: "𝅗𝅥",  // half
      24: "♩",  // quarter
      12: "♪",  // eighth
      6:  "𝅘𝅥𝅯"   // sixteenth
    },
    rest: {
      96: "𝄻",  // whole rest
      48: "𝄼",  // half rest
      24: "𝄽",  // quarter rest
      12: "𝄾",  // eighth rest
      6:  "𝄿"   // sixteenth rest
    }
  };

  
  // durations in slots-per-quarter
  const DUR_SLOTS = {
    whole:  PPQ * 4,
    half:   PPQ * 2,
    quarter:PPQ * 1,
    eighth: PPQ / 2,
    sixteenth: PPQ / 4,
    qTrip:  (PPQ * 4) / 3, // quarter-triplet across a whole note (3 per whole) -> each = 32 slots? Nope—define per quarter:
                           // we want a quarter-note *triplet unit* across two quarters (common). Simpler: per quarter triplet = PPQ * (2/3).
                           // For clarity in this MVP, we'll use 16 slots per quarter triplet = (PPQ * 2/3).
    eTrip:  (PPQ * 1) / 3
  };
  // fix fractional to integers
  DUR_SLOTS.qTrip = Math.round(PPQ * 2/3); // quarter-triplet within a single quarter
  DUR_SLOTS.eTrip = Math.round(PPQ / 3);   // eighth-triplet within a single quarter


// --- barSlots no longer depends on S
function barSlots(num, den) {
  const quarters = num * (4/den);
  return Math.round(quarters * PPQ);
}

// --- factory for new bar
function newBar(num, den) {
  return { items: [], totalSlots: barSlots(num, den) };
}

// --- state
const S = {
  num: 4, den: 4, bpm: 100, swing: 0, loop: false,
  bars: [], 
  playing: false,
  raf: null,
  startWall: 0,
  totalSecs: 0
};

// initialize after S is declared
S.bars.push(newBar(S.num, S.den));

  function usedSlots(bar){
    return bar.items.reduce((a,b)=>a+b.lenSlots,0);
  }

  // --- DOM
  const barsEl  = () => document.getElementById("rv-bars");
  const numEl   = () => document.getElementById("rv-num");
  const denEl   = () => document.getElementById("rv-den");
  const bpmEl   = () => document.getElementById("rv-bpm");
  const swingEl = () => document.getElementById("rv-swing");
  const swingVal= () => document.getElementById("rv-swing-val");
  const kindEl  = () => document.getElementById("rv-kind");
  const durEl   = () => document.getElementById("rv-dur");
  const playBtn = () => document.getElementById("rv-play");
  const stopBtn = () => document.getElementById("rv-stop");
  const loopEl  = () => document.getElementById("rv-loop");

  // --- audio
  let synth, clickHi, clickLow;
  function ensureAudio(){
    if (synth) return;
    synth = new Tone.Synth({ oscillator:{ type:"triangle" } }).toDestination();
    clickHi = new Tone.MetalSynth({ resonance:800, envelope:{ attack:0.001, decay:0.05, release:0.01 }}).toDestination();
    clickLow= new Tone.NoiseSynth({ envelope:{ attack:0.001, decay:0.03, release:0.01 } }).toDestination();
  }

  // --- rendering
  function render() {
    const wrap = document.getElementById("rv-wrap");
    if (!wrap) return;
    wrap.innerHTML = "";
  
    S.bars.forEach((bar, barIdx) => {
      const barEl = document.createElement("div");
      barEl.className = "rv-bar";
  
      // Left barline
      const barlineLeft = document.createElement("div");
      barlineLeft.className = "rv-barline";
      barEl.appendChild(barlineLeft);
  
      // Staff
      const staff = document.createElement("div");
      staff.className = "rv-staff";
      barEl.appendChild(staff);
  
      // Add notes inside the staff (instead of directly on barEl)
      bar.items.forEach(note => {
        const noteEl = document.createElement("div");
        noteEl.className = "rv-note";
        noteEl.textContent = SYMBOLS[note.kind][note.lenSlots] || "?";
        staff.appendChild(noteEl);
      });
  
      // Right barline
      const barlineRight = document.createElement("div");
      barlineRight.className = "rv-barline";
      barEl.appendChild(barlineRight);
  
      wrap.appendChild(barEl);
    });
  }
  



  function humanDur(lenSlots, num, den){
    // map back to best-known name
    const q = PPQ;
    recalcBarLengthsForNewSignature(num, den);
    const map = [
      {n:"Whole", v: q*4},
      {n:"Half", v: q*2},
      {n:"Quarter", v: q*1},
      {n:"Eighth", v: q/2},
      {n:"Sixteenth", v: q/4},
      {n:"Quarter Triplet", v: Math.round(q*2/3)},
      {n:"Eighth Triplet", v: Math.round(q/3)},
    ].sort((a,b)=>Math.abs(a.v-lenSlots)-Math.abs(b.v-lenSlots));
    return map[0].n;
  }

  // --- add / undo
  function addItem(){
    const bar = S.bars[S.bars.length-1];
    const kind = kindEl().value;
    const durKey = durEl().value;
    const len = DUR_SLOTS[durKey];
    if (!len) return;
    const remain = bar.totalSlots - usedSlots(bar);
    if (len > remain){
      // auto new bar if we have empty room in a fresh bar
      if (remain === 0){
        S.bars.push(newBar(S.num, S.den));
        return addItem();
      }
      return; // don’t overflow bar
    }
    bar.items.push({ kind, lenSlots: len });
    render();
  }

  function recalcBarLengthsForNewSignature(num, den) {
    S.num = num;
    S.den = den;
    for (const b of S.bars) {
      b.totalSlots = barSlots(num, den);
    }
  }

  function undo(){
    const bar = S.bars[S.bars.length-1];
    if (bar.items.length){
      bar.items.pop();
    } else if (S.bars.length > 1){
      S.bars.pop();
    }
    render();
  }

  // --- transport / scheduling
  function scheduleAndPlay(){
    ensureAudio();

    Tone.Transport.stop();
    Tone.Transport.cancel(0);

    Tone.Transport.bpm.value = S.bpm;
    Tone.Transport.swing = S.swing; // 0..1
    Tone.Transport.swingSubdivision = "8n";

    const secPerQuarter = 60 / S.bpm;
    const secPerSlot = secPerQuarter / PPQ;

    let acc = 0; // seconds
    const beatSpanSlots = PPQ; // quarter beat
    let nextBeatAt = 0;

    S.bars.forEach((bar, bi)=>{
      let slot = 0;
      const total = bar.totalSlots;

      // schedule click track (quarters)
      for (let s=0; s<=total; s+=beatSpanSlots){
        const isDownbeat = (s === 0);
        Tone.Transport.schedule(time=>{
          if (isDownbeat) clickHi.triggerAttackRelease("16n", time);
          else clickLow.triggerAttackRelease("16n", time);
        }, acc + s*secPerSlot);
      }

      // schedule notes
      bar.items.forEach(it=>{
        if (it.kind === "note"){
          Tone.Transport.schedule(time=>{
            synth.triggerAttackRelease("C4", it.lenSlots*secPerSlot, time);
          }, acc + slot*secPerSlot);
        }
        slot += it.lenSlots;
      });

      acc += total * secPerSlot;
    });

    // cursor animation
    const barsEls = [...document.querySelectorAll(".rv-bar")];
    const totalSecs = acc;
    S.totalSecs = totalSecs;
    const start = performance.now();
    S.startWall = start;

    barsEls.forEach(el=>{
      const c = el.querySelector(".rv-cursor");
      if (c) c.style.left = "0%";
    });

    function tick(){
      if (!S.playing) return;
      const elapsed = (performance.now() - S.startWall)/1000;
      let t = elapsed % totalSecs;
      const secPerBar = S.bars[0].totalSlots * secPerSlot; // assume same TS across bars in MVP
      barsEls.forEach((el,i)=>{
        const c = el.querySelector(".rv-cursor");
        const startS = i*secPerBar;
        const endS = startS + secPerBar;
        let pct = 0;
        if (t >= startS && t <= endS){
          pct = ((t - startS) / secPerBar) * 100;
        } else if (t > endS){
          pct = 100;
        } else {
          pct = 0;
        }
        c.style.left = pct + "%";
      });
      S.raf = requestAnimationFrame(tick);
    }

    Tone.Transport.start("+0.05");
    S.playing = true;
    playBtn().disabled = true;
    stopBtn().disabled = false;
    S.raf = requestAnimationFrame(tick);

    // stop when done if not looping
    if (!S.loop){
      Tone.Transport.scheduleOnce(()=>{
        stop();
      }, totalSecs + 0.06);
    }
  }

  function stop(){
    S.playing = false;
    cancelAnimationFrame(S.raf);
    Tone.Transport.stop();
    playBtn().disabled = false;
    stopBtn().disabled = true;
  }

  // --- wire UI
  function bind(){
    document.getElementById("rv-add-bar").addEventListener("click", ()=>{
      S.bars.push(newBar(S.num, S.den));
      render();
    });
    document.getElementById("rv-clear").addEventListener("click", ()=>{
      S.bars = [newBar(S.num, S.den)];
      render();
    });
    document.getElementById("rv-add-item").addEventListener("click", addItem);
    document.getElementById("rv-undo").addEventListener("click", undo);
    playBtn().addEventListener("click", scheduleAndPlay);
    stopBtn().addEventListener("click", stop);

    numEl().addEventListener("change", ()=>{
      S.num = parseInt(numEl().value,10);
      S.bars.forEach(b=>b.totalSlots = barSlots());
      render();
    });
    denEl().addEventListener("change", ()=>{
      S.den = parseInt(denEl().value,10);
      S.bars.forEach(b=>b.totalSlots = barSlots());
      render();
    });
    bpmEl().addEventListener("input", ()=>{ S.bpm = parseInt(bpmEl().value,10)||100; });
    swingEl().addEventListener("input", ()=>{
      const v = parseInt(swingEl().value,10)||0;
      swingVal().textContent = v + "%";
      S.swing = v/100;
    });
    loopEl().addEventListener("change", ()=>{ S.loop = loopEl().checked; });
  }

  function init(){
    // defaults
    S.num = 4; S.den = 4; S.bpm = 100; S.swing = 0; S.loop = false;
    render();
    bind();
  }

  window.RhythmVisualizer = { init };
})();
