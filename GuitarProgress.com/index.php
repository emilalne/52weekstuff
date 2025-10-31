<? $includeVer = 136; ?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Key Practice with Guitar!</title>
  <link rel="stylesheet" href="style.css?v=<?=$includeVer?>">
  <link rel="icon" type="image/x-icon" href="favicon.ico?v=1">
</head>
<body>
<div id="floating-timer" class="floating-box">
  <label for="timer-minutes">Timer</label>
  <input type="number" id="timer-minutes" min="1" value="5"> min
  <button id="start-timer">Start</button>
  <span id="timer-display">00:00</span>
</div>
<div id="quick-metronome" class="floating-box">
  <label for="quick-bpm">BPM:</label>
  <input type="range" id="quick-bpm" min="40" max="240" value="120">
  <span id="quick-bpm-display">120</span>
  <button id="quick-metronome-toggle">Start</button>
</div>
<br />
<header id="main-header">
  <div id="site-title">GuitarProgress.com</div>
  <div id="active-timer"></div>
  <button id="header-stop-btn" style="display:none;">⏹ Stop</button>
  <div id="user-panel">
    <span id="user-status"></span>
    <button id="login-btn" style="display:none;">Login</button>
    <button id="logout-btn" style="display:none;">Logout</button>
  </div>
</header>


<!-- <h1>Guitar Practice Tools</h1> -->


<div id="Play">

  <div class="menu-section">
    <div class="menu-header">📋 Planning Modules <span class="menu-count"></span></div>
    <div class="menu-bar">
      <button class="menu-btn" data-target="todo-section">✅ Todo</button>
      <button class="menu-btn" data-target="exercise-section">🏋️ Exercises</button>
      <button class="menu-btn" data-target="routine-section">🐖 Routines</button>
      <button class="menu-btn" data-target="daily-notes">🎶 Daily Notes</button>
      
    </div>
  </div>

  <div class="menu-section">
    <div class="menu-header">🎸 Playing Modules <span class="menu-count"></span></div>
    <div class="menu-bar">
      <button class="menu-btn" data-target="metronome-section">⏱️ Metronome</button>
      <button class="menu-btn" data-target="timer-section">⏳ Timer</button>
      <button class="menu-btn" data-target="tuner-section">🎵 Tuner</button>
      <button class="menu-btn" data-target="rhythm-section">🥁 Rhythm (beta)</button>
      <button class="menu-btn" data-target="shuffle-section">🎲 Key Shuffle</button>
    </div>
  </div>

  <div class="menu-section">
    <div class="menu-header">🎶 Practice Modules <span class="menu-count"></span></div>
    <div class="menu-bar">
      <button class="menu-btn" data-target="quiz-section">🏋️ Fretboard Trainer</button>
      <button class="menu-btn" data-target="fretboard-section">🎶 Scales</button>
      <button class="menu-btn" data-target="trainer-section">🎯 Fretboard Clicker</button>
      <button class="menu-btn" data-target="chord-section">🎸 Chords</button>
    </div>
  </div>

  <div class="menu-section">
    <div class="menu-header">🎼 Theory Modules <span class="menu-count"></span></div>
    <div class="menu-bar">
      <button class="menu-btn" data-target="circle-section">⭕ Circle</button>
      <button class="menu-btn" data-target="ear-training">👂 Ear Training / Intervals</button>
      <button class="menu-btn" data-target="ear-training-section">🎧 Ear Intervals Quiz</button>
      <button class="menu-btn" data-target="progression-section">🎶 Root notes</button>
    </div>
  </div>

</div>
<br />

<section id="daily-notes" class="section full-width">
  <h2>Daily Notes</h2>
  <textarea id="daily-note-text" rows="6" placeholder="Write your practice notes for today..."></textarea>
  <div>
    <button id="toggle-previous-notes">Read previous notes</button>
  </div>
  <div id="previous-notes" style="display:none; margin-top:8px;"></div>
</section>

<div id="rhythm-section" class="section full-width">
  <h2>Rhythm Visualizer</h2>
  <div id="rv-wrap"></div>
  <div class="rv-controls">
    <label>Time Sig:
      <select id="rv-num">
        <option>2</option><option selected>4</option><option>3</option><option>6</option><option>5</option><option>7</option>
      </select>
      /
      <select id="rv-den">
        <option>2</option><option selected>4</option><option>8</option>
      </select>
    </label>

    <label>BPM:
      <input id="rv-bpm" type="number" min="30" max="240" value="100">
    </label>

    <label>Swing:
      <input id="rv-swing" type="range" min="0" max="100" value="0">
      <span id="rv-swing-val">0%</span>
    </label>

    <button id="rv-add-bar">+ Bar</button>
    <button id="rv-clear">Clear</button>
    <button id="rv-play">Play</button>
    <button id="rv-stop" disabled>Stop</button>
    <label><input type="checkbox" id="rv-loop"> Loop</label>
  </div>

  <div class="rv-palette">
    <label>
      Kind:
      <select id="rv-kind">
        <option value="note">Note</option>
        <option value="rest">Rest</option>
      </select>
    </label>
    <label>
      Duration:
      <select id="rv-dur">
        <option value="whole">Whole</option>
        <option value="half">Half</option>
        <option value="quarter" selected>Quarter</option>
        <option value="eighth">Eighth</option>
        <option value="sixteenth">Sixteenth</option>
        <option value="qTrip">Quarter Triplet</option>
        <option value="eTrip">Eighth Triplet</option>
      </select>
    </label>
    <button id="rv-add-item">Add</button>
    <button id="rv-undo">Undo</button>
  </div>

  <div id="rv-bars"></div>
</div>


<!-- ✅ Fretboard full width -->
<div id="fretboard-section" class="section full-width">
  <h2>Scales on the Fretboard</h2>
  <div id="fret-numbers"></div>
  <div id="fretboard"></div>

<div id="scale-selectors">
  <label for="root-select">Root:</label>
  <select id="root-select">
    <option value="A" selected>A</option>
    <option value="A#">A♯ / B♭</option>
    <option value="B">B</option>
    <option value="C">C</option>
    <option value="C#">C♯ / D♭</option>
    <option value="D">D</option>
    <option value="D#">D♯ / E♭</option>
    <option value="E">E</option>
    <option value="F">F</option>
    <option value="F#">F♯ / G♭</option>
    <option value="G">G</option>
    <option value="G#">G♯ / A♭</option>
  </select>

  <label for="scale-type">Scale:</label>
  <select id="scale-type">
    <option value="major" selected>Major (Ionian)</option>
    <option value="minor">Minor (Aeolian)</option>
    <option value="major-pentatonic">Major Pentatonic</option>
    <option value="minor-pentatonic">Minor Pentatonic</option>
    <option value="dorian">Dorian</option>
    <option value="lydian">Lydian</option>
    <option value="mixolydian">Mixolydian</option>
    <option value="phrygian">Phrygian</option>
    <option value="locrian">Locrian</option>
    <option value="blues">Blues</option>
  </select>
</div>
</div>

<div id="trainer-section" class="section">
  <h2>Note Trainer</h2>
  <div id="trainer-fret-numbers"></div>
  <div id="trainer-fretboard"></div>
  <p id="trainer-question"></p>
  <p id="trainer-feedback"></p>
  <button id="trainer-next">Next</button>
</div>

<!-- Two-column container -->
<div class="container">

<div id="progression-section" class="section">
  <h2>Chord Progression Analyzer</h2>
  <textarea id="progressionInput" placeholder="Enter chords: C G Am F"></textarea></br >
  <button id="analyzeProgression">Analyze</button>
  
  <div id="progressionResult"></div>

  <h3>Quiz</h3>
  <button id="startQuiz">Start Quiz</button>
  <div id="quizArea"></div>
</div>

<div id="quiz-section" class="section">
  <h2>Fretboard Training Quiz</h2>

  <div class="quiz-row">
  <label>Input device (interface/amp):</label>
  <select id="quiz-device"></select><br />
  <label>String:</label>
  <select id="quiz-string">
    <option>E</option><option>A</option><option>D</option>
    <option>G</option><option>B</option><option>e</option>
  </select>
  <label>Frets:</label>
  <select id="quiz-frets">
    <option>19</option><option>20</option><option>21</option>
    <option selected>22</option><option>24</option>
  </select><br />
  <label><input type="checkbox" id="quiz-training"> Training mode</label>
  <label><input type="checkbox" id="quiz-mixflat"> Mix sharps/flats</label>
  <br />
  <button id="quiz-start">Start</button>
  <button id="quiz-stop">Stop</button>
</div>

<div id="quiz-target">—</div>
<div id="quiz-history"></div>
<button id="quiz-stats-btn">Show Stats</button>
<div id="quiz-stats"></div>

</div>



    <div id="metronome-section" class="section metronome">
      <h2>Metronome</h2>
      <div id="metronome-visual"></div>
      <div id="bpm-display">BPM: 120</div>
      <input type="range" min="40" max="200" value="120" id="bpm-slider">
      <label for="volume-slider">Volume:</label>
      <input type="range" min="0" max="100" value="50" id="volume-slider">
      <label for="time-signature">Time Signature:</label>
      <select id="time-signature">
        <option value="4">4/4</option>
        <option value="3">3/4</option>
        <option value="5">5/4</option>
        <option value="6">6/8</option>
      </select><br/>
      <label>
        <input type="checkbox" id="use-drum-toggle">
        Use Drum Pattern
      </label><br />
      <button id="metronome-toggle">Start Metronome</button>
    </div>

    <div id="shuffle-section" class="section">
      <h2>Key Shuffle</h2>
      <div id="key-container" class="key-boxes"></div>
      <button id="shuffle-btn">Shuffle Keys</button><br><br>
      <label><input type="checkbox" id="speech-toggle"> Enable Speech</label><br><br>
      <label for="delay-slider">Speech Delay:</label>
      <input type="range" id="delay-slider" min="5" max="20" value="10" step="1">
      <span id="delay-value">10</span> sec<br />
      <label for="speech-volume">Speech Volume:</label>
      <input type="range" id="speech-volume" min="0" max="100" value="100">
    </div>

    <div id="exercise-section" class="section">
      <h2>Exercises</h2>
      <div id="exerciseList"></div>
      <label>
        <input type="checkbox" id="includeInactive" unchecked>
        Include Inactive Exercises
      </label>
      <hr>
      <button id="toggle-exercise-form">➕ Add New Exercise</button>
      <div id="exerciseFormWrapper" style="display:none;">
        <h2>Add New Exercise</h2>
        <form id="exerciseForm" enctype="multipart/form-data">
          <label>
            Name: 
            <input type="text" id="exerciseName" required>
          </label><br>
          <label>
            Description: 
            <textarea id="exerciseDesc"></textarea>
          </label><br>
          <label>
            Images:
            <input type="file" id="exerciseImages" accept="image/*" multiple>
          </label><br>
          <button type="submit">Add Exercise</button>
        </form>
      </div>
    </div>

<div id="circle-section" class="section">
  <h2>Circle of Fifths</h2>
  <svg id="circle-svg" width="500" height="500"></svg>
  <div id="tooltip" style="position:absolute; display:none;"></div>
  
  <button id="circle-quiz-start">Start Quiz</button>

  <div id="circle-quiz-container" class="section" style="display:none;">
    <h2>Circle of Fifths Quiz</h2>
    <div id="circle-flashcard">
      <p id="circle-question"></p>
      <div id="circle-options"></div>
      <p id="circle-feedback"></p>
    </div>
    <button id="circle-next">Next Question</button>
  </div>
</div>


<div id="ear-training" class="section">
  <h2>Ear Training (Intervals)</h2>

  <label for="interval-select">Choose Interval:</label>
  <select id="interval-select"></select>

  <label for="mode-select">Mode:</label>
  <select id="mode-select">
    <option value="asc">Ascending</option>
    <option value="desc">Descending</option>
    <option value="harm">Harmonic</option>
  </select>

  <button id="play-interval">Play</button>
</div>

<div id="tuner-section" class="section">
  <h2>Guitar Tuner</h2>

  <div class="tuner-row">
    <label>Input device:</label>
    <select id="tuner-device"></select>
    <button id="tuner-start">Start</button>
    <button id="tuner-stop" disabled>Stop</button>
  </div>

  <div class="tuner-readout">
    <div>Freq: <span id="tuner-freq">—</span> Hz</div>
    <div>Note: <span id="tuner-note">—</span></div>
    <div>Detune: <span id="tuner-cents">—</span> cents</div>
  </div>

  <div id="tuner-needle-wrap">
  <div class="tuner-bar">
  <div id="tuner-needle"></div>
</div>

</div></div>

  <div id="ear-training-section" class="section">
    <h2>Ear Training: Intervals Quiz</h2>

    <div class="interval-controls">
      <label>Playback:
        <select id="interval-mode">
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
          <option value="harm">Harmonic</option>
        </select>
      </label>
      <button id="play-random-interval">Play Random Interval</button>
    </div>

    <div id="interval-options" class="interval-options"></div>
    <p id="interval-feedback"></p>
  </div>

    <div id="todo-section" class="section">
      <h2>Todo List</h2>
      <input type="text" id="todo-input" placeholder="Add a new task...">
      <button id="todo-add">Add</button>
      <ul id="todo-list"></ul>
      <div id="todo-toggle">
        <label>
          <input type="checkbox" id="toggle-exercise-todos">
          Show Exercise Tasks
        </label>
      </div>
    </div>


<div id="chord-section" class="section">
  <h2>Chord Visualizer</h2>

  <div class="chord-controls">
    <label>Root:
      <select id="chord-root">
        <option>A</option><option>A#</option><option>B</option><option>C</option>
        <option>C#</option><option>D</option><option>D#</option><option>E</option>
        <option>F</option><option>F#</option><option>G</option><option>G#</option>
      </select>
    </label>
    <label>Type:
      <select id="chord-type">
        <option value="maj">Major</option>
        <option value="min">Minor</option>
        <option value="7">7</option>
        <option value="m7">m7</option>
        <option value="maj7">maj7</option>
        <option value="sus2">sus2</option>
        <option value="sus4">sus4</option>
        <option value="add9">add9</option>
      </select>
    </label>
    <label>Shape:
      <select id="chord-shape">
        <option value="auto">Auto</option>
        <option value="open">Open (if available)</option>
        <option value="eshape">E-shape Barre</option>
        <option value="ashape">A-shape Barre</option>
      </select>
    </label>
  </div>

  <div class="chord-voicing-nav">
    <button id="chord-prev">◀ Prev</button>
    <span id="voicing-label">Voicing 1/1</span>
    <button id="chord-next">Next ▶</button>
  </div>

  <div id="chord-diagram"></div>
  <div id="chord-hints"></div>
</div>

<div id="routine-section" class="section">
  <h2>Daily Practice Routines</h2>
  
  <div id="routineForm">
    <input type="text" id="routineName" placeholder="Routine name">
    <button id="routineAdd">➕ Add Routine</button>
  </div>

  <div id="routineList"></div>
</div>

    <div id="timer-section" class="section timer">
      <h2>Timer</h2>
      <div class="stopwatch" id="stopwatch-display">00:00:00</div>
      <div id="countdown-container" class="countdown-container">
        <div class="countdown-circle" id="circle1"></div>
        <div class="countdown-circle" id="circle2"></div>
        <div class="countdown-circle" id="circle3"></div>
      </div>
      <div class="timer-buttons">
        <button class="start" id="start-btn">Start</button>
        <button class="stop" id="stop-btn">Stop</button>
        <button class="reset" id="reset-btn">Reset</button>
        <label>
          <input type="checkbox" id="countdown-toggle" checked>
          Enable Countdown
        </label>
      </div>
      <div class="section laps" id="laps-container">
        <h2>String Laps</h2>
        <div id="lap-entries"></div>
      </div>
    </div>
</div>


<div id="image-modal" class="image-modal">
  <span class="close">&times;</span>
  <img class="modal-content" id="modal-img">
</div>

<!-- Floating Help Button -->
<div id="help-widget">
  <button id="help-btn">?</button>
  <div id="help-box">
    <h3>Help!</h3>
    <p>First off - everything will run smoother if you just register. Just create a simple account with a stupid password. </p>
    <p>Once you're logged in, your settings and data (like exercises, notes and tasks) will be saved across sessions.</p>
    <p>This page is under DEVELOPMENT. Some things can be buggy. Tip: Reload the page once after login :)</p>
    <p>Click on the different modules in the upper menu to open them. You can have multiple modules open at once.</p>
    <p>The <strong>BEST</strong> module is absolutely the Fretboard Trainer Quiz. Connect your guitar to your computer (or phone) and it will play a random note on a random string. You have to find the note on the fretboard as fast as you can. It's super addictive and really helps you learn the fretboard.</p>
    <p>If you put some time into adding Exercises with tasks, you can then create a Routine with those exercises and use the Todo-list to show them, and Timer to time your practice.</p>
    <p>Enjoy!</p>
  </div>
</div>

<img id="ghost1" src="ghost1.gif" class="ghost hidden">
<img id="ghost2" src="ghost2.gif" class="ghost hidden">
<img id="ghost3" src="ghost3.gif" class="ghost hidden">


<script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"></script>
<script src="js/main.js?v=<?=$includeVer?>"></script>

<script src="js/metronome.js?v=<?=$includeVer?>"></script>
<script src="js/auth.js?v=<?=$includeVer?>"></script>
<script src="js/routines.js?v=<?=$includeVer?>"></script>
<script src="js/todo.js?v=<?=$includeVer?>"></script>
<script src="js/shuffle.js?v=<?=$includeVer?>"></script>
<script src="js/exercises.js?v=<?=$includeVer?>"></script>
<script src="js/noteTrainer.js?v=<?=$includeVer?>"></script>
<script src="js/earTraining.js?v=<?=$includeVer?>"></script>
<script src="js/chordVisualizer.js?v=<?=$includeVer?>"></script>
<script src="js/circleOfFifths.js?v=<?=$includeVer?>"></script>
<script src="js/circleQuiz.js?v=<?=$includeVer?>"></script>
<script src="js/rythmVisualizer.js?v=<?=$includeVer?>"></script>
<script src="js/progressionAnalyzer.js?v=<?=$includeVer?>"></script>
<script src="js/tuner.js?v=<?=$includeVer?>"></script>
<script src="js/quiz.js?v=<?=$includeVer?>"></script>
<script src="js/init.js?v=<?=$includeVer?>"></script>




</body>
</html>
