const STORAGE_KEY = "screw-layout-state-v1";
const DEFAULT_LINE_NAME = "A线";
const DEFAULT_PROJECT_NAME = "广俊螺杆库";
const DEFAULT_LINE_LENGTH = 660;
const DEFAULT_HEAD_LENGTH = 60;
const SLEEVE_COUNT = 12;
const LEAD_SLEEVE_LENGTH = 30;
const DEFAULT_LEAD_SLEEVE_NAME = "Zwischenflansch";
const DEFAULT_INSERT_ANIMATION_MS = 500;
const DEFAULT_DELETE_ANIMATION_STYLE = "collapse";
const DRAG_THRESHOLD = 6;
const SLOT_BASE_MM = 60;
const DEFAULT_LENGTH_SCALE = 40;
const PRINT_TARGET_BODY_WIDTH = 1400;
const LENGTH_TOLERANCE_MM = 0.0001;
const FIT_WIDTH_TOLERANCE_PX = 0.51;
const DEFAULT_PRINT_OPTIONS = {
    currentLayout: true,
    blockCount: true,
    screwLength: true
};
const BACKUP_FILE_KIND = "screw-layout-backup";
const BACKUP_FILE_VERSION = 1;

let uidCounter = 0;

function nextId(prefix = "id") {
    uidCounter += 1;
    return `${prefix}-${Date.now()}-${uidCounter}`;
}

function createDefaultSleeves() {
    return Array.from({ length: SLEEVE_COUNT }, (_, index) => `套筒 ${index + 1}`);
}

function normalizeLeadSleeveName(name) {
    const value = typeof name === "string" ? name.trim() : "";
    return value || DEFAULT_LEAD_SLEEVE_NAME;
}

function normalizeSleeves(sleeves) {
    const nextSleeves = Array.isArray(sleeves) ? sleeves.slice(0, SLEEVE_COUNT) : [];
    while (nextSleeves.length < SLEEVE_COUNT) {
        nextSleeves.push(`套筒 ${nextSleeves.length + 1}`);
    }
    return nextSleeves.map((item, index) => {
        const value = typeof item === "string" ? item.trim() : "";
        return value || `套筒 ${index + 1}`;
    });
}

function normalizeExhaustChannels(channels) {
    const nextChannels = Array.isArray(channels) ? channels.slice(0, SLEEVE_COUNT) : [];
    while (nextChannels.length < SLEEVE_COUNT) {
        nextChannels.push(false);
    }
    return nextChannels.map((item) => Boolean(item));
}

function normalizeHistoryRecord(record) {
    if (!record || typeof record !== "object") {
        return null;
    }
    return {
        id: record.id || nextId("history"),
        name: typeof record.name === "string" && record.name.trim() ? record.name.trim() : "未命名方案",
        note: typeof record.note === "string" ? record.note : "",
        savedAt: record.savedAt || new Date().toISOString(),
        screwId: typeof record.screwId === "string" ? record.screwId : "",
        screwName: typeof record.screwName === "string" ? record.screwName : "",
        layout: Array.isArray(record.layout) ? record.layout : []
    };
}

function normalizeLayoutSnapshot(layout, blocks) {
    const validBlockIds = new Set((Array.isArray(blocks) ? blocks : []).map((block) => block.id));
    if (!Array.isArray(layout)) {
        return [];
    }
    return layout
        .filter((item) => item && typeof item.blockId === "string" && validBlockIds.has(item.blockId))
        .map((item) => ({
            id: item.id || nextId("slot"),
            blockId: item.blockId
        }));
}

function createDefaultScrew(
    name = DEFAULT_LINE_NAME,
    length = DEFAULT_LINE_LENGTH,
    headLength = DEFAULT_HEAD_LENGTH,
    leadSleeveName = DEFAULT_LEAD_SLEEVE_NAME,
    sleeves = createDefaultSleeves(),
    exhaustChannels = normalizeExhaustChannels(),
    defaultLayout = []
) {
    return {
        id: nextId("screw"),
        name,
        length,
        headLength,
        leadSleeveName: normalizeLeadSleeveName(leadSleeveName),
        sleeves: normalizeSleeves(sleeves),
        exhaustChannels: normalizeExhaustChannels(exhaustChannels),
        defaultLayout
    };
}

const typeLabels = {
    conveying: "输送",
    kneading: "剪切",
    reverse: "反向",
    mixing: "分散"
};

const patternStyleLabels = {
    diagonal: "斜纹",
    "fine-diagonal": "细斜纹",
    vertical: "竖纹",
    "reverse-diagonal": "反斜纹",
    mixed: "混合纹",
    cross: "交叉纹",
    grid: "网格纹",
    banded: "宽带纹",
    solid: "纯色"
};

const defaultPatternStyleByType = {
    conveying: "diagonal",
    kneading: "vertical",
    reverse: "reverse-diagonal",
    mixing: "mixed"
};

const defaultColorByType = {
    conveying: "#8f9ba7",
    kneading: "#cf7a37",
    reverse: "#4a5560",
    mixing: "#a7b09a"
};

const defaultBlocks = [
    {
        id: "block-gfa-2-30-120-a",
        name: "输送块 120 / 输送",
        code: "GFA-2-30-120-A",
        length: 120,
        type: "conveying",
        description: "长输送段，用于前段稳定输送。",
        quantity: 1
    },
    {
        id: "block-gfa-2-60-30",
        name: "输送块 30 / 输送",
        code: "GFA-2-60-30",
        length: 30,
        type: "conveying",
        description: "短输送模块，用于节距微调。",
        quantity: 1
    },
    {
        id: "block-gfa-2-60-60",
        name: "输送块 60 / 输送",
        code: "GFA-2-60-60",
        length: 60,
        type: "conveying",
        description: "标准输送段，适合常规送料与推进。",
        quantity: 7
    },
    {
        id: "block-gfa-2-72-60",
        name: "输送块 72 / 输送",
        code: "GFA-2-72-60",
        length: 72,
        type: "conveying",
        description: "较长输送段，用于增强物料推进。",
        quantity: 1
    },
    {
        id: "block-gfa-2-80-60",
        name: "输送块 80 / 输送",
        code: "GFA-2-80-60",
        length: 80,
        type: "conveying",
        description: "长输送模块，用于连续稳定输送。",
        quantity: 22
    },
    {
        id: "block-gff-2-80-180",
        name: "保温块 180 / 特殊",
        code: "GFF-2-80-180",
        length: 180,
        type: "mixing",
        description: "特殊长段模块，用于保温或功能扩展。",
        quantity: 1
    },
    {
        id: "block-gfm-2-30-60",
        name: "混炼块 60 / 混炼",
        code: "GFM-2-30-60",
        length: 60,
        type: "mixing",
        description: "短混炼段，用于基础分散与塑化。",
        quantity: 2
    },
    {
        id: "block-gfm-2-45-30-l",
        name: "混炼块 30 / 混炼",
        code: "GFM-2-45-30-L",
        length: 45,
        type: "mixing",
        description: "混炼模块，适合中段分散与均化。",
        quantity: 4
    },
    {
        id: "block-gfm-2-60-30-l",
        name: "混炼块 30 / 混炼",
        code: "GFM-2-60-30-L",
        length: 30,
        type: "mixing",
        description: "短混炼段，用于局部增强混炼。",
        quantity: 4
    },
    {
        id: "block-kb5-2-30-45",
        name: "45° 捏合块 / 捏合",
        code: "KB5-2-30-45",
        length: 30,
        type: "kneading",
        description: "强化塑化与分散，适合主熔融段。",
        quantity: 30
    },
    {
        id: "block-kb6-2-60-30-l",
        name: "反向阻流块 / 反向",
        code: "KB-6-2-60-30-L",
        length: 30,
        type: "reverse",
        description: "左旋反向元件，用于建立压力与停留。",
        quantity: 1
    },
    {
        id: "block-kb6-2-60-30-r",
        name: "反向阻流块 / 反向",
        code: "KB-6-2-60-30-R",
        length: 30,
        type: "reverse",
        description: "右旋反向元件，用于建立压力与停留。",
        quantity: 2
    },
    {
        id: "block-kb6-2-60-45-re",
        name: "反向阻流块 / 反向",
        code: "KB6-2-60-45-RE",
        length: 60,
        type: "reverse",
        description: "反向阻流段，用于增强回流与压力建立。",
        quantity: 60
    },
    {
        id: "block-kb6-2-60-60-r",
        name: "反向阻流块 / 反向",
        code: "KB-6-2-60-60-R",
        length: 60,
        type: "reverse",
        description: "长反向元件，用于高停留工况。",
        quantity: 8
    }
];

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw);
    } catch (error) {
        console.warn("Failed to load persisted state:", error);
        return null;
    }
}

const persisted = loadState();
const initialBlocks = Array.isArray(persisted?.blocks) && persisted.blocks.length
    ? persisted.blocks
    : structuredClone(defaultBlocks);
const persistedActiveLayout = normalizeLayoutSnapshot(persisted?.layout, initialBlocks);
const persistedActiveScrewId = typeof persisted?.activeScrewId === "string" ? persisted.activeScrewId : "";
const initialScrews = Array.isArray(persisted?.screws) && persisted.screws.length
    ? persisted.screws
        .filter((screw) => screw && typeof screw.name === "string" && Number.isFinite(Number(screw.length)))
        .map((screw) => ({
            id: screw.id || nextId("screw"),
            name: screw.name,
            length: Number(screw.length),
            headLength: Number.isFinite(Number(screw.headLength)) && Number(screw.headLength) > 0
                ? Number(screw.headLength)
                : DEFAULT_HEAD_LENGTH,
            leadSleeveName: normalizeLeadSleeveName(screw.leadSleeveName),
            sleeves: normalizeSleeves(screw.sleeves),
            exhaustChannels: normalizeExhaustChannels(screw.exhaustChannels),
            defaultLayout: normalizeLayoutSnapshot(
                screw.defaultLayout,
                initialBlocks
            ).length
                ? normalizeLayoutSnapshot(screw.defaultLayout, initialBlocks)
                : (screw.id === persistedActiveScrewId && persistedActiveLayout.length
                    ? persistedActiveLayout
                    : [])
        }))
    : [createDefaultScrew(
        typeof persisted?.lineName === "string" && persisted.lineName ? persisted.lineName : DEFAULT_LINE_NAME,
        Number.isFinite(persisted?.lineLength) ? persisted.lineLength : DEFAULT_LINE_LENGTH,
        DEFAULT_HEAD_LENGTH,
        DEFAULT_LEAD_SLEEVE_NAME,
        createDefaultSleeves(),
        normalizeExhaustChannels(),
        persistedActiveLayout
    )];
const initialActiveScrewId = initialScrews.some((screw) => screw.id === persisted?.activeScrewId)
    ? persisted.activeScrewId
    : initialScrews[0].id;

const state = {
    currentPage: "home",
    projectName: typeof persisted?.projectName === "string" && persisted.projectName.trim()
        ? persisted.projectName.trim()
        : DEFAULT_PROJECT_NAME,
    libraryCollapsed: Boolean(persisted?.libraryCollapsed),
    sleevesVisible: persisted?.sleevesVisible !== false,
    blockSearch: "",
    historySearch: "",
    blocks: initialBlocks,
    layout: persistedActiveLayout,
    history: Array.isArray(persisted?.history) ? persisted.history.map(normalizeHistoryRecord).filter(Boolean) : [],
    screws: initialScrews,
    activeScrewId: initialActiveScrewId,
    editingScrewId: initialActiveScrewId,
    activeHistoryId: Array.isArray(persisted?.history) && persisted.history.some((record) => record?.id === persisted?.activeHistoryId)
        ? persisted.activeHistoryId
        : "",
    insertAnimationMs: Number.isFinite(Number(persisted?.insertAnimationMs)) && Number(persisted.insertAnimationMs) >= 0
        ? Number(persisted.insertAnimationMs)
        : DEFAULT_INSERT_ANIMATION_MS,
    deleteAnimationStyle: typeof persisted?.deleteAnimationStyle === "string" && persisted.deleteAnimationStyle
        ? persisted.deleteAnimationStyle
        : DEFAULT_DELETE_ANIMATION_STYLE,
    lengthScale: Number.isFinite(Number(persisted?.lengthScale)) && Number(persisted?.lengthScale) > 0
        ? Number(persisted.lengthScale)
        : DEFAULT_LENGTH_SCALE,
    printOptions: {
        currentLayout: persisted?.printOptions?.currentLayout ?? DEFAULT_PRINT_OPTIONS.currentLayout,
        blockCount: persisted?.printOptions?.blockCount ?? DEFAULT_PRINT_OPTIONS.blockCount,
        screwLength: persisted?.printOptions?.screwLength ?? DEFAULT_PRINT_OPTIONS.screwLength
    },
    selectedLibraryBlockId: null,
    selectedBlockId: null,
    libraryDragBlockId: null,
    slotDrag: null,
    pendingSlotDrag: null,
    slotInsertIndex: null,
    toastTimer: null,
    ignoreSlotClickUntil: 0
};

const navItems = Array.from(document.querySelectorAll(".nav-item"));
const pages = Array.from(document.querySelectorAll(".page"));
const workspaceGrid = document.querySelector(".workspace-grid");
const screwStageCard = document.querySelector(".screw-stage-card");
const blockLibrary = document.getElementById("block-library");
const blockSearchInput = document.getElementById("block-search");
const historySearchInput = document.getElementById("history-search");
const screwStageWrap = document.querySelector(".screw-stage-wrap");
const screwStage = document.getElementById("screw-stage");
const bottomAnnotation = document.getElementById("bottom-annotation");
const deleteDropzone = document.getElementById("delete-dropzone");
const toggleLibraryButton = document.getElementById("toggle-library");
const clearLayoutButton = document.getElementById("clear-layout");
const saveLayoutButton = document.getElementById("save-layout");
const resetLayoutButton = document.getElementById("reset-layout");
const printLayoutButton = document.getElementById("print-layout");
const toggleSleevesButton = document.getElementById("toggle-sleeves");
const activeScrewSelect = document.getElementById("active-screw-select");
const systemSettingsForm = document.getElementById("system-settings-form");
const systemProjectNameInput = document.getElementById("system-project-name");
const systemLengthScaleInput = document.getElementById("system-length-scale");
const systemInsertDurationInput = document.getElementById("system-insert-duration");
const systemPrintCurrentLayoutInput = document.getElementById("system-print-current-layout");
const systemPrintBlockCountInput = document.getElementById("system-print-block-count");
const systemPrintScrewLengthInput = document.getElementById("system-print-screw-length");
const exportProjectDataButton = document.getElementById("export-project-data");
const importProjectDataButton = document.getElementById("import-project-data");
const projectDataFileInput = document.getElementById("project-data-file");
const screwList = document.getElementById("screw-list");
const screwSettingsForm = document.getElementById("screw-settings-form");
const editingScrewIdInput = document.getElementById("editing-screw-id");
const screwNameInput = document.getElementById("screw-name");
const screwLengthInput = document.getElementById("screw-length");
const screwHeadLengthInput = document.getElementById("screw-head-length");
const leadSleeveNameInput = document.getElementById("lead-sleeve-name");
const sleeveApplySourceSelect = document.getElementById("sleeve-apply-source");
const applySleeveTemplateButton = document.getElementById("apply-sleeve-template");
const sleeveEditor = document.getElementById("sleeve-editor");
const newScrewButton = document.getElementById("new-screw");
const deleteScrewButton = document.getElementById("delete-screw");
const resetScrewSettingsButton = document.getElementById("reset-screw-settings");
const currentLineName = document.getElementById("current-line-name");
const currentLineLength = document.getElementById("current-line-length");
const currentBlockCount = document.getElementById("current-block-count");
const currentUsedLength = document.getElementById("current-used-length");
const currentRemainingLength = document.getElementById("current-remaining-length");
const currentLengthScale = document.getElementById("current-length-scale");
const sleeveOverlay = document.getElementById("sleeve-overlay");
const blockList = document.getElementById("block-list");
const blockForm = document.getElementById("block-form");
const newBlockButton = document.getElementById("new-block");
const editingBlockIdInput = document.getElementById("editing-block-id");
const blockNameInput = document.getElementById("block-name");
const blockCodeInput = document.getElementById("block-code");
const blockLengthInput = document.getElementById("block-length");
const blockQuantityInput = document.getElementById("block-quantity");
const blockTypeInput = document.getElementById("block-type");
const blockPatternStyleInput = document.getElementById("block-pattern-style");
const blockColorInput = document.getElementById("block-color");
const blockDescriptionInput = document.getElementById("block-description");
const blockPreviewSlot = document.getElementById("block-preview-slot");
const deleteCurrentBlockButton = document.getElementById("delete-current-block");
const historyList = document.getElementById("history-list");
const saveLayoutModal = document.getElementById("save-layout-modal");
const saveLayoutForm = document.getElementById("save-layout-form");
const saveLayoutModeNewInput = document.getElementById("save-layout-mode-new");
const saveLayoutModeOverwriteInput = document.getElementById("save-layout-mode-overwrite");
const saveLayoutTargetWrap = document.getElementById("save-layout-target-wrap");
const saveLayoutTargetSelect = document.getElementById("save-layout-target");
const saveLayoutNameWrap = document.getElementById("save-layout-name-wrap");
const saveLayoutNameInput = document.getElementById("save-layout-name");
const saveLayoutNoteInput = document.getElementById("save-layout-note");
const cancelSaveLayoutButton = document.getElementById("cancel-save-layout");
const appToast = document.getElementById("app-toast");
const appBrandTitle = document.querySelector(".brand h1");
const printStageRoot = document.getElementById("print-stage-root");
const historyPreviewModal = document.getElementById("history-preview-modal");
const historyPreviewMeta = document.getElementById("history-preview-meta");
const historyPreviewImage = document.getElementById("history-preview-image");
const editHistoryPreviewButton = document.getElementById("edit-history-preview");
const closeHistoryPreviewButton = document.getElementById("close-history-preview");
const confirmDeleteModal = document.getElementById("confirm-delete-modal");
const confirmDeleteMessage = document.getElementById("confirm-delete-message");
const cancelDeleteButton = document.getElementById("cancel-delete");
const confirmDeleteButton = document.getElementById("confirm-delete");
const importDataModal = document.getElementById("import-data-modal");
const importDataForm = document.getElementById("import-data-form");
const importDataFileName = document.getElementById("import-data-file-name");
const importDataFileMeta = document.getElementById("import-data-file-meta");
const cancelImportDataButton = document.getElementById("cancel-import-data");
const exportDataModal = document.getElementById("export-data-modal");
const exportDataForm = document.getElementById("export-data-form");
const exportIncludeScrewsInput = document.getElementById("export-include-screws");
const exportIncludeBlocksInput = document.getElementById("export-include-blocks");
const exportIncludeLayoutInput = document.getElementById("export-include-layout");
const exportIncludeHistoryInput = document.getElementById("export-include-history");
const exportIncludeSettingsInput = document.getElementById("export-include-settings");
const cancelExportDataButton = document.getElementById("cancel-export-data");
const printPreviewModal = document.getElementById("print-preview-modal");
const printPreviewMeta = document.getElementById("print-preview-meta");
const printPreviewImage = document.getElementById("print-preview-image");
const cancelPrintPreviewButton = document.getElementById("cancel-print-preview");
const confirmPrintPreviewButton = document.getElementById("confirm-print-preview");
let historyPreviewSnapshotUrl = "";
let printSnapshotUrl = "";
let activePreviewHistoryId = "";
let pendingDeleteAction = null;
let pendingImportPayload = null;
let pendingImportFileName = "";

blockNameInput?.closest("label")?.remove();
if (blockCodeInput) {
    const codeLabel = blockCodeInput.closest("label");
    const codeLabelText = codeLabel?.querySelector("span");
    if (codeLabelText) {
        codeLabelText.textContent = "模块名称";
    }
    blockCodeInput.placeholder = "例如：KB5-2-30-45";
}

function createPersistedPayload(source = state) {
    const activeScrew = source.screws.find((screw) => screw.id === source.activeScrewId) || source.screws[0] || null;
    return {
        projectName: source.projectName,
        libraryCollapsed: source.libraryCollapsed,
        sleevesVisible: source.sleevesVisible,
        blocks: source.blocks,
        layout: source.layout,
        history: source.history,
        screws: source.screws,
        activeScrewId: source.activeScrewId,
        activeHistoryId: source.activeHistoryId,
        insertAnimationMs: source.insertAnimationMs,
        deleteAnimationStyle: source.deleteAnimationStyle,
        lengthScale: source.lengthScale,
        printOptions: source.printOptions,
        lineName: activeScrew?.name || DEFAULT_LINE_NAME,
        lineLength: activeScrew?.length || DEFAULT_LINE_LENGTH
    };
}

function persistState() {
    const payload = createPersistedPayload();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function normalizeImportedBlock(block) {
    if (!block || typeof block !== "object") {
        return null;
    }
    const type = typeLabels[block.type] ? block.type : "conveying";
    const code = typeof block.code === "string" && block.code.trim() ? block.code.trim() : "未命名模块";
    const length = Number(block.length);
    const quantity = Number(block.quantity);
    return {
        id: nextId("block"),
        code,
        length: Number.isFinite(length) && length > 0 ? length : SLOT_BASE_MM,
        quantity: Number.isFinite(quantity) && quantity >= 0 ? Math.floor(quantity) : 1,
        type,
        patternStyle: patternStyleLabels[block.patternStyle] ? block.patternStyle : (defaultPatternStyleByType[type] || defaultPatternStyleByType.conveying),
        color: normalizeBlockColor(block.color, type),
        description: typeof block.description === "string" ? block.description : ""
    };
}

function remapImportedLayout(layout, blockIdMap) {
    if (!Array.isArray(layout)) {
        return [];
    }
    return layout
        .map((item) => ({
            id: nextId("slot"),
            blockId: typeof item?.blockId === "string" ? blockIdMap.get(item.blockId) : ""
        }))
        .filter((item) => item.blockId);
}

function normalizeImportedScrew(screw, blockIdMap) {
    if (!screw || typeof screw !== "object") {
        return null;
    }
    const name = typeof screw.name === "string" && screw.name.trim() ? screw.name.trim() : DEFAULT_LINE_NAME;
    const length = Number(screw.length);
    const headLength = Number(screw.headLength);
    return {
        id: nextId("screw"),
        name,
        length: Number.isFinite(length) && length > 0 ? length : DEFAULT_LINE_LENGTH,
        headLength: Number.isFinite(headLength) && headLength > 0 ? headLength : DEFAULT_HEAD_LENGTH,
        leadSleeveName: normalizeLeadSleeveName(screw.leadSleeveName),
        sleeves: normalizeSleeves(screw.sleeves),
        exhaustChannels: normalizeExhaustChannels(screw.exhaustChannels),
        defaultLayout: remapImportedLayout(screw.defaultLayout, blockIdMap)
    };
}

function normalizeImportedHistory(historyRecord, blockIdMap, screwIdMap) {
    if (!historyRecord || typeof historyRecord !== "object") {
        return null;
    }
    const screwId = typeof historyRecord.screwId === "string" ? screwIdMap.get(historyRecord.screwId) || "" : "";
    return normalizeHistoryRecord({
        id: nextId("history"),
        name: historyRecord.name,
        note: historyRecord.note,
        savedAt: historyRecord.savedAt,
        screwId,
        screwName: typeof historyRecord.screwName === "string" && historyRecord.screwName.trim()
            ? historyRecord.screwName.trim()
            : "",
        layout: remapImportedLayout(historyRecord.layout, blockIdMap)
    });
}

function normalizeImportedDeleteAnimationStyle(style) {
    return ["collapse", "slide-right", "fade-scale"].includes(style) ? style : DEFAULT_DELETE_ANIMATION_STYLE;
}

function extractImportPayload(rawData) {
    if (!rawData || typeof rawData !== "object") {
        return null;
    }
    if (rawData.kind === BACKUP_FILE_KIND && rawData.payload && typeof rawData.payload === "object") {
        return rawData.payload;
    }
    if (rawData.payload && typeof rawData.payload === "object") {
        return rawData.payload;
    }
    if (Array.isArray(rawData.blocks) || Array.isArray(rawData.screws) || Array.isArray(rawData.history)) {
        return rawData;
    }
    return null;
}

function buildImportSummary(payload) {
    const blockCount = Array.isArray(payload?.blocks) ? payload.blocks.length : 0;
    const screwCount = Array.isArray(payload?.screws) ? payload.screws.length : 0;
    const historyCount = Array.isArray(payload?.history) ? payload.history.length : 0;
    return `包含 ${screwCount} 条螺杆、${blockCount} 个模块、${historyCount} 条历史方案。`;
}

function buildImportedSnapshot(payload, mode = "overwrite") {
    const sourceBlocks = Array.isArray(payload?.blocks) ? payload.blocks : [];
    const blockIdMap = new Map();
    const importedBlocks = sourceBlocks
        .map((block) => {
            const normalized = normalizeImportedBlock(block);
            if (!normalized) {
                return null;
            }
            if (typeof block?.id === "string") {
                blockIdMap.set(block.id, normalized.id);
            }
            return normalized;
        })
        .filter(Boolean);

    const sourceScrews = Array.isArray(payload?.screws) ? payload.screws : [];
    const screwIdMap = new Map();
    const importedScrews = sourceScrews
        .map((screw) => {
            const normalized = normalizeImportedScrew(screw, blockIdMap);
            if (!normalized) {
                return null;
            }
            if (typeof screw?.id === "string") {
                screwIdMap.set(screw.id, normalized.id);
            }
            return normalized;
        })
        .filter(Boolean);

    const historyIdMap = new Map();
    const importedHistory = (Array.isArray(payload?.history) ? payload.history : [])
        .map((record) => {
            const normalized = normalizeImportedHistory(record, blockIdMap, screwIdMap);
            if (normalized && typeof record?.id === "string") {
                historyIdMap.set(record.id, normalized.id);
            }
            return normalized;
        })
        .filter(Boolean);

    if (mode === "append") {
        return {
            projectName: state.projectName,
            libraryCollapsed: state.libraryCollapsed,
            sleevesVisible: state.sleevesVisible,
            blocks: state.blocks.concat(importedBlocks),
            layout: state.layout.map((item) => ({ ...item })),
            history: state.history.concat(importedHistory),
            screws: state.screws.concat(importedScrews),
            activeScrewId: state.activeScrewId,
            editingScrewId: state.editingScrewId,
            activeHistoryId: state.activeHistoryId,
            insertAnimationMs: state.insertAnimationMs,
            deleteAnimationStyle: state.deleteAnimationStyle,
            lengthScale: state.lengthScale,
            printOptions: { ...state.printOptions }
        };
    }

    const screws = importedScrews.length ? importedScrews : [createDefaultScrew()];
    const activeScrewId = (typeof payload?.activeScrewId === "string" && screwIdMap.get(payload.activeScrewId)) || screws[0].id;
    const activeHistoryId = (typeof payload?.activeHistoryId === "string" && historyIdMap.get(payload.activeHistoryId)) || "";
    return {
        projectName: typeof payload?.projectName === "string" && payload.projectName.trim() ? payload.projectName.trim() : DEFAULT_PROJECT_NAME,
        libraryCollapsed: Boolean(payload?.libraryCollapsed),
        sleevesVisible: payload?.sleevesVisible !== false,
        blocks: importedBlocks,
        layout: remapImportedLayout(payload?.layout, blockIdMap),
        history: importedHistory,
        screws,
        activeScrewId,
        editingScrewId: activeScrewId,
        activeHistoryId,
        insertAnimationMs: Number.isFinite(Number(payload?.insertAnimationMs)) && Number(payload.insertAnimationMs) >= 0
            ? Number(payload.insertAnimationMs)
            : DEFAULT_INSERT_ANIMATION_MS,
        deleteAnimationStyle: normalizeImportedDeleteAnimationStyle(payload?.deleteAnimationStyle),
        lengthScale: Number.isFinite(Number(payload?.lengthScale)) && Number(payload.lengthScale) > 0
            ? Number(payload.lengthScale)
            : DEFAULT_LENGTH_SCALE,
        printOptions: {
            currentLayout: payload?.printOptions?.currentLayout ?? DEFAULT_PRINT_OPTIONS.currentLayout,
            blockCount: payload?.printOptions?.blockCount ?? DEFAULT_PRINT_OPTIONS.blockCount,
            screwLength: payload?.printOptions?.screwLength ?? DEFAULT_PRINT_OPTIONS.screwLength
        }
    };
}

function applyImportedSnapshot(snapshot) {
    state.projectName = snapshot.projectName;
    state.libraryCollapsed = snapshot.libraryCollapsed;
    state.sleevesVisible = snapshot.sleevesVisible;
    state.blocks = snapshot.blocks;
    state.layout = snapshot.layout;
    state.history = snapshot.history;
    state.screws = snapshot.screws.length ? snapshot.screws : [createDefaultScrew()];
    state.activeScrewId = state.screws.some((screw) => screw.id === snapshot.activeScrewId) ? snapshot.activeScrewId : state.screws[0].id;
    state.editingScrewId = state.screws.some((screw) => screw.id === snapshot.editingScrewId) ? snapshot.editingScrewId : state.activeScrewId;
    state.activeHistoryId = state.history.some((record) => record.id === snapshot.activeHistoryId) ? snapshot.activeHistoryId : "";
    state.insertAnimationMs = snapshot.insertAnimationMs;
    state.deleteAnimationStyle = snapshot.deleteAnimationStyle;
    state.lengthScale = snapshot.lengthScale;
    state.printOptions = { ...snapshot.printOptions };
    state.selectedLibraryBlockId = null;
    state.selectedBlockId = null;
    state.libraryDragBlockId = null;
    state.slotDrag = null;
    state.pendingSlotDrag = null;
    state.slotInsertIndex = null;
    persistState();
    populateBlockForm(null);
    populateScrewSettingsForm(getScrewById(state.editingScrewId));
    renderAll();
}

function getBackupFileName() {
    const safeProjectName = (state.projectName || DEFAULT_PROJECT_NAME).replace(/[\\/:*?"<>|]/g, "-");
    const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return `${safeProjectName}-backup-${date}.json`;
}

function downloadTextFile(fileName, content, type = "application/json;charset=utf-8") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function openExportDataModal() {
    if (!exportDataModal) {
        return;
    }
    exportDataModal.hidden = false;
}

function closeExportDataModal() {
    if (exportDataModal) {
        exportDataModal.hidden = true;
    }
}

function buildSelectiveExportPayload(options = {}) {
    const includeLayout = Boolean(options.includeLayout);
    const includeHistory = Boolean(options.includeHistory);
    const includeSettings = Boolean(options.includeSettings);
    const includeBlocks = Boolean(options.includeBlocks || includeLayout || includeHistory);
    const includeScrews = Boolean(options.includeScrews || includeHistory);

    const payload = {};

    if (includeSettings) {
        payload.projectName = state.projectName;
        payload.libraryCollapsed = state.libraryCollapsed;
        payload.sleevesVisible = state.sleevesVisible;
        payload.activeScrewId = state.activeScrewId;
        payload.activeHistoryId = state.activeHistoryId;
        payload.insertAnimationMs = state.insertAnimationMs;
        payload.deleteAnimationStyle = state.deleteAnimationStyle;
        payload.lengthScale = state.lengthScale;
        payload.printOptions = { ...state.printOptions };
        const activeScrew = getActiveScrew();
        payload.lineName = activeScrew?.name || DEFAULT_LINE_NAME;
        payload.lineLength = activeScrew?.length || DEFAULT_LINE_LENGTH;
    }

    if (includeBlocks) {
        payload.blocks = structuredClone(state.blocks);
    }

    if (includeLayout) {
        payload.layout = structuredClone(state.layout);
    }

    if (includeScrews) {
        payload.screws = structuredClone(state.screws);
        payload.activeScrewId ??= state.activeScrewId;
    }

    if (includeHistory) {
        payload.history = structuredClone(state.history);
        payload.activeHistoryId ??= state.activeHistoryId;
    }

    return payload;
}

function openImportDataModal() {
    if (!importDataModal) {
        return;
    }
    importDataModal.hidden = false;
}

function closeImportDataModal() {
    if (importDataModal) {
        importDataModal.hidden = true;
    }
    pendingImportPayload = null;
    pendingImportFileName = "";
    if (importDataFileName) {
        importDataFileName.textContent = "未选择文件";
    }
    if (importDataFileMeta) {
        importDataFileMeta.textContent = "请选择导出的项目备份文件。";
    }
    if (projectDataFileInput) {
        projectDataFileInput.value = "";
    }
}

function updateProjectTitle() {
    const nextTitle = state.projectName || DEFAULT_PROJECT_NAME;
    document.title = nextTitle;
    if (appBrandTitle) {
        appBrandTitle.textContent = nextTitle;
    }
}

function getScrewById(screwId) {
    return state.screws.find((screw) => screw.id === screwId) || null;
}

function getActiveScrew() {
    return getScrewById(state.activeScrewId) || state.screws[0] || null;
}

function getBlockById(blockId) {
    return state.blocks.find((block) => block.id === blockId) || null;
}

function getLayoutBlocks() {
    return state.layout
        .map((item) => ({
            item,
            block: getBlockById(item.blockId)
        }))
        .filter(({ block }) => Boolean(block));
}

function getLayoutBlocksFromLayout(layout = []) {
    return layout
        .map((item) => ({
            item,
            block: getBlockById(item.blockId)
        }))
        .filter(({ block }) => Boolean(block));
}

function getTypeLabel(type) {
    return typeLabels[type] || type;
}

function getUsedBlockCount(blockId) {
    return state.layout.reduce((count, item) => count + (item.blockId === blockId ? 1 : 0), 0);
}

function getLayoutTotalLength(layout = state.layout) {
    return layout.reduce((total, item) => {
        const block = getBlockById(item.blockId);
        return total + getBlockLength(block);
    }, 0);
}

function getLayoutTotalVisualWidth(layout = state.layout) {
    return layout.reduce((total, item) => {
        const block = getBlockById(item.blockId);
        return total + getBlockVisualWidth(block);
    }, 0);
}

function getLayoutTotalFitWidth(layout = state.layout) {
    return layout.reduce((total, item) => {
        const block = getBlockById(item.blockId);
        return total + getBlockFitWidth(block);
    }, 0);
}

function getTotalBlockCount(block) {
    return Number.isFinite(block?.quantity) ? block.quantity : Infinity;
}

function isBlockDragDisabled(block) {
    return getUsedBlockCount(block.id) >= getTotalBlockCount(block);
}

function getBlockLength(block) {
    const length = Number(block?.length);
    return Number.isFinite(length) && length > 0 ? length : SLOT_BASE_MM;
}

function getScrewLength(screw = getActiveScrew()) {
    const length = Number(screw?.length);
    return Number.isFinite(length) && length > 0 ? length : DEFAULT_LINE_LENGTH;
}

function getScrewHeadLength(screw = getActiveScrew()) {
    const headLength = Number(screw?.headLength);
    return Number.isFinite(headLength) && headLength > 0 ? headLength : DEFAULT_HEAD_LENGTH;
}

function getScrewSleeves(screw = getActiveScrew()) {
    return normalizeSleeves(screw?.sleeves);
}

function getLeadSleeveName(screw = getActiveScrew()) {
    return normalizeLeadSleeveName(screw?.leadSleeveName);
}

function getExhaustChannels(screw = getActiveScrew()) {
    return normalizeExhaustChannels(screw?.exhaustChannels);
}

function getScrewDefaultLayout(screw = getActiveScrew()) {
    const normalized = normalizeLayoutSnapshot(screw?.defaultLayout, state.blocks);
    return normalized;
}

function getActiveHistoryRecord() {
    return state.activeHistoryId
        ? state.history.find((record) => record.id === state.activeHistoryId) || null
        : null;
}

function applyHistoryRecord(record, options = {}) {
    if (!record) {
        return;
    }
    const { switchToHome = true } = options;
    const targetScrew = record.screwId ? getScrewById(record.screwId) : null;
    if (targetScrew) {
        state.activeScrewId = targetScrew.id;
        state.editingScrewId = targetScrew.id;
    }
    state.activeHistoryId = record.id;
    state.layout = record.layout
        .filter((entry) => getBlockById(entry.blockId))
        .map((entry) => ({
            id: nextId("slot"),
            blockId: entry.blockId
        }));
    persistState();
    populateScrewSettingsForm(getScrewById(state.editingScrewId));
    renderAll();
    if (switchToHome) {
        switchPage("home");
    }
    showToast(`已切换到方案“${record.name}”${targetScrew ? `，并切换到螺杆“${targetScrew.name}”` : ""}。`);
}

function getCurrentRestoreLayout() {
    const activeHistoryRecord = getActiveHistoryRecord();
    if (activeHistoryRecord) {
        return normalizeLayoutSnapshot(activeHistoryRecord.layout, state.blocks);
    }
    return getScrewDefaultLayout();
}

function normalizeBlockColor(color, type = "conveying") {
    const value = typeof color === "string" ? color.trim() : "";
    return /^#([0-9a-f]{6})$/i.test(value) ? value.toLowerCase() : (defaultColorByType[type] || defaultColorByType.conveying);
}

function getBlockPatternStyle(block) {
    return patternStyleLabels[block?.patternStyle]
        ? block.patternStyle
        : (defaultPatternStyleByType[block?.type] || defaultPatternStyleByType.conveying);
}

function getBlockColor(block) {
    return normalizeBlockColor(block?.color, block?.type);
}

function hexToRgba(hex, alpha) {
    const normalized = normalizeBlockColor(hex).replace("#", "");
    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getModuleBackground(block) {
    const color = getBlockColor(block);
    switch (getBlockPatternStyle(block)) {
        case "fine-diagonal":
            return `repeating-linear-gradient(135deg, ${hexToRgba(color, 0.14)} 0 3px, ${hexToRgba(color, 0.66)} 3px 6px)`;
        case "vertical":
            return `repeating-linear-gradient(90deg, ${hexToRgba(color, 0.18)} 0 4px, ${hexToRgba(color, 0.58)} 4px 8px)`;
        case "reverse-diagonal":
            return `repeating-linear-gradient(45deg, ${hexToRgba(color, 0.24)} 0 5px, ${hexToRgba(color, 0.62)} 5px 10px)`;
        case "mixed":
            return `repeating-linear-gradient(135deg, ${hexToRgba(color, 0.2)} 0 5px, ${hexToRgba(color, 0.58)} 5px 9px, rgba(255, 255, 255, 0.45) 9px 12px)`;
        case "cross":
            return `linear-gradient(180deg, ${hexToRgba(color, 0.14)}, ${hexToRgba(color, 0.3)}), repeating-linear-gradient(135deg, ${hexToRgba(color, 0.58)} 0 4px, transparent 4px 9px), repeating-linear-gradient(45deg, ${hexToRgba(color, 0.48)} 0 4px, transparent 4px 9px)`;
        case "grid":
            return `linear-gradient(180deg, ${hexToRgba(color, 0.14)}, ${hexToRgba(color, 0.24)}), repeating-linear-gradient(90deg, ${hexToRgba(color, 0.54)} 0 2px, transparent 2px 9px), repeating-linear-gradient(0deg, ${hexToRgba(color, 0.42)} 0 2px, transparent 2px 9px)`;
        case "banded":
            return `repeating-linear-gradient(135deg, ${hexToRgba(color, 0.16)} 0 9px, ${hexToRgba(color, 0.64)} 9px 18px)`;
        case "solid":
            return `linear-gradient(180deg, ${hexToRgba(color, 0.2)}, ${hexToRgba(color, 0.68)})`;
        case "diagonal":
        default:
            return `repeating-linear-gradient(135deg, ${hexToRgba(color, 0.18)} 0 7px, ${hexToRgba(color, 0.58)} 7px 14px)`;
    }
}

function getSleeveSections(screw = getActiveScrew()) {
    const screwLength = getScrewLength(screw);
    const leadLength = Math.max(0, Math.min(LEAD_SLEEVE_LENGTH, screwLength));
    const remainingLength = Math.max(0, screwLength - leadLength);
    const segmentLength = remainingLength / SLEEVE_COUNT;

    return [
        {
            name: getLeadSleeveName(screw),
            length: leadLength,
            isLead: true
        },
        ...getScrewSleeves(screw).map((name) => ({
            name,
            length: segmentLength,
            isLead: false
        }))
    ];
}

function getBlockVisualWidth(block, scale = state.lengthScale) {
    const width = (getBlockLength(block) / SLOT_BASE_MM) * scale;
    return Math.max(getLengthScaleMinWidth(scale), Math.round(width));
}

function getBlockFitWidth(block, scale = state.lengthScale) {
    return (getBlockLength(block) / SLOT_BASE_MM) * scale;
}

function getRoundedBlockFitWidth(block, scale = state.lengthScale) {
    return Math.max(1, Math.round(getBlockFitWidth(block, scale)));
}

function getScrewVisualWidth(length = getScrewLength(), scale = state.lengthScale) {
    return Math.max(scale, Math.round((length / SLOT_BASE_MM) * scale));
}

function getScrewFitWidth(length = getScrewLength(), scale = state.lengthScale) {
    return (length / SLOT_BASE_MM) * scale;
}

function getRoundedScrewFitWidth(length = getScrewLength(), scale = state.lengthScale) {
    return Math.max(1, Math.round(getScrewFitWidth(length, scale)));
}

function getLengthScaleMinWidth(scale = state.lengthScale) {
    return Math.max(10, Math.round(scale / 2));
}

function canLayoutFitScrew(layout = state.layout, screw = getActiveScrew()) {
    const screwLength = getScrewLength(screw);
    const screwFitWidth = getScrewFitWidth(screwLength);
    const layoutTotalLength = getLayoutTotalLength(layout);
    const layoutTotalFitWidth = getLayoutTotalFitWidth(layout);
    return layoutTotalLength <= screwLength + LENGTH_TOLERANCE_MM
        && layoutTotalFitWidth <= screwFitWidth + FIT_WIDTH_TOLERANCE_PX;
}

function canAddBlockToCurrentLayout(block) {
    if (!block) {
        return false;
    }
    const nextLayout = [
        ...state.layout,
        {
            id: "__preview__",
            blockId: block.id
        }
    ];
    return canLayoutFitScrew(nextLayout);
}

function applyLibraryBlockWidth(element, block) {
    element.style.setProperty("--slot-width", `${getBlockVisualWidth(block)}px`);
}

function applyScrewTrackWidth(element, length = getScrewLength(), scale = state.lengthScale, headLength = getScrewHeadLength()) {
    element.style.setProperty("--screw-body-width", `${getRoundedScrewFitWidth(length, scale)}px`);
    element.style.setProperty("--screw-head-width", `${getRoundedScrewFitWidth(headLength, scale)}px`);
    element.style.setProperty("--screw-tail-width", "12px");
    element.style.setProperty("--annotation-font-size", `${Math.max(10, Math.min(13, scale / 3))}px`);
}

function applyStageBlockWidth(element, blockOrWidth, scale = state.lengthScale) {
    const width = typeof blockOrWidth === "number" ? blockOrWidth : getRoundedBlockFitWidth(blockOrWidth, scale);
    element.style.setProperty("--slot-width", `${width}px`);
}

function getActivePreviewBlock() {
    if (state.slotDrag?.removedItem) {
        return getBlockById(state.slotDrag.removedItem.blockId);
    }
    if (state.libraryDragBlockId) {
        return getBlockById(state.libraryDragBlockId);
    }
    return null;
}

function getPreviewWidth() {
    const activeBlock = getActivePreviewBlock();
    return activeBlock ? `${getRoundedBlockFitWidth(activeBlock)}px` : null;
}

function getStagePixelWidths(blocks, scale = state.lengthScale) {
    const widths = [];
    let previousEdge = 0;
    let cumulativeWidth = 0;

    blocks.forEach((block) => {
        cumulativeWidth += getBlockFitWidth(block, scale);
        const currentEdge = Math.round(cumulativeWidth);
        widths.push(Math.max(1, currentEdge - previousEdge));
        previousEdge = currentEdge;
    });

    return widths;
}

function getConstrainedStagePixelWidths(blocks, scale = state.lengthScale, maxTotalWidth = Infinity) {
    const rawTotalWidth = blocks.reduce((total, block) => total + getBlockFitWidth(block, scale), 0);
    const constrainedScale = rawTotalWidth > maxTotalWidth && Number.isFinite(maxTotalWidth) && maxTotalWidth > 0
        ? scale * (maxTotalWidth / rawTotalWidth)
        : scale;
    return getStagePixelWidths(blocks, constrainedScale);
}

function getRoundedPixelWidths(lengths, scale = state.lengthScale) {
    const widths = [];
    let previousEdge = 0;
    let cumulativeWidth = 0;

    lengths.forEach((length) => {
        cumulativeWidth += getScrewFitWidth(length, scale);
        const currentEdge = Math.round(cumulativeWidth);
        widths.push(Math.max(0, currentEdge - previousEdge));
        previousEdge = currentEdge;
    });

    return widths;
}

function getPrintLengthScale(screw = getActiveScrew()) {
    const screwLength = getScrewLength(screw);
    if (!screwLength) {
        return state.lengthScale;
    }
    const maxScale = PRINT_TARGET_BODY_WIDTH / (screwLength / SLOT_BASE_MM);
    return Math.max(8, Math.min(state.lengthScale, maxScale));
}

function renderSleeveEditor(screw = getScrewById(state.editingScrewId)) {
    if (!sleeveEditor) {
        return;
    }
    sleeveEditor.innerHTML = "";
    const sleeves = getScrewSleeves(screw);
    const exhaustChannels = getExhaustChannels(screw);
    sleeves.forEach((name, index) => {
        const field = document.createElement("div");
        field.className = "sleeve-field";

        const label = document.createElement("label");
        label.className = "sleeve-field-label";

        const title = document.createElement("span");
        title.textContent = `套筒 ${index + 1}`;

        const input = document.createElement("input");
        input.type = "text";
        input.maxLength = 40;
        input.value = name;
        input.dataset.sleeveIndex = String(index);
        input.placeholder = `请输入套筒 ${index + 1} 名称`;

        label.append(title, input);

        const exhaustLabel = document.createElement("label");
        exhaustLabel.className = "sleeve-toggle";

        const exhaustInput = document.createElement("input");
        exhaustInput.type = "checkbox";
        exhaustInput.checked = exhaustChannels[index];
        exhaustInput.dataset.exhaustIndex = String(index);
        exhaustInput.setAttribute("aria-label", `套筒 ${index + 1} 排气通道`);

        exhaustLabel.append(exhaustInput);
        field.append(label, exhaustLabel);
        sleeveEditor.appendChild(field);
    });
}

function createModuleElement(block, extraClassName = "") {
    const module = document.createElement("div");
    module.className = `slot-module ${extraClassName}`.trim();
    module.dataset.type = block.type;
    module.dataset.pattern = getBlockPatternStyle(block);
    module.style.background = getModuleBackground(block);
    module.setAttribute("aria-label", `${block.code} ${getTypeLabel(block.type)}`);
    return module;
}

function getBlockPreviewData() {
    const type = blockTypeInput?.value || "conveying";
    return {
        code: blockCodeInput?.value.trim() || "预览模块",
        length: Number(blockLengthInput?.value) > 0 ? Number(blockLengthInput.value) : SLOT_BASE_MM,
        type,
        patternStyle: patternStyleLabels[blockPatternStyleInput?.value]
            ? blockPatternStyleInput.value
            : (defaultPatternStyleByType[type] || defaultPatternStyleByType.conveying),
        color: normalizeBlockColor(blockColorInput?.value, type)
    };
}

function renderBlockPreview() {
    if (!blockPreviewSlot) {
        return;
    }
    blockPreviewSlot.innerHTML = "";
    const previewBlock = getBlockPreviewData();
    applyLibraryBlockWidth(blockPreviewSlot, previewBlock);
    blockPreviewSlot.appendChild(createModuleElement(previewBlock));
}

function clearInsertPreview() {
    screwStage.querySelectorAll(".slot.insert-left, .slot.insert-right").forEach((slot) => {
        slot.classList.remove("insert-left", "insert-right");
        slot.style.removeProperty("--insert-preview-width");
    });
}

function applyInsertPreview(index) {
    clearInsertPreview();
    if (index == null) {
        return;
    }
    const slots = Array.from(screwStage.querySelectorAll(".slot[data-slot-id]"));
    if (!slots.length) {
        return;
    }
    if (index >= slots.length) {
        const previewWidth = getPreviewWidth();
        if (previewWidth) {
            slots[slots.length - 1].style.setProperty("--insert-preview-width", previewWidth);
        }
        slots[slots.length - 1].classList.add("insert-right");
        return;
    }
    const previewWidth = getPreviewWidth();
    if (previewWidth) {
        slots[index].style.setProperty("--insert-preview-width", previewWidth);
    }
    slots[index].classList.add("insert-left");
}

function captureStageSlotRects() {
    const rects = new Map();
    screwStage.querySelectorAll(".slot[data-slot-id]").forEach((slot) => {
        rects.set(slot.dataset.slotId, slot.getBoundingClientRect());
    });
    return rects;
}

function animateStageReflow(previousRects) {
    if (!previousRects?.size) {
        return;
    }
    const slots = Array.from(screwStage.querySelectorAll(".slot[data-slot-id]"));
    slots.forEach((slot) => {
        const previous = previousRects.get(slot.dataset.slotId);
        if (!previous) {
            return;
        }
        const next = slot.getBoundingClientRect();
        const deltaX = previous.left - next.left;
        const deltaY = previous.top - next.top;
        if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) {
            return;
        }
        slot.style.transition = "none";
        slot.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        slot.getBoundingClientRect();
        requestAnimationFrame(() => {
            slot.style.transition = "";
            slot.style.transform = "";
        });
    });
}

function insertLibraryBlockAt(block, insertIndex = 0) {
    if (!block) {
        return;
    }
    if (isBlockDragDisabled(block)) {
        showToast("已达到该模块总数量，不能继续新增。");
        return;
    }
    if (!canAddBlockToCurrentLayout(block)) {
        showToast("螺纹块总长已超过当前螺杆长度，不能继续新增。");
        return;
    }

    const previousRects = captureStageSlotRects();
    const safeInsertIndex = Math.min(Math.max(insertIndex, 0), state.layout.length);
    state.layout.splice(safeInsertIndex, 0, {
        id: nextId("slot"),
        blockId: block.id
    });
    state.selectedLibraryBlockId = block.id;
    persistState();
    renderAll(previousRects);
}

function renderLibrary() {
    const keyword = state.blockSearch.trim().toLowerCase();
    const filteredBlocks = state.blocks.filter((block) => {
        const haystack = `${block.code || ""} ${block.description} ${getTypeLabel(block.type)}`.toLowerCase();
        return !keyword || haystack.includes(keyword);
    });

    blockLibrary.innerHTML = "";

    if (!filteredBlocks.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "没有找到匹配的螺纹块。";
        blockLibrary.appendChild(empty);
        return;
    }

    filteredBlocks.forEach((block) => {
        const usedCount = getUsedBlockCount(block.id);
        const totalCount = Number.isFinite(block.quantity) ? block.quantity : "-";
        const exceedsScrewLength = !canAddBlockToCurrentLayout(block);
        const dragDisabled = isBlockDragDisabled(block) || exceedsScrewLength;
        const item = document.createElement("article");
        item.className = "library-item";
        if (state.selectedLibraryBlockId === block.id) {
            item.classList.add("selected");
        }
        if (dragDisabled) {
            item.classList.add("disabled");
        }

        const body = document.createElement("div");
        body.className = "library-body";

        const topline = document.createElement("div");
        topline.className = "library-topline";

        const codeTitle = document.createElement("strong");
        codeTitle.className = "library-name";
        codeTitle.textContent = block.code;

        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = getTypeLabel(block.type);

        topline.append(codeTitle, chip);

        const meta = document.createElement("p");
        meta.className = "management-meta";
        meta.textContent = `长度：${block.length} mm`;

        const quantityMeta = document.createElement("p");
        quantityMeta.className = "management-meta library-quantity-text";
        quantityMeta.textContent = `数量：${usedCount}/${totalCount}`;
        if (dragDisabled) {
            quantityMeta.classList.add("disabled");
        }

        const statusMeta = document.createElement("p");
        statusMeta.className = "management-meta library-status-text";
        if (dragDisabled) {
            statusMeta.classList.add("disabled");
            statusMeta.textContent = exceedsScrewLength ? "已禁用：螺杆剩余长度不足" : "已禁用：数量已达上限";
        } else {
            statusMeta.textContent = "可拖拽使用";
        }

        const metaRow = document.createElement("div");
        metaRow.className = "library-meta-row";
        metaRow.append(meta, quantityMeta, statusMeta);

        const preview = document.createElement("div");
        preview.className = "library-preview";

        const shell = document.createElement("div");
        shell.className = "library-slot-shell";
        applyLibraryBlockWidth(shell, block);
        if (dragDisabled) {
            shell.classList.add("disabled");
        }

        const module = createModuleElement(block, "library-slot-module");
        module.draggable = !dragDisabled;
        if (dragDisabled) {
            module.classList.add("disabled");
            module.setAttribute("aria-disabled", "true");
            module.title = exceedsScrewLength
                ? "螺纹块总长将超过当前螺杆长度，禁止拖拽"
                : "已达到总数量，禁止拖拽";
        }
        module.addEventListener("dragstart", (event) => {
            if (dragDisabled) {
                event.preventDefault();
                return;
            }
            state.libraryDragBlockId = block.id;
            state.selectedLibraryBlockId = block.id;
            event.dataTransfer.effectAllowed = "copy";
            event.dataTransfer.setData("text/plain", block.id);
        });
        module.addEventListener("dragend", () => {
            state.libraryDragBlockId = null;
            state.slotInsertIndex = null;
            clearInsertPreview();
        });

        shell.append(module);
        preview.append(shell);
        body.append(topline, metaRow, preview);
        item.append(body);
        item.addEventListener("click", () => {
            state.selectedLibraryBlockId = block.id;
            renderLibrary();
        });
        item.addEventListener("dblclick", () => {
            insertLibraryBlockAt(block, 0);
        });

        blockLibrary.appendChild(item);
    });
}

function renderAnnotations() {
    if (!bottomAnnotation) {
        return;
    }
    bottomAnnotation.innerHTML = "";
    applyScrewTrackWidth(bottomAnnotation);
    if (screwStageWrap) {
        applyScrewTrackWidth(screwStageWrap);
    }
    const layoutBlocks = getLayoutBlocks();
    const stageWidths = getStagePixelWidths(layoutBlocks.map(({ block }) => block));

    layoutBlocks.forEach(({ block }, index) => {
        const bottomItem = document.createElement("div");
        bottomItem.className = "annotation-item";
        applyStageBlockWidth(bottomItem, stageWidths[index]);
        const bottomLabel = document.createElement("div");
        bottomLabel.className = "annotation-label";
        bottomLabel.textContent = `${block.code} · ${block.length}`;
        bottomItem.appendChild(bottomLabel);

        bottomAnnotation.appendChild(bottomItem);
    });
}

function renderAnnotationsForTarget(target, layoutBlocks, screw, scale = state.lengthScale) {
    if (!target) {
        return;
    }
    target.innerHTML = "";
    applyScrewTrackWidth(target, getScrewLength(screw), scale, getScrewHeadLength(screw));
    const stageWidths = getStagePixelWidths(layoutBlocks.map(({ block }) => block), scale);

    layoutBlocks.forEach(({ block }, index) => {
        const bottomItem = document.createElement("div");
        bottomItem.className = "annotation-item";
        applyStageBlockWidth(bottomItem, stageWidths[index], scale);
        const bottomLabel = document.createElement("div");
        bottomLabel.className = "annotation-label";
        bottomLabel.textContent = `${block.code} · ${block.length}`;
        bottomItem.appendChild(bottomLabel);
        target.appendChild(bottomItem);
    });
}

function populateSleeveTemplateOptions(screw = getScrewById(state.editingScrewId)) {
    if (!sleeveApplySourceSelect) {
        return;
    }
    const currentScrewId = screw?.id || "";
    const sourceScrews = state.screws.filter((item) => item.id !== currentScrewId);
    sleeveApplySourceSelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = sourceScrews.length ? "选择要套用的螺杆" : "暂无可套用的其他螺杆";
    sleeveApplySourceSelect.appendChild(placeholder);

    sourceScrews.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.name;
        sleeveApplySourceSelect.appendChild(option);
    });

    sleeveApplySourceSelect.disabled = sourceScrews.length === 0;
    if (applySleeveTemplateButton) {
        applySleeveTemplateButton.disabled = sourceScrews.length === 0;
    }
}

function applySleeveTemplateFromScrew(sourceScrewId) {
    const sourceScrew = getScrewById(sourceScrewId);
    if (!sourceScrew) {
        showToast("请选择要套用的螺杆。");
        return;
    }
    if (leadSleeveNameInput) {
        leadSleeveNameInput.value = getLeadSleeveName(sourceScrew);
    }
    if (sleeveEditor) {
        const sleeveInputs = Array.from(sleeveEditor.querySelectorAll("input[data-sleeve-index]"));
        const exhaustInputs = Array.from(sleeveEditor.querySelectorAll("input[data-exhaust-index]"));
        const sleeves = getScrewSleeves(sourceScrew);
        const exhaustChannels = getExhaustChannels(sourceScrew);
        sleeveInputs.forEach((input, index) => {
            input.value = sleeves[index] || `套筒 ${index + 1}`;
        });
        exhaustInputs.forEach((input, index) => {
            input.checked = Boolean(exhaustChannels[index]);
        });
    }
    showToast(`已套用螺杆“${sourceScrew.name}”的套筒设置。`);
}

function renderSleeveOverlay() {
    if (!sleeveOverlay) {
        return;
    }
    sleeveOverlay.innerHTML = "";
    sleeveOverlay.classList.toggle("is-hidden", !state.sleevesVisible);
    applyScrewTrackWidth(sleeveOverlay);
    const sleeveSections = getSleeveSections();
    const sleeveWidths = getRoundedPixelWidths(sleeveSections.map(({ length }) => length));
    sleeveOverlay.style.gridTemplateColumns = sleeveWidths.map((width) => `${width}px`).join(" ");

    sleeveSections.forEach((section) => {
        const zone = document.createElement("div");
        zone.className = "machine-zone";
        if (section.isLead) {
            zone.classList.add("machine-zone-lead");
        }
        if (section.name) {
            const head = document.createElement("div");
            head.className = "machine-zone-head";
            head.textContent = section.name;
            zone.append(head);
        }
        sleeveOverlay.appendChild(zone);
    });
}

function renderSleeveOverlayForTarget(target, screw, scale = state.lengthScale, sleevesVisible = state.sleevesVisible) {
    if (!target) {
        return;
    }
    target.innerHTML = "";
    target.classList.toggle("is-hidden", !sleevesVisible);
    applyScrewTrackWidth(target, getScrewLength(screw), scale, getScrewHeadLength(screw));
    const sleeveSections = getSleeveSections(screw);
    const sleeveWidths = getRoundedPixelWidths(sleeveSections.map(({ length }) => length), scale);
    target.style.gridTemplateColumns = sleeveWidths.map((width) => `${width}px`).join(" ");

    sleeveSections.forEach((section) => {
        const zone = document.createElement("div");
        zone.className = "machine-zone";
        if (section.isLead) {
            zone.classList.add("machine-zone-lead");
        }
        if (section.name) {
            const head = document.createElement("div");
            head.className = "machine-zone-head";
            head.textContent = section.name;
            zone.append(head);
        }
        target.appendChild(zone);
    });
}

function renderStage() {
    screwStage.innerHTML = "";
    applyScrewTrackWidth(screwStage);
    if (screwStageWrap) {
        applyScrewTrackWidth(screwStageWrap);
    }

    const leftCap = document.createElement("div");
    leftCap.className = "stage-cap left";
    const rightCap = document.createElement("div");
    rightCap.className = "stage-cap right";
    const sleeveStageOverlay = document.createElement("div");
    sleeveStageOverlay.className = "sleeve-stage-overlay";
    sleeveStageOverlay.classList.toggle("is-hidden", !state.sleevesVisible);
    const sleeveSections = getSleeveSections();
    const exhaustChannels = getExhaustChannels();
    const sleeveWidths = getRoundedPixelWidths(sleeveSections.map(({ length }) => length));
    sleeveStageOverlay.style.gridTemplateColumns = sleeveWidths.map((width) => `${width}px`).join(" ");

    sleeveSections.forEach((section, index) => {
        const zone = document.createElement("div");
        zone.className = "sleeve-stage-zone";
        if (section.isLead) {
            zone.classList.add("lead-sleeve-stage-zone");
        }

        const shellTop = document.createElement("div");
        shellTop.className = "sleeve-stage-shell top";

        const shellBottom = document.createElement("div");
        shellBottom.className = "sleeve-stage-shell bottom";

        if (!section.isLead && exhaustChannels[index - 1]) {
            const exhaustHole = document.createElement("div");
            exhaustHole.className = "sleeve-stage-hole";
            exhaustHole.setAttribute("aria-label", `${section.name} 排气孔`);
            zone.appendChild(exhaustHole);
        }

        zone.append(shellTop, shellBottom);
        sleeveStageOverlay.appendChild(zone);
    });

    screwStage.append(sleeveStageOverlay, leftCap, rightCap);

    const layoutBlocks = getLayoutBlocks();
    const stageWidths = getStagePixelWidths(layoutBlocks.map(({ block }) => block));

    layoutBlocks.forEach(({ item, block }, index) => {
        const slot = document.createElement("div");
        slot.className = "slot";
        slot.dataset.slotId = item.id;
        slot.dataset.blockId = block.id;
        applyStageBlockWidth(slot, stageWidths[index]);
        if (state.selectedBlockId === item.id) {
            slot.classList.add("selected");
        }

        const module = createModuleElement(block);
        slot.appendChild(module);

        slot.addEventListener("click", () => {
            if (Date.now() < state.ignoreSlotClickUntil) {
                return;
            }
            state.selectedBlockId = item.id;
            renderAll();
        });

        slot.addEventListener("pointerdown", (event) => {
            if (event.button !== 0) {
                return;
            }
            event.preventDefault();
            const rect = slot.getBoundingClientRect();
            state.pendingSlotDrag = {
                slotId: item.id,
                originalIndex: state.layout.findIndex((entry) => entry.id === item.id),
                startX: event.clientX,
                startY: event.clientY,
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top
            };
        });

        screwStage.appendChild(slot);
    });

    applyInsertPreview(state.slotInsertIndex);
}

function renderStageForTarget(target, screw, layoutBlocks, scale = state.lengthScale, sleevesVisible = state.sleevesVisible) {
    if (!target) {
        return;
    }
    target.innerHTML = "";
    applyScrewTrackWidth(target, getScrewLength(screw), scale, getScrewHeadLength(screw));

    const leftCap = document.createElement("div");
    leftCap.className = "stage-cap left";
    const rightCap = document.createElement("div");
    rightCap.className = "stage-cap right";
    const sleeveStageOverlay = document.createElement("div");
    sleeveStageOverlay.className = "sleeve-stage-overlay";
    sleeveStageOverlay.classList.toggle("is-hidden", !sleevesVisible);
    const sleeveSections = getSleeveSections(screw);
    const exhaustChannels = getExhaustChannels(screw);
    const sleeveWidths = getRoundedPixelWidths(sleeveSections.map(({ length }) => length), scale);
    sleeveStageOverlay.style.gridTemplateColumns = sleeveWidths.map((width) => `${width}px`).join(" ");

    sleeveSections.forEach((section, index) => {
        const zone = document.createElement("div");
        zone.className = "sleeve-stage-zone";
        if (section.isLead) {
            zone.classList.add("lead-sleeve-stage-zone");
        }

        const shellTop = document.createElement("div");
        shellTop.className = "sleeve-stage-shell top";

        const shellBottom = document.createElement("div");
        shellBottom.className = "sleeve-stage-shell bottom";

        if (!section.isLead && exhaustChannels[index - 1]) {
            const exhaustHole = document.createElement("div");
            exhaustHole.className = "sleeve-stage-hole";
            exhaustHole.setAttribute("aria-label", `${section.name} 排气孔`);
            zone.appendChild(exhaustHole);
        }

        zone.append(shellTop, shellBottom);
        sleeveStageOverlay.appendChild(zone);
    });

    target.append(sleeveStageOverlay, leftCap, rightCap);

    const stageWidths = getStagePixelWidths(layoutBlocks.map(({ block }) => block), scale);
    layoutBlocks.forEach(({ block }, index) => {
        const slot = document.createElement("div");
        slot.className = "slot";
        applyStageBlockWidth(slot, stageWidths[index], scale);
        slot.appendChild(createModuleElement(block));
        target.appendChild(slot);
    });
}

function createStageWrapSnapshot(screw, layout, scale = state.lengthScale, sleevesVisible = state.sleevesVisible) {
    const wrap = document.createElement("div");
    wrap.className = "screw-stage-wrap";

    const overlay = document.createElement("div");
    overlay.className = "machine-shell";

    const stage = document.createElement("div");
    stage.className = "screw-stage";

    const annotation = document.createElement("div");
    annotation.className = "annotation annotation-bottom";

    const layoutBlocks = getLayoutBlocksFromLayout(normalizeLayoutSnapshot(layout, state.blocks));

    applyScrewTrackWidth(wrap, getScrewLength(screw), scale, getScrewHeadLength(screw));
    renderSleeveOverlayForTarget(overlay, screw, scale, sleevesVisible);
    renderStageForTarget(stage, screw, layoutBlocks, scale, sleevesVisible);
    renderAnnotationsForTarget(annotation, layoutBlocks, screw, scale);

    wrap.append(overlay, stage, annotation);
    return wrap;
}

function populateBlockForm(block) {
    if (!block) {
        editingBlockIdInput.value = "";
        blockCodeInput.value = "";
        blockLengthInput.value = "";
        blockQuantityInput.value = "";
        blockTypeInput.value = "conveying";
        if (blockPatternStyleInput) {
            blockPatternStyleInput.value = defaultPatternStyleByType.conveying;
        }
        if (blockColorInput) {
            blockColorInput.value = defaultColorByType.conveying;
        }
        blockDescriptionInput.value = "";
        deleteCurrentBlockButton.disabled = true;
        renderBlockPreview();
        return;
    }
    editingBlockIdInput.value = block.id;
    blockCodeInput.value = block.code;
    blockLengthInput.value = block.length;
    blockQuantityInput.value = Number.isFinite(block.quantity) ? String(block.quantity) : "";
    blockTypeInput.value = block.type;
    if (blockPatternStyleInput) {
        blockPatternStyleInput.value = getBlockPatternStyle(block);
    }
    if (blockColorInput) {
        blockColorInput.value = getBlockColor(block);
    }
    blockDescriptionInput.value = block.description || "";
    deleteCurrentBlockButton.disabled = false;
    renderBlockPreview();
}

function renderManagementList(preservedScrollTop = blockList?.scrollTop ?? 0) {
    const scrollTop = preservedScrollTop;
    blockList.innerHTML = "";

    state.blocks.forEach((block) => {
        const usedCount = getUsedBlockCount(block.id);
        const totalCount = Number.isFinite(block.quantity) ? block.quantity : "-";
        const item = document.createElement("article");
        item.className = "management-item";
        if (editingBlockIdInput.value === block.id) {
            item.classList.add("selected");
        }

        const topline = document.createElement("div");
        topline.className = "management-topline";

        const codeTitle = document.createElement("strong");
        codeTitle.className = "management-name";
        codeTitle.textContent = block.code;

        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = getTypeLabel(block.type);
        topline.append(codeTitle, chip);

        const meta = document.createElement("p");
        meta.className = "management-meta";
        meta.textContent = `长度：${block.length} mm · 已用：${usedCount} · 总量：${totalCount}`;

        const description = document.createElement("p");
        description.className = "management-meta";
        description.textContent = block.description || "未填写工艺说明";

        item.append(topline, meta, description);
        item.addEventListener("click", () => {
            const currentScrollTop = blockList.scrollTop;
            populateBlockForm(block);
            renderManagementList(currentScrollTop);
        });
        blockList.appendChild(item);
    });

    blockList.scrollTop = scrollTop;
}

function renderHistoryList() {
    historyList.innerHTML = "";
    const keyword = state.historySearch.trim().toLowerCase();
    const filteredHistory = state.history.filter((record) => {
        const haystack = `${record.name || ""} ${record.screwName || ""} ${record.note || ""}`.toLowerCase();
        return !keyword || haystack.includes(keyword);
    });

    if (!state.history.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "还没有保存过历史方案。";
        historyList.appendChild(empty);
        return;
    }

    if (!filteredHistory.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "没有找到匹配的历史方案。";
        historyList.appendChild(empty);
        return;
    }

    filteredHistory.forEach((record) => {
        const item = document.createElement("article");
        item.className = "history-item";

        const topline = document.createElement("div");
        topline.className = "history-topline";

        const name = document.createElement("strong");
        name.className = "history-name";
        name.textContent = record.name;

        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = `${record.layout.length} 块`;
        topline.append(name, chip);

        const meta = document.createElement("p");
        meta.className = "history-meta";
        const screwText = record.screwName ? ` · 螺杆：${record.screwName}` : "";
        meta.textContent = `保存时间：${new Date(record.savedAt).toLocaleString("zh-CN")}${screwText}`;

        const note = document.createElement("p");
        note.className = "history-meta";
        note.textContent = record.note ? `备注：${record.note}` : "备注：无";

        const actions = document.createElement("div");
        actions.className = "form-actions";

        const previewButton = document.createElement("button");
        previewButton.type = "button";
        previewButton.className = "btn ghost";
        previewButton.textContent = "预览";
        previewButton.addEventListener("click", () => {
            openHistoryPreviewModal(record);
        });

        const useButton = document.createElement("button");
        useButton.type = "button";
        useButton.className = "btn";
        useButton.textContent = "应用该方案";
        useButton.addEventListener("click", () => {
            applyHistoryRecord(record);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "btn secondary";
        deleteButton.textContent = "删除方案";
        deleteButton.addEventListener("click", () => {
            openDeleteConfirmModal(`确认删除历史方案“${record.name}”吗？`, () => {
                animateListRemoval(item, () => {
                    state.history = state.history.filter((itemRecord) => itemRecord.id !== record.id);
                    if (state.activeHistoryId === record.id) {
                        state.activeHistoryId = "";
                    }
                    persistState();
                    renderHistoryList();
                    showToast("历史方案已删除。");
                });
            });
        });

        actions.append(previewButton, useButton, deleteButton);
        item.append(topline, meta, note, actions);
        historyList.appendChild(item);
    });
}

function updateMetrics() {
    const activeScrew = getActiveScrew();
    const screwLength = getScrewLength(activeScrew);
    const usedLength = getLayoutTotalLength();
    const remainingLength = Math.max(0, screwLength - usedLength);
    const currentLineNameEl = document.getElementById("current-line-name");
    const currentLineLengthEl = document.getElementById("current-line-length");
    const currentBlockCountEl = document.getElementById("current-block-count");
    const currentUsedLengthEl = document.getElementById("current-used-length");
    const currentRemainingLengthEl = document.getElementById("current-remaining-length");
    const currentLengthScaleEl = document.getElementById("current-length-scale");
    const currentLayoutNameEl = document.getElementById("current-layout-name");
    const activeHistoryRecord = getActiveHistoryRecord();

    if (currentLineNameEl) {
        currentLineNameEl.textContent = activeScrew?.name || DEFAULT_LINE_NAME;
    }
    if (currentLineLengthEl) {
        currentLineLengthEl.textContent = `${screwLength} mm`;
    }
    if (currentBlockCountEl) {
        currentBlockCountEl.textContent = String(state.layout.length);
    }
    if (currentUsedLengthEl) {
        currentUsedLengthEl.textContent = `${usedLength} mm`;
    }
    if (currentRemainingLengthEl) {
        currentRemainingLengthEl.textContent = `${remainingLength} mm`;
    }
    if (currentLengthScaleEl) {
        currentLengthScaleEl.textContent = String(state.lengthScale);
    }
    if (currentLayoutNameEl) {
        currentLayoutNameEl.textContent = activeHistoryRecord?.name || "未绑定方案";
    }
}

function renderActiveScrewOptions() {
    if (!activeScrewSelect) {
        return;
    }
    activeScrewSelect.innerHTML = "";
    state.screws.forEach((screw) => {
        const option = document.createElement("option");
        option.value = screw.id;
        option.textContent = `${screw.name} · ${screw.length} mm`;
        activeScrewSelect.appendChild(option);
    });
    activeScrewSelect.value = state.activeScrewId;
}

function populateScrewSettingsForm(screw = getScrewById(state.editingScrewId)) {
    if (!screwSettingsForm) {
        return;
    }
    editingScrewIdInput.value = screw?.id || "";
    screwNameInput.value = screw?.name || "";
    screwLengthInput.value = screw ? String(screw.length) : String(DEFAULT_LINE_LENGTH);
    screwHeadLengthInput.value = screw ? String(getScrewHeadLength(screw)) : String(DEFAULT_HEAD_LENGTH);
    if (leadSleeveNameInput) {
        leadSleeveNameInput.value = screw ? getLeadSleeveName(screw) : DEFAULT_LEAD_SLEEVE_NAME;
    }
    renderSleeveEditor(screw);
    populateSleeveTemplateOptions(screw);
    if (deleteScrewButton) {
        deleteScrewButton.disabled = !screw || state.screws.length <= 1;
    }
}

function renderScrewList() {
    if (!screwList) {
        return;
    }
    screwList.innerHTML = "";

    state.screws.forEach((screw) => {
        const item = document.createElement("article");
        item.className = "management-item";
        if (state.editingScrewId === screw.id) {
            item.classList.add("selected");
        }

        const topline = document.createElement("div");
        topline.className = "management-topline";

        const name = document.createElement("strong");
        name.className = "management-name";
        name.textContent = screw.name;

        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = screw.id === state.activeScrewId ? "当前使用" : "可切换";
        topline.append(name, chip);

        const meta = document.createElement("p");
        meta.className = "management-meta";
        meta.textContent = `长度：${screw.length} mm · 螺杆头：${getScrewHeadLength(screw)} mm · ${getLeadSleeveName(screw)}：30 mm + 主套筒 ${SLEEVE_COUNT} 个`;

        item.append(topline, meta);
        item.addEventListener("click", () => {
            state.editingScrewId = screw.id;
            populateScrewSettingsForm(screw);
            renderScrewList();
        });
        screwList.appendChild(item);
    });
}

function populateSystemSettingsForm() {
    if (systemProjectNameInput) {
        systemProjectNameInput.value = state.projectName;
    }
    if (systemLengthScaleInput) {
        systemLengthScaleInput.value = String(state.lengthScale);
    }
    if (systemInsertDurationInput) {
        systemInsertDurationInput.value = String(state.insertAnimationMs);
    }
    const deleteAnimationInput = document.querySelector(`input[name="system-delete-animation"][value="${state.deleteAnimationStyle || DEFAULT_DELETE_ANIMATION_STYLE}"]`);
    if (deleteAnimationInput) {
        deleteAnimationInput.checked = true;
    }
    if (systemPrintCurrentLayoutInput) {
        systemPrintCurrentLayoutInput.checked = Boolean(state.printOptions.currentLayout);
    }
    if (systemPrintBlockCountInput) {
        systemPrintBlockCountInput.checked = Boolean(state.printOptions.blockCount);
    }
    if (systemPrintScrewLengthInput) {
        systemPrintScrewLengthInput.checked = Boolean(state.printOptions.screwLength);
    }
}

function updateLibraryCollapseUI() {
    workspaceGrid.classList.toggle("library-collapsed", state.libraryCollapsed);
    toggleLibraryButton.textContent = state.libraryCollapsed ? "展开模块库" : "收起模块库";
    if (toggleSleevesButton) {
        toggleSleevesButton.textContent = state.sleevesVisible ? "隐藏套筒" : "显示套筒";
    }
}

function showToast(message) {
    if (state.toastTimer) {
        clearTimeout(state.toastTimer);
    }
    appToast.textContent = message;
    appToast.hidden = false;
    state.toastTimer = window.setTimeout(() => {
        appToast.hidden = true;
    }, 2400);
}

function animateListRemoval(element, onComplete) {
    if (!element) {
        onComplete?.();
        return;
    }
    const animationStyle = state.deleteAnimationStyle || DEFAULT_DELETE_ANIMATION_STYLE;
    const duration = 320;
    const computed = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const startPaddingTop = computed.paddingTop;
    const startPaddingBottom = computed.paddingBottom;
    const startMarginTop = computed.marginTop;
    const startMarginBottom = computed.marginBottom;

    element.style.pointerEvents = "none";
    element.style.overflow = "hidden";

    let frames;
    if (animationStyle === "slide-right") {
        frames = [
            { opacity: 1, transform: "translateX(0)" },
            { opacity: 0, transform: "translateX(96px)" }
        ];
    } else if (animationStyle === "fade-scale") {
        frames = [
            { opacity: 1, transform: "scale(1)" },
            { opacity: 0, transform: "scale(0.82)" }
        ];
    } else {
        frames = [
            {
                opacity: 1,
                transform: "scaleY(1)",
                height: `${Math.ceil(rect.height)}px`,
                maxHeight: `${Math.ceil(rect.height)}px`,
                paddingTop: startPaddingTop,
                paddingBottom: startPaddingBottom,
                marginTop: startMarginTop,
                marginBottom: startMarginBottom,
                borderTopWidth: computed.borderTopWidth,
                borderBottomWidth: computed.borderBottomWidth
            },
            {
                opacity: 0,
                transform: "scaleY(0.88)",
                height: "0px",
                maxHeight: "0px",
                paddingTop: "0px",
                paddingBottom: "0px",
                marginTop: "0px",
                marginBottom: "0px",
                borderTopWidth: "0px",
                borderBottomWidth: "0px"
            }
        ];
    }

    if (typeof element.animate !== "function") {
        onComplete?.();
        return;
    }

    const animation = element.animate(frames, {
        duration,
        easing: "ease",
        fill: "forwards"
    });

    animation.addEventListener("finish", () => {
        onComplete?.();
    }, { once: true });
}

function openSaveLayoutModal() {
    const activeRecord = state.activeHistoryId ? state.history.find((record) => record.id === state.activeHistoryId) : null;
    if (saveLayoutTargetSelect) {
        saveLayoutTargetSelect.innerHTML = "";
        state.history.forEach((record) => {
            const option = document.createElement("option");
            option.value = record.id;
            option.textContent = record.name;
            saveLayoutTargetSelect.appendChild(option);
        });
    }
    if (saveLayoutModeOverwriteInput) {
        saveLayoutModeOverwriteInput.disabled = state.history.length === 0;
    }
    if (activeRecord) {
        saveLayoutModeOverwriteInput.checked = true;
        if (saveLayoutTargetSelect) {
            saveLayoutTargetSelect.value = activeRecord.id;
        }
        saveLayoutNameInput.value = activeRecord.name;
        saveLayoutNoteInput.value = activeRecord.note || "";
    } else {
        saveLayoutModeNewInput.checked = true;
        saveLayoutNameInput.value = "";
        saveLayoutNoteInput.value = "";
    }
    updateSaveLayoutModeUI();
    saveLayoutModal.hidden = false;
    saveLayoutNameInput.focus();
}

function closeSaveLayoutModal() {
    saveLayoutModal.hidden = true;
}

function updateSaveLayoutModeUI() {
    const isOverwrite = Boolean(saveLayoutModeOverwriteInput?.checked);
    if (saveLayoutTargetWrap) {
        saveLayoutTargetWrap.hidden = !isOverwrite;
        saveLayoutTargetWrap.style.display = isOverwrite ? "grid" : "none";
    }
    if (saveLayoutNameWrap) {
        saveLayoutNameWrap.hidden = isOverwrite;
        saveLayoutNameWrap.style.display = isOverwrite ? "none" : "grid";
    }
    if (saveLayoutNameInput) {
        saveLayoutNameInput.required = !isOverwrite;
    }
}

function saveLayout(name, note, options = {}) {
    const activeScrew = getActiveScrew();
    const snapshot = state.layout.map((item) => ({
        id: item.id,
        blockId: item.blockId
    }));
    if (options.mode === "overwrite" && options.targetId) {
        const target = state.history.find((record) => record.id === options.targetId);
        if (target) {
            target.name = name;
            target.note = note;
            target.savedAt = new Date().toISOString();
            target.screwId = activeScrew?.id || "";
            target.screwName = activeScrew?.name || "";
            target.layout = snapshot;
            state.activeHistoryId = target.id;
            persistState();
            renderHistoryList();
            return;
        }
    }
    const record = {
        id: nextId("history"),
        name,
        note,
        savedAt: new Date().toISOString(),
        screwId: activeScrew?.id || "",
        screwName: activeScrew?.name || "",
        layout: snapshot
    };
    state.history.unshift(record);
    state.activeHistoryId = record.id;
    persistState();
    renderHistoryList();
}

function switchPage(pageId) {
    state.currentPage = pageId;
    navItems.forEach((item) => {
        item.classList.toggle("active", item.dataset.page === pageId);
    });
    pages.forEach((page) => {
        page.classList.toggle("active", page.id === pageId);
    });
}

function getStageInsertIndex(clientX) {
    const slots = Array.from(screwStage.querySelectorAll(".slot[data-slot-id]"));
    if (!slots.length) {
        return 0;
    }
    for (let index = 0; index < slots.length; index += 1) {
        const rect = slots[index].getBoundingClientRect();
        if (clientX < rect.left + rect.width / 2) {
            return index;
        }
    }
    return slots.length;
}

function isPointInsideElement(clientX, clientY, element) {
    const rect = element.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function canDeleteDraggedSlot() {
    return true;
}

function updateDeleteDropzoneState(isVisible, isActive) {
    deleteDropzone.classList.toggle("visible", isVisible);
    deleteDropzone.classList.toggle("active", isVisible && isActive);
    deleteDropzone.classList.toggle("disabled", false);
    deleteDropzone.textContent = "将右侧螺纹块向下拖到这里即可删除";
}

function removeFloatingDragElement() {
    if (state.slotDrag?.floatingEl?.isConnected) {
        state.slotDrag.floatingEl.remove();
    }
}

function moveFloatingElement(clientX, clientY) {
    if (!state.slotDrag?.floatingEl) {
        return;
    }
    const { floatingEl, offsetX, offsetY } = state.slotDrag;
    floatingEl.style.transform = `translate(${clientX - offsetX}px, ${clientY - offsetY}px)`;
}

function startSlotDrag(event) {
    if (!state.pendingSlotDrag) {
        return;
    }
    const pending = state.pendingSlotDrag;
    const originalIndex = state.layout.findIndex((entry) => entry.id === pending.slotId);
    if (originalIndex === -1) {
        state.pendingSlotDrag = null;
        return;
    }

    const previousRects = captureStageSlotRects();
    const [removedItem] = state.layout.splice(originalIndex, 1);
    const block = getBlockById(removedItem.blockId);
    if (!block) {
        state.pendingSlotDrag = null;
        return;
    }

    const floatingEl = document.createElement("div");
    floatingEl.className = "slot drag-floating";
    applyStageBlockWidth(floatingEl, block);
    floatingEl.appendChild(createModuleElement(block));
    document.body.appendChild(floatingEl);

    state.slotDrag = {
        slotId: pending.slotId,
        removedItem,
        originalIndex,
        offsetX: pending.offsetX,
        offsetY: pending.offsetY,
        floatingEl,
        insertIndex: originalIndex,
        justStarted: true
    };
    state.selectedBlockId = pending.slotId;
    state.pendingSlotDrag = null;
    document.body.classList.add("slot-dragging");
    moveFloatingElement(event.clientX, event.clientY);
    renderAll(previousRects);
    updateDeleteDropzoneState(true, false);
}

function cancelPendingSlotDrag() {
    state.pendingSlotDrag = null;
}

function finishSlotDrag(clientX, clientY, cancelled = false) {
    if (!state.slotDrag) {
        return;
    }
    const drag = state.slotDrag;
    const previousRects = captureStageSlotRects();
    const overDelete = isPointInsideElement(clientX, clientY, deleteDropzone);

    removeFloatingDragElement();
    document.body.classList.remove("slot-dragging");
    clearInsertPreview();
    state.slotInsertIndex = null;
    state.ignoreSlotClickUntil = Date.now() + 180;

    if (!cancelled && overDelete && canDeleteDraggedSlot()) {
        state.slotDrag = null;
        updateDeleteDropzoneState(false, false);
        persistState();
        renderAll(previousRects);
        showToast("螺纹块已删除。");
        return;
    }

    let insertIndex = drag.originalIndex;
    if (!cancelled && isPointInsideElement(clientX, clientY, screwStage)) {
        insertIndex = Math.min(Math.max(drag.insertIndex ?? drag.originalIndex, 0), state.layout.length);
    } else {
        insertIndex = Math.min(Math.max(drag.originalIndex, 0), state.layout.length);
    }

    state.layout.splice(insertIndex, 0, drag.removedItem);
    state.slotDrag = null;
    updateDeleteDropzoneState(false, false);
    persistState();
    renderAll(previousRects);
}

function handleSlotPointerMove(event) {
    if (state.pendingSlotDrag) {
        const distanceX = Math.abs(event.clientX - state.pendingSlotDrag.startX);
        const distanceY = Math.abs(event.clientY - state.pendingSlotDrag.startY);
        if (distanceX >= DRAG_THRESHOLD || distanceY >= DRAG_THRESHOLD) {
            startSlotDrag(event);
        }
    }

    if (!state.slotDrag) {
        return;
    }

    if (event.buttons === 0) {
        finishSlotDrag(event.clientX, event.clientY, false);
        return;
    }

    moveFloatingElement(event.clientX, event.clientY);
    updateDeleteDropzoneState(true, isPointInsideElement(event.clientX, event.clientY, deleteDropzone));

    if (state.slotDrag.justStarted) {
        state.slotDrag.justStarted = false;
        return;
    }

    if (isPointInsideElement(event.clientX, event.clientY, screwStage)) {
        const index = getStageInsertIndex(event.clientX);
        state.slotDrag.insertIndex = index;
        state.slotInsertIndex = index;
        applyInsertPreview(index);
    } else {
        state.slotInsertIndex = null;
        clearInsertPreview();
    }
}

function handleStageDragOver(event) {
    if (!state.libraryDragBlockId) {
        return;
    }
    const block = getBlockById(state.libraryDragBlockId);
    const exceedsScrewLength = block ? !canAddBlockToCurrentLayout(block) : true;
    if (!block || isBlockDragDisabled(block) || exceedsScrewLength) {
        state.libraryDragBlockId = null;
        state.slotInsertIndex = null;
        clearInsertPreview();
        if (block && exceedsScrewLength) {
            showToast("螺纹块总长已超过当前螺杆长度，不能继续新增。");
        }
        return;
    }
    event.preventDefault();
    const insertIndex = getStageInsertIndex(event.clientX);
    state.slotInsertIndex = insertIndex;
    applyInsertPreview(insertIndex);
}

function handleStageDrop(event) {
    if (!state.libraryDragBlockId) {
        return;
    }
    event.preventDefault();
    const block = getBlockById(state.libraryDragBlockId);
    const exceedsScrewLength = block ? !canAddBlockToCurrentLayout(block) : true;
    if (!block || isBlockDragDisabled(block) || exceedsScrewLength) {
        state.libraryDragBlockId = null;
        state.slotInsertIndex = null;
        clearInsertPreview();
        showToast(
            block && exceedsScrewLength
                ? "螺纹块总长已超过当前螺杆长度，不能继续新增。"
                : "已达到该模块总数量，不能继续拖拽。"
        );
        return;
    }
    const insertIndex = state.slotInsertIndex ?? getStageInsertIndex(event.clientX);
    state.libraryDragBlockId = null;
    state.slotInsertIndex = null;
    clearInsertPreview();
    insertLibraryBlockAt(block, insertIndex);
}

function renderAll(previousRects = null) {
    document.documentElement.style.setProperty("--stage-insert-duration", `${state.insertAnimationMs}ms`);
    updateProjectTitle();
    renderLibrary();
    renderSleeveOverlay();
    renderAnnotations();
    renderStage();
    updateMetrics();
    populateSystemSettingsForm();
    renderActiveScrewOptions();
    renderScrewList();
    renderManagementList();
    renderHistoryList();
    updateLibraryCollapseUI();
    if (previousRects) {
        animateStageReflow(previousRects);
    }
}

function resetLayoutToDefault() {
    state.layout = getCurrentRestoreLayout().map((item) => ({
        id: nextId("slot"),
        blockId: item.blockId
    }));
    state.selectedBlockId = null;
    persistState();
    renderAll();
}

function clearCurrentLayout() {
    state.layout = [];
    state.selectedBlockId = null;
    persistState();
    renderAll();
}

function getDocumentStylesForPrint() {
    const cssChunks = [];
    Array.from(document.styleSheets).forEach((sheet) => {
        try {
            const rules = Array.from(sheet.cssRules || []);
            cssChunks.push(rules.map((rule) => rule.cssText).join("\n"));
        } catch (error) {
            // Ignore stylesheets that the browser won't expose.
        }
    });
    return cssChunks.join("\n");
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
    });
}

async function createSnapshotFromElement(sourceElement, snapshotRoot = null) {
    if (!sourceElement) {
        return null;
    }
    if (snapshotRoot) {
        snapshotRoot.innerHTML = "";
    }
    const clone = sourceElement.cloneNode(true);
    const dropzone = clone.querySelector("#delete-dropzone");
    dropzone?.remove();
    clone.classList.add("print-stage-copy", "print-stage-snapshot-source");
    clone.style.width = `${Math.ceil(sourceElement.getBoundingClientRect().width)}px`;
    clone.style.minWidth = clone.style.width;
    clone.style.height = `${Math.ceil(sourceElement.getBoundingClientRect().height)}px`;
    clone.style.minHeight = clone.style.height;
    clone.style.padding = getComputedStyle(sourceElement).padding;
    clone.style.overflow = "visible";

    const measureHost = document.createElement("div");
    measureHost.style.position = "fixed";
    measureHost.style.left = "-100000px";
    measureHost.style.top = "0";
    measureHost.style.visibility = "hidden";
    measureHost.style.pointerEvents = "none";
    measureHost.style.overflow = "visible";
    measureHost.appendChild(clone);
    document.body.appendChild(measureHost);

    const measuredNodes = [clone, ...clone.querySelectorAll("*")];
    const baseRect = clone.getBoundingClientRect();
    let minLeft = baseRect.left;
    let minTop = baseRect.top;
    let maxRight = baseRect.right;
    let maxBottom = baseRect.bottom;

    measuredNodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        if (!rect.width && !rect.height) {
            return;
        }
        minLeft = Math.min(minLeft, rect.left);
        minTop = Math.min(minTop, rect.top);
        maxRight = Math.max(maxRight, rect.right);
        maxBottom = Math.max(maxBottom, rect.bottom);
    });

    const offsetX = Math.ceil(baseRect.left - minLeft) + 2;
    const offsetY = Math.ceil(baseRect.top - minTop) + 2;
    const width = Math.ceil(maxRight - minLeft) + 4;
    const height = Math.ceil(maxBottom - minTop) + 4;

    const styles = getDocumentStylesForPrint();
    const svgMarkup = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <foreignObject width="100%" height="100%">
                <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:#ffffff;overflow:visible;">
                    <style>
                        ${styles}
                        .print-stage-snapshot-source {
                            margin: 0 !important;
                            background: #ffffff !important;
                        }
                    </style>
                    <div style="transform:translate(${offsetX}px, ${offsetY}px); transform-origin:top left; overflow:visible;">
                        ${clone.outerHTML}
                    </div>
                </div>
            </foreignObject>
        </svg>`;

    measureHost.remove();

    const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const snapshotUrl = URL.createObjectURL(svgBlob);
    await loadImage(snapshotUrl);

    return {
        url: snapshotUrl,
        width,
        height
    };
}

async function preparePrintStage() {
    if (!printStageRoot || !screwStageWrap) {
        return false;
    }
    const snapshot = await createSnapshotFromElement(screwStageWrap, printStageRoot);
    if (!snapshot) {
        return false;
    }
    if (printSnapshotUrl) {
        URL.revokeObjectURL(printSnapshotUrl);
        printSnapshotUrl = "";
    }
    printSnapshotUrl = snapshot.url;

    const frame = document.createElement("div");
    frame.className = "print-stage-frame";
    const image = document.createElement("img");
    image.className = "print-stage-image";
    image.src = printSnapshotUrl;
    image.alt = "当前螺杆打印快照";
    image.width = snapshot.width;
    image.height = snapshot.height;
    frame.appendChild(image);
    printStageRoot.appendChild(frame);
    return true;
}

async function updatePrintScale() {
    if (!printStageRoot) {
        return;
    }
    const prepared = await preparePrintStage();
    if (!prepared) {
        return;
    }
    const frame = printStageRoot.querySelector(".print-stage-frame");
    if (!frame) {
        return;
    }
    const frameWidth = frame.scrollWidth;
    const frameHeight = frame.scrollHeight;
    if (!frameWidth || !frameHeight) {
        document.documentElement.style.setProperty("--print-stage-scale", "1");
        return;
    }
    const maxWidth = Math.max(320, window.innerWidth - 64);
    const maxHeight = Math.max(240, window.innerHeight - 64);
    const scale = Math.min(1, maxWidth / frameWidth, maxHeight / frameHeight);
    document.documentElement.style.setProperty("--print-stage-scale", scale.toFixed(4));
}

function resetPrintScale() {
    document.documentElement.style.removeProperty("--print-stage-scale");
    if (printStageRoot) {
        printStageRoot.innerHTML = "";
    }
    if (printSnapshotUrl) {
        URL.revokeObjectURL(printSnapshotUrl);
        printSnapshotUrl = "";
    }
}

function getPrintMetaItems() {
    const printMeta = [];
    if (state.printOptions.currentLayout) {
        printMeta.push({
            label: "当前方案",
            value: getActiveHistoryRecord()?.name || "未绑定方案"
        });
    }
    if (state.printOptions.blockCount) {
        printMeta.push({
            label: "螺纹块数量",
            value: String(state.layout.length)
        });
    }
    if (state.printOptions.screwLength) {
        printMeta.push({
            label: "螺杆长度",
            value: `${getScrewLength()} mm`
        });
    }
    return printMeta;
}

function getPrintMetaMarkup(items = getPrintMetaItems()) {
    return items.length
        ? items.map((item) => `<div class="print-meta-item"><span class="print-meta-label">${item.label}</span><strong class="print-meta-value">${item.value}</strong></div>`).join("")
        : "";
}

function closePrintPreviewModal() {
    if (printPreviewModal) {
        printPreviewModal.hidden = true;
    }
}

function closeHistoryPreviewModal() {
    if (historyPreviewModal) {
        historyPreviewModal.hidden = true;
    }
    activePreviewHistoryId = "";
    if (historyPreviewSnapshotUrl) {
        URL.revokeObjectURL(historyPreviewSnapshotUrl);
        historyPreviewSnapshotUrl = "";
    }
    if (historyPreviewImage) {
        historyPreviewImage.removeAttribute("src");
    }
}

function openDeleteConfirmModal(message, onConfirm) {
    if (!confirmDeleteModal || !confirmDeleteMessage || !confirmDeleteButton) {
        onConfirm?.();
        return;
    }
    pendingDeleteAction = typeof onConfirm === "function" ? onConfirm : null;
    confirmDeleteMessage.textContent = message || "删除后将无法恢复。";
    confirmDeleteModal.hidden = false;
}

function closeDeleteConfirmModal() {
    if (confirmDeleteModal) {
        confirmDeleteModal.hidden = true;
    }
    pendingDeleteAction = null;
}

function getHistoryPreviewMetaItems(record, screw, layout) {
    return [
        {
            label: "方案名称",
            value: record.name || "未命名方案"
        },
        {
            label: "螺杆类型",
            value: screw?.name || record.screwName || "未绑定螺杆"
        },
        {
            label: "螺纹块数量",
            value: String(normalizeLayoutSnapshot(layout, state.blocks).length)
        },
        {
            label: "螺杆长度",
            value: `${getScrewLength(screw)} mm`
        },
        {
            label: "保存时间",
            value: new Date(record.savedAt).toLocaleString("zh-CN")
        }
    ];
}

async function openHistoryPreviewModal(record) {
    if (!record || !historyPreviewModal || !historyPreviewMeta || !historyPreviewImage) {
        return;
    }
    const screw = record.screwId ? getScrewById(record.screwId) : null;
    if (!screw) {
        showToast("该历史方案关联的螺杆已不存在，无法预览。");
        return;
    }

    const snapshotStage = createStageWrapSnapshot(screw, record.layout);
    const snapshot = await createSnapshotFromElement(snapshotStage);
    if (!snapshot) {
        showToast("历史方案预览生成失败。");
        return;
    }

    if (historyPreviewSnapshotUrl) {
        URL.revokeObjectURL(historyPreviewSnapshotUrl);
        historyPreviewSnapshotUrl = "";
    }
    historyPreviewSnapshotUrl = snapshot.url;
    activePreviewHistoryId = record.id;

    historyPreviewMeta.innerHTML = getPrintMetaMarkup(getHistoryPreviewMetaItems(record, screw, record.layout));
    historyPreviewImage.src = historyPreviewSnapshotUrl;
    historyPreviewModal.hidden = false;
}

async function openPrintPreviewModal() {
    if (!screwStageWrap || !printPreviewModal || !printPreviewImage || !printPreviewMeta) {
        return;
    }

    const prepared = await preparePrintStage();
    if (!prepared || !printSnapshotUrl) {
        showToast("当前螺杆打印快照生成失败。");
        return;
    }

    printPreviewMeta.innerHTML = getPrintMetaMarkup();
    printPreviewImage.src = printSnapshotUrl;
    printPreviewModal.hidden = false;
}

function openPrintWindow() {
    if (!printSnapshotUrl) {
        showToast("请先生成打印预览。");
        return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        showToast("请允许浏览器打开打印窗口。");
        return;
    }

    const printMeta = getPrintMetaItems();
    const printMetaMarkup = printMeta.length
        ? `<div class="print-meta">${getPrintMetaMarkup(printMeta)}</div>`
        : "";
    const snapshotWidth = Math.ceil(screwStageWrap.scrollWidth);
    const snapshotHeight = Math.ceil(screwStageWrap.scrollHeight);
    const popupHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>打印当前螺杆</title>
    <style>
        @page {
            size: landscape;
            margin: 8mm;
        }

        html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            overflow: hidden;
            background: #ffffff;
        }

        body.print-popup {
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
        }

        .print-page {
            width: 100%;
            min-height: 100%;
            padding: 8mm;
            box-sizing: border-box;
            position: relative;
            overflow: visible;
            background: #ffffff;
        }

        .print-meta {
            position: absolute;
            top: 8mm;
            left: 8mm;
            z-index: 2;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            align-items: stretch;
            justify-content: flex-start;
            max-width: calc(100% - 16mm);
        }

        .print-meta-item {
            min-width: 120px;
            padding: 8px 12px;
            border: 1px solid rgba(60, 60, 67, 0.14);
            background: rgba(255, 255, 255, 0.92);
            display: grid;
            gap: 4px;
        }

        .print-meta-label {
            font-size: 13px;
            color: #835331;
        }

        .print-meta-value {
            font-size: 16px;
            font-weight: 700;
            color: #22262b;
        }

        .print-image-wrap {
            position: absolute;
            inset: 8mm;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: visible;
        }

        .print-stage-image {
            display: block;
            width: auto;
            max-width: calc(100vw - 24mm);
            height: auto;
            max-height: calc(100vh - 24mm - 120px);
            object-fit: contain;
        }

        @media print {
            html, body {
                width: 100%;
                height: 100%;
                overflow: visible !important;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            .print-page {
                width: 100%;
                min-height: 100%;
                padding: 8mm;
                position: relative;
                overflow: visible !important;
                background: #ffffff !important;
            }
        }
    </style>
</head>
<body class="print-popup">
    <div class="print-page">
        ${printMetaMarkup}
        <div class="print-image-wrap">
            <img
                class="print-stage-image"
                src="${printSnapshotUrl}"
                alt="当前螺杆打印快照"
                width="${snapshotWidth}"
                height="${snapshotHeight}"
            >
        </div>
    </div>
    <script>
        window.addEventListener('load', function () {
            setTimeout(function () {
                window.focus();
                window.print();
            }, 180);
        });

        window.addEventListener('afterprint', function () {
            setTimeout(function () {
                window.close();
            }, 80);
        });
    <\/script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(popupHtml);
    printWindow.document.close();
}

navItems.forEach((item) => {
    item.addEventListener("click", () => {
        switchPage(item.dataset.page);
    });
});

blockSearchInput.addEventListener("input", (event) => {
    state.blockSearch = event.target.value;
    renderLibrary();
});

historySearchInput?.addEventListener("input", (event) => {
    state.historySearch = event.target.value;
    renderHistoryList();
});

toggleLibraryButton.addEventListener("click", () => {
    state.libraryCollapsed = !state.libraryCollapsed;
    persistState();
    updateLibraryCollapseUI();
});

clearLayoutButton?.addEventListener("click", () => {
    clearCurrentLayout();
    showToast("当前螺纹块已清空。");
});

printLayoutButton?.addEventListener("click", () => {
    openPrintPreviewModal();
});

cancelPrintPreviewButton?.addEventListener("click", () => {
    closePrintPreviewModal();
});

closeHistoryPreviewButton?.addEventListener("click", () => {
    closeHistoryPreviewModal();
});

cancelDeleteButton?.addEventListener("click", () => {
    closeDeleteConfirmModal();
});

confirmDeleteButton?.addEventListener("click", () => {
    const action = pendingDeleteAction;
    closeDeleteConfirmModal();
    action?.();
});

editHistoryPreviewButton?.addEventListener("click", () => {
    const record = state.history.find((item) => item.id === activePreviewHistoryId);
    if (!record) {
        showToast("当前预览方案不存在，无法进入编辑。");
        return;
    }
    closeHistoryPreviewModal();
    applyHistoryRecord(record);
});

confirmPrintPreviewButton?.addEventListener("click", () => {
    closePrintPreviewModal();
    openPrintWindow();
});

historyPreviewModal?.addEventListener("click", (event) => {
    if (event.target === historyPreviewModal) {
        closeHistoryPreviewModal();
    }
});

confirmDeleteModal?.addEventListener("click", (event) => {
    if (event.target === confirmDeleteModal) {
        closeDeleteConfirmModal();
    }
});

cancelImportDataButton?.addEventListener("click", () => {
    closeImportDataModal();
});

importDataModal?.addEventListener("click", (event) => {
    if (event.target === importDataModal) {
        closeImportDataModal();
    }
});

cancelExportDataButton?.addEventListener("click", () => {
    closeExportDataModal();
});

exportDataModal?.addEventListener("click", (event) => {
    if (event.target === exportDataModal) {
        closeExportDataModal();
    }
});

printPreviewModal?.addEventListener("click", (event) => {
    if (event.target === printPreviewModal) {
        closePrintPreviewModal();
    }
});

window.addEventListener("beforeprint", () => {
    if (!printStageRoot?.childElementCount) {
        updatePrintScale();
    }
});
window.addEventListener("afterprint", resetPrintScale);

toggleSleevesButton?.addEventListener("click", () => {
    state.sleevesVisible = !state.sleevesVisible;
    persistState();
    renderAll();
});

saveLayoutButton.addEventListener("click", () => {
    openSaveLayoutModal();
});

saveLayoutModeNewInput?.addEventListener("change", updateSaveLayoutModeUI);
saveLayoutModeOverwriteInput?.addEventListener("change", updateSaveLayoutModeUI);
saveLayoutTargetSelect?.addEventListener("change", () => {
    const target = state.history.find((record) => record.id === saveLayoutTargetSelect.value);
    if (!target) {
        return;
    }
    saveLayoutNameInput.value = target.name;
    saveLayoutNoteInput.value = target.note || "";
});

systemSettingsForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextProjectName = systemProjectNameInput?.value.trim() || DEFAULT_PROJECT_NAME;
    const nextLengthScale = Number(systemLengthScaleInput?.value);
    const nextInsertDuration = Number(systemInsertDurationInput?.value);
    const nextDeleteAnimationStyle = document.querySelector('input[name="system-delete-animation"]:checked')?.value || DEFAULT_DELETE_ANIMATION_STYLE;
    state.projectName = nextProjectName;
    if (!Number.isFinite(nextLengthScale) || nextLengthScale < 10 || nextLengthScale > 200) {
        showToast("默认长度映射值请输入 10 - 200 之间的数字。");
        return;
    }
    if (!Number.isFinite(nextInsertDuration) || nextInsertDuration < 0 || nextInsertDuration > 3000) {
        showToast("插入动画时间请输入 0 - 3000 之间的数字。");
        return;
    }
    state.lengthScale = nextLengthScale;
    state.insertAnimationMs = nextInsertDuration;
    state.deleteAnimationStyle = nextDeleteAnimationStyle;
    state.printOptions = {
        currentLayout: Boolean(systemPrintCurrentLayoutInput?.checked),
        blockCount: Boolean(systemPrintBlockCountInput?.checked),
        screwLength: Boolean(systemPrintScrewLengthInput?.checked)
    };
    persistState();
    renderAll();
    showToast("系统参数已保存。");
});

exportProjectDataButton?.addEventListener("click", () => {
    openExportDataModal();
});

importProjectDataButton?.addEventListener("click", () => {
    if (projectDataFileInput) {
        projectDataFileInput.value = "";
    }
    projectDataFileInput?.click();
});

projectDataFileInput?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
        return;
    }
    try {
        const text = await file.text();
        const rawData = JSON.parse(text);
        const payload = extractImportPayload(rawData);
        if (!payload) {
            event.target.value = "";
            showToast("备份文件格式无法识别，请重新选择。");
            return;
        }
        pendingImportPayload = payload;
        pendingImportFileName = file.name;
        if (importDataFileName) {
            importDataFileName.textContent = file.name;
        }
        if (importDataFileMeta) {
            importDataFileMeta.textContent = buildImportSummary(payload);
        }
        openImportDataModal();
    } catch (error) {
        console.warn("Failed to import backup:", error);
        event.target.value = "";
        showToast("备份文件读取失败，请确认是有效的 JSON 文件。");
    }
});

importDataForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!pendingImportPayload) {
        showToast("请先选择要导入的备份文件。");
        return;
    }
    const mode = document.querySelector('input[name="import-data-mode"]:checked')?.value === "append" ? "append" : "overwrite";
    const snapshot = buildImportedSnapshot(pendingImportPayload, mode);
    applyImportedSnapshot(snapshot);
    closeImportDataModal();
    switchPage("system-settings");
    showToast(mode === "append" ? "备份数据已追加到当前项目。" : "备份数据已覆盖导入。");
});

exportDataForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const options = {
        includeScrews: Boolean(exportIncludeScrewsInput?.checked),
        includeBlocks: Boolean(exportIncludeBlocksInput?.checked),
        includeLayout: Boolean(exportIncludeLayoutInput?.checked),
        includeHistory: Boolean(exportIncludeHistoryInput?.checked),
        includeSettings: Boolean(exportIncludeSettingsInput?.checked)
    };
    if (!Object.values(options).some(Boolean)) {
        showToast("请至少选择一项导出内容。");
        return;
    }
    const backup = {
        kind: BACKUP_FILE_KIND,
        version: BACKUP_FILE_VERSION,
        exportedAt: new Date().toISOString(),
        payload: buildSelectiveExportPayload(options)
    };
    downloadTextFile(getBackupFileName(), JSON.stringify(backup, null, 2));
    closeExportDataModal();
    showToast("项目数据已导出。");
});

applySleeveTemplateButton?.addEventListener("click", () => {
    applySleeveTemplateFromScrew(sleeveApplySourceSelect?.value || "");
});

resetLayoutButton.addEventListener("click", () => {
    resetLayoutToDefault();
    showToast("默认排布已恢复。");
});

saveLayoutForm.addEventListener("submit", (event) => {
    event.preventDefault();
    let name = saveLayoutNameInput.value.trim();
    const note = saveLayoutNoteInput.value.trim();
    if (!name && !saveLayoutModeOverwriteInput?.checked) {
        saveLayoutNameInput.focus();
        return;
    }
    const isOverwrite = Boolean(saveLayoutModeOverwriteInput?.checked);
    const targetId = saveLayoutTargetSelect?.value || "";
    if (isOverwrite && !targetId) {
        showToast("请先选择要覆盖的布局。");
        return;
    }
    if (isOverwrite) {
        const target = state.history.find((record) => record.id === targetId);
        name = target?.name || name;
    }
    saveLayout(name, note, {
        mode: isOverwrite ? "overwrite" : "new",
        targetId
    });
    closeSaveLayoutModal();
    showToast(isOverwrite ? `布局“${name}”已覆盖。` : `布局“${name}”已保存。`);
    switchPage("history");
});

cancelSaveLayoutButton.addEventListener("click", () => {
    closeSaveLayoutModal();
});

saveLayoutModal.addEventListener("click", (event) => {
    if (event.target === saveLayoutModal) {
        closeSaveLayoutModal();
    }
});

    if (screwSettingsForm) {
        screwSettingsForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const screwName = screwNameInput.value.trim();
            const screwLength = Number(screwLengthInput.value);
            const screwHeadLength = Number(screwHeadLengthInput.value);
            const leadSleeveName = normalizeLeadSleeveName(leadSleeveNameInput?.value);
            const screwSleeves = sleeveEditor
                ? normalizeSleeves(
                    Array.from(sleeveEditor.querySelectorAll("input[data-sleeve-index]")).map((input) => input.value)
                )
                : createDefaultSleeves();
            const exhaustChannels = sleeveEditor
                ? normalizeExhaustChannels(
                    Array.from(sleeveEditor.querySelectorAll("input[data-exhaust-index]")).map((input) => input.checked)
                )
                : normalizeExhaustChannels();

            if (
                !screwName
                || !Number.isFinite(screwLength)
                || screwLength <= 0
            || !Number.isFinite(screwHeadLength)
            || screwHeadLength <= 0
        ) {
            showToast("请先填写完整的螺杆名称、螺杆长度和螺杆头长度。");
            return;
        }

        const editingScrewId = editingScrewIdInput.value.trim();
        if (editingScrewId) {
            const target = getScrewById(editingScrewId);
            if (target) {
                if (target.id === state.activeScrewId && !canLayoutFitScrew(state.layout, { ...target, length: screwLength })) {
                    showToast("当前螺纹块总长已超过该长度，请先调整排布。");
                    return;
                }
                target.name = screwName;
                target.length = screwLength;
                target.headLength = screwHeadLength;
                target.leadSleeveName = leadSleeveName;
                target.sleeves = screwSleeves;
                target.exhaustChannels = exhaustChannels;
            }
            showToast("螺杆已更新。");
        } else {
            const newScrew = {
                id: nextId("screw"),
                name: screwName,
                length: screwLength,
                headLength: screwHeadLength,
                leadSleeveName,
                sleeves: screwSleeves,
                exhaustChannels,
                defaultLayout: normalizeLayoutSnapshot(state.layout, state.blocks)
            };
            state.screws.unshift(newScrew);
            state.editingScrewId = newScrew.id;
            showToast("螺杆已新增。");
        }

        if (!getScrewById(state.activeScrewId)) {
            state.activeScrewId = state.screws[0].id;
        }
        persistState();
        populateScrewSettingsForm();
        renderAll();
    });
}

activeScrewSelect?.addEventListener("change", (event) => {
    const targetScrewId = event.target.value;
    const targetScrew = getScrewById(targetScrewId);
    if (!targetScrew) {
        return;
    }
    if (!canLayoutFitScrew(state.layout, targetScrew)) {
        activeScrewSelect.value = state.activeScrewId;
        showToast("当前螺纹块总长已超过该螺杆长度，无法切换。");
        return;
    }
    state.activeScrewId = targetScrewId;
    state.activeHistoryId = "";
    persistState();
    renderAll();
    showToast("已切换当前螺杆。");
});

newScrewButton?.addEventListener("click", () => {
    state.editingScrewId = "";
    populateScrewSettingsForm(null);
    renderScrewList();
});

newBlockButton?.addEventListener("click", () => {
    populateBlockForm(null);
    renderManagementList();
    blockCodeInput?.focus();
});

deleteScrewButton?.addEventListener("click", () => {
    const editingScrewId = editingScrewIdInput.value.trim();
    if (!editingScrewId || state.screws.length <= 1) {
        return;
    }
    const target = getScrewById(editingScrewId);
    openDeleteConfirmModal(`确认删除螺杆“${target?.name || "当前螺杆"}”吗？`, () => {
        const selectedItem = screwList?.querySelector(".management-item.selected");
        animateListRemoval(selectedItem, () => {
            state.screws = state.screws.filter((screw) => screw.id !== editingScrewId);
            if (state.activeScrewId === editingScrewId) {
                state.activeScrewId = state.screws[0].id;
            }
            state.editingScrewId = state.screws[0]?.id || "";
            persistState();
            populateScrewSettingsForm(getScrewById(state.editingScrewId));
            renderAll();
            showToast("螺杆已删除。");
        });
    });
});

resetScrewSettingsButton?.addEventListener("click", () => {
    state.screws = [createDefaultScrew()];
    state.activeScrewId = state.screws[0].id;
    state.editingScrewId = state.screws[0].id;
    persistState();
    populateScrewSettingsForm(getScrewById(state.editingScrewId));
    renderAll();
    showToast("螺杆参数已恢复默认。");
});

screwStageWrap?.addEventListener("wheel", (event) => {
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;
    const nextValue = Math.max(10, Math.min(200, state.lengthScale + direction));
    if (nextValue === state.lengthScale) {
        return;
    }
    state.lengthScale = nextValue;
    persistState();
    renderAll();
}, { passive: false });

blockForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const code = blockCodeInput.value.trim();
    const length = Number(blockLengthInput.value);
    const quantity = Number(blockQuantityInput.value);
    const type = blockTypeInput.value;
    const patternStyle = patternStyleLabels[blockPatternStyleInput?.value] ? blockPatternStyleInput.value : (defaultPatternStyleByType[type] || defaultPatternStyleByType.conveying);
    const color = normalizeBlockColor(blockColorInput?.value, type);
    const description = blockDescriptionInput.value.trim();

    if (!code || !Number.isFinite(length) || length <= 0 || !Number.isFinite(quantity) || quantity < 0) {
        showToast("请先填写完整的模块名称、长度和数量。");
        return;
    }

    const editingId = editingBlockIdInput.value.trim();
    if (editingId) {
        const target = state.blocks.find((block) => block.id === editingId);
        if (target) {
            target.code = code;
            target.length = length;
            target.quantity = Math.floor(quantity);
            target.type = type;
            target.patternStyle = patternStyle;
            target.color = color;
            target.description = description;
        }
        showToast("模块已更新。");
    } else {
        state.blocks.unshift({
            id: nextId("block"),
            code,
            length,
            quantity: Math.floor(quantity),
            type,
            patternStyle,
            color,
            description,
        });
        showToast("模块已新增。");
    }

    persistState();
    renderAll();
    populateBlockForm(null);
});

deleteCurrentBlockButton.addEventListener("click", () => {
    const editingId = editingBlockIdInput.value.trim();
    if (!editingId) {
        return;
    }
    const target = state.blocks.find((block) => block.id === editingId);
    openDeleteConfirmModal(`确认删除模块“${target?.code || "当前模块"}”吗？`, () => {
        const selectedItem = blockList?.querySelector(".management-item.selected");
        animateListRemoval(selectedItem, () => {
            state.blocks = state.blocks.filter((block) => block.id !== editingId);
            state.layout = state.layout.filter((item) => item.blockId !== editingId);
            state.screws = state.screws.map((screw) => ({
                ...screw,
                defaultLayout: normalizeLayoutSnapshot(screw.defaultLayout, state.blocks)
            }));
            state.history = state.history.map((record) => ({
                ...record,
                layout: record.layout.filter((item) => item.blockId !== editingId)
            }));
            populateBlockForm(null);
            persistState();
            renderAll();
            showToast("模块已删除。");
        });
    });
});

[
    blockCodeInput,
    blockLengthInput,
    blockTypeInput,
    blockPatternStyleInput,
    blockColorInput
].forEach((input) => {
    input?.addEventListener("input", renderBlockPreview);
    input?.addEventListener("change", renderBlockPreview);
});

screwStage.addEventListener("dragover", handleStageDragOver);
screwStage.addEventListener("drop", handleStageDrop);
screwStage.addEventListener("dragleave", (event) => {
    if (!state.libraryDragBlockId) {
        return;
    }
    if (event.relatedTarget && screwStage.contains(event.relatedTarget)) {
        return;
    }
    state.slotInsertIndex = null;
    clearInsertPreview();
});

window.addEventListener("pointermove", handleSlotPointerMove);
window.addEventListener("pointerup", (event) => {
    if (state.pendingSlotDrag) {
        cancelPendingSlotDrag();
        return;
    }
    if (state.slotDrag) {
        finishSlotDrag(event.clientX, event.clientY, false);
    }
});
window.addEventListener("blur", () => {
    cancelPendingSlotDrag();
    if (state.slotDrag) {
        finishSlotDrag(-1, -1, true);
    }
});

populateBlockForm(null);
populateScrewSettingsForm(getScrewById(state.editingScrewId));
const initialActiveScrew = getActiveScrew();
if (initialActiveScrew && !canLayoutFitScrew()) {
    initialActiveScrew.length = Math.max(getLayoutTotalLength(), Math.ceil((getLayoutTotalFitWidth() / state.lengthScale) * SLOT_BASE_MM));
    persistState();
}
renderAll();
