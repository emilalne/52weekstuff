(() => {
  // ---- DOM ----
  const devSel  = document.getElementById("quiz-device");
  const strSel  = document.getElementById("quiz-string");
  const fretSel = document.getElementById("quiz-frets");
  const trainCb = document.getElementById("quiz-training");
  const startBtn= document.getElementById("quiz-start");
  const stopBtn = document.getElementById("quiz-stop");
  const targetEl= document.getElementById("quiz-target");
  const histEl  = document.getElementById("quiz-history");

  // ---- Stats (persistent) ----
  let quizStats = {}; // { string: { noteName: [times...] } }
  window.quizStats = quizStats;

  // ---- Constants ----
  const NOTE_NAMES_SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const NOTE_NAMES_FLAT  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];

  // keep the accidental choice for each note stable
  function classToName(cls, forceFlat = null) {
    let useFlat = forceFlat !== null ? forceFlat : 
      (document.getElementById("quiz-mixflat")?.checked && Math.random() < 0.5);
    const name = useFlat ? NOTE_NAMES_FLAT[cls] : NOTE_NAMES_SHARP[cls];
    return { name, useFlat };
  }

  const STRING_FREQ = {
    "E": 82.4069,  // E2
    "A": 110.000,
    "D": 146.832,
    "G": 196.000,
    "B": 246.942,
    "e": 329.628
  };

  const BUF_LEN = 4096;
  let buffer = new Float32Array(BUF_LEN);

  // ---- State ----
  let audioCtx = null, analyser = null, mediaStream = null, source = null;
  let running = false;
  let selectedDeviceId = null, selectedString = "E", maxFrets = 22, trainingMode = false;

  let pitchClassesOrder = [];
  let curIdx = 0, currentClass = null, occurrences = [], hits = new Set();
  let roundStart = 0, classStart = 0;
  let fastest = null, slowest = null;

  let hzMedianBuf = [], stableSince = 0, lastFret = null, cooldownUntil = 0;

  // ---- Helpers ----
  function secs(ms) {
    return (ms / 1000).toFixed(1) + " s";
  }

  function setTargetLabel() {
    const { name } = classToName(currentClass, currentClassAccidentalFlat);
    const need = occurrences.length;
    const got = hits.size;
    targetEl.textContent =
      `Target: ${name} on ${selectedString} string — ${got}/${need} found${trainingMode ? ` (frets: ${occurrences.join(", ")})` : ""}`;
    targetEl.classList.add("highlight-target"); // pop visually
  }

  function clearTargetHighlight() {
    targetEl.classList.remove("highlight-target");
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function median(arr) {
    const sorted = [...arr].sort((a,b)=>a-b);
    const m = Math.floor(sorted.length/2);
    return sorted.length % 2 ? sorted[m] : 0.5*(sorted[m-1]+sorted[m]);
  }
  function rms(arr) {
    let s=0; for (let v of arr) s+=v*v; return Math.sqrt(s/arr.length);
  }
  function freqOfFret(stringHz, fret) { return stringHz * Math.pow(2, fret/12); }
  function centsDiff(fMeasured, fRef) { return 1200 * Math.log2(fMeasured / fRef); }
  function hzToClass(hz) {
    const A4=440;
    const n = Math.round(12*Math.log2(hz/A4))+57;
    return ((n%12)+12)%12;
  }
  function classOfFret(stringHz,fret){
    const openClass=hzToClass(stringHz);
    return (openClass+(fret%12))%12;
  }
  function buildOccurrences(cls, stringHz, maxFret){
    const out=[]; const openClass=hzToClass(stringHz);
    for(let f=0;f<=maxFret;f++){ if(((openClass+f)%12)===cls) out.push(f); }
    return out;
  }

  function playDing(high=false){
    if(!audioCtx) return;
    const osc=audioCtx.createOscillator();
    const gain=audioCtx.createGain();
    osc.frequency.value=high?880:440;
    gain.gain.value=0.2;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime+0.15);
  }

  function speakOld(name) {
    let spoken = name.replace("#", "-sharp").replace("b", "-flat");
    const utter = new SpeechSynthesisUtterance(spoken);
    utter.lang = 'en-US';
    utter.rate = 1.1;
    utter.pitch=1.0;
    speechSynthesis.speak(utter);
  }

  function speak(name) {
    let spoken = name.replace("#", "-sharp").replace("b", "-flat").toLowerCase();
    let voices = [];
    const utter = new SpeechSynthesisUtterance(spoken);
    const synth = window.speechSynthesis;
    voices = synth.getVoices();
    utter.voice = voices[131];
    utter.lang = 'en-US';
    utter.rate = 1.1;
    utter.pitch=1.0;
    speechSynthesis.speak(utter);
}

  async function saveQuizStats(quizStats) {
    //console.log("Called saveQuizStats:");
    console.log(quizStats);
    console.log("---");
    console.log(JSON.stringify({ key: "quizStats", value: quizStats }));
    console.log("---");
    try {
      await fetch("api/save.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "quizStats", value: quizStats })
      });
    } catch (e) {
      console.error("Save quiz stats failed", e);
    }
  }

  function recordStat(string, noteName, ms) {
    if (!quizStats[string]) quizStats[string] = {};
    if (!quizStats[string][noteName]) quizStats[string][noteName] = [];
    quizStats[string][noteName].push(ms);
     //saveQuizStats();
  }
  
  async function loadQuizStats() {
    try {
      const res = await fetch("api/load.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "quizStats" })
      });
      const data = await res.json();
      if (data.success && data.value) {
        try {
          quizStats = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          window.quizStats = quizStats;
        } catch (e) {
          console.error("Failed to parse quizStats", e);
          quizStats = {};
        }
      }
    } catch (e) {
      console.error("Load quiz stats failed", e);
    }
  }
  // call once at startup
  loadQuizStats();

  
  // ---- Detector (same yin) ----
  function yinDetectHz(buf,sampleRate,minHz,maxHz){
    const size=buf.length;
    const yin=new Float32Array(Math.floor(size/2));
    for(let tau=1;tau<yin.length;tau++){
      let sum=0;
      for(let i=0;i<yin.length;i++){ const d=buf[i]-buf[i+tau]; sum+=d*d; }
      yin[tau]=sum;
    }
    let runningSum=0; yin[0]=1;
    for(let tau=1;tau<yin.length;tau++){ runningSum+=yin[tau]; yin[tau]=yin[tau]*tau/(runningSum||1); }
    const tauMin=Math.max(2,Math.floor(sampleRate/(maxHz||1000)));
    const tauMax=Math.min(yin.length-1,Math.ceil(sampleRate/(minHz||50)));
    const THRESH=0.12;
    let bestTau=-1;
    for(let tau=tauMin;tau<=tauMax;tau++){
      if(yin[tau]<THRESH){ while(tau+1<yin.length&&yin[tau+1]<yin[tau]) tau++; bestTau=tau; break; }
    }
    if(bestTau===-1){ let minVal=Infinity;
      for(let tau=tauMin;tau<=tauMax;tau++){ if(yin[tau]<minVal){minVal=yin[tau]; bestTau=tau;} }
    }
    if(bestTau<=2) return null;
    const x0=(bestTau<1)?bestTau:bestTau-1;
    const x2=(bestTau+1<yin.length)?bestTau+1:bestTau;
    const s0=yin[x0],s1=yin[bestTau],s2=yin[x2];
    const denom=(s0-2*s1+s2);
    const shift=denom!==0?(s0-s2)/(2*denom):0;
    const tauRef=bestTau+shift;
    const hz=sampleRate/tauRef;
    return (!isFinite(hz)||hz<=0)?null:hz;
  }

  // ---- Loop ----
  function loop(){
    if(!running) return;
    analyser.getFloatTimeDomainData(buffer);
    const sampleRate=audioCtx.sampleRate;
    const level=rms(buffer);
    const rmsGate=(selectedString==="E"||selectedString==="A")?0.012:0.008;
    if(level<rmsGate){ stableSince=0; lastFret=null; hzMedianBuf.length=0; requestAnimationFrame(loop); return; }
    const sHz=STRING_FREQ[selectedString];
    const minFreq=freqOfFret(sHz,0)*0.9, maxFreq=freqOfFret(sHz,maxFrets)*1.1;
    const estHzRaw=yinDetectHz(buffer,sampleRate,minFreq,maxFreq);
    if(!estHzRaw){ requestAnimationFrame(loop); return; }
    hzMedianBuf.push(estHzRaw); if(hzMedianBuf.length>5) hzMedianBuf.shift();
    const estHz=median(hzMedianBuf);
    const fretEst=Math.round(12*Math.log2(estHz/sHz));
    if(fretEst<0||fretEst>maxFrets){ requestAnimationFrame(loop); return; }
    const refHz=freqOfFret(sHz,fretEst);
    const diff=centsDiff(estHz,refHz);
    const tol=(estHz<120)?70:45;
    const now=performance.now();
    if(now<cooldownUntil){ requestAnimationFrame(loop); return; }
    const thisClass=classOfFret(sHz,fretEst);
    const okPitch=Math.abs(diff)<=tol;
    const okTarget=(thisClass===currentClass);
    if (okPitch && okTarget) {
        if (!stableSince || fretEst !== lastFret) {
          stableSince = now;
          lastFret = fretEst;
        } else {
          const needStableMs = (estHz < 120) ? 90 : 110;
          if (now - stableSince > needStableMs) {
            if (!hits.has(fretEst)) { // ✅ only new frets
              hits.add(fretEst);
      
              // sound feedback
              playDing(hits.size > 1);
      
              // record stat
              const elapsedMs = now - classStart;
              const { name } = classToName(currentClass, currentClassAccidentalFlat);
              recordStat(selectedString, name, elapsedMs);
            }
      
            cooldownUntil = now + 300;
            stableSince = 0;
            lastFret = null;
      
            if (hits.size >= occurrences.length) {
              
              const ms = performance.now() - classStart;
              if (!fastest || ms < fastest.ms) fastest = { noteClass: currentClass, ms };
              if (!slowest || ms > slowest.ms) slowest = { noteClass: currentClass, ms };

              const { name } = classToName(currentClass, currentClassAccidentalFlat);
              const div = document.createElement("div");
              div.textContent = `✓ ${name} — ${secs(ms)}`;
              histEl.appendChild(div);
              if (!advanceNote()) { // ⬅️ make advanceNote return false when done
                // NEW: record total time for the string round
                if (!quizStats[selectedString]) quizStats[selectedString] = {};
                if (!quizStats[selectedString]._rounds) quizStats[selectedString]._rounds = [];
                const msRound = performance.now() - roundStart;
                quizStats[selectedString]._rounds.push(msRound);
                //saveQuizStats();
                playFinish();
              }
            } else {
              setTargetLabel();
            }
          }
        }
      }
       else { stableSince=0; lastFret=null; }
    requestAnimationFrame(loop);
  }

  function playFinish() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
  
    o.type = "triangle";
    o.frequency.setValueAtTime(880, ctx.currentTime);      // A5
    o.frequency.setValueAtTime(1175, ctx.currentTime + 0.2); // D6
    o.frequency.setValueAtTime(1568, ctx.currentTime + 0.4); // G6
  
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
  
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 1.2);
  }

  
  // ---- Note advancement ----
  let currentClassAccidentalFlat = null; // track chosen accidental style
  function advanceNote(){
    curIdx++;
    clearTargetHighlight();
    if(curIdx>=pitchClassesOrder.length){
      console.log("will call saveQuizStats from advanceNote");
      saveQuizStats(quizStats);
      running=false; stopBtn.disabled=true; startBtn.disabled=false;
      const roundMs=performance.now()-roundStart;
      const fName=fastest?classToName(fastest.noteClass, fastest.noteClassAccidentalFlat):"—";
      const sName=slowest?classToName(slowest.noteClass, slowest.noteClassAccidentalFlat):"—";
      const summary=document.createElement("div");
      summary.innerHTML=`<strong>Round complete</strong><br>
        Total: ${secs(roundMs)}<br>
        Fastest: ${fName.name} ${fastest?secs(fastest.ms):"—"}<br>
        Slowest: ${sName.name} ${slowest?secs(slowest.ms):"—"}`;
      histEl.appendChild(summary);
      targetEl.textContent="—"; teardownAudio(); return false;
      
    }
    currentClass=pitchClassesOrder[curIdx];
    // choose once for this note: flat or sharp
    currentClassAccidentalFlat = document.getElementById("quiz-mixflat")?.checked && Math.random() < 0.5;
    hits.clear(); classStart=performance.now();
    occurrences=buildOccurrences(currentClass,STRING_FREQ[selectedString],maxFrets);
    setTargetLabel();
    const { name } = classToName(currentClass, currentClassAccidentalFlat);
    speak(name);
    return true;
  }

  function secs(ms) {
    return (ms / 1000).toFixed(1) + "s";
  }

  function showQuizStats() {
    const statsEl = document.getElementById("quiz-stats");
    statsEl.innerHTML = "";
  
    if (!quizStats || Object.keys(quizStats).length === 0) {
      statsEl.textContent = "No stats yet.";
      return;
    }
  
    // --- Build per-note averages
    const noteAverages = [];
    const stringTotals = {}; // accumulate per string
  
    for (const string in quizStats) {
      for (const note in quizStats[string]) {
        const times = quizStats[string][note];
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const best = Math.min(...times);
  
        noteAverages.push({ string, note, avg, tries: times.length, best });
  
        if (!stringTotals[string]) stringTotals[string] = [];
        stringTotals[string].push(...times);
      }
    }
  
    // --- Top 5 slowest notes
    noteAverages.sort((a, b) => b.avg - a.avg);
    const filtered = noteAverages.filter(n => n.note !== "_rounds");
    const top5 = filtered.slice(0, 5);
  
    const topDiv = document.createElement("div");
    topDiv.innerHTML = "<h3>Top 5 Slowest Notes</h3>";
    const topTable = document.createElement("table");
    topTable.innerHTML = "<tr><th>String</th><th>Note</th><th>Avg</th><th>Best</th><th>Tries</th></tr>";
  
    for (const n of top5) {
        if(n.note == "_rounds")
            continue;
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${n.string}</td>
                      <td>${n.note}</td>
                      <td>${(n.avg/1000).toFixed(1)}s</td>
                      <td>${(n.best/1000).toFixed(1)}s</td>
                      <td>${n.tries}</td>`;
      topTable.appendChild(tr);
    }
  
    topDiv.appendChild(topTable);
    statsEl.appendChild(topDiv);
  
// --- Slowest string
const stringSummaries = [];

for (const string in quizStats) {
  if (quizStats[string]._rounds && quizStats[string]._rounds.length) {
    const rounds = quizStats[string]._rounds;
    const total = rounds.reduce((a, b) => a + b, 0);
    const avg = total / rounds.length;
    const best = Math.min(...rounds);
    stringSummaries.push({
      string,
      total,
      avg,
      best,
      tries: rounds.length
    });
  }
}

if (stringSummaries.length) {
  stringSummaries.sort((a, b) => b.avg - a.avg);
  const slowest = stringSummaries[0];
  const strDiv = document.createElement("div");
  strDiv.innerHTML = `<h3>Slowest String</h3>
    <p>${slowest.string} — Avg ${(slowest.avg/1000).toFixed(1)}s,
     Best ${(slowest.best/1000).toFixed(1)}s
     over ${slowest.tries} rounds</p>`;
  statsEl.appendChild(strDiv);
}
  
    // --- Clear button
    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear All Stats";
    clearBtn.onclick = () => {
      if (confirm("Are you sure you want to clear all quiz stats?")) {
        console.log("Clearing quizStats");
        quizStats = {};
        saveQuizStats(quizStats);
        statsEl.innerHTML = "<p>All stats cleared.</p>";
      }
    };
    statsEl.appendChild(clearBtn);
  }
  
  
  

  
  // ---- Start/Stop ----
  async function startQuiz(){
    if(running) return; running=true;
    selectedString=strSel.value; maxFrets=parseInt(fretSel.value||"22",10);
    trainingMode=!!trainCb.checked;
    histEl.innerHTML=""; targetEl.textContent="—";
    pitchClassesOrder=[...Array(12).keys()];
    for(let i=pitchClassesOrder.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pitchClassesOrder[i],pitchClassesOrder[j]]=[pitchClassesOrder[j],pitchClassesOrder[i]]; }
    curIdx=-1; fastest=null; slowest=null;
    await setupAudio();

      // reset things
  histEl.innerHTML = "";
  currentRoundStats = [];
  fastest = null;
  slowest = null;
  running = false;

  let count = 3;
  targetEl.textContent = `Starting in ${count}...`;

  const countdown = setInterval(() => {
    count--;
    if (count > 0) {
      targetEl.textContent = `Starting in ${count}...`;
    } else {
      clearInterval(countdown);
      targetEl.textContent = "Go!";
      setTimeout(() => {
        running = true;
        classStart = performance.now();
        roundStart=performance.now(); advanceNote();
        startBtn.disabled=true; stopBtn.disabled=false;
        requestAnimationFrame(loop);
      }, 300); // short pause so "Go!" is visible
    }
  }, 1000);
  }



  function stopQuiz(){ if(!running) return; running=false; startBtn.disabled=false; stopBtn.disabled=true; targetEl.textContent="—"; teardownAudio(); }

  async function setupAudio(){
    if(devSel.options.length===0){
      const devices=await navigator.mediaDevices.enumerateDevices();
      devices.filter(d=>d.kind==="audioinput").forEach(d=>{ const o=document.createElement("option"); o.value=d.deviceId; o.textContent=d.label||`Input ${devSel.length+1}`; devSel.appendChild(o); });
    }
    selectedDeviceId=devSel.value||undefined;
    mediaStream=await navigator.mediaDevices.getUserMedia({audio:{deviceId:selectedDeviceId?{exact:selectedDeviceId}:undefined,channelCount:1,sampleRate:44100,echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    source=audioCtx.createMediaStreamSource(mediaStream);
    analyser=audioCtx.createAnalyser(); analyser.fftSize=BUF_LEN*2; analyser.smoothingTimeConstant=0.0;
    source.connect(analyser);
  }
  function teardownAudio(){ if(source){try{source.disconnect();}catch(e){}} if(analyser){try{analyser.disconnect();}catch(e){}} if(audioCtx){try{audioCtx.close();}catch(e){}} if(mediaStream){mediaStream.getTracks().forEach(t=>t.stop());} source=analyser=audioCtx=mediaStream=null; stableSince=0; lastFret=null; cooldownUntil=0; hzMedianBuf.length=0; }

  // ---- Events ----
  startBtn.addEventListener("click", startQuiz);
  stopBtn.addEventListener("click", stopQuiz);

  const statsBtn = document.getElementById("quiz-stats-btn");
  if (statsBtn) statsBtn.addEventListener("click", showQuizStats);
})();

