const totalParts = 20; 
const blobMap = new Map();
const urlMap = new Map();

function updateProgress(text, percent) {
    document.getElementById('percentage').innerText = percent + '%';
    document.getElementById('bar').style.width = percent + '%';
    document.getElementById('stage').innerText = text.toUpperCase();
}

async function start() {
    try {
        let chunks = [];
        for (let i = 1; i <= totalParts; i++) {
            updateProgress(`DOWNLOADING PART ${i}`, Math.floor((i / totalParts) * 40));
            const res = await fetch(`resources.zip.part${i}`);
            if (!res.ok) throw new Error(`Missing resources.zip.part${i}`);
            chunks.push(await res.arrayBuffer());
        }

        updateProgress("EXTRACTING ASSETS", 50);
        const zip = await JSZip.loadAsync(new Blob(chunks));
        const files = Object.keys(zip.files);
        
        for (let i = 0; i < files.length; i++) {
            const file = zip.files[files[i]];
            if (!file.dir) {
                const name = files[i].split('/').pop();
                const data = await file.async("uint8array");
                const blob = new Blob([data], { type: name.endsWith('.png') ? 'image/png' : 'application/octet-stream' });
                blobMap.set(name, blob);
                urlMap.set(name, URL.createObjectURL(blob));
            }
            updateProgress("MAPPING MEMORY", 50 + Math.floor((i / files.length) * 45));
        }

        document.getElementById('loader-ui').style.display = 'none';
        document.getElementById('play-zone').style.display = 'block';

    } catch (err) {
        document.getElementById('stage').innerHTML = `<span style="color:red">ERROR: ${err.message}</span>`;
    }
}

// Interceptors
const ogFetch = window.fetch;
window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    const name = url.split('/').pop();
    if (blobMap.has(name)) {
        const response = new Response(blobMap.get(name));
        Object.defineProperty(response, 'url', { value: url });
        return response;
    }
    return ogFetch(input, init);
};

const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url) {
    const name = url.toString().split('/').pop();
    if (urlMap.has(name)) url = urlMap.get(name);
    return originalOpen.apply(this, [method, url]);
};

const OriginalImage = window.Image;
window.Image = function() {
    const img = new OriginalImage();
    const setter = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src').set;
    Object.defineProperty(img, 'src', {
        set: function(url) {
            const name = url.toString().split('/').pop();
            if (urlMap.has(name)) setter.call(this, urlMap.get(name));
            else setter.call(this, url);
        }
    });
    return img;
};

function forceUnlockAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const contexts = [];
    if (window.activeAudioContext) contexts.push(window.activeAudioContext);
    for (let key in window) {
        if (window[key] instanceof AC) contexts.push(window[key]);
    }
    const dummy = new AC();
    contexts.push(dummy);
    contexts.forEach(ctx => { if (ctx.state === 'suspended') ctx.resume(); });
}

document.getElementById('play-button').onclick = function() {
    document.getElementById('play-zone').style.display = 'none';
    document.getElementById('MMFCanvas').style.display = 'block';

    forceUnlockAudio();

    const script = document.createElement('script');
    script.src = 'Runtime.js';
    script.onload = () => {
        window.resourcesPath = "";
        const cch = Array.from(urlMap.keys()).find(f => f.toLowerCase().endsWith('.cch'));
        setTimeout(forceUnlockAudio, 1500);
        new Runtime("MMFCanvas", cch || "fnaf4.cch");
    };
    document.head.appendChild(script);
};

window.onload = start;
