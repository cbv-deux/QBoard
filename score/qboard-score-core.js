(function (root) {
  "use strict";

  const VERSION = 1;
  const PPQ = 480;
  const WHOLE = PPQ * 4;
  const MAX_MEASURES = 300;
  const durationTicks = Object.freeze({ w: 1920, h: 960, q: 480, 8: 240, 16: 120, 32: 60, 64: 30 });
  const durationOrder = Object.freeze(["w", "h", "q", "8", "16", "32", "64"]);
  const pitchClasses = Object.freeze(["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]);
  const pitchClassSteps = Object.freeze({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 });
  const sharpOrder = Object.freeze(["F", "C", "G", "D", "A", "E", "B"]);
  const flatOrder = Object.freeze(["B", "E", "A", "D", "G", "C", "F"]);
  const TAB_TUNINGS = Object.freeze({
    guitar: Object.freeze([40, 45, 50, 55, 59, 64]),
    bass: Object.freeze([28, 33, 38, 43])
  });
  const majorTonics = Object.freeze(["Cbb", "Gbb", "Dbb", "Abb", "Ebb", "Bbb", "Fb", "Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "E#", "B#", "F##", "C##"]);
  const minorTonics = Object.freeze(["Abb", "Ebb", "Bbb", "Fb", "Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "E#", "B#", "F##", "C##", "G##", "D##", "A##"]);
  let serial = 0;

  function uid(prefix = "id") {
    serial += 1;
    const stamp = Date.now().toString(36);
    return `${prefix}-${stamp}-${serial.toString(36)}`;
  }

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function clamp(value, min, max, fallback = min) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  }

  function mod(value, base) {
    return ((value % base) + base) % base;
  }

  function measureTicks(time = { beats: 4, beatType: 4 }) {
    return Math.round(PPQ * clamp(time.beats, 1, 32, 4) * 4 / clamp(time.beatType, 1, 64, 4));
  }

  function keyTonicFromFifths(fifths, mode = "major") {
    const index = Math.round(clamp(fifths, -14, 14, 0)) + 14;
    return (mode === "minor" ? minorTonics : majorTonics)[index];
  }

  function keyAccidentalMap(fifths) {
    const value = Math.round(clamp(fifths, -14, 14, 0));
    const order = value < 0 ? flatOrder : sharpOrder;
    const direction = Math.sign(value);
    const magnitude = Math.abs(value);
    const result = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
    order.forEach((letter, index) => {
      const level = Math.max(0, Math.min(2, Math.floor((magnitude + 6 - index) / 7)));
      result[letter] = direction * level;
    });
    return result;
  }

  function keySignatureTransition(previousFifths, nextFifths, full = false) {
    const previous = full ? keyAccidentalMap(0) : keyAccidentalMap(previousFifths);
    const next = keyAccidentalMap(nextFifths);
    const oldOrder = Number(previousFifths) < 0 ? flatOrder : sharpOrder;
    const newOrder = Number(nextFifths) < 0 ? flatOrder : sharpOrder;
    const groups = [];
    oldOrder.forEach(letter => {
      if (previous[letter] && !next[letter]) groups.push({ letter, accidentals: ["n"], direction: Math.sign(previous[letter]) });
    });
    newOrder.forEach(letter => {
      const oldValue = previous[letter];
      const newValue = next[letter];
      if (!newValue) return;
      const type = newValue === 2 ? "##" : newValue === -2 ? "bb" : newValue > 0 ? "#" : "b";
      const needsNatural = oldValue && (Math.sign(oldValue) !== Math.sign(newValue) || Math.abs(newValue) < Math.abs(oldValue));
      groups.push({ letter, accidentals: needsNatural ? ["n", type] : [type], direction: Math.sign(newValue) });
    });
    return groups;
  }

  function accidentalGlyphs(alter) {
    const value = Math.round(clamp(alter, -3, 3, 0));
    if (value === 3) return ["#", "##"];
    if (value === -3) return ["b", "bb"];
    if (value === 2) return ["##"];
    if (value === -2) return ["bb"];
    if (value === 1) return ["#"];
    if (value === -1) return ["b"];
    return [];
  }

  function accidentalTransition(previousAlter, nextAlter, force = false) {
    const previous = Math.round(clamp(previousAlter, -3, 3, 0));
    const next = Math.round(clamp(nextAlter, -3, 3, 0));
    if (previous === next && !force) return [];
    if (!next) return ["n"];
    const needsNatural = previous && (Math.sign(previous) !== Math.sign(next) || Math.abs(next) < Math.abs(previous));
    return needsNatural ? ["n", ...accidentalGlyphs(next)] : accidentalGlyphs(next);
  }

  function accidentalPlan(events, fifths = 0) {
    const keyMap = keyAccidentalMap(fifths);
    const state = new Map();
    const result = new Map();
    [...(events || [])]
      .filter(event => event.type === "note")
      .sort((a, b) => a.tick - b.tick || a.voice - b.voice || a.id.localeCompare(b.id))
      .forEach(event => {
        const before = new Map(state);
        const planned = event.pitches.map(pitch => {
          const key = `${event.staff}:${pitch.step}:${pitch.octave}`;
          const previous = before.has(key) ? before.get(key) : keyMap[pitch.step] || 0;
          return accidentalTransition(previous, pitch.alter, Boolean(pitch.accidental));
        });
        event.pitches.forEach(pitch => state.set(`${event.staff}:${pitch.step}:${pitch.octave}`, Number(pitch.alter) || 0));
        result.set(event.id, planned);
      });
    return result;
  }

  function accidentalText(alter) {
    return ({ "-3": "bbb", "-2": "bb", "-1": "b", 0: "", 1: "#", 2: "x", 3: "#x" })[String(alter)] ?? "";
  }

  function spellingFromMidi(midi, preference = "auto") {
    const value = Math.round(clamp(midi, 0, 127, 60));
    const pc = mod(value, 12);
    const sharp = [
      ["C", 0], ["C", 1], ["D", 0], ["D", 1], ["E", 0], ["F", 0],
      ["F", 1], ["G", 0], ["G", 1], ["A", 0], ["A", 1], ["B", 0]
    ];
    const flat = [
      ["C", 0], ["D", -1], ["D", 0], ["E", -1], ["E", 0], ["F", 0],
      ["G", -1], ["G", 0], ["A", -1], ["A", 0], ["B", -1], ["B", 0]
    ];
    const [step, alter] = preference === "flat" ? flat[pc] : sharp[pc];
    const octave = Math.floor((value - (pitchClassSteps[step] + alter)) / 12) - 1;
    return { midi: value, step, alter, octave };
  }

  function midiFromSpelling(pitch) {
    if (Number.isFinite(Number(pitch?.midi))) return Math.round(clamp(pitch.midi, 0, 127, 60));
    const base = pitchClassSteps[String(pitch?.step || "C").toUpperCase()] ?? 0;
    return Math.round(clamp((Number(pitch?.octave) + 1) * 12 + base + Number(pitch?.alter || 0), 0, 127, 60));
  }

  function pitchName(pitch) {
    return `${pitch.step}${accidentalText(Number(pitch.alter) || 0)}${pitch.octave}`;
  }

  function keySpellingAtMidi(midi, key = {}) {
    const value = Math.round(clamp(midi, 0, 127, 60));
    const accidentals = keyAccidentalMap(key.fifths || 0);
    for (let octave = -1; octave <= 9; octave += 1) {
      for (const step of Object.keys(pitchClassSteps)) {
        const alter = accidentals[step] || 0;
        if ((octave + 1) * 12 + pitchClassSteps[step] + alter === value) return { midi: value, step, alter, octave };
      }
    }
    return null;
  }

  function spellPitchInKey(midi, key = {}, direction = "raise") {
    const value = Math.round(clamp(midi, 0, 127, 60));
    const inKey = keySpellingAtMidi(value, key);
    if (inKey) return inKey;
    const raising = direction !== "lower";
    const base = keySpellingAtMidi(value + (raising ? -1 : 1), key);
    if (!base) return spellingFromMidi(value, raising ? "sharp" : "flat");
    return { ...base, midi: value, alter: Math.round(clamp(base.alter + (raising ? 1 : -1), -3, 3, 0)) };
  }

  function isTabPart(part) {
    return part?.notationType === "guitar" || part?.notationType === "bass";
  }

  function tabTuning(part) {
    const fallback = TAB_TUNINGS[part?.notationType] || TAB_TUNINGS.guitar;
    const tuning = Array.isArray(part?.tuning) ? part.tuning.map(Number).filter(Number.isFinite).slice(0, 12) : [];
    return tuning.length ? tuning : [...fallback];
  }

  function normalizeTabPositions(event, part) {
    if (!event || event.type !== "note" || !isTabPart(part)) return event?.tab || null;
    const tuning = tabTuning(part);
    const supplied = Array.isArray(event.tab?.positions) ? event.tab.positions : [];
    const legacy = !supplied.length && event.tab && Number.isFinite(Number(event.tab.string))
      ? [{ pitchIndex: 0, string: Number(event.tab.string), fret: Number(event.tab.fret) || 0 }]
      : [];
    const byPitch = new Map([...supplied, ...legacy].map((item, index) => [
      Math.max(0, Math.round(Number(item.pitchIndex) || index)),
      {
        pitchIndex: Math.max(0, Math.round(Number(item.pitchIndex) || index)),
        string: Math.round(clamp(item.string, 1, tuning.length, tuning.length)),
        fret: Math.round(Number(item.fret) || 0)
      }
    ]));
    const used = new Set([...byPitch.values()].map(item => item.string));
    const ordered = event.pitches.map((pitch, pitchIndex) => ({ pitch, pitchIndex })).sort((a, b) => a.pitch.midi - b.pitch.midi);
    ordered.forEach(({ pitch, pitchIndex }) => {
      if (byPitch.has(pitchIndex)) return;
      let tuningIndex = tuning.findIndex((_, index) => !used.has(tuning.length - index));
      if (tuningIndex < 0) tuningIndex = 0;
      const string = tuning.length - tuningIndex;
      used.add(string);
      byPitch.set(pitchIndex, { pitchIndex, string, fret: Math.round(pitch.midi - tuning[tuningIndex]) });
    });
    event.tab = { positions: [...byPitch.values()].filter(item => item.pitchIndex < event.pitches.length).sort((a, b) => a.pitchIndex - b.pitchIndex) };
    return event.tab;
  }

  function moveTabPosition(event, part, pitchIndex, visualDelta) {
    const tab = normalizeTabPositions(event, part);
    if (!tab) return null;
    const tuning = tabTuning(part);
    const position = tab.positions.find(item => item.pitchIndex === pitchIndex);
    const pitch = event.pitches[pitchIndex];
    if (!position || !pitch) return null;
    const nextString = Math.round(clamp(position.string - Number(visualDelta || 0), 1, tuning.length, position.string));
    position.string = nextString;
    position.fret = Math.round(pitch.midi - tuning[tuning.length - nextString]);
    return position;
  }

  function defaultPart(seed = {}) {
    const notationType = ["single", "grand", "guitar", "bass", "percussion"].includes(seed.notationType)
      ? seed.notationType
      : "single";
    const tuning = Array.isArray(seed.tuning) && seed.tuning.length
      ? seed.tuning.map(Number).filter(Number.isFinite).slice(0, 12)
      : [...(TAB_TUNINGS[notationType] || TAB_TUNINGS.guitar)];
    const defaultClef = notationType === "percussion" ? "percussion" : notationType === "bass" ? "bass" : "treble";
    return {
      id: seed.id || uid("part"),
      name: seed.name || "Instrument",
      shortName: seed.shortName || seed.name?.slice(0, 4) || "Inst.",
      colorIndex: Math.round(clamp(seed.colorIndex, 0, 11, 0)),
      instrumentId: seed.instrumentId || "piano",
      outputShift: Math.round(clamp(seed.outputShift, -48, 48, 0)),
      sourceProfileId: seed.sourceProfileId || null,
      sourceType: seed.sourceType || "manual",
      transposition: {
        chromatic: Number(seed.transposition?.chromatic) || 0,
        diatonic: Number(seed.transposition?.diatonic) || 0,
        octave: Number(seed.transposition?.octave) || 0
      },
      notationType,
      splitMidi: Math.round(clamp(seed.splitMidi, 24, 96, 60)),
      grandInputMode: seed.grandInputMode === "split" ? "split" : "unified",
      clefs: notationType === "grand" ? ["treble", "bass"] : isTabPart({ notationType }) ? [seed.clef || defaultClef, "tab"] : [seed.clef || defaultClef],
      staffLines: notationType === "percussion" ? Math.round(clamp(seed.staffLines, 1, 5, 5)) : 5,
      tuning,
      enabled: seed.enabled !== false,
      visible: seed.visible !== false,
      mute: Boolean(seed.mute),
      solo: Boolean(seed.solo),
      volume: clamp(seed.volume, 0, 1, 0.8),
      noteFadeSeconds: clamp(seed.noteFadeSeconds, 0, 3, 0.2),
      pedalDampingSeconds: clamp(seed.pedalDampingSeconds, 0.1, 20, 10),
      events: Array.isArray(seed.events) ? clone(seed.events) : []
    };
  }

  function defaultMeasure(index, settings = {}) {
    return {
      id: uid("measure"),
      index,
      tempo: Math.round(clamp(settings.tempo, 20, 400, 120)),
      time: clone(settings.time || { beats: 4, beatType: 4 }),
      key: clone(settings.key || { fifths: 0, mode: "major", tonic: "C" }),
      pickupTicks: index === 0 ? Number(settings.pickupTicks) || 0 : 0,
      barline: index === 0 ? "single" : null,
      repeatStart: false,
      repeatEnd: false,
      ending: null,
      systemBreak: false,
      pageBreak: false,
      multipleRest: Math.max(0, Math.round(Number(settings.multipleRest) || 0))
    };
  }

  function createDocument(options = {}) {
    const settings = {
      tempo: Math.round(clamp(options.tempo, 20, 400, 120)),
      time: clone(options.time || { beats: 4, beatType: 4 }),
      key: clone(options.key || { fifths: 0, mode: "major", tonic: "C" }),
      concertPitch: Boolean(options.concertPitch),
      quantize: options.quantize || "16",
      countInMeasures: Math.round(clamp(options.countInMeasures, 0, 8, 1)),
      page: { size: "A4", orientation: "portrait", view: "page", zoom: 1 }
    };
    const count = Math.round(clamp(options.measureCount, 1, MAX_MEASURES, 8));
    return normalizeDocument({
      format: "qboard-score",
      version: VERSION,
      id: options.id || uid("score"),
      title: options.title || "Untitled Score",
      subtitle: options.subtitle || "",
      composer: options.composer || "",
      lyricist: options.lyricist || "",
      copyright: options.copyright || "",
      createdAt: options.createdAt || new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      settings,
      measures: Array.from({ length: count }, (_, index) => defaultMeasure(index, settings)),
      parts: (options.parts || []).map(defaultPart),
      directions: [],
      rawTakes: []
    });
  }

  function normalizeEvent(event, part, document) {
    const normalized = {
      id: event.id || uid(event.type || "event"),
      type: ["note", "rest", "direction", "pedal"].includes(event.type) ? event.type : "note",
      measure: Math.max(0, Math.round(Number(event.measure) || 0)),
      tick: Math.max(0, Math.round(Number(event.tick) || 0)),
      durationTicks: Math.max(1, Math.round(Number(event.durationTicks) || PPQ)),
      restCode: durationOrder.includes(event.restCode) ? event.restCode : null,
      wholeMeasureRest: Boolean(event.wholeMeasureRest),
      rawTick: Number.isFinite(Number(event.rawTick)) ? Number(event.rawTick) : null,
      rawDurationTicks: Number.isFinite(Number(event.rawDurationTicks)) ? Number(event.rawDurationTicks) : null,
      staff: Math.max(0, Math.round(Number(event.staff) || 0)),
      voice: Math.round(clamp(event.voice, 1, 4, 1)),
      dots: Math.round(clamp(event.dots, 0, 2, 0)),
      tuplet: event.tuplet ? {
        id: event.tuplet.id || uid("tuplet"),
        num: Math.round(clamp(event.tuplet.num, 2, 9, 3)),
        inTimeOf: Math.round(clamp(event.tuplet.inTimeOf, 1, 8, 2)),
        index: Math.round(clamp(event.tuplet.index, 0, 8, 0))
      } : null,
      pitches: [],
      velocity: Math.round(clamp(event.velocity, 1, 127, 92)),
      articulations: Array.isArray(event.articulations) ? [...new Set(event.articulations)] : [],
      ornament: event.ornament || null,
      dynamic: event.dynamic || null,
      lyrics: Array.isArray(event.lyrics) ? event.lyrics.map(item => ({ verse: Number(item.verse) || 1, text: String(item.text || ""), syllabic: item.syllabic || "single", extend: Boolean(item.extend) })) : [],
      chordSymbol: event.chordSymbol || "",
      text: event.text || "",
      grace: Boolean(event.grace),
      cue: Boolean(event.cue),
      tieStart: Boolean(event.tieStart),
      tieStop: Boolean(event.tieStop),
      slurStart: Boolean(event.slurStart),
      slurStop: Boolean(event.slurStop),
      beam: event.beam || "auto",
      pedal: event.pedal || "sustain",
      value: Boolean(event.value),
      tab: event.tab ? clone(event.tab) : null,
      percussion: event.percussion ? clone(event.percussion) : null,
      sourceId: event.sourceId || null,
      inputGroupId: event.inputGroupId || null
    };
    if (normalized.type === "note") {
      const preference = Number(document?.settings?.key?.fifths || 0) < 0 ? "flat" : "sharp";
      normalized.pitches = (event.pitches || [event.pitch || { midi: 60 }]).map(pitch => {
        const midi = midiFromSpelling(pitch);
        const spelling = pitch.step ? { ...pitch, midi } : spellingFromMidi(midi, preference);
        return {
          midi,
          step: String(spelling.step || "C").toUpperCase(),
          alter: Math.round(clamp(spelling.alter, -3, 3, 0)),
          octave: Math.round(clamp(spelling.octave, -1, 9, 4)),
          string: Number.isFinite(Number(pitch.string)) ? Number(pitch.string) : null,
          fret: Number.isFinite(Number(pitch.fret)) ? Number(pitch.fret) : null,
          accidental: pitch.accidental || null,
          tieStart: Boolean(pitch.tieStart ?? event.tieStart),
          tieStop: Boolean(pitch.tieStop ?? event.tieStop)
        };
      }).sort((a, b) => a.midi - b.midi);
    }
    if (part?.notationType === "grand" && !Number.isFinite(Number(event.staff))) {
      normalized.staff = normalized.pitches[0]?.midi < part.splitMidi ? 1 : 0;
    }
    if (isTabPart(part) && normalized.type === "note") normalizeTabPositions(normalized, part);
    return normalized;
  }

  function normalizeDocument(input) {
    const document = clone(input || {});
    if (Array.isArray(document.measures) && document.measures.length > MAX_MEASURES) {
      throw new RangeError(`Q-board scores support at most ${MAX_MEASURES} measures.`);
    }
    document.format = "qboard-score";
    document.version = VERSION;
    document.id ||= uid("score");
    document.title ||= "Untitled Score";
    document.settings ||= {};
    document.settings.tempo = Math.round(clamp(document.settings.tempo, 20, 400, 120));
    document.settings.time ||= { beats: 4, beatType: 4 };
    document.settings.key ||= { fifths: 0, mode: "major", tonic: "C" };
    document.settings.key.fifths = Math.round(clamp(document.settings.key.fifths, -14, 14, 0));
    document.settings.key.mode = document.settings.key.mode === "minor" ? "minor" : "major";
    document.settings.key.tonic = keyTonicFromFifths(document.settings.key.fifths, document.settings.key.mode);
    document.settings.quantize ||= "16";
    document.settings.countInMeasures = Math.round(clamp(document.settings.countInMeasures, 0, 8, 1));
    document.settings.page = { size: "A4", orientation: "portrait", view: "page", zoom: 1, ...(document.settings.page || {}) };
    document.measures = (document.measures || []).map((measure, index) => {
      const normalized = { ...defaultMeasure(index, document.settings), ...measure, index };
      normalized.tempo = Math.round(clamp(normalized.tempo, 20, 400, document.settings.tempo));
      normalized.time = {
        beats: Math.round(clamp(normalized.time?.beats, 1, 32, document.settings.time.beats)),
        beatType: Math.round(clamp(normalized.time?.beatType, 1, 64, document.settings.time.beatType))
      };
      normalized.key = { ...clone(document.settings.key), ...(normalized.key || {}) };
      normalized.key.fifths = Math.round(clamp(normalized.key.fifths, -14, 14, document.settings.key.fifths || 0));
      normalized.key.mode = normalized.key.mode === "minor" ? "minor" : "major";
      normalized.key.tonic = keyTonicFromFifths(normalized.key.fifths, normalized.key.mode);
      return normalized;
    });
    if (!document.measures.length) document.measures.push(defaultMeasure(0, document.settings));
    document.parts = (document.parts || []).map(part => {
      const normalizedPart = defaultPart(part);
      normalizedPart.events = (part.events || []).map(event => {
        if (Number(event.measure) >= MAX_MEASURES) throw new RangeError(`Q-board scores support at most ${MAX_MEASURES} measures.`);
        return normalizeEvent(event, normalizedPart, document);
      });
      return normalizedPart;
    });
    const lastEventMeasure = document.parts.reduce((maximum, part) => part.events.reduce((partMaximum, event) => Math.max(partMaximum, event.measure), maximum), -1);
    if (lastEventMeasure >= document.measures.length) ensureMeasures(document, lastEventMeasure + 1);
    document.directions = Array.isArray(document.directions) ? document.directions : [];
    document.rawTakes = Array.isArray(document.rawTakes) ? document.rawTakes : [];
    document.modifiedAt ||= new Date().toISOString();
    return document;
  }

  function ensureMeasures(document, count) {
    const wanted = Math.max(1, Math.round(Number(count) || 1));
    if (wanted > MAX_MEASURES) throw new RangeError(`Q-board scores support at most ${MAX_MEASURES} measures.`);
    while (document.measures.length < wanted) {
      const previous = document.measures.at(-1);
      document.measures.push(defaultMeasure(document.measures.length, {
        ...document.settings,
        tempo: previous?.tempo ?? document.settings.tempo,
        time: previous?.time || document.settings.time,
        key: previous?.key || document.settings.key
      }));
    }
    document.measures.forEach((measure, index) => { measure.index = index; });
    return document.measures;
  }

  function findPart(document, partId) {
    return document.parts.find(part => part.id === partId) || null;
  }

  function documentAbsoluteTick(document, position) {
    const measureIndex = Math.max(0, Math.min(document.measures.length - 1, Math.round(Number(position?.measure) || 0)));
    let total = 0;
    for (let index = 0; index < measureIndex; index += 1) total += measureTicks(document.measures[index].time);
    return total + Math.max(0, Number(position?.tick) || 0);
  }

  function nextNoteAtPosition(document, position, preferredPartId = null) {
    const cursorTick = documentAbsoluteTick(document, position);
    const candidates = document.parts.flatMap((part, partIndex) => part.events
      .filter(event => event.type === "note" && documentAbsoluteTick(document, event) >= cursorTick)
      .map(event => ({ part, event, partIndex, absoluteTick: documentAbsoluteTick(document, event) })));
    candidates.sort((a, b) => a.absoluteTick - b.absoluteTick
      || Number(b.part.id === preferredPartId) - Number(a.part.id === preferredPartId)
      || a.partIndex - b.partIndex
      || a.event.staff - b.event.staff
      || a.event.voice - b.event.voice);
    return candidates[0] || null;
  }

  function resolveInputPart(document, detail = {}, selectedPartId = null, isPartEnabled = part => part?.enabled !== false) {
    const selected = selectedPartId ? findPart(document, selectedPartId) : null;
    if (selected) return selected;
    const enabled = part => Boolean(part && isPartEnabled(part));
    const bassInput = detail.sourceType === "bass" || detail.source === "bass";
    if (bassInput) {
      const defaultBass = document.parts.find(part => part.sourceProfileId === "bass")
        || document.parts.find(part => part.sourceType === "bass");
      if (enabled(defaultBass)) return defaultBass;
      return document.parts.find(enabled) || null;
    }
    const defaultKeyboard = document.parts.find(part => part.sourceProfileId === "main")
      || document.parts.find(part => part.sourceType === "browser")
      || document.parts.find(part => part.sourceType !== "bass");
    if (enabled(defaultKeyboard)) return defaultKeyboard;
    return document.parts.find(enabled) || null;
  }

  function groupPitchesByStaff(part, pitches, requestedStaff = null) {
    const source = (pitches || []).map(pitch => typeof pitch === "number" ? { midi: pitch } : pitch);
    const hasRequestedStaff = requestedStaff !== null && requestedStaff !== undefined && Number.isFinite(Number(requestedStaff));
    if (part?.notationType !== "grand" || hasRequestedStaff) {
      return [{ staff: hasRequestedStaff ? Number(requestedStaff) : 0, pitches: source }];
    }
    const groups = new Map();
    source.forEach(pitch => {
      const staff = Number(pitch.midi) < Number(part.splitMidi || 60) ? 1 : 0;
      if (!groups.has(staff)) groups.set(staff, []);
      groups.get(staff).push(pitch);
    });
    return [...groups.entries()].sort(([staffA], [staffB]) => staffA - staffB).map(([staff, groupedPitches]) => ({ staff, pitches: groupedPitches }));
  }

  function sortEvents(part) {
    part.events.sort((a, b) => a.measure - b.measure || a.tick - b.tick || a.staff - b.staff || a.voice - b.voice || a.id.localeCompare(b.id));
  }

  function sameRhythm(a, b) {
    return a.durationTicks === b.durationTicks
      && a.dots === b.dots
      && Number(a.tuplet?.num || 0) === Number(b.tuplet?.num || 0)
      && Number(a.tuplet?.inTimeOf || 0) === Number(b.tuplet?.inTimeOf || 0);
  }

  function rhythmIntervalsOverlap(a, b) {
    if (a.measure !== b.measure || a.staff !== b.staff) return false;
    return a.tick < b.tick + b.durationTicks && b.tick < a.tick + a.durationTicks;
  }

  function chooseRhythmicVoice(part, event, strict = false) {
    const sameOnset = part.events.filter(item => item.type === "note" && item.measure === event.measure && item.tick === event.tick && item.staff === event.staff);
    const matching = sameOnset.find(item => sameRhythm(item, event));
    if (matching) return matching.voice;
    const requested = Math.round(clamp(event.voice, 1, 4, 1));
    const candidates = [requested, 1, 2, 3, 4].filter((voice, index, list) => list.indexOf(voice) === index);
    return candidates.find(voice => !part.events.some(item => ["note", "rest"].includes(item.type) && item.voice === voice && rhythmIntervalsOverlap(item, event))) || (strict ? null : requested);
  }

  function insertEvent(document, partId, event, options = {}) {
    const part = findPart(document, partId);
    if (!part) throw new Error(`Unknown score part: ${partId}`);
    const measureIndex = Math.max(0, Math.round(Number(event.measure) || 0));
    if (measureIndex >= MAX_MEASURES) throw new RangeError(`Q-board scores support at most ${MAX_MEASURES} measures.`);
    ensureMeasures(document, Math.max(document.measures.length, measureIndex + 1));
    const normalized = normalizeEvent(event, part, document);
    if (normalized.type === "note" && !options.preserveVoice) normalized.voice = chooseRhythmicVoice(part, normalized);
    const existingChord = part.events.find(item => item.type === "note" && normalized.type === "note" && item.measure === normalized.measure && item.tick === normalized.tick && item.staff === normalized.staff && item.voice === normalized.voice && sameRhythm(item, normalized));
    if (existingChord) {
      const existing = new Set(existingChord.pitches.map(pitch => pitch.midi));
      for (const pitch of normalized.pitches) if (!existing.has(pitch.midi)) existingChord.pitches.push(pitch);
      existingChord.pitches.sort((a, b) => a.midi - b.midi);
      if (isTabPart(part)) normalizeTabPositions(existingChord, part);
      document.modifiedAt = new Date().toISOString();
      return existingChord;
    }
    part.events.push(normalized);
    sortEvents(part);
    document.modifiedAt = new Date().toISOString();
    return normalized;
  }

  function notationForSpan(duration) {
    const exact = [...tripletCandidates, ...restCandidates].find(candidate => candidate.ticks === Math.round(duration));
    return exact
      ? { restCode: exact.code, dots: exact.dots || 0, tuplet: exact.tuplet ? { id: uid("tuplet"), ...exact.tuplet } : null }
      : { restCode: null, dots: 0, tuplet: null };
  }

  function insertRhythmicEvent(document, partId, event) {
    const part = findPart(document, partId);
    if (!part) throw new Error(`Unknown score part: ${partId}`);
    const normalized = normalizeEvent(event, part, document);
    if (normalized.type !== "note" || normalized.grace) return [insertEvent(document, partId, normalized)];
    const requestedVoice = normalized.voice;
    const overlaps = part.events.filter(item => item.type === "note"
      && item.measure === normalized.measure
      && item.staff === normalized.staff
      && item.voice === requestedVoice
      && rhythmIntervalsOverlap(item, normalized));
    const voice = chooseRhythmicVoice(part, normalized, true);
    if (!voice) throw new RangeError("A staff supports at most four overlapping rhythmic voices.");
    normalized.voice = voice;
    overlaps.filter(item => item.tick < normalized.tick && item.tick + item.durationTicks > normalized.tick)
      .forEach(item => replaceNoteWithPieces(document, part, item, noteSeedsAtBoundaries(document, item, [normalized.tick])));
    const incomingBoundaries = [...new Set(overlaps.map(item => item.tick).filter(tick => tick > normalized.tick && tick < normalized.tick + normalized.durationTicks))].sort((a, b) => a - b);
    const incomingSeeds = noteSeedsAtBoundaries(document, normalized, incomingBoundaries);
    const incomingPieces = buildContinuationPieces(document, part, normalized, incomingSeeds);
    const inserted = incomingPieces.map(piece => insertEvent(document, partId, piece, { preserveVoice: true }));
    sortEvents(part);
    document.modifiedAt = new Date().toISOString();
    return [...new Map(inserted.map(item => [item.id, item])).values()];
  }

  function buildTiedNoteSpans(document, part, predicate = () => true) {
    const spans = [];
    const openTies = new Map();
    part.events.filter(event => event.type === "note" && predicate(event))
      .sort((a, b) => documentAbsoluteTick(document, a) - documentAbsoluteTick(document, b) || a.staff - b.staff || a.voice - b.voice)
      .forEach(event => {
        const startTick = documentAbsoluteTick(document, event);
        const endTick = startTick + event.durationTicks;
        event.pitches.forEach((pitch, pitchIndex) => {
          const key = `${event.staff}:${event.voice}:${pitch.midi}`;
          const tieStop = Boolean(pitch.tieStop ?? event.tieStop);
          const tieStart = Boolean(pitch.tieStart ?? event.tieStart);
          const open = openTies.get(key);
          let span = tieStop && open?.endTick === startTick ? open : null;
          if (span) {
            span.endTick = endTick;
            span.endEvent = event;
          } else {
            span = { partId: part.id, event, endEvent: event, pitch, pitchIndex, startTick, endTick };
            spans.push(span);
          }
          if (tieStart) openTies.set(key, span);
          else openTies.delete(key);
        });
      });
    return spans;
  }

  function removeEvents(document, ids) {
    const wanted = new Set(ids || []);
    const removed = [];
    for (const part of document.parts) {
      part.events = part.events.filter(event => {
        if (!wanted.has(event.id)) return true;
        removed.push({ partId: part.id, event: clone(event) });
        return false;
      });
    }
    if (removed.length) document.modifiedAt = new Date().toISOString();
    return removed;
  }

  function findEvent(document, eventId) {
    for (const part of document.parts) {
      const event = part.events.find(item => item.id === eventId);
      if (event) return { part, event };
    }
    return null;
  }

  function quantizeStep(code) {
    return durationTicks[String(code)] || durationTicks["16"];
  }

  const restCandidates = Object.freeze(durationOrder.flatMap(code => [
      { code, ticks: durationTicks[code] * 1.75, dots: 2 },
      { code, ticks: durationTicks[code] * 1.5, dots: 1 },
      { code, ticks: durationTicks[code], dots: 0 }
    ]).map(item => ({ ...item, ticks: Math.round(item.ticks) })).sort((a, b) => b.ticks - a.ticks));

  const tripletCandidates = Object.freeze([
    { code: "h", ticks: 640, dots: 0, tuplet: { num: 3, inTimeOf: 2 } },
    { code: "q", ticks: 320, dots: 0, tuplet: { num: 3, inTimeOf: 2 } },
    { code: "8", ticks: 160, dots: 0, tuplet: { num: 3, inTimeOf: 2 } },
    { code: "16", ticks: 80, dots: 0, tuplet: { num: 3, inTimeOf: 2 } },
    { code: "32", ticks: 40, dots: 0, tuplet: { num: 3, inTimeOf: 2 } }
  ]);

  const tripletValueCodes = Object.freeze({ 3: "h", 6: "q", 12: "8", 24: "16", 48: "32" });

  function dotFactor(dots = 0) {
    return Number(dots) === 1 ? 1.5 : Number(dots) === 2 ? 1.75 : 1;
  }

  function rhythmValueSpec(value, dots = 0) {
    const normalizedDots = Math.round(clamp(dots, 0, 2, 0));
    const text = String(value || "q");
    const tripletMatch = text.match(/^(?:triplet:|1\/)(3|6|12|24|48)$/);
    if (tripletMatch) {
      const denominator = Number(tripletMatch[1]);
      const code = tripletValueCodes[denominator];
      return {
        value: `triplet:${denominator}`,
        restCode: code,
        dots: normalizedDots,
        durationTicks: Math.round(durationTicks[code] * dotFactor(normalizedDots) * 2 / 3),
        tuplet: { id: uid("tuplet"), num: 3, inTimeOf: 2, index: 0 }
      };
    }
    const code = durationOrder.includes(text) ? text : "q";
    return {
      value: code,
      restCode: code,
      dots: normalizedDots,
      durationTicks: Math.round(durationTicks[code] * dotFactor(normalizedDots)),
      tuplet: null
    };
  }

  function rhythmValueForEvent(event) {
    if (event?.tuplet?.num === 3 && event?.tuplet?.inTimeOf === 2) {
      const nominalTicks = event.durationTicks * 3 / 2 / dotFactor(event.dots);
      const entry = Object.entries(tripletValueCodes).find(([, code]) => Math.abs(durationTicks[code] - nominalTicks) < 0.5);
      if (entry) return `triplet:${entry[0]}`;
    }
    if (durationOrder.includes(event?.restCode)) return event.restCode;
    const nominalTicks = Number(event?.durationTicks) / dotFactor(event?.dots);
    return durationOrder.reduce((best, code) => Math.abs(durationTicks[code] - nominalTicks) < Math.abs(durationTicks[best] - nominalTicks) ? code : best, "q");
  }

  function continuationPiece(original, seed, index, count) {
    const first = index === 0;
    const last = index === count - 1;
    const piece = {
      ...clone(original),
      ...clone(seed),
      id: first ? original.id : uid("note"),
      rawTick: null,
      rawDurationTicks: null,
      tieStart: !last || Boolean(original.tieStart),
      tieStop: !first || Boolean(original.tieStop),
      slurStart: first && Boolean(original.slurStart),
      slurStop: last && Boolean(original.slurStop)
    };
    if (!first) {
      piece.articulations = [];
      piece.ornament = null;
      piece.dynamic = null;
      piece.lyrics = [];
      piece.chordSymbol = "";
      piece.text = "";
    }
    piece.pitches = original.pitches.map(pitch => ({
      ...clone(pitch),
      tieStart: !last || Boolean(pitch.tieStart ?? original.tieStart),
      tieStop: !first || Boolean(pitch.tieStop ?? original.tieStop)
    }));
    return piece;
  }

  function buildContinuationPieces(document, part, original, seeds) {
    const pieces = seeds.map((seed, index) => normalizeEvent(continuationPiece(original, seed, index, seeds.length), part, document));
    if (isTabPart(part)) pieces.forEach(piece => normalizeTabPositions(piece, part));
    return pieces;
  }

  function replaceNoteWithPieces(document, part, original, seeds) {
    const originalIndex = part.events.indexOf(original);
    if (originalIndex < 0) return [];
    const pieces = buildContinuationPieces(document, part, original, seeds);
    part.events.splice(originalIndex, 1, ...pieces);
    sortEvents(part);
    document.modifiedAt = new Date().toISOString();
    return pieces;
  }

  function intervalNotationSeeds(document, event, tick, duration) {
    const exact = notationForSpan(duration);
    if (exact.restCode) return [{ measure: event.measure, tick, durationTicks: duration, ...exact, staff: event.staff, voice: event.voice }];
    const time = document.measures[event.measure]?.time || document.settings.time;
    return splitRestSpan(time, tick, duration).map(fragment => ({ measure: event.measure, ...fragment, staff: event.staff, voice: event.voice }));
  }

  function noteSeedsAtBoundaries(document, event, boundaries = []) {
    const end = event.tick + event.durationTicks;
    const internal = boundaries.filter(tick => tick > event.tick && tick < end);
    if (!internal.length) {
      return [{
        measure: event.measure,
        tick: event.tick,
        durationTicks: event.durationTicks,
        restCode: event.restCode,
        dots: event.dots,
        tuplet: event.tuplet ? clone(event.tuplet) : null,
        staff: event.staff,
        voice: event.voice
      }];
    }
    const points = [event.tick, ...internal, end].sort((a, b) => a - b);
    return points.slice(0, -1).flatMap((start, index) => intervalNotationSeeds(document, event, start, points[index + 1] - start));
  }

  function splitNoteEvent(document, partId, eventId, count) {
    const part = findPart(document, partId);
    const found = findEvent(document, eventId);
    const amount = Math.round(Number(count));
    if (!part || !found || found.part.id !== part.id || found.event.type !== "note" || ![2, 3].includes(amount)) return [];
    const event = found.event;
    const childTicks = event.durationTicks / amount;
    const notation = Number.isInteger(childTicks) ? notationForSpan(childTicks) : { restCode: null };
    if (childTicks < durationTicks["64"] || !notation.restCode) {
      throw new RangeError("The resulting note is smaller than a 1/64 note or a 1/48 triplet.");
    }
    const tupletId = notation.tuplet ? (event.tuplet?.id || uid("tuplet")) : null;
    const seeds = Array.from({ length: amount }, (_, index) => ({
      measure: event.measure,
      tick: event.tick + index * childTicks,
      durationTicks: childTicks,
      restCode: notation.restCode,
      dots: notation.dots || 0,
      tuplet: notation.tuplet ? { ...notation.tuplet, id: tupletId, index: event.tuplet ? (Number(event.tuplet.index) || 0) * amount + index : index } : null,
      voice: event.voice,
      staff: event.staff
    }));
    return replaceNoteWithPieces(document, part, event, seeds);
  }

  function durationSeeds(document, event, spec) {
    const firstMeasure = event.measure;
    const firstSize = measureTicks(document.measures[firstMeasure]?.time || document.settings.time);
    if (event.tick + spec.durationTicks <= firstSize) {
      return [{ measure: firstMeasure, tick: event.tick, durationTicks: spec.durationTicks, restCode: spec.restCode, dots: spec.dots, tuplet: spec.tuplet }];
    }
    const seeds = [];
    let remaining = spec.durationTicks;
    let measureIndex = firstMeasure;
    let tick = event.tick;
    while (remaining > 0) {
      ensureMeasures(document, measureIndex + 1);
      const time = document.measures[measureIndex].time;
      const capacity = measureTicks(time) - tick;
      if (capacity <= 0) {
        measureIndex += 1;
        tick = 0;
        continue;
      }
      const span = Math.min(remaining, capacity);
      const exact = notationForSpan(span);
      if (exact.restCode) {
        seeds.push({ measure: measureIndex, tick, durationTicks: span, ...exact });
      } else {
        const fragments = splitRestSpan(time, tick, span);
        if (!fragments.length || fragments.some(fragment => fragment.durationTicks < durationTicks["64"])) {
          throw new RangeError("The edited duration cannot be represented at the current position.");
        }
        fragments.forEach(fragment => seeds.push({ measure: measureIndex, ...fragment }));
      }
      remaining -= span;
      measureIndex += 1;
      tick = 0;
    }
    return seeds;
  }

  function setNoteRhythm(document, partId, eventId, value, dots = 0) {
    const part = findPart(document, partId);
    const found = findEvent(document, eventId);
    if (!part || !found || found.part.id !== part.id || found.event.type !== "note") return [];
    const event = found.event;
    const spec = rhythmValueSpec(value, dots);
    const seeds = durationSeeds(document, event, spec);
    const otherEvents = part.events.filter(item => item.id !== event.id);
    const candidates = [event.voice, 1, 2, 3, 4].filter((voice, index, list) => list.indexOf(voice) === index);
    const voice = candidates.find(candidate => seeds.every(seed => !otherEvents.some(item => ["note", "rest"].includes(item.type)
      && item.measure === seed.measure && item.staff === event.staff && item.voice === candidate
      && item.tick < seed.tick + seed.durationTicks && seed.tick < item.tick + item.durationTicks)));
    if (!voice) throw new RangeError("A staff supports at most four overlapping rhythmic voices.");
    seeds.forEach(seed => { seed.voice = voice; seed.staff = event.staff; });
    return replaceNoteWithPieces(document, part, event, seeds);
  }

  function restGroupTicks(time) {
    const beat = Math.round(PPQ * 4 / time.beatType);
    if (time.beatType === 8 && time.beats >= 6 && time.beats % 3 === 0) return beat * 3;
    if (time.beatType === 4 && time.beats === 4) return beat * 2;
    return beat;
  }

  function derivedRest(part, measureIndex, staff, voice, tick, candidate, duration, wholeMeasure = false) {
    return {
      id: `derived-rest-${part.id}-${measureIndex}-${staff}-${voice}-${tick}`,
      type: "rest",
      measure: measureIndex,
      tick,
      durationTicks: duration,
      restCode: candidate?.code || "64",
      staff,
      voice,
      dots: candidate?.dots || 0,
      tuplet: candidate?.tuplet ? { id: `derived-tuplet-${part.id}-${measureIndex}-${staff}-${voice}-${tick}`, ...candidate.tuplet } : null,
      derived: true,
      wholeMeasureRest: wholeMeasure,
      pitches: [],
      velocity: 0,
      articulations: [],
      lyrics: [],
      beam: "none"
    };
  }

  function restEventsForGap(part, measureIndex, staff, voice, start, end, time) {
    if (end <= start) return [];
    const size = measureTicks(time);
    if (start === 0 && end === size) return [derivedRest(part, measureIndex, staff, voice, 0, { code: "w" }, size, true)];
    const rests = [];
    const group = Math.max(1, restGroupTicks(time));
    let cursor = start;
    while (cursor < end) {
      const nextBoundary = Math.min(end, (Math.floor(cursor / group) + 1) * group);
      let remaining = nextBoundary - cursor;
      while (remaining > 0) {
        const candidate = restCandidates.find(item => item.ticks <= remaining) || { code: "64", ticks: remaining, dots: 0 };
        rests.push(derivedRest(part, measureIndex, staff, voice, cursor, candidate, candidate.ticks));
        cursor += candidate.ticks;
        remaining -= candidate.ticks;
      }
    }
    return rests;
  }

  function completeTupletGroups(events, part, measureIndex, staff, voice, size) {
    const completed = [...events];
    const groups = new Map();
    events.filter(event => event.tuplet?.id).forEach(event => {
      if (!groups.has(event.tuplet.id)) groups.set(event.tuplet.id, []);
      groups.get(event.tuplet.id).push(event);
    });
    groups.forEach(group => {
      const ordered = group.sort((a, b) => a.tick - b.tick || a.id.localeCompare(b.id));
      const first = ordered[0];
      const num = Math.max(2, Number(first.tuplet.num) || 3);
      const duration = Math.max(1, Number(first.durationTicks) || 1);
      const explicitIndices = ordered.map(event => Number(event.tuplet.index));
      const hasStableIndices = new Set(explicitIndices).size === explicitIndices.length && explicitIndices.every(index => Number.isInteger(index) && index >= 0 && index < num);
      const indexed = ordered.map((event, order) => ({ event, index: hasStableIndices ? Number(event.tuplet.index) : order }));
      const start = Math.min(...indexed.map(item => item.event.tick - item.index * duration));
      const occupied = new Set(indexed.map(item => item.index));
      const nominalTicks = duration * num / Math.max(1, Number(first.tuplet.inTimeOf) || 2);
      const restCode = first.restCode || durationOrder.reduce((best, code) => Math.abs(durationTicks[code] - nominalTicks) < Math.abs(durationTicks[best] - nominalTicks) ? code : best, "q");
      for (let index = 0; index < num; index += 1) {
        const tick = start + index * duration;
        if (occupied.has(index) || tick < 0 || tick + duration > size) continue;
        completed.push(derivedRest(part, measureIndex, staff, voice, tick, {
          code: restCode,
          dots: first.dots || 0,
          tuplet: { id: first.tuplet.id, num, inTimeOf: Number(first.tuplet.inTimeOf) || 2, index }
        }, duration));
      }
    });
    return completed.sort((a, b) => a.tick - b.tick || a.id.localeCompare(b.id));
  }

  function buildVoiceTimeline(document, part, measureIndex, staff = 0, voice = 1) {
    const measure = document.measures[measureIndex];
    if (!measure || !part) return [];
    const size = measureTicks(measure.time || document.settings.time);
    const sourceEvents = part.events
      .filter(event => event.measure === measureIndex && event.staff === staff && event.voice === voice && ["note", "rest"].includes(event.type))
      .sort((a, b) => a.tick - b.tick || a.id.localeCompare(b.id));
    const events = completeTupletGroups(sourceEvents, part, measureIndex, staff, voice, size);
    const timeline = [];
    let cursor = 0;
    events.forEach(event => {
      const start = Math.max(0, Math.min(size, event.tick));
      if (start > cursor) timeline.push(...restEventsForGap(part, measureIndex, staff, voice, cursor, start, measure.time));
      timeline.push(event);
      cursor = Math.max(cursor, Math.min(size, start + event.durationTicks));
    });
    if (cursor < size) timeline.push(...restEventsForGap(part, measureIndex, staff, voice, cursor, size, measure.time));
    return timeline;
  }

  function splitRestSpan(time, start, duration) {
    const size = measureTicks(time);
    const from = Math.max(0, Math.min(size, Math.round(Number(start) || 0)));
    const to = Math.max(from, Math.min(size, from + Math.max(0, Math.round(Number(duration) || 0))));
    return restEventsForGap({ id: "explicit" }, 0, 0, 1, from, to, time).map(event => ({
      tick: event.tick,
      durationTicks: event.durationTicks,
      restCode: event.restCode,
      dots: event.dots,
      tuplet: event.tuplet ? { num: event.tuplet.num, inTimeOf: event.tuplet.inTimeOf } : null,
      wholeMeasureRest: event.wholeMeasureRest
    }));
  }

  function normalizeExplicitRests(document, partIds = null) {
    const allowed = partIds ? new Set(Array.isArray(partIds) ? partIds : [partIds]) : null;
    document.parts.forEach(part => {
      if (allowed && !allowed.has(part.id)) return;
      const groups = new Map();
      part.events.filter(event => event.type === "rest" && !event.tuplet && !event.text && !event.dynamic && !(event.articulations || []).length).forEach(event => {
        const key = `${event.measure}:${event.staff}:${event.voice}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(event);
      });
      const remove = new Set();
      const add = [];
      groups.forEach(events => {
        const ordered = events.sort((a, b) => a.tick - b.tick || a.id.localeCompare(b.id));
        let cluster = [];
        const flush = () => {
          if (cluster.length < 2) { cluster = []; return; }
          const first = cluster[0];
          const end = Math.max(...cluster.map(item => item.tick + item.durationTicks));
          cluster.forEach(item => remove.add(item.id));
          splitRestSpan(document.measures[first.measure].time, first.tick, end - first.tick).forEach(segment => add.push({
            ...first,
            ...segment,
            id: uid("rest"),
            measure: first.measure,
            staff: first.staff,
            voice: first.voice,
            tuplet: segment.tuplet ? { id: uid("tuplet"), ...segment.tuplet } : null
          }));
          cluster = [];
        };
        ordered.forEach(event => {
          const end = cluster.length ? Math.max(...cluster.map(item => item.tick + item.durationTicks)) : -1;
          if (cluster.length && event.tick > end) flush();
          cluster.push(event);
        });
        flush();
      });
      if (remove.size) {
        part.events = part.events.filter(event => !remove.has(event.id));
        part.events.push(...add);
        sortEvents(part);
      }
    });
    return document;
  }

  function quantizeDocument(document, code = document.settings.quantize || "16", options = {}) {
    const grid = quantizeStep(code);
    const preserveRaw = options.preserveRaw !== false;
    for (const part of document.parts) {
      for (const event of part.events) {
        if (!["note", "rest", "pedal"].includes(event.type)) continue;
        if (preserveRaw && event.rawTick === null) event.rawTick = event.tick;
        if (preserveRaw && event.rawDurationTicks === null) event.rawDurationTicks = event.durationTicks;
        event.tick = Math.max(0, Math.round(event.tick / grid) * grid);
        event.durationTicks = Math.max(grid / 2, Math.round(event.durationTicks / grid) * grid || grid);
      }
      const merged = [];
      const chordByPosition = new Map();
      for (const event of part.events) {
        if (event.type !== "note") {
          merged.push(event);
          continue;
        }
        event.voice = chooseRhythmicVoice({ ...part, events: merged }, event);
        const key = `${event.measure}:${event.tick}:${event.staff}:${event.voice}:${event.durationTicks}:${event.dots}:${event.tuplet?.num || 0}:${event.tuplet?.inTimeOf || 0}`;
        const chord = chordByPosition.get(key);
        if (!chord) {
          chordByPosition.set(key, event);
          merged.push(event);
          continue;
        }
        const pitchMidis = new Set(chord.pitches.map(pitch => pitch.midi));
        event.pitches.forEach(pitch => { if (!pitchMidis.has(pitch.midi)) chord.pitches.push(pitch); });
        chord.pitches.sort((a, b) => a.midi - b.midi);
        chord.rawTick = chord.rawTick === null ? event.rawTick : Math.min(chord.rawTick, event.rawTick ?? chord.rawTick);
        chord.rawDurationTicks = Math.max(chord.rawDurationTicks || 0, event.rawDurationTicks || 0) || null;
        chord.velocity = Math.max(chord.velocity, event.velocity);
      }
      part.events = merged;
      sortEvents(part);
    }
    document.settings.quantize = String(code);
    document.modifiedAt = new Date().toISOString();
    return document;
  }

  function restoreRawTiming(document) {
    for (const part of document.parts) {
      for (const event of part.events) {
        if (event.rawTick !== null) event.tick = Math.max(0, Math.round(event.rawTick));
        if (event.rawDurationTicks !== null) event.durationTicks = Math.max(1, Math.round(event.rawDurationTicks));
      }
      sortEvents(part);
    }
    document.modifiedAt = new Date().toISOString();
    return document;
  }

  class History {
    constructor(limit = 160) {
      this.limit = limit;
      this.undoStack = [];
      this.redoStack = [];
    }
    push(before, after, label = "edit") {
      this.undoStack.push({ before: clone(before), after: clone(after), label });
      if (this.undoStack.length > this.limit) this.undoStack.shift();
      this.redoStack.length = 0;
    }
    undo(current) {
      const item = this.undoStack.pop();
      if (!item) return current;
      this.redoStack.push({ before: clone(item.before), after: clone(current), label: item.label });
      return normalizeDocument(item.before);
    }
    redo(current) {
      const item = this.redoStack.pop();
      if (!item) return current;
      this.undoStack.push({ before: clone(current), after: clone(item.after), label: item.label });
      return normalizeDocument(item.after);
    }
    clear() { this.undoStack.length = 0; this.redoStack.length = 0; }
    get canUndo() { return this.undoStack.length > 0; }
    get canRedo() { return this.redoStack.length > 0; }
  }

  function xmlEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
  }

  function musicXmlType(ticks) {
    const nearest = durationOrder.reduce((best, code) => Math.abs(durationTicks[code] - ticks) < Math.abs(durationTicks[best] - ticks) ? code : best, "q");
    return ({ w: "whole", h: "half", q: "quarter", 8: "eighth", 16: "16th", 32: "32nd", 64: "64th" })[nearest];
  }

  function musicXmlAccidental(alter) {
    return ({ "-3": "triple-flat", "-2": "flat-flat", "-1": "flat", 0: "natural", 1: "sharp", 2: "double-sharp", 3: "triple-sharp" })[String(alter)] || "natural";
  }

  function musicXmlAccidentalSequence(types, alter) {
    const sequence = Array.isArray(types) ? types.join("") : "";
    return ({ "n#": "natural-sharp", "nb": "natural-flat", "###": "triple-sharp", bbb: "triple-flat", "##": "double-sharp", bb: "flat-flat", n: "natural", "#": "sharp", b: "flat" })[sequence]
      || musicXmlAccidental(alter);
  }

  function eventToMusicXml(event, attributes = {}) {
    const parts = [];
    const pitches = event.type === "rest" ? [null] : event.pitches;
    pitches.forEach((pitch, index) => {
      parts.push("      <note>");
      if (index > 0) parts.push("        <chord/>");
      if (event.grace) parts.push("        <grace/>");
      if (!pitch) parts.push(event.wholeMeasureRest ? '        <rest measure="yes"/>' : "        <rest/>");
      else if (attributes.percussion) {
        parts.push(`        <unpitched><display-step>${pitch.step}</display-step><display-octave>${pitch.octave}</display-octave></unpitched>`);
        parts.push(`        <instrument id="${attributes.instrumentId}"/>`);
      }
      else {
        parts.push(`        <pitch><step>${pitch.step}</step>${pitch.alter ? `<alter>${pitch.alter}</alter>` : ""}<octave>${pitch.octave}</octave></pitch>`);
        const accidentalTypes = attributes.accidentals?.[index] || [];
        if (accidentalTypes.length || pitch.accidental) parts.push(`        <accidental>${xmlEscape(musicXmlAccidentalSequence(accidentalTypes, pitch.alter))}</accidental>`);
      }
      if (!event.grace) parts.push(`        <duration>${Math.max(1, Math.round(event.durationTicks))}</duration>`);
      parts.push(`        <voice>${event.voice}</voice>`);
      const explicitType = ({ w: "whole", h: "half", q: "quarter", 8: "eighth", 16: "16th", 32: "32nd", 64: "64th" })[event.restCode];
      parts.push(`        <type>${event.wholeMeasureRest ? "whole" : explicitType || musicXmlType(event.tuplet ? event.durationTicks * event.tuplet.num / event.tuplet.inTimeOf : event.durationTicks)}</type>`);
      for (let dot = 0; dot < event.dots; dot += 1) parts.push("        <dot/>");
      if (event.tuplet) parts.push(`        <time-modification><actual-notes>${event.tuplet.num}</actual-notes><normal-notes>${event.tuplet.inTimeOf}</normal-notes></time-modification>`);
      parts.push(`        <staff>${event.staff + 1}</staff>`);
      const pitchTieStart = Boolean(pitch?.tieStart ?? event.tieStart);
      const pitchTieStop = Boolean(pitch?.tieStop ?? event.tieStop);
      if (pitchTieStart) parts.push('        <tie type="start"/>');
      if (pitchTieStop) parts.push('        <tie type="stop"/>');
      const notation = [];
      if (pitchTieStart) notation.push('<tied type="start"/>');
      if (pitchTieStop) notation.push('<tied type="stop"/>');
      if (event.slurStart) notation.push(`<slur type="start" number="1"/>`);
      if (event.slurStop) notation.push(`<slur type="stop" number="1"/>`);
      if (event.articulations.length) {
        const articulationNames = { "a.": "staccato", "a>": "accent", "a-": "tenuto", "a^": "strong-accent" };
        notation.push(`<articulations>${event.articulations.map(name => `<${xmlEscape(articulationNames[name] || name)}/>`).join("")}</articulations>`);
      }
      if (event.ornament) notation.push(`<ornaments><${xmlEscape(event.ornament)}/></ornaments>`);
      if (event.tuplet && attributes.tupletStart) notation.push('<tuplet type="start"/>');
      if (event.tuplet && attributes.tupletStop) notation.push('<tuplet type="stop"/>');
      const tabPosition = event.tab?.positions?.find(item => item.pitchIndex === index);
      if (tabPosition && pitch) notation.push(`<technical><string>${tabPosition.string}</string><fret>${tabPosition.fret}</fret></technical>`);
      if (event.beam && event.beam !== "auto" && event.beam !== "none" && index === 0) parts.push(`        <beam number="1">${event.beam}</beam>`);
      if (notation.length) parts.push(`        <notations>${notation.join("")}</notations>`);
      for (const lyric of event.lyrics) {
        parts.push(`        <lyric number="${lyric.verse}"><syllabic>${xmlEscape(lyric.syllabic)}</syllabic><text>${xmlEscape(lyric.text)}</text>${lyric.extend ? "<extend/>" : ""}</lyric>`);
      }
      parts.push("      </note>");
    });
    return parts.join("\n");
  }

  function exportMusicXml(document) {
    const doc = normalizeDocument(document);
    const lines = [
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
      '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">',
      '<score-partwise version="4.0">',
      `  <work><work-title>${xmlEscape(doc.title)}</work-title></work>`,
      `  <identification><creator type="composer">${xmlEscape(doc.composer)}</creator><creator type="lyricist">${xmlEscape(doc.lyricist)}</creator><encoding><software>Q-board Score</software><encoding-date>${new Date().toISOString().slice(0, 10)}</encoding-date></encoding></identification>`,
      "  <part-list>"
    ];
    doc.parts.forEach((part, index) => {
      lines.push(`    <score-part id="P${index + 1}"><part-name>${xmlEscape(part.name)}</part-name><part-abbreviation>${xmlEscape(part.shortName)}</part-abbreviation><score-instrument id="P${index + 1}-I1"><instrument-name>${xmlEscape(part.instrumentId)}</instrument-name></score-instrument><midi-instrument id="P${index + 1}-I1"><midi-channel>${part.notationType === "percussion" ? 10 : (index % 15) + 1}</midi-channel><midi-program>1</midi-program><volume>${Math.round(part.volume * 100)}</volume></midi-instrument></score-part>`);
    });
    lines.push("  </part-list>");
    doc.parts.forEach((part, partIndex) => {
      lines.push(`  <part id="P${partIndex + 1}">`);
      doc.measures.forEach((measure, measureIndex) => {
        const events = part.events.filter(event => event.measure === measureIndex).sort((a, b) => a.tick - b.tick || a.voice - b.voice);
        lines.push(`    <measure number="${measureIndex + 1}"${measure.pickupTicks ? ' implicit="yes"' : ""}>`);
        if (measure.systemBreak || measure.pageBreak) lines.push(`      <print${measure.systemBreak ? ' new-system="yes"' : ""}${measure.pageBreak ? ' new-page="yes"' : ""}/>`);
        lines.push("      <attributes>", `        <divisions>${PPQ}</divisions>`);
        const previousMeasure = measureIndex ? doc.measures[measureIndex - 1] : null;
        const keyChanged = !previousMeasure || previousMeasure.key.fifths !== measure.key.fifths || previousMeasure.key.mode !== measure.key.mode;
        const timeChanged = !previousMeasure || previousMeasure.time.beats !== measure.time.beats || previousMeasure.time.beatType !== measure.time.beatType;
        if (part.notationType !== "percussion" && keyChanged) {
          const cancel = previousMeasure?.key?.fifths ? `<cancel>${previousMeasure.key.fifths}</cancel>` : "";
          lines.push(`        <key>${cancel}<fifths>${Number(measure.key?.fifths ?? doc.settings.key.fifths) || 0}</fifths><mode>${xmlEscape(measure.key?.mode || doc.settings.key.mode || "major")}</mode></key>`);
        }
        if (timeChanged) lines.push(`        <time><beats>${measure.time?.beats || doc.settings.time.beats}</beats><beat-type>${measure.time?.beatType || doc.settings.time.beatType}</beat-type></time>`);
        const staffCount = part.notationType === "grand" || isTabPart(part) ? 2 : 1;
        lines.push(`        <staves>${staffCount}</staves>`);
        part.clefs.slice(0, staffCount).forEach((clef, index) => {
          const clefData = clef === "bass" ? ["F", 4] : clef === "percussion" ? ["percussion", 2] : ["G", 2];
          lines.push(`        <clef number="${index + 1}"><sign>${clefData[0]}</sign><line>${clefData[1]}</line></clef>`);
        });
        if (isTabPart(part)) {
          lines.push(`        <staff-details number="2"><staff-type>alternate</staff-type><staff-lines>${part.tuning.length}</staff-lines>${part.tuning.map((midi, index) => { const pitch = spellingFromMidi(midi); return `<staff-tuning line="${index + 1}"><tuning-step>${pitch.step}</tuning-step>${pitch.alter ? `<tuning-alter>${pitch.alter}</tuning-alter>` : ""}<tuning-octave>${pitch.octave}</tuning-octave></staff-tuning>`; }).join("")}</staff-details>`);
        }
        if (measure.multipleRest > 1) lines.push(`        <measure-style><multiple-rest>${measure.multipleRest}</multiple-rest></measure-style>`);
        if (part.transposition.chromatic || part.transposition.octave) lines.push(`        <transpose><diatonic>${part.transposition.diatonic}</diatonic><chromatic>${part.transposition.chromatic}</chromatic>${part.transposition.octave ? `<octave-change>${part.transposition.octave}</octave-change>` : ""}</transpose>`);
        lines.push("      </attributes>");
        const previousTempo = measureIndex ? doc.measures[measureIndex - 1].tempo : null;
        if (measureIndex === 0 || measure.tempo !== previousTempo) lines.push(`      <direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${measure.tempo}</per-minute></metronome></direction-type><sound tempo="${measure.tempo}"/></direction>`);
        if (measure.repeatStart) lines.push('      <barline location="left"><repeat direction="forward"/></barline>');
        const pedalEvents = events.filter(event => event.type === "pedal");
        pedalEvents.forEach(event => lines.push(`      <direction placement="below"><offset>${event.tick}</offset><direction-type><pedal type="${event.value ? "start" : "stop"}" line="yes"/></direction-type><sound damper-pedal="${event.value ? 100 : 0}"/></direction>`));
        const voiceGroups = new Map();
        const staffCountForVoices = part.notationType === "grand" || isTabPart(part) ? 2 : 1;
        for (let staff = 0; staff < staffCountForVoices; staff += 1) {
          const usedVoices = new Set([1]);
          events.filter(event => ["note", "rest"].includes(event.type) && event.staff === staff).forEach(event => usedVoices.add(event.voice));
          [...usedVoices].sort((a, b) => a - b).forEach(voice => {
            voiceGroups.set(`${staff}:${voice}`, buildVoiceTimeline(doc, part, measureIndex, staff, voice));
          });
        }
        const measureAccidentals = accidentalPlan(events, measure.key?.fifths || 0);
        let firstVoice = true;
        for (const voiceEvents of voiceGroups.values()) {
          if (!firstVoice) lines.push(`      <backup><duration>${measureTicks(measure.time || doc.settings.time)}</duration></backup>`);
          firstVoice = false;
          let cursor = 0;
          for (const event of voiceEvents) {
            if (event.tick > cursor) lines.push(`      <forward><duration>${event.tick - cursor}</duration></forward>`);
          if (event.dynamic) lines.push(`      <direction placement="below"><direction-type><dynamics><${xmlEscape(event.dynamic)}/></dynamics></direction-type></direction>`);
          if (event.chordSymbol) lines.push(`      <harmony><root><root-step>${xmlEscape(event.chordSymbol[0] || "C")}</root-step></root><kind text="${xmlEscape(event.chordSymbol)}">other</kind></harmony>`);
          if (event.text) lines.push(`      <direction placement="above"><direction-type><words>${xmlEscape(event.text)}</words></direction-type></direction>`);
            const tupletGroup = event.tuplet ? voiceEvents.filter(item => item.tuplet?.id === event.tuplet.id) : [];
            lines.push(eventToMusicXml(event, {
              percussion: part.notationType === "percussion",
              instrumentId: `P${partIndex + 1}-I1`,
              tupletStart: tupletGroup[0] === event,
              tupletStop: tupletGroup[tupletGroup.length - 1] === event,
              accidentals: measureAccidentals.get(event.id)
            }));
          cursor = Math.max(cursor, event.tick + event.durationTicks);
          }
        }
        if (measure.ending) lines.push(`      <barline location="right"><ending number="${xmlEscape(measure.ending)}" type="start"/></barline>`);
        if (measure.repeatEnd) lines.push('      <barline location="right"><repeat direction="backward"/></barline>');
        lines.push("    </measure>");
      });
      lines.push("  </part>");
    });
    lines.push("</score-partwise>");
    return lines.join("\n");
  }

  function u32(value) {
    return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
  }

  function u16(value) {
    return [(value >>> 8) & 255, value & 255];
  }

  function variableLength(value) {
    let buffer = value & 0x7f;
    const bytes = [];
    while ((value >>= 7)) buffer <<= 8, buffer |= (value & 0x7f) | 0x80;
    while (true) {
      bytes.push(buffer & 0xff);
      if (buffer & 0x80) buffer >>= 8;
      else break;
    }
    return bytes;
  }

  function textBytes(value) {
    return [...new TextEncoder().encode(String(value || ""))];
  }

  function midiTrack(events) {
    const bytes = [];
    let previousTick = 0;
    events.sort((a, b) => a.tick - b.tick || a.order - b.order).forEach(event => {
      bytes.push(...variableLength(Math.max(0, event.tick - previousTick)), ...event.bytes);
      previousTick = event.tick;
    });
    bytes.push(0, 0xff, 0x2f, 0);
    return [...textBytes("MTrk"), ...u32(bytes.length), ...bytes];
  }

  function absoluteTick(document, event) {
    let tick = 0;
    for (let index = 0; index < event.measure; index += 1) tick += measureTicks(document.measures[index]?.time || document.settings.time);
    return tick + event.tick;
  }

  function exportMidi(document) {
    const doc = normalizeDocument(document);
    const meta = [
      { tick: 0, order: 0, bytes: [0xff, 0x03, ...variableLength(textBytes(doc.title).length), ...textBytes(doc.title)] }
    ];
    let measureStart = 0;
    doc.measures.forEach((measure, index) => {
      const previous = doc.measures[index - 1];
      if (!previous || measure.tempo !== previous.tempo) {
        const tempo = Math.round(60000000 / measure.tempo);
        meta.push({ tick: measureStart, order: 1, bytes: [0xff, 0x51, 3, (tempo >>> 16) & 255, (tempo >>> 8) & 255, tempo & 255] });
      }
      if (!previous || measure.time.beats !== previous.time.beats || measure.time.beatType !== previous.time.beatType) {
        meta.push({ tick: measureStart, order: 2, bytes: [0xff, 0x58, 4, measure.time.beats, Math.log2(measure.time.beatType), 24, 8] });
      }
      measureStart += measureTicks(measure.time);
    });
    const tracks = [midiTrack(meta)];
    doc.parts.forEach((part, index) => {
      const channel = part.notationType === "percussion" ? 9 : index % 15 + (index % 15 >= 9 ? 1 : 0);
      const events = [{ tick: 0, order: 0, bytes: [0xff, 0x03, ...variableLength(textBytes(part.name).length), ...textBytes(part.name)] }];
      part.events.filter(event => event.type === "note").forEach(event => {
        const start = absoluteTick(doc, event);
        for (const pitch of event.pitches) {
          const midi = Math.round(clamp(pitch.midi + part.transposition.chromatic + part.transposition.octave * 12 + part.outputShift, 0, 127, pitch.midi));
          events.push({ tick: start, order: 2, bytes: [0x90 | channel, midi, event.velocity] });
          events.push({ tick: start + event.durationTicks, order: 1, bytes: [0x80 | channel, midi, 0] });
        }
      });
      part.events.filter(event => event.type === "pedal").forEach(event => {
        const tick = absoluteTick(doc, event);
        events.push({ tick, order: 0, bytes: [0xb0 | channel, 64, event.value ? 127 : 0] });
      });
      tracks.push(midiTrack(events));
    });
    const header = [...textBytes("MThd"), ...u32(6), ...u16(1), ...u16(tracks.length), ...u16(PPQ)];
    return new Uint8Array([...header, ...tracks.flat()]);
  }

  function projectJson(document) {
    const normalized = normalizeDocument(document);
    normalized.modifiedAt = new Date().toISOString();
    return JSON.stringify(normalized, null, 2);
  }

  root.QBoardScoreCore = Object.freeze({
    VERSION,
    PPQ,
    WHOLE,
    MAX_MEASURES,
    TAB_TUNINGS,
    durationTicks,
    durationOrder,
    pitchClasses,
    uid,
    clone,
    clamp,
    mod,
    measureTicks,
    keyTonicFromFifths,
    keyAccidentalMap,
    keySignatureTransition,
    accidentalGlyphs,
    accidentalTransition,
    accidentalPlan,
    spellingFromMidi,
    spellPitchInKey,
    midiFromSpelling,
    pitchName,
    isTabPart,
    tabTuning,
    normalizeTabPositions,
    moveTabPosition,
    defaultPart,
    defaultMeasure,
    createDocument,
    normalizeDocument,
    normalizeEvent,
    ensureMeasures,
    buildVoiceTimeline,
    splitRestSpan,
    normalizeExplicitRests,
    findPart,
    findEvent,
    documentAbsoluteTick,
    nextNoteAtPosition,
    resolveInputPart,
    groupPitchesByStaff,
    insertEvent,
    insertRhythmicEvent,
    rhythmValueSpec,
    rhythmValueForEvent,
    setNoteRhythm,
    splitNoteEvent,
    buildTiedNoteSpans,
    removeEvents,
    sortEvents,
    quantizeStep,
    quantizeDocument,
    restoreRawTiming,
    History,
    exportMusicXml,
    exportMidi,
    projectJson
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
