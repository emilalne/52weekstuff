(function() {

const circleOfFifths = [
  { major: "C",  minor: "A",  sharps: 0, flats: 0 },
  { major: "G",  minor: "E",  sharps: 1, flats: 0 },
  { major: "D",  minor: "B",  sharps: 2, flats: 0 },
  { major: "A",  minor: "F#", sharps: 3, flats: 0 },
  { major: "E",  minor: "C#", sharps: 4, flats: 0 },
  { major: "B",  minor: "G#", sharps: 5, flats: 0, enharmonic: "Cb major (7 flats)"},
  { major: "F#", minor: "D#", sharps: 6, flats: 0, enharmonic: "Gb major (6 flats)" },
  { major: "Db", minor: "Bb", sharps: 0, flats: 5, enharmonic: "C# major (7 sharps)" },
  { major: "Ab", minor: "F",  sharps: 0, flats: 4 },
  { major: "Eb", minor: "C",  sharps: 0, flats: 3 },
  { major: "Bb", minor: "G",  sharps: 0, flats: 2 },
  { major: "F",  minor: "D",  sharps: 0, flats: 1 }
];



const tooltip = document.getElementById("tooltip");

  const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

  const svg = document.getElementById("circle-svg");
  const cx = 250, cy = 250, rMajor = 200, rMinor = 160, rSig = 220;

  const centerImg = document.createElementNS("http://www.w3.org/2000/svg", "image");
  centerImg.setAttribute("href", "leave.png");
  centerImg.setAttribute("x", cx - 80); // adjust to center
  centerImg.setAttribute("y", cy - 80);
  centerImg.setAttribute("width", 160);
  centerImg.setAttribute("height", 160);
  svg.appendChild(centerImg);

  circleOfFifths.forEach((entry, i) => {
    const angle = (i / 12) * 2 * Math.PI - Math.PI/2;

    // Major
    const xMaj = cx + rMajor * Math.cos(angle);
    const yMaj = cy + rMajor * Math.sin(angle);
    const majText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    majText.setAttribute("x", xMaj);
    majText.setAttribute("y", yMaj);
    majText.setAttribute("text-anchor", "middle");
    majText.setAttribute("dominant-baseline", "middle");
    majText.textContent = entry.major;
    majText.classList.add("circle-key");

    if (entry.sharps > 0) majText.classList.add("sharp");
    if (entry.flats > 0) majText.classList.add("flat");

    // Minor
    const xMin = cx + rMinor * Math.cos(angle);
    const yMin = cy + rMinor * Math.sin(angle);
    const minText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    minText.setAttribute("x", xMin);
    minText.setAttribute("y", yMin);
    minText.setAttribute("text-anchor", "middle");
    minText.setAttribute("dominant-baseline", "middle");
    minText.textContent = entry.minor;
    minText.classList.add("circle-minor");

    // ♯♭ Key Signature symbols
    if (entry.sharps > 0 || entry.flats > 0) {
      const xSig = cx + rSig * Math.cos(angle);
      const ySig = cy + rSig * Math.sin(angle);
      const sigText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      sigText.setAttribute("x", xSig);
      sigText.setAttribute("y", ySig);
      sigText.setAttribute("text-anchor", "middle");
      sigText.setAttribute("dominant-baseline", "middle");
      sigText.classList.add("circle-sig");

      if (entry.sharps > 0) {
        sigText.textContent = "♯".repeat(entry.sharps);
      } else if (entry.flats > 0) {
        sigText.textContent = "♭".repeat(entry.flats);
      }

      svg.appendChild(sigText);
    }

    [majText, minText].forEach(el => {
    attachTooltip(el, entry); // adds tooltip with info
    });

    svg.appendChild(majText);
    svg.appendChild(minText);
  });

  

function attachTooltip(el, entry) {
  el.addEventListener("mousemove", e => {
    const scale = buildMajorScale(entry.major);
    const chords = buildChords(scale);

    tooltip.style.display = "block";
    tooltip.style.left = (e.pageX + 12) + "px";
    tooltip.style.top = (e.pageY + 12) + "px";
    let info = "";
    if (entry.enharmonic) {
        info += `<br><em>Enharmonic equivalent: ${entry.enharmonic}</em>`;
    }

    tooltip.innerHTML = `
      <strong>${entry.major} Major</strong><br>
      Relative minor: ${entry.minor}<br>
      Key signature: ${entry.sharps ? "♯ x" + entry.sharps : entry.flats ? "♭ x" + entry.flats : "none"}<br>
      <em>Diatonic chords:</em><br>
      ${chords.join(", ")} ${info}
    `;

  });
  el.addEventListener("mouseleave", () => {
    tooltip.style.display = "none";
  });
}

function showTooltip(el, entry) {
  const sharps = entry.sharps ? `${entry.sharps} sharps` : "";
  const flats  = entry.flats ? `${entry.flats} flats` : "";
  const scale = buildMajorScale(entry.major);
  const chords = buildChords(scale);
  const keySig = sharps || flats || "none";

  let info = `<strong>${entry.major} major</strong><br>
              Relative minor: ${entry.minor}<br>
              Key signature: ${keySig}
              Chords: ${chords.join(", ")}`;

  if (entry.enharmonic) {
    info += `<br><em>Enharmonic equivalent: ${entry.enharmonic}</em>`;
  }

  tooltip.innerHTML = info;
  tooltip.style.display = "block";
}





function buildMajorScale(root) {
  const steps = [2,2,1,2,2,2,1]; // W W H W W W H
  const rootIdx = NOTES.indexOf(root);
  const scale = [root];
  let idx = rootIdx;
  for (let step of steps) {
    idx = (idx + step) % 12;
    scale.push(NOTES[idx]);
  }
  return scale.slice(0,7); // 7 notes only
}

function buildChords(scale) {
  return [
    scale[0],                // I
    scale[1]+"m",            // ii
    scale[2]+"m",            // iii
    scale[3],                // IV
    scale[4],                // V
    scale[5]+"m",            // vi
    scale[6]+"dim"           // vii°
  ];
}


  function showInfo(entry) {
    const sharps = entry.sharps ? `♯ x${entry.sharps}` : "";
    const flats  = entry.flats ? `♭ x${entry.flats}` : "";
    const info = `
      <strong>${entry.major} major</strong><br>
      Relative minor: ${entry.minor}<br>
      Key signature: ${sharps || flats || "none"}<br>
      Chords: I ii iii IV V vi vii°
    `;
    document.getElementById("circle-info").innerHTML = info;
  }
})();
