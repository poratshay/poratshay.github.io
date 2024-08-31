let acData = {};
let hadlockData = {};
let hcData = {};

let growthChart;
let recordCount = 0;

fetch('ac.csv')
    .then(response => response.text())
    .then(data => {
        const lines = data.split('\n');
        lines.slice(1).forEach(line => {
            const [week, p3, p10] = line.split(',');
            acData[parseInt(week)] = { p3: parseFloat(p3), p10: parseFloat(p10) };
        });
    })
    .catch(error => console.error('Error loading AC data:', error));

fetch('hadlock_percentiles.csv')
    .then(response => response.text())
    .then(data => {
        const lines = data.split('\n');
        const percentiles = lines[0].split(',').slice(1);
        hadlockData = {
            weeks: [],
            percentiles: percentiles,
            data: percentiles.map(() => [])
        };
        lines.slice(1).forEach(line => {
            const values = line.split(',');
            hadlockData.weeks.push(parseInt(values[0]));
            values.slice(1).forEach((value, index) => {
                hadlockData.data[index].push(parseFloat(value));
            });
        });
        createChart();
    })
    .catch(error => console.error('Error loading Hadlock data:', error));


fetch('HC_Chervenak.csv')
    .then(response => response.text())
    .then(data => {
        const lines = data.split('\n');
        const headers = lines[0].split(',').slice(1);
        lines.slice(1).forEach(line => {
            const values = line.split(',');
            const week = parseInt(values[0]);
            if (!isNaN(week)) {
                hcData[week] = headers.reduce((obj, header, index) => {
                    obj[parseInt(header)] = parseFloat(values[index + 1]);
                    return obj;
                }, {});
            }
        });
    })
    .catch(error => console.error('Error loading HC data:', error));

function createChart() {
    const ctx = document.getElementById('growthChart').getContext('2d');
    Chart.register(ChartDataLabels);
    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hadlockData.weeks,
            datasets: hadlockData.percentiles.map((percentile, index) => ({
                label: `${percentile}th percentile`,
                data: hadlockData.data[index],
                borderColor: getColor(index),
                fill: false,
                pointRadius: 0,
                borderWidth: 2
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Gestational Age (weeks)'
                    },
                    min: 14,
                    max: 42,
                    ticks: {
                        stepSize: 1
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Estimated Fetal Weight (grams)'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += Math.round(context.parsed.y) + ' grams';
                            }
                            return label;
                        }
                    }
                },
                datalabels: {
                    display: false
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}


function getColor(index) {
    const colors = ['red', 'blue', 'green', 'orange', 'purple'];
    return colors[index % colors.length];
}

function addRecord() {
    console.log("adding a record");
    recordCount++;
    const container = document.getElementById('inputContainer');
    
    // Remove existing add button if it exists
    const existingButton = document.getElementById('addRecordContainer');
    if (existingButton) {
        existingButton.remove();
    }

    const newRow = document.createElement('div');
    newRow.className = 'input-row';
    newRow.innerHTML = `
    <div class="input-group">
        <label>Record ${recordCount}</label>
    </div>
    <div class="input-group">
        <label>Gestational Age</label>
        <div class="gestational-age-group">
            <div class="gestational-age-input">
                <input type="number" class="gestationalAgeWeeks" min="14" max="42" placeholder="Weeks">
            </div>
            <span class="plus-sign">+</span>
            <div class="gestational-age-input">
                <input type="number" class="gestationalAgeDays" min="0" max="6" placeholder="Days">
            </div>
        </div>
    </div>
    <div class="input-group">
        <label>EFW (g)<sup>🟩</sup></label>
        <div class="input-result-group">
            <input type="number" class="efw">
            <input type="text" class="result efw-result" readonly placeholder="Percentile">
        </div>
    </div>
    <div class="input-group">
        <label>AC (mm)<sup>🔵</sup></label>
        <div class="input-result-group">
            <input type="number" class="ac">
            <input type="text" class="result ac-result" readonly placeholder="Percentile">
        </div>
    </div>
    <div class="input-group">
        <label>HC (mm)<sup>⭐</sup></label>
        <div class="input-result-group">
            <input type="number" class="hc">
            <input type="text" class="result hc-result" readonly placeholder="Percentile">
        </div>
    </div>
    `;
    container.appendChild(newRow);

    // Add the "Add Record" button after the last record
    const addButtonContainer = document.createElement('div');
    addButtonContainer.id = 'addRecordContainer';
    addButtonContainer.className = 'add-button-container';
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.id = 'addRecord';
    addButton.textContent = '+';
    addButton.addEventListener('click', addRecord);
    addButtonContainer.appendChild(addButton);
    container.appendChild(addButtonContainer);

    // Add event listeners for input changes
    newRow.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', updateResults);
    });

    // Add references section if it doesn't exist
    if (!document.getElementById('references')) {
        addReferences();
    }

    newRow.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', updateResults);
        if (input.classList.contains('gestationalAgeDays')) {
            input.addEventListener('input', enforceDaysLimit);
        }

        if (input.classList.contains('gestationalAgeWeeks')) {
            input.addEventListener('input', enforceWeeksLimit);
        }
    });
}

function enforceDaysLimit(event) {
    const input = event.target;

    if (input.value > 6) {
        input.value = null;
    }
    if (input.value < 0) {
        input.value = null;
    }
}

function enforceWeeksLimit(event) {
    const input = event.target;

    if (input.value > 42) {
        input.value = null;
    }
}


function addFooter() {
    const footer = document.createElement('footer');
    footer.id = 'footer';
    footer.innerHTML = `
        <div id="attribution">This site was created by Eitan Porat</div>
    `;
    document.body.appendChild(footer);
}

function addDisclaimer() {
    const disclaimer = document.createElement('div');
    disclaimer.id = 'disclaimer';
    disclaimer.className = 'disclaimer';
    disclaimer.innerHTML = `
        <h2>Medical Disclaimer</h2>
        <p>Information in this webpage is not intended to replace professional health care.
        
        </p>
    `;
    document.body.appendChild(disclaimer);
}


function addReferences() {
    const referencesSection = document.createElement('div');
    referencesSection.id = 'references';
    referencesSection.innerHTML = `
        <h3>References</h3>
        <ol>
            <p>(🟩) Hadlock FP, Harrist RB, Martinez-Poyer J. In utero analysis of fetal growth: a sonographic weight standard. Radiology. 1991 Oct;181(1):129-33. doi: 10.1148/radiology.181.1.1887021. PMID: 1887021.</p>
            <p>(🔵) Hadlock FP, Deter RL, Harrist RB, et al: Estimating fetal age: computer-assisted analysis of multiple fetal growth parameters. Radiology 152:497, 1984.</p>
            <p>(⭐) Chervenak FA, Jeanty P, Cantraine F, Chitkara U, Venus I, Berkowitz RL, Hobbins JC. The diagnosis of fetal microcephaly. Am J Obstet Gynecol. 1984 Jul 1;149(5):512-7. doi: 10.1016/0002-9378(84)90027-9. PMID: 6742021.</p>
        </ol>
    `;
    document.body.appendChild(referencesSection);
}
// document.getElementById('fetalGrowthForm').addEventListener('submit', function (e) {
//     e.preventDefault();

//     document.querySelectorAll('.input-row').forEach((row, index) => {
//         const gestationalAgeWeeks = parseInt(row.querySelector('.gestationalAgeWeeks').value) || 0;
//         const gestationalAgeDays = parseInt(row.querySelector('.gestationalAgeDays').value) || 0;
//         const efw = parseFloat(row.querySelector('.efw').value) || 0;
//         const ac = parseFloat(row.querySelector('.ac').value) || 0;

//         const totalGestationalWeeks = gestationalAgeWeeks + gestationalAgeDays / 7;

//         if (efw > 0) {
//             const efwPercentile = calculateEFWPercentile(totalGestationalWeeks, efw);
//             row.querySelector('.efw-result').value = `${efwPercentile.toFixed(1)}%`;
//         } else {
//             row.querySelector('.efw-result').value = '';
//         }

//         if (ac > 0) {
//             const acPercentileResult = calculateACPercentile(gestationalAgeWeeks, ac);
//             row.querySelector('.ac-result').value = acPercentileResult;
//         } else {
//             row.querySelector('.ac-result').value = '';
//         }
//     });

//     updateChart();
// });

function updateChart() {
    if (growthChart) {
        const measurements = [];
        document.querySelectorAll('.input-row').forEach(row => {
            const gestationalAgeWeeks = parseInt(row.querySelector('.gestationalAgeWeeks').value) || 0;
            const gestationalAgeDays = Math.min(parseInt(row.querySelector('.gestationalAgeDays').value) || 0, 6);
                const efw = parseFloat(row.querySelector('.efw').value) || 0;

            if (gestationalAgeWeeks > 0 && efw > 0) {
                const totalGestationalWeeks = gestationalAgeWeeks + gestationalAgeDays / 7;
                const efwPercentile = calculateEFWPercentile(totalGestationalWeeks, efw);
                measurements.push({
                    gestationalAge: totalGestationalWeeks,
                    efw: efw,
                    percentile: efwPercentile
                });
            }
        });

        growthChart.data.datasets = growthChart.data.datasets.filter(dataset => dataset.label !== 'Measurements');

        growthChart.data.datasets.push({
            label: 'Measurements',
            data: measurements.map(m => ({ x: m.gestationalAge, y: m.efw })),
            pointStyle: 'triangle',
            pointRadius: 6,
            pointBackgroundColor: 'green',
            pointBorderColor: 'green',
            pointBorderWidth: 1,
            pointHoverRadius: 8,
            showLine: true,
            borderColor: 'black',  // Changed to black
            borderWidth: 2,
            fill: false,
            order: -1,
            datalabels: {
                display: true,
                align: 'top',
                offset: 10,
                color: 'black',
                formatter: function (value, context) {
                    return measurements[context.dataIndex].percentile.toFixed(1) + '%';
                },
                font: {
                    size: 10,
                    weight: 'bold'
                }
            }
        });

        growthChart.update();
    }
}

function updateResults() {
    document.querySelectorAll('.input-row').forEach((row, index) => {
        const gestationalAgeWeeks = parseInt(row.querySelector('.gestationalAgeWeeks').value) || 0;
        const gestationalAgeDays = parseInt(row.querySelector('.gestationalAgeDays').value) || 0;
        const efw = parseFloat(row.querySelector('.efw').value) || 0;
        const ac = parseFloat(row.querySelector('.ac').value) || 0;
        const hc = parseFloat(row.querySelector('.hc').value) || 0;

        const totalGestationalWeeks = gestationalAgeWeeks + gestationalAgeDays / 7;

        if (efw > 0) {
            const efwPercentile = calculateEFWPercentile(totalGestationalWeeks, efw);
            row.querySelector('.efw-result').value = `${efwPercentile.toFixed(1)}%`;
        } else {
            row.querySelector('.efw-result').value = '';
        }

        if (ac > 0) {
            const acPercentileResult = calculateACPercentile(totalGestationalWeeks, ac);
            row.querySelector('.ac-result').value = `${acPercentileResult.toFixed(1)}%`;
        } else {
            row.querySelector('.ac-result').value = '';
        }
        if (hc > 0) {
            const hcPercentileResult = calculateHCPercentile(totalGestationalWeeks, hc);
            row.querySelector('.hc-result').value = hcPercentileResult;
        } else {
            row.querySelector('.hc-result').value = '';
        }
    });

    updateChart();
}
function calculateHCPercentile(gestationalWeeks, hc) {
    if (!hcData[gestationalWeeks]) {
        return "N/A";
    }

    const weekData = hcData[gestationalWeeks];
    let sdValues = Object.keys(weekData).map(sd => parseFloat(sd))
    sdValues = sdValues.sort((a, b) => a - b);

    if (hc < weekData[sdValues[0]]) {
        return `< ${sdValues[0]} SD`;
    }

    for (let i = 0; i < sdValues.length - 1; i++) {
        if (hc === weekData[sdValues[i]]) {
            return `${sdValues[i]} SD`;
        }
        if (hc > weekData[sdValues[i]] && hc < weekData[sdValues[i + 1]]) {
            console.log("HI")
            return `${sdValues[i]} SD to ${sdValues[i + 1]} SD`;
        }
    }

    if (hc === weekData[sdValues[sdValues.length - 1]]) {
        return `${sdValues[sdValues.length - 1]} SD`;
    }
    return `>${sdValues[sdValues.length - 1]} SD`;
}
function calculateEFWPercentile(gestationalWeeks, efw) {
    if (isNaN(efw) || efw <= 0) {
        return "";
    }

    const mean = Math.exp(0.578 + 0.332 * gestationalWeeks - 0.00354 * Math.pow(gestationalWeeks, 2));
    const sd = mean * (Math.exp(0.12) - 1);

    return normDist(efw, mean, sd, true) * 100;
}

function normDist(x, mean, sd, cumulative) {
    const z = (x - mean) / sd;
    if (cumulative) {
        return (1 + erf(z / Math.sqrt(2))) / 2;
    } else {
        return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
    }
}

function erf(x) {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
}

function calculateACPercentile(gestationalWeeks, ac) {
    console.log(gestationalWeeks);
    return normDist(ac, 10*(-0.00998*gestationalWeeks**2 + 1.61*gestationalWeeks - 13.3), 13.4, true) * 100;
    // if (!acData[gestationalWeeks]) {
    //     return "N/A";
    // }

    // const { p3, p10 } = acData[gestationalWeeks];

    // if (ac < p3) {
    //     return "<3";
    // } else if (ac === p3) {
    //     return "3";
    // } else if (ac > p3 && ac < p10) {
    //     return "3-10";
    // } else if (ac === p10) {
    //     return "10";
    // } else {
    //     return ">10";
    // }
}

document.addEventListener('DOMContentLoaded', function() {
    addRecord();
    addDisclaimer();
    addFooter();
});
