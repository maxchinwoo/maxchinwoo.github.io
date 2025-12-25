import { sentences, keyboardLayouts, jamoToKeyCode } from './data.js';

// DOM Elements
const timeDisplay = document.getElementById('time-display');
const cpmDisplay = document.getElementById('cpm-display');
const accuracyDisplay = document.getElementById('accuracy-display');
const currentTextEl = document.getElementById('current-text');
const nextSentencesEl = document.getElementById('next-sentences');
const gameInput = document.getElementById('game-input');
const keyboardContainer = document.getElementById('virtual-keyboard');
const resultModal = document.getElementById('result-modal');
const finalCpm = document.getElementById('final-cpm');
const finalAcc = document.getElementById('final-acc');
const restartBtn = document.getElementById('restart-btn');
const langBtns = document.querySelectorAll('.lang-btn');

// State
let state = {
    lang: 'ko',
    isPlaying: false,
    timeLeft: 60,
    timer: null,
    currentSentenceIndex: 0,
    currentSentence: '',
    nextSentenceQueue: [],

    // Stats
    totalKeystrokes: 0,
    correctChars: 0,
    errors: 0,
    startTime: 0
};

// Initialization
function init() {
    renderKeyboard(state.lang);
    resetGame();

    // Event Listeners
    gameInput.addEventListener('input', handleInput);
    gameInput.addEventListener('keydown', handleKeydown);
    gameInput.addEventListener('keyup', handleKeyup);

    restartBtn.addEventListener('click', () => {
        resultModal.classList.add('hidden');
        resetGame();
        gameInput.focus();
    });

    langBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newLang = e.target.dataset.lang;
            if (state.lang !== newLang) {
                state.lang = newLang;
                langBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                renderKeyboard(newLang);
                resetGame();
                gameInput.focus();
            }
        });
    });

    document.addEventListener('click', () => {
        if (state.isPlaying && !resultModal.classList.contains('hidden') === false) {
            gameInput.focus();
        }
    });
}

function renderKeyboard(lang) {
    keyboardContainer.innerHTML = '';
    const layout = keyboardLayouts[lang];

    Object.keys(layout).forEach(rowKey => {
        const rowData = layout[rowKey];
        const rowDiv = document.createElement('div');
        rowDiv.className = 'key-row';

        rowData.forEach(key => {
            const keyDiv = document.createElement('div');
            keyDiv.className = 'key';
            keyDiv.dataset.code = key.code;
            keyDiv.textContent = key.label;
            rowDiv.appendChild(keyDiv);
        });

        keyboardContainer.appendChild(rowDiv);
    });
}

function resetGame() {
    state.isPlaying = false;
    state.timeLeft = 60;
    state.totalKeystrokes = 0;
    state.correctChars = 0;
    state.errors = 0;
    state.currentSentenceIndex = 0;
    clearInterval(state.timer);

    timeDisplay.textContent = state.timeLeft;
    cpmDisplay.textContent = '0';
    accuracyDisplay.textContent = '100%';

    gameInput.value = '';

    // Shuffle and load sentences
    const list = [...sentences[state.lang]];
    list.sort(() => Math.random() - 0.5);
    state.nextSentenceQueue = list;

    loadNextSentence();
}

function loadNextSentence() {
    if (state.nextSentenceQueue.length === 0) {
        // Reload if empty
        const list = [...sentences[state.lang]];
        list.sort(() => Math.random() - 0.5);
        state.nextSentenceQueue = list;
    }

    state.currentSentence = state.nextSentenceQueue.shift();
    currentTextEl.textContent = state.currentSentence;

    // Render next 3 lines
    nextSentencesEl.innerHTML = '';
    state.nextSentenceQueue.slice(0, 3).forEach(s => {
        const div = document.createElement('div');
        div.className = 'next-item';
        div.textContent = s;
        nextSentencesEl.appendChild(div);
    });

    gameInput.value = '';
    updateKeyGuide();
}

function startGame() {
    if (state.isPlaying) return;
    state.isPlaying = true;
    state.startTime = Date.now();

    state.timer = setInterval(() => {
        state.timeLeft--;
        timeDisplay.textContent = state.timeLeft;

        updateStats();

        if (state.timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

// -- Hangul Auto-Decomposition Logic for Guide --

// Standard 2-Set (Doobul-sik) Mapping with Shift Support
// String = Single Key
// Object {c: 'Key', s: true} = Shift + Key
const CHO_KEYS = [
    'KeyR', // ㄱ
    { c: 'KeyR', s: true }, // ㄲ (Shift+ㄱ)
    'KeyS', // ㄴ
    'KeyE', // ㄷ
    { c: 'KeyE', s: true }, // ㄸ
    'KeyF', // ㄹ
    'KeyA', // ㅁ
    'KeyQ', // ㅂ
    { c: 'KeyQ', s: true }, // ㅃ
    'KeyT', // ㅅ
    { c: 'KeyT', s: true }, // ㅆ
    'KeyD', // ㅇ
    'KeyW', // ㅈ
    { c: 'KeyW', s: true }, // ㅉ
    'KeyC', // ㅊ
    'KeyZ', // ㅋ
    'KeyX', // ㅌ
    'KeyV', // ㅍ
    'KeyG'  // ㅎ
];

const JUNG_KEYS = [
    'KeyK', // ㅏ (0)
    'KeyO', // ㅐ (1)
    'KeyI', // ㅑ (2)
    { c: 'KeyO', s: true }, // ㅒ (3) (Shift+ㅐ)
    'KeyJ', // ㅓ (4)
    'KeyP', // ㅔ (5)
    'KeyU', // ㅕ (6)
    { c: 'KeyP', s: true }, // ㅖ (7) (Shift+ㅔ)
    'KeyH', // ㅗ (8)
    ['KeyH', 'KeyK'], // ㅘ (9) (ㅗ + ㅏ)
    ['KeyH', 'KeyO'], // ㅙ (10) (ㅗ + ㅐ) - Standard: ㅗ + ㅐ
    ['KeyH', 'KeyL'], // ㅚ (11) (ㅗ + ㅣ)
    'KeyY', // ㅛ (12)
    'KeyN', // ㅜ (13)
    ['KeyN', 'KeyJ'], // ㅝ (14)
    ['KeyN', 'KeyP'], // ㅞ (15)
    ['KeyN', 'KeyL'], // ㅟ (16) (ㅜ + ㅣ)
    'KeyB', // ㅠ (17)
    'KeyM', // ㅡ (18)
    ['KeyM', 'KeyL'], // ㅢ (19)
    'KeyL'  // ㅣ (20)
];

const JONG_KEYS = [
    '', // None
    'KeyR', // ㄱ
    { c: 'KeyR', s: true }, // ㄲ
    ['KeyR', 'KeyT'], // ㄳ (ㄱ + ㅅ)
    'KeyS', // ㄴ
    ['KeyS', 'KeyW'], // ㄵ
    ['KeyS', 'KeyG'], // ㄶ
    'KeyE', // ㄷ
    'KeyF', // ㄹ
    ['KeyF', 'KeyR'], // ㄺ
    ['KeyF', 'KeyA'], // ㄻ
    ['KeyF', 'KeyQ'], // ㄼ
    ['KeyF', 'KeyT'], // ㄽ
    ['KeyF', 'KeyX'], // ㄾ
    ['KeyF', 'KeyV'], // ㄿ
    ['KeyF', 'KeyG'], // ㅀ
    'KeyA', // ㅁ
    'KeyQ', // ㅂ
    ['KeyQ', 'KeyT'], // ㅄ
    'KeyT', // ㅅ
    { c: 'KeyT', s: true }, // ㅆ
    'KeyD', // ㅇ
    'KeyW', // ㅈ
    'KeyC', // ㅊ
    'KeyZ', // ㅋ
    'KeyX', // ㅌ
    'KeyV', // ㅍ
    'KeyG'  // ㅎ
];

function decomposeHangul(char) {
    if (!char) return null;
    const code = char.charCodeAt(0);

    // Case 1: Hangul Syllable (AC00 - D7A3)
    if (code >= 0xAC00 && code <= 0xD7A3) {
        const offset = code - 0xAC00;
        const jong = offset % 28;
        const jung = Math.floor((offset % 588) / 28);
        const cho = Math.floor(offset / 588);
        return { cho, jung, jong };
    }

    // Case 2: Standalone Jamo (3131 - 318E) compatibility Jamos
    const jamoToCho = {
        0x3131: 0, 0x3132: 1, 0x3134: 2, 0x3137: 3, 0x3138: 4, 0x3139: 5, 0x3141: 6,
        0x3142: 7, 0x3143: 8, 0x3145: 9, 0x3146: 10, 0x3147: 11, 0x3148: 12, 0x3149: 13,
        0x314A: 14, 0x314B: 15, 0x314C: 16, 0x314D: 17, 0x314E: 18
    };

    if (jamoToCho[code] !== undefined) {
        return { cho: jamoToCho[code], jung: -1, jong: -1 };
    }

    const jamoToJung = {
        0x314F: 0, 0x3150: 1, 0x3151: 2, 0x3152: 3, 0x3153: 4, 0x3154: 5, 0x3155: 6, 0x3156: 7,
        0x3157: 8, 0x3158: 9, 0x3159: 10, 0x315A: 11, 0x315B: 12, 0x315C: 13, 0x315D: 14,
        0x315E: 15, 0x315F: 16, 0x3160: 17, 0x3161: 18, 0x3162: 19, 0x3163: 20
    };

    if (jamoToJung[code] !== undefined) {
        return { cho: -1, jung: jamoToJung[code], jong: -1 };
    }

    return null;
}

function resolveKeys(def) {
    if (!def) return [];
    if (typeof def === 'string') return [def];
    if (Array.isArray(def)) return def; // Sequence of keys.
    if (def.c) {
        return ['ShiftLeft', def.c];
    }
    return [];
}

function updateStats() {
    // User requested: "Don't change if I don't type. Just show total successful counts."
    cpmDisplay.textContent = state.correctChars;

    const total = state.totalKeystrokes;
    const acc = total === 0 ? 100 : Math.max(0, 100 - (state.errors * 2));

    accuracyDisplay.textContent = Math.floor(acc) + '%';
}

function handleInput(e) {
    if (!state.isPlaying && e.data) {
        startGame();
    }

    const val = gameInput.value;
    const target = state.currentSentence;
    // Debounce guide update? No, immediate is good.
    updateKeyGuide();

    if (val === target) {
        commitSentenceScore(val);
        loadNextSentence();
    }
}

function handleKeydown(e) {
    const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
    if (keyEl) {
        keyEl.classList.add('pressed');
    }

    if (state.isPlaying) {
        if (e.key.length === 1 || e.code === 'Space' || e.code === 'Enter') {
            state.totalKeystrokes++;
        }

        if (e.key === 'Enter') {
            const val = gameInput.value;
            commitSentenceScore(val);
            loadNextSentence();
        }
    }
}

function handleKeyup(e) {
    const keyEl = document.querySelector(`.key[data-code="${e.code}"]`);
    if (keyEl) {
        keyEl.classList.remove('pressed');
    }
}

function commitSentenceScore(inputVal) {
    const target = state.currentSentence;
    let correct = 0;
    let err = 0;

    const len = Math.min(inputVal.length, target.length);
    for (let i = 0; i < len; i++) {
        if (inputVal[i] === target[i]) {
            correct++;
        } else {
            err++;
        }
    }

    state.correctChars += correct;
    state.errors += err;
    updateStats();
}

function updateKeyGuide() {
    document.querySelectorAll('.key.guide').forEach(el => el.classList.remove('guide'));

    const inputVal = gameInput.value;
    const target = state.currentSentence;
    if (inputVal === target) return;

    let idx = 0;
    while (idx < inputVal.length && idx < target.length && inputVal[idx] === target[idx]) {
        idx++;
    }

    if (idx >= target.length) return;

    const tChar = target[idx];
    const iChar = inputVal[idx];

    let rawKeys = null;

    if (state.lang === 'en') {
        const lower = tChar.toLowerCase();
        const code = jamoToKeyCode[lower];
        if (code) {
            rawKeys = code;
            if (tChar !== lower) {
                rawKeys = { c: code, s: true };
            }
        } else {
            rawKeys = 'Space';
        }
    } else {
        // Korean
        const tDecom = decomposeHangul(tChar);
        // If iChar exists, it might be a Jamo (e.g. initial typed) or a Syllable.

        if (!iChar) {
            // Case 1: Pure start of char
            if (tDecom) {
                // Hint Initial
                rawKeys = CHO_KEYS[tDecom.cho];
            } else {
                // Space or Symbol
                const key = jamoToKeyCode[tChar] || 'Space';
                rawKeys = key;
            }
        } else {
            // Case 2: Composition / Mismatch
            const iDecom = decomposeHangul(iChar);

            if (tDecom && iDecom) {
                // Check Initials
                if (iDecom.cho !== tDecom.cho) {
                    // If iDecom has NO Cho (Jung only, e.g. typed 'ㅏ' first), 
                    // iDecom.cho is -1.
                    // tDecom.cho is valid (e.g. 'ㅇ').
                    // We should hint tDecom.cho.
                    // If both have Cho but differ, hint Correct Cho.
                    rawKeys = CHO_KEYS[tDecom.cho];
                } else if (tDecom.jung !== iDecom.jung) {
                    // Initials match.
                    // Check complex vowel logic.
                    const tVowelDef = JUNG_KEYS[tDecom.jung];
                    const iVowelDef = JUNG_KEYS[iDecom.jung];

                    if (!iVowelDef) {
                        // Input has no vowel yet (only initial typed) -> Hint first part of Target Vowel
                        const tL = Array.isArray(tVowelDef) ? tVowelDef : [tVowelDef];
                        rawKeys = tL[0];
                    } else {
                        // Input has vowel. 
                        const toList = (x) => Array.isArray(x) ? x : [x];
                        const tL = toList(tVowelDef);
                        const iL = toList(iVowelDef);
                        const getBase = (k) => (typeof k === 'object' ? k.c : k);

                        // If iL matches prefix of tL
                        if (tL.length > 1 && iL.length === 1 && getBase(tL[0]) === getBase(iL[0])) {
                            rawKeys = tL[1];
                        } else {
                            rawKeys = tL[0]; // Mismatch or done
                        }
                    }
                } else if (tDecom.jong !== iDecom.jong) {
                    // Cho & Jung match
                    const tJongDef = JONG_KEYS[tDecom.jong];

                    if (iDecom.jong === -1 || iDecom.jong === 0) {
                        // No jongsung in input. Hint first part of target jong
                        const tL = Array.isArray(tJongDef) ? tJongDef : [tJongDef];
                        rawKeys = tL[0];
                    } else {
                        const iJongDef = JONG_KEYS[iDecom.jong];
                        const tL = Array.isArray(tJongDef) ? tJongDef : [tJongDef];
                        const iL = Array.isArray(iJongDef) ? iJongDef : [iJongDef];
                        const getBase = (k) => (typeof k === 'object' ? k.c : k);

                        if (tL.length > 1 && iL.length === 1 && getBase(tL[0]) === getBase(iL[0])) {
                            rawKeys = tL[1];
                        } else {
                            rawKeys = tL[0];
                        }
                    }
                }
            } else {
                // Fallback
                const key = jamoToKeyCode[tChar] || 'Space';
                rawKeys = key;
            }
        }
    }

    // Resolve
    const finalCodes = resolveKeys(rawKeys);

    document.querySelectorAll('.key.guide').forEach(el => el.classList.remove('guide'));
    finalCodes.forEach(code => {
        if (!code) return;
        const keyEl = document.querySelector(`.key[data-code="${code}"]`);
        if (keyEl) keyEl.classList.add('guide');
    });
}

function endGame() {
    clearInterval(state.timer);
    state.isPlaying = false;
    resultModal.classList.remove('hidden');

    updateStats();

    finalCpm.textContent = cpmDisplay.textContent;
    finalAcc.textContent = accuracyDisplay.textContent;
}

init();
