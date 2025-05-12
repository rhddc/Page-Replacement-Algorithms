document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.querySelector('.calculate');
    const refInput = document.getElementById('refString');
    const frameInput = document.getElementById('numFrames');
    const FIFOresultContainer = document.getElementById('FIFOresultContainer');
    const LRUresultContainer = document.getElementById('LRUresultContainer');
    const OptimalresultContainer = document.getElementById('OptimalresultContainer');
    const descriptionDiv = document.getElementById('descriptionContent');
    const randomBtn = document.getElementById('generateRandom');
    const resultsContainer = document.getElementById('resultsContainer');

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

        displayLeastFaultAlgorithm(); // Display the algorithm with the least page faults
        displayAnalysisTable(); // Display analysis table
    });

    // FIFO (First In First Out) Algorithm Function
    function runFIFO(referenceString, frameCount) {
        const frames = [];
        const frameStates = [];
        let pageFaults = 0;
        const fifoQueue = [];   

        // Iterate through each page in the reference string
        for (const page of referenceString) {
            // Check if the page is already in memory
            if (!frames.includes(page)) {
                // Page fault occurs since page is not in memory
                pageFaults++;

                if (frames.length < frameCount) {
                    // There is still space in the memory, so just add the page
                    frames.push(page);
                    fifoQueue.push(page);  // Track the page's arrival order
                } else {
                    // Memory is full, need to replace the oldest page (FIFO)
                    const oldestPage = fifoQueue.shift();  // Remove the oldest page from the queue
                    const indexToRemove = frames.indexOf(oldestPage);

                    if (indexToRemove !== -1) {
                        // Replace the oldest page with the new one
                        frames.splice(indexToRemove, 1, page);
                    }

                    // Add the new page to the end of the FIFO queue
                    fifoQueue.push(page);
                }
            }

            // Save the current state of the memory frames
            frameStates.push([...frames]);
        }

        // Return the total page faults and the recorded frame states
        return { pageFaults, frameStates };
    }


    // LRU (Least Recently Used) Algorithm Function
    function runLRU(referenceString, frameCount) {
        const frames = [];            
        const frameStates = [];       
        let pageFaults = 0;          
        const lruOrder = [];

        // Iterate through each page in the reference string
        for (const page of referenceString) {
            const pageIndex = frames.indexOf(page);  // Check if the page is already in memory

            if (pageIndex === -1) {
                // Page fault occurs (page not in memory)
                pageFaults++;

                if (frames.length < frameCount) {
                    // If there is still space in memory, just add the page
                    frames.push(page);
                } else {
                    // Memory is full, so replace the least recently used page
                    const leastRecentlyUsedPage = lruOrder.pop();  // Remove the last used page
                    const indexToRemove = frames.indexOf(leastRecentlyUsedPage);

                    if (indexToRemove !== -1) {
                        // Replace the LRU page with the current one
                        frames.splice(indexToRemove, 1, page);
                    }
                }
            } else {
                // Page is already in memory (no page fault)
                // Remove it from its current position in the LRU order
                lruOrder.splice(lruOrder.indexOf(page), 1);
            }

            // Add the current page to the front of the LRU list (most recently used)
            lruOrder.unshift(page);

            // Save the current state of frames for visualization or tracking
            frameStates.push([...frames]);
        }

        // Return the total number of page faults and the recorded frame states
        return { pageFaults, frameStates };
    }


    // Optimal Algorithm functions
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
                    // If the page is not used again in the future, assign Infinity to prioritize its replacement
                    return nextIndex === -1 ? Infinity : nextIndex + (i + 1); 
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

        referenceString.forEach(val => {
            const refDiv = document.createElement('div');
            refDiv.className = 'ref';
            refDiv.textContent = val;
            referenceRowElement.appendChild(refDiv);
        });

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

    // Display the algorithm with the least page faults
    function displayLeastFaultAlgorithm() {
        let minFaults = Infinity;
        const bestAlgorithms = [];

        for (const algorithm in algorithmResults) {
            if (algorithmResults[algorithm].faults < minFaults) {
                minFaults = algorithmResults[algorithm].faults;
                bestAlgorithms.length = 0;
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
        const fullName = algorithmDisplayNames[algorithm] || algorithm;
        row.innerHTML = `<td>${fullName}</td><td>${faults}</td>`;
        table.appendChild(row);
    }

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

function goMain() {
    window.location.href = 'index.html';
}
