"use strict";

const assert = require("node:assert/strict");
require("./qboard-score-print.js");
const Print = globalThis.QBoardScorePrint;

const a4 = Print.paperMetrics({ size: "A4", orientation: "portrait" });
assert.equal(a4.size, "A4");
assert.equal(a4.orientation, "portrait");
assert.ok(a4.pageWidth > 690 && a4.pageWidth < 710);
assert.ok(a4.pageHeight > 1020 && a4.pageHeight < 1040);
assert.equal(Print.paperMetrics({ size: "A4", orientation: "landscape" }).pageWidth, a4.pageHeight);
assert.equal(Print.paperMetrics({ size: "unknown" }).size, "A4");

const measures = [
  {},
  { pageBreak: true },
  {},
  { systemBreak: true },
  {}
];
const layout = [
  { left: 0, width: 240 },
  { left: 240, width: 240 },
  { left: 480, width: 340 },
  { left: 820, width: 240 },
  { left: 1060, width: 240 }
];
const systems = Print.buildSystems(measures, layout, 600);
assert.deepEqual(systems.map(item => [item.first, item.last, item.width, item.pageBreakAfter]), [
  [0, 1, 480, true],
  [2, 3, 580, false],
  [4, 4, 240, false]
]);

const pages = Print.paginateSystems(systems, { pageHeight: 900, scoreWidth: 600, sourceHeight: 300 });
assert.equal(pages.length, 2, "a manual page break starts the next system on a fresh page");
assert.deepEqual(pages.map(page => page.systems.map(system => system.first)), [[0], [2, 4]]);
assert.equal(pages[0].number, 1);
assert.ok(pages.every(page => page.systems.every(system => system.scale > 0 && system.scale <= 1)));

const tall = Print.paginateSystems([{ first: 0, last: 0, width: 900, pageBreakAfter: false }], { pageHeight: 500, scoreWidth: 600, sourceHeight: 900 });
assert.equal(tall.length, 1);
assert.ok(tall[0].systems[0].displayHeight <= 500, "an oversized system is scaled to a printable page height");
assert.ok(tall[0].remaining >= -1, "the title block and first system fit on the first printed page");

console.log("qboard-score-print: all tests passed");
