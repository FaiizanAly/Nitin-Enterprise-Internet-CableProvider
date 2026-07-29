/**
 * ================================================================
 * NITIN ENTERPRISE — SMART PAYMENT SYSTEM  (Premium Edition)
 * pay.js  |  v2.0.0
 * Author : Faizan Ali
 *
 * ─────────────────────────────────────────────────────────────────
 * FRONTEND-ONLY NOTICE
 * ─────────────────────────────────────────────────────────────────
 * This page is 100% client-side. UPI deep links and QR codes
 * initiate payment requests on the user's device but payment
 * SUCCESS cannot be automatically verified here.
 *
 * To confirm payment completion you would need:
 *   • A backend server with UPI webhook integration
 *   • OR a payment gateway (Razorpay / PayU / Cashfree)
 *
 * This page intentionally does NOT show "Payment Successful"
 * without user confirmation (screenshot via WhatsApp).
 * ─────────────────────────────────────────────────────────────────
 * ================================================================
 */

'use strict';

/* ================================================================
   CONSTANTS
================================================================ */
const UPI_PA       = 'tradesnitin1-1@okicici'; // Payee VPA
const UPI_PN       = 'Nitin Trades';             // Payee name
const UPI_CU       = 'INR';                       // Currency
const WA_NUMBER    = '918630473928';             // WhatsApp number (no +)
const AMOUNT_MIN   = 1;
const AMOUNT_MAX   = 100000;

/* ================================================================
   STATE
================================================================ */
let currentQRInstance = null;   // QRCode.js instance
let lastValidAmount   = null;   // Cached valid amount after QR gen
let lastPurpose       = null;   // Cached purpose after QR gen
let _toastTimer       = null;   // Toast hide timer

/* ================================================================
   UTILITY — BUILD UPI URI
================================================================ */
/**
 * Builds a standards-compliant UPI intent URI with all fields.
 * @param {number|string} amount
 * @param {string}        purpose  — passed as transaction note (tn)
 * @returns {string}
 */
function buildUpiUri(amount, purpose) {
  return (
    'upi://pay' +
    '?pa=' + encodeURIComponent(UPI_PA) +
    '&pn=' + encodeURIComponent(UPI_PN) +
    '&am=' + encodeURIComponent(String(amount)) +
    '&cu=' + UPI_CU +
    '&tn=' + encodeURIComponent(purpose)
  );
}

/**
 * Formats a number as Indian currency.
 * @param {number} amount
 * @returns {string}  e.g. "₹1,500"
 */
function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

/* ================================================================
   TOAST NOTIFICATION
================================================================ */
/**
 * Shows a temporary toast notification at the top of the screen.
 * @param {string} message
 * @param {number} [duration=3000]
 */
function showToast(message, duration = 3000) {
  const toast    = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;

  if (_toastTimer) {
    clearTimeout(_toastTimer);
    toast.classList.remove('toast--visible');
    void toast.offsetWidth; // Flush CSS transition so it restarts cleanly
  }

  toast.classList.add('toast--visible');
  _toastTimer = setTimeout(() => {
    toast.classList.remove('toast--visible');
    _toastTimer = null;
  }, duration);
}

/* ================================================================
   FORM VALIDATION
================================================================ */
/**
 * Validates the amount field.
 * @returns {{ valid: boolean, amount: number|null }}
 */
function validateAmount() {
  const input   = document.getElementById('amount-input');
  const errorEl = document.getElementById('amount-error');

  /* Clear previous error */
  input.classList.remove('field__input--error');
  if (errorEl) { errorEl.hidden = true; errorEl.textContent = ''; }

  const raw    = input.value.trim();
  const amount = Number(raw);

  if (!raw) {
    return setError(input, errorEl, '⚠  Please enter a payment amount.');
  }

  if (isNaN(amount) || raw === '') {
    return setError(input, errorEl, '⚠  Please enter a valid amount.');
  }

  if (amount <= 0) {
    return setError(input, errorEl, '⚠  Amount must be greater than ₹0.');
  }

  if (!Number.isInteger(amount)) {
    return setError(input, errorEl, '⚠  Decimals are not allowed. Enter a whole number.');
  }

  if (amount < AMOUNT_MIN) {
    return setError(input, errorEl, `⚠  Minimum amount is ${formatCurrency(AMOUNT_MIN)}.`);
  }

  if (amount > AMOUNT_MAX) {
    return setError(input, errorEl, `⚠  Maximum amount is ${formatCurrency(AMOUNT_MAX)}.`);
  }

  return { valid: true, amount };
}

/**
 * Applies error state and runs a shake animation.
 * @private
 */
function setError(input, errorEl, message) {
  input.classList.add('field__input--error');
  if (errorEl) { errorEl.textContent = message; errorEl.hidden = false; }

  input.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(-3px)' },
      { transform: 'translateX(3px)' },
      { transform: 'translateX(0)' },
    ],
    { duration: 300, easing: 'ease-in-out' }
  );

  input.focus();
  return { valid: false, amount: null };
}

/* ================================================================
   LIVE SUMMARY CARD — updates whenever any input changes
================================================================ */
function updateLiveSummary() {
  const nameInput = document.getElementById('customer-name');
  const amtInput  = document.getElementById('amount-input');
  const purpose   = document.getElementById('purpose-select')?.value ?? 'Internet Bill';

  const name   = nameInput?.value.trim() || '—';
  const amount = parseInt(amtInput?.value, 10);

  /* Update each summary row */
  setEl('sum-name',    name);
  setEl('sum-amount',  (!isNaN(amount) && amount > 0) ? formatCurrency(amount) : '—');
  setEl('sum-purpose', purpose);

  /* Also update sticky bar */
  updateStickyBar(!isNaN(amount) && amount > 0 ? amount : 0);
}

/**
 * Updates the sticky bottom bar amount display.
 * @param {number} amount
 */
function updateStickyBar(amount) {
  const el = document.getElementById('sticky-amount');
  if (!el) return;
  if (amount > 0) {
    el.textContent = formatCurrency(amount);
    el.classList.add('sticky-bar__amount--active');
  } else {
    el.textContent = '₹ —';
    el.classList.remove('sticky-bar__amount--active');
  }
}

/** Helper: safely set textContent of an element by ID */
function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* ================================================================
   GENERATE QR (Tab 1)
================================================================ */
/**
 * Validates inputs, builds the UPI URI, and renders the QR code
 * using QRCode.js (loaded from CDN). Auto-scrolls to the result.
 */
function generateQR() {
  const { valid, amount } = validateAmount();
  if (!valid) return;

  const purpose = document.getElementById('purpose-select')?.value ?? 'Internet Bill';
  const upiUri  = buildUpiUri(amount, purpose);

  /* Cache for download / share */
  lastValidAmount = amount;
  lastPurpose     = purpose;

  /* Clear existing QR canvas */
  const container = document.getElementById('qr-canvas-container');
  container.innerHTML = '';

  /* Safety check: library loaded? */
  if (typeof QRCode === 'undefined') {
    showToast('QR library not loaded. Check your internet connection.', 5000);
    return;
  }

  /* Render new QR */
  currentQRInstance = new QRCode(container, {
    text:         upiUri,
    width:        220,
    height:       220,
    colorDark:    '#111827',
    colorLight:   '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.H, // High error-correction (30% damage OK)
  });

  /* Update QR summary strip */
  setEl('qr-amount-display',  formatCurrency(amount));
  setEl('qr-purpose-display', purpose);

  /* Show result card */
  const resultCard = document.getElementById('qr-result-card');
  resultCard.hidden = false;

  /* Show Web Share button if supported */
  const shareBtn = document.getElementById('btn-share-qr');
  if (navigator.share) shareBtn.hidden = false;

  /* ── AUTO-SCROLL to the QR result ── */
  setTimeout(() => {
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80); // slight delay ensures the card is rendered before scroll

  showToast('QR Code Generated!');
}

/* ================================================================
   DOWNLOAD QR
================================================================ */
/**
 * Exports the generated QR canvas/image as a PNG download.
 */
function downloadQR() {
  const container = document.getElementById('qr-canvas-container');
  const canvas    = container?.querySelector('canvas');
  const img       = container?.querySelector('img');

  if (!canvas && !img) {
    showToast('Please generate a QR code first.', 4000);
    return;
  }

  const amount   = lastValidAmount ?? 'unknown';
  const filename = `NitinEnterprise-QR-Rs${amount}.png`;

  if (canvas) {
    /* Direct canvas export */
    const link    = document.createElement('a');
    link.href     = canvas.toDataURL('image/png');
    link.download = filename;
    link.click();
  } else if (img) {
    /* Fallback: draw <img> onto temp canvas then export */
    const tmp = document.createElement('canvas');
    tmp.width  = img.naturalWidth  || 220;
    tmp.height = img.naturalHeight || 220;
    tmp.getContext('2d').drawImage(img, 0, 0);

    const link    = document.createElement('a');
    link.href     = tmp.toDataURL('image/png');
    link.download = filename;
    link.click();
  }

  showToast('QR downloaded!');
}

/* ================================================================
   SHARE PAYMENT (Web Share API)
================================================================ */
/**
 * Shares the payment request using the Web Share API.
 * Includes the QR image if the browser supports file sharing.
 */
async function sharePayment() {
  if (!lastValidAmount) {
    showToast('Please generate a QR code first.', 4000);
    return;
  }

  const purpose = lastPurpose ?? 'Internet Bill';
  const name    = document.getElementById('customer-name')?.value.trim() ?? '';

  const text = [
    `💳 Payment Request — Nitin Enterprise`,
    `Amount : ${formatCurrency(lastValidAmount)}`,
    `Purpose: ${purpose}`,
    name ? `Customer: ${name}` : '',
    `UPI ID : ${UPI_PA}`,
  ].filter(Boolean).join('\n');

  try {
    const container = document.getElementById('qr-canvas-container');
    const canvas    = container?.querySelector('canvas');

    if (canvas && navigator.canShare) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], 'NitinEnterprise-QR.png', { type: 'image/png' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Pay ${formatCurrency(lastValidAmount)} — Nitin Enterprise`,
          text,
          files: [file],
        });
        showToast('Shared successfully!');
        return;
      }
    }

    /* Text-only share fallback */
    await navigator.share({
      title: `Pay ${formatCurrency(lastValidAmount)} — Nitin Enterprise`,
      text,
    });
    showToast('Shared successfully!');

  } catch (err) {
    if (err.name !== 'AbortError') showToast('Could not share. Try copying instead.', 4000);
  }
}

/* ================================================================
   OPEN UPI APP (Tab 2)
================================================================ */
/**
 * Validates inputs, constructs the UPI deep link, and opens it.
 * If no UPI app is installed, shows a friendly fallback message.
 */
function openUpiApp() {
  const { valid, amount } = validateAmount();
  if (!valid) return;

  const purpose = document.getElementById('purpose-select')?.value ?? 'Internet Bill';
  const upiUri  = buildUpiUri(amount, purpose);
  const noUpiMsg = document.getElementById('no-upi-msg');

  if (noUpiMsg) noUpiMsg.hidden = true;

  window.location.href = upiUri;

  /*
   * Detection: if the page stays active after 2 seconds,
   * a UPI app was probably not found.
   */
  let appOpened = false;

  const onHide  = () => { if (document.hidden) { appOpened = true; cleanup(); } };
  const onBlur  = () => { appOpened = true; cleanup(); };

  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('blur', onBlur);

  function cleanup() {
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('blur', onBlur);
  }

  setTimeout(() => {
    cleanup();
    if (!appOpened && !document.hidden) {
      if (noUpiMsg) {
        noUpiMsg.hidden = false;
        noUpiMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, 2000);
}

/* ================================================================
   COPY UPI ID
================================================================ */
function copyUpiId() {
  const copy = (text) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => showToast('UPI ID Copied Successfully!'))
        .catch(() => legacyCopy(text));
    } else {
      legacyCopy(text);
    }
  };

  copy(UPI_PA);
}

/** Clipboard fallback using a hidden textarea + execCommand. */
function legacyCopy(text) {
  const el = Object.assign(document.createElement('textarea'), {
    value: text,
    readOnly: true,
    style: 'position:absolute;left:-9999px;top:-9999px',
  });
  document.body.appendChild(el);
  el.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (_) {}
  document.body.removeChild(el);
  showToast(ok ? 'UPI ID Copied Successfully!' : `Copy manually: ${text}`, ok ? 3000 : 6000);
}

/* ================================================================
   SEND PAYMENT SCREENSHOT — WhatsApp
================================================================ */
/**
 * Opens WhatsApp with a prefilled message containing payment details.
 * The user is expected to attach their screenshot manually.
 *
 * NOTE: WhatsApp's wa.me link supports ?text= for prefilling messages
 * but cannot programmatically attach images — the user must do that
 * inside the WhatsApp app.
 *
 * @param {Event} event
 */
function sendWhatsAppScreenshot(event) {
  event.preventDefault();

  const name    = document.getElementById('customer-name')?.value.trim() || 'Not provided';
  const amtRaw  = document.getElementById('amount-input')?.value.trim()  || '';
  const purpose = document.getElementById('purpose-select')?.value        ?? 'Internet Bill';
  const amount  = parseInt(amtRaw, 10);
  const amtStr  = (!isNaN(amount) && amount > 0) ? formatCurrency(amount) : 'Not entered';

  const message =
    `Hello Nitin Enterprise,\n\n` +
    `I have completed my payment.\n\n` +
    `Customer Name:\n${name}\n\n` +
    `Amount:\n${amtStr}\n\n` +
    `Purpose:\n${purpose}\n\n` +
    `UPI ID:\n${UPI_PA}\n\n` +
    `I am attaching my payment screenshot.`;

  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/* ================================================================
   RESET ALL
================================================================ */
/**
 * Clears every form field and resets the page to its initial state.
 * Prompts for confirmation before proceeding.
 */
function resetAll() {
  const confirmed = window.confirm(
    'Are you sure you want to clear all entered information?\n\n' +
    'This will remove your name, amount, generated QR, and payment summary.'
  );

  if (!confirmed) return;

  /* ── Clear fields ── */
  const nameInput = document.getElementById('customer-name');
  const amtInput  = document.getElementById('amount-input');
  const purpose   = document.getElementById('purpose-select');

  if (nameInput) nameInput.value = '';
  if (amtInput)  amtInput.value  = '';
  if (purpose)   purpose.selectedIndex = 0;

  /* ── Clear validation errors ── */
  amtInput?.classList.remove('field__input--error');
  const errEl = document.getElementById('amount-error');
  if (errEl) { errEl.hidden = true; errEl.textContent = ''; }

  /* ── De-select all chips ── */
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('chip--active'));

  /* ── Clear QR ── */
  const container = document.getElementById('qr-canvas-container');
  if (container) container.innerHTML = '';
  currentQRInstance = null;
  lastValidAmount   = null;
  lastPurpose       = null;

  /* ── Hide QR result card ── */
  const resultCard = document.getElementById('qr-result-card');
  if (resultCard) resultCard.hidden = true;

  /* ── Hide no-UPI message ── */
  const noUpi = document.getElementById('no-upi-msg');
  if (noUpi) noUpi.hidden = true;

  /* ── Reset summary fields ── */
  setEl('sum-name',    '—');
  setEl('sum-amount',  '—');
  setEl('sum-purpose', document.getElementById('purpose-select')?.options[0]?.value ?? 'Internet Bill');

  /* ── Reset sticky bar ── */
  updateStickyBar(0);

  /* ── Scroll to top ── */
  window.scrollTo({ top: 0, behavior: 'smooth' });

  showToast('Reset complete.');
}

/* ================================================================
   TAB SWITCHING
================================================================ */
/**
 * Activates a tab and shows the corresponding panel.
 * @param {'tab-qr'|'tab-upi'} activeTabId
 */
function switchTab(activeTabId) {
  document.querySelectorAll('[role="tab"]').forEach(tab => {
    const isActive = (tab.id === activeTabId);
    tab.classList.toggle('tab--active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  document.querySelectorAll('[role="tabpanel"]').forEach(panel => {
    panel.hidden = (panel.id !== 'panel-' + activeTabId.replace('tab-', ''));
  });
}

/* ================================================================
   QUICK CHIP SELECTION
================================================================ */
/**
 * Fills the amount input and highlights the tapped chip.
 * @param {HTMLButtonElement} btn
 */
function selectChip(btn) {
  const amount = btn.dataset.amount;
  if (!amount) return;

  const input = document.getElementById('amount-input');
  if (input) input.value = amount;

  /* Highlight chip */
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('chip--active'));
  btn.classList.add('chip--active');

  /* Clear validation error */
  input?.classList.remove('field__input--error');
  const errEl = document.getElementById('amount-error');
  if (errEl) { errEl.hidden = true; errEl.textContent = ''; }

  updateLiveSummary();
}

/* ================================================================
   DEVICE DETECTION — Auto-switch tabs & show hints
================================================================ */
/**
 * Detects whether the visitor is on a mobile device.
 * Uses userAgentData (modern) with a regex fallback.
 * @returns {boolean}
 */
function isMobileDevice() {
  if (navigator.userAgentData?.mobile !== undefined) {
    return navigator.userAgentData.mobile;
  }
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    .test(navigator.userAgent);
}

/**
 * Applies device-appropriate defaults:
 *   Mobile  → switches to Tab 2 (Pay via UPI App), shows mobile hint
 *   Desktop → stays on Tab 1 (Generate QR), shows desktop hint
 */
function applyDeviceDefaults() {
  const mobile = isMobileDevice();

  const desktopHint = document.getElementById('desktop-hint');
  const mobileHint  = document.getElementById('mobile-hint');
  const tabUpi      = document.getElementById('tab-upi');
  const tabQR       = document.getElementById('tab-qr');

  if (mobile) {
    /* Switch to UPI app tab */
    switchTab('tab-upi');
    if (mobileHint) mobileHint.hidden = false;

    /* Extra visual emphasis on the UPI tab */
    tabUpi?.classList.add('tab--device-highlight');
    tabQR?.classList.remove('tab--device-highlight');
  } else {
    /* Stay on QR tab */
    switchTab('tab-qr');
    if (desktopHint) desktopHint.hidden = false;

    tabQR?.classList.add('tab--device-highlight');
    tabUpi?.classList.remove('tab--device-highlight');
  }
}

/* ================================================================
   PWA — SERVICE WORKER REGISTRATION
================================================================ */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => {
          console.log('[SW] Registered. Scope:', reg.scope);
        })
        .catch(err => {
          console.warn('[SW] Registration failed:', err);
        });
    });
  }
}

/* ================================================================
   LOADING SCREEN
================================================================ */
/**
 * Hides the loading screen once the page content is fully ready.
 * Enforces a minimum visible time for a premium feel.
 */
function initLoadingScreen() {
  const screen  = document.getElementById('loading-screen');
  if (!screen) return;

  const MIN_MS = 1200; // Minimum loading screen visibility
  const start  = Date.now();

  function hide() {
    const elapsed = Date.now() - start;
    const delay   = Math.max(0, MIN_MS - elapsed);

    setTimeout(() => {
      screen.classList.add('loading-screen--hidden');
      /* Remove from DOM after fade completes (500ms transition) */
      setTimeout(() => screen.remove(), 550);
    }, delay);
  }

  if (document.readyState === 'complete') {
    hide();
  } else {
    window.addEventListener('load', hide, { once: true });
  }
}

/* ================================================================
   RIPPLE EFFECT — Tactile feedback
================================================================ */
function initRipple() {
  document.querySelectorAll(
    '.btn--primary, .btn--whatsapp-screenshot, .btn--action-sm, .btn--contact'
  ).forEach(btn => {
    btn.addEventListener('pointerdown', e => {
      if (e.button !== undefined && e.button !== 0) return;
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x    = e.clientX - rect.left  - size / 2;
      const y    = e.clientY - rect.top   - size / 2;

      const r = document.createElement('span');
      r.style.cssText = [
        `position:absolute`,
        `width:${size}px`,
        `height:${size}px`,
        `left:${x}px`,
        `top:${y}px`,
        `border-radius:50%`,
        `background:rgba(255,255,255,.22)`,
        `transform:scale(0)`,
        `animation:_ripple 500ms linear`,
        `pointer-events:none`,
      ].join(';');

      btn.style.overflow  = 'hidden';
      if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
      btn.appendChild(r);
      r.addEventListener('animationend', () => r.remove());
    });
  });

  /* Inject keyframe once */
  if (!document.getElementById('_rpl')) {
    const s = document.createElement('style');
    s.id = '_rpl';
    s.textContent = '@keyframes _ripple{to{transform:scale(1);opacity:0}}';
    document.head.appendChild(s);
  }
}

/* ================================================================
   DOMContentLoaded — INITIALISE EVERYTHING
================================================================ */
document.addEventListener('DOMContentLoaded', () => {

  /* ── Lucide Icons ── */
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  /* ── Loading screen ── */
  initLoadingScreen();

  /* ── Service Worker (PWA) ── */
  registerServiceWorker();

  /* ── Device detection — auto switch tabs & show hints ── */
  applyDeviceDefaults();

  /* ── Ripple feedback ── */
  initRipple();

  /* ── Tab click handlers ── */
  document.getElementById('tab-qr')?.addEventListener('click', () => {
    switchTab('tab-qr');
  });

  document.getElementById('tab-upi')?.addEventListener('click', () => {
    switchTab('tab-upi');
  });

  /* ── Quick chip clicks ── */
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => selectChip(chip));
  });

  /* ── Amount input — live update ── */
  const amtInput = document.getElementById('amount-input');
  if (amtInput) {
    amtInput.addEventListener('input', () => {
      /* Sync chip highlight to typed value */
      const val = parseInt(amtInput.value, 10);
      document.querySelectorAll('.chip').forEach(c => {
        c.classList.toggle('chip--active', Number(c.dataset.amount) === val);
      });

      /* Clear error on re-type */
      amtInput.classList.remove('field__input--error');
      const errEl = document.getElementById('amount-error');
      if (errEl) { errEl.hidden = true; errEl.textContent = ''; }

      updateLiveSummary();
    });

    /* Block decimal & exponent keys for type="number" */
    amtInput.addEventListener('keydown', e => {
      if (['.', 'e', '+', '-'].includes(e.key)) e.preventDefault();
    });
  }

  /* ── Customer name input — live update ── */
  document.getElementById('customer-name')?.addEventListener('input', updateLiveSummary);

  /* ── Purpose select — live update ── */
  document.getElementById('purpose-select')?.addEventListener('change', updateLiveSummary);

  /* ── Initial summary render ── */
  updateLiveSummary();

});
