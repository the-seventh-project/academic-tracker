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
