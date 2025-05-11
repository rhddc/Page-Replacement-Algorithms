document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const calculateBtn = document.querySelector('.calculate');
    const refInput = document.getElementById('refString');
    const frameInput = document.getElementById('numFrames');
    const FIFOresultContainer = document.getElementById('FIFOresultContainer');
    const LRUresultContainer = document.getElementById('LRUresultContainer');
    const OptimalresultContainer = document.getElementById('OptimalresultContainer');
    const descriptionDiv = document.getElementById('descriptionContent');
    const randomBtn = document.getElementById('generateRandom');
    const resultsContainer = document.getElementById('resultsContainer');

    // Algorithm-specific result elements mapping
    const algorithmResults = {
        'FIFO': {
            container: FIFOresultContainer,
            faultCountElementId: 'fifoFaultCount',
            referenceRowId: 'fifoReferenceRow',
            frameGridId: 'fifoFrameGrid',
            faults: 0
        },
        'LRU': {
            container: LRUresultContainer,
            faultCountElementId: 'lruFaultCount',
            referenceRowId: 'lruReferenceRow',
            frameGridId: 'lruFrameGrid',
            faults: 0
        },
        'Optimal': {
            container: OptimalresultContainer,
            faultCountElementId: 'optimalFaultCount',
            referenceRowId: 'optimalReferenceRow',
            frameGridId: 'optimalFrameGrid',
            faults: 0
        }
    };

    if (!calculateBtn) {
        console.error('Calculate button not found');
        return;
    }

    // Initially hide result containers
    Object.values(algorithmResults).forEach(res => res.container.style.display = 'none');

    // Generate random reference string
    if (randomBtn) {
        randomBtn.addEventListener('click', () => {
            const length = Math.floor(Math.random() * 11) + 5;
            const numbers = [];
            for (let i = 0; i < length; i++) {
                numbers.push(Math.floor(Math.random() * 10));
            }
            refInput.value = numbers.join(', ');
            clearError(refInput);
        });
    }

    // Event listener for the calculate button
    calculateBtn.addEventListener('click', () => {
        const refString = refInput.value.split(',').map(val => val.trim()).filter(val => val !== '');
        const numFrames = frameInput.value.trim();
        let hasErrors = false;

        // Validate input
        if (refString.length === 0 || refString.some(val => isNaN(val) || !/^\d+$/.test(val))) {
            showError(refInput, 'Invalid input. Use numbers separated by commas (Ex. 1, 2, 3, 4).');
            hasErrors = true;
        } else {
            clearError(refInput);
        }

        if (!/^\d+$/.test(numFrames) || parseInt(numFrames) <= 0) {
            showError(frameInput, 'Invalid input. Use a positive number (Ex. 4).');
            hasErrors = true;
        } else {
            clearError(frameInput);
        }

        if (hasErrors) return;

        const validRefString = refString.map(Number);
        const frameCount = parseInt(numFrames);

        // Run algorithms
        const FIFOresult = runFIFO(validRefString, frameCount);
        const LRUresult = runLRU(validRefString, frameCount);
        const Optimalresult = runOptimal(validRefString, frameCount);

        // Store the fault counts
        algorithmResults['FIFO'].faults = FIFOresult.pageFaults;
        algorithmResults['LRU'].faults = LRUresult.pageFaults;
        algorithmResults['Optimal'].faults = Optimalresult.pageFaults;

        // Show result containers
        algorithmResults['FIFO'].container.style.display = 'block';
        algorithmResults['LRU'].container.style.display = 'block';
        algorithmResults['Optimal'].container.style.display = 'block';

        // Display results
        displayAlgorithmResult(FIFOresult, 'FIFO', validRefString, frameCount);
        displayAlgorithmResult(LRUresult, 'LRU', validRefString, frameCount);
        displayAlgorithmResult(Optimalresult, 'Optimal', validRefString, frameCount);

        displayLeastFaultAlgorithm();
        displayAnalysisTable();  // Add this line
    });

    // Algorithm functions
    function runFIFO(referenceString, frameCount) {
        const frames = [];
        const frameStates = [];
        let pageFaults = 0;
        const fifoQueue = [];

        for (const page of referenceString) {
            if (!frames.includes(page)) {
                pageFaults++;
                if (frames.length < frameCount) {
                    frames.push(page);
                    fifoQueue.push(page);
                } else {
                    const oldestPage = fifoQueue.shift();
                    const indexToRemove = frames.indexOf(oldestPage);
                    if (indexToRemove !== -1) {
                        frames.splice(indexToRemove, 1, page);
                    }
                    fifoQueue.push(page);
                }
            }
            frameStates.push([...frames]);
        }
        return { pageFaults, frameStates };
    }

    function runLRU(referenceString, frameCount) {
        const frames = [];
        const frameStates = [];
        let pageFaults = 0;
        const lruOrder = [];

        for (const page of referenceString) {
            const pageIndex = frames.indexOf(page);
            if (pageIndex === -1) {
                pageFaults++;
                if (frames.length < frameCount) {
                    frames.push(page);
                } else {
                    const leastRecentlyUsedPage = lruOrder.pop();
                    const indexToRemove = frames.indexOf(leastRecentlyUsedPage);
                    if (indexToRemove !== -1) {
                        frames.splice(indexToRemove, 1, page);
                    }
                }
            } else {
                lruOrder.splice(lruOrder.indexOf(page), 1);
            }
            lruOrder.unshift(page);
            frameStates.push([...frames]);
        }
        return { pageFaults, frameStates };
    }

    function runOptimal(referenceString, frameCount) {
        const frames = Array(frameCount).fill(null);
        const frameStates = [];
        let pageFaults = 0;

        // Loop through the reference string
        for (let i = 0; i < referenceString.length; i++) {
            const currentPage = referenceString[i];

            // If the page is already in memory (no page fault)
            if (frames.includes(currentPage)) {
                frameStates.push([...frames]);  // Record the state of frames
                continue;
            }

            // Page fault occurs, increment pageFaults
            pageFaults++;

            // If there is space in memory, place the page in the first empty slot
            if (frames.includes(null)) {
                const emptyIndex = frames.indexOf(null);
                frames[emptyIndex] = currentPage;
            } else {
                // If memory is full, find the farthest page to replace
                const distances = frames.map((pageInFrame) => {
                    // Find the index of the next occurrence of the page in the future
                    const nextIndex = referenceString.slice(i + 1).indexOf(pageInFrame);
                    // If the page is not found in the future, treat it as "never used" (Infinity)
                    return nextIndex === -1 ? Infinity : nextIndex + (i + 1); // Adjust index to global
                });

                // Find the page with the farthest next occurrence
                const farthestPageIndex = distances.indexOf(Math.max(...distances));

                // Replace the page with the farthest next occurrence
                frames[farthestPageIndex] = currentPage;
            }

            // Record the state of frames
            frameStates.push([...frames]);
        }

        return { pageFaults, frameStates };
    }

    // Helper functions for displaying results
    function displayAlgorithmResult(result, algorithmName, referenceString, frameCount) {
        if (descriptionDiv) descriptionDiv.style.display = 'none';

        const resultsConfig = algorithmResults[algorithmName];
        const faultCountElement = document.getElementById(resultsConfig.faultCountElementId);
        const referenceRowElement = document.getElementById(resultsConfig.referenceRowId);
        const frameGridElement = document.getElementById(resultsConfig.frameGridId);

        if (!faultCountElement || !referenceRowElement || !frameGridElement) {
            console.error(`Could not find result elements for ${algorithmName}`);
            return;
        }

        faultCountElement.innerHTML = `Total Page Faults: <strong>${result.pageFaults}</strong>`;
        referenceRowElement.innerHTML = '';
        frameGridElement.innerHTML = '';

        // Populate reference row
        referenceString.forEach(val => {
            const refDiv = document.createElement('div');
            refDiv.className = 'ref';
            refDiv.textContent = val;
            referenceRowElement.appendChild(refDiv);
        });

        // Populate frame grid
        let previousState = null;
        result.frameStates.forEach(state => {
            const columnDiv = document.createElement('div');
            columnDiv.className = 'frame-column';
            let shouldClear = false;
            if (previousState && JSON.stringify(previousState) === JSON.stringify(state)) {
                shouldClear = true;
            }
            for (let i = 0; i < frameCount; i++) {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'frame-cell';
                cellDiv.textContent = shouldClear ? '' : (state[i] !== undefined ? state[i] : '');
                columnDiv.appendChild(cellDiv);
            }
            frameGridElement.appendChild(columnDiv);
            previousState = [...state];
        });
    }

    function displayLeastFaultAlgorithm() {
        let minFaults = Infinity;
        const bestAlgorithms = [];

        for (const algorithm in algorithmResults) {
            if (algorithmResults[algorithm].faults < minFaults) {
                minFaults = algorithmResults[algorithm].faults;
                bestAlgorithms.length = 0; // Reset the array
                bestAlgorithms.push(algorithm);
            } else if (algorithmResults[algorithm].faults === minFaults) {
                bestAlgorithms.push(algorithm);
            }
        }

        const leastFaultDivId = 'leastFaultDiv';
        let leastFaultDiv = document.getElementById(leastFaultDivId);
        const bestAlgorithmsText = bestAlgorithms.join(', ');
        const message = `<div class="finalResult">The algorithm(s) with the least page faults is/are <strong>${bestAlgorithmsText}</strong> with <strong>${minFaults}</strong> page faults.</div>`;
        const newLeastFaultDiv = document.createElement('div');
        newLeastFaultDiv.id = leastFaultDivId;
        newLeastFaultDiv.innerHTML = message;

        if (leastFaultDiv) {
            resultsContainer.replaceChild(newLeastFaultDiv, leastFaultDiv);
        } else {
            resultsContainer.appendChild(newLeastFaultDiv);
        }
    }

    function displayAnalysisTable() {
    const analysisContainer = document.getElementById('analysisContainer');
    if (!analysisContainer) return;

    const table = document.createElement('table');
    table.className = 'analysis-table';

    // Algorithm display names
    const algorithmDisplayNames = {
        'FIFO': 'First In First Out (FIFO)',
        'LRU': 'Least Recently Used (LRU)',
        'Optimal': 'Optimal (OPT)'
    };

    // Create header row
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `<th>Algorithm</th><th>Page Faults</th>`;
    table.appendChild(headerRow);

    // Add rows for each algorithm
    for (const algorithm in algorithmResults) {
        const row = document.createElement('tr');
        const faults = algorithmResults[algorithm].faults;
        const fullName = algorithmDisplayNames[algorithm] || algorithm; // fallback if not mapped
        row.innerHTML = `<td>${fullName}</td><td>${faults}</td>`;
        table.appendChild(row);
    }

    // Clear previous results
    analysisContainer.innerHTML = '';
    analysisContainer.appendChild(table);
}

    // Error handling functions
    function showError(element, message) {
        const errorElement = document.getElementById(`${element.id}-error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            element.focus();
        }
    }

    function clearError(element) {
        const errorElement = document.getElementById(`${element.id}-error`);
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }
    }

    
});


// Navigation function
function goMain() {
    window.location.href = 'index.html';
}
