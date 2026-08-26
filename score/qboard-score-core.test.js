"use strict";

const assert = require("node:assert/strict");
require("./qboard-score-core.js");
const Core = globalThis.QBoardScoreCore;

assert.equal(Core.keyTonicFromFifths(8, "major"), "G#");
assert.equal(Core.keyTonicFromFifths(14, "minor"), "A##");
assert.deepEqual(Core.keyAccidentalMap(8), { C: 1, D: 1, E: 1, F: 2, G: 1, A: 1, B: 1 });
assert.deepEqual(Core.keyAccidentalMap(-8), { C: -1, D: -1, E: -1, F: -1, G: -1, A: -1, B: -2 });
assert.deepEqual(Core.keySignatureTransition(8, 7).find(group => group.letter === "F").accidentals, ["n", "#"]);
assert.deepEqual(Core.keySignatureTransition(-1, 1).find(group => group.letter === "F").accidentals, ["#"]);
assert.deepEqual(Core.keySignatureTransition(-1, 1).find(group => group.letter === "B").accidentals, ["n"]);
assert.equal(Core.keySignatureTransition(8, -8).filter(group => group.accidentals[0] === "n").length, 7);
assert.equal(Core.createDocument({ key: { fifths: -14, mode: "minor" } }).measures[0].key.tonic, "Abb");
assert.equal(Core.MAX_MEASURES, 300);
assert.equal(Core.createDocument({ measureCount: 300 }).measures.length, 300);
assert.throws(() => Core.ensureMeasures(Core.createDocument(), 301), RangeError);
const tooLarge = Core.createDocument({ measureCount: 300 });
tooLarge.measures.push(Core.defaultMeasure(300, tooLarge.settings));
assert.throws(() => Core.normalizeDocument(tooLarge), RangeError);

const accidentalEvents = [
  Core.normalizeEvent({ id: "f-double", type: "note", tick: 0, staff: 0, voice: 1, pitches: [{ step: "F", alter: 2, octave: 4 }] }, null, { settings: { key: { fifths: 0 } } }),
  Core.normalizeEvent({ id: "f-sharp", type: "note", tick: 480, staff: 0, voice: 2, pitches: [{ step: "F", alter: 1, octave: 4 }] }, null, { settings: { key: { fifths: 0 } } })
];
const accidentalPlan = Core.accidentalPlan(accidentalEvents, 0);
assert.deepEqual(accidentalPlan.get("f-double")[0], ["##"]);
assert.deepEqual(accidentalPlan.get("f-sharp")[0], ["n", "#"], "a double sharp reduced to sharp uses natural + sharp");
assert.deepEqual(Core.accidentalTransition(2, 3), ["#", "##"]);
assert.deepEqual(Core.accidentalTransition(-2, -3), ["b", "bb"]);
assert.deepEqual(Core.accidentalTransition(3, 1), ["n", "#"]);
const raisedOutside = Core.spellPitchInKey(61, { fifths: 0, mode: "major" }, "raise");
const loweredOutside = Core.spellPitchInKey(61, { fifths: 0, mode: "major" }, "lower");
assert.deepEqual([raisedOutside.step, raisedOutside.alter, raisedOutside.midi], ["C", 1, 61]);
assert.deepEqual([loweredOutside.step, loweredOutside.alter, loweredOutside.midi], ["D", -1, 61]);
assert.equal(Core.spellPitchInKey(63, { fifths: 14, mode: "major" }, "raise").alter, 3, "raised out-of-key spelling supports triple sharps");

const restScore = Core.createDocument({ measureCount: 2, time: { beats: 3, beatType: 4 }, parts: [{ name: "Rest test" }] });
Core.insertEvent(restScore, restScore.parts[0].id, { type: "note", measure: 0, tick: 480, durationTicks: 480, pitches: [{ midi: 60 }] });
const restTimeline = Core.buildVoiceTimeline(restScore, restScore.parts[0], 0, 0, 1);
assert.equal(restTimeline.reduce((sum, event) => sum + event.durationTicks, 0), 1440, "derived rests fill the complete measure");
assert.equal(restTimeline.filter(event => event.derived).length, 2);
assert.equal(restScore.parts[0].events.length, 1, "derived rests are not persisted in the project");
const wholeRest = Core.buildVoiceTimeline(restScore, restScore.parts[0], 1, 0, 1);
assert.equal(wholeRest.length, 1);
assert.equal(wholeRest[0].wholeMeasureRest, true);
assert.deepEqual(Core.splitRestSpan({ beats: 4, beatType: 4 }, 480, 720).map(item => item.durationTicks), [480, 240], "explicit rests split at beat-group boundaries");
const mergedRests = Core.createDocument({ parts: [{ name: "Merged rests" }] });
Core.insertEvent(mergedRests, mergedRests.parts[0].id, { type: "rest", tick: 0, durationTicks: 240, restCode: "8" });
Core.insertEvent(mergedRests, mergedRests.parts[0].id, { type: "rest", tick: 240, durationTicks: 240, restCode: "8" });
Core.normalizeExplicitRests(mergedRests);
assert.equal(mergedRests.parts[0].events.length, 1);
assert.equal(mergedRests.parts[0].events[0].restCode, "q");

const guitarPart = Core.defaultPart({ notationType: "guitar" });
const guitarEvent = Core.normalizeEvent({ type: "note", pitches: [{ midi: 40 }, { midi: 52 }] }, guitarPart, { settings: { key: { fifths: 0 } } });
assert.deepEqual(guitarEvent.tab.positions.map(item => item.string), [6, 5]);
assert.deepEqual(guitarEvent.tab.positions.map(item => item.fret), [0, 7]);
Core.moveTabPosition(guitarEvent, guitarPart, 0, 1);
assert.deepEqual(guitarEvent.tab.positions[0], { pitchIndex: 0, string: 5, fret: -5 });
const legacyTab = Core.normalizeEvent({ type: "note", pitches: [{ midi: 64 }], tab: { string: 1, fret: 0 } }, guitarPart, { settings: { key: { fifths: 0 } } });
assert.deepEqual(legacyTab.tab.positions[0], { pitchIndex: 0, string: 1, fret: 0 });
const bassPart = Core.defaultPart({ notationType: "bass" });
assert.deepEqual(bassPart.tuning, [28, 33, 38, 43]);
assert.deepEqual(bassPart.clefs, ["bass", "tab"]);

function chunkCount(bytes, marker) {
  const text = Buffer.from(bytes).toString("latin1");
  return text.split(marker).length - 1;
}

function byteSequenceCount(bytes, sequence) {
  let count = 0;
  for (let index = 0; index <= bytes.length - sequence.length; index += 1) {
    if (sequence.every((value, offset) => bytes[index + offset] === value)) count += 1;
  }
  return count;
}

const document = Core.createDocument({
  title: "Quartet & Song",
  tempo: 96,
  measureCount: 4,
  parts: [
    { name: "Clarinet", notationType: "grand", instrumentId: "clarinet", transposition: { chromatic: -2, diatonic: -1, octave: 0 } },
    { name: "Drums", notationType: "percussion", instrumentId: "drums" }
  ]
});

const clarinet = document.parts[0];
const first = Core.insertEvent(document, clarinet.id, {
  type: "note", measure: 0, tick: 117, durationTicks: 233, rawTick: 117, rawDurationTicks: 233,
  voice: 1, staff: 0, pitches: [{ step: "F", alter: 2, octave: 4 }], tieStart: true,
  slurStart: true, articulations: ["accent"], lyrics: [{ verse: 1, text: "Q & B", syllabic: "single", extend: true }]
});
const chord = Core.insertEvent(document, clarinet.id, {
  type: "note", measure: 0, tick: 117, durationTicks: 480, voice: 1, staff: 0, pitches: [{ midi: 71 }]
});
assert.notEqual(first.id, chord.id, "notes with different values at the same onset remain separate symbols");
assert.notEqual(first.voice, chord.voice, "different values are assigned independent voices");
assert.equal(first.pitches.length, 1);
assert.equal(first.pitches[0].alter, 2, "double accidentals survive normalization");

Core.insertEvent(document, clarinet.id, { type: "note", measure: 0, tick: 0, durationTicks: 960, voice: 2, staff: 1, pitches: [{ midi: 48 }] });
Core.insertEvent(document, clarinet.id, { type: "pedal", measure: 0, tick: 240, durationTicks: 1, value: true, pedal: "sustain" });
Core.insertEvent(document, document.parts[1].id, { type: "note", measure: 0, tick: 0, durationTicks: 120, percussion: { gm: 38, head: "x" }, pitches: [{ midi: 38 }] });

Core.quantizeDocument(document, "16", { preserveRaw: true });
assert.equal(first.tick, 120);
assert.equal(first.durationTicks, 240);
Core.restoreRawTiming(document);
assert.equal(first.tick, 117);
assert.equal(first.durationTicks, 233);

const realtimeChord = Core.createDocument({ parts: [{ name: "Realtime" }] });
Core.insertEvent(realtimeChord, realtimeChord.parts[0].id, { type: "note", tick: 7, rawTick: 7, durationTicks: 241, rawDurationTicks: 241, pitches: [{ midi: 60 }] });
Core.insertEvent(realtimeChord, realtimeChord.parts[0].id, { type: "note", tick: 31, rawTick: 31, durationTicks: 229, rawDurationTicks: 229, pitches: [{ midi: 64 }] });
Core.quantizeDocument(realtimeChord, "16", { preserveRaw: true });
assert.equal(realtimeChord.parts[0].events.length, 1, "simultaneous realtime notes merge after display quantization");
assert.deepEqual(realtimeChord.parts[0].events[0].pitches.map(pitch => pitch.midi), [60, 64]);

const history = new Core.History();
history.push(document);
document.title = "Changed";
const undone = history.undo(document);
assert.equal(undone.title, "Quartet & Song");
const redone = history.redo(undone);
assert.equal(redone.title, "Changed");
document.title = "Quartet & Song";

const xml = Core.exportMusicXml(document);
assert.match(xml, /<score-partwise version="4\.0">/);
assert.match(xml, /Quartet &amp; Song/);
assert.match(xml, /<accidental>double-sharp<\/accidental>/);
assert.match(xml, /<backup>/, "independent voices use MusicXML backup elements");
assert.match(xml, /damper-pedal="100"/);
assert.match(xml, /<unpitched>/);
assert.match(xml, /<lyric number="1">/);
assert.match(xml, /<transpose>/);

const midi = Core.exportMidi(document);
assert.equal(Buffer.from(midi.slice(0, 4)).toString("ascii"), "MThd");
assert.equal(chunkCount(midi, "MTrk"), document.parts.length + 1, "Type-1 MIDI has a conductor track and one track per part");
assert.ok(midi.includes(0x99), "percussion note-on uses MIDI channel 10");

const independent = Core.createDocument({ parts: [
  { id: "kbd-a", name: "Keyboard A", sourceProfileId: "hid-a" },
  { id: "kbd-b", name: "Keyboard B", sourceProfileId: "hid-b", outputShift: 12 }
] });
Core.insertEvent(independent, "kbd-a", { type: "note", measure: 0, tick: 0, pitches: [{ midi: 60 }] });
Core.insertEvent(independent, "kbd-b", { type: "note", measure: 0, tick: 0, pitches: [{ midi: 60 }] });
assert.equal(independent.parts[0].events.length, 1);
assert.equal(independent.parts[1].events.length, 1, "equal physical keys remain independent across input-source parts");
const independentMidi = Core.exportMidi(independent);
assert.ok(independentMidi.includes(60));
assert.ok(independentMidi.includes(72), "output shift changes playback and MIDI without changing the stored notation pitch");

const timeline = Core.createDocument({ tempo: 120, measureCount: 3, parts: [{ name: "Aligned timeline" }] });
timeline.measures[1].time = { beats: 3, beatType: 4 };
timeline.measures[1].tempo = 90;
assert.deepEqual(timeline.measures[0].time, { beats: 4, beatType: 4 }, "measure time signatures remain independent");
Core.insertEvent(timeline, timeline.parts[0].id, {
  type: "note", measure: 0, tick: 0, durationTicks: 320, pitches: [{ midi: 60 }],
  tuplet: { id: "triplet-test", num: 3, inTimeOf: 2 }
});
const timelineXml = Core.exportMusicXml(timeline);
assert.match(timelineXml, /<time-modification><actual-notes>3<\/actual-notes><normal-notes>2<\/normal-notes><\/time-modification>/);
assert.match(timelineXml, /<sound tempo="90"\/>/, "per-measure tempo changes are exported to MusicXML");
const timelineMidi = Core.exportMidi(timeline);
assert.ok(byteSequenceCount(timelineMidi, [0xff, 0x51, 3]) >= 2, "MIDI conductor track contains tempo changes");
assert.ok(byteSequenceCount(timelineMidi, [0xff, 0x58, 4]) >= 2, "MIDI conductor track contains time-signature changes");

const standardTripletValues = [
  { label: "1/3", code: "h", ticks: 640 },
  { label: "1/6", code: "q", ticks: 320 },
  { label: "1/12", code: "8", ticks: 160 },
  { label: "1/24", code: "16", ticks: 80 }
];
standardTripletValues.forEach(({ label, code, ticks }) => {
  const tripletScore = Core.createDocument({ parts: [{ id: `triplet-${label}`, name: label }] });
  const part = tripletScore.parts[0];
  Core.insertEvent(tripletScore, part.id, {
    type: "note", measure: 0, tick: 0, durationTicks: ticks, restCode: code,
    tuplet: { id: `group-${label}`, num: 3, inTimeOf: 2, index: 0 }, pitches: [{ midi: 60 }]
  });
  const group = Core.buildVoiceTimeline(tripletScore, part, 0, 0, 1).filter(event => event.tuplet?.id === `group-${label}`);
  assert.equal(group.length, 3, `${label} completes a normal three-note tuplet group`);
  assert.ok(group.every(event => event.durationTicks === ticks && event.restCode === code), `${label} keeps the standard note shape and 3:2 duration`);
  assert.deepEqual(group.map(event => event.tuplet.index), [0, 1, 2]);
});

const extendedKey = Core.createDocument({ measureCount: 3, key: { fifths: 8, mode: "major", tonic: "G#" }, parts: [{ name: "Extended key" }] });
extendedKey.measures[1].key = { fifths: 7, mode: "major", tonic: "C#" };
extendedKey.measures[2].key = { fifths: -8, mode: "major", tonic: "Fb" };
const extendedXml = Core.exportMusicXml(extendedKey);
assert.match(extendedXml, /<fifths>8<\/fifths>/);
assert.match(extendedXml, /<cancel>8<\/cancel><fifths>7<\/fifths>/);
assert.match(extendedXml, /<cancel>7<\/cancel><fifths>-8<\/fifths>/);

const accidentalXmlScore = Core.createDocument({ parts: [{ name: "Accidentals" }] });
Core.insertEvent(accidentalXmlScore, accidentalXmlScore.parts[0].id, accidentalEvents[0]);
Core.insertEvent(accidentalXmlScore, accidentalXmlScore.parts[0].id, accidentalEvents[1]);
const accidentalXml = Core.exportMusicXml(accidentalXmlScore);
assert.match(accidentalXml, /<accidental>natural-sharp<\/accidental>/);
const restXml = Core.exportMusicXml(restScore);
assert.match(restXml, /<rest measure="yes"\/>/, "automatic whole-measure rests export without becoming project events");

const rhythmScore = Core.createDocument({ measureCount: 1, parts: [Core.defaultPart({ name: "Rhythm" })] });
const rhythmPart = rhythmScore.parts[0];
const quarter = Core.insertEvent(rhythmScore, rhythmPart.id, { type: "note", measure: 0, tick: 0, durationTicks: Core.PPQ, pitches: [{ midi: 60 }], staff: 0, voice: 1 });
const eighth = Core.insertEvent(rhythmScore, rhythmPart.id, { type: "note", measure: 0, tick: 0, durationTicks: Core.PPQ / 2, pitches: [{ midi: 64 }], staff: 0, voice: 1 });
const chordTone = Core.insertEvent(rhythmScore, rhythmPart.id, { type: "note", measure: 0, tick: 0, durationTicks: Core.PPQ, pitches: [{ midi: 67 }], staff: 0, voice: 1 });
assert.notEqual(quarter.voice, eighth.voice, "different values at the same onset use separate voices");
assert.equal(chordTone.id, quarter.id, "matching values at the same onset merge into a chord");
assert.deepEqual(quarter.pitches.map(item => item.midi), [60, 67]);

const routedScore = Core.createDocument({ parts: [
  { id: "main-part", name: "Main keyboard", sourceProfileId: "main", sourceType: "browser" },
  { id: "bass-part", name: "Main bass", sourceProfileId: "bass", sourceType: "bass" },
  { id: "hid-part", name: "External keyboard", sourceProfileId: "hid-1", sourceType: "bridge" }
] });
assert.equal(Core.resolveInputPart(routedScore, { sourceType: "bridge", sourceId: "hid-1" }).id, "main-part", "unselected keyboard input defaults to the main keyboard part");
assert.equal(Core.resolveInputPart(routedScore, { sourceType: "bass", sourceId: "external-bass" }).id, "bass-part", "unselected bass input defaults to the main bass part");
assert.equal(Core.resolveInputPart(routedScore, { sourceType: "bass" }, "hid-part").id, "hid-part", "an explicitly selected part wins for every input type");
const disabledDefaultScore = Core.createDocument({ parts: [
  { id: "disabled-main", sourceProfileId: "main", sourceType: "browser", enabled: false },
  { id: "top-enabled", sourceProfileId: "hid-1", sourceType: "bridge" },
  { id: "enabled-bass", sourceProfileId: "bass", sourceType: "bass" }
] });
assert.equal(Core.resolveInputPart(disabledDefaultScore, { sourceType: "bridge" }).id, "top-enabled", "a disabled default keyboard falls back to the topmost enabled score part");
disabledDefaultScore.parts[2].enabled = false;
assert.equal(Core.resolveInputPart(disabledDefaultScore, { sourceType: "bass" }).id, "top-enabled", "a disabled default bass falls back to the topmost enabled score part");
assert.equal(Core.resolveInputPart(disabledDefaultScore, { sourceType: "bridge" }, "disabled-main").id, "disabled-main", "an explicitly selected disabled part remains an intentional input target");
disabledDefaultScore.parts[1].enabled = false;
assert.equal(Core.resolveInputPart(disabledDefaultScore, { sourceType: "bridge" }), null, "routing stops when every unselected score part is disabled");
const grandGroupingPart = Core.defaultPart({ notationType: "grand", splitMidi: 60 });
assert.equal(grandGroupingPart.grandInputMode, "unified");
assert.equal(Core.defaultPart({ notationType: "grand", grandInputMode: "split" }).grandInputMode, "split");
const grandGroups = Core.groupPitchesByStaff(grandGroupingPart, [{ midi: 48 }, { midi: 60 }, { midi: 72 }]);
assert.deepEqual(grandGroups.map(group => [group.staff, group.pitches.map(pitch => pitch.midi)]), [[0, [60, 72]], [1, [48]]], "one grand-staff input group is distributed across its two staves at the split pitch");
assert.equal(Core.groupPitchesByStaff(grandGroupingPart, [{ midi: 48 }, { midi: 72 }], 1).length, 1, "an explicit staff choice remains available for pointer entry");
assert.equal(Core.normalizeEvent({ type: "note", inputGroupId: "grand-chord", pitches: [{ midi: 48 }] }, grandGroupingPart, routedScore).inputGroupId, "grand-chord", "logical grand-staff input groups survive normalization");

Core.insertEvent(routedScore, "main-part", { type: "note", measure: 0, tick: 960, durationTicks: 480, pitches: [{ midi: 60 }] });
Core.insertEvent(routedScore, "hid-part", { type: "note", measure: 1, tick: 0, durationTicks: 480, pitches: [{ midi: 64 }] });
assert.equal(Core.nextNoteAtPosition(routedScore, { measure: 0, tick: 961 }).event.measure, 1, "the editor context follows the first note after the cursor");

const splitRhythm = Core.createDocument({ parts: [{ id: "split", name: "Split rhythm" }] });
const sustained = Core.insertRhythmicEvent(splitRhythm, "split", {
  type: "note", measure: 0, tick: 0, durationTicks: 960, staff: 0, voice: 1, pitches: [{ midi: 60 }]
})[0];
const entering = Core.insertRhythmicEvent(splitRhythm, "split", {
  type: "note", measure: 0, tick: 480, durationTicks: 960, staff: 0, voice: 1, pitches: [{ midi: 64 }]
});
const splitEvents = splitRhythm.parts[0].events.filter(event => event.type === "note");
const sustainedPieces = splitEvents.filter(event => event.pitches.some(pitch => pitch.midi === 60));
assert.deepEqual(sustainedPieces.map(event => [event.tick, event.durationTicks]), [[0, 480], [480, 480]], "a sustained note is split exactly where a later rhythm begins");
assert.equal(sustainedPieces[0].pitches[0].tieStart, true);
assert.equal(sustainedPieces[1].pitches[0].tieStop, true);
assert.notEqual(entering[0].voice, sustainedPieces[0].voice, "the overlapping rhythm uses another internal voice");
const splitPlayback = Core.buildTiedNoteSpans(splitRhythm, splitRhythm.parts[0]);
const sustainedSpan = splitPlayback.find(span => span.pitch.midi === 60);
assert.deepEqual([sustainedSpan.startTick, sustainedSpan.endTick], [0, 960], "automatic notation splitting does not retrigger the sustained sound");

const reverseSplitRhythm = Core.createDocument({ parts: [{ id: "reverse-split", name: "Reverse split rhythm" }] });
Core.insertRhythmicEvent(reverseSplitRhythm, "reverse-split", {
  type: "note", measure: 0, tick: 480, durationTicks: 480, staff: 0, voice: 1, pitches: [{ midi: 67 }]
});
const reverseEntering = Core.insertRhythmicEvent(reverseSplitRhythm, "reverse-split", {
  type: "note", measure: 0, tick: 0, durationTicks: 960, staff: 0, voice: 1, pitches: [{ midi: 62 }]
});
assert.deepEqual(reverseEntering.map(event => [event.tick, event.durationTicks]), [[0, 480], [480, 480]], "an earlier note entered later is split at an existing onset");
assert.equal(reverseEntering[0].pitches[0].tieStart, true);
assert.equal(reverseEntering[1].pitches[0].tieStop, true);

const tupletInsertion = Core.createDocument({ parts: [{ id: "tuplet-insertion", name: "Tuplet insertion" }] });
for (let index = 0; index < 3; index += 1) {
  Core.insertRhythmicEvent(tupletInsertion, "tuplet-insertion", {
    type: "note", measure: 0, tick: index * 160, durationTicks: 160, restCode: "8", staff: 0, voice: 1,
    tuplet: { id: "triplet-group", num: 3, inTimeOf: 2, index }, pitches: [{ midi: 60 + index * 2 }]
  });
}
const tupletEvents = tupletInsertion.parts[0].events.filter(event => event.type === "note");
assert.deepEqual(tupletEvents.map(event => [event.tick, event.tuplet.id, event.tuplet.index]), [[0, "triplet-group", 0], [160, "triplet-group", 1], [320, "triplet-group", 2]], "rhythmic insertion preserves a complete triplet group when no split is required");

const manualSplit = Core.createDocument({ parts: [{ id: "manual-split", name: "Manual split" }] });
const manualPart = manualSplit.parts[0];
const manualQuarter = Core.insertEvent(manualSplit, manualPart.id, {
  type: "note", measure: 0, tick: 0, durationTicks: 480, restCode: "q", staff: 0, voice: 1, pitches: [{ midi: 60 }]
});
const thirds = Core.splitNoteEvent(manualSplit, manualPart.id, manualQuarter.id, 3);
assert.deepEqual(thirds.map(event => [event.tick, event.durationTicks, event.restCode]), [[0, 160, "8"], [160, 160, "8"], [320, 160, "8"]], "manual three-way split creates an eighth-note triplet");
assert.equal(new Set(thirds.map(event => event.tuplet.id)).size, 1);
assert.equal(thirds[0].pitches[0].tieStart, true);
assert.equal(thirds[1].pitches[0].tieStart, true);
assert.equal(thirds[1].pitches[0].tieStop, true);
assert.equal(thirds[2].pitches[0].tieStop, true);
const tiedPlaybackSpans = Core.buildTiedNoteSpans(manualSplit, manualPart);
assert.equal(tiedPlaybackSpans.length, 1, "manually split notation remains one sounding playback span");
assert.deepEqual([tiedPlaybackSpans[0].startTick, tiedPlaybackSpans[0].endTick], [0, 480]);
assert.match(Core.exportMusicXml(manualSplit), /<tied type="start"\/>[\s\S]*<tied type="stop"\/>/, "manual split ties survive MusicXML export");

const minimumSplit = Core.createDocument({ parts: [{ id: "minimum-split", name: "Minimum split" }] });
const minimumPart = minimumSplit.parts[0];
const thirtySecond = Core.insertEvent(minimumSplit, minimumPart.id, { type: "note", durationTicks: 60, restCode: "32", pitches: [{ midi: 62 }] });
assert.deepEqual(Core.splitNoteEvent(minimumSplit, minimumPart.id, thirtySecond.id, 2).map(event => [event.durationTicks, event.restCode]), [[30, "64"], [30, "64"]]);
const sixteenth = Core.insertEvent(minimumSplit, minimumPart.id, { type: "note", tick: 240, durationTicks: 120, restCode: "16", pitches: [{ midi: 64 }] });
assert.deepEqual(Core.splitNoteEvent(minimumSplit, minimumPart.id, sixteenth.id, 3).map(event => [event.durationTicks, event.restCode]), [[40, "32"], [40, "32"], [40, "32"]], "1/48 triplets are the smallest ternary subdivision");
const sixtyFourth = Core.insertEvent(minimumSplit, minimumPart.id, { type: "note", tick: 480, durationTicks: 30, restCode: "64", pitches: [{ midi: 65 }] });
assert.throws(() => Core.splitNoteEvent(minimumSplit, minimumPart.id, sixtyFourth.id, 2), RangeError);

const rhythmEdit = Core.createDocument({ measureCount: 2, parts: [{ id: "rhythm-edit", name: "Rhythm edit" }] });
const rhythmEditPart = rhythmEdit.parts[0];
const dotted = Core.insertEvent(rhythmEdit, rhythmEditPart.id, { type: "note", measure: 0, tick: 0, durationTicks: 480, restCode: "q", pitches: [{ midi: 67 }] });
const dottedResult = Core.setNoteRhythm(rhythmEdit, rhythmEditPart.id, dotted.id, "h", 1);
assert.deepEqual(dottedResult.map(event => [event.durationTicks, event.restCode, event.dots]), [[1440, "h", 1]], "existing notes can be changed to dotted values");
assert.equal(Core.rhythmValueForEvent(dottedResult[0]), "h");
const acrossBar = Core.insertEvent(rhythmEdit, rhythmEditPart.id, { type: "note", measure: 0, tick: 1440, durationTicks: 240, restCode: "8", pitches: [{ midi: 69 }] });
const acrossBarResult = Core.setNoteRhythm(rhythmEdit, rhythmEditPart.id, acrossBar.id, "h", 0);
assert.deepEqual(acrossBarResult.map(event => [event.measure, event.tick, event.durationTicks]), [[0, 1440, 480], [1, 0, 480]], "duration edits crossing a bar create tied notation on both sides");
assert.equal(Core.buildTiedNoteSpans(rhythmEdit, rhythmEditPart).find(span => span.pitch.midi === 69).endTick - Core.buildTiedNoteSpans(rhythmEdit, rhythmEditPart).find(span => span.pitch.midi === 69).startTick, 960);

const json = Core.projectJson(document);
const reopened = Core.normalizeDocument(JSON.parse(json));
assert.equal(reopened.version, 1);
assert.equal(reopened.parts[0].events.length, document.parts[0].events.length);
assert.deepEqual(reopened.rawTakes, document.rawTakes);

const large = Core.createDocument({ measureCount: 300, parts: Array.from({ length: 16 }, (_, index) => ({ name: `Part ${index + 1}` })) });
large.parts.forEach((part, partIndex) => {
  for (let measure = 0; measure < 300; measure += 1) {
    Core.insertEvent(large, part.id, { type: "note", measure, tick: (partIndex % 4) * 120, durationTicks: 117, rawTick: (partIndex % 4) * 120 + 7, rawDurationTicks: 117, pitches: [{ midi: 48 + partIndex }] });
  }
});
const perfStarted = performance.now();
Core.quantizeDocument(large, "16", { preserveRaw: true });
const perfElapsed = performance.now() - perfStarted;
assert.ok(perfElapsed < 2500, `16-part, 300-measure quantization took ${perfElapsed.toFixed(1)} ms`);
assert.equal(large.parts.reduce((sum, part) => sum + part.events.length, 0), 4800);

console.log("qboard-score-core: all tests passed");
