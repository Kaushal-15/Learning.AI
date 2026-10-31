class ProctoringService {
    constructor(examId, onViolation) {
        this.examId = examId;
        this.onViolation = onViolation;
        this.violations = 0;
        this.isActive = false;

        this.handleBlur = this.handleBlur.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);
        this.handleFullscreenChange = this.handleFullscreenChange.bind(this);
        this.handleCopyCutPaste = this.handleCopyCutPaste.bind(this);
        this.handleDragStart = this.handleDragStart.bind(this);
    }

    start() {
        if (this.isActive) return;
        this.isActive = true;

        window.addEventListener('blur', this.handleBlur);
        window.addEventListener('visibilitychange', this.handleVisibilityChange);
        window.addEventListener('keydown', this.handleKeyDown, true);
        window.addEventListener('keyup', this.handleKeyUp, true);
        window.addEventListener('contextmenu', this.handleContextMenu, true);
        window.addEventListener('copy', this.handleCopyCutPaste, true);
        window.addEventListener('cut', this.handleCopyCutPaste, true);
        window.addEventListener('paste', this.handleCopyCutPaste, true);
        window.addEventListener('dragstart', this.handleDragStart, true);
        document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    }

    stop() {
        this.isActive = false;
        window.removeEventListener('blur', this.handleBlur);
        window.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('keydown', this.handleKeyDown, true);
        window.removeEventListener('keyup', this.handleKeyUp, true);
        window.removeEventListener('contextmenu', this.handleContextMenu, true);
        window.removeEventListener('copy', this.handleCopyCutPaste, true);
        window.removeEventListener('cut', this.handleCopyCutPaste, true);
        window.removeEventListener('paste', this.handleCopyCutPaste, true);
        window.removeEventListener('dragstart', this.handleDragStart, true);
        document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    }

    clearClipboard() {
        try {
            if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText('').catch(() => {});
            }
        } catch (e) {}
    }

    handleBlur() {
        // Snipping tool or window focus loss triggers blur immediately
        this.clearClipboard();
        this.reportViolation('snipping_or_window_blur');
    }

    handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            this.clearClipboard();
            this.reportViolation('tab_switch');
        }
    }

    handleKeyDown(e) {
        const key = e.key ? e.key.toLowerCase() : '';
        const isCmdOrCtrl = e.ctrlKey || e.metaKey;

        // Block PrintScreen (Windows/Linux snipping trigger)
        if (e.key === 'PrintScreen' || key === 'printscreen') {
            e.preventDefault();
            e.stopPropagation();
            this.clearClipboard();
            this.reportViolation('snipping_tool_attempt');
            return;
        }

        // Block Windows Snipping Tool (Win + Shift + S) or Mac Screenshot (Cmd + Shift + 3/4/5)
        if (e.shiftKey && (isCmdOrCtrl || e.key === 'Meta') && ['s', '3', '4', '5'].includes(key)) {
            e.preventDefault();
            e.stopPropagation();
            this.clearClipboard();
            this.reportViolation('snipping_tool_attempt');
            return;
        }

        // Block Developer tools shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C)
        if (
            e.key === 'F12' ||
            (isCmdOrCtrl && e.shiftKey && ['i', 'j', 'c'].includes(key))
        ) {
            e.preventDefault();
            e.stopPropagation();
            this.reportViolation('devtools_attempt');
            return;
        }

        // Block Copy, Cut, Paste, Select All, Print, Save, View Source
        if (isCmdOrCtrl && ['c', 'v', 'x', 'a', 'p', 's', 'u'].includes(key)) {
            e.preventDefault();
            e.stopPropagation();
            this.reportViolation('restricted_shortcut');
            return;
        }

        // Block Alt + Tab / Windows key focus switch attempts where possible
        if (e.altKey && e.key === 'PrintScreen') {
            e.preventDefault();
            e.stopPropagation();
            this.clearClipboard();
            this.reportViolation('snipping_tool_attempt');
        }
    }

    handleKeyUp(e) {
        if (e.key === 'PrintScreen') {
            try {
                if (navigator?.clipboard?.writeText) {
                    navigator.clipboard.writeText('').catch(() => {});
                }
            } catch (err) {}
        }
    }

    handleContextMenu(e) {
        e.preventDefault();
        e.stopPropagation();
        this.reportViolation('right_click');
    }

    handleCopyCutPaste(e) {
        e.preventDefault();
        e.stopPropagation();
        this.clearClipboard();
        this.reportViolation('clipboard_action');
    }

    handleDragStart(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleFullscreenChange() {
        if (!document.fullscreenElement) {
            this.reportViolation('fullscreen_exit');
        }
    }

    reportViolation(type) {
        if (!this.isActive) return;
        this.violations++;
        this.onViolation(type);
    }
}

export default ProctoringService;
