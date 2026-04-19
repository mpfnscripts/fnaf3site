// This script manages the downloading and extracting of the game parts
const downloadText = document.getElementById('download-text');
const downloadBar = document.getElementById('download-bar');
const extractText = document.getElementById('extract-text');
const extractBar = document.getElementById('extract-bar');
const canvas = document.getElementById('MMFCanvas');

async function loadGame() {
    const totalParts = 20; // You have 20 parts
    let combinedData = new Uint8Array();

    for (let i = 1; i <= totalParts; i++) {
        // Look for parts in the same folder
        const response = await fetch(`resources.zip.part${i}`);
        if (!response.ok) throw new Error("Missing part " + i);
        
        const partData = await response.arrayBuffer();
        let newCombined = new Uint8Array(combinedData.length + partData.byteLength);
        newCombined.set(combinedData);
        newCombined.set(new Uint8Array(partData), combinedData.length);
        combinedData = newCombined;

        const percent = Math.round((i / totalParts) * 100);
        downloadText.innerText = percent + "%";
        downloadBar.style.width = percent + "%";
    }

    // Now Extract using JSZip
    const zip = await JSZip.loadAsync(combinedData);
    // After extraction, the game starts using Runtime.js
    // This is a simplified version of the loader logic
    const script = document.createElement('script');
    script.src = "Runtime.js";
    document.head.appendChild(script);
}

loadGame().catch(err => {
    console.error(err);
    document.body.innerHTML = `<div style="color:red">ERROR: ${err.message}</div>`;
});
