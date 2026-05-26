document.querySelectorAll('.drop-zone').forEach(zone => {
    const fileInput = zone.querySelector('input[type="file"]');
    const type = zone.getAttribute('data-type');

    // Drag and Drop events
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length) processFileOnServer(e.dataTransfer.files[0], type, zone);
    });

    // Browse click event
    fileInput.addEventListener('change', e => {
        if (e.target.files.length) processFileOnServer(e.target.files[0], type, zone);
    });
});

async function processFileOnServer(file, type, zoneElement) {
    if (!file.type.match('image.*')) {
        alert('Please upload a valid image file (JPG, PNG).'); 
        return;
    }

    const textElement = document.getElementById(`text-${type}`);
    const originalText = textElement.innerHTML; // Save original text

    // 1. STRICT LOADING STATE: Hide old results, show spinner
    zoneElement.classList.add('loading');
    document.getElementById(`loader-${type}`).hidden = false;
    document.getElementById(`result-${type}`).hidden = true; // GUARANTEE SUCCESS IS HIDDEN
    textElement.innerHTML = "<strong>Processing on server... Please wait.</strong>";

    const formData = new FormData();
    formData.append('image', file);

    try {
        // 2. AWAIT SERVER: Pauses the code here until the backend finishes
        const response = await fetch(`/api/upload/${type}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Server processing failed. Please try again.');

        const blob = await response.blob();
        
        // 3. SERVER FINISHED: Now we trigger the success display
        displayResult(blob, type);

    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        // 4. CLEANUP: Remove spinner, restore original dropzone text
        zoneElement.classList.remove('loading');
        document.getElementById(`loader-${type}`).hidden = true;
        textElement.innerHTML = originalText;
        
        // Reset file input so the same file can be selected again if needed
        zoneElement.querySelector('input[type="file"]').value = '';
    }
}

function displayResult(blob, type) {
    const url = URL.createObjectURL(blob);
    const kb = (blob.size / 1024).toFixed(2);
    
    const resultArea = document.getElementById(`result-${type}`);
    const previewImg = document.getElementById(`preview-img-${type}`);
    const infoText = document.getElementById(`info-text-${type}`);
    const downloadBtn = document.getElementById(`download-${type}`);

    // Wait for the image to physically load into the browser memory
    previewImg.onload = () => {
        // ONLY show the success message after the image is fully rendered
        infoText.innerHTML = `<i class="fa-solid fa-circle-check"></i> Success! Exact Size: <strong>${kb} KB</strong>`;
        downloadBtn.href = url;
        
        // Unhide the result area (revealing the success message and button)
        resultArea.hidden = false; 
    };

    // Trigger the image load
    previewImg.src = url;
}