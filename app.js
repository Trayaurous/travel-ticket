const recommendedColors = ['#F8D7DA', '#D8E2DC', '#F6E7CB', '#D7E8F6', '#EADCF8'];
const labels = { bg: '背景颜色', ticket: '票根颜色', text: '字体颜色' };
const fontCss = {
    system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    poster: "'Arial Black', Impact, sans-serif",
    mono: "'Courier New', monospace",
    serif: "Georgia, serif"
};
const ratioMap = {
    '1:1': [1, 1],
    '3:2': [3, 2],
    '2:3': [2, 3],
    '16:9': [16, 9],
    '9:16': [9, 16]
};

const state = {
    bg: '#E8DDCC',
    ticket: '#FFFFFF',
    text: '#1F1F1F',
    layout: 'classic',
    ratio: '1:1',
    palette: ['#A7535A', '#D8CDB8', '#7E93A8', '#B6C3B6', '#4A4A4A'],
    hoverColor: '#A7535A',
    photo: null,
    photoName: ''
};

const canvas = document.getElementById('ticketCanvas');
const stage = document.getElementById('stage');
const imageInput = document.getElementById('imageInput');

function init() {
    renderColorPickers();
    bindControls();
    renderPreview();
    updateEmptyState();
}

function bindControls() {
    document.getElementById('uploadBtn').addEventListener('click', openUpload);
    document.getElementById('resetBtn').addEventListener('click', resetTicket);
    document.getElementById('exportBtn').addEventListener('click', exportTicket);
    stage.addEventListener('click', () => {
        if (!state.photo) openUpload();
    });
    imageInput.addEventListener('change', handleImageUpload);

    ['titleInput', 'line1Input', 'line2Input', 'dateInput', 'fontSelect'].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', () => {
            if (id === 'titleInput') limitTitleLines();
            renderPreview();
        });
        el.addEventListener('change', renderPreview);
    });

    document.querySelectorAll('[data-layout]').forEach(btn => {
        btn.addEventListener('click', () => {
            state.layout = btn.dataset.layout;
            document.querySelectorAll('[data-layout]').forEach(item => item.classList.toggle('active', item === btn));
            renderPreview();
        });
    });

    document.querySelectorAll('[data-ratio]').forEach(btn => {
        btn.addEventListener('click', () => {
            state.ratio = btn.dataset.ratio;
            document.querySelectorAll('[data-ratio]').forEach(item => item.classList.toggle('active', item === btn));
        });
    });

    document.addEventListener('click', event => {
        if (!event.target.closest('.color-picker')) {
            document.querySelectorAll('.color-picker').forEach(el => el.classList.remove('open'));
        }
    });
}

function openUpload() {
    imageInput.click();
}

function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        const img = new Image();
        img.onload = () => {
            state.photo = img;
            state.photoName = file.name.replace(/\.[^.]+$/, '');
            state.palette = extractPalette(img, 5);
            state.hoverColor = state.palette[0] || state.hoverColor;
            renderColorPickers();
            renderPreview();
            updateEmptyState();
        };
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
    imageInput.value = '';
}

function resetTicket() {
    state.bg = '#E8DDCC';
    state.ticket = '#FFFFFF';
    state.text = '#1F1F1F';
    state.layout = 'classic';
    state.ratio = '1:1';
    document.getElementById('titleInput').value = 'SAN YA';
    document.getElementById('line1Input').value = 'NO.772787';
    document.getElementById('line2Input').value = 'next station';
    document.getElementById('dateInput').value = '2026 - 06';
    document.getElementById('fontSelect').value = 'system';
    document.querySelectorAll('[data-layout]').forEach(btn => btn.classList.toggle('active', btn.dataset.layout === 'classic'));
    document.querySelectorAll('[data-ratio]').forEach(btn => btn.classList.toggle('active', btn.dataset.ratio === '1:1'));
    renderColorPickers();
    renderPreview();
}

function updateEmptyState() {
    stage.classList.toggle('empty', !state.photo);
}

function limitTitleLines() {
    const input = document.getElementById('titleInput');
    const lines = input.value.replace(/\r/g, '').split('\n');
    if (lines.length > 3) input.value = lines.slice(0, 3).join('\n');
}

function renderColorPickers() {
    const root = document.getElementById('colorPickers');
    root.innerHTML = ['bg', 'ticket', 'text'].map(target => `
        <div class="color-picker" id="picker-${target}">
            <button class="color-trigger" type="button" data-toggle-color="${target}">
                <span>${labels[target]}</span>
                <span class="swatch" id="swatch-${target}" style="background:${state[target]}"></span>
            </button>
            <div class="color-menu">
                <div class="color-row-label">推荐颜色</div>
                <div class="color-row">${recommendedColors.map(color => colorDot(color, target)).join('')}</div>
                <div class="color-row-label">当前图片</div>
                <div class="color-row">${state.palette.map(color => colorDot(color, target, true)).join('')}</div>
                <div class="color-row-label">明度变体</div>
                <div class="color-row" id="variant-row-${target}">${makeVariants(state.hoverColor).map(color => colorDot(color, target)).join('')}</div>
            </div>
        </div>
    `).join('');

    root.querySelectorAll('[data-toggle-color]').forEach(btn => {
        btn.addEventListener('click', event => {
            event.stopPropagation();
            const target = btn.dataset.toggleColor;
            document.querySelectorAll('.color-picker').forEach(el => {
                if (el.id !== `picker-${target}`) el.classList.remove('open');
            });
            document.getElementById(`picker-${target}`).classList.toggle('open');
        });
    });

    root.querySelectorAll('[data-color]').forEach(btn => {
        btn.addEventListener('click', () => chooseColor(btn.dataset.target, btn.dataset.color));
        if (btn.dataset.canHover === 'true') {
            btn.addEventListener('mouseenter', () => showVariants(btn.dataset.target, btn.dataset.color));
        }
    });
}

function colorDot(color, target, canHover = false) {
    return `<button class="color-dot" type="button" data-color="${color}" data-target="${target}" data-can-hover="${canHover}" style="background:${color}" title="${color}"></button>`;
}

function showVariants(target, color) {
    state.hoverColor = color;
    const row = document.getElementById(`variant-row-${target}`);
    row.innerHTML = makeVariants(color).map(variant => colorDot(variant, target)).join('');
    row.querySelectorAll('[data-color]').forEach(btn => {
        btn.addEventListener('click', () => chooseColor(btn.dataset.target, btn.dataset.color));
    });
}

function chooseColor(target, color) {
    state[target] = color;
    document.getElementById(`swatch-${target}`).style.background = color;
    renderPreview();
}

function renderPreview() {
    renderCanvas(canvas, 1200, 1200);
}

function renderCanvas(targetCanvas, w, h) {
    const c = targetCanvas.getContext('2d');
    targetCanvas.width = w;
    targetCanvas.height = h;
    c.fillStyle = state.bg;
    c.fillRect(0, 0, w, h);

    const base = Math.min(w, h);
    const ticketW = Math.min(w * 0.86, base * 1.45);
    const ticketH = ticketW * 0.40;
    const x = (w - ticketW) / 2;
    const y = (h - ticketH) / 2;
    drawTicket(c, x, y, ticketW, ticketH, state.layout);
}

function drawTicket(c, x, y, w, h, layout) {
    c.save();
    c.shadowColor = 'rgba(70,60,45,0.16)';
    c.shadowBlur = 28;
    c.shadowOffsetY = 18;
    ticketPath(c, x, y, w, h);
    c.fillStyle = state.ticket;
    c.fill();
    c.restore();

    c.save();
    ticketPath(c, x, y, w, h);
    c.clip();
    if (layout === 'boarding') drawBoarding(c, x, y, w, h);
    else if (layout === 'gallery') drawGallery(c, x, y, w, h);
    else if (layout === 'compact') drawCompact(c, x, y, w, h);
    else drawClassic(c, x, y, w, h);
    c.restore();
}

function ticketPath(c, x, y, w, h) {
    const r = h * 0.07;
    const notch = h * 0.13;
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h * 0.39);
    c.arc(x + w, y + h * 0.5, notch, -Math.PI / 2, Math.PI / 2, true);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
}

function drawPhoto(c, x, y, w, h) {
    if (!state.photo) {
        drawPhotoPlaceholder(c, x, y, w, h);
        return;
    }
    const img = state.photo;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const boxRatio = w / h;
    let sx = 0;
    let sy = 0;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;
    if (imgRatio > boxRatio) {
        sw = sh * boxRatio;
        sx = (img.naturalWidth - sw) / 2;
    } else {
        sh = sw / boxRatio;
        sy = (img.naturalHeight - sh) / 2;
    }
    c.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawPhotoPlaceholder(c, x, y, w, h) {
    const gradient = c.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, '#A9D8D4');
    gradient.addColorStop(0.55, '#7E93A8');
    gradient.addColorStop(1, '#D6B692');
    c.fillStyle = gradient;
    c.fillRect(x, y, w, h);
    c.save();
    c.globalAlpha = 0.55;
    c.fillStyle = '#FFFFFF';
    c.font = `800 ${Math.max(22, h * 0.12)}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('UPLOAD', x + w / 2, y + h / 2);
    c.restore();
}

function drawClassic(c, x, y, w, h) {
    drawPhoto(c, x, y, w * 0.75, h);
    drawTextBlock(c, x + w * 0.78, y + h * 0.16, w * 0.18, h, 1.0);
}

function drawBoarding(c, x, y, w, h) {
    drawPhoto(c, x, y, w * 0.62, h);
    drawDashedLine(c, x + w * 0.65, y + h * 0.08, x + w * 0.65, y + h * 0.92);
    drawTextBlock(c, x + w * 0.69, y + h * 0.14, w * 0.24, h, 0.9);
}

function drawGallery(c, x, y, w, h) {
    drawPhoto(c, x + w * 0.035, y + h * 0.10, w * 0.54, h * 0.80);
    drawTextBlock(c, x + w * 0.64, y + h * 0.16, w * 0.27, h, 0.86);
}

function drawCompact(c, x, y, w, h) {
    drawPhoto(c, x, y, w * 0.70, h);
    drawTextBlock(c, x + w * 0.73, y + h * 0.11, w * 0.22, h, 0.78);
}

function drawTextBlock(c, x, y, w, h, scale) {
    const font = fontCss[document.getElementById('fontSelect').value] || fontCss.system;
    const titleText = document.getElementById('titleInput').value || 'TRIP';
    c.font = `900 ${Math.max(28, h * 0.115 * scale)}px ${font}`;
    const titleLineCount = getTitleLines(c, titleText, w, 3).length;
    const titleSize = Math.max(24, h * 0.115 * scale * (titleLineCount >= 3 ? 0.82 : 1));
    const titleLineH = titleSize * (titleLineCount >= 3 ? 0.86 : 0.93);
    const titleBlockH = Math.max(h * 0.28, titleLineH * titleLineCount);
    const detailShift = titleLineCount >= 3 ? h * 0.075 : (titleLineCount === 2 ? h * 0.025 : 0);
    c.fillStyle = state.text;
    c.textBaseline = 'top';
    c.font = `900 ${titleSize}px ${font}`;
    drawTitleLines(c, titleText, x, y, w, 3, titleLineH);
    c.font = `800 ${Math.max(20, h * 0.067 * scale)}px ${font}`;
    c.fillText(document.getElementById('dateInput').value || '', x, y + Math.max(h * 0.43, titleBlockH + h * 0.08) + detailShift);
    c.font = `800 ${Math.max(14, h * 0.044 * scale)}px ${font}`;
    c.globalAlpha = 0.78;
    c.fillText(document.getElementById('line1Input').value || '', x, y + h * 0.60 + detailShift);
    c.fillText(document.getElementById('line2Input').value || '', x, y + h * 0.72 + detailShift);
    c.globalAlpha = 1;
}

function getTitleLines(c, text, w, maxLines) {
    const explicitLines = text.replace(/\r/g, '').split('\n').map(value => value.trim()).filter(Boolean).slice(0, 3);
    const lines = [];
    for (const raw of explicitLines.length ? explicitLines : ['TRIP']) {
        const normalized = raw.replace(/\s+/g, ' ');
        const words = normalized.length <= 8 ? normalized.split('') : normalized.split(' ');
        let line = '';
        for (const word of words) {
            const test = line ? `${line}${normalized.length <= 8 ? '' : ' '}${word}` : word;
            if (c.measureText(test).width > w && line) {
                lines.push(line);
                line = word;
                if (lines.length >= maxLines) return lines;
            } else {
                line = test;
            }
        }
        if (line) lines.push(line);
        if (lines.length >= maxLines) return lines;
    }
    return lines.slice(0, maxLines);
}

function drawTitleLines(c, text, x, y, w, maxLines, lineH) {
    const lines = getTitleLines(c, text, w, maxLines);
    lines.forEach((line, index) => c.fillText(line, x, y + index * lineH));
}

function drawDashedLine(c, x1, y1, x2, y2) {
    c.save();
    c.strokeStyle = state.text;
    c.globalAlpha = 0.22;
    c.setLineDash([8, 8]);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
    c.restore();
}

function exportTicket() {
    const [rw, rh] = ratioMap[state.ratio] || [1, 1];
    const base = 1800;
    const outW = rw >= rh ? base : Math.round(base * rw / rh);
    const outH = rw >= rh ? Math.round(base * rh / rw) : base;
    const exportCanvas = document.createElement('canvas');
    renderCanvas(exportCanvas, outW, outH);
    const link = document.createElement('a');
    const cleanName = state.photoName ? state.photoName.replace(/[^\w-]+/g, '_') : 'travel_ticket';
    link.download = `${cleanName}_${state.ratio.replace(':', 'x')}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
}

function extractPalette(img, count = 5) {
    const sampleCanvas = document.createElement('canvas');
    const size = 120;
    const ratio = img.naturalWidth / img.naturalHeight;
    sampleCanvas.width = ratio >= 1 ? size : Math.round(size * ratio);
    sampleCanvas.height = ratio >= 1 ? Math.round(size / ratio) : size;
    const c = sampleCanvas.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0, sampleCanvas.width, sampleCanvas.height);
    const data = c.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;
    const buckets = new Map();

    for (let i = 0; i < data.length; i += 16) {
        const alpha = data[i + 3];
        if (alpha < 180) continue;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max < 24 || min > 238) continue;
        const key = `${Math.round(r / 28)},${Math.round(g / 28)},${Math.round(b / 28)}`;
        const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0, score: 0 };
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
        bucket.count += 1;
        bucket.score += (max - min) + 20;
        buckets.set(key, bucket);
    }

    const colors = [...buckets.values()]
        .map(bucket => ({
            r: bucket.r / bucket.count,
            g: bucket.g / bucket.count,
            b: bucket.b / bucket.count,
            count: bucket.count,
            score: bucket.score
        }))
        .sort((a, b) => (b.count * 1.6 + b.score * 0.2) - (a.count * 1.6 + a.score * 0.2));

    const picked = [];
    for (const color of colors) {
        if (picked.every(item => colorDistance(item, color) > 48)) {
            picked.push(color);
        }
        if (picked.length >= count) break;
    }

    return picked.map(color => rgbToHex([color.r, color.g, color.b])).concat(recommendedColors).slice(0, count);
}

function colorDistance(a, b) {
    return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function hexToRgb(hex) {
    const value = hex.replace('#', '');
    return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

function rgbToHex(rgb) {
    return '#' + rgb.map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function mix(a, b, t) {
    return a.map((value, index) => value + (b[index] - value) * t);
}

function makeVariants(color) {
    const rgb = hexToRgb(color);
    return [0.72, 0.42, 0, 0.22, 0.45].map((t, index) => {
        if (index < 2) return rgbToHex(mix(rgb, [255, 255, 255], t));
        if (index === 2) return color;
        return rgbToHex(mix(rgb, [0, 0, 0], t));
    });
}

init();
