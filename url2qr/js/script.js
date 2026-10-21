/**
 * URL2QR - Modern QR Code Generator
 * Core Application Logic (Powered by robust qrcode-generator engine)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Ensure UTF-8 string encoding support for international/Korean characters
  if (typeof qrcode !== 'undefined' && qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  }

  // DOM Elements
  const body = document.body;
  const urlForm = document.getElementById('urlForm');
  const urlInput = document.getElementById('urlInput');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnClear = document.getElementById('btnClear');
  const inputBorder = document.querySelector('.input-glow-border');
  const inputFeedback = document.getElementById('inputFeedback');
  const qrStage = document.getElementById('qrStage');
  const qrCard = document.getElementById('qrCard');
  const qrCodeContainer = document.getElementById('qrCodeContainer');
  const qrDisplayUrl = document.getElementById('qrDisplayUrl');
  const logoResetBtn = document.getElementById('logoResetBtn');
  const toast = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');

  let activeQrData = null; // Stores generated QR instance
  let currentRawUrl = '';
  let toastTimer = null;

  // =========================================================================
  // Interactive Cursor-Driven Gradient
  // =========================================================================
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;

  function handlePointerMove(e) {
    targetX = e.clientX;
    targetY = e.clientY;
  }

  window.addEventListener('mousemove', handlePointerMove, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches.length > 0) {
      targetX = e.touches[0].clientX;
      targetY = e.touches[0].clientY;
    }
  }, { passive: true });

  function renderDynamicGradient() {
    // Smooth Lerp (Linear Interpolation) for silk-like organic motion
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;

    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;
    const ratioX = Math.min(Math.max(currentX / width, 0), 1);
    const ratioY = Math.min(Math.max(currentY / height, 0), 1);

    // Set CSS custom properties on documentElement
    document.documentElement.style.setProperty('--mouse-x', `${currentX.toFixed(1)}px`);
    document.documentElement.style.setProperty('--mouse-y', `${currentY.toFixed(1)}px`);
    document.documentElement.style.setProperty('--mouse-ratio-x', ratioX.toFixed(3));
    document.documentElement.style.setProperty('--mouse-ratio-y', ratioY.toFixed(3));

    requestAnimationFrame(renderDynamicGradient);
  }

  // Start smooth animation loop
  renderDynamicGradient();

  // Initialize Focus on URL Input
  urlInput.focus();

  // Handle Input typing to show/hide clear button & remove error warnings
  urlInput.addEventListener('input', () => {
    clearFeedback();
    if (urlInput.value.trim().length > 0) {
      btnClear.classList.add('visible');
    } else {
      btnClear.classList.remove('visible');
    }
  });

  // Clear button action
  btnClear.addEventListener('click', () => {
    urlInput.value = '';
    btnClear.classList.remove('visible');
    clearFeedback();
    urlInput.focus();
  });

  // Handle Form Submit (Confirm button or Enter key)
  urlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    generateQRCode();
  });

  btnSubmit.addEventListener('click', (e) => {
    e.preventDefault();
    generateQRCode();
  });

  /**
   * Helper: Build QR Code instance with fallback error correction levels
   */
  function createQrInstance(text) {
    // Try High -> Medium -> Low error correction levels automatically
    const levels = ['H', 'Q', 'M', 'L'];
    for (let lvl of levels) {
      try {
        const qr = qrcode(0, lvl); // 0 = automatic version / typeNumber determination
        qr.addData(text, 'Byte');
        qr.make();
        return qr;
      } catch (e) {
        // Continue to try lower level if text is exceptionally long
      }
    }
    throw new Error('Unable to encode data into QR code');
  }

  /**
   * Render QR Code to HTML Canvas
   */
  function renderQrToCanvas(qr, targetCanvas, canvasSize, padding = 16) {
    const moduleCount = qr.getModuleCount();
    targetCanvas.width = canvasSize;
    targetCanvas.height = canvasSize;
    const ctx = targetCanvas.getContext('2d');

    // 1. Fill solid background (White)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // 2. Calculate cell size and centering offset
    const availableSize = canvasSize - (padding * 2);
    const cellSize = availableSize / moduleCount;

    // 3. Draw QR modules
    ctx.fillStyle = '#0a0e17';
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (qr.isDark(r, c)) {
          const x = padding + c * cellSize;
          const y = padding + r * cellSize;
          // Sub-pixel rendering rounding to prevent hairline gaps
          const w = Math.ceil((c + 1) * cellSize) - Math.floor(c * cellSize);
          const h = Math.ceil((r + 1) * cellSize) - Math.floor(r * cellSize);
          ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
        }
      }
    }
  }

  /**
   * Generate QR Code Action
   */
  function generateQRCode() {
    let inputVal = urlInput.value.trim();

    if (!inputVal) {
      showFeedback('URL을 입력해주세요.');
      shakeInput();
      urlInput.focus();
      return;
    }

    // Auto-prefix protocol if it looks like a domain name
    let targetUrl = inputVal;
    const urlPattern = /^(https?:\/\/)/i;
    const domainLikePattern = /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/;

    if (!urlPattern.test(targetUrl) && domainLikePattern.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
      urlInput.value = targetUrl;
    }

    currentRawUrl = targetUrl;
    clearFeedback();

    try {
      if (typeof qrcode === 'undefined') {
        throw new Error('QR 라이브러리가 로드되지 않았습니다.');
      }

      // Generate QR Code data structure
      const qr = createQrInstance(targetUrl);
      activeQrData = qr;

      // Render into a clean, display canvas (256x256)
      qrCodeContainer.innerHTML = '';
      const displayCanvas = document.createElement('canvas');
      displayCanvas.style.display = 'block';
      displayCanvas.style.width = '100%';
      displayCanvas.style.height = '100%';
      displayCanvas.style.borderRadius = '12px';
      renderQrToCanvas(qr, displayCanvas, 512, 28); // 512px canvas for sharp display on Retina screens
      qrCodeContainer.appendChild(displayCanvas);

      // Update URL display badge
      qrDisplayUrl.textContent = targetUrl;

      // State Transition: Smoothly move dock down and show centered QR code
      if (body.classList.contains('state-initial')) {
        body.classList.remove('state-initial');
        body.classList.add('state-generated');
      }

      // Trigger pop-in highlight effect on the card
      qrCard.classList.remove('pop-effect');
      void qrCard.offsetWidth; // Trigger reflow
      qrCard.classList.add('pop-effect');

    } catch (err) {
      console.error('QR code generation failed:', err);
      showFeedback('QR 코드 생성 중 오류가 발생했습니다: ' + (err.message || err));
      shakeInput();
    }
  }

  // QR Code Card Click -> Download as High-Resolution JPG
  qrCard.addEventListener('click', () => {
    downloadQRCodeAsJpg();
  });

  // Accessible Keyboard Support (Enter / Space on QR Card)
  qrCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      downloadQRCodeAsJpg();
    }
  });

  /**
   * Convert QR Code to 1200x1200 High-Resolution JPG and Trigger Download
   */
  function downloadQRCodeAsJpg() {
    if (!activeQrData || !currentRawUrl) {
      showToast('먼저 URL을 입력하여 QR 코드를 생성해주세요.');
      return;
    }

    try {
      // 1. High-Resolution 1200x1200 Canvas for crisp print & digital usage
      const exportCanvas = document.createElement('canvas');
      renderQrToCanvas(activeQrData, exportCanvas, 1200, 120);

      // 2. Export to JPG (0.95 quality)
      const jpgUrl = exportCanvas.toDataURL('image/jpeg', 0.95);

      // 3. Build a friendly filename based on the domain or content
      let safeName = 'qrcode';
      try {
        const parsed = new URL(currentRawUrl);
        safeName = 'qrcode_' + parsed.hostname.replace(/[^a-zA-Z0-9_-]/g, '_');
      } catch {
        safeName = 'qrcode_' + currentRawUrl.slice(0, 12).replace(/[^a-zA-Z0-9_-]/g, '_');
      }

      const downloadLink = document.createElement('a');
      downloadLink.href = jpgUrl;
      downloadLink.download = `${safeName}.jpg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      showToast('고화질 JPG 파일로 다운로드되었습니다!');
    } catch (e) {
      console.error('Download export failed:', e);
      showToast('다운로드 중 오류가 발생했습니다.');
    }
  }

  // Logo Click: Reset to initial state
  logoResetBtn.addEventListener('click', (e) => {
    e.preventDefault();
    body.classList.remove('state-generated');
    body.classList.add('state-initial');
    urlInput.value = '';
    btnClear.classList.remove('visible');
    clearFeedback();
    currentRawUrl = '';
    activeQrData = null;
    qrCodeContainer.innerHTML = '';
    urlInput.focus();
  });

  // UI Feedback Helpers
  function shakeInput() {
    inputBorder.classList.remove('shake');
    void inputBorder.offsetWidth; // Trigger reflow
    inputBorder.classList.add('shake');
  }

  function showFeedback(msg) {
    inputFeedback.textContent = msg;
    inputFeedback.classList.add('visible');
  }

  function clearFeedback() {
    inputFeedback.textContent = '';
    inputFeedback.classList.remove('visible');
  }

  function showToast(message) {
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastMessage.textContent = message;
    toast.classList.add('active');

    toastTimer = setTimeout(() => {
      toast.classList.remove('active');
    }, 3200);
  }
});
