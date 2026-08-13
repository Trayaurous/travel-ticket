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
    system: "'Noto Sans SC Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    poster: "'Caveat Variable', 'Noto Sans SC Variable', cursive",
    mono: "'JetBrains Mono Variable', 'Noto Sans SC Variable', monospace",
    serif: "'Noto Serif SC Variable', Georgia, serif",
    kaiti: "'Ma Shan Zheng', KaiTi, STKaiti, 'Kaiti SC', cursive",
    xingkai: "'Long Cang', STXingkai, '华文行楷', cursive"
};
const regularOnlyFonts = new Set(['poster', 'kaiti', 'xingkai']);
const fontSizeScales = { poster: 1.10 };
const generalFontLabels = {
    system: 'System Sans',
    poster: 'Caveat Script',
    mono: 'Ticket Mono',
    serif: 'Editorial Serif'
};
const chineseFontLabels = {
    inherit: '通用',
    kaiti: '毛笔手写',
    xingkai: '行草艺术'
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
    generalFont: 'system',
    chineseFont: 'inherit',
    shadowStrength: 1,
    angle: 0,
    palette: ['#A7535A', '#D8CDB8', '#7E93A8', '#B6C3B6', '#4A4A4A'],
    hoverColor: '#A7535A',
    customColors: { bg: null, ticket: null, text: null },
    backgroundMode: 'color',
    backgroundPhotoSettings: { strength: 50, saturation: 0, brightness: 0 },
    activeColorPanel: null,
    photoSettingsDraft: null,
    samplingTarget: null,
    suppressNextSamplingClick: false,
    photo: null,
    photoName: ''
};

const canvas = document.getElementById('ticketCanvas');
const stage = document.getElementById('stage');
const imageInput = document.getElementById('imageInput');
let previewRenderVersion = 0;
let canvasFilterSupport;
let mobileSamplingState = null;

function init() {
    renderColorPickers();
    bindControls();
    updateFontPicker();
    updateAngleControl();
    renderPreview();
    updateEmptyState();
}

function bindControls() {
    document.getElementById('colorPickers').addEventListener('click', event => event.stopPropagation());
    document.getElementById('uploadBtn').addEventListener('click', openUpload);
    document.getElementById('resetBtn').addEventListener('click', resetTicket);
    document.getElementById('exportBtn').addEventListener('click', event => {
        event.preventDefault();
        exportTicket().catch(error => console.error('保存图片失败。', error));
    });
    document.getElementById('shadowInput').addEventListener('input', event => {
        state.shadowStrength = Number(event.target.value);
        renderPreview();
    });
    document.getElementById('angleInput').addEventListener('input', event => {
        state.angle = Number(event.target.value);
        updateAngleControl();
        renderPreview();
    });
    stage.addEventListener('click', () => {
        if (state.samplingTarget) return;
        if (!state.photo) openUpload();
    });
    stage.addEventListener('pointerdown', handleMobileSamplingPointerDown);
    stage.addEventListener('pointermove', handleMobileSamplingPointerMove);
    stage.addEventListener('pointerup', handleMobileSamplingPointerUp);
    stage.addEventListener('pointercancel', handleMobileSamplingPointerUp);
    imageInput.addEventListener('click', event => event.stopPropagation());
    imageInput.addEventListener('change', handleImageUpload);
    document.addEventListener('click', handleColorSamplingClick, true);
    document.addEventListener('pointermove', updateColorSamplingLoupe, true);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            cancelColorSampling();
            closeFontMenu();
        }
    });

    ['titleInput', 'line1Input', 'line2Input', 'dateInput'].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', () => {
            if (id === 'titleInput') limitTitleLines();
            renderPreview();
        });
        el.addEventListener('change', renderPreview);
    });

    bindFontPicker();

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
        if (!event.target.closest('.font-picker')) closeFontMenu();
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
    state.generalFont = 'system';
    state.chineseFont = 'inherit';
    state.shadowStrength = 1;
    state.angle = 0;
    state.customColors = { bg: null, ticket: null, text: null };
    state.backgroundMode = 'color';
    state.backgroundPhotoSettings = { strength: 50, saturation: 0, brightness: 0 };
    closeColorPanel();
    closeFontMenu();
    document.getElementById('titleInput').value = 'TRIP';
    document.getElementById('line1Input').value = 'TravelTicket';
    document.getElementById('line2Input').value = 'next station';
    document.getElementById('dateInput').value = '2026 - 06';
    document.getElementById('shadowInput').value = '1';
    document.getElementById('angleInput').value = '0';
    updateAngleControl();
    updateFontPicker();
    document.querySelectorAll('[data-layout]').forEach(btn => btn.classList.toggle('active', btn.dataset.layout === 'classic'));
    document.querySelectorAll('[data-ratio]').forEach(btn => btn.classList.toggle('active', btn.dataset.ratio === '1:1'));
    renderColorPickers();
    renderPreview();
}

function updateEmptyState() {
    stage.classList.toggle('empty', !state.photo);
}

function updateAngleControl() {
    const input = document.getElementById('angleInput');
    updateCenteredRangeVisual(input);
    document.getElementById('angleOutput').value = `${state.angle}°`;
}

function updateCenteredRangeVisual(input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const value = Number(input.value);
    const zeroPosition = (0 - min) / (max - min) * 100;
    const valuePosition = (value - min) / (max - min) * 100;
    input.style.setProperty('--center-fill-start', `${Math.min(zeroPosition, valuePosition)}%`);
    input.style.setProperty('--center-fill-end', `${Math.max(zeroPosition, valuePosition)}%`);
}

function formatSignedValue(value) {
    const number = Number(value);
    return number > 0 ? `+${number}` : String(number);
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
            closeFontMenu();
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

function bindFontPicker() {
    const picker = document.getElementById('fontPicker');
    const trigger = document.getElementById('fontMenuTrigger');
    picker.addEventListener('click', event => event.stopPropagation());
    trigger.addEventListener('click', () => {
        closeColorPanel();
        const willOpen = !picker.classList.contains('open');
        picker.classList.toggle('open', willOpen);
        trigger.setAttribute('aria-expanded', String(willOpen));
        document.getElementById('fontMenu').setAttribute('aria-hidden', String(!willOpen));
    });

    picker.querySelectorAll('[data-general-font]').forEach(button => {
        button.addEventListener('click', () => {
            state.generalFont = button.dataset.generalFont;
            updateFontPicker();
            renderPreview();
        });
    });

    picker.querySelectorAll('[data-chinese-font]').forEach(button => {
        button.addEventListener('click', () => {
            state.chineseFont = button.dataset.chineseFont;
            updateFontPicker();
            renderPreview();
        });
    });
}

function updateFontPicker() {
    document.getElementById('generalFontLabel').textContent = generalFontLabels[state.generalFont];
    const chineseLabel = document.getElementById('chineseFontLabel');
    const hasChineseOverride = state.chineseFont !== 'inherit';
    chineseLabel.hidden = !hasChineseOverride;
    chineseLabel.textContent = hasChineseOverride ? `中文：${chineseFontLabels[state.chineseFont]}` : '';
    document.getElementById('fontMenuTrigger').style.fontFamily = fontCss[state.generalFont] || fontCss.system;
    document.querySelectorAll('[data-general-font]').forEach(button => {
        const active = button.dataset.generalFont === state.generalFont;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-chinese-font]').forEach(button => {
        const active = button.dataset.chineseFont === state.chineseFont;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
}

function closeFontMenu() {
    const picker = document.getElementById('fontPicker');
    if (!picker) return;
    picker.classList.remove('open');
    document.getElementById('fontMenuTrigger').setAttribute('aria-expanded', 'false');
    document.getElementById('fontMenu').setAttribute('aria-hidden', 'true');
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
    return `<button class="color-dot special-color-dot custom-color-dot${color ? ' has-color' : ''}${active ? ' active' : ''}" type="button" data-custom-color="${target}" data-can-hover="${Boolean(color)}"${style} title="点击后在页面中取色" aria-label="自定义取色"><i class="bi bi-eyedropper"></i></button>`;
}

function colorSubmenu(target) {
    const panel = state.activeColorPanel;
    if (!panel || panel.target !== target) return '';
    return panel.type === 'photo' ? photoSettingsPanel() : '';
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
            <label class="submenu-field range-field">
                <span>模糊强度 <output data-range-output="strength">${draft.strength}</output></span>
                <input type="range" min="0" max="100" value="${draft.strength}" data-photo-setting="strength">
            </label>
            <label class="submenu-field range-field">
                <span>背景饱和度 <output data-range-output="saturation">${formatSignedValue(draft.saturation)}</output></span>
                <input class="centered-range" type="range" min="-50" max="50" value="${draft.saturation}" data-photo-setting="saturation">
            </label>
            <label class="submenu-field range-field">
                <span>背景亮度 <output data-range-output="brightness">${formatSignedValue(draft.brightness)}</output></span>
                <input class="centered-range" type="range" min="-25" max="25" value="${draft.brightness}" data-photo-setting="brightness">
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

    root.querySelectorAll('[data-photo-setting]').forEach(control => {
        if (control.classList.contains('centered-range')) updateCenteredRangeVisual(control);
        control.addEventListener('input', () => {
            const key = control.dataset.photoSetting;
            state.photoSettingsDraft[key] = Number(control.value);
            const output = key === 'strength' ? String(control.value) : formatSignedValue(control.value);
            root.querySelector(`[data-range-output="${key}"]`)?.replaceChildren(output);
            if (control.classList.contains('centered-range')) updateCenteredRangeVisual(control);
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
    if (state.suppressNextSamplingClick) {
        state.suppressNextSamplingClick = false;
        return;
    }
    closeColorPanel();
    startColorSampling(target);
}

function startColorSampling(target) {
    cancelColorSampling();
    state.samplingTarget = target;
    document.body.classList.add('color-sampling');
    if (window.matchMedia('(max-width: 900px)').matches) {
        startMobileColorSampling();
        return;
    }
    const hint = document.createElement('div');
    hint.className = 'color-sampling-hint';
    hint.id = 'colorSamplingHint';
    hint.innerHTML = '<i class="bi bi-eyedropper"></i><span>点击预览图或页面任意位置取色</span><small>点击颜色按钮或按 Esc 取消</small>';
    document.body.appendChild(hint);

    const loupe = document.createElement('canvas');
    loupe.className = 'color-sampling-loupe';
    loupe.id = 'colorSamplingLoupe';
    loupe.width = 80;
    loupe.height = 80;
    document.body.appendChild(loupe);
}

function cancelColorSampling() {
    if (mobileSamplingState?.frame) cancelAnimationFrame(mobileSamplingState.frame);
    state.samplingTarget = null;
    document.body.classList.remove('color-sampling');
    document.body.classList.remove('mobile-color-sampling');
    document.getElementById('colorSamplingHint')?.remove();
    document.getElementById('colorSamplingLoupe')?.remove();
    document.getElementById('mobileColorSampler')?.remove();
    canvas.style.removeProperty('--sampling-x');
    canvas.style.removeProperty('--sampling-y');
    mobileSamplingState = null;
}

function startMobileColorSampling() {
    document.body.classList.add('mobile-color-sampling');
    mobileSamplingState = {
        zoom: 2.25,
        x: 0,
        y: 0,
        pointerId: null,
        lastX: 0,
        lastY: 0,
        frame: null,
        color: state.bg
    };

    const sampler = document.createElement('div');
    sampler.className = 'mobile-color-sampler';
    sampler.id = 'mobileColorSampler';
    sampler.innerHTML = `
        <div class="mobile-sampling-color" id="mobileSamplingColor" aria-hidden="true"></div>
        <div class="mobile-sampling-actions">
            <button type="button" class="mobile-sampling-action cancel" data-mobile-sampling-cancel aria-label="取消取色">
                <i class="bi bi-arrow-return-left" aria-hidden="true"></i>
            </button>
            <button type="button" class="mobile-sampling-action confirm" data-mobile-sampling-confirm aria-label="确定取色">
                <i class="bi bi-check-lg" aria-hidden="true"></i>
            </button>
        </div>`;
    stage.appendChild(sampler);

    sampler.querySelector('[data-mobile-sampling-cancel]').addEventListener('click', event => {
        event.preventDefault();
        cancelColorSampling();
    });
    sampler.querySelector('[data-mobile-sampling-confirm]').addEventListener('click', event => {
        event.preventDefault();
        const target = state.samplingTarget;
        const color = updateMobileSamplingColor();
        cancelColorSampling();
        if (!target || !color) return;
        state.customColors[target] = color;
        chooseColor(target, color);
    });

    requestAnimationFrame(() => updateMobileSamplingColor());
}

function handleMobileSamplingPointerDown(event) {
    if (!mobileSamplingState || event.target.closest('.mobile-sampling-action')) return;
    event.preventDefault();
    mobileSamplingState.pointerId = event.pointerId;
    mobileSamplingState.lastX = event.clientX;
    mobileSamplingState.lastY = event.clientY;
    stage.setPointerCapture?.(event.pointerId);
}

function handleMobileSamplingPointerMove(event) {
    if (!mobileSamplingState || mobileSamplingState.pointerId !== event.pointerId) return;
    event.preventDefault();
    const deltaX = event.clientX - mobileSamplingState.lastX;
    const deltaY = event.clientY - mobileSamplingState.lastY;
    mobileSamplingState.lastX = event.clientX;
    mobileSamplingState.lastY = event.clientY;

    const maxX = Math.max(0, canvas.offsetWidth * mobileSamplingState.zoom / 2 - 2);
    const maxY = Math.max(0, canvas.offsetHeight * mobileSamplingState.zoom / 2 - 2);
    mobileSamplingState.x = Math.max(-maxX, Math.min(maxX, mobileSamplingState.x + deltaX));
    mobileSamplingState.y = Math.max(-maxY, Math.min(maxY, mobileSamplingState.y + deltaY));
    canvas.style.setProperty('--sampling-x', `${mobileSamplingState.x}px`);
    canvas.style.setProperty('--sampling-y', `${mobileSamplingState.y}px`);
    if (mobileSamplingState.frame) cancelAnimationFrame(mobileSamplingState.frame);
    mobileSamplingState.frame = requestAnimationFrame(() => {
        if (!mobileSamplingState) return;
        mobileSamplingState.frame = null;
        updateMobileSamplingColor();
    });
}

function handleMobileSamplingPointerUp(event) {
    if (!mobileSamplingState || mobileSamplingState.pointerId !== event.pointerId) return;
    stage.releasePointerCapture?.(event.pointerId);
    mobileSamplingState.pointerId = null;
    updateMobileSamplingColor();
}

function updateMobileSamplingColor() {
    if (!mobileSamplingState) return null;
    const stageRect = stage.getBoundingClientRect();
    const color = sampleColorAtPoint(stageRect.left + stageRect.width / 2, stageRect.top + stageRect.height / 2);
    if (!color) return mobileSamplingState.color;
    mobileSamplingState.color = color;
    const indicator = document.getElementById('mobileSamplingColor');
    if (indicator) {
        indicator.style.background = color;
        indicator.setAttribute('aria-label', `当前颜色 ${color}`);
    }
    return color;
}

function updateColorSamplingLoupe(event) {
    if (!state.samplingTarget || mobileSamplingState) return;
    const loupe = document.getElementById('colorSamplingLoupe');
    if (!loupe) return;

    loupe.style.left = `${event.clientX}px`;
    loupe.style.top = `${event.clientY}px`;
    loupe.classList.toggle('touch', event.pointerType === 'touch');

    const c = loupe.getContext('2d');
    const size = loupe.width;
    const center = size / 2;
    const canvasRect = canvas.getBoundingClientRect();
    const canvasVisible = Number(getComputedStyle(canvas).opacity) > 0.01;
    const isOnCanvas = canvasVisible
        && canvasRect.width > 0
        && canvasRect.height > 0
        && event.clientX >= canvasRect.left
        && event.clientX <= canvasRect.right
        && event.clientY >= canvasRect.top
        && event.clientY <= canvasRect.bottom;

    c.clearRect(0, 0, size, size);
    c.save();
    c.beginPath();
    c.arc(center, center, center, 0, Math.PI * 2);
    c.clip();

    if (isOnCanvas) {
        const pixelX = (event.clientX - canvasRect.left) / canvasRect.width * canvas.width;
        const pixelY = (event.clientY - canvasRect.top) / canvasRect.height * canvas.height;
        const sourceSize = Math.max(8, Math.min(40, Math.round(canvas.width / canvasRect.width * 12)));
        const sourceX = Math.max(0, Math.min(canvas.width - sourceSize, Math.round(pixelX - sourceSize / 2)));
        const sourceY = Math.max(0, Math.min(canvas.height - sourceSize, Math.round(pixelY - sourceSize / 2)));
        c.imageSmoothingEnabled = false;
        c.drawImage(canvas, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
    } else {
        c.fillStyle = sampleColorAtPoint(event.clientX, event.clientY) || state.bg;
        c.fillRect(0, 0, size, size);
    }
    c.restore();

    c.save();
    c.shadowColor = 'rgba(0, 0, 0, 0.48)';
    c.shadowBlur = 3;
    c.strokeStyle = '#FFFFFF';
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(center, center, 6.5, 0, Math.PI * 2);
    c.stroke();
    c.shadowBlur = 0;
    c.strokeStyle = 'rgba(25, 25, 25, 0.78)';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(center, center, 8.5, 0, Math.PI * 2);
    c.stroke();
    c.restore();

    loupe.classList.add('visible');
}

function handleColorSamplingClick(event) {
    if (!state.samplingTarget) return;
    if (mobileSamplingState) return;
    const colorButton = event.target.closest('.color-dot');
    if (colorButton) {
        if (colorButton.matches('[data-custom-color]')) state.suppressNextSamplingClick = true;
        cancelColorSampling();
        return;
    }
    if (event.target.closest('button, input, select, textarea, a')) {
        cancelColorSampling();
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    const target = state.samplingTarget;
    const color = sampleColorAtPoint(event.clientX, event.clientY);
    cancelColorSampling();
    if (!color) return;
    state.customColors[target] = color;
    chooseColor(target, color);
}

function sampleColorAtPoint(clientX, clientY) {
    const canvasRect = canvas.getBoundingClientRect();
    const canvasVisible = Number(getComputedStyle(canvas).opacity) > 0.01;
    if (canvasVisible && clientX >= canvasRect.left && clientX <= canvasRect.right && clientY >= canvasRect.top && clientY <= canvasRect.bottom) {
        const pixelX = Math.max(0, Math.min(canvas.width - 1, Math.floor((clientX - canvasRect.left) / canvasRect.width * canvas.width)));
        const pixelY = Math.max(0, Math.min(canvas.height - 1, Math.floor((clientY - canvasRect.top) / canvasRect.height * canvas.height)));
        const pixel = canvas.getContext('2d').getImageData(pixelX, pixelY, 1, 1).data;
        if (pixel[3] > 0) return rgbToHex([pixel[0], pixel[1], pixel[2]]);
    }

    let element = document.elementFromPoint(clientX, clientY);
    while (element && element !== document.documentElement) {
        const color = parseCssColor(getComputedStyle(element).backgroundColor);
        if (color) return color;
        element = element.parentElement;
    }
    return state.bg;
}

function parseCssColor(value) {
    const match = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
    if (!match || (match[4] !== undefined && Number(match[4]) < 0.05)) return null;
    return rgbToHex([Number(match[1]), Number(match[2]), Number(match[3])]);
}

function openPhotoSettings() {
    closeColorPanel();
    state.photoSettingsDraft = { ...state.backgroundPhotoSettings };
    state.activeColorPanel = { type: 'photo', target: 'bg' };
    renderColorPickers('bg');
}

function closeColorPanel() {
    cancelColorSampling();
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

async function renderPreview() {
    const version = ++previewRenderVersion;
    await ensureSelectedFontLoaded();
    if (version !== previewRenderVersion) return;
    renderCanvas(canvas, 1200, 1200);
}

async function ensureSelectedFontLoaded() {
    if (!document.fonts?.load) return;
    const sampleText = [
        document.getElementById('titleInput').value,
        document.getElementById('line1Input').value,
        document.getElementById('line2Input').value,
        document.getElementById('dateInput').value
    ].join(' ') || '旅行 Travel Ticket 2026';
    try {
        const generalWeight = getCanvasFontWeight(state.generalFont, 900);
        const requests = [document.fonts.load(`${generalWeight} 64px ${fontCss[state.generalFont]}`, sampleText)];
        const chineseText = [...sampleText].filter(isHanCharacter).join('');
        if (state.chineseFont !== 'inherit' && chineseText) {
            requests.push(document.fonts.load(`400 64px ${fontCss[state.chineseFont]}`, chineseText));
        }
        await Promise.all(requests);
    } catch (error) {
        console.warn('字体加载失败，已使用回退字体。', error);
    }
}

function getCanvasFontWeight(fontKey, requestedWeight) {
    return regularOnlyFonts.has(fontKey) ? 400 : requestedWeight;
}

function isHanCharacter(character) {
    return /\p{Script=Han}/u.test(character);
}

function getCharacterFontKey(character) {
    if (state.chineseFont !== 'inherit' && isHanCharacter(character)) return state.chineseFont;
    return state.generalFont;
}

function makeTextRuns(text) {
    const runs = [];
    for (const character of [...String(text)]) {
        const fontKey = getCharacterFontKey(character);
        const lastRun = runs[runs.length - 1];
        if (lastRun?.fontKey === fontKey) {
            lastRun.text += character;
        } else {
            runs.push({ text: character, fontKey });
        }
    }
    return runs;
}

function getTextRunMetrics(c, text, fontSize, requestedWeight, chineseScale = 1) {
    c.save();
    const metrics = makeTextRuns(text).map(run => {
        const weight = getCanvasFontWeight(run.fontKey, requestedWeight);
        const fontScale = fontSizeScales[run.fontKey] || 1;
        const chineseFontScale = run.fontKey === state.chineseFont ? chineseScale : 1;
        const runFontSize = fontSize * fontScale * chineseFontScale;
        c.font = `${weight} ${runFontSize}px ${fontCss[run.fontKey] || fontCss.system}`;
        return { ...run, weight, fontSize: runFontSize, width: c.measureText(run.text).width };
    });
    c.restore();
    return metrics;
}

function measureStyledText(c, text, fontSize, requestedWeight) {
    return getTextRunMetrics(c, text, fontSize, requestedWeight)
        .reduce((width, run) => width + run.width, 0);
}

function drawStyledText(c, text, x, y, maxWidth, fontSize, requestedWeight, chineseScale = 1) {
    const runs = getTextRunMetrics(c, text, fontSize, requestedWeight, chineseScale);
    const textWidth = runs.reduce((width, run) => width + run.width, 0);
    const horizontalScale = maxWidth && textWidth > maxWidth ? maxWidth / textWidth : 1;
    let cursorX = 0;
    if (c.textAlign === 'right' || c.textAlign === 'end') cursorX = -textWidth;
    if (c.textAlign === 'center') cursorX = -textWidth / 2;

    c.save();
    c.translate(x, y);
    c.scale(horizontalScale, 1);
    c.textAlign = 'left';
    for (const run of runs) {
        c.font = `${run.weight} ${run.fontSize}px ${fontCss[run.fontKey] || fontCss.system}`;
        c.fillText(run.text, cursorX, 0);
        cursorX += run.width;
    }
    c.restore();
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

    let { width: ticketW, height: ticketH } = getLayoutSize(w, h, state.layout);
    const angle = state.angle * Math.PI / 180;
    const rotatedW = Math.abs(ticketW * Math.cos(angle)) + Math.abs(ticketH * Math.sin(angle));
    const rotatedH = Math.abs(ticketW * Math.sin(angle)) + Math.abs(ticketH * Math.cos(angle));
    const fitScale = Math.min(1, w * 0.90 / rotatedW, h * 0.90 / rotatedH);
    ticketW *= fitScale;
    ticketH *= fitScale;

    c.save();
    c.translate(w / 2, h / 2);
    c.rotate(angle);
    drawTicket(c, -ticketW / 2, -ticketH / 2, ticketW, ticketH, state.layout);
    c.restore();
}

function drawPhotoBackground(c, w, h) {
    const settings = state.backgroundPhotoSettings;
    const strength = Math.max(0, Math.min(100, settings.strength));
    const saturation = Math.max(50, Math.min(150, 100 + settings.saturation));
    const brightness = Math.max(75, Math.min(125, 100 + settings.brightness));
    const base = Math.min(w, h);

    c.fillStyle = state.bg;
    c.fillRect(0, 0, w, h);

    if (!hasWorkingCanvasFilter()) {
        drawPhotoBackgroundFallback(c, w, h, strength, saturation, brightness);
        return;
    }

    c.save();

    const blurPx = base * strength / 1800;
    const scale = 1 + blurPx * 4 / base;
    const layerW = w * scale;
    const layerH = h * scale;
    c.filter = `brightness(${brightness}%) saturate(${saturation}%) blur(${blurPx.toFixed(2)}px)`;
    drawImageCover(c, state.photo, (w - layerW) / 2, (h - layerH) / 2, layerW, layerH);
    c.restore();
}

function hasWorkingCanvasFilter() {
    if (canvasFilterSupport !== undefined) return canvasFilterSupport;

    const userAgent = navigator.userAgent || '';
    const isSafariWebKit = /AppleWebKit/i.test(userAgent) && !/(Chrome|Chromium|Edg|OPR|Android)/i.test(userAgent);
    if (isSafariWebKit) {
        canvasFilterSupport = false;
        return canvasFilterSupport;
    }

    const testCanvas = document.createElement('canvas');
    testCanvas.width = 9;
    testCanvas.height = 9;
    const testContext = testCanvas.getContext('2d', { willReadFrequently: true });
    if (!testContext || !('filter' in testContext)) {
        canvasFilterSupport = false;
        return canvasFilterSupport;
    }

    try {
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = 1;
        sourceCanvas.height = 1;
        const sourceContext = sourceCanvas.getContext('2d');
        sourceContext.fillStyle = '#FFFFFF';
        sourceContext.fillRect(0, 0, 1, 1);

        testContext.clearRect(0, 0, 9, 9);
        testContext.filter = 'blur(2px)';
        testContext.drawImage(sourceCanvas, 4, 4);
        testContext.filter = 'none';
        const pixels = testContext.getImageData(0, 0, 9, 9).data;
        const centerAlpha = pixels[(4 * 9 + 4) * 4 + 3];
        const nearbyAlpha = pixels[(4 * 9 + 2) * 4 + 3];
        canvasFilterSupport = centerAlpha < 250 && nearbyAlpha > 0;
    } catch (error) {
        canvasFilterSupport = false;
    }

    return canvasFilterSupport;
}

function drawPhotoBackgroundFallback(c, w, h, strength, saturation, brightness) {
    if (strength === 0 && saturation === 100 && brightness === 100) {
        drawImageCover(c, state.photo, 0, 0, w, h);
        return;
    }

    const maxWorkSide = 640;
    const workScale = Math.min(1, maxWorkSide / Math.max(w, h));
    const workW = Math.max(1, Math.round(w * workScale));
    const workH = Math.max(1, Math.round(h * workScale));
    const workCanvas = document.createElement('canvas');
    workCanvas.width = workW;
    workCanvas.height = workH;
    const workContext = workCanvas.getContext('2d', { willReadFrequently: true });

    workContext.fillStyle = state.bg;
    workContext.fillRect(0, 0, workW, workH);
    drawImageCover(workContext, state.photo, 0, 0, workW, workH);

    const imageData = workContext.getImageData(0, 0, workW, workH);
    adjustPixelBrightness(imageData.data, brightness / 100);
    adjustPixelSaturation(imageData.data, saturation / 100);

    const outputBlurPx = Math.min(w, h) * strength / 1800;
    const radius = Math.max(0, Math.round(outputBlurPx * workScale));
    let pixels = imageData.data;
    if (radius > 0) {
        for (let pass = 0; pass < 3; pass += 1) {
            pixels = boxBlurPass(pixels, workW, workH, radius, true);
            pixels = boxBlurPass(pixels, workW, workH, radius, false);
        }
        imageData.data.set(pixels);
    }

    workContext.putImageData(imageData, 0, 0);
    c.save();
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.drawImage(workCanvas, 0, 0, w, h);
    c.restore();
}

function adjustPixelBrightness(pixels, factor) {
    if (Math.abs(factor - 1) < 0.001) return;
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] *= factor;
        pixels[i + 1] *= factor;
        pixels[i + 2] *= factor;
    }
}

function adjustPixelSaturation(pixels, factor) {
    if (Math.abs(factor - 1) < 0.001) return;
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
        pixels[i] = luminance + (r - luminance) * factor;
        pixels[i + 1] = luminance + (g - luminance) * factor;
        pixels[i + 2] = luminance + (b - luminance) * factor;
    }
}

function boxBlurPass(source, width, height, radius, horizontal) {
    const target = new Uint8ClampedArray(source.length);
    const windowSize = radius * 2 + 1;
    const outerLength = horizontal ? height : width;
    const innerLength = horizontal ? width : height;

    for (let outer = 0; outer < outerLength; outer += 1) {
        const sums = [0, 0, 0, 0];
        for (let offset = -radius; offset <= radius; offset += 1) {
            const inner = Math.max(0, Math.min(innerLength - 1, offset));
            const x = horizontal ? inner : outer;
            const y = horizontal ? outer : inner;
            const index = (y * width + x) * 4;
            for (let channel = 0; channel < 4; channel += 1) sums[channel] += source[index + channel];
        }

        for (let inner = 0; inner < innerLength; inner += 1) {
            const x = horizontal ? inner : outer;
            const y = horizontal ? outer : inner;
            const targetIndex = (y * width + x) * 4;
            for (let channel = 0; channel < 4; channel += 1) {
                target[targetIndex + channel] = sums[channel] / windowSize;
            }

            const removeInner = Math.max(0, Math.min(innerLength - 1, inner - radius));
            const addInner = Math.max(0, Math.min(innerLength - 1, inner + radius + 1));
            const removeX = horizontal ? removeInner : outer;
            const removeY = horizontal ? outer : removeInner;
            const addX = horizontal ? addInner : outer;
            const addY = horizontal ? outer : addInner;
            const removeIndex = (removeY * width + removeX) * 4;
            const addIndex = (addY * width + addX) * 4;
            for (let channel = 0; channel < 4; channel += 1) {
                sums[channel] += source[addIndex + channel] - source[removeIndex + channel];
            }
        }
    }

    return target;
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
    const shadows = [
        { color: 'transparent', blur: 0, offsetY: 0 },
        { color: 'rgba(70,60,45,0.16)', blur: 28, offsetY: 18 },
        { color: 'rgba(70,60,45,0.30)', blur: 46, offsetY: 28 },
        { color: 'rgba(70,60,45,0.44)', blur: 68, offsetY: 38 }
    ];
    const shadow = shadows[state.shadowStrength] || shadows[1];
    c.save();
    c.shadowColor = shadow.color;
    c.shadowBlur = shadow.blur;
    c.shadowOffsetY = shadow.offsetY;
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
    const smallSize = Math.max(15, titleSize * 0.42);
    const dateGroupOffset = Math.max(0, (titleSize - dateSize) * 0.72);

    c.save();
    c.fillStyle = state.text;
    c.textBaseline = 'top';

    c.textAlign = 'left';
    const dateY = y + topGap + dateGroupOffset;
    const dateCaptionY = dateY + dateSize * 1.30;
    const dateGroupHeight = dateCaptionY + smallSize - dateY;
    if (dateText.trim() && dateCaption.trim()) {
        drawStyledText(c, dateText, x, dateY, leftW, dateSize, 800);
        c.globalAlpha = 0.78;
        drawStyledText(c, dateCaption, x, dateCaptionY, leftW, smallSize, 700, 1.22);
    } else if (dateText.trim()) {
        const singleDateSize = dateSize * 1.16;
        drawStyledText(c, dateText, x, dateY + (dateGroupHeight - singleDateSize) / 2, leftW, singleDateSize, 800);
    } else if (dateCaption.trim()) {
        const singleCaptionSize = smallSize * 1.18;
        c.globalAlpha = 0.88;
        drawStyledText(c, dateCaption, x, dateY + (dateGroupHeight - singleCaptionSize) / 2, leftW, singleCaptionSize, 700, 1.22);
    }

    c.globalAlpha = 1;
    c.textAlign = 'right';
    const titleY = y + topGap;
    const titleCaptionY = titleY + titleSize * 1.28;
    if (titleCaption.trim()) {
        drawStyledText(c, titleText, x + w, titleY, rightW, titleSize, 900);
        c.globalAlpha = 0.78;
        drawStyledText(c, titleCaption, x + w, titleCaptionY, rightW, smallSize, 700, 1.22);
    } else {
        const expandedTitleSize = titleSize * 1.12;
        const titleGroupHeight = titleCaptionY + smallSize - titleY;
        drawStyledText(c, titleText, x + w, titleY + (titleGroupHeight - expandedTitleSize) / 2, rightW, expandedTitleSize, 900);
    }
    c.restore();
}

function drawTextBlock(c, x, y, w, h, scale, options = {}) {
    const titleText = document.getElementById('titleInput').value || 'TRIP';
    const titleSize = Math.max(16, h * 0.115 * scale);
    const titleLineCount = getTitleLines(c, titleText, w, 4, titleSize, 900).length;
    const titleLineH = titleSize * 0.93;
    const titleY = y - (titleLineCount > 3 ? h * 0.045 * (titleLineCount - 3) : 0);
    c.fillStyle = state.text;
    c.textBaseline = 'top';
    drawTitleLines(c, titleText, x, titleY, w, 4, titleLineH, titleSize, 900);
    if (options.separator) {
        drawDashedLine(c, x, y + h * 0.53, x + w * 0.82, y + h * 0.53, 0.34, 2, [7, 7]);
    }
    const dateSize = Math.max(20, h * 0.067 * scale);
    drawStyledText(c, document.getElementById('dateInput').value || '', x, y + h * 0.43, w, dateSize, 800);
    const smallSize = Math.max(16, h * 0.055 * scale);
    c.globalAlpha = 0.78;
    drawStyledText(c, document.getElementById('line1Input').value || '', x, y + h * 0.60, w, smallSize, 800, 1.22);
    drawStyledText(c, document.getElementById('line2Input').value || '', x, y + h * 0.74, w, smallSize, 800, 1.22);
    c.globalAlpha = 1;
}

function getTitleLines(c, text, w, maxLines, fontSize, requestedWeight) {
    const explicitLines = text.replace(/\r/g, '').split('\n').map(value => value.trim()).filter(Boolean).slice(0, 4);
    const lines = [];
    for (const raw of explicitLines.length ? explicitLines : ['TRIP']) {
        const normalized = raw.replace(/\s+/g, ' ');
        const characterMode = normalized.length <= 8 || [...normalized].some(isHanCharacter);
        const words = characterMode ? [...normalized] : normalized.split(' ');
        let line = '';
        for (const word of words) {
            const test = line ? `${line}${characterMode ? '' : ' '}${word}` : word;
            if (measureStyledText(c, test, fontSize, requestedWeight) > w && line) {
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

function drawTitleLines(c, text, x, y, w, maxLines, lineH, fontSize, requestedWeight) {
    const lines = getTitleLines(c, text, w, maxLines, fontSize, requestedWeight);
    lines.forEach((line, index) => drawStyledText(c, line, x, y + index * lineH, w, fontSize, requestedWeight));
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

function isMobileSafari() {
    const userAgent = navigator.userAgent;
    const iOSDevice = /iPad|iPhone|iPod/.test(userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return iOSDevice && /WebKit/.test(userAgent) && !/CriOS|FxiOS|EdgiOS/.test(userAgent);
}

function canvasToPngBlob(sourceCanvas) {
    return new Promise((resolve, reject) => {
        sourceCanvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('无法生成 PNG 图片。'));
        }, 'image/png');
    });
}

function canvasToPngBlobSync(sourceCanvas) {
    const dataUrl = sourceCanvas.toDataURL('image/png');
    const bytes = atob(dataUrl.split(',')[1]);
    const buffer = new Uint8Array(bytes.length);
    for (let index = 0; index < bytes.length; index += 1) buffer[index] = bytes.charCodeAt(index);
    return new Blob([buffer], { type: 'image/png' });
}

function makeExportCanvas() {
    const [rw, rh] = ratioMap[state.ratio] || [1, 1];
    const base = 1800;
    const outW = rw >= rh ? base : Math.round(base * rw / rh);
    const outH = rw >= rh ? Math.round(base * rh / rw) : base;
    const exportCanvas = document.createElement('canvas');
    renderCanvas(exportCanvas, outW, outH);
    return exportCanvas;
}

function getExportFileName() {
    const cleanName = state.photoName ? state.photoName.replace(/[^\w-]+/g, '_') : 'travel_ticket';
    return `${cleanName}_${state.ratio.replace(':', 'x')}.png`;
}

async function exportTicket() {
    if (isMobileSafari()) {
        const exportCanvas = makeExportCanvas();
        const fileName = getExportFileName();
        const blob = canvasToPngBlobSync(exportCanvas);
        const file = new File([blob], fileName, { type: 'image/png' });

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title: fileName });
                return;
            } catch (error) {
                if (error.name === 'AbortError') return;
            }
        }

        const imageUrl = URL.createObjectURL(blob);
        window.open(imageUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(imageUrl), 60000);
        return;
    }

    await ensureSelectedFontLoaded();
    const exportCanvas = makeExportCanvas();
    const fileName = getExportFileName();
    const blob = await canvasToPngBlob(exportCanvas);
    const imageUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = fileName;
    link.href = imageUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);
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
