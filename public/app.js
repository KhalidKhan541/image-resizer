(() => {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const controlsPanel = document.getElementById('controlsPanel');
  const imageList = document.getElementById('imageList');
  const processBtn = document.getElementById('processBtn');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  const clearBtn = document.getElementById('clearBtn');

  const widthInput = document.getElementById('widthInput');
  const heightInput = document.getElementById('heightInput');
  const aspectLock = document.getElementById('aspectLock');
  const percentSlider = document.getElementById('percentSlider');
  const percentValue = document.getElementById('percentValue');
  const qualitySlider = document.getElementById('qualitySlider');
  const qualityValue = document.getElementById('qualityValue');
  const formatSelect = document.getElementById('formatSelect');

  const pixelInputs = document.getElementById('pixelInputs');
  const percentInputs = document.getElementById('percentInputs');
  const presetInputs = document.getElementById('presetInputs');

  let images = [];
  let aspectRatio = 1;
  let isLocked = true;

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', () => handleFiles(fileInput.files));

  document.querySelectorAll('input[name="resizeMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      pixelInputs.style.display = 'none';
      percentInputs.style.display = 'none';
      presetInputs.style.display = 'none';
      if (radio.value === 'pixels') pixelInputs.style.display = '';
      else if (radio.value === 'percentage') percentInputs.style.display = '';
      else if (radio.value === 'preset') presetInputs.style.display = '';
    });
  });

  percentSlider.addEventListener('input', () => {
    percentValue.textContent = percentSlider.value + '%';
  });

  qualitySlider.addEventListener('input', () => {
    qualityValue.textContent = qualitySlider.value + '%';
  });

  aspectLock.addEventListener('click', () => {
    isLocked = !isLocked;
    aspectLock.classList.toggle('active', isLocked);
  });

  widthInput.addEventListener('input', () => {
    if (isLocked) {
      heightInput.value = Math.round(widthInput.value / aspectRatio);
    }
  });

  heightInput.addEventListener('input', () => {
    if (isLocked) {
      widthInput.value = Math.round(heightInput.value * aspectRatio);
    }
  });

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      widthInput.value = btn.dataset.width;
      heightInput.value = btn.dataset.height;
      aspectRatio = parseInt(btn.dataset.width) / parseInt(btn.dataset.height);
    });
  });

  processBtn.addEventListener('click', processImages);
  downloadAllBtn.addEventListener('click', downloadAllAsZip);
  clearBtn.addEventListener('click', clearAll);

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const imageData = {
            id: Date.now() + Math.random(),
            file,
            name: file.name,
            originalWidth: img.width,
            originalHeight: img.height,
            originalSize: file.size,
            preview: e.target.result,
            processed: null,
            processedBlob: null
          };
          images.push(imageData);
          if (images.length === 1) {
            widthInput.value = img.width;
            heightInput.value = img.height;
            aspectRatio = img.width / img.height;
          }
          renderImages();
          controlsPanel.style.display = '';
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function renderImages() {
    imageList.innerHTML = '';
    images.forEach(img => {
      const card = document.createElement('div');
      card.className = 'image-card';
      card.innerHTML = `
        <div class="image-card-header">
          <span class="image-name">${img.name}</span>
          <div class="image-meta">
            <span>${img.originalWidth}×${img.originalHeight}</span>
            <span>${formatSize(img.originalSize)}</span>
          </div>
        </div>
        <div class="image-card-body">
          <div class="preview-box">
            <span class="preview-label">Original</span>
            <img src="${img.preview}" alt="Original">
          </div>
          <div class="preview-box">
            <span class="preview-label after">Resized</span>
            ${img.processed ? `<img src="${img.processed}" alt="Resized">` : '<p style="color:#9ca3af;margin-top:60px">Click "Resize All"</p>'}
          </div>
        </div>
        ${img.processed ? `
        <div class="size-comparison">
          <div class="size-info">
            <span class="size-label">Original</span>
            <span class="size-value">${formatSize(img.originalSize)}</span>
          </div>
          <span class="size-arrow">→</span>
          <div class="size-info">
            <span class="size-label">Resized</span>
            <span class="size-value">${formatSize(img.processedBlob.size)}</span>
          </div>
          <span class="savings ${img.processedBlob.size > img.originalSize ? 'negative' : ''}">
            ${img.processedBlob.size > img.originalSize ? '+' : ''}${Math.round((1 - img.processedBlob.size / img.originalSize) * 100)}%
          </span>
        </div>` : ''}
        <div class="image-card-footer">
          ${img.processed ? `<button class="btn btn-sm btn-outline" onclick="window._downloadSingle('${img.id}')">Download</button>` : ''}
          <button class="btn btn-sm btn-remove" onclick="window._removeImage('${img.id}')">Remove</button>
        </div>
      `;
      imageList.appendChild(card);
    });
  }

  window._removeImage = (id) => {
    images = images.filter(img => img.id != id);
    renderImages();
    if (images.length === 0) {
      controlsPanel.style.display = 'none';
      downloadAllBtn.style.display = 'none';
    }
  };

  window._downloadSingle = (id) => {
    const img = images.find(i => i.id == id);
    if (!img || !img.processedBlob) return;
    const ext = formatSelect.value;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(img.processedBlob);
    a.download = img.name.replace(/\.[^.]+$/, `.${ext}`);
    a.click();
    URL.revokeObjectURL(a.href);
  };

  async function processImages() {
    const overlay = document.createElement('div');
    overlay.className = 'processing-overlay';
    overlay.innerHTML = '<div class="processing-card"><div class="spinner"></div><h3>Processing images...</h3><p id="progressText">0 of ' + images.length + '</p></div>';
    document.body.appendChild(overlay);

    const mode = document.querySelector('input[name="resizeMode"]:checked').value;
    const quality = parseInt(qualitySlider.value) / 100;
    const format = formatSelect.value;
    const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;

    for (let i = 0; i < images.length; i++) {
      document.getElementById('progressText').textContent = `${i + 1} of ${images.length}`;
      const img = images[i];
      let targetW, targetH;

      if (mode === 'pixels') {
        targetW = parseInt(widthInput.value);
        targetH = parseInt(heightInput.value);
      } else if (mode === 'percentage') {
        const scale = parseInt(percentSlider.value) / 100;
        targetW = Math.round(img.originalWidth * scale);
        targetH = Math.round(img.originalHeight * scale);
      } else {
        const activePreset = document.querySelector('.preset-btn.active');
        if (activePreset) {
          targetW = parseInt(activePreset.dataset.width);
          targetH = parseInt(activePreset.dataset.height);
        } else {
          targetW = img.originalWidth;
          targetH = img.originalHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const tempImg = new Image();
      await new Promise(resolve => {
        tempImg.onload = resolve;
        tempImg.src = img.preview;
      });
      ctx.drawImage(tempImg, 0, 0, targetW, targetH);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));
      img.processed = URL.createObjectURL(blob);
      img.processedBlob = blob;
    }

    overlay.remove();
    renderImages();
    downloadAllBtn.style.display = '';
  }

  async function downloadAllAsZip() {
    const zip = new JSZip();
    const ext = formatSelect.value;

    images.forEach((img, idx) => {
      if (img.processedBlob) {
        const fileName = img.name.replace(/\.[^.]+$/, `.${ext}`);
        zip.file(fileName, img.processedBlob);
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = 'resized-images.zip';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function clearAll() {
    images.forEach(img => {
      if (img.processed) URL.revokeObjectURL(img.processed);
    });
    images = [];
    imageList.innerHTML = '';
    controlsPanel.style.display = 'none';
    downloadAllBtn.style.display = 'none';
    fileInput.value = '';
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
})();
