const svgInput = document.getElementById('svgInput');
const dropzone = document.getElementById('dropzone');
const fileInfo = document.getElementById('fileInfo');
const resolutionPreset = document.getElementById('resolutionPreset');
const resolutionInput = document.getElementById('resolutionInput');
const resolutionHelp = document.getElementById('resolutionHelp');
const resolutionResult = document.getElementById('resolutionResult');

const removeDefs = document.getElementById('removeDefs');
const trimSvg = document.getElementById('trimSvg');
const forceWhite = document.getElementById('forceWhite');

const figmaName = document.getElementById('figmaName');
const figmaResource = document.getElementById('figmaResource');
const figmaX = document.getElementById('figmaX');
const figmaY = document.getElementById('figmaY');
const figmaW = document.getElementById('figmaW');
const figmaH = document.getElementById('figmaH');
const figmaRotation = document.getElementById('figmaRotation');
const figmaOpacity = document.getElementById('figmaOpacity');
const svgPathInput = document.getElementById('svgPathInput');
const figmaResult = document.getElementById('figmaResult');
const fillFromSvgBtn = document.getElementById('fillFromSvgBtn');

const processBtn = document.getElementById('processBtn');
const saveBtn = document.getElementById('saveBtn');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

const originalPreview = document.getElementById('originalPreview');
const fixedPreview = document.getElementById('fixedPreview');
const outputCode = document.getElementById('outputCode');
const metaBox = document.getElementById('metaBox');
const statusText = document.getElementById('statusText');

const historyBox = document.getElementById('historyBox');
const hideHistoryBtn = document.getElementById('hideHistoryBtn');
const showHistoryBtn = document.getElementById('showHistoryBtn');
const historyList = document.getElementById('historyList');
const historyCount = document.getElementById('historyCount');
const historyFloatCount = document.getElementById('historyFloatCount');
const toast = document.getElementById('toast');

let currentFileName = '';
let originalSvgText = '';
let fixedSvgText = '';
let currentResolution = null;
let finalSvgInfo = null;

const STORAGE_KEY = 'svg_hud_cleaner_history_v1';
const HISTORY_VISIBLE_KEY = 'svg_hud_cleaner_history_visible_v1';

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

function normalizeResolution(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace('*', 'x')
    .replace('×', 'x');
}

function validateResolution(text) {
  const normalized = normalizeResolution(text);
  const match = normalized.match(/^([1-9]\d{2,4})x([1-9]\d{2,4})$/);

  if (!match) {
    return {
      valid: false,
      message: 'Resolução inválida. Use o formato 1920x1080.'
    };
  }

  const width = Number(match[1]);
  const height = Number(match[2]);

  if (width < 320 || height < 240) {
    return {
      valid: false,
      message: 'Resolução muito baixa. Use no mínimo 320x240.'
    };
  }

  if (width > 10000 || height > 10000) {
    return {
      valid: false,
      message: 'Resolução muito alta. Confirme o valor digitado.'
    };
  }

  return {
    valid: true,
    width,
    height,
    value: `${width}x${height}`,
    aspect: (width / height).toFixed(3),
    message: `Resolução válida: ${width}x${height} • proporção ${width}:${height}`
  };
}

function updateResolutionState() {
  const result = validateResolution(resolutionInput.value);
  currentResolution = result.valid ? result : null;

  resolutionHelp.className = result.valid ? 'valid' : 'invalid';
  resolutionHelp.textContent = result.message;

  if (result.valid) {
    resolutionResult.innerHTML = `
      <strong class="valid">OK</strong><br>
      Largura: ${result.width}px<br>
      Altura: ${result.height}px<br>
      Aspect ratio: ${result.aspect}
    `;
  } else {
    resolutionResult.innerHTML = `<span class="invalid">${result.message}</span>`;
  }
}

function escapeHtml(text) {
  return String(text || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function setPreview(container, svgText) {
  container.innerHTML = svgText || '<span>Nenhuma SVG</span>';
}

function parseSvg(svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const error = doc.querySelector('parsererror');

  if (error) {
    throw new Error('SVG inválida ou com erro de sintaxe.');
  }

  const svg = doc.querySelector('svg');

  if (!svg) {
    throw new Error('Arquivo sem tag <svg>.');
  }

  return { doc, svg };
}

function getSvgInfo(svg) {
  return {
    width: svg.getAttribute('width') || 'não definido',
    height: svg.getAttribute('height') || 'não definido',
    viewBox: svg.getAttribute('viewBox') || 'não definido'
  };
}

function removeBadSvgParts(svg) {
  svg.querySelectorAll('defs, filter, mask, clipPath').forEach(node => node.remove());

  svg.querySelectorAll('*').forEach(node => {
    [...node.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = attr.value.toLowerCase();

      if (
        name === 'filter' ||
        name === 'mask' ||
        name === 'clip-path' ||
        value.includes('url(#filter') ||
        value.includes('url(#mask') ||
        value.includes('url(#clip')
      ) {
        node.removeAttribute(attr.name);
      }
    });
  });
}

function forceWhitePaths(svg) {
  svg.querySelectorAll('path, rect, circle, ellipse, polygon, polyline').forEach(node => {
    node.setAttribute('fill', 'white');

    if (!node.hasAttribute('fill-opacity')) {
      node.setAttribute('fill-opacity', '1');
    }
  });
}

function waitForNextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function getPreciseBBoxFromSvg(svgText) {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '-10000px';
  wrapper.style.width = '1000px';
  wrapper.style.height = '1000px';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.opacity = '0';
  wrapper.innerHTML = svgText;

  document.body.appendChild(wrapper);
  await waitForNextFrame();

  const svg = wrapper.querySelector('svg');
  if (!svg) {
    wrapper.remove();
    throw new Error('Não foi possível ler a SVG para calcular a área.');
  }

  let bbox = null;

  try {
    bbox = svg.getBBox();
  } catch (error) {
    wrapper.remove();
    throw new Error('Não foi possível calcular a área real da SVG.');
  }

  wrapper.remove();

  if (!bbox || bbox.width <= 0 || bbox.height <= 0) {
    throw new Error('A SVG não possui área visível para corrigir.');
  }

  return {
    x: Number(bbox.x.toFixed(4)),
    y: Number(bbox.y.toFixed(4)),
    width: Number(bbox.width.toFixed(4)),
    height: Number(bbox.height.toFixed(4))
  };
}

function rebuildSvgWithTrimmedViewBox(doc, svg, bbox) {
  const ns = 'http://www.w3.org/2000/svg';
  const newDoc = document.implementation.createDocument(ns, 'svg', null);
  const newSvg = newDoc.documentElement;

  const cleanWidth = Number(bbox.width.toFixed(4));
  const cleanHeight = Number(bbox.height.toFixed(4));

  newSvg.setAttribute('width', String(cleanWidth));
  newSvg.setAttribute('height', String(cleanHeight));
  newSvg.setAttribute('viewBox', `0 0 ${cleanWidth} ${cleanHeight}`);
  newSvg.setAttribute('fill', svg.getAttribute('fill') || 'none');
  newSvg.setAttribute('xmlns', ns);

  const group = newDoc.createElementNS(ns, 'g');
  group.setAttribute('transform', `translate(${-bbox.x} ${-bbox.y})`);

  [...svg.childNodes].forEach(child => {
    if (child.nodeType === Node.ELEMENT_NODE || child.nodeType === Node.TEXT_NODE) {
      group.appendChild(newDoc.importNode(child, true));
    }
  });

  newSvg.appendChild(group);
  return newDoc;
}

function serializeSvg(doc) {
  let text = new XMLSerializer().serializeToString(doc.documentElement);

  text = text
    .replace(/></g, '>\n<')
    .replace(/\s+xmlns:NS\d+="[^"]+"/g, '')
    .replace(/NS\d+:/g, '');

  return text;
}

function getFigmaData() {
  const uploadedName = currentFileName || 'icone.svg';
  const cleanName = uploadedName.replace(/\.svg$/i, '');

  return {
    name: figmaName.value.trim() || cleanName,
    parent: figmaResource.value.trim() || 'infos',
    x: figmaX.value.trim(),
    y: figmaY.value.trim(),
    w: figmaW.value.trim(),
    h: figmaH.value.trim(),
    rotation: figmaRotation.value.trim() || '0',
    opacity: figmaOpacity.value.trim() || '100',
    path: svgPathInput.value.trim() || `nui/interface/${uploadedName}`
  };
}

function isNumberLike(value) {
  return value !== '' && !Number.isNaN(Number(value));
}

function updateFigmaPanel() {
  const data = getFigmaData();

  figmaResult.innerHTML = `
    <strong class="valid">Informações prontas para salvar</strong><br>
    Nome: ${escapeHtml(data.name)}<br>
    X: ${escapeHtml(data.x || '-')} • Y: ${escapeHtml(data.y || '-')}<br>
    L: ${escapeHtml(data.w || '-')} • A: ${escapeHtml(data.h || '-')}<br>
    Parent: ${escapeHtml(data.parent)}<br>
    Caminho: ${escapeHtml(data.path)}
  `;
}

async function processSvg() {
  if (!originalSvgText) {
    showToast('Envie uma SVG primeiro.');
    return;
  }

  updateResolutionState();

  if (!currentResolution) {
    showToast('Digite uma resolução válida.');
    return;
  }

  try {
    const { doc, svg } = parseSvg(originalSvgText);

    if (removeDefs.checked) {
      removeBadSvgParts(svg);
    }

    if (forceWhite.checked) {
      forceWhitePaths(svg);
    }

    let processedDoc = doc;
    let bbox = null;

    if (trimSvg.checked) {
      const beforeTrimText = serializeSvg(doc);
      bbox = await getPreciseBBoxFromSvg(beforeTrimText);
      processedDoc = rebuildSvgWithTrimmedViewBox(doc, svg, bbox);
    }

    fixedSvgText = serializeSvg(processedDoc);
    outputCode.value = fixedSvgText;
    setPreview(fixedPreview, fixedSvgText);

    finalSvgInfo = getSvgInfo(processedDoc.documentElement);
    updateFigmaPanel();

    statusText.textContent = 'SVG corrigida com sucesso.';

    metaBox.innerHTML = `
      <strong>Arquivo:</strong> ${escapeHtml(currentFileName)}<br>
      <strong>Resolução selecionada:</strong> ${currentResolution.value}<br>
      <strong>SVG final:</strong> width=${finalSvgInfo.width}, height=${finalSvgInfo.height}, viewBox=${finalSvgInfo.viewBox}
      ${bbox ? `<br><strong>Área real detectada:</strong> x=${bbox.x}, y=${bbox.y}, w=${bbox.width}, h=${bbox.height}` : ''}
    `;

    showToast('SVG corrigida.');
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Erro ao processar SVG.');
    statusText.textContent = 'Erro ao processar SVG.';
  }
}

function handleFile(file) {
  if (!file) return;

  if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
    showToast('Envie apenas arquivos SVG.');
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    originalSvgText = String(reader.result || '');
    fixedSvgText = '';
    finalSvgInfo = null;
    currentFileName = file.name;

    try {
      const { svg } = parseSvg(originalSvgText);
      const info = getSvgInfo(svg);

      if (!figmaName.value.trim()) {
        figmaName.value = file.name.replace(/\.svg$/i, '');
      }

      if (!svgPathInput.value.trim()) {
        svgPathInput.value = `nui/interface/${file.name}`;
      }

      fileInfo.innerHTML = `
        <strong>${escapeHtml(file.name)}</strong><br>
        Original: width=${info.width}, height=${info.height}, viewBox=${info.viewBox}
      `;

      metaBox.innerHTML = `
        <strong>Arquivo carregado:</strong> ${escapeHtml(file.name)}<br>
        <strong>Original:</strong> width=${info.width}, height=${info.height}, viewBox=${info.viewBox}
      `;

      setPreview(originalPreview, originalSvgText);
      fixedPreview.innerHTML = '<span>Clique em corrigir SVG</span>';
      outputCode.value = '';
      updateFigmaPanel();

      statusText.textContent = 'SVG carregada. Agora valide a resolução.';
      showToast('SVG carregada.');
    } catch (error) {
      showToast(error.message || 'SVG inválida.');
    }
  };

  reader.readAsText(file);
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function setHistory(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function isHistoryVisible() {
  return localStorage.getItem(HISTORY_VISIBLE_KEY) !== 'false';
}

function setHistoryVisible(visible) {
  localStorage.setItem(HISTORY_VISIBLE_KEY, visible ? 'true' : 'false');

  if (visible) {
    historyBox.classList.remove('hidden');
    showHistoryBtn.classList.remove('show');
  } else {
    historyBox.classList.add('hidden');
    showHistoryBtn.classList.add('show');
  }
}

function renderHistory() {
  const items = getHistory();
  historyCount.textContent = items.length;
  historyFloatCount.textContent = items.length;

  if (!items.length) {
    historyList.innerHTML = '<div class="history-empty">Nenhuma SVG salva ainda.</div>';
    return;
  }

  historyList.innerHTML = '';

  items.forEach(item => {
    const card = document.createElement('button');
    card.className = 'history-item';
    card.type = 'button';
    card.innerHTML = `
      <strong>${escapeHtml(item.name)}</strong>
      <small>${escapeHtml(item.resolution)} • X:${escapeHtml(item.figma.x || '-')} Y:${escapeHtml(item.figma.y || '-')} • ${escapeHtml(item.date)}</small>
    `;

    card.addEventListener('click', () => {
      currentFileName = item.name;
      fixedSvgText = item.svg;
      originalSvgText = item.originalSvg || item.svg;

      resolutionInput.value = item.resolution;
      updateResolutionState();

      figmaName.value = item.figma.name || '';
      figmaResource.value = item.figma.parent || 'infos';
      figmaX.value = item.figma.x || '';
      figmaY.value = item.figma.y || '';
      figmaW.value = item.figma.w || '';
      figmaH.value = item.figma.h || '';
      figmaRotation.value = item.figma.rotation || '0';
      figmaOpacity.value = item.figma.opacity || '100';
      svgPathInput.value = item.figma.path || '';

      updateFigmaPanel();

      setPreview(originalPreview, originalSvgText);
      setPreview(fixedPreview, fixedSvgText);
      outputCode.value = fixedSvgText;

      statusText.textContent = 'Salvamento carregado.';
      metaBox.innerHTML = `
        <strong>Salvamento carregado:</strong> ${escapeHtml(item.name)}<br>
        <strong>Resolução:</strong> ${escapeHtml(item.resolution)}<br>
        <strong>Figma:</strong> X=${escapeHtml(item.figma.x || '-')} Y=${escapeHtml(item.figma.y || '-')} L=${escapeHtml(item.figma.w || '-')} A=${escapeHtml(item.figma.h || '-')}
      `;

      showToast('Salvamento carregado.');
    });

    historyList.appendChild(card);
  });
}

function saveCurrentSvg() {
  if (!fixedSvgText) {
    showToast('Corrija uma SVG antes de salvar.');
    return;
  }

  if (!currentResolution) {
    updateResolutionState();
  }

  updateFigmaPanel();

  const items = getHistory();
  const now = new Date();
  const figma = getFigmaData();

  items.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name: figma.name || currentFileName || 'svg-corrigida.svg',
    resolution: currentResolution ? currentResolution.value : 'sem resolução',
    date: now.toLocaleString('pt-BR'),
    svg: fixedSvgText,
    originalSvg: originalSvgText,
    figma
  });

  setHistory(items.slice(0, 20));
  renderHistory();

  showToast('SVG salva no histórico.');
}

function downloadCurrentSvg() {
  if (!fixedSvgText) {
    showToast('Corrija uma SVG antes de baixar.');
    return;
  }

  const blob = new Blob([fixedSvgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const fileName = (figmaName.value.trim() || currentFileName || 'svg-corrigida.svg')
    .replace(/\.svg$/i, '')
    .replace(/[^\w\-]+/g, '_');

  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}_corrigida.svg`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
  showToast('Download iniciado.');
}

async function copyCurrentSvg() {
  if (!fixedSvgText) {
    showToast('Corrija uma SVG antes de copiar.');
    return;
  }

  try {
    await navigator.clipboard.writeText(fixedSvgText);
    showToast('SVG copiada.');
  } catch {
    outputCode.select();
    document.execCommand('copy');
    showToast('SVG copiada.');
  }
}

function activateTab(button) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  button.classList.add('active');
  document.getElementById(button.dataset.tab).classList.add('active');
}

document.querySelectorAll('.tab').forEach(button => {
  button.addEventListener('click', () => activateTab(button));
});

svgInput.addEventListener('change', event => {
  handleFile(event.target.files[0]);
});

dropzone.addEventListener('dragover', event => {
  event.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', event => {
  event.preventDefault();
  dropzone.classList.remove('dragover');
  handleFile(event.dataTransfer.files[0]);
});

resolutionPreset.addEventListener('change', () => {
  if (resolutionPreset.value) {
    resolutionInput.value = resolutionPreset.value;
    updateResolutionState();
  }
});

[
  resolutionInput,
  figmaName,
  figmaResource,
  figmaX,
  figmaY,
  figmaW,
  figmaH,
  figmaRotation,
  figmaOpacity,
  svgPathInput
].forEach(input => {
  input.addEventListener('input', () => {
    updateResolutionState();
    updateFigmaPanel();
  });
});

fillFromSvgBtn.addEventListener('click', () => {
  if (!finalSvgInfo) {
    showToast('Corrija a SVG primeiro para usar o tamanho final.');
    return;
  }

  figmaW.value = finalSvgInfo.width;
  figmaH.value = finalSvgInfo.height;
  updateFigmaPanel();
  showToast('Dimensões preenchidas.');
});

processBtn.addEventListener('click', processSvg);
saveBtn.addEventListener('click', saveCurrentSvg);
downloadBtn.addEventListener('click', downloadCurrentSvg);
copyBtn.addEventListener('click', copyCurrentSvg);

clearHistoryBtn.addEventListener('click', () => {
  if (!confirm('Deseja apagar todos os salvamentos?')) return;
  setHistory([]);
  renderHistory();
  showToast('Histórico apagado.');
});

hideHistoryBtn.addEventListener('click', () => {
  setHistoryVisible(false);
});

showHistoryBtn.addEventListener('click', () => {
  setHistoryVisible(true);
});

updateResolutionState();
updateFigmaPanel();
renderHistory();
setHistoryVisible(isHistoryVisible());
