(function (root) {
  "use strict";

  const PAPER_PIXELS = Object.freeze({
    A4: Object.freeze([793.7, 1122.5]),
    Letter: Object.freeze([816, 1056]),
    Legal: Object.freeze([816, 1344])
  });

  function paperMetrics(page = {}, options = {}) {
    const size = Object.prototype.hasOwnProperty.call(PAPER_PIXELS, page.size) ? page.size : "A4";
    const orientation = page.orientation === "landscape" ? "landscape" : "portrait";
    const paper = PAPER_PIXELS[size];
    const oriented = orientation === "landscape" ? [paper[1], paper[0]] : paper;
    const marginMm = Math.max(0, Number(options.marginMm) || 12);
    const margin = marginMm * 96 / 25.4;
    const labelWidth = Math.max(0, Number(options.labelWidth) || 82);
    const pageWidth = Math.floor(oriented[0] - margin * 2);
    const pageHeight = Math.floor(oriented[1] - margin * 2);
    return { size, orientation, marginMm, margin, pageWidth, pageHeight, labelWidth, scoreWidth: Math.max(1, pageWidth - labelWidth) };
  }

  function buildSystems(measures, layout, maxWidth) {
    const systems = [];
    const widthLimit = Math.max(1, Number(maxWidth) || 1);
    let current = null;
    const flush = () => {
      if (!current) return;
      current.width = current.endX - current.startX;
      systems.push(current);
      current = null;
    };
    layout.forEach((geometry, index) => {
      if (current && current.endX - current.startX + geometry.width > widthLimit) flush();
      if (!current) current = { first: index, last: index, startX: geometry.left, endX: geometry.left + geometry.width, pageBreakAfter: false };
      else { current.last = index; current.endX = geometry.left + geometry.width; }
      const measure = measures[index] || {};
      if (measure.systemBreak || measure.pageBreak) {
        current.pageBreakAfter = Boolean(measure.pageBreak);
        flush();
      }
    });
    flush();
    return systems;
  }

  function paginateSystems(systems, options = {}) {
    if (!systems.length) return [];
    const pageHeight = Math.max(1, Number(options.pageHeight) || 1);
    const scoreWidth = Math.max(1, Number(options.scoreWidth) || 1);
    const sourceHeight = Math.max(1, Number(options.sourceHeight) || 1);
    const firstHeaderHeight = Math.max(0, Number(options.firstHeaderHeight) || 94);
    const continuationTop = Math.max(0, Number(options.continuationTop) || 18);
    const footerHeight = Math.max(0, Number(options.footerHeight) || 22);
    const rowGap = Math.max(0, Number(options.rowGap) || 16);
    const pages = [];
    let page = null;
    const addPage = first => {
      page = { number: pages.length + 1, first, systems: [], remaining: pageHeight - (first ? firstHeaderHeight : continuationTop) - footerHeight };
      pages.push(page);
    };
    addPage(true);
    systems.forEach((system, index) => {
      let scale = Math.min(1, scoreWidth / Math.max(1, system.width));
      let displayHeight = Math.ceil(sourceHeight * scale) + rowGap;
      if (displayHeight > page.remaining && page.systems.length) addPage(false);
      if (displayHeight > page.remaining) {
        scale = Math.min(scale, Math.max(0.01, (page.remaining - rowGap) / sourceHeight));
        displayHeight = Math.ceil(sourceHeight * scale) + rowGap;
      }
      page.systems.push({ ...system, scale, displayHeight });
      page.remaining -= displayHeight;
      if (system.pageBreakAfter && index < systems.length - 1) addPage(false);
    });
    return pages.filter(item => item.systems.length);
  }

  root.QBoardScorePrint = Object.freeze({ PAPER_PIXELS, paperMetrics, buildSystems, paginateSystems });
})(typeof globalThis !== "undefined" ? globalThis : window);
