// GPA Chart Component
// Encapsulates Chart.js logic for displaying GPA trends.

const GpaChart = {
    chartInstance: null,

    /**
     * Render the GPA trend chart.
     * @param {string} canvasId - DOM ID of the canvas element.
     * @param {Array} semesters - List of semester objects { semester, gpa }.
     */
    render(canvasId, semesters) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        // Prepare data
        const labels = semesters.map(s => s.semester || 'Unknown');
        const dataPoints = semesters.map(s => s.gpa);

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Semester GPA',
                    data: dataPoints,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#27ae60',
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 4.33,
                        grid: { color: '#f0f0f0' },
                        ticks: { stepSize: 0.5 }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 10,
                        callbacks: {
                            label: (context) => `GPA: ${context.raw.toFixed(2)}`
                        }
                    }
                }
            }
        });
    }
};

window.GpaChart = GpaChart;
