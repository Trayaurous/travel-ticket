const recommendedColors = {
    bg: ['#E8DDCC', '#B7D9D9', '#FFB8A0'],
    ticket: ['#FFFFFF', '#F2C299', '#289FB7', '#A7535A'],
    text: ['#1F1F1F', '#336278', '#5C3B2E', '#E8F8FF']
};
const paletteFallbackColors = ['#A7535A', '#D8CDB8', '#7E93A8', '#B6C3B6', '#4A4A4A'];
const labels = { bg: '背景颜色', ticket: '票根颜色', text: '字体颜色' };
const paperLayouts = new Set(['wide', 'sq']);
const paperDimensions = {
    wide: { outerW: 108, outerH: 86, photoW: 99, photoH: 62, photoTop: 5 },
    sq: { outerW: 72, outerH: 86, photoW: 62, photoH: 62, photoTop: 5 }
};
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
    customColors: { bg: null, ticket: null, text: null },
    backgroundMode: 'color',
    backgroundPhotoSettings: { type: 'gaussian', strength: 50, saturation: 0 },
    activeColorPanel: null,
    photoSettingsDraft: null,
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
    document.getElementById('colorPickers').addEventListener('click', event => event.stopPropagation());
    document.getElementById('uploadBtn').addEventListener('click', openUpload);
    document.getElementById('resetBtn').addEventListener('click', resetTicket);
    document.getElementById('exportBtn').addEventListener('click', exportTicket);
    stage.addEventListener('click', () => {
        if (!state.photo) openUpload();
    });
    imageInput.addEventListener('click', event => event.stopPropagation());
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
            closeColorPanel();
            state.layout = btn.dataset.layout;
            document.querySelectorAll('[data-layout]').forEach(item => item.classList.toggle('active', item === btn));
            renderColorPickers();
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
            closeColorPanel();
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
    state.customColors = { bg: null, ticket: null, text: null };
    state.backgroundMode = 'color';
    state.backgroundPhotoSettings = { type: 'gaussian', strength: 50, saturation: 0 };
    closeColorPanel();
    document.getElementById('titleInput').value = 'SAN YA';
    document.getElementById('line1Input').value = 'TravelTicket';
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
    if (lines.length > 4) input.value = lines.slice(0, 4).join('\n');
}

function renderColorPickers(openTarget = state.activeColorPanel?.target) {
    const root = document.getElementById('colorPickers');
    root.innerHTML = ['bg', 'ticket', 'text'].map(target => `
        <div class="color-picker${openTarget === target ? ' open' : ''}" id="picker-${target}">
            <button class="color-trigger" type="button" data-toggle-color="${target}">
                <span>${getColorLabel(target)}</span>
                ${colorSwatch(target)}
            </button>
            <div class="color-menu">
                <div class="color-row-label">推荐颜色</div>
                <div class="color-row recommended-row">${recommendedColorButtons(target)}</div>
                ${colorSubmenu(target)}
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
            const picker = document.getElementById(`picker-${target}`);
            const willOpen = !picker.classList.contains('open');
            closeColorPanel();
            document.querySelectorAll('.color-picker').forEach(el => {
                if (el.id !== `picker-${target}`) el.classList.remove('open');
            });
            picker.classList.toggle('open', willOpen);
        });
    });

    bindColorDots(root);
    bindSpecialColorControls(root);
}

function getColorLabel(target) {
    if (target === 'ticket' && paperLayouts.has(state.layout)) return '相纸颜色';
    return labels[target];
}

function colorSwatch(target) {
    if (target === 'bg' && state.backgroundMode === 'photo') {
        return '<span class="swatch photo-swatch" id="swatch-bg"><i class="bi bi-image"></i></span>';
    }
    return `<span class="swatch" id="swatch-${target}" style="background:${state[target]}"></span>`;
}

function recommendedColorButtons(target) {
    const buttons = recommendedColors[target].map(color => colorDot(color, target));
    if (target === 'bg') buttons.push(photoBackgroundButton());
    buttons.push(customColorButton(target));
    return buttons.join('');
}

function photoBackgroundButton() {
    const active = state.backgroundMode === 'photo';
    return `<button class="color-dot special-color-dot photo-color-dot${active ? ' active' : ''}" type="button" data-photo-background title="使用模糊照片作为背景" aria-label="使用模糊照片作为背景"><i class="bi bi-image"></i></button>`;
}

function customColorButton(target) {
    const color = state.customColors[target];
    const active = color && state[target].toUpperCase() === color.toUpperCase() && !(target === 'bg' && state.backgroundMode === 'photo');
    const style = color ? ` style="background:${color}"` : '';
    return `<button class="color-dot special-color-dot custom-color-dot${color ? ' has-color' : ''}${active ? ' active' : ''}" type="button" data-custom-color="${target}" data-can-hover="${Boolean(color)}"${style} title="${color ? `${color}；再次点击重新取色` : '自定义取色'}" aria-label="自定义取色"><i class="bi bi-eyedropper"></i></button>`;
}

function colorSubmenu(target) {
    const panel = state.activeColorPanel;
    if (!panel || panel.target !== target) return '';
    if (panel.type === 'photo') return photoSettingsPanel();
    const color = state.customColors[target] || state[target];
    return `
        <div class="color-submenu custom-color-panel">
            <div class="submenu-title"><i class="bi bi-eyedropper"></i> 自定义取色</div>
            <label class="native-color-control">
                <input type="color" value="${color}" data-custom-input="${target}">
                <span>点击色块打开取色器</span>
                <output data-custom-output>${color.toUpperCase()}</output>
            </label>
            <div class="submenu-actions">
                <button type="button" class="secondary-action" data-color-panel-cancel>取消</button>
                <button type="button" class="save-action" data-custom-save="${target}">保存</button>
            </div>
        </div>`;
}

function photoSettingsPanel() {
    if (!state.photo) {
        return `
            <div class="color-submenu photo-settings-panel">
                <div class="submenu-title"><i class="bi bi-image"></i> 照片背景</div>
                <div class="submenu-empty">请先上传一张照片，再设置模糊背景。</div>
                <button type="button" class="save-action full-action" data-photo-upload>上传照片</button>
            </div>`;
    }
    const draft = state.photoSettingsDraft || state.backgroundPhotoSettings;
    return `
        <div class="color-submenu photo-settings-panel">
            <div class="submenu-title"><i class="bi bi-image"></i> 照片背景</div>
            <label class="submenu-field">
                <span>模糊类型</span>
                <select data-photo-setting="type">
                    <option value="gaussian"${draft.type === 'gaussian' ? ' selected' : ''}>高斯模糊</option>
                    <option value="radial"${draft.type === 'radial' ? ' selected' : ''}>径向模糊</option>
                </select>
            </label>
            <label class="submenu-field range-field">
                <span>模糊强度 <output data-range-output="strength">${draft.strength}</output></span>
                <input type="range" min="0" max="100" value="${draft.strength}" data-photo-setting="strength">
            </label>
            <label class="submenu-field range-field">
                <span>背景饱和度 <output data-range-output="saturation">${draft.saturation}</output></span>
                <input type="range" min="-50" max="50" value="${draft.saturation}" data-photo-setting="saturation">
            </label>
            <div class="submenu-actions">
                <button type="button" class="secondary-action" data-color-panel-cancel>取消</button>
                <button type="button" class="save-action" data-photo-settings-save>保存</button>
            </div>
        </div>`;
}

function colorDot(color, target, canHover = false) {
    return `<button class="color-dot" type="button" data-color="${color}" data-target="${target}" data-can-hover="${canHover}" style="background:${color}" title="${color}"></button>`;
}

function bindColorDots(root) {
    root.querySelectorAll('[data-color]').forEach(btn => {
        btn.addEventListener('click', () => chooseColor(btn.dataset.target, btn.dataset.color));
        if (btn.dataset.canHover === 'true') {
            btn.addEventListener('mouseenter', () => showVariants(btn.dataset.target, btn.dataset.color));
        }
    });
}

function bindSpecialColorControls(root) {
    root.querySelectorAll('[data-custom-color]').forEach(btn => {
        btn.addEventListener('click', () => handleCustomColorClick(btn.dataset.customColor));
        if (btn.dataset.canHover === 'true') {
            btn.addEventListener('mouseenter', () => showVariants(btn.dataset.customColor, state.customColors[btn.dataset.customColor]));
        }
    });

    root.querySelector('[data-photo-background]')?.addEventListener('click', openPhotoSettings);
    root.querySelector('[data-photo-upload]')?.addEventListener('click', openUpload);
    root.querySelector('[data-color-panel-cancel]')?.addEventListener('click', () => {
        const target = state.activeColorPanel?.target;
        closeColorPanel();
        renderColorPickers(target);
    });

    root.querySelectorAll('[data-custom-input]').forEach(input => {
        input.addEventListener('input', () => {
            root.querySelector('[data-custom-output]').textContent = input.value.toUpperCase();
        });
    });

    root.querySelectorAll('[data-custom-save]').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.customSave;
            const color = root.querySelector(`[data-custom-input="${target}"]`).value.toUpperCase();
            state.customColors[target] = color;
            chooseColor(target, color);
        });
    });

    root.querySelectorAll('[data-photo-setting]').forEach(control => {
        control.addEventListener('input', () => {
            const key = control.dataset.photoSetting;
            state.photoSettingsDraft[key] = key === 'type' ? control.value : Number(control.value);
            root.querySelector(`[data-range-output="${key}"]`)?.replaceChildren(String(control.value));
        });
    });

    root.querySelector('[data-photo-settings-save]')?.addEventListener('click', () => {
        state.backgroundPhotoSettings = { ...state.photoSettingsDraft };
        state.backgroundMode = 'photo';
        closeColorPanel();
        renderColorPickers('bg');
        renderPreview();
    });
}

function handleCustomColorClick(target) {
    const color = state.customColors[target];
    const customIsActive = color && state[target].toUpperCase() === color.toUpperCase() && !(target === 'bg' && state.backgroundMode === 'photo');
    if (color && !customIsActive) {
        chooseColor(target, color);
        return;
    }
    closeColorPanel();
    state.activeColorPanel = { type: 'custom', target };
    renderColorPickers(target);
}

function openPhotoSettings() {
    closeColorPanel();
    state.photoSettingsDraft = { ...state.backgroundPhotoSettings };
    state.activeColorPanel = { type: 'photo', target: 'bg' };
    renderColorPickers('bg');
}

function closeColorPanel() {
    state.activeColorPanel = null;
    state.photoSettingsDraft = null;
    document.querySelectorAll('.color-submenu').forEach(el => el.remove());
}

function showVariants(target, color) {
    state.hoverColor = color;
    const row = document.getElementById(`variant-row-${target}`);
    row.innerHTML = makeVariants(color).map(variant => colorDot(variant, target)).join('');
    bindColorDots(row);
}

function chooseColor(target, color) {
    closeColorPanel();
    if (target === 'bg') state.backgroundMode = 'color';
    state[target] = color;
    renderColorPickers(target);
    renderPreview();
}

function renderPreview() {
    renderCanvas(canvas, 1200, 1200);
}

function renderCanvas(targetCanvas, w, h) {
    const c = targetCanvas.getContext('2d');
    targetCanvas.width = w;
    targetCanvas.height = h;
    if (state.backgroundMode === 'photo' && state.photo) {
        drawPhotoBackground(c, w, h);
    } else {
        c.fillStyle = state.bg;
        c.fillRect(0, 0, w, h);
    }

    const { width: ticketW, height: ticketH } = getLayoutSize(w, h, state.layout);
    const x = (w - ticketW) / 2;
    const y = (h - ticketH) / 2;
    drawTicket(c, x, y, ticketW, ticketH, state.layout);
}

function drawPhotoBackground(c, w, h) {
    const settings = state.backgroundPhotoSettings;
    const strength = Math.max(0, Math.min(100, settings.strength));
    const saturation = Math.max(50, Math.min(150, 100 + settings.saturation));
    const base = Math.min(w, h);

    c.fillStyle = state.bg;
    c.fillRect(0, 0, w, h);
    c.save();

    if (settings.type === 'radial') {
        c.filter = `saturate(${saturation}%) blur(${(strength * 0.06).toFixed(2)}px)`;
        drawImageCover(c, state.photo, 0, 0, w, h);
        if (strength > 0) {
            const steps = 8 + Math.round(strength / 10);
            const maxZoom = strength / 550;
            c.globalAlpha = 0.055;
            for (let index = 1; index <= steps; index += 1) {
                const scale = 1 + maxZoom * index / steps;
                const layerW = w * scale;
                const layerH = h * scale;
                drawImageCover(c, state.photo, (w - layerW) / 2, (h - layerH) / 2, layerW, layerH);
            }
        }
    } else {
        const blurPx = base * strength / 1800;
        const scale = 1 + blurPx * 4 / base;
        const layerW = w * scale;
        const layerH = h * scale;
        c.filter = `saturate(${saturation}%) blur(${blurPx.toFixed(2)}px)`;
        drawImageCover(c, state.photo, (w - layerW) / 2, (h - layerH) / 2, layerW, layerH);
    }
    c.restore();
}

function getLayoutSize(canvasW, canvasH, layout) {
    const base = Math.min(canvasW, canvasH);
    if (!paperLayouts.has(layout)) {
        const width = Math.min(canvasW * 0.86, base * 1.45);
        return { width, height: width / 2.5 };
    }

    const wideAspect = paperDimensions.wide.outerW / paperDimensions.wide.outerH;
    const wideWidth = Math.min(canvasW * 0.78, canvasH * 0.86 * wideAspect);
    const sharedHeight = wideWidth / wideAspect;
    const aspect = paperDimensions[layout].outerW / paperDimensions[layout].outerH;
    return { width: sharedHeight * aspect, height: sharedHeight };
}

function drawTicket(c, x, y, w, h, layout) {
    const path = getTicketPath(layout);
    c.save();
    c.shadowColor = 'rgba(70,60,45,0.16)';
    c.shadowBlur = 28;
    c.shadowOffsetY = 18;
    path(c, x, y, w, h);
    c.fillStyle = state.ticket;
    c.fill();
    c.restore();

    c.save();
    path(c, x, y, w, h);
    c.clip();
    if (layout === 'compact') {
        drawCompact(c, x, y, w, h);
    } else if (paperLayouts.has(layout)) {
        drawPaper(c, x, y, w, h, layout);
    } else {
        drawClassic(c, x, y, w, h);
    }
    c.restore();
}

function getTicketPath(layout) {
    if (paperLayouts.has(layout)) return rectangularTicketPath;
    return rightNotchTicketPath;
}

function roundedRectPath(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
}

function rectangularTicketPath(c, x, y, w, h) {
    c.beginPath();
    c.rect(x, y, w, h);
    c.closePath();
}

function rightNotchTicketPath(c, x, y, w, h) {
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
    drawImageCover(c, state.photo, x, y, w, h);
}

function drawImageCover(c, img, x, y, w, h) {
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

function drawCompact(c, x, y, w, h) {
    drawPhoto(c, x, y, w * 0.80, h);
    drawTextBlock(c, x + w * 0.83, y + h * 0.11, w * 0.14, h, 0.70);
}

function drawPaper(c, x, y, w, h, layout) {
    const dimensions = paperDimensions[layout];
    const photoW = w * dimensions.photoW / dimensions.outerW;
    const photoH = h * dimensions.photoH / dimensions.outerH;
    const sidePad = (w - photoW) / 2;
    const topPad = h * dimensions.photoTop / dimensions.outerH;
    const photoX = x + sidePad;
    const photoY = y + topPad;

    drawPhoto(c, photoX, photoY, photoW, photoH);
    drawPaperText(c, x + sidePad, photoY + photoH, photoW, y + h - photoY - photoH, layout);
}

function drawPaperText(c, x, y, w, h, layout) {
    const font = fontCss[document.getElementById('fontSelect').value] || fontCss.system;
    const titleText = document.getElementById('titleInput').value.replace(/\s+/g, ' ').trim() || 'TRIP';
    const dateText = document.getElementById('dateInput').value || '';
    const titleCaption = document.getElementById('line1Input').value || '';
    const dateCaption = document.getElementById('line2Input').value || '';
    const topGap = h * (layout === 'wide' ? 0.18 : 0.14);
    const columnGap = w * 0.07;
    const leftW = w * 0.48;
    const rightW = w - leftW - columnGap;
    const titleSize = Math.max(24, Math.min(h * 0.35, w * (layout === 'wide' ? 0.07 : 0.085)));
    const dateSize = Math.max(16, titleSize * 0.48);
    const smallSize = Math.max(13, titleSize * 0.34);

    c.save();
    c.fillStyle = state.text;
    c.textBaseline = 'top';

    c.textAlign = 'left';
    c.font = `800 ${dateSize}px ${font}`;
    c.fillText(dateText, x, y + topGap, leftW);
    c.globalAlpha = 0.78;
    c.font = `700 ${smallSize}px ${font}`;
    c.fillText(dateCaption, x, y + topGap + dateSize * 1.30, leftW);

    c.globalAlpha = 1;
    c.textAlign = 'right';
    c.font = `900 ${titleSize}px ${font}`;
    c.fillText(titleText, x + w, y + topGap, rightW);
    c.globalAlpha = 0.78;
    c.font = `700 ${smallSize}px ${font}`;
    c.fillText(titleCaption, x + w, y + topGap + titleSize * 1.08, rightW);
    c.restore();
}

function drawTextBlock(c, x, y, w, h, scale, options = {}) {
    const font = fontCss[document.getElementById('fontSelect').value] || fontCss.system;
    const titleText = document.getElementById('titleInput').value || 'TRIP';
    c.font = `900 ${Math.max(28, h * 0.115 * scale)}px ${font}`;
    const titleLineCount = getTitleLines(c, titleText, w, 4).length;
    const titleSize = Math.max(16, h * 0.115 * scale);
    const titleLineH = titleSize * 0.93;
    const titleY = y - (titleLineCount > 3 ? h * 0.045 * (titleLineCount - 3) : 0);
    c.fillStyle = state.text;
    c.textBaseline = 'top';
    c.font = `900 ${titleSize}px ${font}`;
    drawTitleLines(c, titleText, x, titleY, w, 4, titleLineH);
    if (options.separator) {
        drawDashedLine(c, x, y + h * 0.53, x + w * 0.82, y + h * 0.53, 0.34, 2, [7, 7]);
    }
    c.font = `800 ${Math.max(20, h * 0.067 * scale)}px ${font}`;
    c.fillText(document.getElementById('dateInput').value || '', x, y + h * 0.43);
    c.font = `800 ${Math.max(14, h * 0.044 * scale)}px ${font}`;
    c.globalAlpha = 0.78;
    c.fillText(document.getElementById('line1Input').value || '', x, y + h * 0.60);
    c.fillText(document.getElementById('line2Input').value || '', x, y + h * 0.72);
    c.globalAlpha = 1;
}

function getTitleLines(c, text, w, maxLines) {
    const explicitLines = text.replace(/\r/g, '').split('\n').map(value => value.trim()).filter(Boolean).slice(0, 4);
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

function drawDashedLine(c, x1, y1, x2, y2, alpha = 0.22, width = 2, dash = [8, 8]) {
    c.save();
    c.strokeStyle = state.text;
    c.globalAlpha = alpha;
    c.setLineDash(dash);
    c.lineWidth = width;
    c.lineCap = 'round';
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

    return picked.map(color => rgbToHex([color.r, color.g, color.b])).concat(paletteFallbackColors).slice(0, count);
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
