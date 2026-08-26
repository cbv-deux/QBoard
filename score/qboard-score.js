(function (root) {
  "use strict";

  const Core = root.QBoardScoreCore;
  if (!Core) throw new Error("QBoardScoreCore is required");
  const PrintLayout = root.QBoardScorePrint;
  if (!PrintLayout) throw new Error("QBoardScorePrint is required");

  const vexCandidates = [root.VexFlow, root.Vex, root.Vex?.Flow].filter(Boolean);
  const VF = vexCandidates.find(candidate => candidate.Renderer && candidate.Tuplet) || vexCandidates.find(candidate => candidate.Renderer);
  const DB_NAME = "qboard-score";
  const DB_STORE = "documents";
  const AUTOSAVE_KEY = "autosave-v1";
  const STEP_CHORD_MS = 45;
  const DURATION_LABELS = { w: "1/1", h: "1/2", q: "1/4", 8: "1/8", 16: "1/16", 32: "1/32", 64: "1/64" };
  const TRIPLET_DURATIONS = Object.freeze({ 3: "h", 6: "q", 12: "8", 24: "16" });
  const MIN_MEASURE_NOTE_WIDTH = 220;
  const MEASURE_SIDE_PADDING = 18;
  const TIMELINE_LEFT_GUTTER = 24;
  const TIMELINE_HEADER_HEIGHT = 48;
  const MEASURE_RULER_FINE_TICKS = Core.WHOLE / 96;
  const MEASURE_RULER_MAJOR_OPTIONS = Object.freeze([4, 8, 12, 16, 24, 48, 96].map(division => ({ division, ticks: Core.WHOLE / division })));
  const PRINT_MIN_SYSTEM_SCALE = 0.8;
  const ACCIDENTAL_LINES = Object.freeze({
    treble: { sharp: { F: 0, C: 1.5, G: -0.5, D: 1, A: 2.5, E: 0.5, B: 2 }, flat: { B: 2, E: 0.5, A: 2.5, D: 1, G: 3, C: 1.5, F: 3.5 } },
    bass: { sharp: { F: 1, C: 2.5, G: 0.5, D: 2, A: 3.5, E: 1.5, B: 3 }, flat: { B: 3, E: 1.5, A: 3.5, D: 2, G: 4, C: 2.5, F: 4.5 } },
    alto: { sharp: { F: 0.5, C: 2, G: 0, D: 1.5, A: 3, E: 1, B: 2.5 }, flat: { B: 2.5, E: 1, A: 3, D: 1.5, G: 3.5, C: 2, F: 4 } },
    tenor: { sharp: { F: 3, C: 1, G: 2.5, D: 0.5, A: 2, E: 0, B: 1.5 }, flat: { B: 1.5, E: 0, A: 2, D: 0.5, G: 2.5, C: 1, F: 3 } }
  });

  const strings = {
    zh: {
      score: "打谱", newScore: "新建总谱", openProject: "打开工程", saveProject: "保存工程", export: "导出",
      musicXml: "MusicXML", midi: "MIDI", print: "打印 / PDF", undo: "撤销", redo: "重做", copy: "复制", paste: "粘贴", play: "播放", stop: "停止",
      record: "录音", countIn: "预备拍", tempo: "速度", quantize: "量化", restoreTiming: "恢复原始节奏", concertPitch: "实音总谱",
      pageView: "分页", continuousView: "连续", zoom: "缩放", parts: "声部", addPart: "添加声部", syncParts: "从 Q-board 同步",
      inspector: "属性", scoreInfo: "总谱信息", title: "标题", composer: "作曲", lyricist: "作词", measureCount: "小节数",
      activePart: "当前声部", partName: "声部名称", instrument: "音色", notation: "谱表", single: "单谱表", grand: "高低音双谱表",
      guitar: "吉他标准谱 + TAB", bassTab: "贝斯标准谱 + TAB", percussion: "打击乐谱", splitPitch: "分界音", transposition: "移调半音", volume: "音量", visible: "显示",
      mute: "静音", solo: "独奏", voice: "声部层", staff: "谱表", treble: "高音", bass: "低音", duration: "时值", rest: "休止", outputShift: "输出偏移",
      dot: "附点", doubleDot: "双附点", accidental: "变音", raise: "升", lower: "降", tuplet: "连音", grace: "倚音", tie: "延音线", slur: "连音线",
      beam: "符杠", auto: "自动", begin: "开始", continueText: "继续", end: "结束", none: "无", articulation: "奏法",
      ornament: "装饰音", dynamic: "力度", lyrics: "歌词", chordSymbol: "和弦标记", text: "文字", apply: "应用", delete: "删除",
      previousPage: "上一页", nextPage: "下一页", page: "页", measure: "小节", cursor: "光标", stepMode: "步进输入",
      recording: "正在录音", saved: "已自动保存", loaded: "工程已载入", noPart: "请先添加声部", invalidFile: "无法读取该工程文件",
      autosaveFound: "发现自动保存的总谱，已恢复。", newScoreHint: "根据当前启用的 Q-board 键盘和贝司建立声部。",
      selectHint: "左键输入或选择；右键拖动框选音符头，在小节栏右键拖动选择整小节。", emptyMeasure: "点击谱表或使用 Q-board 输入音符",
      addMeasure: "增加小节", removeMeasure: "减少小节", pickup: "不完全小节", key: "调号", time: "拍号", repeatStart: "反复开始",
      repeatEnd: "反复结束", systemBreak: "换行", pageBreak: "换页", staffLines: "谱线", tuning: "定弦（MIDI）", drumMap: "GM 打击映射",
      rawTake: "原始演奏", loop: "循环", selectionPlay: "播放选区", stepReady: "步进输入已就绪", stopRecording: "停止录音", stringNumber: "弦号", fret: "品位",
      close: "关闭打谱", jsonProject: "Q-board 工程 JSON", copiedFromQBoard: "已从当前 Q-board 建立总谱", synced: "声部设置已同步",
      file: "文件", edit: "编辑", input: "输入", playback: "播放", layout: "布局", pageSize: "纸张", orientation: "方向",
      portrait: "纵向", landscape: "横向", metadata: "元数据", event: "音符 / 事件", part: "声部", lyricsVerse: "歌词段数",
      velocity: "力度值", source: "输入来源", manual: "手工", realtime: "实时", selectAllMeasure: "选择整小节", duplicate: "复制",
      addDirection: "添加文字记号", rehearsal: "排练记号", crescendo: "渐强", diminuendo: "渐弱", metronome: "节拍器",
      errorRender: "该小节暂时无法排版", noVexFlow: "VexFlow 未加载，无法显示谱面。", recovery: "崩溃恢复", discard: "新建空白总谱",
      timeline: "横向时间轴", tripletDurations: "三连音时值", batchMeasures: "批量拍号 / 速度", measureSettings: "小节设置",
      fromMeasure: "起始小节", toMeasure: "结束小节", beats: "拍数", beatType: "拍值", applyTime: "设置拍号", applyTempo: "设置速度",
      mode: "调式", major: "大调", minor: "小调", confirm: "确定", cancel: "取消", settings: "设置", partSettings: "声部设置",
      applyScope: "生效范围", onlyMeasure: "仅此小节", throughMeasure: "生效至第 X 小节", followingMeasures: "对之后全部生效", playbackPosition: "播放位置", sourceBinding: "输入来源",
      transpositionOctave: "移调八度",
      pause: "暂停", currentDuration: "当前时值", noteFade: "音符淡出", pedalDamping: "踏板阻尼", deletePart: "删除声部", clearPart: "清除声部",
      deletePartConfirm: "删除这个声部及其中的全部记谱内容？", clearPartConfirm: "清除这个声部的全部记谱内容？声部设置和原始录音会保留。", partCleared: "声部内容已清除", atLeastOnePart: "总谱至少需要保留一个声部。", restOverlap: "该位置已有音符或休止符。", voiceLimit: "同一谱表同时最多容纳四个独立节奏声部。",
      grandInputMode: "双谱表录入", unifiedGrandInput: "统一为一个声部", splitGrandInput: "高低谱表分开",
      noteDuration: "音符时值", noteDots: "附点数", splitIntoTwo: "拆成 2 个", splitIntoThree: "拆成 3 个", splitTooSmall: "不能继续拆分：最小时值为 1/64，三连音最小为 1/48。", rhythmEditFailed: "这个时值在当前位置无法正确表示。",
      clipboard: "剪贴板", clearClipboard: "清空", measureClipboard: "整小节剪贴板", noteClipboard: "音符剪贴板", emptyClipboard: "剪贴板为空",
      insertMeasureHere: "在此插入小节", measureLimit: "总谱最多支持 300 小节。", copied: "已复制", pasteNeedsBoundary: "请选择小节分界线后再粘贴。",
      scoreManual: "打谱器", scoreManualIntro: "进入“打谱”后，上方以固定声部行和可拖动播放时间轴编辑总谱，下方 Q 键盘与贝司保持可演奏。左侧可控制声部显示、独奏、静音、顺序和声部设置；双击小节标题可设置调号、拍号、速度及生效范围。",
      scoreManualStep: "步进输入：选择普通或三连音时值、声部层、谱表和记号，再弹奏 Q-board；45ms 内的音会合并为和弦。打开休止符工具后，在谱表中点击即可输入当前时值的休止符。",
      scoreManualRecord: "实时录音：默认一小节预备拍，记录力度、踏板和原始按下/抬起时间；量化只改变显示，可恢复原始节奏。",
      scoreManualExport: "工程 JSON 可完整重新打开；MusicXML、Type-1 MIDI 和打印/PDF 用于交换与排版。",
      manualContext: "游标与调号", manualContextItems: "红色游标可在谱面或底部时间轴直接选中并拖动。|游标被选中时，左右键按当前时值移动；未选中且没有普通选择时，Delete 删除游标前最近起点上的全部音符。|游标后的第一个音符决定当前小节；Q 键盘的调号与该小节双向同步。",
      manualRhythm: "音符、三连音与休止符", manualRhythmItems: "普通时值支持全音符至六十四分音符、单双附点和 2–9 连音。|标准三连音采用 3:2：1/3、1/6、1/12、1/24 分别使用二分、四分、八分、十六分音符外形；手工拆分可到 1/48。|选中已有音符后可在属性栏修改时值和附点，或拆成两个/三个由延音线连接的音；同一内部声部发生错位重叠时，先出现的音会在后一个起点拆开并正确连接。|相邻的短时值会按节拍自动连桁，完整三连音优先三枚成组，不重复绘制符尾。|休止符工具只影响鼠标输入；自动休止符会按小节与拍组补齐、合并，并随 MusicXML 导出。",
      manualSelection: "选择与编辑", manualSelectionItems: "左键选择或输入；右键在谱面框选时只依据音符头命中。|右键拖动小节标题可选连续小节；复制后在红色小节分界线粘贴会插入并后移内容。|Ctrl+C、Ctrl+V、Delete、Ctrl+Z 和 Ctrl+Y 分别用于复制、粘贴、删除、撤销和重做。",
      manualParts: "声部、TAB 与输入源", manualPartsItems: "每个实体键盘或贝司可绑定独立声部；声部栏可显示、隐藏、静音、独奏、拖动排序或打开设置。|双谱表声部可选择统一录入，或让高低谱表作为两个独立编辑分组；两种方式都保持为同一乐器声部。|清除声部只移除记谱内容并保留设置和原始录音；删除声部会连同该声部记谱一起移除。|吉他使用六线 TAB，贝斯使用四线 TAB；每个和弦音独立保存弦号与品位，允许负品。|选中 TAB 数字后可用上下键换弦，也可点击数字上半部或下半部换弦。",
      manualPlayback: "播放与录音", manualPlaybackItems: "播放、暂停、停止和定位共用 Web Audio 时钟；红线位于正在发声音符左侧。|普通音符在时值结束后按声部“音符淡出”释放，踏板音按“踏板阻尼”释放。|录音默认包含预备拍并保留力度、踏板和原始时间；重新量化不会删除原始 take。",
      manualMeasures: "小节与排版", manualMeasuresItems: "双击小节标题设置调号、拍号、速度、不完全小节、反复与换行换页。|设置可仅作用当前小节、生效至指定小节或作用于之后全部小节。|支持 -14 至 +14 五度调号；临时记号会根据调号和同小节先前状态使用还原、升降及重升降组合。",
      manualOutput: "保存、交换与打印", manualOutputItems: "工程 JSON 保存完整可编辑数据并支持自动恢复。|MusicXML 4.0 和 Type-1 MIDI 用于交换；输出偏移不改变记谱音高。|打印/PDF 会建立独立分页谱面，按纸张宽度自动换行并服从手工换行和换页。"
    },
    en: {
      score: "Score", newScore: "New score", openProject: "Open project", saveProject: "Save project", export: "Export",
      musicXml: "MusicXML", midi: "MIDI", print: "Print / PDF", undo: "Undo", redo: "Redo", copy: "Copy", paste: "Paste", play: "Play", stop: "Stop",
      record: "Record", countIn: "Count-in", tempo: "Tempo", quantize: "Quantize", restoreTiming: "Restore raw timing", concertPitch: "Concert pitch",
      pageView: "Pages", continuousView: "Continuous", zoom: "Zoom", parts: "Parts", addPart: "Add part", syncParts: "Sync from Q-board",
      inspector: "Inspector", scoreInfo: "Score information", title: "Title", composer: "Composer", lyricist: "Lyricist", measureCount: "Measures",
      activePart: "Active part", partName: "Part name", instrument: "Instrument", notation: "Notation", single: "Single staff", grand: "Grand staff",
      guitar: "Guitar standard + TAB", bassTab: "Bass standard + TAB", percussion: "Percussion", splitPitch: "Split pitch", transposition: "Transpose semitones", volume: "Volume", visible: "Visible",
      mute: "Mute", solo: "Solo", voice: "Voice", staff: "Staff", treble: "Treble", bass: "Bass", duration: "Duration", rest: "Rest", outputShift: "Output shift",
      dot: "Dot", doubleDot: "Double dot", accidental: "Accidental", raise: "Raise", lower: "Lower", tuplet: "Tuplet", grace: "Grace", tie: "Tie", slur: "Slur",
      beam: "Beam", auto: "Auto", begin: "Begin", continueText: "Continue", end: "End", none: "None", articulation: "Articulation",
      ornament: "Ornament", dynamic: "Dynamic", lyrics: "Lyrics", chordSymbol: "Chord symbol", text: "Text", apply: "Apply", delete: "Delete",
      previousPage: "Previous page", nextPage: "Next page", page: "Page", measure: "Measure", cursor: "Cursor", stepMode: "Step entry",
      recording: "Recording", saved: "Autosaved", loaded: "Project loaded", noPart: "Add a part first", invalidFile: "This project file could not be read",
      autosaveFound: "The autosaved score was restored.", newScoreHint: "Create parts from the currently enabled Q-board keyboards and basses.",
      selectHint: "Left-click to enter or select; right-drag over noteheads, or right-drag the measure header to select measures.", emptyMeasure: "Click the staff or play Q-board to enter notes",
      addMeasure: "Add measure", removeMeasure: "Remove measure", pickup: "Pickup", key: "Key", time: "Time", repeatStart: "Repeat start",
      repeatEnd: "Repeat end", systemBreak: "System break", pageBreak: "Page break", staffLines: "Staff lines", tuning: "Tuning (MIDI)", drumMap: "GM percussion map",
      rawTake: "Raw take", loop: "Loop", selectionPlay: "Play selection", stepReady: "Step entry ready", stopRecording: "Stop recording", stringNumber: "String", fret: "Fret",
      close: "Close score", jsonProject: "Q-board project JSON", copiedFromQBoard: "Score created from current Q-board", synced: "Part settings synchronized",
      file: "File", edit: "Edit", input: "Input", playback: "Playback", layout: "Layout", pageSize: "Paper", orientation: "Orientation",
      portrait: "Portrait", landscape: "Landscape", metadata: "Metadata", event: "Note / event", part: "Part", lyricsVerse: "Lyrics verse",
      velocity: "Velocity", source: "Input source", manual: "Manual", realtime: "Realtime", selectAllMeasure: "Select measure", duplicate: "Duplicate",
      addDirection: "Add text marking", rehearsal: "Rehearsal mark", crescendo: "Crescendo", diminuendo: "Diminuendo", metronome: "Metronome",
      errorRender: "This measure could not be laid out", noVexFlow: "VexFlow is unavailable.", recovery: "Crash recovery", discard: "Start a blank score",
      timeline: "Horizontal timeline", tripletDurations: "Triplet values", batchMeasures: "Batch time / tempo", measureSettings: "Measure settings",
      fromMeasure: "First measure", toMeasure: "Last measure", beats: "Beats", beatType: "Beat value", applyTime: "Set time signature", applyTempo: "Set tempo",
      mode: "Mode", major: "Major", minor: "Minor", confirm: "Apply", cancel: "Cancel", settings: "Settings", partSettings: "Part settings",
      applyScope: "Apply range", onlyMeasure: "This measure only", throughMeasure: "Through measure X", followingMeasures: "All following measures", playbackPosition: "Playback position", sourceBinding: "Input source",
      transpositionOctave: "Transpose octaves",
      pause: "Pause", currentDuration: "Current value", noteFade: "Note fade", pedalDamping: "Pedal damping", deletePart: "Delete part", clearPart: "Clear part",
      deletePartConfirm: "Delete this part and all of its notation?", clearPartConfirm: "Clear all notation in this part? Part settings and raw takes will be kept.", partCleared: "Part notation cleared", atLeastOnePart: "A score must keep at least one part.", restOverlap: "A note or rest already occupies that span.", voiceLimit: "A staff can contain at most four simultaneous rhythmic voices.",
      grandInputMode: "Grand-staff entry", unifiedGrandInput: "One unified part", splitGrandInput: "Separate upper/lower",
      noteDuration: "Note value", noteDots: "Dots", splitIntoTwo: "Split into 2", splitIntoThree: "Split into 3", splitTooSmall: "This note cannot be split further. The minima are 1/64 and a 1/48 triplet.", rhythmEditFailed: "That value cannot be represented correctly at this position.",
      clipboard: "Clipboard", clearClipboard: "Clear", measureClipboard: "Measure clipboard", noteClipboard: "Note clipboard", emptyClipboard: "Clipboard is empty",
      insertMeasureHere: "Insert measures here", measureLimit: "Scores support at most 300 measures.", copied: "Copied", pasteNeedsBoundary: "Select a measure boundary before pasting.",
      scoreManual: "Score editor", scoreManualIntro: "Score mode uses fixed part rows and a draggable playback timeline while the complete Q keyboard and bass remain playable below. The left rail controls visibility, solo, mute, order, and part settings; double-click a measure header to edit its key, meter, tempo, and apply range.",
      scoreManualStep: "Step entry: choose a regular or triplet value, voice, staff, and marks, then play Q-board. Notes within 45 ms become a chord. Enable the rest tool and click a staff to insert a rest of the selected value.",
      scoreManualRecord: "Realtime recording starts with a one-measure count-in and keeps velocity, pedals, and raw press/release timing. Quantization is display-only and reversible.",
      scoreManualExport: "Project JSON reopens losslessly; MusicXML, Type-1 MIDI, and Print/PDF provide interchange and layout output.",
      manualContext: "Cursor and key", manualContextItems: "Select and drag the red cursor in either the score or timeline.|With the cursor selected, Left and Right move by the current value; with no selection, Delete removes every note at the previous onset.|The first note after the cursor determines the current measure, whose key stays synchronized with the Q keyboard.",
      manualRhythm: "Notes, tuplets, and rests", manualRhythmItems: "Regular values run from whole through sixty-fourth notes, with single/double dots and 2–9 tuplets.|Standard triplets use a 3:2 ratio: 1/3, 1/6, 1/12, and 1/24 use half, quarter, eighth, and sixteenth-note shapes; manual subdivision reaches 1/48.|Select an existing note to change its value and dots, or split it into two/three tied notes. When staggered rhythms overlap in one voice, the earlier note is divided at the later onset and tied while the new rhythm is placed in another internal voice.|The rest tool affects pointer entry only; derived rests fill and merge by measure and beat group and export to MusicXML.",
      manualSelection: "Selection and editing", manualSelectionItems: "Left-click selects or enters; right-drag selection tests notehead centers only.|Right-drag measure headers to select a range; paste at a red boundary to insert copied measures.|Ctrl+C, Ctrl+V, Delete, Ctrl+Z, and Ctrl+Y copy, paste, delete, undo, and redo.",
      manualParts: "Parts, TAB, and sources", manualPartsItems: "Each physical keyboard or bass can bind to an independent part; the part rail controls visibility, mute, solo, order, and settings.|A grand staff can use one unified input group or separate upper/lower editing groups while remaining one instrument part.|Clear Part removes notation but keeps settings and raw takes; Delete Part removes the part and its notation.|Guitar uses six-line TAB and bass uses four-line TAB; each chord pitch stores its own string and fret, including negative frets.|Select a TAB number and use Up/Down, or click its upper/lower half, to change string.",
      manualPlayback: "Playback and recording", manualPlaybackItems: "Play, pause, stop, record, and seek share the Web Audio clock; the red line sits to the left of the sounding note.|Notes release with the part's note fade; pedaled notes release with pedal damping.|Recording keeps velocity, pedal, and raw timing; requantization does not destroy the original take.",
      manualMeasures: "Measures and layout", manualMeasuresItems: "Double-click a measure header to edit key, meter, tempo, pickup, repeats, and system/page breaks.|Changes may affect only this measure, through a chosen measure, or every following measure.|Keys span -14 to +14 fifths; contextual accidentals use naturals, sharps/flats, and double/triple combinations as needed.",
      manualOutput: "Save, exchange, and print", manualOutputItems: "Project JSON preserves the editable document and autosave recovery.|MusicXML 4.0 and Type-1 MIDI provide exchange; output shift never changes written pitch.|Print/PDF creates a separate paginated layout, wraps systems to paper width, and honors manual breaks."
    }
  };

  const compactLocales = {
    fr: ["Partition", "Nouvelle partition", "Ouvrir", "Enregistrer", "Exporter", "Annuler", "Rétablir", "Lecture", "Arrêt", "Enregistrer", "Parties", "Ajouter", "Synchroniser depuis Q-board", "Propriétés", "Titre", "Compositeur", "Paroles", "Mesure", "Voix", "Portée", "Silence", "Imprimer / PDF"],
    de: ["Partitur", "Neue Partitur", "Öffnen", "Speichern", "Export", "Rückgängig", "Wiederholen", "Abspielen", "Stopp", "Aufnehmen", "Stimmen", "Stimme hinzufügen", "Mit Q-board abgleichen", "Eigenschaften", "Titel", "Komponist", "Liedtext", "Takt", "Stimme", "System", "Pause", "Drucken / PDF"],
    es: ["Partitura", "Nueva partitura", "Abrir", "Guardar", "Exportar", "Deshacer", "Rehacer", "Reproducir", "Detener", "Grabar", "Partes", "Añadir parte", "Sincronizar Q-board", "Propiedades", "Título", "Compositor", "Letra", "Compás", "Voz", "Pentagrama", "Silencio", "Imprimir / PDF"],
    pt: ["Partitura", "Nova partitura", "Abrir", "Salvar", "Exportar", "Desfazer", "Refazer", "Reproduzir", "Parar", "Gravar", "Partes", "Adicionar parte", "Sincronizar Q-board", "Propriedades", "Título", "Compositor", "Letra", "Compasso", "Voz", "Pauta", "Pausa", "Imprimir / PDF"],
    ja: ["楽譜", "新規スコア", "開く", "保存", "書き出し", "元に戻す", "やり直す", "再生", "停止", "録音", "パート", "パート追加", "Q-boardから同期", "プロパティ", "曲名", "作曲者", "歌詞", "小節", "声部", "譜表", "休符", "印刷 / PDF"],
    ar: ["المدونة", "مدونة جديدة", "فتح", "حفظ", "تصدير", "تراجع", "إعادة", "تشغيل", "إيقاف", "تسجيل", "الأجزاء", "إضافة جزء", "مزامنة Q-board", "الخصائص", "العنوان", "المؤلف", "الكلمات", "المازورة", "الصوت", "المدرج", "سكتة", "طباعة / PDF"],
    ru: ["Партитура", "Новая партитура", "Открыть", "Сохранить", "Экспорт", "Отменить", "Повторить", "Воспроизвести", "Стоп", "Запись", "Партии", "Добавить партию", "Синхронизировать Q-board", "Свойства", "Название", "Композитор", "Текст", "Такт", "Голос", "Нотоносец", "Пауза", "Печать / PDF"],
    it: ["Partitura", "Nuova partitura", "Apri", "Salva", "Esporta", "Annulla", "Ripeti", "Riproduci", "Stop", "Registra", "Parti", "Aggiungi parte", "Sincronizza Q-board", "Proprietà", "Titolo", "Compositore", "Testo", "Battuta", "Voce", "Pentagramma", "Pausa", "Stampa / PDF"],
    ms: ["Skor", "Skor baharu", "Buka", "Simpan", "Eksport", "Buat asal", "Buat semula", "Main", "Henti", "Rakam", "Bahagian", "Tambah bahagian", "Segerak Q-board", "Sifat", "Tajuk", "Komposer", "Lirik", "Bar", "Suara", "Baluk", "Rehat", "Cetak / PDF"],
    vi: ["Tổng phổ", "Tổng phổ mới", "Mở", "Lưu", "Xuất", "Hoàn tác", "Làm lại", "Phát", "Dừng", "Thu âm", "Bè", "Thêm bè", "Đồng bộ Q-board", "Thuộc tính", "Tiêu đề", "Nhạc sĩ", "Lời", "Ô nhịp", "Bè", "Khuông", "Dấu lặng", "In / PDF"],
    tr: ["Partisyon", "Yeni partisyon", "Aç", "Kaydet", "Dışa aktar", "Geri al", "Yinele", "Çal", "Durdur", "Kaydet", "Partiler", "Parti ekle", "Q-board ile eşitle", "Özellikler", "Başlık", "Besteci", "Sözler", "Ölçü", "Ses", "Dizek", "Es", "Yazdır / PDF"],
    ko: ["악보", "새 악보", "열기", "저장", "내보내기", "실행 취소", "다시 실행", "재생", "정지", "녹음", "파트", "파트 추가", "Q-board 동기화", "속성", "제목", "작곡가", "가사", "마디", "성부", "보표", "쉼표", "인쇄 / PDF"]
  };
  const compactKeys = ["score", "newScore", "openProject", "saveProject", "export", "undo", "redo", "play", "stop", "record", "parts", "addPart", "syncParts", "inspector", "title", "composer", "lyrics", "measure", "voice", "staff", "rest", "print"];
  Object.entries(compactLocales).forEach(([locale, values]) => {
    strings[locale] = { ...strings.en };
    compactKeys.forEach((key, index) => { strings[locale][key] = values[index]; });
  });
  const localizedExtras = {
    fr: ["Basse standard + TAB", "Dièse", "Bémol"], de: ["Bass-Notation + TAB", "Erhöhen", "Erniedrigen"],
    es: ["Bajo estándar + TAB", "Subir", "Bajar"], pt: ["Baixo padrão + TAB", "Elevar", "Baixar"],
    ja: ["ベース標準譜 + TAB", "上げる", "下げる"], ar: ["تدوين الباس + TAB", "رفع", "خفض"],
    ru: ["Бас: ноты + TAB", "Повысить", "Понизить"], it: ["Basso standard + TAB", "Alza", "Abbassa"],
    ms: ["Bes standard + TAB", "Naik", "Turun"], vi: ["Bass chuẩn + TAB", "Thăng", "Giáng"],
    tr: ["Bas standart + TAB", "Yükselt", "Alçalt"], ko: ["베이스 오선보 + TAB", "올림", "내림"]
  };
  Object.entries(localizedExtras).forEach(([locale, values]) => {
    ["bassTab", "raise", "lower"].forEach((key, index) => { strings[locale][key] = values[index]; });
  });

  let host = null;
  let workspace = null;
  let doc = null;
  let history = new Core.History();
  let activePartId = null;
  let inputPartId = null;
  let selection = new Set();
  let selectionAnchor = null;
  let clipboard = { type: null, events: [], measures: [] };
  let clipboardSelection = new Set();
  let clipboardSelectionAnchor = null;
  let measureSelection = null;
  let measureDrag = null;
  let insertionBoundary = null;
  let renderBoxes = [];
  let dirtyTimer = 0;
  let renderTimer = 0;
  let openState = false;
  let entry = { duration: "q", tripletDuration: 0, dots: 0, rest: false, accidental: "raise", tuplet: 0, tupletId: null, tupletProgress: 0, grace: false, tie: false, slur: false, beam: "auto", articulation: "", ornament: "", dynamic: "" };
  let cursor = { measure: 0, tick: 0, staff: 0, voice: 1 };
  let stepGroups = new Map();
  let recording = null;
  let playback = null;
  let dragSelect = null;
  let printMode = false;
  let printSystemStarts = new Set();
  let scrollRenderLeft = -1;
  let syncingTimelineScroll = false;
  let measureLayout = [];
  let measureRhythmMaps = new Map();
  let measureExtraWidths = new Map();
  let measureWidthCache = new Map();
  let timelineDrag = null;
  let draggedPartId = null;
  let partPointerDrag = null;
  let playbackPosition = { measure: 0, tick: 0 };
  let playbackFrame = 0;
  let autoFollowSuppressed = false;
  let transportState = "stopped";
  let timelineRenderSignature = "";
  let timelineScrollFrame = 0;
  let renderGeneration = 0;
  let scoreResizeObserver = null;
  let heightDrag = null;
  let playheadSelected = false;
  let selectedTabPitch = null;
  let playheadDrag = null;
  let verticalScrollFrame = 0;
  let pendingVerticalScroll = null;
  let printRoot = null;
  let contextEventId = null;
  let contextMeasureIndex = 0;
  let syncedKeySignature = "";
  let layoutDirty = true;
  let layoutDocumentId = null;

  function locale() {
    const value = host?.language?.() || document.documentElement.lang?.slice(0, 2) || "zh";
    return strings[value] ? value : "en";
  }

  function t(key) {
    return strings[locale()]?.[key] || strings.en[key] || key;
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function icon(name) {
    const icons = {
      new: "+", open: "↥", save: "↓", undo: "↶", redo: "↷", play: "▶", pause: "Ⅱ", stop: "■", record: "●", print: "▣",
      prev: "‹", next: "›", close: "×", delete: "⌫", copy: "⧉", paste: "▤", loop: "↻", sync: "⟳"
    };
    return `<span class="qscore-icon" aria-hidden="true">${icons[name] || name}</span>`;
  }

  function button(action, label, iconName = "", extra = "") {
    return `<button class="qscore-command ${extra}" type="button" data-score-action="${action}" title="${esc(label)}" aria-label="${esc(label)}">${iconName ? icon(iconName) : ""}<span>${esc(label)}</span></button>`;
  }

  function activePart() {
    return doc?.parts.find(part => part.id === activePartId) || doc?.parts[0] || null;
  }

  function selectInputPart(partId) {
    const part = Core.findPart(doc, partId);
    if (!part) return null;
    activePartId = part.id;
    inputPartId = part.id;
    part.enabled = true;
    host?.enableScoreSource?.(part.sourceProfileId, part.sourceType);
    return part;
  }

  function currentMeasure() {
    return doc?.measures[contextMeasureIndex] || doc?.measures[cursor.measure] || doc?.measures[0] || null;
  }

  function editorPosition() {
    return playback?.visualPosition || playbackPosition;
  }

  function firstContextNote(position = editorPosition()) {
    return doc ? Core.nextNoteAtPosition(doc, position, inputPartId || activePartId) : null;
  }

  function updateEditorContext({ syncKey = true } = {}) {
    if (!doc) return null;
    const position = editorPosition();
    const target = firstContextNote(position);
    const nextEventId = target?.event.id || null;
    const nextMeasure = Math.max(0, Math.min(doc.measures.length - 1, target?.event.measure ?? position.measure ?? cursor.measure ?? 0));
    const changedContext = nextEventId !== contextEventId || nextMeasure !== contextMeasureIndex;
    contextEventId = nextEventId;
    contextMeasureIndex = nextMeasure;
    workspace?.querySelectorAll("[data-score-measure-settings]").forEach(card => card.classList.toggle("is-active", Number(card.dataset.scoreMeasureSettings) === contextMeasureIndex));
    workspace?.querySelectorAll(".qscore-event-node.is-cursor-target").forEach(node => node.classList.remove("is-cursor-target"));
    if (contextEventId) workspace?.querySelector(`[data-qscore-event="${CSS.escape(contextEventId)}"]`)?.closest("g")?.classList.add("is-cursor-target");
    const tempoInput = workspace?.querySelector('[data-score-field="tempo"]');
    if (tempoInput) tempoInput.value = currentMeasure()?.tempo || doc.settings.tempo;
    if (syncKey) {
      const key = currentMeasure()?.key || doc.settings.key;
      const signature = `${key.fifths}:${key.mode}`;
      if (signature !== syncedKeySignature) {
        syncedKeySignature = signature;
        host?.syncScoreKey?.({ ...Core.clone(key), measure: contextMeasureIndex });
      }
    }
    return { eventId: contextEventId, measure: contextMeasureIndex, changed: changedContext };
  }

  function makeWorkspace() {
    workspace = document.getElementById("qscoreWorkspace");
    if (!workspace) {
      workspace = document.createElement("section");
      workspace.id = "qscoreWorkspace";
      workspace.className = "qscore-workspace";
      document.querySelector(".stage-wrap")?.before(workspace);
    }
    workspace.setAttribute("aria-label", t("score"));
    let divider = document.getElementById("qscoreDivider");
    if (!divider) {
      divider = document.createElement("div");
      divider.id = "qscoreDivider";
      divider.className = "qscore-height-divider";
      divider.hidden = true;
      workspace.after(divider);
    }
    const scoreTab = document.getElementById("menuScore");
    if (scoreTab) scoreTab.textContent = t("score");
    workspace.innerHTML = `
      <div class="qscore-shell">
        <div class="qscore-menubar">
          <div class="qscore-toolbar-group">
            ${button("new", t("newScore"), "new")}${button("open", t("openProject"), "open")}${button("save", t("saveProject"), "save")}
            <button class="qscore-command" type="button" data-score-menu="export"><span>${esc(t("export"))}</span><span aria-hidden="true">▾</span></button>
            ${button("print", t("print"), "print")}
          </div>
          <div class="qscore-toolbar-group">${button("undo", t("undo"), "undo")}${button("redo", t("redo"), "redo")}${button("copy", t("copy"), "copy")}${button("paste", t("paste"), "paste")}${button("delete", t("delete"), "delete")}</div>
          <div class="qscore-toolbar-group">
            <label class="qscore-field qscore-checks"><input type="checkbox" data-score-field="loop"> <span>${esc(t("loop"))}</span></label>
            <label class="qscore-field"><span>${esc(t("tempo"))}</span><input type="number" min="20" max="400" step="1" data-score-field="tempo"></label>
            ${button("batch-measures", t("batchMeasures"), "sync")}
          </div>
          <div class="qscore-toolbar-group qscore-toolbar-grow">
            <label class="qscore-field"><span>${esc(t("quantize"))}</span><select data-score-field="quantize">${["q", "8", "16", "32", "64"].map(value => `<option value="${value}">${DURATION_LABELS[value]}</option>`).join("")}</select></label>
            ${button("requantize", t("quantize"), "sync")}${button("restore-timing", t("restoreTiming"), "↺")}
            <label class="qscore-field qscore-checks"><input type="checkbox" data-score-field="concertPitch"> <span>${esc(t("concertPitch"))}</span></label>
            <label class="qscore-field"><span>${esc(t("zoom"))}</span><input type="range" min="0.55" max="1.8" step="0.05" data-score-field="zoom"></label>
            ${button("close", t("close"), "close")}
          </div>
        </div>

        <div class="qscore-palette">
          <div class="qscore-toolbar-group" role="group" aria-label="${esc(t("duration"))}">
            <output class="qscore-current-duration" data-score-current-duration aria-live="polite"></output>
            ${Core.durationOrder.map(value => `<button class="qscore-duration-button" type="button" data-score-duration="${value}" title="${DURATION_LABELS[value]}">${DURATION_LABELS[value]}</button>`).join("")}
            <button class="qscore-command qscore-rest-button" type="button" data-score-toggle="rest" title="${esc(t("rest"))}" aria-label="${esc(t("rest"))}"><span data-score-rest-glyph aria-hidden="true">𝄽</span></button>
            <button class="qscore-command" type="button" data-score-dots="1">•</button><button class="qscore-command" type="button" data-score-dots="2">••</button>
          </div>
          <div class="qscore-toolbar-group" role="group" aria-label="${esc(t("tripletDurations"))}">
            <span class="qscore-palette-label">${esc(t("tripletDurations"))}</span>
            ${Object.keys(TRIPLET_DURATIONS).map(value => `<button class="qscore-duration-button" type="button" data-score-triplet-duration="${value}" title="1/${value}">1/${value}</button>`).join("")}
          </div>
          <div class="qscore-toolbar-group">
            <div class="qscore-field"><span>${esc(t("accidental"))}</span><div class="qscore-segmented" role="group" aria-label="${esc(t("accidental"))}"><button type="button" data-score-accidental="raise">♯ ${esc(t("raise"))}</button><button type="button" data-score-accidental="lower">♭ ${esc(t("lower"))}</button></div></div>
            <label class="qscore-field"><span>${esc(t("tuplet"))}</span><select data-score-entry="tuplet"><option value="0">${esc(t("none"))}</option>${Array.from({ length: 8 }, (_, index) => `<option value="${index + 2}">${index + 2}</option>`).join("")}</select></label>
            <button class="qscore-command" type="button" data-score-toggle="grace">${esc(t("grace"))}</button>
            <button class="qscore-command" type="button" data-score-toggle="tie">${esc(t("tie"))}</button>
            <button class="qscore-command" type="button" data-score-toggle="slur">${esc(t("slur"))}</button>
          </div>
          <div class="qscore-toolbar-group">
            <label class="qscore-field"><span>${esc(t("voice"))}</span><select data-score-cursor="voice">${[1, 2, 3, 4].map(value => `<option>${value}</option>`).join("")}</select></label>
            <label class="qscore-field"><span>${esc(t("staff"))}</span><select data-score-cursor="staff"><option value="0">${esc(t("treble"))}</option><option value="1">${esc(t("bass"))}</option></select></label>
            <label class="qscore-field"><span>${esc(t("articulation"))}</span><select data-score-entry="articulation"><option value="">${esc(t("none"))}</option><option value="a.">Stacc.</option><option value="a>">Accent</option><option value="a-">Tenuto</option><option value="a^">Marcato</option></select></label>
            <label class="qscore-field"><span>${esc(t("dynamic"))}</span><select data-score-entry="dynamic"><option value="">${esc(t("none"))}</option>${["ppp", "pp", "p", "mp", "mf", "f", "ff", "fff"].map(value => `<option>${value}</option>`).join("")}</select></label>
            <label class="qscore-field"><span>${esc(t("beam"))}</span><select data-score-entry="beam"><option value="auto">${esc(t("auto"))}</option><option value="begin">${esc(t("begin"))}</option><option value="continue">${esc(t("continueText"))}</option><option value="end">${esc(t("end"))}</option><option value="none">${esc(t("none"))}</option></select></label>
            <label class="qscore-field"><span>${esc(t("ornament"))}</span><select data-score-entry="ornament"><option value="">${esc(t("none"))}</option><option value="trill-mark">tr</option><option value="turn">Turn</option><option value="mordent">Mordent</option></select></label>
          </div>
        </div>

        <div class="qscore-main">
          <aside class="qscore-sidebar">
            <div class="qscore-panel-head"><strong>${esc(t("parts"))}</strong><span>${button("add-part", t("addPart"), "new", "qscore-part-action")}${button("sync-parts", t("syncParts"), "sync", "qscore-part-action")}</span></div>
            <div class="qscore-part-list" data-score-part-list></div>
          </aside>
          <div class="qscore-viewport" data-score-viewport tabindex="0">
            <div class="qscore-page" data-score-page>
              <div class="qscore-measure-strip" data-score-measure-strip aria-label="${esc(t("timeline"))}"></div>
              <div class="qscore-render" data-score-render></div>
              <div class="qscore-playhead" data-score-playhead role="slider" tabindex="0" aria-label="${esc(t("cursor"))}" hidden><span aria-hidden="true"></span></div>
            </div>
          </div>
          <aside class="qscore-inspector" data-score-inspector></aside>
        </div>

        <div class="qscore-transport" data-score-transport>
          <button class="qscore-icon" type="button" data-score-action="play" title="${esc(t("play"))}" aria-label="${esc(t("play"))}">${icon("play")}</button>
          <button class="qscore-icon" type="button" data-score-action="stop" title="${esc(t("stop"))}" aria-label="${esc(t("stop"))}">${icon("stop")}</button>
          <button class="qscore-icon qscore-record" type="button" data-score-action="record" title="${esc(t("record"))}" aria-label="${esc(t("record"))}">${icon("record")}</button>
          <output class="qscore-position-readout" data-score-position aria-label="${esc(t("playbackPosition"))}">1:1.00</output>
          <div class="qscore-timeline-track" data-score-timeline-track role="slider" tabindex="0" aria-label="${esc(t("timeline"))}">
            <div class="qscore-timeline-measures" data-score-timeline-measures></div>
            <div class="qscore-timeline-window" data-score-timeline-window><span class="is-start" data-score-timeline-resize="start" aria-hidden="true"></span><span class="is-end" data-score-timeline-resize="end" aria-hidden="true"></span></div>
            <div class="qscore-timeline-cursor" data-score-timeline-cursor role="slider" tabindex="0" aria-label="${esc(t("cursor"))}"><span aria-hidden="true"></span></div>
          </div>
        </div>

        <div class="qscore-statusbar">
          <span data-score-status>${esc(t("stepReady"))}</span>
          <span class="qscore-toolbar-grow">${esc(t("selectHint"))}</span>
          <button class="qscore-command qscore-mobile-only" type="button" data-score-action="toggle-parts">${esc(t("parts"))}</button>
          <button class="qscore-command qscore-mobile-only" type="button" data-score-action="toggle-inspector">${esc(t("inspector"))}</button>
        </div>
      </div>
      <input type="file" accept=".json,application/json" data-score-file hidden>
      <div class="qscore-toast" data-score-toast hidden></div>
      <div class="qscore-countin" data-score-countin hidden></div>
      <dialog class="qscore-dialog" data-score-dialog></dialog>`;
    bindWorkspace();
    setTransportState(transportState);
  }

  function bindWorkspace() {
    workspace.onclick = onWorkspaceClick;
    workspace.ondblclick = onWorkspaceDoubleClick;
    workspace.onchange = onWorkspaceChange;
    workspace.oninput = onWorkspaceInput;
    workspace.querySelector("[data-score-file]").addEventListener("change", loadFileInput);
    const viewport = workspace.querySelector("[data-score-viewport]");
    viewport.addEventListener("pointerdown", beginBoxSelection);
    viewport.addEventListener("pointermove", moveBoxSelection);
    viewport.addEventListener("pointerup", endBoxSelection);
    workspace.onkeydown = onEditorKeyDown;
    viewport.addEventListener("scroll", onTimelineScroll, { passive: true });
    viewport.addEventListener("contextmenu", event => event.preventDefault());
    const measureStrip = workspace.querySelector("[data-score-measure-strip]");
    measureStrip?.addEventListener("pointerdown", beginMeasureSelection);
    measureStrip?.addEventListener("pointermove", moveMeasureSelection);
    measureStrip?.addEventListener("pointerup", endMeasureSelection);
    measureStrip?.addEventListener("pointercancel", endMeasureSelection);
    measureStrip?.addEventListener("contextmenu", event => event.preventDefault());
    workspace.querySelector(".qscore-sidebar")?.addEventListener("scroll", onPartRailScroll, { passive: true });
    const timeline = workspace.querySelector("[data-score-timeline-track]");
    timeline?.addEventListener("pointerdown", beginTimelineDrag);
    timeline?.addEventListener("pointermove", moveTimelineDrag);
    timeline?.addEventListener("pointerup", endTimelineDrag);
    timeline?.addEventListener("pointercancel", endTimelineDrag);
    const partList = workspace.querySelector("[data-score-part-list]");
    partList?.addEventListener("pointerdown", beginPartPointerDrag);
    partList?.addEventListener("pointermove", movePartPointerDrag);
    partList?.addEventListener("pointerup", endPartPointerDrag);
    partList?.addEventListener("pointercancel", endPartPointerDrag);
    workspace.querySelector('[data-score-action="toggle-parts"]')?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      toggleMobilePanel(".qscore-sidebar");
    });
    workspace.querySelector('[data-score-action="toggle-inspector"]')?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      toggleMobilePanel(".qscore-inspector");
    });
    const divider = document.getElementById("qscoreDivider");
    if (divider) {
      divider.onpointerdown = beginHeightDrag;
      divider.onpointermove = moveHeightDrag;
      divider.onpointerup = endHeightDrag;
      divider.onpointercancel = endHeightDrag;
    }
    scoreResizeObserver?.disconnect();
    scoreResizeObserver = new ResizeObserver(() => {
      timelineRenderSignature = "";
      renderTransportTimeline();
      updateTimelineWindow();
    });
    scoreResizeObserver.observe(workspace);
  }

  function applyScoreHeightRatio(ratio, persist = false) {
    const app = document.querySelector(".app");
    if (!app) return;
    const value = Math.max(0.28, Math.min(0.82, Number(ratio) || 0.44));
    app.style.setProperty("--qscore-height-ratio", `${value * 100}%`);
    if (persist) try { localStorage.setItem("qboard-score-height-ratio", String(value)); } catch (_) { /* UI sizing can remain session-only. */ }
  }

  function scoreRatioForHeight(height) {
    const appHeight = document.querySelector(".app")?.getBoundingClientRect().height || window.innerHeight;
    return (Math.max(0, Number(height) || 0) + 3) / Math.max(1, appHeight);
  }

  function beginHeightDrag(event) {
    if (event.button !== 0 || !openState) return;
    const divider = event.currentTarget;
    const app = document.querySelector(".app");
    const stage = document.querySelector(".stage-wrap");
    if (!app || !stage) return;
    const workspaceRect = workspace.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    heightDrag = { pointerId: event.pointerId, top: workspaceRect.top, available: stageRect.bottom - workspaceRect.top };
    divider.setPointerCapture?.(event.pointerId);
    document.body.classList.add("is-resizing-score");
    event.preventDefault();
  }

  function moveHeightDrag(event) {
    if (!heightDrag || heightDrag.pointerId !== event.pointerId) return;
    const scoreMin = Math.min(190, heightDrag.available * 0.28);
    const keyboardMin = Math.min(160, heightDrag.available * 0.35);
    const height = Math.max(scoreMin, Math.min(heightDrag.available - keyboardMin, event.clientY - heightDrag.top));
    applyScoreHeightRatio(scoreRatioForHeight(height), false);
    event.preventDefault();
  }

  function endHeightDrag(event) {
    if (!heightDrag || heightDrag.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const ratio = scoreRatioForHeight(workspace.getBoundingClientRect().height);
    heightDrag = null;
    document.body.classList.remove("is-resizing-score");
    applyScoreHeightRatio(ratio, true);
    scheduleRender();
  }

  function onTimelineScroll() {
    if (!workspace || syncingTimelineScroll) return;
    const viewport = workspace.querySelector("[data-score-viewport]");
    queueVerticalScroll("score", viewport.scrollTop);
    updateTimelineWindow();
    if (timelineScrollFrame) return;
    timelineScrollFrame = window.requestAnimationFrame(() => {
      timelineScrollFrame = 0;
      if (timelineDrag) return;
      const range = renderedMeasureRange();
      const threshold = measureLayout[range.first]?.width || MIN_MEASURE_NOTE_WIDTH;
      if (Math.abs(viewport.scrollLeft - scrollRenderLeft) >= threshold) scheduleRender();
    });
  }

  function onPartRailScroll() {
    if (!workspace || syncingTimelineScroll) return;
    const sidebar = workspace.querySelector(".qscore-sidebar");
    queueVerticalScroll("parts", sidebar.scrollTop);
  }

  function queueVerticalScroll(source, top) {
    pendingVerticalScroll = { source, top: Math.max(0, Number(top) || 0) };
    if (verticalScrollFrame) return;
    verticalScrollFrame = window.requestAnimationFrame(() => {
      verticalScrollFrame = 0;
      const pending = pendingVerticalScroll;
      pendingVerticalScroll = null;
      if (!pending || !workspace) return;
      const target = pending.source === "score" ? workspace.querySelector(".qscore-sidebar") : workspace.querySelector("[data-score-viewport]");
      if (!target || Math.abs(target.scrollTop - pending.top) < 0.5) return;
      syncingTimelineScroll = true;
      target.scrollTop = pending.top;
      syncingTimelineScroll = false;
    });
  }

  function setStatus(message) {
    const target = workspace?.querySelector("[data-score-status]");
    if (target) target.textContent = message;
  }

  function setTransportState(state) {
    transportState = state;
    const playButton = workspace?.querySelector('[data-score-action="play"]');
    if (playButton) {
      const playing = state === "playing";
      playButton.innerHTML = icon(playing ? "pause" : "play");
      playButton.title = t(playing ? "pause" : "play");
      playButton.setAttribute("aria-label", playButton.title);
      playButton.classList.toggle("is-active", playing);
    }
    const recordButton = workspace?.querySelector('[data-score-action="record"]');
    if (recordButton) {
      recordButton.classList.toggle("is-active", state === "count-in" || state === "recording");
      recordButton.classList.toggle("is-recording", state === "recording");
    }
  }

  function toast(message) {
    const target = workspace?.querySelector("[data-score-toast]");
    if (!target) return;
    target.textContent = message;
    target.hidden = false;
    window.clearTimeout(target._timer);
    target._timer = window.setTimeout(() => { target.hidden = true; }, 2200);
  }

  function snapshot() {
    history.push(doc);
  }

  function changed({ render = true, inspector = true } = {}) {
    doc.modifiedAt = new Date().toISOString();
    updateEditorContext();
    if (render) { layoutDirty = true; scheduleRender(); }
    if (inspector) renderInspector();
    renderPartList();
    scheduleAutosave();
  }

  function profileParts() {
    const data = host?.snapshotProfiles?.() || {};
    const profiles = Array.isArray(data.profiles) ? data.profiles : [];
    const basses = Array.isArray(data.basses) ? data.basses : [];
    const parts = profiles.filter(profile => profile.enabled !== false && profile.source !== "pointer").map((profile, index) => Core.defaultPart({
      name: profile.label || `${t("part")} ${index + 1}`,
      shortName: profile.short || `P${index + 1}`,
      sourceProfileId: profile.id,
      sourceType: profile.source || "keyboard",
      colorIndex: profile.colorIndex || 0,
      instrumentId: profile.instrument || (index ? "piano" : "piano"),
      outputShift: Number(profile.outputShift) || 0,
      notationType: profile.source === "browser" || profile.id === "main" ? "grand" : "single",
      splitMidi: 60,
      volume: profile.volume ?? 0.8,
      noteFadeSeconds: profile.fadeSustainTime ?? 0.2,
      pedalDampingSeconds: data.sustainTime ?? 10,
      transposition: profile.transposition || { chromatic: 0, diatonic: 0, octave: 0 }
    }));
    basses.filter(layer => layer.enabled).forEach((layer, index) => parts.push(Core.defaultPart({
      name: layer.label || `${t("bass")} ${index + 1}`,
      shortName: `B${index + 1}`,
      sourceProfileId: layer.id,
      sourceType: "bass",
      colorIndex: layer.colorIndex || 0,
      instrumentId: layer.instrument || "cello",
      outputShift: Number(layer.outputShift) || 0,
      transposition: layer.transposition || { chromatic: 0, diatonic: 0, octave: 0 },
      notationType: "single",
      clef: "bass",
      volume: layer.volume ?? 0.5,
      noteFadeSeconds: layer.fadeTime ?? 0.5,
      pedalDampingSeconds: data.sustainTime ?? 10
    })));
    if (!parts.length) parts.push(Core.defaultPart({ name: t("part"), instrumentId: "piano", notationType: "grand", sourceProfileId: "main", sourceType: "browser", pedalDampingSeconds: data.sustainTime ?? 10 }));
    return { parts, settings: data };
  }

  function createNewScore({ force = false } = {}) {
    if (!force && doc && hasContent() && !window.confirm(t("newScoreHint"))) return false;
    stopAll();
    const { parts, settings } = profileParts();
    doc = Core.createDocument({
      title: settings.title || "Q-board Score",
      tempo: settings.tempo || 120,
      time: settings.time || { beats: 4, beatType: 4 },
      key: settings.key || { fifths: 0, mode: "major", tonic: "C" },
      quantize: "16",
      countInMeasures: 1,
      measureCount: 16,
      parts
    });
    history = new Core.History();
    activePartId = doc.parts[0]?.id || null;
    inputPartId = null;
    selection.clear();
    clipboard = { type: null, events: [], measures: [] };
    clipboardSelection.clear();
    measureSelection = null;
    insertionBoundary = null;
    cursor = { measure: 0, tick: 0, staff: 0, voice: 1 };
    playbackPosition = { measure: 0, tick: 0 };
    contextEventId = null;
    contextMeasureIndex = 0;
    syncedKeySignature = "";
    measureExtraWidths = new Map();
    measureWidthCache = new Map();
    layoutDirty = true;
    refreshAll();
    scheduleAutosave();
    toast(t("copiedFromQBoard"));
    return true;
  }

  function hasContent() {
    return Boolean(doc?.parts.some(part => part.events.length));
  }

  function refreshAll() {
    if (!workspace || !doc) return;
    updateEditorContext();
    workspace.dir = locale() === "ar" ? "rtl" : "ltr";
    workspace.querySelector('[data-score-field="tempo"]').value = currentMeasure()?.tempo || doc.settings.tempo;
    workspace.querySelector('[data-score-field="quantize"]').value = doc.settings.quantize;
    workspace.querySelector('[data-score-field="concertPitch"]').checked = Boolean(doc.settings.concertPitch);
    workspace.querySelector('[data-score-field="zoom"]').value = doc.settings.page.zoom;
    workspace.querySelector('[data-score-cursor="voice"]').value = cursor.voice;
    workspace.querySelector('[data-score-cursor="staff"]').value = cursor.staff;
    renderEntryState();
    renderPartList();
    renderInspector();
    renderScore();
  }

  function renderEntryState() {
    workspace.querySelectorAll("[data-score-duration]").forEach(button => button.classList.toggle("is-active", button.dataset.scoreDuration === entry.duration && !entry.tripletDuration));
    workspace.querySelectorAll("[data-score-triplet-duration]").forEach(button => button.classList.toggle("is-active", button.dataset.scoreTripletDuration === String(entry.tripletDuration || "")));
    workspace.querySelectorAll("[data-score-toggle]").forEach(button => button.classList.toggle("is-active", Boolean(entry[button.dataset.scoreToggle])));
    workspace.querySelectorAll("[data-score-dots]").forEach(button => button.classList.toggle("is-active", Number(button.dataset.scoreDots) === entry.dots));
    workspace.querySelectorAll("[data-score-entry]").forEach(control => { if (entry[control.dataset.scoreEntry] !== undefined) control.value = entry[control.dataset.scoreEntry]; });
    workspace.querySelectorAll("[data-score-accidental]").forEach(button => button.classList.toggle("is-active", button.dataset.scoreAccidental === entry.accidental));
    const dots = entry.dots === 2 ? "••" : entry.dots === 1 ? "•" : "";
    const value = entry.tripletDuration ? `1/${entry.tripletDuration}` : DURATION_LABELS[entry.duration] || "1/4";
    const tuplet = !entry.tripletDuration && Number(entry.tuplet) > 1 ? ` ${entry.tuplet}:${entry.tuplet - 1}` : "";
    const current = workspace.querySelector("[data-score-current-duration]");
    if (current) current.textContent = `${t("currentDuration")} ${value}${dots}${tuplet}`;
    const restGlyph = workspace.querySelector("[data-score-rest-glyph]");
    if (restGlyph) {
      restGlyph.textContent = ({ w: "𝄻", h: "𝄼", q: "𝄽", 8: "𝄾", 16: "𝄿", 32: "𝅀", 64: "𝅁" })[entry.duration] || "𝄽";
      restGlyph.dataset.rhythm = entry.tripletDuration ? "3" : Number(entry.tuplet) > 1 ? String(entry.tuplet) : "";
    }
  }

  function renderPartList() {
    const target = workspace?.querySelector("[data-score-part-list]");
    if (!target || !doc) return;
    const rows = doc.parts.map((part, index) => `
      <div class="qscore-part ${part.id === inputPartId ? "is-active" : ""} ${part.visible ? "" : "is-hidden"}" data-score-part="${part.id}" style="height:${partTrackHeight(part)}px">
        <button class="qscore-part-drag" type="button" data-score-part-drag="${part.id}" title="${esc(t("parts"))}" aria-label="${esc(t("parts"))}">↕</button>
        <button class="qscore-part-select" type="button" data-score-select-part="${part.id}">
          <span class="qscore-part-color" style="--qscore-part-hue:${Number(host?.partHue?.(part.colorIndex) ?? part.colorIndex * 30)}"></span>
          <span><strong>${esc(part.name)}</strong><small>${esc(part.shortName)} · ${esc(part.notationType)}</small></span>
        </button>
        <div class="qscore-part-actions">
          <button class="qscore-part-action ${part.solo ? "is-active" : ""}" type="button" data-score-part-solo="${part.id}" title="${esc(t("solo"))}" aria-pressed="${part.solo}">S</button>
          <button class="qscore-part-action ${part.mute ? "is-active" : ""}" type="button" data-score-part-mute="${part.id}" title="${esc(t("mute"))}" aria-pressed="${part.mute}">M</button>
          <button class="qscore-part-action ${part.visible ? "is-active" : ""}" type="button" data-score-part-visible="${part.id}" title="${esc(t("visible"))}" aria-pressed="${part.visible}">◉</button>
          <button class="qscore-part-action" type="button" data-score-part-settings="${part.id}" title="${esc(t("partSettings"))}" aria-label="${esc(t("partSettings"))}">⚙</button>
        </div>
      </div>`).join("");
    target.innerHTML = `<div class="qscore-part-track-spacer" aria-hidden="true"></div>${rows || `<div class="qscore-empty">${esc(t("noPart"))}</div>`}`;
  }

  function partTrackHeight(part) {
    if (!part.visible) return printMode ? 0 : 48;
    return part.notationType === "grand" || Core.isTabPart(part) ? 190 : 112;
  }

  function instrumentOptions() {
    const list = host?.instrumentOptions?.() || [];
    return list.length ? list : [{ id: "piano", label: "Piano" }, { id: "guitar", label: "Guitar" }, { id: "cello", label: "Cello" }];
  }

  function field(label, name, value, type = "text", attrs = "") {
    return `<label class="qscore-field"><span>${esc(label)}</span><input type="${type}" data-inspector="${name}" value="${esc(value)}" ${attrs}></label>`;
  }

  function inspectorEventRefs() {
    const refs = [...selection].map(id => Core.findEvent(doc, id)).filter(Boolean);
    if (refs.length <= 1) return refs;
    const groupId = refs[0]?.event.inputGroupId;
    return groupId && refs.every(ref => ref.part.id === refs[0].part.id && ref.event.inputGroupId === groupId) ? refs : [];
  }

  function rhythmOptionsHtml(selected) {
    const current = Core.rhythmValueForEvent(selected);
    const regular = Core.durationOrder.map(value => `<option value="${value}" ${current === value ? "selected" : ""}>${DURATION_LABELS[value]}</option>`);
    const triplets = [3, 6, 12, 24, 48].map(value => `<option value="triplet:${value}" ${current === `triplet:${value}` ? "selected" : ""}>1/${value} · 3:2</option>`);
    return [...regular, ...triplets].join("");
  }

  function renderInspector() {
    const target = workspace?.querySelector("[data-score-inspector]");
    if (!target || !doc) return;
    const selectedRefs = inspectorEventRefs();
    const selectedRef = selectedRefs[0] || null;
    const part = selectedRef?.part || activePart();
    const selected = selectedRef?.event || null;
    if (selected && Core.isTabPart(part)) Core.normalizeTabPositions(selected, part);
    const tabPitchIndex = Math.max(0, Math.min((selected?.pitches?.length || 1) - 1, selected && selectedTabPitch?.eventId === selected.id ? selectedTabPitch.pitchIndex : 0));
    const tabPosition = selected?.tab?.positions?.find(item => item.pitchIndex === tabPitchIndex);
    const eventHtml = selected ? `
      <section class="qscore-inspector-section">
        <h3>${esc(t("event"))}</h3>
        <div class="qscore-inspector-grid">
          ${field(t("measure"), "event.measure", selected.measure + 1, "number", 'min="1"')}
          ${field(t("voice"), "event.voice", selected.voice, "number", 'min="1" max="4"')}
          ${field(t("staff"), "event.staff", selected.staff + 1, "number", 'min="1" max="2"')}
          ${field(t("velocity"), "event.velocity", selected.velocity, "number", 'min="1" max="127"')}
        </div>
        ${selected.type === "note" ? `<div class="qscore-inspector-grid"><label class="qscore-field"><span>${esc(t("noteDuration"))}</span><select data-inspector="event.rhythm">${rhythmOptionsHtml(selected)}</select></label><label class="qscore-field"><span>${esc(t("noteDots"))}</span><select data-inspector="event.dots">${[0, 1, 2].map(value => `<option value="${value}" ${Number(selected.dots) === value ? "selected" : ""}>${value}</option>`).join("")}</select></label></div>` : ""}
        ${field(t("chordSymbol"), "event.chordSymbol", selected.chordSymbol)}
        ${field(t("lyrics"), "event.lyrics", selected.lyrics.map(item => item.text).join(" | "))}
        ${field(t("text"), "event.text", selected.text)}
        ${Core.isTabPart(part) ? `<div class="qscore-inspector-grid">${field(t("stringNumber"), "event.tab.string", tabPosition?.string || 1, "number", `min="1" max="${Core.tabTuning(part).length}"`)}${field(t("fret"), "event.tab.fret", tabPosition?.fret ?? 0, "number", 'min="-48" max="72"')}</div>` : ""}
        ${part?.notationType === "percussion" ? field(t("drumMap"), "event.percussion.gm", selected.percussion?.gm || selected.pitches[0]?.midi || 38, "number", 'min="27" max="87"') : ""}
        <div class="qscore-dialog-actions">${selected.type === "note" ? `${button("split-2", t("splitIntoTwo"))}${button("split-3", t("splitIntoThree"))}` : ""}${button("octave-down", "-8va")}${button("enharmonic", "♯/♭")}${button("octave-up", "+8va")}${button("apply-inspector", t("apply"))}${button("delete", t("delete"), "delete")}</div>
      </section>` : "";
    target.innerHTML = `<div class="qscore-panel-head"><strong>${esc(t("inspector"))}</strong></div>
      <section class="qscore-inspector-section">
        <h3>${esc(t("scoreInfo"))}</h3>
        ${field(t("title"), "doc.title", doc.title)}${field(t("composer"), "doc.composer", doc.composer || "")}${field(t("lyricist"), "doc.lyricist", doc.lyricist || "")}
        <div class="qscore-inspector-grid">${field(t("measureCount"), "doc.measureCount", doc.measures.length, "number", `min="1" max="${Core.MAX_MEASURES}"`)}${field(t("countIn"), "doc.countIn", doc.settings.countInMeasures, "number", 'min="0" max="8"')}</div>
        <div class="qscore-inspector-grid"><label class="qscore-field"><span>${esc(t("pageSize"))}</span><select data-inspector="doc.pageSize">${["A4", "Letter", "Legal"].map(value => `<option ${doc.settings.page.size === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label class="qscore-field"><span>${esc(t("orientation"))}</span><select data-inspector="doc.orientation"><option value="portrait" ${doc.settings.page.orientation === "portrait" ? "selected" : ""}>${esc(t("portrait"))}</option><option value="landscape" ${doc.settings.page.orientation === "landscape" ? "selected" : ""}>${esc(t("landscape"))}</option></select></label></div>
        <div class="qscore-dialog-actions">${button("apply-inspector", t("apply"))}</div>
      </section>
      ${eventHtml}${clipboardPanelHtml()}`;
    target.querySelector('[data-score-action="split-2"]')?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      splitSelectedNotes(2);
    });
    target.querySelector('[data-score-action="split-3"]')?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      splitSelectedNotes(3);
    });
  }

  function clipboardEventLabel(item) {
    const event = item.event || {};
    const part = Core.findPart(doc, item.partId);
    const rhythm = event.type === "rest" ? t("rest") : (event.pitches || []).map(Core.pitchName).join("+") || t("event");
    const measure = Number.isFinite(item.relativeMeasure) ? item.relativeMeasure + 1 : event.measure + 1;
    return `${part?.shortName || part?.name || t("part")} · ${measure}:${event.tick} · ${rhythm}`;
  }

  function clipboardPanelHtml() {
    const title = clipboard.type === "measures" ? t("measureClipboard") : clipboard.type === "events" ? t("noteClipboard") : t("clipboard");
    const items = clipboard.events || [];
    const body = clipboard.type
      ? `<div class="qscore-clipboard-summary">${clipboard.type === "measures" ? `${clipboard.measures.length} ${t("measure")}` : `${items.length} ${t("event")}`}</div>
         <div class="qscore-clipboard-list">${items.map((item, index) => `<button type="button" class="qscore-clipboard-item ${clipboardSelection.has(index) ? "is-selected" : ""}" data-score-clipboard-item="${index}">${esc(clipboardEventLabel(item))}</button>`).join("") || `<div class="qscore-empty-clipboard">${esc(t("emptyMeasure"))}</div>`}</div>
         <div class="qscore-dialog-actions"><button type="button" class="qscore-command" data-score-clipboard-action="delete">${esc(t("delete"))}</button><button type="button" class="qscore-command" data-score-clipboard-action="clear">${esc(t("clearClipboard"))}</button></div>`
      : `<div class="qscore-empty-clipboard">${esc(t("emptyClipboard"))}</div>`;
    return `<section class="qscore-inspector-section qscore-clipboard"><h3>${esc(title)}</h3>${body}</section>`;
  }

  function durationCode(event) {
    if (event.restCode) return event.restCode;
    const tupletFactor = event.tuplet ? event.tuplet.num / event.tuplet.inTimeOf : 1;
    const base = event.durationTicks * tupletFactor / (event.dots === 1 ? 1.5 : event.dots === 2 ? 1.75 : 1);
    return Core.durationOrder.reduce((best, code) => Math.abs(Core.durationTicks[code] - base) < Math.abs(Core.durationTicks[best] - base) ? code : best, "q");
  }

  function vexSvgNode(svg, element) {
    const id = element?.getAttribute?.("id");
    if (!svg || !id) return null;
    const svgId = String(id).startsWith("vf-") ? String(id) : `vf-${id}`;
    return svg.querySelector(`#${CSS.escape(svgId)}`);
  }

  function vexPitch(pitch, part) {
    let midi = pitch.midi;
    if (doc.settings.concertPitch) midi += (part.transposition.chromatic || 0) + (part.transposition.octave || 0) * 12;
    const spelling = midi === pitch.midi ? pitch : Core.spellingFromMidi(midi, doc.settings.key.fifths < 0 ? "flat" : "sharp");
    return `${String(spelling.step).toLowerCase()}/${spelling.octave}`;
  }

  function eventToVex(event, part, clef, plannedAccidentals = []) {
    const code = durationCode(event);
    const isRest = event.type === "rest";
    const keys = isRest ? [clef === "bass" ? "d/3" : "b/4"] : event.pitches.map(pitch => vexPitch(pitch, part));
    const note = new VF.StaveNote({ clef, keys, duration: `${code}${isRest ? "r" : ""}`, autoStem: true });
    if (!isRest) {
      event.pitches.forEach((pitch, index) => {
        if (!VF.Accidental) return;
        (plannedAccidentals[index] || []).forEach(type => note.addModifier(new VF.Accidental(type), index));
      });
    }
    if (event.dots && VF.Dot?.buildAndAttach) for (let index = 0; index < event.dots; index += 1) VF.Dot.buildAndAttach([note], { all: true });
    if (event.articulations?.length && VF.Articulation) event.articulations.forEach(codeValue => note.addModifier(new VF.Articulation(codeValue).setPosition(VF.Modifier.Position.ABOVE), 0));
    if (event.ornament && VF.Ornament) {
      const ornament = ({ "trill-mark": "tr", turn: "turn", mordent: "mordent" })[event.ornament] || event.ornament;
      try { note.addModifier(new VF.Ornament(ornament).setPosition(VF.Modifier.Position.ABOVE), 0); } catch (_) { /* Unknown ornaments remain available to MusicXML. */ }
    }
    if (event.chordSymbol && VF.Annotation) note.addModifier(new VF.Annotation(event.chordSymbol).setVerticalJustification(VF.Annotation.VerticalJustify.TOP), 0);
    if (event.lyrics?.[0]?.text && VF.Annotation) note.addModifier(new VF.Annotation(event.lyrics[0].text).setVerticalJustification(VF.Annotation.VerticalJustify.BOTTOM), 0);
    if (event.text && VF.Annotation) note.addModifier(new VF.Annotation(event.text).setVerticalJustification(VF.Annotation.VerticalJustify.ABOVE), 0);
    if (event.dynamic && VF.TextDynamics) {
      try { note.addModifier(new VF.TextDynamics({ text: event.dynamic, duration: code, line: 9 }), 0); } catch (_) { /* Optional modifier support differs within VexFlow 4 builds. */ }
    }
    return note;
  }

  function fillMeasureEvents(part, measureIndex, staff, voiceNumber, clef, accidentalMap) {
    const events = Core.buildVoiceTimeline(doc, part, measureIndex, staff, voiceNumber);
    return events.map(event => ({ event, note: eventToVex(event, part, clef, accidentalMap.get(event.id)) }));
  }

  function tupletGroupsForPairs(pairs) {
    const groups = [];
    const claimed = new Set();
    const byId = new Map();
    pairs.filter(pair => pair.event.tuplet).forEach(pair => {
      const id = pair.event.tuplet.id;
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push(pair);
    });
    byId.forEach(group => {
      group.sort((a, b) => a.event.tick - b.event.tick);
      const size = Math.max(2, Number(group[0]?.event.tuplet?.num) || 3);
      for (let index = 0; index + size <= group.length; index += size) {
        const chunk = group.slice(index, index + size);
        groups.push(chunk);
        chunk.forEach(pair => claimed.add(pair));
      }
    });

    let sequence = [];
    const flush = () => { sequence = []; };
    pairs.forEach(pair => {
      if (claimed.has(pair) || !pair.event.tuplet) { flush(); return; }
      const ratio = `${pair.event.tuplet.num}:${pair.event.tuplet.inTimeOf}`;
      const previous = sequence.at(-1);
      const previousRatio = previous ? `${previous.event.tuplet.num}:${previous.event.tuplet.inTimeOf}` : ratio;
      const contiguous = !previous || previous.event.tick + previous.event.durationTicks === pair.event.tick;
      if (!contiguous || previousRatio !== ratio) flush();
      sequence.push(pair);
      const size = Math.max(2, Number(pair.event.tuplet.num) || 3);
      if (sequence.length === size) {
        groups.push([...sequence]);
        sequence.forEach(item => claimed.add(item));
        flush();
      }
    });
    return groups;
  }

  function beamsForPairs(pairs) {
    if (!VF.Beam) return [];
    const beams = [];
    const claimed = new Set();
    const beamable = pair => pair.event.type === "note" && !pair.event.grace && pair.event.beam !== "none" && ["8", "16", "32", "64"].includes(durationCode(pair.event));
    const tupletPairs = new Set(pairs.filter(pair => pair.event.tuplet));
    tupletGroupsForPairs(pairs).forEach(group => {
      if (!group.every(beamable)) return;
      try {
        beams.push(new VF.Beam(group.map(pair => pair.note)));
        group.forEach(pair => claimed.add(pair));
      } catch (_) { /* Unbeamable tuplet members retain individual flags. */ }
    });
    let segment = [];
    const flush = () => {
      if (segment.length > 1) {
        try { beams.push(...VF.Beam.generateBeams(segment.map(pair => pair.note))); } catch (_) { /* Keep individual flags if a manual rhythm is irregular. */ }
      }
      segment = [];
    };
    pairs.forEach(pair => {
      if (claimed.has(pair) || tupletPairs.has(pair) || !beamable(pair)) { flush(); return; }
      segment.push(pair);
      if (pair.event.beam === "end") flush();
    });
    flush();
    return beams;
  }

  function eventToTabVex(event, part) {
    const code = durationCode(event);
    if (event.type === "rest") return new VF.GhostNote({ duration: code });
    Core.normalizeTabPositions(event, part);
    const positions = event.tab.positions.map(position => ({ str: position.string, fret: position.fret }));
    const note = new VF.TabNote({ positions, duration: code });
    if (event.dots && VF.Dot?.buildAndAttach) for (let index = 0; index < event.dots; index += 1) VF.Dot.buildAndAttach([note], { all: true });
    return note;
  }

  function keyTonicFromFifths(fifths, mode = "major") {
    return Core.keyTonicFromFifths(fifths, mode);
  }

  function displayKeyName(key) {
    return String(key?.tonic || keyTonicFromFifths(key?.fifths, key?.mode)).replace(/##/g, "𝄪").replace(/bb/g, "𝄫") + (key?.mode === "minor" ? "m" : "");
  }

  const ExtendedKeySignature = VF?.StaveModifier ? class extends VF.StaveModifier {
    static get CATEGORY() { return "KeySignature"; }

    constructor(groups, clef) {
      super();
      this.groups = groups;
      this.clef = ACCIDENTAL_LINES[clef] ? clef : "treble";
      this.glyphWidths = { "#": 10.1, b: 9.2, n: 6.9, "##": 10, bb: 16.7 };
      const width = groups.reduce((sum, group) => sum + group.accidentals.reduce((inner, type, index) => inner + this.glyphWidths[type] + (index ? 1.5 : 0), 0) + 3.2, 0);
      this.setPosition(VF.StaveModifier.Position.BEGIN);
      this.setPadding(groups.length ? 7 : 0);
      this.setWidth(Math.ceil(width));
    }

    draw() {
      const stave = this.checkStave();
      const context = this.context || stave.getContext?.() || stave.context;
      if (!context) return;
      let x = this.getX();
      this.setRendered();
      this.groups.forEach(group => {
        const direction = group.direction < 0 ? "flat" : "sharp";
        const line = ACCIDENTAL_LINES[this.clef][direction][group.letter];
        group.accidentals.forEach((type, index) => {
          const accidental = new VF.Accidental(type);
          VF.Glyph.renderGlyph(context, x, stave.getYForLine(line), 38, accidental.glyph.getCode());
          x += this.glyphWidths[type] + (index + 1 < group.accidentals.length ? 1.5 : 0);
        });
        x += 3.2;
      });
    }
  } : null;

  function keySignatureChanged(index) {
    if (index === 0 || printSystemStarts.has(index)) return true;
    return Number(doc.measures[index - 1]?.key?.fifths) !== Number(doc.measures[index]?.key?.fifths);
  }

  function addExtendedKeySignature(stave, measureIndex, clef) {
    if (!ExtendedKeySignature || !keySignatureChanged(measureIndex)) return null;
    const next = Number(doc.measures[measureIndex]?.key?.fifths) || 0;
    const isSystemStart = measureIndex === 0 || printSystemStarts.has(measureIndex);
    const previous = isSystemStart ? 0 : Number(doc.measures[measureIndex - 1]?.key?.fifths) || 0;
    const groups = Core.keySignatureTransition(previous, next, isSystemStart);
    if (!groups.length) return null;
    const modifier = new ExtendedKeySignature(groups, clef);
    stave.addModifier(modifier);
    return modifier;
  }

  function measureContextChanged(index, property) {
    if (index === 0 || printSystemStarts.has(index)) return true;
    const current = doc.measures[index]?.[property];
    const previous = doc.measures[index - 1]?.[property];
    return JSON.stringify(current) !== JSON.stringify(previous);
  }

  function partStaves(part) {
    const count = part.notationType === "grand" || Core.isTabPart(part) ? 2 : 1;
    const clefs = part.notationType === "grand"
      ? [part.clefs[0] || "treble", part.clefs[1] || "bass"]
      : part.notationType === "percussion"
        ? ["percussion"]
        : Core.isTabPart(part)
          ? [part.clefs[0] || (part.notationType === "bass" ? "bass" : "treble"), "tab"]
          : [part.clefs[0] || "treble"];
    return clefs.slice(0, count);
  }

  function makeLayoutStave(part, measureIndex, clef, width = 1000) {
    const isTab = clef === "tab";
    const stave = isTab && VF.TabStave ? new VF.TabStave(0, 0, width, { num_lines: Core.tabTuning(part).length }) : new VF.Stave(0, 0, width);
    if (measureIndex === 0 || printSystemStarts.has(measureIndex)) {
      if (isTab) stave.addTabGlyph?.();
      else stave.addClef(clef);
    }
    if (!isTab && clef !== "percussion") addExtendedKeySignature(stave, measureIndex, clef);
    if (measureContextChanged(measureIndex, "time")) stave.addTimeSignature(`${doc.measures[measureIndex].time.beats}/${doc.measures[measureIndex].time.beatType}`);
    return stave;
  }

  function measureMinimumNoteWidth(measureIndex) {
    if (!VF?.Formatter) return MIN_MEASURE_NOTE_WIDTH;
    const measure = doc.measures[measureIndex];
    const voices = [];
    const voiceGroups = [];
    let annotationWidth = 0;
    try {
      doc.parts.filter(part => part.visible).forEach(part => {
        partStaves(part).forEach((clef, staffIndex) => {
          if (clef === "tab") return;
          const staffVoices = [];
          for (let voiceNumber = 1; voiceNumber <= 4; voiceNumber += 1) {
            const pairs = fillMeasureEvents(part, measureIndex, staffIndex, voiceNumber, clef);
            if (pairs[0].event.id.startsWith("empty-") && voiceNumber > 1) continue;
            const voice = new VF.Voice({ num_beats: measure.time.beats, beat_value: measure.time.beatType }).setMode(VF.Voice.Mode.SOFT).addTickables(pairs.map(pair => pair.note));
            voices.push(voice);
            staffVoices.push(voice);
            pairs.forEach(({ event }) => {
              const text = [event.chordSymbol, event.text, ...(event.lyrics || []).map(item => item.text)].filter(Boolean).join(" ");
              annotationWidth = Math.max(annotationWidth, 34 + text.length * 7);
            });
          }
          if (staffVoices.length) voiceGroups.push(staffVoices);
        });
      });
      if (!voices.length) return MIN_MEASURE_NOTE_WIDTH;
      const formatter = new VF.Formatter();
      voiceGroups.forEach(group => formatter.joinVoices(group));
      const minimum = Number(formatter.preCalculateMinTotalWidth(voices)) || Number(formatter.getMinTotalWidth?.()) || 0;
      return Math.max(MIN_MEASURE_NOTE_WIDTH, Math.ceil(minimum + 36), annotationWidth);
    } catch (_) {
      const eventCount = doc.parts.reduce((sum, part) => sum + part.events.filter(event => event.measure === measureIndex && ["note", "rest"].includes(event.type)).length, 0);
      return Math.max(MIN_MEASURE_NOTE_WIDTH, 52 + eventCount * 24, annotationWidth);
    }
  }

  function calculateMeasureLayout() {
    if (!layoutDirty && layoutDocumentId === doc.id && measureLayout.length === doc.measures.length) return measureLayout;
    const visiblePartSignature = doc.parts.filter(part => part.visible).map(part => ({ id: part.id, notationType: part.notationType, clefs: part.clefs, staffLines: part.staffLines })).sort((a, b) => a.id.localeCompare(b.id));
    let left = TIMELINE_LEFT_GUTTER;
    measureLayout = doc.measures.map((measure, index) => {
      const previous = doc.measures[index - 1];
      const events = doc.parts.flatMap(part => part.events.filter(event => event.measure === index).map(event => ({
        partId: part.id, type: event.type, tick: event.tick, durationTicks: event.durationTicks, staff: event.staff, voice: event.voice,
        dots: event.dots, tuplet: event.tuplet, pitches: event.pitches, chordSymbol: event.chordSymbol, text: event.text,
        lyrics: event.lyrics, articulations: event.articulations, ornament: event.ornament, dynamic: event.dynamic, tab: event.tab
      })));
      const signature = JSON.stringify({
        visiblePartSignature, events, key: measure.key, time: measure.time, tempo: measure.tempo,
        previousKey: previous?.key, previousTime: previous?.time, previousTempo: previous?.tempo,
        printSystemStart: printSystemStarts.has(index)
      });
      let cached = measureWidthCache.get(measure.id);
      if (!cached || cached.signature !== signature) {
        let prefixWidth = 5;
        if (VF?.Stave) {
          doc.parts.filter(part => part.visible).forEach(part => partStaves(part).forEach(clef => {
            try { prefixWidth = Math.max(prefixWidth, makeLayoutStave(part, index, clef).getNoteStartX()); } catch (_) { /* Keep the conservative prefix. */ }
          }));
        }
        cached = { signature, prefixWidth, noteWidth: measureMinimumNoteWidth(index) };
        measureWidthCache.set(measure.id, cached);
      }
      const width = Math.ceil(MEASURE_SIDE_PADDING + cached.prefixWidth + cached.noteWidth + MEASURE_SIDE_PADDING + (measureExtraWidths.get(measure.id) || 0));
      const item = { index, left, width, prefixWidth: MEASURE_SIDE_PADDING + cached.prefixWidth, noteWidth: width - MEASURE_SIDE_PADDING * 2 - cached.prefixWidth };
      left += width;
      return item;
    });
    layoutDirty = false;
    layoutDocumentId = doc.id;
    return measureLayout;
  }

  function timelineWidth() {
    const last = measureLayout.at(-1);
    return (last ? last.left + last.width : TIMELINE_LEFT_GUTTER) + MEASURE_SIDE_PADDING;
  }

  function renderMeasureStrip() {
    const target = workspace.querySelector("[data-score-measure-strip]");
    if (!target) return;
    target.style.width = `${timelineWidth()}px`;
    target.innerHTML = `<span class="qscore-measure-strip-gutter" style="width:${TIMELINE_LEFT_GUTTER}px"></span>${doc.measures.map((measure, index) => {
      const key = measure.key || doc.settings.key;
      const tonic = key.tonic || keyTonicFromFifths(key.fifths, key.mode);
      const selected = measureSelection && index >= measureSelection.start && index <= measureSelection.end;
      const geometry = measureLayout[index] || { width: MIN_MEASURE_NOTE_WIDTH, prefixWidth: 0, noteWidth: MIN_MEASURE_NOTE_WIDTH };
      return `<button type="button" class="qscore-measure-card ${contextMeasureIndex === index ? "is-active" : ""} ${selected ? "is-range-selected" : ""}" style="width:${geometry.width}px" data-score-measure-settings="${index}" aria-label="${esc(`${t("measure")} ${index + 1}, ${measure.time.beats}/${measure.time.beatType}, ${measure.tempo} BPM`)}">
        <svg class="qscore-measure-ruler" data-score-measure-ruler viewBox="0 0 ${geometry.width} 48" preserveAspectRatio="none" aria-hidden="true"><path class="is-fine"></path><path class="is-major"></path></svg>
        <strong>${index + 1}</strong><span>${esc(displayKeyName(key))}</span><span>${measure.time.beats}/${measure.time.beatType}</span><span>♩=${measure.tempo}</span>
      </button>`;
    }).join("")}${Array.from({ length: doc.measures.length + 1 }, (_, index) => {
      const left = index === doc.measures.length ? measureLayout.at(-1).left + measureLayout.at(-1).width : measureLayout[index].left;
      return `<button type="button" class="qscore-insert-boundary ${insertionBoundary === index ? "is-active" : ""}" style="left:${left}px" data-score-insert-boundary="${index}" title="${esc(t("insertMeasureHere"))}" aria-label="${esc(`${t("insertMeasureHere")} ${index + 1}`)}"></button>`;
    }).join("")}`;
    updateMeasureRulers();
  }

  function fallbackRhythmMap(measureIndex) {
    const geometry = measureLayout[measureIndex];
    const measure = doc.measures[measureIndex];
    if (!geometry || !measure) return null;
    return {
      actual: false,
      points: [
        { tick: 0, x: geometry.left + geometry.prefixWidth },
        { tick: Core.measureTicks(measure.time), x: geometry.left + geometry.prefixWidth + geometry.noteWidth }
      ]
    };
  }

  function rhythmMapForMeasure(measureIndex) {
    return measureRhythmMaps.get(measureIndex) || fallbackRhythmMap(measureIndex);
  }

  function rhythmXForTick(measureIndex, tick) {
    const map = rhythmMapForMeasure(measureIndex);
    if (!map?.points?.length) return TIMELINE_LEFT_GUTTER;
    const points = map.points;
    const value = Math.max(points[0].tick, Math.min(points.at(-1).tick, Number(tick) || 0));
    let rightIndex = points.findIndex(point => point.tick >= value);
    if (rightIndex <= 0) return points[0].x;
    if (rightIndex < 0) return points.at(-1).x;
    const left = points[rightIndex - 1];
    const right = points[rightIndex];
    const ratio = (value - left.tick) / Math.max(1, right.tick - left.tick);
    return left.x + (right.x - left.x) * ratio;
  }

  function rhythmTickForX(measureIndex, x) {
    const map = rhythmMapForMeasure(measureIndex);
    if (!map?.points?.length) return 0;
    const points = map.points;
    const value = Math.max(points[0].x, Math.min(points.at(-1).x, Number(x) || 0));
    let rightIndex = points.findIndex(point => point.x >= value);
    if (rightIndex <= 0) return points[0].tick;
    if (rightIndex < 0) return points.at(-1).tick;
    const left = points[rightIndex - 1];
    const right = points[rightIndex];
    const ratio = (value - left.x) / Math.max(0.001, right.x - left.x);
    return left.tick + (right.tick - left.tick) * ratio;
  }

  function adaptiveRulerMajor() {
    const zoom = Math.max(0.1, Number(doc?.settings?.page?.zoom) || 1);
    const targetTicks = (Core.WHOLE / 16) / zoom;
    return MEASURE_RULER_MAJOR_OPTIONS.reduce((best, option) => Math.abs(Math.log(option.ticks / targetTicks)) < Math.abs(Math.log(best.ticks / targetTicks)) ? option : best, MEASURE_RULER_MAJOR_OPTIONS[3]);
  }

  function rulerPath(measureIndex, step, length) {
    const measure = doc.measures[measureIndex];
    const geometry = measureLayout[measureIndex];
    if (!measure || !geometry) return "";
    const size = Core.measureTicks(measure.time);
    const commands = [];
    for (let tick = 0; tick <= size; tick += step) {
      const x = rhythmXForTick(measureIndex, Math.min(size, tick)) - geometry.left;
      commands.push(`M${x.toFixed(2)} 0v${length}M${x.toFixed(2)} 48v-${length}`);
    }
    return commands.join("");
  }

  function updateMeasureRulers() {
    if (!workspace || !doc) return;
    const major = adaptiveRulerMajor();
    workspace.querySelectorAll("[data-score-measure-ruler]").forEach(svg => {
      const card = svg.closest("[data-score-measure-settings]");
      const index = Number(card?.dataset.scoreMeasureSettings);
      if (!Number.isFinite(index)) return;
      svg.querySelector(".is-fine")?.setAttribute("d", rulerPath(index, MEASURE_RULER_FINE_TICKS, 2));
      svg.querySelector(".is-major")?.setAttribute("d", rulerPath(index, major.ticks, 5));
      card.dataset.scoreRulerMajor = `1/${major.division}`;
      card.dataset.scoreRulerFine = "1/96";
      card.dataset.scoreRulerSource = rhythmMapForMeasure(index)?.actual ? "notation" : "fallback";
    });
  }

  function renderedMeasureRange() {
    if (printMode) return { first: 0, last: doc.measures.length };
    const viewport = workspace.querySelector("[data-score-viewport]");
    const zoom = Number(doc.settings.page.zoom) || 1;
    const left = viewport.scrollLeft / zoom;
    const width = viewport.clientWidth / zoom;
    const indexAt = x => {
      let low = 0, high = measureLayout.length - 1, answer = 0;
      while (low <= high) {
        const middle = (low + high) >> 1;
        if (measureLayout[middle].left + measureLayout[middle].width <= x) low = middle + 1;
        else { answer = middle; high = middle - 1; }
      }
      return Math.max(0, Math.min(measureLayout.length - 1, answer));
    };
    const first = Math.max(0, indexAt(left) - 1);
    const last = Math.min(doc.measures.length, indexAt(left + width) + 3);
    return { first, last: Math.max(first + 1, last) };
  }

  function renderScore() {
    if (!workspace || !doc || !openState) return;
    const generation = ++renderGeneration;
    const renderTarget = workspace.querySelector("[data-score-render]");
    const pageTarget = workspace.querySelector("[data-score-page]");
    const zoom = Number(doc.settings.page.zoom) || 1;
    calculateMeasureLayout();
    const width = timelineWidth();
    const height = 64 + doc.parts.reduce((sum, part) => sum + partTrackHeight(part), 0);
    pageTarget.style.setProperty("--qscore-zoom", zoom);
    pageTarget.style.width = `${width}px`;
    renderTarget.style.width = `${width}px`;
    renderBoxes = [];
    renderMeasureStrip();
    renderTransportTimeline();
    if (!doc.parts.some(part => part.visible)) {
      renderTarget.innerHTML = `<div class="qscore-empty">${esc(t("noPart"))}</div>`;
      return;
    }
    if (!VF?.Renderer) {
      renderTarget.innerHTML = `<div class="qscore-empty">${esc(t("noVexFlow"))}</div>`;
      return;
    }
    const range = renderedMeasureRange();
    const measureIndexes = Array.from({ length: range.last - range.first }, (_, index) => range.first + index);
    try {
      const staging = document.createElement("div");
      staging.className = "qscore-render-staging";
      const renderer = new VF.Renderer(staging, VF.Renderer.Backends.SVG);
      renderer.resize(width, height);
      const context = renderer.getContext();
      context.setFont("Arial", 10);
      const noteRefs = [];
      const tabRefs = [];
      const stagedRhythmMaps = new Map();
      measureIndexes.forEach(measureIndex => {
        const measure = doc.measures[measureIndex];
        const geometry = measureLayout[measureIndex];
        const left = geometry.left;
        const staveWidth = geometry.width;
        const showKey = keySignatureChanged(measureIndex);
        const showTime = measureContextChanged(measureIndex, "time");
        const showTempo = measureContextChanged(measureIndex, "tempo");
        const alignedVoices = [];
        const tuplets = [];
        const beams = [];
        let tempoDrawn = false;
        let y = 44;
        doc.parts.forEach(part => {
          const trackHeight = partTrackHeight(part);
          if (!part.visible) { y += trackHeight; return; }
          const clefs = partStaves(part);
          const partMeasureEvents = part.events.filter(event => event.measure === measureIndex);
          const partAccidentals = Core.accidentalPlan(partMeasureEvents, measure.key?.fifths || 0);
          const staves = clefs.length;
          let topStave = null;
          let bottomStave = null;
          for (let staffIndex = 0; staffIndex < staves; staffIndex += 1) {
            const staffY = y + staffIndex * 82;
            const clef = clefs[staffIndex] || "bass";
            const isTab = clef === "tab";
            const stave = isTab && VF.TabStave ? new VF.TabStave(left, staffY, staveWidth, { num_lines: Core.tabTuning(part).length }) : new VF.Stave(left, staffY, staveWidth);
            if (measureIndex === 0 || printSystemStarts.has(measureIndex)) {
              if (isTab) stave.addTabGlyph?.();
              else stave.addClef(clef);
            }
            if (showKey && !isTab && clef !== "percussion") {
              addExtendedKeySignature(stave, measureIndex, clef);
            }
            if (showTime) stave.addTimeSignature(`${measure.time.beats}/${measure.time.beatType}`);
            if (showTempo && !tempoDrawn && !isTab) {
              stave.setTempo?.({ duration: "q", bpm: measure.tempo }, -10);
              const tempoModifier = stave.getModifiers?.().find(modifier => modifier.getCategory?.() === "StaveTempo");
              tempoModifier?.setShiftX?.(8);
              tempoDrawn = true;
            }
            if (measure.repeatStart && VF.Barline) stave.setBegBarType(VF.Barline.type.REPEAT_BEGIN);
            if (measure.repeatEnd && VF.Barline) stave.setEndBarType(VF.Barline.type.REPEAT_END);
            stave.setNoteStartX(left + geometry.prefixWidth);
            stave.setContext(context).draw();
            topStave ||= stave;
            bottomStave = stave;
            renderBoxes.push({ kind: "measure", measure: measureIndex, partId: part.id, staff: staffIndex, x: left, y: staffY, width: staveWidth, noteX: left + geometry.prefixWidth, noteWidth: geometry.noteWidth, height: 72 });
            if (isTab) {
              for (let voiceNumber = 1; voiceNumber <= 4; voiceNumber += 1) {
                const hasRealEvents = partMeasureEvents.some(event => event.staff === 0 && event.voice === voiceNumber && ["note", "rest"].includes(event.type));
                if (voiceNumber > 1 && !hasRealEvents) continue;
                const pairs = Core.buildVoiceTimeline(doc, part, measureIndex, 0, voiceNumber).map(event => ({ event, note: eventToTabVex(event, part) }));
                const voice = new VF.Voice({ num_beats: measure.time.beats, beat_value: measure.time.beatType }).setMode(VF.Voice.Mode.SOFT).addTickables(pairs.map(pair => pair.note));
                alignedVoices.push({ voice, stave, pairs, isTab: true });
                pairs.filter(pair => pair.event.type === "note" && !pair.event.derived).forEach(pair => tabRefs.push({ ...pair, part, stave, voiceNumber }));
                tupletGroupsForPairs(pairs).forEach(group => {
                  if (!VF.Tuplet) return;
                  try { tuplets.push(new VF.Tuplet(group.map(item => item.note), { num_notes: group[0].event.tuplet.num, notes_occupied: group[0].event.tuplet.inTimeOf })); } catch (_) { /* Keep TAB timing editable if a group cannot be drawn. */ }
                });
              }
              continue;
            }
            for (let voiceNumber = 1; voiceNumber <= 4; voiceNumber += 1) {
              const hasRealEvents = partMeasureEvents.some(event => event.staff === staffIndex && event.voice === voiceNumber && ["note", "rest"].includes(event.type));
              if (voiceNumber > 1 && !hasRealEvents) continue;
              const pairs = fillMeasureEvents(part, measureIndex, staffIndex, voiceNumber, clef, partAccidentals);
              const voice = new VF.Voice({ num_beats: measure.time.beats, beat_value: measure.time.beatType }).setMode(VF.Voice.Mode.SOFT).addTickables(pairs.map(pair => pair.note));
              alignedVoices.push({ voice, stave, pairs, isTab: false });
              pairs.forEach(pair => noteRefs.push({ ...pair, part, stave, voiceNumber }));
              tupletGroupsForPairs(pairs).forEach(group => {
                if (!VF.Tuplet) return;
                try { tuplets.push(new VF.Tuplet(group.map(item => item.note), { num_notes: group[0].event.tuplet.num, notes_occupied: group[0].event.tuplet.inTimeOf })); } catch (_) { /* Keep the rhythm editable if a partial group cannot be drawn. */ }
              });
            }
          }
          if (staves === 2 && (measureIndex === 0 || printSystemStarts.has(measureIndex)) && VF.StaveConnector) {
            new VF.StaveConnector(topStave, bottomStave).setType(VF.StaveConnector.type.BRACE).setContext(context).draw();
            new VF.StaveConnector(topStave, bottomStave).setType(VF.StaveConnector.type.SINGLE_LEFT).setContext(context).draw();
          }
          y += trackHeight;
        });
        if (alignedVoices.length) {
          const voices = alignedVoices.map(item => item.voice);
          const formatter = new VF.Formatter();
          const groups = new Map();
          alignedVoices.forEach(item => {
            if (!groups.has(item.stave)) groups.set(item.stave, []);
            groups.get(item.stave).push(item.voice);
          });
          groups.forEach(group => formatter.joinVoices(group));
          formatter.format(voices, Math.max(80, geometry.noteWidth - 10));
          alignedVoices.forEach(item => {
            if (!item.isTab) beams.push(...beamsForPairs(item.pairs));
          });
          alignedVoices.forEach(item => {
            item.voice.draw(context, item.stave);
          });
          tuplets.forEach(tuplet => { try { tuplet.setContext(context).draw(); } catch (_) { /* Cross-window tuplets remain in the model. */ } });
          beams.forEach(beam => { try { beam.setContext(context).draw(); } catch (_) { /* Manual beam metadata remains available. */ } });

          const referenceVoice = alignedVoices.filter(item => !item.isTab).map((item, order) => ({
            item,
            order,
            realEvents: item.pairs.filter(pair => !pair.event.derived && pair.event.type === "note").length
          })).sort((a, b) => b.realEvents - a.realEvents || a.order - b.order)[0]?.item || alignedVoices[0];
          const xsByTick = new Map();
          referenceVoice?.pairs.forEach(pair => {
            const tick = Math.max(0, Math.min(Core.measureTicks(measure.time), Number(pair.event.tick) || 0));
            const x = Number(pair.note.getAbsoluteX?.());
            if (!Number.isFinite(x)) return;
            if (!xsByTick.has(tick)) xsByTick.set(tick, []);
            xsByTick.get(tick).push(x);
          });
          const startX = left + geometry.prefixWidth;
          const endX = startX + geometry.noteWidth;
          const points = [...xsByTick.entries()].map(([tick, values]) => {
            values.sort((a, b) => a - b);
            return { tick, x: values[Math.floor(values.length / 2)] };
          }).sort((a, b) => a.tick - b.tick);
          if (!points.some(point => point.tick === 0)) points.unshift({ tick: 0, x: startX });
          points.push({ tick: Core.measureTicks(measure.time), x: endX });
          let previousX = startX;
          points.forEach(point => {
            point.x = Math.max(previousX, Math.min(endX, point.x));
            previousX = point.x;
          });
          stagedRhythmMaps.set(measureIndex, { actual: xsByTick.size > 0, points });
        }
      });
      const svg = staging.querySelector("svg");
      if (svg) svg.setAttribute("aria-label", `${t("score")}: ${doc.title}`);
      noteRefs.forEach(ref => {
        if (ref.event.derived) return;
        const box = ref.note.getBoundingBox?.();
        if (!box) return;
        const beginX = Number(ref.note.getNoteHeadBeginX?.());
        const endX = Number(ref.note.getNoteHeadEndX?.());
        const ys = ref.note.getYs?.() || [];
        const hitPoints = ref.event.type === "rest" || !ys.length || !Number.isFinite(beginX) || !Number.isFinite(endX)
          ? [{ x: box.getX() + box.getW() / 2, y: box.getY() + box.getH() / 2 }]
          : ys.map(y => ({ x: (beginX + endX) / 2, y }));
        renderBoxes.push({ kind: "event", eventId: ref.event.id, partId: ref.part.id, x: box.getX(), y: box.getY(), width: box.getW(), height: box.getH(), hitPoints });
        const node = vexSvgNode(svg, ref.note);
        if (node) {
          node.classList.add("qscore-event-node");
          node.dataset.qscoreEvent = ref.event.id;
          node.dataset.eventId = ref.event.id;
          if (selection.has(ref.event.id)) node.classList.add("is-selected");
          if (contextEventId === ref.event.id) node.classList.add("is-cursor-target");
        }
      });
      tabRefs.forEach(ref => {
        const box = ref.note.getBoundingBox?.();
        if (!box) return;
        const node = vexSvgNode(svg, ref.note);
        if (node) {
          node.classList.add("qscore-tab-node");
          node.dataset.qscoreTabEvent = ref.event.id;
          node.dataset.eventId = ref.event.id;
        }
        const ys = ref.note.getYs?.() || [];
        const centerX = box.getX() + box.getW() / 2;
        ref.event.tab?.positions?.forEach((position, index) => {
          const pointY = Number(ys[index] ?? box.getY() + box.getH() / 2);
          renderBoxes.push({
            kind: "tab", eventId: ref.event.id, partId: ref.part.id, pitchIndex: position.pitchIndex,
            x: centerX - Math.max(9, box.getW() / 2), y: pointY - 8, width: Math.max(18, box.getW()), height: 16,
            hitPoints: [{ x: centerX, y: pointY }]
          });
        });
      });
      noteRefs.forEach((ref, index) => {
        if (!ref.event.tieStart && !ref.event.slurStart) return;
        const next = noteRefs.slice(index + 1).find(candidate => candidate.part.id === ref.part.id && candidate.event.staff === ref.event.staff && candidate.event.voice === ref.event.voice && !candidate.event.derived);
        if (!next) return;
        if (ref.event.tieStart && VF.StaveTie) {
          const shared = ref.event.pitches.map((pitch, pitchIndex) => ({ pitchIndex, nextIndex: next.event.pitches.findIndex(item => item.midi === pitch.midi) })).filter(item => item.nextIndex >= 0);
          if (shared.length) try { new VF.StaveTie({ first_note: ref.note, last_note: next.note, first_indices: shared.map(item => item.pitchIndex), last_indices: shared.map(item => item.nextIndex) }).setContext(context).draw(); } catch (_) { /* Cross-window ties remain in the model. */ }
        }
        if (ref.event.slurStart && VF.Curve) try { new VF.Curve(ref.note, next.note, { position: VF.Modifier.Position.ABOVE }).setContext(context).draw(); } catch (_) { /* Cross-window slurs remain in export. */ }
      });
      drawSelectionOverlays(svg);
      if (generation !== renderGeneration) return;
      stagedRhythmMaps.forEach((map, index) => measureRhythmMaps.set(index, map));
      renderTarget.replaceChildren(...staging.childNodes);
      scrollRenderLeft = workspace.querySelector("[data-score-viewport]")?.scrollLeft || 0;
      expandOverflowingMeasures(noteRefs, svg);
      updateMeasureRulers();
      updatePlayheadVisuals();
    } catch (error) {
      console.error("QBoard score render", error);
      renderTarget.innerHTML = `<div class="qscore-empty">${esc(t("errorRender"))}<br><small>${esc(error.message)}</small></div>`;
    }
  }

  function drawSelectionOverlays(svg) {
    if (!svg) return;
    const ns = "http://www.w3.org/2000/svg";
    const layer = document.createElementNS(ns, "g");
    layer.setAttribute("class", "qscore-selection-layer");
    renderBoxes.filter(box => box.kind === "event" && selection.has(box.eventId)).forEach(box => {
      const rect = document.createElementNS(ns, "rect");
      rect.setAttribute("x", box.x - 5); rect.setAttribute("y", box.y - 5); rect.setAttribute("width", Math.max(12, box.width + 10)); rect.setAttribute("height", Math.max(18, box.height + 10)); rect.setAttribute("rx", 3);
      layer.append(rect);
    });
    if (selectedTabPitch) {
      const box = renderBoxes.find(item => item.kind === "tab" && item.eventId === selectedTabPitch.eventId && item.pitchIndex === selectedTabPitch.pitchIndex);
      const point = box?.hitPoints?.[0];
      if (point) {
        const circle = document.createElementNS(ns, "circle");
        circle.setAttribute("cx", point.x); circle.setAttribute("cy", point.y); circle.setAttribute("r", 10);
        circle.setAttribute("class", "qscore-tab-selection");
        layer.append(circle);
      }
    }
    svg.append(layer);
  }

  function expandOverflowingMeasures(noteRefs, svg) {
    let expanded = false;
    noteRefs.forEach(ref => {
      if (ref.event.derived) return;
      const geometry = measureLayout[ref.event.measure];
      if (!geometry) return;
      let right = ref.note.getBoundingBox?.()?.getX?.() + (ref.note.getBoundingBox?.()?.getW?.() || 0);
      const node = vexSvgNode(svg, ref.note);
      try {
        const box = node?.getBBox?.();
        if (box) right = Math.max(Number(right) || 0, box.x + box.width);
      } catch (_) { /* Some browsers delay SVG bounding boxes until the next frame. */ }
      const overflow = right - (geometry.left + geometry.width - MEASURE_SIDE_PADDING);
      if (overflow <= 4) return;
      const measure = doc.measures[ref.event.measure];
      measureExtraWidths.set(measure.id, (measureExtraWidths.get(measure.id) || 0) + Math.ceil(overflow + 12));
      layoutDirty = true;
      expanded = true;
    });
    if (expanded) scheduleRender();
  }

  function positionToGeometryX(position = playbackPosition) {
    const measureIndex = Math.max(0, Math.min(doc.measures.length - 1, Math.round(Number(position.measure) || 0)));
    const measure = doc.measures[measureIndex];
    const geometry = measureLayout[measureIndex];
    if (!measure || !geometry) return TIMELINE_LEFT_GUTTER;
    const tick = Math.max(0, Math.min(Core.measureTicks(measure.time), Number(position.tick) || 0));
    return rhythmXForTick(measureIndex, tick);
  }

  function snapPlayheadTick(rawTick, measureIndex) {
    const measure = doc.measures[measureIndex];
    if (!measure) return 0;
    const size = Core.measureTicks(measure.time);
    const raw = Math.max(0, Math.min(size, Number(rawTick) || 0));
    const fine = Math.max(1, MEASURE_RULER_FINE_TICKS);
    const fineTick = Math.max(0, Math.min(size, Math.round(raw / fine) * fine));
    const rhythm = Math.max(1, requestedDurationTicks({ grace: false }));
    const rhythmTick = Math.max(0, Math.min(size, Math.round(raw / rhythm) * rhythm));
    return Math.abs(raw - rhythmTick) <= fine * 0.75 ? rhythmTick : fineTick;
  }

  function positionReadout(position = playbackPosition) {
    const measure = doc.measures[position.measure] || doc.measures[0];
    const beatTicks = Core.PPQ * 4 / measure.time.beatType;
    return `${position.measure + 1}:${(1 + (Number(position.tick) || 0) / beatTicks).toFixed(2)}`;
  }

  function renderTransportTimeline() {
    if (!workspace || !doc || !measureLayout.length) return;
    const track = workspace.querySelector("[data-score-timeline-track]");
    const measures = workspace.querySelector("[data-score-timeline-measures]");
    if (!track || !measures) return;
    const width = Math.max(1, timelineWidth());
    const trackWidth = Math.max(1, track.clientWidth);
    const markerSteps = [1, 2, 5, 10, 20];
    const markerStep = markerSteps.find(step => {
      const positions = measureLayout.filter((_, index) => index === 0 || (index + 1) % step === 0).map(item => item.left / width * trackWidth);
      return positions.every((position, index) => !index || position - positions[index - 1] >= 46);
    }) || 20;
    const signature = `${trackWidth}:${markerStep}:${measureLayout.map(item => `${item.left}:${item.width}`).join("|")}`;
    if (signature !== timelineRenderSignature) {
      timelineRenderSignature = signature;
      let lastLabelX = -Infinity;
      measures.innerHTML = measureLayout.map((item, index) => {
        const number = index + 1;
        const x = item.left / width * trackWidth;
        const shouldLabel = index === 0 || number % markerStep === 0 || (index === measureLayout.length - 1 && x - lastLabelX >= 46);
        if (shouldLabel) lastLabelX = x;
        return `<span class="qscore-timeline-measure" style="left:${item.left / width * 100}%;width:${item.width / width * 100}%" title="${esc(`${t("measure")} ${number}`)}">${shouldLabel ? `<b>${number}</b>` : ""}</span>`;
      }).join("");
    }
    track.setAttribute("aria-valuemin", "1");
    track.setAttribute("aria-valuemax", String(doc.measures.length));
    updateTimelineWindow();
    updatePlayheadVisuals();
  }

  function updateTimelineWindow() {
    const viewport = workspace?.querySelector("[data-score-viewport]");
    const windowElement = workspace?.querySelector("[data-score-timeline-window]");
    if (!viewport || !windowElement) return;
    const full = Math.max(viewport.clientWidth, viewport.scrollWidth);
    const width = Math.max(3, Math.min(100, viewport.clientWidth / full * 100));
    const left = Math.max(0, Math.min(100 - width, viewport.scrollLeft / full * 100));
    windowElement.style.left = `${left}%`;
    windowElement.style.width = `${width}%`;
  }

  function updatePlayheadVisuals(displayPosition = playback?.visualPosition || playbackPosition) {
    if (!workspace || !doc || !measureLayout.length) return;
    const x = positionToGeometryX(displayPosition);
    const line = workspace.querySelector("[data-score-playhead]");
    if (line) {
      line.hidden = false;
      line.style.left = `${x}px`;
      line.style.top = `${TIMELINE_HEADER_HEIGHT}px`;
      line.style.height = `${workspace.querySelector("[data-score-render]")?.offsetHeight || 0}px`;
      line.classList.toggle("is-selected", playheadSelected);
      line.setAttribute("aria-valuenow", positionReadout(displayPosition));
      line.dataset.scoreMeasure = String(displayPosition.measure);
      line.dataset.scoreTick = String(Math.round((Number(displayPosition.tick) || 0) * 1000) / 1000);
    }
    const cursorElement = workspace.querySelector("[data-score-timeline-cursor]");
    if (cursorElement) {
      cursorElement.style.left = `${Math.max(0, Math.min(100, x / timelineWidth() * 100))}%`;
      cursorElement.classList.toggle("is-selected", playheadSelected);
      cursorElement.setAttribute("aria-valuenow", positionReadout(displayPosition));
      cursorElement.dataset.scoreMeasure = String(displayPosition.measure);
      cursorElement.dataset.scoreTick = String(Math.round((Number(displayPosition.tick) || 0) * 1000) / 1000);
    }
    const readout = workspace.querySelector("[data-score-position]");
    if (readout) readout.textContent = positionReadout(playbackPosition);
    workspace.querySelector("[data-score-timeline-track]")?.setAttribute("aria-valuenow", String(playbackPosition.measure + 1));
  }

  function setPlayheadSelected(selected, { focus = false } = {}) {
    const next = Boolean(selected);
    if (playheadSelected === next) {
      if (focus && next) workspace?.querySelector("[data-score-playhead]")?.focus({ preventScroll: true });
      return;
    }
    playheadSelected = next;
    if (next) {
      selection.clear();
      selectionAnchor = null;
      selectedTabPitch = null;
      measureSelection = null;
      insertionBoundary = null;
      workspace?.querySelectorAll(".qscore-event-node.is-selected").forEach(node => node.classList.remove("is-selected"));
      workspace?.querySelectorAll(".qscore-selection-layer").forEach(node => node.remove());
      renderInspector();
    }
    updateEditorContext();
    updatePlayheadVisuals();
    if (focus && next) workspace?.querySelector("[data-score-playhead]")?.focus({ preventScroll: true });
  }

  function seek(position, { scroll = false } = {}) {
    if (!doc) return null;
    const resume = Boolean(playback?.active);
    const selectionOnly = Boolean(playback?.selectionOnly);
    if (resume) stopPlayback({ keepPosition: true, nextState: "paused" });
    const measure = Math.max(0, Math.min(doc.measures.length - 1, Math.round(Number(position?.measure) || 0)));
    const ticks = Core.measureTicks(doc.measures[measure].time);
    const tick = Math.max(0, Math.min(ticks, Number(position?.tick) || 0));
    playbackPosition = { measure, tick };
    cursor.measure = measure;
    cursor.tick = Math.min(tick, Math.max(0, ticks - 1));
    updateEditorContext();
    updatePlayheadVisuals();
    if (scroll) scrollPlayheadIntoView(true);
    if (resume) startPlayback({ selectionOnly });
    return { ...playbackPosition };
  }

  function seekFromTimelinePointer(event) {
    const track = workspace.querySelector("[data-score-timeline-track]");
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(0.999999, (event.clientX - rect.left) / rect.width));
    const geometryTable = timelineDrag?.geometry || measureLayout;
    const frozenLast = geometryTable.at(-1);
    const frozenWidth = frozenLast ? frozenLast.left + frozenLast.width + MEASURE_SIDE_PADDING : timelineWidth();
    const x = ratio * frozenWidth;
    const geometry = geometryTable.find(item => x >= item.left && x < item.left + item.width) || geometryTable.at(-1);
    if (!geometry) return;
    const rawTick = rhythmTickForX(geometry.index, x);
    seek({ measure: geometry.index, tick: snapPlayheadTick(rawTick, geometry.index) });
  }

  function beginTimelineDrag(event) {
    if (event.button !== 0) return;
    const track = event.currentTarget;
    const viewport = workspace.querySelector("[data-score-viewport]");
    const onCursor = Boolean(event.target.closest("[data-score-timeline-cursor]"));
    const resizeEdge = event.target.closest("[data-score-timeline-resize]")?.dataset.scoreTimelineResize;
    const isWindow = Boolean(event.target.closest("[data-score-timeline-window]")) && !onCursor;
    const fullWidth = Math.max(viewport.clientWidth, viewport.scrollWidth);
    const windowStart = viewport.scrollLeft / fullWidth;
    const windowEnd = Math.min(1, (viewport.scrollLeft + viewport.clientWidth) / fullWidth);
    timelineDrag = {
      mode: resizeEdge ? `resize-${resizeEdge}` : isWindow ? "window" : "playhead",
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: viewport.scrollLeft,
      wasPlaying: Boolean(playback?.active),
      selectionOnly: Boolean(playback?.selectionOnly),
      geometry: measureLayout.map(item => ({ ...item })),
      maxScroll: Math.max(0, viewport.scrollWidth - viewport.clientWidth),
      pendingScrollLeft: viewport.scrollLeft,
      windowStart,
      windowEnd,
      trackLeft: track.getBoundingClientRect().left,
      trackWidth: Math.max(1, track.clientWidth),
      pendingClientX: event.clientX,
      frame: 0
    };
    if (timelineDrag.mode === "playhead") {
      if (onCursor) setPlayheadSelected(true);
      stopPlayback({ keepPosition: true });
      seekFromTimelinePointer(event);
    } else autoFollowSuppressed = true;
    track.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function applyTimelineResize(drag) {
    const viewport = workspace.querySelector("[data-score-viewport]");
    const page = workspace.querySelector("[data-score-page]");
    if (!viewport || !page) return;
    const pointer = Math.max(0, Math.min(1, (drag.pendingClientX - drag.trackLeft) / drag.trackWidth));
    const minFraction = Math.max(18 / drag.trackWidth, viewport.clientWidth / Math.max(viewport.clientWidth, timelineWidth() * 1.8));
    let start = drag.windowStart;
    let end = drag.windowEnd;
    if (drag.mode === "resize-start") start = Math.max(0, Math.min(end - minFraction, pointer));
    else end = Math.min(1, Math.max(start + minFraction, pointer));
    const wantedSpan = Math.max(minFraction, end - start);
    const zoom = Math.max(0.55, Math.min(1.8, viewport.clientWidth / Math.max(1, timelineWidth() * wantedSpan)));
    doc.settings.page.zoom = zoom;
    page.style.setProperty("--qscore-zoom", zoom);
    const zoomField = workspace.querySelector('[data-score-field="zoom"]');
    if (zoomField) zoomField.value = zoom;
    const full = Math.max(viewport.clientWidth, timelineWidth() * zoom);
    const actualSpan = viewport.clientWidth / full;
    const anchoredStart = drag.mode === "resize-start" ? end - actualSpan : start;
    viewport.scrollLeft = Math.max(0, Math.min(full - viewport.clientWidth, anchoredStart * full));
    updateTimelineWindow();
    updateMeasureRulers();
    updatePlayheadVisuals();
  }

  function moveTimelineDrag(event) {
    if (!timelineDrag || timelineDrag.pointerId !== event.pointerId) return;
    if (timelineDrag.mode === "playhead") return seekFromTimelinePointer(event);
    const drag = timelineDrag;
    if (drag.mode.startsWith("resize-")) {
      drag.pendingClientX = event.clientX;
      if (!drag.frame) drag.frame = window.requestAnimationFrame(() => {
        drag.frame = 0;
        if (timelineDrag === drag) applyTimelineResize(drag);
      });
      event.preventDefault();
      return;
    }
    const track = event.currentTarget;
    const viewport = workspace.querySelector("[data-score-viewport]");
    const delta = (event.clientX - drag.startX) / Math.max(1, track.clientWidth) * (drag.maxScroll + viewport.clientWidth);
    drag.pendingScrollLeft = Math.max(0, Math.min(drag.maxScroll, drag.startScrollLeft + delta));
    if (!drag.frame) drag.frame = window.requestAnimationFrame(() => {
      drag.frame = 0;
      if (timelineDrag === drag) viewport.scrollLeft = drag.pendingScrollLeft;
    });
  }

  function endTimelineDrag(event) {
    if (!timelineDrag || timelineDrag.pointerId !== event.pointerId) return;
    const drag = timelineDrag;
    timelineDrag = null;
    if (drag.frame) window.cancelAnimationFrame(drag.frame);
    if (drag.mode === "window") {
      workspace.querySelector("[data-score-viewport]").scrollLeft = drag.pendingScrollLeft;
      scheduleRender();
    } else if (drag.mode.startsWith("resize-")) {
      drag.pendingClientX = event.clientX;
      applyTimelineResize(drag);
      changed({ inspector: false });
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (drag.mode === "playhead" && drag.wasPlaying) startPlayback({ selectionOnly: drag.selectionOnly });
  }

  function seekFromScorePointer(event) {
    const render = workspace.querySelector("[data-score-render]");
    const rect = render.getBoundingClientRect();
    const zoom = Number(doc.settings.page.zoom) || 1;
    const x = (event.clientX - rect.left) / zoom;
    const geometry = measureLayout.find(item => x >= item.left && x < item.left + item.width) || (x < measureLayout[0]?.left ? measureLayout[0] : measureLayout.at(-1));
    if (!geometry) return;
    const rawTick = rhythmTickForX(geometry.index, x);
    seek({ measure: geometry.index, tick: snapPlayheadTick(rawTick, geometry.index) });
  }

  function beginScorePlayheadDrag(event) {
    const viewport = workspace.querySelector("[data-score-viewport]");
    playheadDrag = { pointerId: event.pointerId, wasPlaying: Boolean(playback?.active), selectionOnly: Boolean(playback?.selectionOnly) };
    setPlayheadSelected(true);
    stopPlayback({ keepPosition: true });
    seekFromScorePointer(event);
    viewport.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function moveScorePlayheadDrag(event) {
    if (!playheadDrag || playheadDrag.pointerId !== event.pointerId) return false;
    seekFromScorePointer(event);
    event.preventDefault();
    return true;
  }

  function endScorePlayheadDrag(event) {
    if (!playheadDrag || playheadDrag.pointerId !== event.pointerId) return false;
    const drag = playheadDrag;
    playheadDrag = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (drag.wasPlaying) startPlayback({ selectionOnly: drag.selectionOnly });
    event.preventDefault();
    return true;
  }

  function scheduleRender() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(renderScore, 20);
  }

  function measureTickAdvance(duration) {
    let remaining = Math.max(0, Number(duration) || 0);
    while (remaining > 0) {
      const measure = doc.measures[cursor.measure];
      if (!measure) break;
      const size = Core.measureTicks(measure.time);
      cursor.tick = Math.max(0, Math.min(size, cursor.tick));
      const capacity = size - cursor.tick;
      if (remaining < capacity) {
        cursor.tick += remaining;
        return;
      }
      remaining -= capacity;
      if (cursor.measure + 1 >= Core.MAX_MEASURES) {
        cursor.tick = size;
        toast(t("measureLimit"));
        return;
      }
      cursor.measure += 1;
      cursor.tick = 0;
      Core.ensureMeasures(doc, cursor.measure + 1);
    }
  }

  function dottedTicks(code = entry.duration, dots = entry.dots) {
    const base = Core.durationTicks[code] || Core.PPQ;
    return Math.round(base * (dots === 1 ? 1.5 : dots === 2 ? 1.75 : 1));
  }

  function applyAccidental(pitch, measureIndex = cursor.measure) {
    const midi = Number(pitch?.midi);
    if (!Number.isFinite(midi)) return pitch;
    const key = doc.measures[measureIndex]?.key || doc.settings.key;
    return Core.spellPitchInKey(midi, key, entry.accidental);
  }

  function requestedDurationTicks(options = {}) {
    const tupletNumber = Number(options.tuplet || entry.tuplet) || 0;
    const nominalTicks = options.durationTicks || dottedTicks();
    return options.grace ?? entry.grace
      ? Math.min(nominalTicks, Core.durationTicks["32"])
      : tupletNumber ? Math.round(nominalTicks * (tupletNumber - 1) / tupletNumber) : nominalTicks;
  }

  function rangesOverlap(startA, durationA, startB, durationB) {
    return startA < startB + durationB && startB < startA + durationA;
  }

  function insertModelEvent(part, event) {
    if (!part) return [];
    try {
      return event.type === "note"
        ? Core.insertRhythmicEvent(doc, part.id, event)
        : [Core.insertEvent(doc, part.id, event)];
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      toast(t("voiceLimit"));
      return [];
    }
  }

  function tupletSpecAt(part, staff, voice, measure, tick, num, inTimeOf) {
    const size = Math.max(2, Number(num) || 3);
    const occupied = Math.max(1, Number(inTimeOf) || size - 1);
    const previous = part.events
      .filter(event => event.measure === measure && event.staff === staff && event.voice === voice && event.tuplet
        && event.tuplet.num === size && event.tuplet.inTimeOf === occupied
        && event.tick + event.durationTicks === tick)
      .sort((a, b) => b.tick - a.tick)[0];
    const nextIndex = previous ? Number(previous.tuplet.index) + 1 : 0;
    return previous && nextIndex < size
      ? { id: previous.tuplet.id, num: size, inTimeOf: occupied, index: nextIndex }
      : { id: Core.uid("tuplet"), num: size, inTimeOf: occupied, index: 0 };
  }

  function insertRestAtCursor(options = {}) {
    const part = options.part || activePart();
    if (!part) { toast(t("noPart")); return null; }
    let measure = options.measure ?? cursor.measure;
    let tick = options.tick ?? cursor.tick;
    let remaining = requestedDurationTicks(options);
    const segments = [];
    while (remaining > 0) {
      if (measure >= Core.MAX_MEASURES) { toast(t("measureLimit")); return null; }
      const measureData = doc.measures[measure] || doc.measures.at(-1) || { time: doc.settings.time };
      const measureSize = Core.measureTicks(measureData.time);
      tick = Math.max(0, Math.min(measureSize, tick));
      const capacity = measureSize - tick;
      if (capacity <= 0) { measure += 1; tick = 0; continue; }
      const durationTicks = Math.min(remaining, capacity);
      segments.push({ measure, tick, durationTicks });
      remaining -= durationTicks;
      measure += 1;
      tick = 0;
    }
    const selectedTuplet = Number(options.tuplet || entry.tuplet) || 0;
    const notationSegments = selectedTuplet
      ? segments.map(segment => ({ ...segment, restCode: entry.duration, dots: entry.dots, tuplet: { num: selectedTuplet, inTimeOf: selectedTuplet - 1 } }))
      : segments.flatMap(segment => Core.splitRestSpan(doc.measures[segment.measure]?.time || doc.measures.at(-1).time, segment.tick, segment.durationTicks)
        .map(item => ({ ...segment, ...item })));
    const staff = options.staff ?? cursor.staff;
    const voice = options.voice ?? cursor.voice;
    const occupied = notationSegments.some(segment => part.events.some(event =>
      event.measure === segment.measure && event.staff === staff && event.voice === voice && ["note", "rest"].includes(event.type)
      && rangesOverlap(segment.tick, segment.durationTicks, event.tick, event.durationTicks)
    ));
    if (occupied) { toast(t("restOverlap")); return null; }
    snapshot();
    try { Core.ensureMeasures(doc, Math.max(...notationSegments.map(segment => segment.measure)) + 1); }
    catch (_) { toast(t("measureLimit")); return null; }
    notationSegments.forEach(segment => Core.insertEvent(doc, part.id, {
      type: "rest", ...segment, staff, voice,
      dots: segment.dots || 0,
      tuplet: segment.tuplet ? tupletSpecAt(part, staff, voice, segment.measure, segment.tick, segment.tuplet.num, segment.tuplet.inTimeOf) : null,
      sourceId: options.sourceId || part.sourceProfileId
    }));
    Core.normalizeExplicitRests(doc, part.id);
    const inserted = part.events.filter(event => event.type === "rest" && event.staff === staff && event.voice === voice && notationSegments.some(segment =>
      segment.measure === event.measure && rangesOverlap(segment.tick, segment.durationTicks, event.tick, event.durationTicks)
    ));
    if (selectedTuplet) {
      const lastTuplet = inserted.at(-1)?.tuplet;
      entry.tupletProgress = lastTuplet ? (lastTuplet.index + 1) % selectedTuplet : 0;
      entry.tupletId = entry.tupletProgress ? lastTuplet?.id || null : null;
    }
    selection = new Set(inserted.map(event => event.id));
    selectionAnchor = inserted.at(-1)?.id || null;
    const last = inserted.at(-1);
    if (last) {
      cursor = { measure: last.measure, tick: last.tick + last.durationTicks, staff, voice };
      const size = Core.measureTicks(doc.measures[cursor.measure].time);
      if (cursor.tick >= size && cursor.measure + 1 < Core.MAX_MEASURES) { cursor.measure += 1; cursor.tick = 0; Core.ensureMeasures(doc, cursor.measure + 1); }
    }
    changed();
    return inserted[0] || null;
  }

  function insertAtCursor(pitches, options = {}) {
    const part = options.part || activePart();
    if (!part) { toast(t("noPart")); return null; }
    if (options.rest) return insertRestAtCursor(options);
    const targetMeasure = options.measure ?? cursor.measure;
    if (targetMeasure >= Core.MAX_MEASURES) { toast(t("measureLimit")); return null; }
    const tupletNumber = Number(options.tuplet || entry.tuplet) || 0;
    const durationTicks = requestedDurationTicks(options);
    const targetTick = options.tick ?? cursor.tick;
    const segments = [];
    let remaining = durationTicks;
    let measureIndex = targetMeasure;
    let tick = targetTick;
    while (remaining > 0) {
      if (measureIndex >= Core.MAX_MEASURES) { toast(t("measureLimit")); return null; }
      try { Core.ensureMeasures(doc, measureIndex + 1); } catch (_) { toast(t("measureLimit")); return null; }
      const measureSize = Core.measureTicks(doc.measures[measureIndex].time);
      const capacity = measureSize - tick;
      if (capacity <= 0) { measureIndex += 1; tick = 0; continue; }
      const span = Math.min(remaining, capacity);
      if (tupletNumber) segments.push({ measure: measureIndex, tick, durationTicks: span, restCode: entry.duration, dots: entry.dots, tuplet: { num: tupletNumber, inTimeOf: tupletNumber - 1 } });
      else Core.splitRestSpan(doc.measures[measureIndex].time, tick, span).forEach(segment => segments.push({ ...segment, measure: measureIndex }));
      remaining -= span;
      measureIndex += 1;
      tick = 0;
    }
    snapshot();
    const inputGroupId = options.inputGroupId || Core.uid("input");
    const requestedStaff = Number.isFinite(Number(options.staff)) ? Number(options.staff) : part.notationType === "grand" ? null : cursor.staff;
    const staffGroups = Core.groupPitchesByStaff(part, pitches, requestedStaff);
    let inserted;
    try {
      inserted = staffGroups.flatMap(group => segments.flatMap((segment, index) => insertModelEvent(part, {
        type: "note",
        measure: segment.measure,
        tick: segment.tick,
        durationTicks: segment.durationTicks,
        restCode: segment.restCode,
        rawTick: index === 0 ? options.rawTick ?? null : null,
        rawDurationTicks: index === 0 ? options.rawDurationTicks ?? null : null,
        staff: group.staff,
        voice: options.voice ?? cursor.voice,
        dots: segment.dots,
        tuplet: segment.tuplet ? tupletSpecAt(part, group.staff, options.voice ?? cursor.voice, segment.measure, segment.tick, segment.tuplet.num, segment.tuplet.inTimeOf) : null,
        pitches: group.pitches.map(pitch => applyAccidental(pitch, segment.measure)),
        velocity: options.velocity || 92,
        grace: options.grace ?? entry.grace,
        tieStart: index < segments.length - 1 || (options.tie ?? entry.tie),
        tieStop: index > 0,
        slurStart: index === 0 && (options.slur ?? entry.slur),
        slurStop: index === segments.length - 1 && segments.length > 1 && (options.slur ?? entry.slur),
        beam: options.beam || entry.beam,
        articulations: index === 0 && (options.articulation || entry.articulation) ? [options.articulation || entry.articulation] : [],
        ornament: index === 0 ? options.ornament || entry.ornament || null : null,
        dynamic: index === 0 ? options.dynamic || entry.dynamic || null : null,
        chordSymbol: index === 0 ? options.chordSymbol || "" : "",
        sourceId: options.sourceId || part.sourceProfileId,
        inputGroupId: part.notationType === "grand" && part.grandInputMode === "split" ? `${inputGroupId}:staff:${group.staff}` : inputGroupId
      })));
    } catch (error) {
      toast(error instanceof RangeError ? t("voiceLimit") : String(error?.message || error));
      return null;
    }
    inserted = [...new Map(inserted.map(item => [item.id, item])).values()];
    if (!inserted.length) return null;
    const event = inserted[0];
    staffGroups.forEach(group => {
      const first = inserted.find(item => item.staff === group.staff);
      if (!first) return;
      const previous = part.events.filter(item => !inserted.some(added => added.id === item.id) && item.type === "note" && item.staff === group.staff && (item.measure < first.measure || item.measure === first.measure && item.tick <= first.tick)).at(-1);
      if (previous?.tieStart && previous.pitches.some(pitch => first.pitches.some(next => next.midi === pitch.midi))) first.tieStop = true;
      if (previous?.slurStart) first.slurStop = true;
    });
    selection = new Set(inserted.map(item => item.id));
    selectionAnchor = inserted.at(-1)?.id || event.id;
    if (tupletNumber) {
      const lastTuplet = inserted.at(-1)?.tuplet;
      entry.tupletProgress = lastTuplet ? (lastTuplet.index + 1) % tupletNumber : 0;
      entry.tupletId = entry.tupletProgress ? lastTuplet?.id || null : null;
    }
    if (options.advance !== false && !event.grace) {
      measureTickAdvance(durationTicks);
      playbackPosition = { measure: cursor.measure, tick: cursor.tick };
    }
    changed();
    return event;
  }

  function routePart(detail) {
    const snapshotData = host?.snapshotProfiles?.() || {};
    const sourceStates = new Map([
      ...(snapshotData.profiles || []).map(profile => [profile.id, profile.enabled !== false]),
      ...(snapshotData.basses || []).map(layer => [layer.id, layer.enabled !== false])
    ]);
    return Core.resolveInputPart(doc, detail, inputPartId, part => {
      if (part.sourceProfileId && sourceStates.has(part.sourceProfileId)) return sourceStates.get(part.sourceProfileId);
      return part.enabled !== false;
    });
  }

  function notationMidiForPart(detail, part) {
    const performed = Number(detail.notationMidi ?? detail.midi);
    return performed - (Number(part?.transposition?.chromatic) || 0) - (Number(part?.transposition?.octave) || 0) * 12;
  }

  function onQBoardNoteOn(event) {
    if (!openState || !doc || event.detail?.origin === "score-playback") return;
    const detail = event.detail || {};
    if (recording?.active) return recordNoteOn(detail);
    const part = routePart(detail);
    if (!part) return;
    const groupKey = part.id;
    let group = stepGroups.get(groupKey);
    const now = performance.now();
    if (!group || now - group.started > STEP_CHORD_MS || group.measure !== cursor.measure || group.tick !== cursor.tick) {
      group = { started: now, part, pitches: new Set(), velocity: [], measure: cursor.measure, tick: cursor.tick, timer: 0 };
      stepGroups.set(groupKey, group);
    }
    group.pitches.add(notationMidiForPart(detail, part));
    group.velocity.push(Number(detail.velocity) || 92);
    window.clearTimeout(group.timer);
    group.timer = window.setTimeout(() => flushStepGroup(groupKey), STEP_CHORD_MS);
  }

  function flushStepGroup(key) {
    const group = stepGroups.get(key);
    if (!group) return;
    stepGroups.delete(key);
    if (!group.pitches.size) return;
    cursor.measure = group.measure; cursor.tick = group.tick;
    insertAtCursor([...group.pitches].map(midi => ({ midi })), { part: group.part, velocity: Math.round(group.velocity.reduce((a, b) => a + b, 0) / group.velocity.length) });
  }

  function ticksFromMs(ms, measureIndex = cursor.measure) {
    const tempo = doc.measures[measureIndex]?.tempo || doc.settings.tempo;
    return ms * Core.PPQ * tempo / 60000;
  }

  function absoluteToMeasure(absoluteTick) {
    let remainder = Math.max(0, absoluteTick);
    for (let index = 0; index < doc.measures.length; index += 1) {
      const size = Core.measureTicks(doc.measures[index].time);
      if (remainder < size) return { measure: index, tick: remainder };
      remainder -= size;
    }
    const size = Core.measureTicks(doc.settings.time);
    const extra = Math.floor(remainder / size);
    const wanted = doc.measures.length + extra + 1;
    if (wanted > Core.MAX_MEASURES) return { measure: Core.MAX_MEASURES - 1, tick: Math.max(0, size - 1), limited: true };
    Core.ensureMeasures(doc, wanted);
    return { measure: doc.measures.length - 1, tick: remainder % size };
  }

  function absoluteMsToMeasure(absoluteMs) {
    let remainder = Math.max(0, absoluteMs);
    for (let index = 0; index < doc.measures.length; index += 1) {
      const measure = doc.measures[index];
      const durationMs = Core.measureTicks(measure.time) * 60000 / (measure.tempo * Core.PPQ);
      if (remainder < durationMs) return { measure: index, tick: ticksFromMs(remainder, index) };
      remainder -= durationMs;
    }
    const last = doc.measures.at(-1);
    const durationMs = Core.measureTicks(last.time) * 60000 / (last.tempo * Core.PPQ);
    const extra = Math.floor(remainder / durationMs);
    const wanted = doc.measures.length + extra + 1;
    if (wanted > Core.MAX_MEASURES) return { measure: Core.MAX_MEASURES - 1, tick: Math.max(0, Core.measureTicks(last.time) - 1), limited: true };
    Core.ensureMeasures(doc, wanted);
    const index = doc.measures.length - 1;
    return { measure: index, tick: ticksFromMs(remainder % durationMs, index) };
  }

  function recordNoteOn(detail) {
    if (!recording.startedAt) return;
    const part = routePart(detail);
    if (!part) return;
    const key = `${detail.sourceId || detail.profileId}:${detail.voiceId || detail.code || detail.midi}:${detail.midi}`;
    const now = Number(detail.time) || performance.now();
    if (!recording.noteGroup || recording.noteGroup.partId !== part.id || now - recording.noteGroup.started > STEP_CHORD_MS) {
      recording.noteGroup = { id: Core.uid("input"), partId: part.id, started: now };
    }
    const notationMidi = notationMidiForPart(detail, part);
    const staff = part.notationType === "grand" && notationMidi < part.splitMidi ? 1 : 0;
    const inputGroupId = part.notationType === "grand" && part.grandInputMode === "split"
      ? `${recording.noteGroup.id}:staff:${staff}`
      : recording.noteGroup.id;
    recording.notes.set(key, { detail: Core.clone(detail), partId: part.id, started: now, staff, inputGroupId });
    recording.take.events.push({ type: "note-on", timeMs: now - recording.startedAt, ...Core.clone(detail), partId: part.id });
  }

  function onQBoardNoteOff(event) {
    if (!recording?.active || !recording.startedAt || event.detail?.origin === "score-playback") return;
    const detail = event.detail || {};
    const key = `${detail.sourceId || detail.profileId}:${detail.voiceId || detail.code || detail.midi}:${detail.midi}`;
    const active = recording.notes.get(key);
    if (!active) return;
    recording.notes.delete(key);
    const position = absoluteMsToMeasure(active.started - recording.startedAt);
    const now = Number(detail.time) || performance.now();
    const durationTicks = Math.max(1, ticksFromMs(now - active.started, position.measure));
    const part = Core.findPart(doc, active.partId);
    insertModelEvent(part, {
      type: "note", measure: position.measure, tick: Math.round(position.tick), durationTicks: Math.round(durationTicks), rawTick: position.tick,
      rawDurationTicks: durationTicks, pitches: [{ midi: notationMidiForPart(active.detail, part) }], velocity: active.detail.velocity || 92,
      staff: active.staff, sourceId: active.detail.sourceId || active.detail.profileId,
      inputGroupId: active.inputGroupId
    });
    recording.take.events.push({ type: "note-off", timeMs: now - recording.startedAt, ...Core.clone(detail), partId: part.id });
    scheduleRender();
  }

  function onQBoardPedal(event) {
    if (!recording?.active || !recording.startedAt || event.detail?.origin === "score-playback") return;
    const detail = event.detail || {};
    const part = routePart(detail);
    if (!part) return;
    const now = Number(detail.time) || performance.now();
    const position = absoluteMsToMeasure(now - recording.startedAt);
    Core.insertEvent(doc, part.id, { type: "pedal", measure: position.measure, tick: Math.round(position.tick), durationTicks: 1, value: Boolean(detail.active), sourceId: detail.sourceId || detail.profileId });
    recording.take.events.push({ type: "pedal", timeMs: now - recording.startedAt, active: Boolean(detail.active), partId: part.id });
  }

  function onBassChord(event) {
    if (!openState || event.detail?.origin === "score-playback") return;
    const detail = event.detail || {};
    const part = routePart({ ...detail, sourceType: "bass" });
    if (!part) return;
    if (recording?.active) {
      if (!recording.startedAt) return;
      const key = detail.sourceId || detail.profileId || part.id;
      if (detail.active === false) finishRecordedBass(key, detail);
      else if (detail.midis?.length) {
        if (recording.basses.has(key)) finishRecordedBass(key, detail);
        const now = Number(detail.time) || performance.now();
        recording.basses.set(key, { detail: Core.clone(detail), partId: part.id, started: now });
        recording.take.events.push({ type: "bass-chord-on", timeMs: now - recording.startedAt, ...Core.clone(detail), partId: part.id });
      }
    } else {
      if (detail.active === false || !detail.midis?.length) return;
      insertAtCursor(detail.midis.map(midi => ({ midi })), { part, staff: part.notationType === "grand" ? 1 : 0, chordSymbol: detail.label || "", sourceId: detail.sourceId || detail.profileId });
    }
  }

  function finishRecordedBass(key, releaseDetail = {}) {
    const active = recording?.basses.get(key);
    if (!active || !recording.startedAt) return;
    recording.basses.delete(key);
    const position = absoluteMsToMeasure(active.started - recording.startedAt);
    const now = Number(releaseDetail.time) || performance.now();
    const duration = Math.max(1, ticksFromMs(now - active.started, position.measure));
    const part = Core.findPart(doc, active.partId);
    insertModelEvent(part, {
      type: "note", measure: position.measure, tick: Math.round(position.tick), durationTicks: Math.round(duration), rawTick: position.tick,
      rawDurationTicks: duration, pitches: active.detail.midis.map(midi => ({ midi: notationMidiForPart({ midi }, part) })),
      velocity: active.detail.velocity || 92, staff: part.notationType === "grand" ? 1 : 0,
      chordSymbol: active.detail.label || "", sourceId: active.detail.sourceId || active.detail.profileId
    });
    recording.take.events.push({ type: "bass-chord-off", timeMs: now - recording.startedAt, ...Core.clone(releaseDetail), partId: part.id });
    scheduleRender();
  }

  async function startRecording() {
    if (recording?.active) return stopRecording();
    stopPlayback({ keepPosition: true });
    const clock = await host?.prepareScoreAudio?.() || { currentTime: performance.now() / 1000 };
    snapshot();
    const count = doc.settings.countInMeasures;
    const countMeasure = currentMeasure();
    recording = { active: true, startedAt: 0, notes: new Map(), basses: new Map(), noteGroup: null, take: { id: Core.uid("take"), createdAt: new Date().toISOString(), tempo: countMeasure.tempo, time: Core.clone(countMeasure.time), events: [] } };
    setTransportState(count ? "count-in" : "recording");
    if (!count) return beginRecordingTake(Number(host?.audioTimeToPerformance?.(clock.currentTime)) || performance.now());
    const beats = count * countMeasure.time.beats;
    const interval = 60000 / countMeasure.tempo;
    const firstAudioTime = Number(clock.currentTime) + 0.035;
    for (let beat = 0; beat < beats; beat += 1) host?.metronomeClick?.({ accent: beat % countMeasure.time.beats === 0, when: firstAudioTime + beat * interval / 1000 });
    const recordingAudioTime = firstAudioTime + beats * interval / 1000;
    const recordingPerformanceTime = Number(host?.audioTimeToPerformance?.(recordingAudioTime)) || performance.now() + beats * interval;
    const firstPerformanceTime = Number(host?.audioTimeToPerformance?.(firstAudioTime)) || performance.now();
    const overlay = workspace.querySelector("[data-score-countin]");
    overlay.hidden = false;
    let beat = 0;
    const pulse = () => {
      if (!recording?.active) return;
      overlay.textContent = String((beat % countMeasure.time.beats) + 1);
      beat += 1;
      if (beat >= beats) {
        recording.countTimer = window.setTimeout(() => {
          if (!recording?.active) return;
          overlay.hidden = true;
          beginRecordingTake(recordingPerformanceTime);
        }, interval);
      } else recording.countTimer = window.setTimeout(pulse, interval);
    };
    recording.countTimer = window.setTimeout(pulse, Math.max(0, firstPerformanceTime - performance.now()));
    setStatus(`${t("countIn")} ${count}`);
  }

  function beginRecordingTake(startedAt = performance.now()) {
    if (!recording?.active) return;
    recording.startedAt = startedAt;
    setTransportState("recording");
    setStatus(t("recording"));
  }

  function stopRecording() {
    if (!recording) return;
    window.clearTimeout(recording.countTimer);
    host?.cancelScoreMetronome?.();
    const overlay = workspace.querySelector("[data-score-countin]");
    if (overlay) overlay.hidden = true;
    if (recording.startedAt) {
      for (const active of recording.notes.values()) {
        const position = absoluteMsToMeasure(active.started - recording.startedAt);
        const part = Core.findPart(doc, active.partId);
        const duration = Math.max(1, ticksFromMs(performance.now() - active.started, position.measure));
        insertModelEvent(part, { type: "note", measure: position.measure, tick: Math.round(position.tick), durationTicks: Math.round(duration), rawTick: position.tick, rawDurationTicks: duration, pitches: [{ midi: notationMidiForPart(active.detail, part) }], velocity: active.detail.velocity || 92, staff: part.notationType === "grand" && notationMidiForPart(active.detail, part) < part.splitMidi ? 1 : 0, sourceId: active.detail.sourceId || active.detail.profileId, inputGroupId: active.inputGroupId });
      }
      for (const key of [...recording.basses.keys()]) finishRecordedBass(key);
      doc.rawTakes.push(recording.take);
      Core.quantizeDocument(doc, doc.settings.quantize, { preserveRaw: true });
    }
    recording = null;
    setTransportState("stopped");
    setStatus(t("stepReady"));
    changed();
  }

  function absoluteEventTick(event) {
    return Core.documentAbsoluteTick(doc, event);
  }

  function absoluteEventMs(event) {
    let total = 0;
    for (let index = 0; index < event.measure; index += 1) {
      const measure = doc.measures[index];
      total += Core.measureTicks(measure.time) * 60000 / (measure.tempo * Core.PPQ);
    }
    const measure = doc.measures[event.measure] || doc.measures[0];
    return total + event.tick * 60000 / (measure.tempo * Core.PPQ);
  }

  function absoluteMsForPosition(position) {
    let total = 0;
    for (let index = 0; index < position.measure; index += 1) {
      const measure = doc.measures[index];
      total += Core.measureTicks(measure.time) * 60000 / (measure.tempo * Core.PPQ);
    }
    const measure = doc.measures[position.measure] || doc.measures[0];
    return total + Math.max(0, Number(position.tick) || 0) * 60000 / (measure.tempo * Core.PPQ);
  }

  function positionFromAbsoluteMs(value) {
    let remainder = Math.max(0, value);
    for (let index = 0; index < doc.measures.length; index += 1) {
      const measure = doc.measures[index];
      const duration = Core.measureTicks(measure.time) * 60000 / (measure.tempo * Core.PPQ);
      if (remainder < duration || index === doc.measures.length - 1) {
        return { measure: index, tick: Math.min(Core.measureTicks(measure.time), remainder * measure.tempo * Core.PPQ / 60000) };
      }
      remainder -= duration;
    }
    const lastIndex = doc.measures.length - 1;
    return { measure: lastIndex, tick: Core.measureTicks(doc.measures[lastIndex].time) };
  }

  function playableParts() {
    const soloed = doc.parts.filter(part => part.solo && !part.mute);
    return soloed.length ? soloed : doc.parts.filter(part => !part.mute);
  }

  function playbackAudioClock() {
    const clock = host?.getScoreAudioClock?.();
    if (clock && Number.isFinite(clock.currentTime)) return clock;
    return { currentTime: performance.now() / 1000, audibleTime: performance.now() / 1000 };
  }

  function playbackScoreMs(activePlayback = playback) {
    if (!activePlayback) return absoluteMsForPosition(playbackPosition);
    const clock = playbackAudioClock();
    const audible = Number.isFinite(clock.audibleTime) ? clock.audibleTime : clock.currentTime;
    return activePlayback.startMs + Math.max(0, audible - activePlayback.startAudioTime) * 1000;
  }

  function pedalActiveAt(part, timeMs) {
    let active = false;
    part.events.filter(event => event.type === "pedal" && absoluteEventMs(event) <= timeMs).sort((a, b) => absoluteEventMs(a) - absoluteEventMs(b)).forEach(event => { active = Boolean(event.value); });
    return active;
  }

  function buildPlaybackQueue(selectionOnly) {
    const queue = [];
    playableParts().forEach(part => {
      Core.buildTiedNoteSpans(doc, part, event => !selectionOnly || selection.has(event.id)).forEach(span => {
        const startMs = absoluteEventMs(span.event);
        const endTempo = doc.measures[span.endEvent.measure]?.tempo || doc.settings.tempo;
        const endMs = absoluteEventMs(span.endEvent) + span.endEvent.durationTicks * 60000 / (endTempo * Core.PPQ);
        const voiceId = `score-${span.event.id}-${span.pitchIndex}`;
        queue.push({ type: "note-on", timeMs: startMs, order: 2, part, event: span.event, pitch: span.pitch, voiceId, endMs });
        queue.push({ type: "note-off", timeMs: endMs, order: 1, part, event: span.endEvent, voiceId, sustained: pedalActiveAt(part, endMs) });
      });
      if (!selectionOnly) part.events.filter(event => event.type === "pedal").forEach(event => queue.push({ type: "pedal", timeMs: absoluteEventMs(event), order: 0, part, event }));
    });
    return queue.sort((a, b) => a.timeMs - b.timeMs || a.order - b.order);
  }

  function schedulePlaybackItem(item, when) {
    if (!playback?.active) return;
    if (item.type === "note-on") {
      const playMidi = item.pitch.midi + (item.part.transposition.chromatic || 0) + (item.part.transposition.octave || 0) * 12 + (item.part.outputShift || 0);
      host?.playScoreNote?.({ midi: playMidi, notationMidi: item.pitch.midi, part: item.part, event: item.event, voiceId: item.voiceId, velocity: item.event.velocity, when, origin: "score-playback" });
      playback.voices.add(item.voiceId);
      return;
    }
    if (item.type === "note-off") {
      host?.stopScoreNote?.({ part: item.part, event: item.event, voiceId: item.voiceId, when, releaseSeconds: item.sustained ? item.part.pedalDampingSeconds : item.part.noteFadeSeconds, sustained: item.sustained, origin: "score-playback" });
      return;
    }
    if (item.type === "pedal" && !item.event.value) host?.releaseScoreSustain?.({ partId: item.part.id, when, releaseSeconds: item.part.noteFadeSeconds });
  }

  function runPlaybackScheduler() {
    if (!playback?.active) return;
    const clock = playbackAudioClock();
    const horizonMs = playback.startMs + Math.max(0, clock.currentTime + 0.1 - playback.startAudioTime) * 1000;
    while (playback.index < playback.queue.length && playback.queue[playback.index].timeMs <= horizonMs) {
      const item = playback.queue[playback.index++];
      const when = playback.startAudioTime + (item.timeMs - playback.startMs) / 1000;
      schedulePlaybackItem(item, Math.max(clock.currentTime, when));
    }
  }

  function visualPlaybackPosition(scoreMs, activePlayback = playback) {
    const spans = activePlayback?.noteSpans || [];
    const sounding = spans.filter(item => item.startMs <= scoreMs + 0.5 && item.endMs > scoreMs + 0.5);
    const target = (sounding.length ? sounding : spans.filter(item => item.startMs >= scoreMs - 0.5))
      .sort((a, b) => a.startMs - b.startMs || a.event.measure - b.event.measure || a.event.tick - b.event.tick)[0];
    return target ? { measure: target.event.measure, tick: target.event.tick } : positionFromAbsoluteMs(scoreMs);
  }

  async function startPlayback({ selectionOnly = false } = {}) {
    if (transportState === "playing") return pausePlayback();
    stopRecording();
    stopPlayback({ keepPosition: true });
    const queue = buildPlaybackQueue(selectionOnly);
    const noteItems = queue.filter(item => item.type === "note-on");
    if (!noteItems.length) return;
    let startMs = absoluteMsForPosition(playbackPosition);
    const lastEventMs = Math.max(...noteItems.map(item => item.timeMs));
    if (startMs > lastEventMs) {
      startMs = selectionOnly ? noteItems[0].timeMs : 0;
      seek(positionFromAbsoluteMs(startMs));
    }
    const scheduled = queue.filter(item => item.timeMs >= startMs - 0.5);
    const endMs = Math.max(...scheduled.filter(item => item.type === "note-off").map(item => item.timeMs));
    const clock = await host?.prepareScoreAudio?.() || playbackAudioClock();
    const startAudioTime = Number(clock.currentTime) + Math.max(0.006, Math.min(0.016, Number(clock.baseLatency || 0) * 0.35 + 0.004));
    const noteSpans = scheduled.filter(item => item.type === "note-on").map(item => ({ event: item.event, startMs: item.timeMs, endMs: item.endMs }));
    playback = { active: true, queue: scheduled, noteSpans, index: 0, voices: new Set(), startAudioTime, startMs, endMs, selectionOnly, scheduler: 0, visualPosition: visualPlaybackPosition(startMs, { noteSpans }) };
    setTransportState("playing");
    runPlaybackScheduler();
    playback.scheduler = window.setInterval(runPlaybackScheduler, 20);
    playbackFrame = window.requestAnimationFrame(updatePlaybackFrame);
    setStatus(t("play"));
  }

  function updatePlaybackFrame() {
    if (!playback?.active) return;
    const scoreMs = playbackScoreMs();
    if (scoreMs >= playback.endMs) {
      const loop = workspace.querySelector('[data-score-field="loop"]')?.checked;
      const { startMs, selectionOnly } = playback;
      window.clearInterval(playback.scheduler);
      playback = null;
      host?.stopAllScoreNotes?.({ releaseSeconds: 0.03 });
      window.cancelAnimationFrame(playbackFrame);
      playbackFrame = 0;
      seek(positionFromAbsoluteMs(loop ? startMs : scoreMs));
      setTransportState("stopped");
      if (loop) startPlayback({ selectionOnly });
      else setStatus(t("stepReady"));
      return;
    }
    playbackPosition = positionFromAbsoluteMs(scoreMs);
    playback.visualPosition = visualPlaybackPosition(scoreMs, playback);
    cursor.measure = playbackPosition.measure;
    cursor.tick = playbackPosition.tick;
    updateEditorContext();
    updatePlayheadVisuals(playback.visualPosition);
    scrollPlayheadIntoView(false);
    playbackFrame = window.requestAnimationFrame(updatePlaybackFrame);
  }

  function scrollPlayheadIntoView(force) {
    const viewport = workspace?.querySelector("[data-score-viewport]");
    if (!viewport) return;
    const zoom = Number(doc.settings.page.zoom) || 1;
    const x = positionToGeometryX(playbackPosition) * zoom;
    const margin = Math.min(80, viewport.clientWidth * 0.18);
    const outside = x < viewport.scrollLeft + margin || x > viewport.scrollLeft + viewport.clientWidth - margin;
    if (!force && !outside) return;
    if (autoFollowSuppressed && !force) autoFollowSuppressed = false;
    viewport.scrollLeft = Math.max(0, x - viewport.clientWidth * 0.35);
  }

  function pausePlayback() {
    if (!playback?.active) return;
    playbackPosition = positionFromAbsoluteMs(playbackScoreMs());
    stopPlayback({ keepPosition: true, nextState: "paused" });
  }

  function stopPlayback({ keepPosition = true, nextState = "stopped" } = {}) {
    if (!playback) { setTransportState(nextState); return; }
    window.clearInterval(playback.scheduler);
    host?.stopAllScoreNotes?.({ releaseSeconds: 0.03 });
    playback = null;
    window.cancelAnimationFrame(playbackFrame);
    playbackFrame = 0;
    if (!keepPosition) seek({ measure: 0, tick: 0 });
    updatePlayheadVisuals();
    setTransportState(nextState);
    setStatus(t("stepReady"));
  }

  function stopAll() {
    stopRecording();
    stopPlayback();
    stepGroups.forEach(group => window.clearTimeout(group.timer));
    stepGroups.clear();
    setTransportState("stopped");
  }

  function selectEvent(eventId, extend = false, pitchIndex = null) {
    playheadSelected = false;
    if (!extend) selection.clear();
    measureSelection = null;
    insertionBoundary = null;
    if (extend && selectionAnchor) {
      const part = activePart();
      const ids = part?.events.map(item => item.id) || [];
      const a = ids.indexOf(selectionAnchor), b = ids.indexOf(eventId);
      if (a >= 0 && b >= 0) for (let index = Math.min(a, b); index <= Math.max(a, b); index += 1) selection.add(ids[index]);
      else selection.add(eventId);
    } else selection.add(eventId);
    selectionAnchor = eventId;
    const found = Core.findEvent(doc, eventId);
    if (found) {
      if (!extend && found.event.inputGroupId) {
        found.part.events.filter(item => item.inputGroupId === found.event.inputGroupId).forEach(item => selection.add(item.id));
      }
      selectInputPart(found.part.id);
      if (playback?.active) stopPlayback({ keepPosition: true, nextState: "paused" });
      playbackPosition = { measure: found.event.measure, tick: found.event.tick };
      cursor = { measure: found.event.measure, tick: found.event.tick, staff: found.event.staff, voice: found.event.voice };
      selectedTabPitch = Core.isTabPart(found.part) && found.event.type === "note" && Number.isInteger(pitchIndex)
        ? { eventId, pitchIndex: Math.max(0, Math.min(found.event.pitches.length - 1, pitchIndex)) }
        : null;
      const tempoInput = workspace.querySelector('[data-score-field="tempo"]');
      if (tempoInput) tempoInput.value = currentMeasure().tempo;
      if (window.matchMedia("(max-width: 680px)").matches) {
        const sidebar = workspace.querySelector(".qscore-sidebar");
        const inspector = workspace.querySelector(".qscore-inspector");
        if (sidebar) sidebar.hidden = true;
        if (inspector) inspector.hidden = false;
      }
    }
    updateEditorContext();
    renderPartList(); renderInspector(); scheduleRender();
  }

  function deleteSelection() {
    if (!selection.size) return;
    snapshot();
    Core.removeEvents(doc, [...selection]);
    selection.clear(); selectionAnchor = null;
    selectedTabPitch = null;
    changed();
  }

  function deletePreviousScoreOnset() {
    if (!doc || playheadSelected || selection.size || measureSelection) return false;
    const before = absoluteTickForPosition(playbackPosition);
    const candidates = doc.parts.flatMap(part => part.events.filter(event => event.type === "note" && absoluteEventTick(event) < before).map(event => ({ part, event, tick: absoluteEventTick(event) })));
    if (!candidates.length) return false;
    const onset = Math.max(...candidates.map(item => item.tick));
    const ids = candidates.filter(item => item.tick === onset).map(item => item.event.id);
    snapshot();
    Core.removeEvents(doc, ids);
    selectedTabPitch = null;
    changed();
    return true;
  }

  function deleteCommand() {
    if (selection.size) return deleteSelection();
    return deletePreviousScoreOnset();
  }

  function moveSelectedTabPitch(visualDelta) {
    if (!selectedTabPitch) return false;
    const found = Core.findEvent(doc, selectedTabPitch.eventId);
    if (!found || !Core.isTabPart(found.part) || found.event.type !== "note") { selectedTabPitch = null; return false; }
    Core.normalizeTabPositions(found.event, found.part);
    const before = found.event.tab.positions.find(item => item.pitchIndex === selectedTabPitch.pitchIndex)?.string;
    const tuning = Core.tabTuning(found.part);
    const expected = Math.max(1, Math.min(tuning.length, Number(before) - Number(visualDelta || 0)));
    if (!Number.isFinite(before) || expected === before) return true;
    snapshot();
    Core.moveTabPosition(found.event, found.part, selectedTabPitch.pitchIndex, visualDelta);
    changed();
    return true;
  }

  function totalScoreTicks() {
    return doc.measures.reduce((sum, measure) => sum + Core.measureTicks(measure.time), 0);
  }

  function movePlayheadByRhythm(direction) {
    if (!playheadSelected || !doc) return false;
    const step = Math.max(1, requestedDurationTicks({ grace: false }));
    const current = absoluteTickForPosition(playbackPosition);
    let target = Math.max(0, Math.min(totalScoreTicks(), current + Math.sign(direction) * step));
    const part = activePart();
    if (part) {
      const containing = part.events.filter(event => ["note", "rest"].includes(event.type) && event.staff === cursor.staff && event.voice === cursor.voice).find(event => {
        const start = absoluteEventTick(event);
        return target > start && target < start + event.durationTicks;
      });
      if (containing) {
        const start = absoluteEventTick(containing);
        target = direction > 0 ? start + containing.durationTicks : start;
      }
    }
    const position = target >= totalScoreTicks()
      ? { measure: doc.measures.length - 1, tick: Core.measureTicks(doc.measures.at(-1).time) }
      : positionForAbsoluteTick(target) || { measure: 0, tick: 0 };
    seek(position, { scroll: true });
    return true;
  }

  function consumeNavigationKey(code, options = {}) {
    if (!openState) return false;
    const down = options.down !== false && options.phase !== "up";
    if (playheadSelected && (code === "ArrowLeft" || code === "ArrowRight")) {
      if (down) movePlayheadByRhythm(code === "ArrowRight" ? 1 : -1);
      return true;
    }
    if (selectedTabPitch && (code === "ArrowUp" || code === "ArrowDown")) {
      if (down) moveSelectedTabPitch(code === "ArrowUp" ? 1 : -1);
      return true;
    }
    return false;
  }

  function transformSelectedPitches(kind) {
    if (!selection.size) return;
    snapshot();
    selection.forEach(id => {
      const found = Core.findEvent(doc, id);
      if (!found || found.event.type !== "note") return;
      found.event.pitches = found.event.pitches.map(pitch => {
        if (kind === "octave-up" || kind === "octave-down") {
          const midi = Math.max(0, Math.min(127, pitch.midi + (kind === "octave-up" ? 12 : -12)));
          return { ...Core.spellingFromMidi(midi, pitch.alter < 0 ? "flat" : "sharp"), midi };
        }
        const preference = pitch.alter >= 0 ? "flat" : "sharp";
        return Core.spellingFromMidi(pitch.midi, preference);
      });
    });
    changed();
  }

  function splitSelectedNotes(count) {
    const refs = inspectorEventRefs().filter(ref => ref.event.type === "note");
    if (!refs.length) return false;
    const next = Core.clone(doc);
    const nextSelection = new Set();
    try {
      refs.forEach(ref => {
        Core.splitNoteEvent(next, ref.part.id, ref.event.id, count).forEach(event => nextSelection.add(event.id));
      });
      snapshot();
      doc = Core.normalizeDocument(next);
      selection = nextSelection;
      selectionAnchor = [...selection][0] || null;
      selectedTabPitch = null;
      changed();
      return true;
    } catch (error) {
      toast(error instanceof RangeError ? t("splitTooSmall") : String(error?.message || error));
      return false;
    }
  }

  function absoluteTickForPosition(position) {
    return Core.documentAbsoluteTick(doc, position);
  }

  function positionForAbsoluteTick(absoluteTick) {
    let remainder = Math.max(0, Number(absoluteTick) || 0);
    for (let index = 0; index < Core.MAX_MEASURES; index += 1) {
      const measure = doc.measures[index] || doc.measures.at(-1);
      const size = Core.measureTicks(measure?.time || doc.settings.time);
      if (remainder < size) return { measure: index, tick: remainder };
      remainder -= size;
    }
    return null;
  }

  function copySelection() {
    clipboardSelection.clear();
    clipboardSelectionAnchor = null;
    if (measureSelection) {
      const start = measureSelection.start;
      const end = measureSelection.end;
      clipboard = {
        type: "measures",
        measures: doc.measures.slice(start, end + 1).map(Core.clone),
        events: doc.parts.flatMap(part => part.events.filter(event => event.measure >= start && event.measure <= end).map(event => ({ partId: part.id, relativeMeasure: event.measure - start, event: Core.clone(event) }))),
        directions: doc.directions.filter(item => item.measure >= start && item.measure <= end).map(item => ({ ...Core.clone(item), relativeMeasure: item.measure - start }))
      };
    } else {
      const found = [...selection].map(id => Core.findEvent(doc, id)).filter(Boolean);
      if (!found.length) return;
      const origin = Math.min(...found.map(item => absoluteEventTick(item.event)));
      clipboard = {
        type: "events",
        measures: [],
        events: found.map(item => ({ partId: item.part.id, relativeTick: absoluteEventTick(item.event) - origin, event: Core.clone(item.event) }))
      };
    }
    renderInspector();
    toast(t("copied"));
  }

  function pasteMeasureClipboard() {
    if (!Number.isInteger(insertionBoundary)) { toast(t("pasteNeedsBoundary")); return; }
    const count = clipboard.measures.length;
    if (!count) return;
    if (doc.measures.length + count > Core.MAX_MEASURES) { toast(t("measureLimit")); return; }
    const boundary = Math.max(0, Math.min(doc.measures.length, insertionBoundary));
    snapshot();
    stopPlayback({ keepPosition: true });
    doc.parts.forEach(part => part.events.forEach(event => { if (event.measure >= boundary) event.measure += count; }));
    doc.directions.forEach(item => { if (item.measure >= boundary) item.measure += count; });
    const measures = clipboard.measures.map((measure, offset) => ({ ...Core.clone(measure), id: Core.uid("measure"), index: boundary + offset }));
    doc.measures.splice(boundary, 0, ...measures);
    clipboard.events.forEach(item => {
      const part = Core.findPart(doc, item.partId);
      if (!part) return;
      insertModelEvent(part, { ...Core.clone(item.event), id: Core.uid(item.event.type), measure: boundary + item.relativeMeasure });
    });
    (clipboard.directions || []).forEach(item => doc.directions.push({ ...Core.clone(item), id: Core.uid("direction"), measure: boundary + item.relativeMeasure }));
    doc.measures.forEach((measure, index) => { measure.index = index; });
    measureSelection = { start: boundary, end: boundary + count - 1 };
    insertionBoundary = boundary + count;
    cursor.measure = boundary;
    playbackPosition = { measure: boundary, tick: 0 };
    changed();
  }

  function pasteEventClipboard() {
    if (!clipboard.events.length) return;
    const selectedTarget = selection.size === 1 ? Core.findEvent(doc, [...selection][0])?.event : null;
    const target = selectedTarget ? { measure: selectedTarget.measure, tick: selectedTarget.tick } : cursor;
    const startTick = absoluteTickForPosition(target);
    const positions = clipboard.events.map(item => positionForAbsoluteTick(startTick + item.relativeTick));
    if (positions.some(position => !position)) { toast(t("measureLimit")); return; }
    const required = Math.max(...positions.map(position => position.measure)) + 1;
    snapshot();
    Core.ensureMeasures(doc, required);
    selection.clear();
    clipboard.events.forEach((item, index) => {
      const position = positions[index];
      const part = Core.findPart(doc, activePartId);
      insertModelEvent(part, { ...Core.clone(item.event), id: Core.uid(item.event.type), measure: position.measure, tick: Math.round(position.tick) })
        .forEach(inserted => selection.add(inserted.id));
    });
    selectionAnchor = [...selection].at(-1) || null;
    measureSelection = null;
    changed();
  }

  function pasteSelection() {
    if (clipboard.type === "measures") pasteMeasureClipboard();
    else if (clipboard.type === "events") pasteEventClipboard();
  }

  function updateClipboardSelection(index, extend) {
    if (!extend) clipboardSelection.clear();
    if (extend && clipboardSelectionAnchor !== null) {
      for (let item = Math.min(index, clipboardSelectionAnchor); item <= Math.max(index, clipboardSelectionAnchor); item += 1) clipboardSelection.add(item);
    } else if (clipboardSelection.has(index)) clipboardSelection.delete(index);
    else clipboardSelection.add(index);
    clipboardSelectionAnchor = index;
    renderInspector();
  }

  function editClipboard(action) {
    if (action === "clear") {
      clipboard = { type: null, events: [], measures: [] };
    } else if (action === "delete" && clipboardSelection.size) {
      clipboard.events = clipboard.events.filter((_, index) => !clipboardSelection.has(index));
    }
    clipboardSelection.clear();
    clipboardSelectionAnchor = null;
    renderInspector();
  }

  function measureIndexAtClientX(clientX) {
    const cards = [...workspace.querySelectorAll("[data-score-measure-settings]")];
    const hit = cards.find(card => {
      const rect = card.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right;
    });
    if (hit) return Number(hit.dataset.scoreMeasureSettings);
    if (!cards.length) return 0;
    return clientX < cards[0].getBoundingClientRect().left ? 0 : doc.measures.length - 1;
  }

  function updateMeasureSelectionVisual() {
    workspace.querySelectorAll("[data-score-measure-settings]").forEach(card => {
      const index = Number(card.dataset.scoreMeasureSettings);
      card.classList.toggle("is-range-selected", Boolean(measureSelection && index >= measureSelection.start && index <= measureSelection.end));
    });
  }

  function beginMeasureSelection(event) {
    if (event.button !== 2) return;
    const card = event.target.closest("[data-score-measure-settings]");
    if (!card) return;
    const index = Number(card.dataset.scoreMeasureSettings);
    measureDrag = { pointerId: event.pointerId, anchor: index };
    measureSelection = { start: index, end: index };
    insertionBoundary = null;
    selection.clear();
    updateMeasureSelectionVisual();
    renderInspector();
    workspace.querySelector("[data-score-viewport]")?.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function moveMeasureSelection(event) {
    if (!measureDrag || measureDrag.pointerId !== event.pointerId) return;
    const index = measureIndexAtClientX(event.clientX);
    measureSelection = { start: Math.min(measureDrag.anchor, index), end: Math.max(measureDrag.anchor, index) };
    updateMeasureSelectionVisual();
    event.preventDefault();
  }

  function endMeasureSelection(event) {
    if (!measureDrag || measureDrag.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    measureDrag = null;
    renderInspector();
    event.preventDefault();
  }

  function beginBoxSelection(event) {
    if (![0, 2].includes(event.button) || event.target.closest("button,input,select") || event.target.closest("[data-score-measure-strip]")) return;
    const viewport = workspace.querySelector("[data-score-viewport]");
    if (event.button === 0 && event.target.closest("[data-score-playhead]")) return beginScorePlayheadDrag(event);
    const rect = viewport.getBoundingClientRect();
    if (event.button === 2) {
      event.preventDefault();
      dragSelect = { kind: "box", button: 2, startX: event.clientX - rect.left + viewport.scrollLeft, startY: event.clientY - rect.top + viewport.scrollTop, x: 0, y: 0, rect: null };
      dragSelect.rect = document.createElement("div");
      dragSelect.rect.className = "qscore-segment";
      viewport.append(dragSelect.rect);
      viewport.setPointerCapture(event.pointerId);
      return;
    }
    const eventNode = event.target.closest("[data-event-id]");
    const renderRect = workspace.querySelector("[data-score-render]").getBoundingClientRect();
    const zoom = Number(doc.settings.page.zoom) || 1;
    const renderX = (event.clientX - renderRect.left) / zoom;
    const renderY = (event.clientY - renderRect.top) / zoom;
    const tabBox = renderBoxes.filter(box => box.kind === "tab").find(box => renderX >= box.x && renderX <= box.x + box.width && renderY >= box.y && renderY <= box.y + box.height);
    if (tabBox) return;
    const eventBox = renderBoxes.filter(box => box.kind === "event").find(box => renderX >= box.x - 8 && renderX <= box.x + box.width + 8 && renderY >= box.y - 8 && renderY <= box.y + box.height + 8);
    const eventId = eventNode?.dataset.eventId || eventBox?.eventId;
    if (eventId) {
      const pitchIndex = eventBox?.hitPoints?.length > 1
        ? eventBox.hitPoints.reduce((best, point, index) => Math.abs(point.y - renderY) < best.distance ? { index, distance: Math.abs(point.y - renderY) } : best, { index: 0, distance: Infinity }).index
        : 0;
      selectEvent(eventId, event.shiftKey, pitchIndex);
      dragSelect = { kind: "event", eventId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY };
      viewport.setPointerCapture(event.pointerId);
      return;
    }
    dragSelect = { kind: "box", startX: event.clientX - rect.left + viewport.scrollLeft, startY: event.clientY - rect.top + viewport.scrollTop, x: 0, y: 0, rect: null };
    dragSelect.rect = document.createElement("div");
    dragSelect.rect.className = "qscore-segment";
    viewport.append(dragSelect.rect);
    viewport.setPointerCapture(event.pointerId);
  }

  function moveBoxSelection(event) {
    if (moveScorePlayheadDrag(event)) return;
    if (!dragSelect) return;
    if (dragSelect.kind === "event") {
      dragSelect.x = event.clientX;
      dragSelect.y = event.clientY;
      workspace.classList.toggle("is-dragging-event", Math.hypot(dragSelect.x - dragSelect.startX, dragSelect.y - dragSelect.startY) > 5);
      return;
    }
    const viewport = workspace.querySelector("[data-score-viewport]");
    const rect = viewport.getBoundingClientRect();
    dragSelect.x = event.clientX - rect.left + viewport.scrollLeft;
    dragSelect.y = event.clientY - rect.top + viewport.scrollTop;
    Object.assign(dragSelect.rect.style, { left: `${Math.min(dragSelect.startX, dragSelect.x)}px`, top: `${Math.min(dragSelect.startY, dragSelect.y)}px`, width: `${Math.abs(dragSelect.x - dragSelect.startX)}px`, height: `${Math.abs(dragSelect.y - dragSelect.startY)}px` });
  }

  function quantizedTickAtX(x, box) {
    const size = Core.measureTicks(doc.measures[box.measure].time);
    const grid = Math.max(1, Core.quantizeStep(doc.settings.quantize));
    const relative = Math.max(0, Math.min(0.999999, (x - box.noteX) / box.noteWidth));
    return Math.max(0, Math.min(size - 1, Math.round(relative * size / grid) * grid));
  }

  function endBoxSelection(event) {
    if (endScorePlayheadDrag(event)) return;
    if (!dragSelect) return;
    const viewport = workspace.querySelector("[data-score-viewport]");
    viewport.releasePointerCapture?.(event.pointerId);
    if (dragSelect.kind === "event") {
      const drag = dragSelect;
      dragSelect = null;
      workspace.classList.remove("is-dragging-event");
      if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) <= 5) return;
      const renderRect = workspace.querySelector("[data-score-render]").getBoundingClientRect();
      const zoom = Number(doc.settings.page.zoom) || 1;
      const x = (event.clientX - renderRect.left) / zoom;
      const y = (event.clientY - renderRect.top) / zoom;
      const box = renderBoxes.filter(item => item.kind === "measure").find(item => x >= item.x && x <= item.x + item.width && y >= item.y - 10 && y <= item.y + item.height + 10);
      const found = Core.findEvent(doc, drag.eventId);
      if (!box || !found) return;
      snapshot();
      found.event.measure = box.measure;
      found.event.staff = box.staff;
      found.event.tick = quantizedTickAtX(x, box);
      Core.sortEvents(found.part);
      cursor = { measure: found.event.measure, tick: found.event.tick, staff: found.event.staff, voice: found.event.voice };
      changed();
      return;
    }
    const pageRect = workspace.querySelector("[data-score-page]").getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const x1 = Math.min(dragSelect.startX, dragSelect.x) - (pageRect.left - viewportRect.left + viewport.scrollLeft);
    const y1 = Math.min(dragSelect.startY, dragSelect.y) - (pageRect.top - viewportRect.top + viewport.scrollTop);
    const x2 = Math.max(dragSelect.startX, dragSelect.x) - (pageRect.left - viewportRect.left + viewport.scrollLeft);
    const y2 = Math.max(dragSelect.startY, dragSelect.y) - (pageRect.top - viewportRect.top + viewport.scrollTop);
    dragSelect.rect.remove(); dragSelect = null;
    selection.clear();
    renderBoxes.filter(box => box.kind === "event" && box.hitPoints?.some(point => point.x >= x1 && point.x <= x2 && point.y >= y1 && point.y <= y2)).forEach(box => selection.add(box.eventId));
    renderInspector(); scheduleRender();
  }

  function clickScoreAt(event) {
    const render = workspace.querySelector("[data-score-render]");
    const rect = render.getBoundingClientRect();
    const zoom = Number(doc.settings.page.zoom) || 1;
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;
    const tabBox = renderBoxes.filter(box => box.kind === "tab").find(box => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height);
    if (tabBox) {
      const point = tabBox.hitPoints[0];
      selectEvent(tabBox.eventId, false, tabBox.pitchIndex);
      if (y < point.y - 2) moveSelectedTabPitch(1);
      else if (y > point.y + 2) moveSelectedTabPitch(-1);
      return;
    }
    const eventBox = renderBoxes.filter(box => box.kind === "event").find(box => x >= box.x - 8 && x <= box.x + box.width + 8 && y >= box.y - 8 && y <= box.y + box.height + 8);
    if (eventBox && !entry.rest) {
      const pitchIndex = eventBox.hitPoints?.length > 1
        ? eventBox.hitPoints.reduce((best, point, index) => Math.abs(point.y - y) < best.distance ? { index, distance: Math.abs(point.y - y) } : best, { index: 0, distance: Infinity }).index
        : 0;
      return selectEvent(eventBox.eventId, event.shiftKey, pitchIndex);
    }
    const measureBox = renderBoxes.filter(box => box.kind === "measure").find(box => x >= box.x && x <= box.x + box.width && y >= box.y - 10 && y <= box.y + box.height + 10);
    if (!measureBox) return;
    setPlayheadSelected(false);
    selectedTabPitch = null;
    selectInputPart(measureBox.partId);
    cursor.measure = measureBox.measure; cursor.staff = measureBox.staff;
    cursor.tick = quantizedTickAtX(x, measureBox);
    if (entry.rest) insertRestAtCursor({ measure: cursor.measure, tick: cursor.tick, staff: cursor.staff, voice: cursor.voice });
    else {
      const clefCenter = measureBox.staff ? 48 : 71;
      const diatonic = Math.round((measureBox.y + clefCenter - y) / 5);
      const baseMidi = measureBox.staff ? 50 : 71;
      const scale = [0, 2, 4, 5, 7, 9, 11];
      const octave = Math.floor(diatonic / 7), degree = ((diatonic % 7) + 7) % 7;
      insertAtCursor([{ midi: baseMidi + octave * 12 + scale[degree] }]);
    }
  }

  function inspectorValue(path) {
    const control = workspace.querySelector(`[data-inspector="${CSS.escape(path)}"]`);
    return control?.type === "checkbox" ? control.checked : control?.value;
  }

  function applyInspector() {
    const selectedRefs = inspectorEventRefs();
    const next = Core.clone(doc);
    const nextSelection = new Set();
    try {
      next.title = inspectorValue("doc.title") || next.title;
      next.composer = inspectorValue("doc.composer") || "";
      next.lyricist = inspectorValue("doc.lyricist") || "";
      next.settings.page.size = ["A4", "Letter", "Legal"].includes(inspectorValue("doc.pageSize")) ? inspectorValue("doc.pageSize") : "A4";
      next.settings.page.orientation = inspectorValue("doc.orientation") === "landscape" ? "landscape" : "portrait";
      const count = Math.max(1, Math.min(Core.MAX_MEASURES, Number(inspectorValue("doc.measureCount")) || next.measures.length));
      if (count > next.measures.length) Core.ensureMeasures(next, count);
      else if (count < next.measures.length) {
        next.measures.splice(count);
        next.parts.forEach(item => { item.events = item.events.filter(event => event.measure < count); });
        next.directions = next.directions.filter(item => item.measure < count);
      }
      next.settings.countInMeasures = Math.max(0, Math.min(8, Number(inspectorValue("doc.countIn")) || 0));
      const logicalGroup = selectedRefs.length > 1;
      for (const sourceRef of selectedRefs) {
        const found = Core.findEvent(next, sourceRef.event.id);
        if (!found) continue;
        const selected = found.event;
        selected.measure = Math.max(0, Math.min(Core.MAX_MEASURES - 1, Number(inspectorValue("event.measure")) - 1 || 0));
        Core.ensureMeasures(next, selected.measure + 1);
        selected.voice = Math.max(1, Math.min(4, Number(inspectorValue("event.voice")) || 1));
        if (!logicalGroup) selected.staff = Math.max(0, Math.min(1, Number(inspectorValue("event.staff")) - 1 || 0));
        selected.velocity = Math.max(1, Math.min(127, Number(inspectorValue("event.velocity")) || 92));
        selected.chordSymbol = inspectorValue("event.chordSymbol") || "";
        selected.text = inspectorValue("event.text") || "";
        selected.lyrics = String(inspectorValue("event.lyrics") || "").split("|").map((text, index) => ({ verse: index + 1, text: text.trim(), syllabic: "single", extend: false })).filter(item => item.text);
        if (Core.isTabPart(found.part)) {
          Core.normalizeTabPositions(selected, found.part);
          const pitchIndex = selectedTabPitch?.eventId === selected.id ? selectedTabPitch.pitchIndex : 0;
          const position = selected.tab.positions.find(item => item.pitchIndex === pitchIndex);
          if (position) {
            position.string = Math.max(1, Math.min(Core.tabTuning(found.part).length, Number(inspectorValue("event.tab.string")) || 1));
            position.fret = Math.max(-48, Math.min(72, Number(inspectorValue("event.tab.fret")) || 0));
          }
        }
        if (found.part.notationType === "percussion") selected.percussion = { ...(selected.percussion || {}), gm: Math.max(27, Math.min(87, Number(inspectorValue("event.percussion.gm")) || 38)) };
        const edited = selected.type === "note"
          ? Core.setNoteRhythm(next, found.part.id, selected.id, inspectorValue("event.rhythm"), Number(inspectorValue("event.dots")) || 0)
          : [selected];
        edited.forEach(event => nextSelection.add(event.id));
      }
      snapshot();
      doc = Core.normalizeDocument(next);
      selection = selectedRefs.length ? nextSelection : new Set([...selection].filter(id => Core.findEvent(doc, id)));
      if (playbackPosition.measure >= doc.measures.length) playbackPosition = { measure: doc.measures.length - 1, tick: 0 };
      changed();
    } catch (error) {
      toast(error instanceof RangeError ? t("rhythmEditFailed") : String(error?.message || error));
    }
  }

  function onWorkspaceClick(event) {
    const clipboardItem = event.target.closest("[data-score-clipboard-item]")?.dataset.scoreClipboardItem;
    if (clipboardItem !== undefined) { updateClipboardSelection(Number(clipboardItem), event.shiftKey); return; }
    const clipboardAction = event.target.closest("[data-score-clipboard-action]")?.dataset.scoreClipboardAction;
    if (clipboardAction) { editClipboard(clipboardAction); return; }
    const boundary = event.target.closest("[data-score-insert-boundary]")?.dataset.scoreInsertBoundary;
    if (boundary !== undefined) {
      insertionBoundary = Number(boundary);
      workspace.querySelectorAll("[data-score-insert-boundary]").forEach(item => item.classList.toggle("is-active", Number(item.dataset.scoreInsertBoundary) === insertionBoundary));
      return;
    }
    const action = event.target.closest("[data-score-action]")?.dataset.scoreAction;
    if (action) {
      const actions = {
        new: () => createNewScore(), open: () => workspace.querySelector("[data-score-file]").click(), save: exportJson,
        print: preparePrint, undo, redo, copy: copySelection, paste: pasteSelection, delete: deleteCommand, play: () => startPlayback({ selectionOnly: selection.size > 0 }),
        stop: stopAll, record: startRecording, close, "add-part": addPart, "sync-parts": syncParts, requantize,
        "restore-timing": restoreTiming, "batch-measures": showBatchMeasureDialog, "apply-inspector": applyInspector,
        "octave-down": () => transformSelectedPitches("octave-down"), "octave-up": () => transformSelectedPitches("octave-up"), "enharmonic": () => transformSelectedPitches("enharmonic"),
        "split-2": () => splitSelectedNotes(2), "split-3": () => splitSelectedNotes(3),
        "toggle-parts": () => toggleMobilePanel(".qscore-sidebar"), "toggle-inspector": () => toggleMobilePanel(".qscore-inspector")
      };
      actions[action]?.();
      return;
    }
    const exportMenu = event.target.closest("[data-score-menu='export']");
    if (exportMenu) return showExportDialog();
    const measureSettings = event.target.closest("[data-score-measure-settings]")?.dataset.scoreMeasureSettings;
    if (measureSettings !== undefined) return selectMeasure(Number(measureSettings));
    const duration = event.target.closest("[data-score-duration]")?.dataset.scoreDuration;
    if (duration) {
      entry.duration = duration; entry.tripletDuration = 0; entry.tuplet = 0; entry.tupletId = null; entry.tupletProgress = 0;
      renderEntryState(); return;
    }
    const tripletDuration = event.target.closest("[data-score-triplet-duration]")?.dataset.scoreTripletDuration;
    if (tripletDuration) {
      entry.duration = TRIPLET_DURATIONS[tripletDuration]; entry.tripletDuration = Number(tripletDuration); entry.tuplet = 3; entry.tupletId = null; entry.tupletProgress = 0;
      renderEntryState(); return;
    }
    const accidental = event.target.closest("[data-score-accidental]")?.dataset.scoreAccidental;
    if (accidental) { entry.accidental = accidental; renderEntryState(); return; }
    const toggle = event.target.closest("[data-score-toggle]")?.dataset.scoreToggle;
    if (toggle) { entry[toggle] = !entry[toggle]; renderEntryState(); return; }
    const dots = event.target.closest("[data-score-dots]")?.dataset.scoreDots;
    if (dots) { entry.dots = entry.dots === Number(dots) ? 0 : Number(dots); renderEntryState(); return; }
    const partId = event.target.closest("[data-score-select-part]")?.dataset.scoreSelectPart;
    if (partId) {
      if (inputPartId === partId) {
        inputPartId = null;
        activePartId = partId;
      } else selectInputPart(partId);
      selection.clear(); selectedTabPitch = null; setPlayheadSelected(false); measureSelection = null; insertionBoundary = null;
      workspace.querySelectorAll("[data-score-part]").forEach(row => row.classList.toggle("is-active", row.dataset.scorePart === inputPartId));
      renderInspector(); scheduleRender(); return;
    }
    const partSettings = event.target.closest("[data-score-part-settings]")?.dataset.scorePartSettings;
    if (partSettings) return showPartDialog(partSettings);
    for (const prop of ["solo", "mute", "visible"]) {
      const id = event.target.closest(`[data-score-part-${prop}]`)?.dataset[`scorePart${prop[0].toUpperCase()}${prop.slice(1)}`];
      if (id) { snapshot(); const part = Core.findPart(doc, id); part[prop] = !part[prop]; changed(); return; }
    }
    if (event.target.closest("[data-score-render]")) clickScoreAt(event);
  }

  function onWorkspaceDoubleClick(event) {
    const measureIndex = event.target.closest("[data-score-measure-settings]")?.dataset.scoreMeasureSettings;
    if (measureIndex !== undefined) {
      event.preventDefault();
      return showMeasureDialog(Number(measureIndex));
    }
    const partId = event.target.closest("[data-score-select-part]")?.dataset.scoreSelectPart;
    if (partId) {
      event.preventDefault();
      showPartDialog(partId);
    }
  }

  function selectMeasure(measureIndex) {
    const index = Math.max(0, Math.min(doc.measures.length - 1, Number(measureIndex) || 0));
    selection.clear();
    selectedTabPitch = null;
    setPlayheadSelected(false);
    measureSelection = null;
    seek({ measure: index, tick: 0 });
    const tempo = workspace.querySelector('[data-score-field="tempo"]');
    if (tempo) tempo.value = doc.measures[index].tempo;
  }

  function setCurrentMeasureKey(key, options = {}) {
    if (!doc || !openState) return false;
    const index = Math.max(0, Math.min(doc.measures.length - 1, contextMeasureIndex));
    const requestedFifths = Math.round(Number(key?.fifths) || 0);
    const fifths = Math.max(-14, Math.min(14, requestedFifths));
    const mode = key?.mode === "minor" ? "minor" : "major";
    const current = doc.measures[index].key || doc.settings.key;
    if (current.fifths === fifths && current.mode === mode) {
      if (options.fromHost && requestedFifths !== fifths) {
        syncedKeySignature = "";
        updateEditorContext();
      }
      return true;
    }
    snapshot();
    const next = { fifths, mode, tonic: Core.keyTonicFromFifths(fifths, mode) };
    doc.measures[index].key = next;
    if (index === 0) doc.settings.key = Core.clone(next);
    if (options.fromHost) syncedKeySignature = requestedFifths === fifths ? `${fifths}:${mode}` : "";
    changed();
    return true;
  }

  function onWorkspaceChange(event) {
    const fieldName = event.target.dataset.scoreField;
    if (fieldName === "tempo") {
      snapshot();
      currentMeasure().tempo = Math.max(20, Math.min(400, Number(event.target.value) || 120));
      if (cursor.measure === 0) doc.settings.tempo = currentMeasure().tempo;
      changed({ inspector: false });
    }
    if (fieldName === "quantize") { doc.settings.quantize = event.target.value; changed({ render: false, inspector: false }); }
    if (fieldName === "concertPitch") { doc.settings.concertPitch = event.target.checked; changed(); }
    if (fieldName === "zoom") { doc.settings.page.zoom = Number(event.target.value); changed(); }
    const entryName = event.target.dataset.scoreEntry;
    if (entryName) {
      entry[entryName] = entryName === "tuplet" ? Number(event.target.value) : event.target.value;
      if (entryName === "tuplet") { entry.tripletDuration = 0; entry.tupletId = null; entry.tupletProgress = 0; renderEntryState(); }
    }
    const cursorName = event.target.dataset.scoreCursor;
    if (cursorName) { cursor[cursorName] = Number(event.target.value); }
  }

  function onWorkspaceInput(event) {
    if (event.target.dataset.scoreField === "zoom") {
      doc.settings.page.zoom = Number(event.target.value);
      workspace.querySelector("[data-score-page]").style.setProperty("--qscore-zoom", doc.settings.page.zoom);
      updateTimelineWindow();
      updateMeasureRulers();
      updatePlayheadVisuals();
    }
  }

  function beginPartPointerDrag(event) {
    const handle = event.target.closest("[data-score-part-drag]");
    if (!handle || event.button !== 0) return;
    draggedPartId = handle.dataset.scorePartDrag;
    partPointerDrag = { pointerId: event.pointerId, startY: event.clientY, currentY: event.clientY };
    handle.closest(".qscore-part")?.classList.add("is-dragging");
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function partRowAtY(y) {
    return [...workspace.querySelectorAll("[data-score-part]")].find(row => {
      const rect = row.getBoundingClientRect();
      return y >= rect.top && y <= rect.bottom;
    }) || null;
  }

  function movePartPointerDrag(event) {
    if (!draggedPartId || partPointerDrag?.pointerId !== event.pointerId) return;
    partPointerDrag.currentY = event.clientY;
    const row = partRowAtY(event.clientY);
    if (!row || row.dataset.scorePart === draggedPartId) return;
    workspace.querySelectorAll(".qscore-part.is-drop-before,.qscore-part.is-drop-after").forEach(item => item.classList.remove("is-drop-before", "is-drop-after"));
    row.classList.add(event.clientY < row.getBoundingClientRect().top + row.offsetHeight / 2 ? "is-drop-before" : "is-drop-after");
    event.preventDefault();
  }

  function endPartPointerDrag(event) {
    if (!draggedPartId || partPointerDrag?.pointerId !== event.pointerId) return clearPartDrag();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const row = partRowAtY(event.clientY);
    if (!row || row.dataset.scorePart === draggedPartId) return clearPartDrag();
    event.preventDefault();
    const orderBefore = doc.parts.map(part => part.id).join("|");
    const moving = Core.findPart(doc, draggedPartId);
    const remaining = doc.parts.filter(part => part.id !== draggedPartId);
    const targetIndex = remaining.findIndex(part => part.id === row.dataset.scorePart);
    const after = event.clientY >= row.getBoundingClientRect().top + row.offsetHeight / 2;
    remaining.splice(Math.max(0, targetIndex + (after ? 1 : 0)), 0, moving);
    if (remaining.map(part => part.id).join("|") !== orderBefore) {
      snapshot();
      doc.parts = remaining;
      changed();
    }
    clearPartDrag();
  }

  function clearPartDrag() {
    draggedPartId = null;
    partPointerDrag = null;
    workspace?.querySelectorAll(".qscore-part.is-dragging,.qscore-part.is-drop-before,.qscore-part.is-drop-after").forEach(item => item.classList.remove("is-dragging", "is-drop-before", "is-drop-after"));
  }

  function onEditorKeyDown(event) {
    if (event.target.matches("input,select,textarea") || event.target.isContentEditable) return;
    if (consumeNavigationKey(event.code || event.key, { down: true })) { event.preventDefault(); event.stopPropagation(); return; }
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); }
    else if (modifier && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
    else if (modifier && event.key.toLowerCase() === "c") { event.preventDefault(); copySelection(); }
    else if (modifier && event.key.toLowerCase() === "v") { event.preventDefault(); pasteSelection(); }
    else if (event.key === "Delete") { event.preventDefault(); deleteCommand(); }
    else if (event.key === "Backspace" && selection.size) { event.preventDefault(); deleteSelection(); }
    else if (event.key === "Escape") { event.preventDefault(); if (playheadSelected) setPlayheadSelected(false); else stopAll(); }
  }

  function addPart() {
    snapshot();
    const part = Core.defaultPart({ name: `${t("part")} ${doc.parts.length + 1}`, instrumentId: "piano", notationType: "single", colorIndex: doc.parts.length % 12 });
    doc.parts.push(part); activePartId = part.id; inputPartId = part.id; changed();
  }

  function syncParts() {
    const { parts } = profileParts();
    snapshot();
    parts.forEach(source => {
      const current = doc.parts.find(part => part.sourceProfileId === source.sourceProfileId);
      if (current) {
        current.instrumentId = source.instrumentId; current.volume = source.volume; current.colorIndex = source.colorIndex; current.name = source.name; current.shortName = source.shortName;
        current.outputShift = source.outputShift; current.transposition = Core.clone(source.transposition);
        current.noteFadeSeconds = source.noteFadeSeconds; current.pedalDampingSeconds = source.pedalDampingSeconds;
      } else doc.parts.push(source);
    });
    activePartId ||= doc.parts[0]?.id;
    changed(); toast(t("synced"));
  }

  function undo() {
    const previous = history.undo(doc);
    if (!previous) return;
    doc = previous; activePartId = doc.parts.some(part => part.id === activePartId) ? activePartId : doc.parts[0]?.id; inputPartId = doc.parts.some(part => part.id === inputPartId) ? inputPartId : null; selection.clear(); measureSelection = null; insertionBoundary = null; layoutDirty = true; refreshAll(); scheduleAutosave();
  }

  function redo() {
    const next = history.redo(doc);
    if (!next) return;
    doc = next; activePartId = doc.parts.some(part => part.id === activePartId) ? activePartId : doc.parts[0]?.id; inputPartId = doc.parts.some(part => part.id === inputPartId) ? inputPartId : null; selection.clear(); measureSelection = null; insertionBoundary = null; layoutDirty = true; refreshAll(); scheduleAutosave();
  }

  function requantize() { snapshot(); Core.quantizeDocument(doc, doc.settings.quantize, { preserveRaw: true }); changed(); }
  function restoreTiming() { snapshot(); Core.restoreRawTiming(doc); changed(); }
  function toggleMobilePanel(selector) {
    const target = workspace.querySelector(selector);
    if (!target) return;
    const other = workspace.querySelector(selector === ".qscore-sidebar" ? ".qscore-inspector" : ".qscore-sidebar");
    if (other) other.hidden = true;
    target.hidden = !target.hidden;
  }

  function syncResponsivePanels() {
    if (!workspace || !openState) return;
    const compact = window.matchMedia("(max-width: 680px)").matches;
    const sidebar = workspace.querySelector(".qscore-sidebar");
    const inspector = workspace.querySelector(".qscore-inspector");
    if (!compact) {
      sidebar.hidden = false;
      inspector.hidden = false;
    } else if (!sidebar.hidden && !inspector.hidden) {
      sidebar.hidden = true;
      inspector.hidden = true;
    }
  }

  function appendScoreManual() {
    const manual = document.getElementById("manualBody");
    if (!manual) return;
    manual.querySelector("[data-score-manual]")?.remove();
    const section = document.createElement("section");
    section.className = "manual-guide score-manual-guide";
    section.dataset.scoreManual = "true";
    const groups = [
      ["manualContext", "manualContextItems"], ["manualRhythm", "manualRhythmItems"], ["manualSelection", "manualSelectionItems"],
      ["manualParts", "manualPartsItems"], ["manualPlayback", "manualPlaybackItems"], ["manualMeasures", "manualMeasuresItems"], ["manualOutput", "manualOutputItems"]
    ];
    section.innerHTML = `<details><summary>${esc(t("scoreManual"))}</summary><div class="manual-details-body"><p>${esc(t("scoreManualIntro"))}</p>${groups.map(([title, items]) => `<details><summary>${esc(t(title))}</summary><ul>${String(t(items)).split("|").map(item => `<li>${esc(item)}</li>`).join("")}</ul></details>`).join("")}<p>${esc(t("scoreManualStep"))}</p><p>${esc(t("scoreManualRecord"))}</p><p>${esc(t("scoreManualExport"))}</p></div></details>`;
    manual.append(section);
  }

  function download(data, name, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function safeName(extension) {
    return `${(doc.title || "qboard-score").replace(/[\\/:*?"<>|]+/g, "-")}.${extension}`;
  }

  function exportJson() { download(Core.projectJson(doc), safeName("qboard.json"), "application/json"); }
  function exportMusicXml() { download(Core.exportMusicXml(doc), safeName("musicxml"), "application/vnd.recordare.musicxml+xml"); }
  function exportMidi() { download(Core.exportMidi(doc), safeName("mid"), "audio/midi"); }

  function printSystems(maxWidth) {
    return PrintLayout.buildSystems(doc.measures, measureLayout, maxWidth / PRINT_MIN_SYSTEM_SCALE);
  }

  function removePrintRoot() {
    printRoot?.remove();
    printRoot = null;
  }

  function buildPrintRoot(systems, sourceSvg, options) {
    removePrintRoot();
    const { pageWidth, pageHeight, scoreWidth, sourceHeight, orientation, size, labelWidth } = options;
    printRoot = document.createElement("section");
    printRoot.className = "qscore-print-root";
    printRoot.setAttribute("aria-hidden", "true");
    printRoot.innerHTML = `<style>@page{size:${esc(size)} ${esc(orientation)};margin:12mm}</style>`;
    const visibleParts = doc.parts.filter(part => part.visible);
    const pages = PrintLayout.paginateSystems(systems, { pageHeight, scoreWidth, sourceHeight });
    const addPage = first => {
      const page = document.createElement("article");
      page.className = "qscore-print-page";
      page.style.width = `${pageWidth}px`;
      page.style.minHeight = `${pageHeight}px`;
      if (first) page.innerHTML = `<header><h1>${esc(doc.title || "Q-board Score")}</h1>${doc.composer ? `<p>${esc(doc.composer)}</p>` : ""}${doc.lyricist ? `<p>${esc(doc.lyricist)}</p>` : ""}</header>`;
      page.insertAdjacentHTML("beforeend", `<footer>${printRoot.querySelectorAll(".qscore-print-page").length + 1}</footer>`);
      printRoot.append(page);
      return page;
    };
    let systemIndex = 0;
    pages.forEach(pageData => {
      const page = addPage(pageData.first);
      pageData.systems.forEach(system => {
        const { scale, displayHeight } = system;
        const row = document.createElement("section");
        row.className = "qscore-print-system";
        row.style.gridTemplateColumns = `${labelWidth}px minmax(0, 1fr)`;
        row.style.setProperty("--qscore-print-scale", String(scale));
        row.style.height = `${displayHeight}px`;
        const labels = document.createElement("div");
        labels.className = "qscore-print-part-labels";
        labels.innerHTML = `<span style="height:${44 * scale}px"></span>${visibleParts.map(part => `<span style="height:${partTrackHeight(part) * scale}px"><strong>${esc(systemIndex ? part.shortName : part.name)}</strong>${systemIndex ? "" : `<small>${esc(part.shortName)}</small>`}</span>`).join("")}`;
        const frame = document.createElement("div");
        frame.className = "qscore-print-svg-frame";
        frame.style.width = `${Math.ceil(system.width * scale)}px`;
        frame.style.height = `${Math.ceil(sourceHeight * scale)}px`;
        const clone = sourceSvg.cloneNode(true);
        clone.querySelectorAll(".qscore-selection-layer").forEach(node => node.remove());
        clone.removeAttribute("width");
        clone.removeAttribute("height");
        clone.setAttribute("viewBox", `${Math.max(0, system.startX - 1)} 0 ${system.width + 2} ${sourceHeight}`);
        clone.setAttribute("preserveAspectRatio", "xMinYMin meet");
        clone.style.width = "100%";
        clone.style.height = "100%";
        frame.append(clone);
        row.append(labels, frame);
        page.insertBefore(row, page.lastElementChild);
        systemIndex += 1;
      });
    });
    document.body.append(printRoot);
    return printRoot;
  }

  function preparePrint(invokeDialog = true) {
    if (!doc || !workspace || !VF?.Renderer) return false;
    stopPlayback({ keepPosition: true, nextState: transportState === "paused" ? "paused" : "stopped" });
    const { orientation, size, pageWidth, pageHeight, labelWidth, scoreWidth } = PrintLayout.paperMetrics(doc.settings.page);
    printMode = true;
    printSystemStarts = new Set();
    layoutDirty = true;
    calculateMeasureLayout();
    let systems = printSystems(scoreWidth);
    for (let pass = 0; pass < 2; pass += 1) {
      printSystemStarts = new Set(systems.map(system => system.first));
      measureWidthCache.clear();
      layoutDirty = true;
      calculateMeasureLayout();
      systems = printSystems(scoreWidth);
    }
    printSystemStarts = new Set(systems.map(system => system.first));
    measureWidthCache.clear();
    layoutDirty = true;
    renderScore();
    const sourceSvg = workspace.querySelector("[data-score-render] svg");
    const sourceHeight = 64 + doc.parts.reduce((sum, part) => sum + partTrackHeight(part), 0);
    if (!sourceSvg) {
      printMode = false;
      printSystemStarts.clear();
      return false;
    }
    buildPrintRoot(systems, sourceSvg, { pageWidth, pageHeight, scoreWidth, sourceHeight, orientation, size, labelWidth });
    printMode = false;
    printSystemStarts.clear();
    measureWidthCache.clear();
    layoutDirty = true;
    renderScore();
    if (invokeDialog) window.setTimeout(() => window.print(), 40);
    return true;
  }

  function closeDialogButton() {
    return `<button type="button" data-dialog-close aria-label="${esc(t("close"))}">${icon("close")}</button>`;
  }

  function showPartDialog(partId) {
    const part = Core.findPart(doc, partId);
    if (!part) return;
    selectInputPart(part.id);
    renderPartList();
    const snapshotData = host?.snapshotProfiles?.() || {};
    const sourceItems = [
      { id: "", label: t("manual"), type: "manual" },
      ...(snapshotData.profiles || []).map(item => ({ id: item.id, label: item.label || item.name || item.id, type: item.source || "keyboard" })),
      ...(snapshotData.basses || []).map(item => ({ id: item.id, label: item.label || item.name || item.id, type: "bass" }))
    ];
    if (part.sourceProfileId && !sourceItems.some(item => item.id === part.sourceProfileId)) sourceItems.push({ id: part.sourceProfileId, label: part.sourceProfileId, type: part.sourceType });
    const dialog = workspace.querySelector("[data-score-dialog]");
    dialog.innerHTML = `<div class="qscore-dialog-head"><strong>${esc(t("partSettings"))} · ${esc(part.name)}</strong>${closeDialogButton()}</div>
      <div class="qscore-dialog-body">
        ${field(t("partName"), "partDialog.name", part.name)}
        <label><span>${esc(t("instrument"))}</span><select data-dialog-part="instrumentId">${instrumentOptions().map(option => `<option value="${esc(option.id || option.value)}" ${(option.id || option.value) === part.instrumentId ? "selected" : ""}>${esc(option.label || option.name || option.id)}</option>`).join("")}</select></label>
        <label><span>${esc(t("notation"))}</span><select data-dialog-part="notationType">${[["single", t("single")], ["grand", t("grand")], ["guitar", t("guitar")], ["bass", t("bassTab")], ["percussion", t("percussion")]].map(([value, label]) => `<option value="${value}" ${value === part.notationType ? "selected" : ""}>${esc(label)}</option>`).join("")}</select></label>
        <label><span>${esc(t("sourceBinding"))}</span><select data-dialog-part="sourceProfileId">${sourceItems.map(item => `<option value="${esc(item.id)}" data-source-type="${esc(item.type)}" ${item.id === (part.sourceProfileId || "") ? "selected" : ""}>${esc(item.label)}</option>`).join("")}</select></label>
        ${field(t("splitPitch"), "partDialog.splitMidi", part.splitMidi, "number", 'min="24" max="96"')}
        <label data-dialog-grand-input ${part.notationType === "grand" ? "" : "hidden"}><span>${esc(t("grandInputMode"))}</span><select data-dialog-part="grandInputMode"><option value="unified" ${part.grandInputMode !== "split" ? "selected" : ""}>${esc(t("unifiedGrandInput"))}</option><option value="split" ${part.grandInputMode === "split" ? "selected" : ""}>${esc(t("splitGrandInput"))}</option></select></label>
        ${field(t("transposition"), "partDialog.transposition", part.transposition.chromatic, "number", 'min="-24" max="24"')}
        ${field(t("transpositionOctave"), "partDialog.transpositionOctave", part.transposition.octave || 0, "number", 'min="-4" max="4"')}
        ${field(t("outputShift"), "partDialog.outputShift", part.outputShift || 0, "number", 'min="-48" max="48"')}
        <label><span>${esc(t("staff"))}</span><select data-dialog-part="clef"><option value="treble" ${part.clefs[0] === "treble" ? "selected" : ""}>${esc(t("treble"))}</option><option value="bass" ${part.clefs[0] === "bass" ? "selected" : ""}>${esc(t("bass"))}</option><option value="alto" ${part.clefs[0] === "alto" ? "selected" : ""}>Alto</option><option value="tenor" ${part.clefs[0] === "tenor" ? "selected" : ""}>Tenor</option></select></label>
        ${field(t("volume"), "partDialog.volume", part.volume, "range", 'min="0" max="1" step="0.01"')}
        ${field(t("noteFade"), "partDialog.noteFadeSeconds", part.noteFadeSeconds, "range", 'min="0" max="3" step="0.05"')}
        ${field(t("pedalDamping"), "partDialog.pedalDampingSeconds", part.pedalDampingSeconds, "range", 'min="0.1" max="20" step="0.1"')}
        ${field(t("staffLines"), "partDialog.staffLines", part.staffLines, "number", 'min="1" max="5"')}
        ${field(t("tuning"), "partDialog.tuning", part.tuning.join(","))}
      </div>
      <div class="qscore-dialog-actions"><button type="button" class="qscore-command" data-dialog-clear-part ${part.events.length ? "" : "disabled"}>${esc(t("clearPart"))}</button><button type="button" class="qscore-command qscore-danger" data-dialog-delete-part>${esc(t("deletePart"))}</button><span class="qscore-toolbar-grow"></span><button type="button" class="qscore-command" data-dialog-close>${esc(t("cancel"))}</button><button type="button" class="qscore-command is-active" data-dialog-apply>${esc(t("confirm"))}</button></div>`;
    const value = name => dialog.querySelector(`[data-inspector="partDialog.${name}"], [data-dialog-part="${name}"]`);
    dialog.onclick = event => {
      if (event.target.closest("[data-dialog-close]")) return dialog.close();
      if (event.target.closest("[data-dialog-clear-part]")) {
        if (!part.events.length || !window.confirm(t("clearPartConfirm"))) return;
        snapshot();
        stopPlayback({ keepPosition: true });
        part.events = [];
        selection.clear();
        selectionAnchor = null;
        selectedTabPitch = null;
        dialog.close();
        changed();
        toast(t("partCleared"));
        return;
      }
      if (event.target.closest("[data-dialog-delete-part]")) {
        if (doc.parts.length <= 1) { toast(t("atLeastOnePart")); return; }
        if (part.events.length && !window.confirm(t("deletePartConfirm"))) return;
        snapshot();
        stopPlayback({ keepPosition: true });
        const index = doc.parts.findIndex(item => item.id === part.id);
        doc.parts.splice(index, 1);
        selection.clear();
        selectionAnchor = null;
        activePartId = doc.parts[Math.min(index, doc.parts.length - 1)].id;
        inputPartId = null;
        dialog.close();
        changed();
        return;
      }
      if (!event.target.closest("[data-dialog-apply]")) return;
      snapshot();
      part.name = value("name").value.trim() || part.name;
      part.shortName = part.name.slice(0, 8);
      part.instrumentId = value("instrumentId").value || part.instrumentId;
      const previousNotationType = part.notationType;
      part.notationType = value("notationType").value;
      part.splitMidi = Math.max(24, Math.min(96, Number(value("splitMidi").value) || 60));
      part.grandInputMode = value("grandInputMode")?.value === "split" ? "split" : "unified";
      part.transposition.chromatic = Math.max(-24, Math.min(24, Number(value("transposition").value) || 0));
      part.transposition.octave = Math.max(-4, Math.min(4, Number(value("transpositionOctave").value) || 0));
      part.outputShift = Math.max(-48, Math.min(48, Number(value("outputShift").value) || 0));
      part.volume = Math.max(0, Math.min(1, Number(value("volume").value) || 0));
      part.noteFadeSeconds = Math.max(0, Math.min(3, Number(value("noteFadeSeconds").value) || 0));
      part.pedalDampingSeconds = Math.max(0.1, Math.min(20, Number(value("pedalDampingSeconds").value) || 10));
      part.staffLines = Math.max(1, Math.min(5, Number(value("staffLines").value) || 5));
      part.tuning = String(value("tuning").value || "40,45,50,55,59,64").split(",").map(Number).filter(Number.isFinite).slice(0, 12);
      if (part.notationType !== previousNotationType && Core.isTabPart(part)) part.tuning = [...Core.TAB_TUNINGS[part.notationType]];
      const clef = value("clef").value || "treble";
      part.clefs = part.notationType === "grand" ? [clef, "bass"] : part.notationType === "guitar" ? [clef, "tab"] : part.notationType === "bass" ? ["bass", "tab"] : part.notationType === "percussion" ? ["percussion"] : [clef];
      const source = value("sourceProfileId");
      part.sourceProfileId = source.value || null;
      part.sourceType = source.selectedOptions[0]?.dataset.sourceType || "manual";
      dialog.close();
      changed();
    };
    value("notationType").addEventListener("change", () => {
      dialog.querySelector("[data-dialog-grand-input]").hidden = value("notationType").value !== "grand";
    });
    dialog.showModal();
  }

  function showMeasureDialog(measureIndex) {
    const measure = doc.measures[measureIndex];
    if (!measure) return;
    cursor.measure = measureIndex;
    const dialog = workspace.querySelector("[data-score-dialog]");
    dialog.innerHTML = `<div class="qscore-dialog-head"><strong>${esc(t("measureSettings"))} · ${measureIndex + 1}</strong>${closeDialogButton()}</div>
      <div class="qscore-dialog-body">
        ${field(t("key"), "dialog.key", measure.key.fifths, "number", 'min="-14" max="14"')}
        <label><span>${esc(t("mode"))}</span><select data-dialog-field="mode"><option value="major" ${measure.key.mode === "major" ? "selected" : ""}>${esc(t("major"))}</option><option value="minor" ${measure.key.mode === "minor" ? "selected" : ""}>${esc(t("minor"))}</option></select></label>
        ${field(t("beats"), "dialog.beats", measure.time.beats, "number", 'min="1" max="32"')}
        ${field(t("beatType"), "dialog.beatType", measure.time.beatType, "number", 'min="1" max="64"')}
        ${field(t("tempo"), "dialog.tempo", measure.tempo, "number", 'min="20" max="400"')}
        ${field(t("pickup"), "dialog.pickup", measure.pickupTicks || 0, "number", `min="0" max="${Core.measureTicks(measure.time)}"`)}
        ${field(t("rest"), "dialog.multipleRest", measure.multipleRest || 0, "number", `min="0" max="${Core.MAX_MEASURES}"`)}
        <div class="qscore-checks is-wide">
          <label><input type="checkbox" data-dialog-field="repeatStart" ${measure.repeatStart ? "checked" : ""}> ${esc(t("repeatStart"))}</label>
          <label><input type="checkbox" data-dialog-field="repeatEnd" ${measure.repeatEnd ? "checked" : ""}> ${esc(t("repeatEnd"))}</label>
          <label><input type="checkbox" data-dialog-field="systemBreak" ${measure.systemBreak ? "checked" : ""}> ${esc(t("systemBreak"))}</label>
          <label><input type="checkbox" data-dialog-field="pageBreak" ${measure.pageBreak ? "checked" : ""}> ${esc(t("pageBreak"))}</label>
        </div>
        <label class="is-wide"><span>${esc(t("applyScope"))}</span><select data-dialog-scope><option value="one">${esc(t("onlyMeasure"))}</option><option value="through">${esc(t("throughMeasure"))}</option><option value="following">${esc(t("followingMeasures"))}</option></select></label>
        <label class="is-wide" data-dialog-through hidden><span>${esc(t("toMeasure"))}</span><input type="number" min="${measureIndex + 1}" max="${doc.measures.length}" value="${doc.measures.length}" data-dialog-through-value></label>
      </div>
      <div class="qscore-dialog-actions"><button type="button" class="qscore-command" data-dialog-close>${esc(t("cancel"))}</button><button type="button" class="qscore-command is-active" data-dialog-apply>${esc(t("confirm"))}</button></div>`;
    const value = name => dialog.querySelector(`[data-inspector="dialog.${name}"], [data-dialog-field="${name}"]`);
    dialog.onchange = event => {
      if (event.target.matches("[data-dialog-scope]")) dialog.querySelector("[data-dialog-through]").hidden = event.target.value !== "through";
    };
    dialog.onclick = event => {
      if (event.target.closest("[data-dialog-close]")) return dialog.close();
      if (!event.target.closest("[data-dialog-apply]")) return;
      const mode = value("mode").value;
      const fifths = Math.max(-14, Math.min(14, Number(value("key").value) || 0));
      const next = {
        key: { fifths, mode, tonic: keyTonicFromFifths(fifths, mode) },
        time: { beats: Math.max(1, Math.min(32, Number(value("beats").value) || 4)), beatType: Math.max(1, Math.min(64, Number(value("beatType").value) || 4)) },
        tempo: Math.max(20, Math.min(400, Number(value("tempo").value) || 120)),
        pickupTicks: Math.max(0, Number(value("pickup").value) || 0),
        multipleRest: Math.max(0, Math.min(Core.MAX_MEASURES, Number(value("multipleRest").value) || 0)),
        repeatStart: Boolean(value("repeatStart").checked), repeatEnd: Boolean(value("repeatEnd").checked),
        systemBreak: Boolean(value("systemBreak").checked), pageBreak: Boolean(value("pageBreak").checked)
      };
      const changedFields = Object.keys(next).filter(name => JSON.stringify(next[name]) !== JSON.stringify(measure[name]));
      if (!changedFields.length) return dialog.close();
      const scope = dialog.querySelector("[data-dialog-scope]").value;
      const last = scope === "following" ? doc.measures.length - 1 : scope === "through"
        ? Math.max(measureIndex, Math.min(doc.measures.length - 1, Number(dialog.querySelector("[data-dialog-through-value]").value) - 1 || measureIndex))
        : measureIndex;
      snapshot();
      for (let index = measureIndex; index <= last; index += 1) changedFields.forEach(name => { doc.measures[index][name] = Core.clone(next[name]); });
      doc.settings.key = Core.clone(doc.measures[0].key);
      doc.settings.time = Core.clone(doc.measures[0].time);
      doc.settings.tempo = doc.measures[0].tempo;
      dialog.close();
      workspace.querySelector('[data-score-field="tempo"]').value = doc.measures[cursor.measure].tempo;
      changed();
    };
    dialog.showModal();
  }

  function showBatchMeasureDialog() {
    const dialog = workspace.querySelector("[data-score-dialog]");
    const measure = currentMeasure();
    dialog.innerHTML = `<div class="qscore-dialog-head"><strong>${esc(t("batchMeasures"))}</strong>${closeDialogButton()}</div>
      <div class="qscore-dialog-body">
        ${field(t("fromMeasure"), "batch.from", cursor.measure + 1, "number", `min="1" max="${doc.measures.length}"`)}
        ${field(t("toMeasure"), "batch.to", doc.measures.length, "number", `min="1" max="${doc.measures.length}"`)}
        <label class="qscore-batch-enable"><input type="checkbox" data-dialog-field="applyTime" checked> <span>${esc(t("applyTime"))}</span></label>
        <div class="qscore-inspector-grid">${field(t("beats"), "batch.beats", measure.time.beats, "number", 'min="1" max="32"')}${field(t("beatType"), "batch.beatType", measure.time.beatType, "number", 'min="1" max="64"')}</div>
        <label class="qscore-batch-enable"><input type="checkbox" data-dialog-field="applyTempo" checked> <span>${esc(t("applyTempo"))}</span></label>
        ${field(t("tempo"), "batch.tempo", measure.tempo, "number", 'min="20" max="400"')}
      </div>
      <div class="qscore-dialog-actions"><button type="button" class="qscore-command" data-dialog-close>${esc(t("cancel"))}</button><button type="button" class="qscore-command is-active" data-dialog-apply>${esc(t("confirm"))}</button></div>`;
    const value = name => dialog.querySelector(`[data-inspector="batch.${name}"], [data-dialog-field="${name}"]`);
    dialog.onclick = event => {
      if (event.target.closest("[data-dialog-close]")) return dialog.close();
      if (!event.target.closest("[data-dialog-apply]")) return;
      const first = Math.max(0, Math.min(doc.measures.length - 1, Number(value("from").value) - 1 || 0));
      const last = Math.max(first, Math.min(doc.measures.length - 1, Number(value("to").value) - 1 || first));
      const applyTime = value("applyTime").checked;
      const applyTempo = value("applyTempo").checked;
      const time = { beats: Math.max(1, Math.min(32, Number(value("beats").value) || 4)), beatType: Math.max(1, Math.min(64, Number(value("beatType").value) || 4)) };
      const tempo = Math.max(20, Math.min(400, Number(value("tempo").value) || 120));
      snapshot();
      for (let index = first; index <= last; index += 1) {
        if (applyTime) doc.measures[index].time = Core.clone(time);
        if (applyTempo) doc.measures[index].tempo = tempo;
      }
      if (first === 0) {
        if (applyTime) doc.settings.time = Core.clone(time);
        if (applyTempo) doc.settings.tempo = tempo;
      }
      dialog.close();
      workspace.querySelector('[data-score-field="tempo"]').value = currentMeasure().tempo;
      changed();
    };
    dialog.showModal();
  }

  function showExportDialog() {
    const dialog = workspace.querySelector("[data-score-dialog]");
    dialog.innerHTML = `<div class="qscore-dialog-head"><strong>${esc(t("export"))}</strong><button type="button" data-dialog-close>${icon("close")}</button></div><div class="qscore-dialog-body">
      ${button("dialog-json", t("jsonProject"), "save")}${button("dialog-xml", t("musicXml"))}${button("dialog-midi", t("midi"))}${button("dialog-print", t("print"), "print")}
    </div>`;
    dialog.onclick = event => {
      if (event.target.closest("[data-dialog-close]")) dialog.close();
      const action = event.target.closest("[data-score-action]")?.dataset.scoreAction;
      if (action === "dialog-json") exportJson();
      if (action === "dialog-xml") exportMusicXml();
      if (action === "dialog-midi") exportMidi();
      if (action === "dialog-print") preparePrint();
      if (action) dialog.close();
    };
    dialog.showModal();
  }

  function loadFileInput(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then(text => load(text)).catch(() => toast(t("invalidFile")));
    event.target.value = "";
  }

  function load(input) {
    try {
      const value = typeof input === "string" ? JSON.parse(input) : input;
      doc = Core.normalizeDocument(value);
      history = new Core.History(); activePartId = doc.parts[0]?.id || null; inputPartId = null; selection.clear(); clipboard = { type: null, events: [], measures: [] }; clipboardSelection.clear(); measureSelection = null; insertionBoundary = null; cursor = { measure: 0, tick: 0, staff: 0, voice: 1 };
      playbackPosition = { measure: 0, tick: 0 }; measureExtraWidths = new Map(); measureWidthCache = new Map(); layoutDirty = true;
      refreshAll(); scheduleAutosave(); toast(t("loaded")); return Core.clone(doc);
    } catch (error) {
      console.error(error); toast(t("invalidFile")); return null;
    }
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!root.indexedDB) return reject(new Error("IndexedDB unavailable"));
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function persistAutosave() {
    if (!doc) return;
    const value = Core.clone(doc);
    try {
      const db = await openDatabase();
      await new Promise((resolve, reject) => { const tx = db.transaction(DB_STORE, "readwrite"); tx.objectStore(DB_STORE).put(value, AUTOSAVE_KEY); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
      db.close();
    } catch (_) {
      try { localStorage.setItem("qboard-score-autosave", JSON.stringify(value)); } catch (_) { /* Storage may be blocked in local-file mode. */ }
    }
    setStatus(t("saved"));
  }

  function scheduleAutosave() {
    window.clearTimeout(dirtyTimer);
    dirtyTimer = window.setTimeout(persistAutosave, 700);
  }

  async function readAutosave() {
    try {
      const db = await openDatabase();
      const value = await new Promise((resolve, reject) => { const tx = db.transaction(DB_STORE, "readonly"); const request = tx.objectStore(DB_STORE).get(AUTOSAVE_KEY); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      db.close(); return value || null;
    } catch (_) {
      try { return JSON.parse(localStorage.getItem("qboard-score-autosave") || "null"); } catch (_) { return null; }
    }
  }

  async function open() {
    if (!workspace) makeWorkspace();
    const controls = document.getElementById("controls") || document.querySelector(".controls");
    const controlsRect = controls?.getBoundingClientRect();
    let storedRatio = 0;
    try { storedRatio = Number(localStorage.getItem("qboard-score-height-ratio")); } catch (_) { /* Use the shared panel-height default. */ }
    const settingsHeight = Number(controls?.dataset.settingsHeight) || controlsRect?.height || 0;
    const sharedHeightRatio = settingsHeight ? scoreRatioForHeight(settingsHeight) : 0.62;
    openState = true;
    document.querySelector(".app")?.classList.add("is-score-mode");
    workspace.hidden = false;
    const divider = document.getElementById("qscoreDivider");
    if (divider) divider.hidden = false;
    applyScoreHeightRatio(storedRatio || sharedHeightRatio);
    if (window.matchMedia("(max-width: 680px)").matches) {
      workspace.querySelector(".qscore-sidebar").hidden = true;
      workspace.querySelector(".qscore-inspector").hidden = true;
    } else {
      workspace.querySelector(".qscore-sidebar").hidden = false;
      workspace.querySelector(".qscore-inspector").hidden = false;
    }
    document.querySelectorAll(".menu-tab").forEach(tab => tab.classList.toggle("is-active", tab.id === "menuScore"));
    document.getElementById("menuScore")?.setAttribute("aria-selected", "true");
    if (!doc) {
      const saved = await readAutosave();
      if (saved) { load(saved); toast(t("autosaveFound")); }
      else createNewScore({ force: true });
    } else refreshAll();
    window.setTimeout(() => workspace.querySelector("[data-score-viewport]")?.focus({ preventScroll: true }), 0);
  }

  function close() {
    stopAll(); openState = false;
    document.querySelector(".app")?.classList.remove("is-score-mode");
    if (workspace) workspace.hidden = true;
    const divider = document.getElementById("qscoreDivider");
    if (divider) divider.hidden = true;
    document.getElementById("menuScore")?.classList.remove("is-active");
    document.getElementById("menuScore")?.setAttribute("aria-selected", "false");
    document.getElementById("menuSettings")?.click();
  }

  function stepInput(pitches, options = {}) {
    return insertAtCursor((Array.isArray(pitches) ? pitches : [pitches]).map(pitch => typeof pitch === "number" ? { midi: pitch } : pitch), options);
  }

  function init(options = {}) {
    host = options.host || root.QBoardScoreHost || {};
    makeWorkspace();
    document.addEventListener("qboard:note-on", onQBoardNoteOn);
    document.addEventListener("qboard:note-off", onQBoardNoteOff);
    document.addEventListener("qboard:pedal", onQBoardPedal);
    document.addEventListener("qboard:bass-chord", onBassChord);
    document.addEventListener("qboard:language-change", () => { if (workspace) makeWorkspace(); if (doc) refreshAll(); syncResponsivePanels(); appendScoreManual(); });
    window.addEventListener("resize", syncResponsivePanels);
    window.addEventListener("beforeprint", () => {
      if (!openState || !doc) return;
      if (!printRoot) preparePrint(false);
    });
    window.addEventListener("afterprint", () => {
      printMode = false;
      printSystemStarts.clear();
      removePrintRoot();
      renderScore();
    });
    document.getElementById("menuScore")?.addEventListener("click", event => { event.preventDefault(); open(); });
    appendScoreManual();
    return api;
  }

  const api = {
    init, open, close, isOpen: () => openState, newScore: () => createNewScore({ force: true }),
    startRecording, stopRecording, stepInput, syncProfiles: syncParts, save: async () => { await persistAutosave(); return Core.clone(doc); }, load,
    exportJson, exportMusicXML: exportMusicXml, exportMidi, getDocument: () => Core.clone(doc), render: renderScore,
    seek, play: options => startPlayback(options || {}), pause: pausePlayback, stop: () => stopPlayback({ keepPosition: true }),
    getTransportState: () => transportState, getPlaybackPosition: () => ({ ...playbackPosition }),
    consumeNavigationKey, setCurrentMeasureKey, getEditorContext: () => ({ eventId: contextEventId, measure: contextMeasureIndex, playheadSelected }),
    _test: { routePart, onQBoardNoteOn, onQBoardNoteOff, onBassChord, flushStepGroup, positionFromAbsoluteMs, absoluteMsForPosition }
  };

  root.QBoardScore = api;
  if (typeof window !== "undefined") window.QBoardScore = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
