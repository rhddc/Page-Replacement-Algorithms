document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.querySelector('.calculate');
    const refInput = document.getElementById('refString');
    const frameInput = document.getElementById('numFrames');
    const resultContainer = document.getElementById('resultContainer');
    const referenceRow = document.getElementById('referenceRow');
    const frameGrid = document.getElementById('frameGrid');
    const faultCount = document.getElementById('faultCount');
    const descriptionDiv = document.getElementById('descriptionContent');
    const randomBtn = document.getElementById('generateRandom');

    if (!calculateBtn) {
        console.error('Calculate button not found');
        return;
    }

    if (randomBtn) {
        randomBtn.addEventListener('click', () => {
            const length = Math.floor(Math.random() * 11) + 5; // Length 5–15
            const numbers = [];

            for (let i = 0; i < length; i++) {
                const num = Math.floor(Math.random() * 20) + 1; // 1–20
                numbers.push(num);
            }

            refInput.value = numbers.join(', ');
            clearError(refInput);
        });
    }

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

    calculateBtn.addEventListener('click', () => {
        const refString = refInput.value.split(',').map(val => val.trim());
        const numFrames = frameInput.value.trim();

        let hasErrors = false;

        const invalidInput = refString.some(val => isNaN(val) || !/^\d+$/.test(val));
        if (refString.length === 0 || invalidInput) {
            showError(refInput, 'Invalid input. Use numbers separated by commas (e.g., 1, 2, 3).');
            hasErrors = true;
        } else {
            clearError(refInput);
        }

        if (!/^\d+$/.test(numFrames) || parseInt(numFrames) <= 0) {
            showError(frameInput, 'Invalid input. Use a positive number (e.g., 3).');
            hasErrors = true;
        } else {
            clearError(frameInput);
        }

        if (hasErrors) return;

        const validRefString = refString.map(val => parseInt(val));
        const result = runFIFO(validRefString, parseInt(numFrames));

        document.getElementById('resultContainer').style.display = 'block';

        displayResult(result);
    });

    function runFIFO(referenceString, frameCount) {
        const frames = [];
        const frameStates = [];
        let pageFaults = 0;
        const fifoQueue = []; // Queue to track the order of pages in frames

        for (const page of referenceString) {
            if (!frames.includes(page)) {
                pageFaults++;
                if (frames.length < frameCount) {
                    frames.push(page);
                    fifoQueue.push(page);
                } else {
                    const oldestPage = fifoQueue.shift(); // Get the oldest page
                    const indexToRemove = frames.indexOf(oldestPage);
                    if (indexToRemove !== -1) {
                        frames.splice(indexToRemove, 1, page); // Replace the oldest page
                    }
                    fifoQueue.push(page); // Add the new page to the queue
                }
            }
            frameStates.push([...frames]);
        }

        return { pageFaults, frameStates };
    }

    function displayResult(result) {
        // Hide description section
        if (descriptionDiv) descriptionDiv.style.display = 'none';

        const referenceString = refInput.value.split(',').map(val => val.trim());
        const frameCount = parseInt(frameInput.value);

        // Update page fault count
        faultCount.innerHTML = `Total Page Faults: <strong>${result.pageFaults}</strong>`;

        // Clear old visual output
        referenceRow.innerHTML = '';
        frameGrid.innerHTML = '';

        // Populate reference row
        referenceString.forEach(val => {
            const refDiv = document.createElement('div');
            refDiv.className = 'ref';
            refDiv.textContent = val;
            referenceRow.appendChild(refDiv);
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

            frameGrid.appendChild(columnDiv);
            previousState = [...state];
        });
    }
});

// Navigation function
function goMain() {
    window.location.href = 'index.html';
}