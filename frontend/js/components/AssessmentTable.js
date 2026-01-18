// Assessment Table Component
// Manages the UI for the list of assessments (Add, Remove, Update inputs)

const AssessmentTable = {
    tbodyId: 'assessmentBody',

    /**
     * Get all assessments from the DOM as an array of objects.
     * @returns {Array} [{ name, weight, mark }]
     */
    getData() {
        const rows = Array.from(document.querySelectorAll(`#${this.tbodyId} tr`));
        const assessments = [];

        rows.forEach(row => {
            const inputs = row.querySelectorAll('input');
            const select = row.querySelector('select');

            // Expected columns: Name, Type, Weight, Mark
            if (inputs.length < 2) return;

            const name = inputs[0].value.trim();
            const type = select ? select.value : 'Assignment';
            const weight = parseFloat(inputs[1].value);
            const mark = inputs[2].value ? parseFloat(inputs[2].value) : null;

            if (name && !isNaN(weight)) {
                assessments.push({ name, type, weight, mark });
            }
        });

        return assessments;
    },

    async init() {
        this.types = await window.configService.getAssessmentTypes();
    },

    /**
     * Add a new empty row to the table.
     */
    addRow() {
        const tbody = document.getElementById(this.tbodyId);
        if (!tbody) return;

        // potentially clear "No assessments" message
        if (tbody.children.length === 1 && tbody.children[0].innerText.includes('No assessments')) {
            tbody.innerHTML = '';
        }

        const tr = document.createElement('tr');

        // Generate options dynamically
        const optionsHtml = this.types ?
            this.types.map(t => `<option value="${t.name}">${t.name}</option>`).join('') :
            '<option>Assignment</option>'; // Fallback

        tr.innerHTML = `
            <td><input type="text" class="form-control form-control-sm" placeholder="e.g. Midterm"></td>
            <td>
                <select class="form-select form-select-sm">
                    ${optionsHtml}
                </select>
            </td>
            <td><input type="number" class="form-control form-control-sm text-center weight-input" placeholder="%" step="5"></td>
            <td><input type="number" class="form-control form-control-sm text-center mark-input" placeholder="Optional %"></td>
            <td class="text-center"><button class="btn btn-sm btn-danger remove-btn">Delete</button></td>
        `;

        // Delete Handler
        tr.querySelector('.remove-btn').addEventListener('click', () => {
            tr.remove();
            this.updateTotalWeight();
            if (tbody.children.length === 0) {
                this.renderEmptyState();
            }
        });

        // Set default weight based on selection
        const select = tr.querySelector('select');
        select.addEventListener('change', () => {
            const typeName = select.value;
            const typeDef = this.types.find(t => t.name === typeName);
            if (typeDef && typeDef.default_weight > 0) {
                const weightInput = tr.querySelector('.weight-input');
                if (!weightInput.value) {
                    weightInput.value = typeDef.default_weight;
                    this.updateTotalWeight();
                }
            }
        });

        // Weight Input Handler (for total calc)
        tr.querySelector('.weight-input').addEventListener('input', () => this.updateTotalWeight());

        tbody.appendChild(tr);
    },

    renderEmptyState() {
        const tbody = document.getElementById(this.tbodyId);
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center">No assessments added.</td></tr>';
    },

    reset() {
        this.renderEmptyState();
        this.addRow(); // Start with one
        this.updateTotalWeight();
    },

    updateTotalWeight() {
        const inputs = document.querySelectorAll('.weight-input');
        let total = 0;
        inputs.forEach(inp => total += parseFloat(inp.value) || 0);

        const badge = document.getElementById('totalWeightBadge');
        if (badge) {
            badge.textContent = `Total Weight: ${total.toFixed(2)}%`;
            badge.className = `badge ${Math.abs(total - 100) < 0.1 ? 'bg-success' : 'bg-warning'} text-dark`;
        }
    },

    renderResults(results, targetGrade) {
        const container = document.getElementById('resultsContainer');
        container.style.display = 'block';

        const tbody = document.getElementById('resultsBody');
        tbody.innerHTML = results.map(a => `
            <tr>
                <td>${a.name}</td>
                <td class="text-center">-</td> <!-- Type not returned/needed in summary yet -->
                <td class="text-center">${a.weight}</td>
                <td class="text-center">${a.mark !== null ? a.mark.toFixed(2) : '-'}</td>
                <td class="text-center">-</td>
                <td class="text-center fw-bold ${this.getMinReqColor(a.minimum_required)}">
                    ${a.minimum_required}
                </td>
            </tr>
        `).join('');

        document.getElementById('displayTargetGrade').textContent = targetGrade.toFixed(2);
    },

    getMinReqColor(val) {
        if (val === 'Impossible') return 'text-danger';
        if (val === '0.00' || val === 'Satisfied') return 'text-success';
        return 'text-primary';
    }
};

window.AssessmentTable = AssessmentTable;
