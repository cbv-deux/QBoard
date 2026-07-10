(function () {
  "use strict";
    const instrumentOptions = [
      ["accordion", "手风琴"],
      ["piano", "钢琴"],
      ["fortepiano", "古钢琴"],
      ["harpsichord", "羽管键琴"],
      ["guitar", "吉他"],
      ["classicalGuitar", "古典吉他"],
      ["overdriveGuitar", "过载电吉他"],
      ["distortionGuitar", "失真电吉他"],
      ["wahGuitar", "哇音吉他"],
      ["electricBass", "电贝斯"],
      ["synthWave", "合成器电波"],
      ["guzheng", "古筝"],
      ["harp", "竖琴"],
      ["violin", "小提琴"],
      ["cello", "大提琴"],
      ["doubleBass", "大贝司"],
      ["strings", "弦乐组"],
      ["erhu", "二胡"],
      ["flute", "长笛"],
      ["recorder", "竖笛"],
      ["clarinet", "单簧管"],
      ["oboe", "双簧管"],
      ["bassoon", "巴松"],
      ["frenchHorn", "圆号"],
      ["trumpet", "小号"],
      ["sax", "萨克斯"],
      ["theremin", "特雷门琴"]
    ];

    const instrumentTranspositions = {
      electricBass: { soundingOffset: -12, diatonicOffset: 7 },
      doubleBass: { soundingOffset: -12, diatonicOffset: 7 },
      clarinet: { soundingOffset: -2, diatonicOffset: 1 },
      frenchHorn: { soundingOffset: -7, diatonicOffset: 4 },
      trumpet: { soundingOffset: 2, diatonicOffset: -1 },
      sax: { soundingOffset: -9, diatonicOffset: 5 }
    };


    const instruments = {
      accordion: {
        envelope: { attack: 0.018, decay: 0.12, sustain: 0.74, release: 0.22 },
        filter: { type: "lowpass", frequency: 3200, q: 0.6 },
        oscillators: [
          { type: "sawtooth", ratio: 1, gain: 0.42, detune: -7 },
          { type: "sawtooth", ratio: 1, gain: 0.42, detune: 7 },
          { type: "triangle", ratio: 2, gain: 0.12, detune: 0 }
        ]
      },
      piano: {
        level: 1.22,
        envelope: { attack: 0.0025, decay: 1.18, sustain: 0.075, release: 0.9 },
        filter: { type: "lowpass", track: 16, min: 2400, max: 9800, q: 0.32 },
        formants: [
          { frequency: 170, q: 0.85, gain: 0.08 },
          { frequency: 520, q: 0.75, gain: 0.055 },
          { frequency: 2450, q: 0.7, gain: 0.035 }
        ],
        noise: { gain: 0.028, type: "highpass", frequency: 1800, attack: 0.001, decay: 0.035 },
        partials: [
          { ratio: 1, gain: 0.62, attack: 0.001, decay: 2.8, sustain: 0.08 },
          { ratio: 2.006, gain: 0.32, attack: 0.001, decay: 1.9, sustain: 0.035, detune: 1 },
          { ratio: 3.018, gain: 0.18, attack: 0.001, decay: 1.25, sustain: 0.018, detune: -1 },
          { ratio: 4.04, gain: 0.105, attack: 0.001, decay: 0.9, sustain: 0.01, detune: 1 },
          { ratio: 5.075, gain: 0.06, attack: 0.001, decay: 0.68, sustain: 0.006, detune: -1 },
          { ratio: 6.12, gain: 0.034, attack: 0.001, decay: 0.48, sustain: 0.004 },
          { ratio: 8.22, gain: 0.018, attack: 0.001, decay: 0.32, sustain: 0.002 }
        ],
        oscillators: []
      },
      fortepiano: {
        level: 1.12,
        envelope: { attack: 0.004, decay: 0.42, sustain: 0.12, release: 0.26 },
        filter: { type: "lowpass", frequency: 3300, q: 0.55 },
        noise: { gain: 0.012, type: "highpass", frequency: 2600 },
        oscillators: [
          { type: "triangle", ratio: 1, gain: 0.56, detune: 0 },
          { type: "sine", ratio: 2, gain: 0.2, detune: 2 },
          { type: "sawtooth", ratio: 3, gain: 0.07, detune: -3 },
          { type: "sine", ratio: 4, gain: 0.05, detune: 0 }
        ]
      },
      guitar: {
        level: 1.16,
        envelope: { attack: 0.004, decay: 0.33, sustain: 0.28, release: 0.24 },
        filter: { type: "lowpass", frequency: 2500, q: 0.7 },
        oscillators: [
          { type: "triangle", ratio: 1, gain: 0.54, detune: 0 },
          { type: "sawtooth", ratio: 2, gain: 0.18, detune: -3 },
          { type: "sine", ratio: 3, gain: 0.1, detune: 2 }
        ]
      },
      classicalGuitar: {
        level: 1.1,
        envelope: { attack: 0.003, decay: 0.9, sustain: 0.045, release: 0.46 },
        filter: { type: "lowpass", track: 8, min: 1350, max: 4300, q: 0.42 },
        formants: [
          { frequency: 110, q: 0.9, gain: 0.045 },
          { frequency: 240, q: 0.75, gain: 0.035 },
          { frequency: 720, q: 0.7, gain: 0.026 }
        ],
        noise: { gain: 0.018, type: "highpass", frequency: 1500, attack: 0.001, decay: 0.028 },
        partials: [
          { ratio: 1, gain: 0.7, attack: 0.001, decay: 1.55, sustain: 0.035 },
          { ratio: 2.01, gain: 0.23, attack: 0.001, decay: 0.86, sustain: 0.012, detune: -1 },
          { ratio: 3.02, gain: 0.115, attack: 0.001, decay: 0.55, sustain: 0.006, detune: 1 },
          { ratio: 4.05, gain: 0.055, attack: 0.001, decay: 0.34, sustain: 0.003 },
          { ratio: 5.08, gain: 0.028, attack: 0.001, decay: 0.22, sustain: 0.002 },
          { ratio: 6.12, gain: 0.014, attack: 0.001, decay: 0.16, sustain: 0.001 }
        ],
        oscillators: []
      },
      overdriveGuitar: {
        level: 1.24,
        envelope: { attack: 0.003, decay: 0.24, sustain: 0.48, release: 0.22 },
        filter: { type: "lowpass", frequency: 3400, q: 0.8 },
        distortion: { amount: 34, tone: 4200 },
        noise: { gain: 0.012, type: "highpass", frequency: 2800 },
        oscillators: [
          { type: "sawtooth", ratio: 1, gain: 0.48, detune: -2 },
          { type: "square", ratio: 1, gain: 0.22, detune: 2 },
          { type: "sine", ratio: 2, gain: 0.11, detune: 0 }
        ]
      },
      distortionGuitar: {
        level: 1.18,
        envelope: { attack: 0.0015, decay: 0.09, sustain: 0.72, release: 0.26 },
        filter: { type: "bandpass", track: 7.5, min: 650, max: 3600, q: 1.05 },
        distortion: { amount: 145, tone: 3400 },
        formants: [
          { frequency: 820, q: 1.15, gain: 0.045 },
          { frequency: 1850, q: 1.3, gain: 0.032 }
        ],
        noise: { gain: 0.011, type: "highpass", frequency: 2600 },
        oscillators: [
          { type: "sawtooth", ratio: 0.997, gain: 0.34, detune: -8 },
          { type: "sawtooth", ratio: 1.003, gain: 0.34, detune: 8 },
          { type: "square", ratio: 1, gain: 0.15, detune: 0 },
          { type: "sawtooth", ratio: 2.01, gain: 0.07, detune: -2 }
        ]
      },
      wahGuitar: {
        level: 1.2,
        envelope: { attack: 0.004, decay: 0.28, sustain: 0.36, release: 0.24 },
        filter: { type: "lowpass", frequency: 3300, q: 0.65 },
        wah: { start: 520, peak: 1850, end: 860, q: 8.5, rise: 0.13, fall: 0.34 },
        oscillators: [
          { type: "sawtooth", ratio: 1, gain: 0.46, detune: -2 },
          { type: "triangle", ratio: 2, gain: 0.18, detune: 2 },
          { type: "sine", ratio: 3, gain: 0.07, detune: 0 }
        ]
      },
      electricBass: {
        level: 1.24,
        envelope: { attack: 0.006, decay: 0.28, sustain: 0.54, release: 0.28 },
        filter: { type: "lowpass", frequency: 1350, q: 0.9 },
        noise: { gain: 0.006, type: "highpass", frequency: 1900 },
        oscillators: [
          { type: "triangle", ratio: 1, gain: 0.58, detune: 0 },
          { type: "sawtooth", ratio: 1, gain: 0.2, detune: -3 },
          { type: "sine", ratio: 2, gain: 0.11, detune: 1 },
          { type: "square", ratio: 3, gain: 0.035, detune: 0 }
        ]
      },
      synthWave: {
        level: 1.16,
        envelope: { attack: 0.025, decay: 0.16, sustain: 0.72, release: 0.32 },
        filter: { type: "lowpass", track: 7.5, min: 900, max: 6200, q: 0.7 },
        vibrato: { rate: 6.8, depth: 5 },
        oscillators: [
          { type: "sawtooth", ratio: 1, gain: 0.36, detune: -11 },
          { type: "sawtooth", ratio: 1, gain: 0.36, detune: 11 },
          { type: "square", ratio: 2, gain: 0.12, detune: 0 },
          { type: "sine", ratio: 3, gain: 0.06, detune: 3 }
        ]
      },
      violin: {
        envelope: { attack: 0.09, decay: 0.18, sustain: 0.78, release: 0.32 },
        filter: { type: "lowpass", frequency: 5600, q: 0.9 },
        vibrato: { rate: 5.3, depth: 10 },
        oscillators: [
          { type: "sawtooth", ratio: 1, gain: 0.5, detune: 0 },
          { type: "triangle", ratio: 2, gain: 0.18, detune: 2 },
          { type: "sine", ratio: 3, gain: 0.08, detune: -2 }
        ]
      },
      cello: {
        level: 1.18,
        envelope: { attack: 0.15, decay: 0.22, sustain: 0.86, release: 0.46 },
        filter: { type: "lowpass", frequency: 1850, q: 0.9 },
        vibrato: { rate: 4.8, depth: 9 },
        noise: { gain: 0.008, type: "bandpass", frequency: 760 },
        oscillators: [
          { type: "sawtooth", ratio: 1, gain: 0.46, detune: 0 },
          { type: "triangle", ratio: 2, gain: 0.16, detune: -2 },
          { type: "sine", ratio: 3, gain: 0.08, detune: 1 },
          { type: "sawtooth", ratio: 4, gain: 0.05, detune: -1 }
        ]
      },
      doubleBass: {
        level: 1.2,
        envelope: { attack: 0.19, decay: 0.28, sustain: 0.88, release: 0.62 },
        filter: { type: "lowpass", frequency: 1120, q: 0.95 },
        vibrato: { rate: 4.4, depth: 6 },
        noise: { gain: 0.01, type: "bandpass", frequency: 520 },
        oscillators: [
          { type: "sawtooth", ratio: 1, gain: 0.48, detune: 0 },
          { type: "triangle", ratio: 2, gain: 0.18, detune: -2 },
          { type: "sine", ratio: 3, gain: 0.07, detune: 1 },
          { type: "sawtooth", ratio: 4, gain: 0.035, detune: -1 }
        ]
      },
      strings: {
        envelope: { attack: 0.12, decay: 0.24, sustain: 0.84, release: 0.55 },
        filter: { type: "lowpass", frequency: 3900, q: 0.7 },
        vibrato: { rate: 5.0, depth: 6 },
        oscillators: [
          { type: "sawtooth", ratio: 1, gain: 0.3, detune: -9 },
          { type: "sawtooth", ratio: 1, gain: 0.3, detune: 9 },
          { type: "triangle", ratio: 2, gain: 0.16, detune: -3 },
          { type: "sine", ratio: 3, gain: 0.06, detune: 4 }
        ]
      },
      erhu: {
        level: 1.18,
        envelope: { attack: 0.075, decay: 0.15, sustain: 0.86, release: 0.3 },
        filter: { type: "bandpass", frequency: 1450, q: 2.2 },
        vibrato: { rate: 5.7, depth: 14 },
        oscillators: [
          { type: "sawtooth", ratio: 1, gain: 0.44, detune: 0 },
          { type: "triangle", ratio: 2, gain: 0.2, detune: -2 },
          { type: "square", ratio: 3, gain: 0.07, detune: 2 }
        ]
      },
      flute: {
        level: 1.28,
        envelope: { attack: 0.09, decay: 0.14, sustain: 0.86, release: 0.3 },
        filter: { type: "lowpass", frequency: 8200, q: 0.28 },
        vibrato: { rate: 5.2, depth: 3.5 },
        noise: { gain: 0.032, type: "highpass", frequency: 3200 },
        oscillators: [
          { harmonics: [1, 0.17, 0.045, 0.018, 0.008], ratio: 1, gain: 0.78, detune: 0 }
        ]
      },
      trumpet: {
        level: 1.34,
        envelope: { attack: 0.012, decay: 0.12, sustain: 0.82, release: 0.16 },
        filter: { type: "lowpass", track: 12, min: 3200, max: 9000, q: 0.9 },
        formants: [
          { frequency: 1450, q: 1.7, gain: 0.2 },
          { frequency: 3100, q: 1.4, gain: 0.16 }
        ],
        oscillators: [
          { harmonics: [0.8, 0.72, 0.64, 0.52, 0.4, 0.3, 0.22, 0.15, 0.1], ratio: 1, gain: 0.72, detune: 0 }
        ]
      },
      frenchHorn: {
        level: 1.28,
        envelope: { attack: 0.04, decay: 0.16, sustain: 0.84, release: 0.28 },
        filter: { type: "lowpass", track: 9, min: 1800, max: 5600, q: 0.75 },
        formants: [
          { frequency: 620, q: 1.25, gain: 0.12 },
          { frequency: 1350, q: 1.4, gain: 0.1 },
          { frequency: 2550, q: 1.15, gain: 0.06 }
        ],
        vibrato: { rate: 4.6, depth: 3 },
        oscillators: [
          { harmonics: [0.9, 0.62, 0.42, 0.34, 0.24, 0.16, 0.1, 0.06], ratio: 1, gain: 0.7, detune: 0 }
        ]
      },
      sax: {
        level: 1.42,
        envelope: { attack: 0.045, decay: 0.17, sustain: 0.82, release: 0.34 },
        filter: { type: "lowpass", track: 8.5, min: 2100, max: 6200, q: 0.75 },
        formants: [
          { track: 2.0, min: 520, max: 980, q: 1.6, gain: 0.18 },
          { track: 4.2, min: 1050, max: 2100, q: 1.25, gain: 0.18 },
          { track: 7.2, min: 1900, max: 3400, q: 1.0, gain: 0.11 }
        ],
        vibrato: { rate: 4.7, depth: 8 },
        noise: { gain: 0.016, type: "bandpass", frequency: 1600 },
        oscillators: [
          { harmonics: [0.95, 0.58, 0.5, 0.32, 0.24, 0.18, 0.11, 0.075], ratio: 1, gain: 0.64, detune: 0 }
        ]
      },
      harpsichord: {
        level: 1.12,
        envelope: { attack: 0.001, decay: 0.3, sustain: 0.025, release: 0.1 },
        filter: { type: "highpass", frequency: 540, q: 0.85 },
        noise: { gain: 0.018, type: "highpass", frequency: 3400 },
        oscillators: [
          { type: "square", ratio: 1, gain: 0.3, detune: 0 },
          { type: "sawtooth", ratio: 2, gain: 0.27, detune: 1 },
          { type: "triangle", ratio: 3, gain: 0.12, detune: -1 },
          { type: "sine", ratio: 5, gain: 0.06, detune: 0 }
        ]
      },
      quilled: {
        level: 1.12,
        envelope: { attack: 0.001, decay: 0.3, sustain: 0.025, release: 0.1 },
        filter: { type: "highpass", frequency: 540, q: 0.85 },
        noise: { gain: 0.018, type: "highpass", frequency: 3400 },
        oscillators: [
          { type: "square", ratio: 1, gain: 0.3, detune: 0 },
          { type: "sawtooth", ratio: 2, gain: 0.27, detune: 1 },
          { type: "triangle", ratio: 3, gain: 0.12, detune: -1 },
          { type: "sine", ratio: 5, gain: 0.06, detune: 0 }
        ]
      },
      theremin: {
        envelope: { attack: 0.11, decay: 0.08, sustain: 0.88, release: 0.36 },
        filter: { type: "lowpass", frequency: 3600, q: 0.3 },
        vibrato: { rate: 6.2, depth: 18 },
        oscillators: [
          { type: "sine", ratio: 1, gain: 0.82, detune: 0 },
          { type: "sine", ratio: 2, gain: 0.08, detune: 0 }
        ]
      },
      harp: {
        envelope: { attack: 0.003, decay: 0.74, sustain: 0.12, release: 0.74 },
        filter: { type: "lowpass", frequency: 4800, q: 0.35 },
        oscillators: [
          { type: "triangle", ratio: 1, gain: 0.58, detune: 0 },
          { type: "sine", ratio: 2, gain: 0.18, detune: 2 },
          { type: "sine", ratio: 3, gain: 0.1, detune: -2 }
        ]
      },
      guzheng: {
        level: 1.14,
        envelope: { attack: 0.002, decay: 0.92, sustain: 0.07, release: 0.68 },
        filter: { type: "lowpass", frequency: 5600, q: 0.45 },
        noise: { gain: 0.014, type: "highpass", frequency: 3000 },
        oscillators: [
          { type: "triangle", ratio: 1, gain: 0.48, detune: 0 },
          { type: "sine", ratio: 2, gain: 0.18, detune: 3 },
          { type: "sawtooth", ratio: 3, gain: 0.1, detune: -2 },
          { type: "sine", ratio: 5, gain: 0.04, detune: 0 }
        ]
      },
      clarinet: {
        level: 1.42,
        envelope: { attack: 0.06, decay: 0.14, sustain: 0.84, release: 0.25 },
        filter: { type: "lowpass", track: 6.2, min: 1600, max: 4200, q: 0.8 },
        formants: [
          { track: 3, min: 720, max: 1750, q: 1.8, gain: 0.16 },
          { track: 5, min: 1200, max: 2800, q: 1.5, gain: 0.12 }
        ],
        vibrato: { rate: 4.2, depth: 2.5 },
        noise: { gain: 0.005, type: "bandpass", frequency: 1100 },
        oscillators: [
          { harmonics: [1, 0.045, 0.58, 0.035, 0.3, 0.025, 0.16, 0.018, 0.08], ratio: 1, gain: 0.72, detune: 0 }
        ]
      },
      oboe: {
        level: 1.46,
        envelope: { attack: 0.035, decay: 0.1, sustain: 0.84, release: 0.2 },
        filter: { type: "bandpass", track: 3.5, min: 980, max: 2600, q: 1.8 },
        formants: [
          { track: 2.7, min: 850, max: 1700, q: 2.4, gain: 0.2 },
          { track: 6.2, min: 1800, max: 3600, q: 1.9, gain: 0.18 }
        ],
        vibrato: { rate: 5.4, depth: 3.5 },
        noise: { gain: 0.008, type: "bandpass", frequency: 2300 },
        oscillators: [
          { harmonics: [0.9, 0.74, 0.56, 0.42, 0.28, 0.2, 0.13, 0.085], ratio: 1, gain: 0.62, detune: 0 }
        ]
      },
      bassoon: {
        level: 1.34,
        envelope: { attack: 0.055, decay: 0.14, sustain: 0.82, release: 0.28 },
        filter: { type: "lowpass", track: 5.5, min: 1200, max: 3600, q: 0.95 },
        formants: [
          { track: 2.1, min: 360, max: 900, q: 1.7, gain: 0.16 },
          { track: 4.4, min: 920, max: 1800, q: 1.45, gain: 0.13 }
        ],
        vibrato: { rate: 4.5, depth: 2.6 },
        noise: { gain: 0.006, type: "bandpass", frequency: 850 },
        oscillators: [
          { harmonics: [0.95, 0.38, 0.58, 0.22, 0.34, 0.16, 0.18, 0.08], ratio: 1, gain: 0.68, detune: 0 }
        ]
      },
      recorder: {
        level: 1.24,
        envelope: { attack: 0.022, decay: 0.08, sustain: 0.78, release: 0.18 },
        filter: { type: "lowpass", frequency: 6700, q: 0.42 },
        vibrato: { rate: 4.0, depth: 1.6 },
        noise: { gain: 0.028, type: "highpass", frequency: 2600 },
        oscillators: [
          { harmonics: [1, 0.32, 0.18, 0.075, 0.035], ratio: 1, gain: 0.7, detune: 0 }
        ]
      }
    };


    window.QBOARD_MUSIC_DATA = { instrumentOptions, instrumentTranspositions, instruments };
})();
