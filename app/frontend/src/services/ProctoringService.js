class ProctoringService {
    constructor(examId, onViolation) {
        this.examId = examId;
        this.onViolation = onViolation;
        this.violations = 0;
        this.isActive = false;
    }

    start() {
        if (this.isActive) return;
        this.isActive = true;

        window.addEventListener('blur', this.handleBlur.bind(this));
        window.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
    }

    stop() {
        this.isActive = false;
        window.removeEventListener('blur', this.handleBlur.bind(this));
        window.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        window.removeEventListener('keydown', this.handleKeyDown.bind(this));
        window.removeEventListener('contextmenu', this.handleContextMenu.bind(this));
        document.removeEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
    }

    handleBlur() {
        this.reportViolation('window_blur');
    }

    handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            this.reportViolation('tab_switch');
        }
    }

    handleKeyDown(e) {
        // Prevent Ctrl+C, Ctrl+V, Ctrl+U, F12
        if (
            (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'u')) ||
            e.key === 'F12'
        ) {
            e.preventDefault();
            this.reportViolation('restricted_key');
        }
    }

    handleContextMenu(e) {
        e.preventDefault();
        this.reportViolation('right_click');
    }

    reportViolation(type) {
        if (!this.isActive) return;
        this.violations++;
        this.onViolation(type);
    }
}

export default ProctoringService;
