// Shared GPA and Grade Utilities
const GpaUtils = {
    /**
     * Convert percentage to GPA (0-4 scale)
     */
    percentToGpa(percent) {
        if (percent === null || percent === undefined || !isFinite(percent)) return null;
        const gpa = (percent / 100) * 4.0;
        return Math.max(0, Math.min(4.0, gpa));
    },

    /**
     * Convert percentage to letter grade (KPU scale)
     */
    percentToLetter(percent) {
        if (percent === null || percent === undefined || !isFinite(percent)) return '-';
        const p = Number(percent);
        if (p >= 90) return 'A+';
        if (p >= 85) return 'A';
        if (p >= 80) return 'A-';
        if (p >= 77) return 'B+';
        if (p >= 73) return 'B';
        if (p >= 70) return 'B-';
        if (p >= 67) return 'C+';
        if (p >= 63) return 'C';
        if (p >= 60) return 'C-';
        if (p >= 50) return 'D';
        return 'F';
    },

    /**
     * Format GPA to 2 decimal places
     */
    formatGpa(gpa) {
        if (gpa === null || gpa === undefined || !isFinite(gpa)) return '-';
        return Number(gpa).toFixed(2);
    },

    /**
     * Format percentage to 2 decimal places with % sign
     */
    formatPercent(percent) {
        if (percent === null || percent === undefined || !isFinite(percent)) return '-';
        return `${Number(percent).toFixed(2)}%`;
    },

    /**
     * Calculate weighted course grade from assessments
     * @param {Array} assessments - Array of {weight, earned_marks, marks}
     */
    calculateCourseGrade(assessments) {
        if (!assessments || assessments.length === 0) return null;

        let totalWeight = 0;
        let weightedSum = 0;

        for (const a of assessments) {
            if (a.earned_marks !== null && a.earned_marks !== undefined) {
                const percentage = (a.earned_marks / a.marks) * 100;
                weightedSum += percentage * (a.weight / 100);
                totalWeight += a.weight;
            }
        }

        if (totalWeight === 0) return null;
        // Adjust for incomplete weights
        return totalWeight < 100 ? (weightedSum / totalWeight) * 100 : weightedSum;
    },

    /**
     * Sort courses by semester (Fall, Spring, Summer order within year)
     */
    sortCoursesBySemester(courses) {
        const semesterOrder = { 'Fall': 1, 'Spring': 2, 'Summer': 3 };
        return [...courses].sort((a, b) => {
            // Extract year and term from semester like "Fall 2025"
            const [termA, yearA] = (a.semester || '').split(' ');
            const [termB, yearB] = (b.semester || '').split(' ');

            const yearDiff = (parseInt(yearA) || 0) - (parseInt(yearB) || 0);
            if (yearDiff !== 0) return yearDiff;

            return (semesterOrder[termA] || 99) - (semesterOrder[termB] || 99);
        });
    }
};

// Expose to window
if (typeof window !== 'undefined') {
    window.GpaUtils = GpaUtils;
}

// ---------------------------------------------------------------------------
// Notify — lightweight toast notification utility
// Usage: Notify.success('Saved!') / Notify.error('Failed') / Notify.warning()
// ---------------------------------------------------------------------------
const Notify = {
    _container: null,

    _getContainer() {
        if (!this._container || !document.body.contains(this._container)) {
            this._container = document.createElement('div');
            this._container.id = 'notify-container';
            this._container.style.cssText = [
                'position:fixed', 'top:1rem', 'right:1rem', 'z-index:10000',
                'display:flex', 'flex-direction:column', 'gap:0.5rem',
                'min-width:260px', 'max-width:380px', 'pointer-events:none'
            ].join(';');
            document.body.appendChild(this._container);
        }
        return this._container;
    },

    show(message, type = 'info', duration = 4500) {
        const palette = {
            success: { bg: '#f0fdf4', border: '#86efac', text: '#14532d', icon: '✓' },
            error: { bg: '#fef2f2', border: '#fca5a5', text: '#7f1d1d', icon: '✕' },
            warning: { bg: '#fffbeb', border: '#fcd34d', text: '#78350f', icon: '!' },
            info: { bg: '#f0f9ff', border: '#7dd3fc', text: '#0c4a6e', icon: 'i' }
        };
        const c = palette[type] || palette.info;
        const container = this._getContainer();

        const toast = document.createElement('div');
        toast.style.cssText = [
            `background:${c.bg}`, `border:1.5px solid ${c.border}`, `color:${c.text}`,
            'padding:0.65rem 0.9rem', 'border-radius:8px', 'font-size:0.875rem',
            'box-shadow:0 4px 12px rgba(0,0,0,0.12)', 'display:flex',
            'align-items:flex-start', 'gap:0.5rem', 'pointer-events:auto',
            'opacity:0', 'transform:translateX(20px)',
            'transition:opacity 0.22s ease, transform 0.22s ease'
        ].join(';');

        toast.innerHTML = `
            <span style="font-weight:700;font-size:0.8rem;flex-shrink:0;margin-top:1px">${c.icon}</span>
            <span style="flex:1;line-height:1.4">${message}</span>
            <button style="background:none;border:none;cursor:pointer;color:${c.text};font-size:1.1rem;line-height:1;padding:0;flex-shrink:0;opacity:0.6" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(toast);
        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        if (duration > 0) {
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(20px)';
                setTimeout(() => { if (toast.parentElement) toast.remove(); }, 250);
            }, duration);
        }
    },

    success(message, duration) { this.show(message, 'success', duration); },
    error(message, duration) { this.show(message, 'error', duration); },
    warning(message, duration) { this.show(message, 'warning', duration); },
    info(message, duration) { this.show(message, 'info', duration); }
};

if (typeof window !== 'undefined') {
    window.Notify = Notify;
}
