let assessments = []; // { name, type, weight, hypotheticalMark }
let isWhatIfMode = false; // What-If Mode state
let historicalData = null; // Historical performance data

window.onload = async () => {
    // Initialize historical data (now async)
    historicalData = await getHistoricalData();

    document.getElementById('addAssessmentBtn')?.addEventListener('click', addAssessment);
    document.getElementById('runAnalysisBtn')?.addEventListener('click', runAnalysis);
    document.getElementById('resetBtn')?.addEventListener('click', resetInputs);
    document.getElementById('whatIfToggle')?.addEventListener('change', toggleWhatIfMode);

    // Credits input: limit to 2 decimals
    const creditsEl = document.getElementById('credits');
    creditsEl?.addEventListener('keydown', (e) => {
        const value = e.target.value;
        if (value.includes('.')) {
            const parts = value.split('.');
            if (parts[1] && parts[1].length >= 2) {
                const cursorPos = e.target.selectionStart;
                const decimalPos = value.indexOf('.');
                if (cursorPos > decimalPos && e.key >= '0' && e.key <= '9') {
                    e.preventDefault();
                }
            }
        }
    });
    creditsEl?.addEventListener('input', () => {
        if (creditsEl.value === '') return;
        // Enforce 2 decimal limit
        let s = creditsEl.value;
        if (s.includes('.')) {
            const parts = s.split('.');
            if (parts[1] && parts[1].length > 2) {
                parts[1] = parts[1].slice(0, 2);
                creditsEl.value = parts[0] + '.' + parts[1];
            }
        }
    });

    // Target grade input: limit to 2 decimals, clamp 0-100
    const targetEl = document.getElementById('targetGrade');
    // Prevent more than 2 decimal places on keydown
    targetEl?.addEventListener('keydown', (e) => {
        const value = e.target.value;
        if (value.includes('.')) {
            const parts = value.split('.');
            if (parts[1] && parts[1].length >= 2) {
                const cursorPos = e.target.selectionStart;
                const decimalPos = value.indexOf('.');
                if (cursorPos > decimalPos && e.key >= '0' && e.key <= '9') {
                    e.preventDefault();
                }
            }
        }
    });
    targetEl?.addEventListener('input', () => {
        if (targetEl.value === '') return;
        // Enforce 2 decimal limit in input handler
        let s = targetEl.value;
        if (s.includes('.')) {
            const parts = s.split('.');
            if (parts[1] && parts[1].length > 2) {
                parts[1] = parts[1].slice(0, 2);
                targetEl.value = parts[0] + '.' + parts[1];
            }
        }
        const v = Number(targetEl.value);
        if (!isFinite(v)) return;
        if (v > 100) targetEl.value = '100';
        if (v < 0) targetEl.value = '0';
    });
    targetEl?.addEventListener('blur', () => {
        if (targetEl.value === '') return;
        let v = Number(targetEl.value);
        if (!isFinite(v)) { targetEl.value = ''; return; }
        v = Math.max(0, Math.min(100, v));
        targetEl.value = v.toFixed(2);
    });

    renderAssessments();
};

// Historical Data Functions
const API_URL = 'http://127.0.0.1:5000';

async function getHistoricalData() {
    // Try to fetch from API first
    const userData = localStorage.getItem('user');
    if (!userData) {
        return getDefaultHistoricalData();
    }

    try {
        const user = JSON.parse(userData);
        const response = await fetch(`${API_URL}/api/students/${user.id}/historical-performance`);

        if (response.ok) {
            const data = await response.json();
            return {
                componentAverages: data.component_averages || getDefaultHistoricalData().componentAverages,
                overallTrendFactor: data.overall_trend_factor || 1.0,
                componentTrendFactors: data.component_trend_factors || {},
                dataQuality: data.data_quality || { confidence_score: 0 }
            };
        }
    } catch (error) {
        console.warn('Could not fetch historical data from API, using defaults:', error);
    }

    return getDefaultHistoricalData();
}

function getDefaultHistoricalData() {
    // Fallback structure if API fails or returns no data
    return {
        componentAverages: {
            Assignment: 80.0,
            Quiz: 80.0,
            Midterm: 75.0,
            Final: 75.0,
            Project: 80.0
        },
        overallTrendFactor: 1.0,
        componentTrendFactors: {},
        dataQuality: { confidence_score: 0 }
    };
}

function calculatePredictedScore(assessmentType, history) {
    if (!history || !history.componentAverages) return null;

    const pastComponentAvg = history.componentAverages[assessmentType] || 80.0; // Default to 80 if no history
    const trendFactor = history.overallTrendFactor || 1.0;

    // Apply trend factor to entire average for more accurate prediction
    const predictedScore = pastComponentAvg * trendFactor;

    // Round to 2 decimal places and clamp to 0-100 range
    return Math.max(0, Math.min(100, Math.round(predictedScore * 100) / 100));
}

function toggleWhatIfMode(e) {
    isWhatIfMode = e.target.checked;
    renderAssessments();
}

function addAssessment() {
    // Check total weight before allowing new assessment
    const currentTotal = getTotalWeight();
    if (currentTotal >= 100) {
        alert('Cannot add more assessments. Total weight already equals or exceeds 100%.');
        return;
    }

    assessments.push({
        name: '',
        type: 'Assignment',
        weight: null,
        hypotheticalMark: null
    });
    renderAssessments();
}

function deleteAssessment(index) {
    if (index < 0 || index >= assessments.length) return;
    assessments.splice(index, 1);
    renderAssessments();
}

function renderAssessments() {
    const tbody = document.getElementById('assessmentBody');
    if (!tbody) return;

    // Update total weight badge
    updateTotalWeightBadge();

    if (assessments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No assessments added. Click "+ Add Assessment" to begin.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    for (let i = 0; i < assessments.length; i++) {
        const a = assessments[i];
        const tr = document.createElement('tr');
        tr.dataset.index = i;

        // Name
        const nameTd = document.createElement('td');
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'form-control form-control-sm';
        nameInput.value = a.name || '';
        nameInput.placeholder = 'e.g., Assignment 1';
        nameInput.addEventListener('input', (e) => {
            e.target.setCustomValidity('');
            assessments[i].name = e.target.value;
        });
        nameTd.appendChild(nameInput);

        // Type
        const typeTd = document.createElement('td');
        const typeSelect = document.createElement('select');
        typeSelect.className = 'form-select form-select-sm';
        const types = ['Assignment', 'Midterm', 'Final', 'Quiz', 'Project'];
        for (const t of types) {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            if (a.type === t) opt.selected = true;
            typeSelect.appendChild(opt);
        }
        typeSelect.addEventListener('change', (e) => {
            assessments[i].type = e.target.value;
        });
        typeTd.appendChild(typeSelect);

        // Weight
        const weightTd = document.createElement('td');
        const weightInput = document.createElement('input');
        weightInput.type = 'text'; // custom validation
        weightInput.inputMode = 'decimal';
        weightInput.className = 'form-control form-control-sm text-center';
        weightInput.value = (a.weight !== null && a.weight !== undefined) ? Number(a.weight).toFixed(2) : '';
        weightInput.placeholder = 'Weight';

        // Allow only digits and one dot; block other keys
        weightInput.addEventListener('keydown', (e) => {
            const allowedControl = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
            if (allowedControl.includes(e.key)) return;
            if (e.key === '.') {
                if (e.target.value.includes('.')) { e.preventDefault(); return; }
                return;
            }
            if (!/\d/.test(e.key)) { e.preventDefault(); }
        });

        // Prevent paste of non-numeric content
        weightInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            const cleaned = pastedText.replace(/[^0-9.]/g, '');
            if (cleaned) {
                document.execCommand('insertText', false, cleaned);
            }
        });

        weightInput.addEventListener('input', (e) => {
            e.target.setCustomValidity('');
            let val = e.target.value;
            // Remove invalid characters (keep digits and one dot)
            val = val.replace(/[^0-9.]/g, '');
            const parts = val.split('.');
            if (parts.length > 2) {
                val = parts[0] + '.' + parts.slice(1).join(''); // collapse extra dots
            }
            // Enforce two decimal places max
            if (parts.length === 2 && parts[1].length > 2) {
                parts[1] = parts[1].slice(0, 2);
                val = parts[0] + '.' + parts[1];
            }
            // Leading zeros normalization (optional)
            e.target.value = val;
            if (val === '' || val === '.') {
                assessments[i].weight = null;
                updateTotalWeightBadge();
                return;
            }
            let v = parseFloat(val);
            if (!isFinite(v)) {
                assessments[i].weight = null;
                updateTotalWeightBadge();
                return;
            }
            if (v < 0) v = 0;
            if (v > 100) v = 100;
            // Enforce remaining allowable weight (excluding current)
            const otherTotal = assessments.reduce((sum, a2, idx) => idx === i ? sum : sum + (Number(a2.weight) || 0), 0);
            const remaining = Math.max(0, 100 - otherTotal);
            if (v > remaining) {
                v = remaining;
            }
            // Round to two decimals
            v = Math.round(v * 100) / 100;
            assessments[i].weight = v;
            updateTotalWeightBadge();
        });

        weightInput.addEventListener('blur', (e) => {
            if (e.target.value === '' || e.target.value === '.') {
                assessments[i].weight = null;
                e.target.value = '';
                updateTotalWeightBadge();
                return;
            }
            let v = parseFloat(e.target.value);
            if (!isFinite(v)) { assessments[i].weight = null; e.target.value = ''; updateTotalWeightBadge(); return; }
            if (v < 0) v = 0;
            if (v > 100) v = 100;
            const otherTotal = assessments.reduce((sum, a2, idx) => idx === i ? sum : sum + (Number(a2.weight) || 0), 0);
            const remaining = Math.max(0, 100 - otherTotal);
            if (v > remaining) v = remaining;
            v = Math.round(v * 100) / 100;
            assessments[i].weight = v;
            e.target.value = v.toFixed(2);
            updateTotalWeightBadge();
        });
        // Clear value on focus if zero-like
        weightInput.addEventListener('focus', (e) => {
            if (e.target.value === '0.00') e.target.value = ''; // legacy cleanup
        });
        weightTd.appendChild(weightInput);

        // Hypothetical Mark
        const markTd = document.createElement('td');
        const markInput = document.createElement('input');
        markInput.type = 'number';
        markInput.step = '0.01';
        markInput.className = 'form-control form-control-sm text-center';
        markInput.value = (a.hypotheticalMark !== null && a.hypotheticalMark !== undefined) ? Number(a.hypotheticalMark).toFixed(2) : '';
        markInput.placeholder = 'Optional';
        // Prevent more than 2 decimal places on keydown
        markInput.addEventListener('keydown', (e) => {
            const value = e.target.value;
            if (value.includes('.')) {
                const parts = value.split('.');
                if (parts[1] && parts[1].length >= 2) {
                    const cursorPos = e.target.selectionStart;
                    const decimalPos = value.indexOf('.');
                    if (cursorPos > decimalPos && e.key >= '0' && e.key <= '9') {
                        e.preventDefault();
                    }
                }
            }
        });
        markInput.addEventListener('input', (e) => {
            let val = e.target.value;
            if (val === '') {
                assessments[i].hypotheticalMark = null;
                return;
            }
            // Enforce 2 decimal limit
            if (val.includes('.')) {
                const parts = val.split('.');
                if (parts[1] && parts[1].length > 2) {
                    parts[1] = parts[1].slice(0, 2);
                    e.target.value = parts[0] + '.' + parts[1];
                    val = e.target.value;
                }
            }
            let v = Number(val);
            if (!isFinite(v)) return;
            if (v < 0) v = 0;
            if (v > 100) v = 100;
            assessments[i].hypotheticalMark = Math.round(v * 100) / 100;
        });
        markInput.addEventListener('blur', (e) => {
            if (e.target.value === '') {
                assessments[i].hypotheticalMark = null;
                return;
            }
            let v = Number(e.target.value);
            if (!isFinite(v)) v = 0;
            v = Math.max(0, Math.min(100, v));
            e.target.value = v.toFixed(2);
            assessments[i].hypotheticalMark = v;
        });
        markTd.appendChild(markInput);

        // Actions
        const actionsTd = document.createElement('td');
        actionsTd.className = 'text-center';
        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-sm btn-danger';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => deleteAssessment(i));
        actionsTd.appendChild(delBtn);

        tr.append(nameTd, typeTd, weightTd, markTd, actionsTd);
        tbody.appendChild(tr);
    }
}

function getTotalWeight() {
    return assessments.reduce((sum, a) => sum + (Number(a.weight) || 0), 0);
}

function updateTotalWeightBadge() {
    const badge = document.getElementById('totalWeightBadge');
    if (!badge) return;
    const total = getTotalWeight();
    const rounded = Math.round(total * 100) / 100;
    badge.textContent = `Total Weight: ${rounded.toFixed(2)}%`;
    if (rounded < 100) {
        badge.className = 'badge bg-warning text-dark me-2';
    } else if (rounded === 100) {
        badge.className = 'badge bg-success text-white me-2';
    } else {
        badge.className = 'badge bg-danger text-white me-2';
    }
}

function runAnalysis() {
    // Validate target grade is not blank
    const targetInput = document.getElementById('targetGrade');
    if (!targetInput.value || targetInput.value.trim() === '') {
        targetInput.setCustomValidity('Target Final Grade cannot be blank');
        targetInput.reportValidity();
        return;
    }
    targetInput.setCustomValidity('');

    // Validate target grade value
    let targetGrade = Number(targetInput.value);
    if (!isFinite(targetGrade) || targetGrade === 0) {
        targetInput.setCustomValidity('Please enter a valid target final grade');
        targetInput.reportValidity();
        return;
    }
    targetInput.setCustomValidity('');
    targetGrade = Math.max(0, Math.min(100, Math.round(targetGrade * 100) / 100));

    // Validate at least one assessment
    if (assessments.length === 0) {
        alert('Please add at least one assessment.');
        return;
    }

    // Validate all assessments have name and weight
    const tbody = document.getElementById('assessmentBody');
    const rows = tbody.querySelectorAll('tr');

    for (let i = 0; i < assessments.length; i++) {
        const a = assessments[i];
        const row = rows[i];

        if (!a.name || a.name.trim() === '') {
            const nameInput = row.querySelector('td:nth-child(1) input');
            if (nameInput) {
                nameInput.setCustomValidity('Assessment Name cannot be blank');
                nameInput.reportValidity();
            }
            return;
        }

        if (a.weight === null || a.weight === undefined || a.weight === '' || Number(a.weight) === 0) {
            const weightInput = row.querySelector('td:nth-child(3) input');
            if (weightInput) {
                weightInput.setCustomValidity('Weight cannot be blank or zero');
                weightInput.reportValidity();
            }
            return;
        }
    }

    // Validate total weight = 100
    const total = getTotalWeight();
    const rounded = Math.round(total * 100) / 100;
    if (rounded !== 100.00) {
        alert(`Total weight must equal 100%. Current total: ${rounded.toFixed(2)}%`);
        return;
    }

    // Separate known and unknown assessments
    const known = assessments.filter(a => a.hypotheticalMark !== null && a.hypotheticalMark !== undefined);
    const unknown = assessments.filter(a => a.hypotheticalMark === null || a.hypotheticalMark === undefined);

    // Calculate weighted sum of known assessments (in weighted points)
    let knownWeightedPoints = 0;
    for (const a of known) {
        const mark = Number(a.hypotheticalMark) || 0;
        const weight = Number(a.weight) || 0;
        knownWeightedPoints += (mark * weight) / 100;
    }

    // Remaining weighted points needed to reach target
    let remainingWeightedPoints = targetGrade - knownWeightedPoints;

    // If no unknowns and target not met, impossible
    if (unknown.length === 0) {
        const finalGrade = knownWeightedPoints;
        const results = assessments.map(a => ({
            name: a.name || '-',
            type: a.type,
            weight: (Number(a.weight) || 0).toFixed(2),
            hypotheticalMark: Number(a.hypotheticalMark).toFixed(2),
            minimumRequired: Number(a.hypotheticalMark).toFixed(2)
        }));
        if (finalGrade < targetGrade) {
            alert(`Target not achievable. With current hypothetical marks, final grade is ${finalGrade.toFixed(2)}%.`);
        }
        renderResults(results, targetGrade, finalGrade);
        return;
    }

    // Calculate total weight of unknown assessments
    const unknownTotalWeight = unknown.reduce((sum, a) => sum + (Number(a.weight) || 0), 0);

    // CRITICAL: Check target feasibility BEFORE predictions
    // This must use theoretical maximum (100% on all unknowns), not predicted scores
    const theoreticalMaximum = knownWeightedPoints + unknownTotalWeight;
    const targetNotAchievable = targetGrade > theoreticalMaximum + 0.01; // allow small rounding tolerance

    // Build working array for unknowns with required marks (to be iteratively capped)
    const unknownWork = unknown.map(a => ({
        assessment: a,
        weight: Number(a.weight) || 0,
        requiredMark: null, // to be calculated
        capped: false
    }));

    // CORRECTED WEIGHTED DISTRIBUTION LOGIC
    // The mathematically correct approach for weighted grades:
    // All unknown assessments should get the SAME required percentage mark
    // because that's how weighted averages work.
    //
    // Example: Need 60 weighted points from unknowns with total weight 75%
    // Required percentage = (60 / 75) * 100 = 80%
    // All unknowns need 80%, regardless of individual weights
    //
    // The IMPACT differs by weight:
    // - 50% assessment at 80% contributes: 0.80 * 50 = 40 weighted points
    // - 25% assessment at 80% contributes: 0.80 * 25 = 20 weighted points
    // Total: 60 weighted points ✓

    if (unknownTotalWeight === 0) {
        // No unknowns - already handled above
    } else {
        // Calculate required percentage mark (same for all unknowns)
        let requiredPercentageMark = (remainingWeightedPoints / unknownTotalWeight) * 100;

        // What-If Mode: Apply performance-based adjustment with balanced compensation
        if (isWhatIfMode) {
            // Step 1: Get predicted scores for all unknowns based on historical performance
            const predictions = unknownWork.map(u => ({
                work: u,
                predictedScore: calculatePredictedScore(u.assessment.type, historicalData) || 80.0
            }));

            // Step 2: Calculate baseline requirement (equal distribution)
            const baselineRequirement = (remainingWeightedPoints / unknownTotalWeight) * 100;

            // Step 3: Calculate compensation needed for each assessment
            // Weak areas (predicted < baseline) need higher requirements
            // Strong areas (predicted > baseline) can have lower requirements
            const COMPENSATION_FACTOR = 0.5; // Use 50% of the gap for balanced adjustment

            predictions.forEach(p => {
                // Calculate how much compensation is needed
                const compensationGap = baselineRequirement - p.predictedScore;

                // Apply dampened adjustment: baseline + (50% of compensation gap)
                p.adjustedRequirement = baselineRequirement + (compensationGap * COMPENSATION_FACTOR);
            });

            // Step 4: Calculate weighted sum of adjusted requirements
            let adjustedWeightedSum = predictions.reduce((sum, p) =>
                sum + (p.adjustedRequirement * p.work.weight / 100), 0
            );

            // Step 5: Normalize to hit exact target
            // Distribute the difference equally across all assessments
            const difference = adjustedWeightedSum - remainingWeightedPoints;
            const perAssessmentAdjustment = (difference / predictions.length) / (unknownTotalWeight / (predictions.length * 100));

            predictions.forEach(p => {
                p.finalRequired = p.adjustedRequirement - perAssessmentAdjustment;
            });

            // Step 6: Handle capping (if any score exceeds 100%)
            let needsRedistribution = true;
            let iterationCount = 0;
            const maxIterations = 10;

            while (needsRedistribution && iterationCount < maxIterations) {
                needsRedistribution = false;
                iterationCount++;

                // Find assessments that exceed 100%
                const exceeding = predictions.filter(p => !p.work.capped && p.finalRequired > 100);

                if (exceeding.length > 0) {
                    needsRedistribution = true;

                    // Cap at 100%
                    exceeding.forEach(p => {
                        p.work.capped = true;
                        p.finalRequired = 100.00;
                    });

                    // Calculate points secured from capped assessments
                    const cappedPoints = predictions
                        .filter(p => p.work.capped)
                        .reduce((sum, p) => sum + (p.finalRequired * p.work.weight / 100), 0);

                    // Recalculate for uncapped assessments
                    const uncapped = predictions.filter(p => !p.work.capped);

                    if (uncapped.length > 0) {
                        const remainingPoints = remainingWeightedPoints - cappedPoints;
                        const uncappedWeight = uncapped.reduce((sum, p) => sum + p.work.weight, 0);
                        const newBaseline = (remainingPoints / uncappedWeight) * 100;

                        // Reapply compensation logic for uncapped only
                        uncapped.forEach(p => {
                            const compensationGap = newBaseline - p.predictedScore;
                            p.adjustedRequirement = newBaseline + (compensationGap * COMPENSATION_FACTOR);
                        });

                        // Normalize uncapped
                        let uncappedSum = uncapped.reduce((sum, p) =>
                            sum + (p.adjustedRequirement * p.work.weight / 100), 0
                        );
                        const uncappedDiff = uncappedSum - remainingPoints;
                        const uncappedAdj = (uncappedDiff / uncapped.length) / (uncappedWeight / (uncapped.length * 100));

                        uncapped.forEach(p => {
                            p.finalRequired = p.adjustedRequirement - uncappedAdj;
                        });
                    }
                }
            }

            // Step 7: Assign final required marks (round to 2 decimals and clamp to 0-100)
            predictions.forEach(p => {
                p.work.requiredMark = Math.max(0, Math.min(100, Math.round(p.finalRequired * 100) / 100));
            });
        } else {
            // Standard mode: all unknowns get the same required percentage
            if (requiredPercentageMark > 100) {
                // Cannot achieve target even with all unknowns at 100%
                for (const u of unknownWork) {
                    u.requiredMark = 100.00;
                }
            } else if (requiredPercentageMark < 0) {
                // Target already exceeded by known assessments
                for (const u of unknownWork) {
                    u.requiredMark = 0.00;
                }
            } else {
                // Valid scenario - all unknowns get the same required percentage
                const roundedMark = Math.round(requiredPercentageMark * 100) / 100;
                for (const u of unknownWork) {
                    u.requiredMark = roundedMark;
                }
            }
        }
    }

    // Build results array
    const results = [];
    for (const a of assessments) {
        const result = {
            name: a.name || '-',
            type: a.type,
            weight: (Number(a.weight) || 0).toFixed(2),
            hypotheticalMark: (a.hypotheticalMark !== null && a.hypotheticalMark !== undefined) ? Number(a.hypotheticalMark).toFixed(2) : '-',
            minimumRequired: '-'
        };

        if (a.hypotheticalMark !== null && a.hypotheticalMark !== undefined) {
            // Known assessment - no minimum required needed
            result.minimumRequired = '-';
        } else {
            // Unknown assessment
            const workItem = unknownWork.find(u => u.assessment === a);
            if (workItem && workItem.requiredMark !== null) {
                result.minimumRequired = workItem.requiredMark.toFixed(2);
                if (targetNotAchievable && workItem.requiredMark === 100) {
                    result.minimumRequired = result.minimumRequired + ' (Max)';
                }
            } else {
                result.minimumRequired = '0.00';
            }
        }
        results.push(result);
    }

    // Calculate projected final grade
    let projectedWeightedSum = 0;
    for (let i = 0; i < assessments.length; i++) {
        const a = assessments[i];
        const r = results[i];
        let mark = 0;
        if (a.hypotheticalMark !== null && a.hypotheticalMark !== undefined) {
            mark = Number(a.hypotheticalMark);
        } else {
            const minReq = r.minimumRequired.replace(' (Max)', '');
            if (minReq !== '-' && minReq !== 'N/A') {
                mark = Number(minReq);
            }
        }
        const weight = Number(a.weight) || 0;
        projectedWeightedSum += (mark * weight) / 100;
    }

    // Show alert if target not achievable (using theoretical maximum, not predictions)
    if (targetNotAchievable) {
        alert(`Target not achievable. Maximum possible final grade with all missing assessments at 100%: ${theoreticalMaximum.toFixed(2)}%`);
    }

    // Render results
    renderResults(results, targetGrade, projectedWeightedSum);
}

function renderResults(results, targetGrade, projectedFinal) {
    const container = document.getElementById('resultsContainer');
    const tbody = document.getElementById('resultsBody');
    if (!container || !tbody) return;

    tbody.innerHTML = '';
    for (const r of results) {
        const tr = document.createElement('tr');
        const nameTd = document.createElement('td'); nameTd.textContent = r.name;
        const typeTd = document.createElement('td'); typeTd.className = 'text-center'; typeTd.textContent = r.type;
        const weightTd = document.createElement('td'); weightTd.className = 'text-center'; weightTd.textContent = r.weight;
        const hypoTd = document.createElement('td'); hypoTd.className = 'text-center'; hypoTd.textContent = r.hypotheticalMark;
        // Compute weighted contribution of minimum required mark (now before percentage column)
        let weightedDisplay = '—';
        let percentDisplay = r.minimumRequired;
        if (r.minimumRequired && r.minimumRequired !== '-') {
            const stripped = String(r.minimumRequired).replace(' (Max)', '');
            const numericMatch = stripped.match(/^(\d+\.?\d*)/);
            if (numericMatch) {
                const requiredNum = parseFloat(numericMatch[1]);
                const weightNum = parseFloat(r.weight);
                if (!isNaN(requiredNum) && !isNaN(weightNum)) {
                    const weightedPoints = (requiredNum * weightNum) / 100;
                    weightedDisplay = weightedPoints.toFixed(2);
                }
                // rebuild percent display with % and suffix if any
                const maxSuffix = r.minimumRequired.includes('(Max)') ? ' (Max)' : '';
                percentDisplay = requiredNum.toFixed(2) + '%' + maxSuffix;
            } else {
                percentDisplay = r.minimumRequired; // fallback
            }
        }
        const weightedTd = document.createElement('td'); weightedTd.className = 'text-center'; weightedTd.textContent = weightedDisplay;
        const minTd = document.createElement('td');
        minTd.className = 'text-center';
        // Styling for minimum required scores
        // (Predicted suffix removed for cleaner display)
        minTd.textContent = percentDisplay;
        tr.append(nameTd, typeTd, weightTd, hypoTd, weightedTd, minTd);
        tbody.appendChild(tr);
    }

    document.getElementById('displayTargetGrade').textContent = targetGrade.toFixed(2);
    container.style.display = '';
}

function resetInputs() {
    assessments = [];
    document.getElementById('courseName').value = '';
    document.getElementById('courseCode').value = '';
    document.getElementById('credits').value = '';
    document.getElementById('semester').value = '';
    document.getElementById('targetGrade').value = '';
    document.getElementById('resultsContainer').style.display = 'none';
    renderAssessments();
}

// Helper (used for future formatting extensions if needed)
function formatTwoDecimals(n) {
    if (n === null || n === undefined || n === '' || isNaN(Number(n))) return '—';
    return (Math.round(Number(n) * 100) / 100).toFixed(2);
}
