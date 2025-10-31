/* -------------------------
   KEY SHUFFLE MODULE
------------------------- */
GuitarApp.shuffle = (function() {
  const keys = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const container = document.getElementById("key-container");
  const shuffleBtn = document.getElementById("shuffle-btn");
  const speechToggle = document.getElementById("speech-toggle");
  const delaySlider = document.getElementById("delay-slider");
  const delayValue = document.getElementById("delay-value");
  const speechVolume = document.getElementById("speech-volume");

  function render(keysToShow) {
    container.innerHTML = "";
    for (let i = 0; i < keysToShow.length; i += 4) {
        const row = document.createElement("div");
        row.classList.add("key-row");
        for (let j = i; j < i + 4 && j < keysToShow.length; j++) {
        const box = document.createElement("div");
        box.classList.add("key-box");
        box.textContent = keysToShow[j];
        row.appendChild(box);
        }
        container.appendChild(row);
    }
    }

    function shuffle() {
    const shuffled = [...keys].sort(() => 0.5 - Math.random());
    render(shuffled);
    keyList = shuffled;

    if (speechToggle.checked && "speechSynthesis" in window) {
        const rows = [];
        for (let i = 0; i < shuffled.length; i += 4) {
        rows.push(shuffled.slice(i, i + 4));
        }
        rows.forEach((row, idx) => {
        const msg = new SpeechSynthesisUtterance(
            `Row ${idx + 1}: ${row.join(", ")}`
        );
        msg.volume = speechVolume.value / 100;
        window.speechSynthesis.speak(msg);
        });
    }
    }


    function init() {
    shuffleBtn.addEventListener("click", shuffle);
    delaySlider.addEventListener("input", () => {
        delayValue.textContent = delaySlider.value;
    });
    shuffle(); // render full grid on load
    }

  return { init, shuffle };
})();
