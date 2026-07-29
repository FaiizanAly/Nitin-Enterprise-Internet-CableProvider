/**
 * ================================================================
 * NITIN ENTERPRISE — PAYMENT LANDING PAGE
 * script.js
 * Author : Faizan Ali
 * Version: 1.0.0
 * ================================================================
 */

'use strict';

/* ----------------------------------------------------------------
   CONSTANTS
---------------------------------------------------------------- */
const UPI_ID      = 'tradesnitin1-1@okicici';
const UPI_DEEPLINK = 'upi://pay?pa=tradesnitin1-1@okicici&pn=Nitin%20Trades&aid=uGICAgKC_8veFcA';

/* Toast auto-hide timer reference */
let toastTimer = null;

/* ----------------------------------------------------------------
   TOAST NOTIFICATION
   Shows a brief, accessible notification at the top of the screen.
   @param {string} message - Text to display in the toast.
   @param {number} [duration=3000] - How long to show the toast (ms).
---------------------------------------------------------------- */
function showToast(message, duration = 3000) {
  const toast   = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');

  if (!toast || !toastMsg) return;

  /* Update message text */
  toastMsg.textContent = message;

  /* Clear any existing timer so overlapping calls reset cleanly */
  if (toastTimer) {
    clearTimeout(toastTimer);
    toast.classList.remove('toast--visible');

    /*
     * Force a reflow before re-adding the class.
     * This restarts the CSS transition even if the toast is already visible.
     */
    void toast.offsetWidth;
  }

  /* Show */
  toast.classList.add('toast--visible');

  /* Auto-hide */
  toastTimer = setTimeout(() => {
    toast.classList.remove('toast--visible');
    toastTimer = null;
  }, duration);
}


/* ----------------------------------------------------------------
   COPY UPI ID
   Copies the UPI ID to the clipboard and shows a toast confirmation.
---------------------------------------------------------------- */
function copyUpiId() {
  /* Modern Clipboard API (preferred) */
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(UPI_ID)
      .then(() => showToast('✓  UPI ID Copied!'))
      .catch(() => fallbackCopy(UPI_ID));
  } else {
    /* Legacy fallback for older browsers / Android WebViews */
    fallbackCopy(UPI_ID);
  }
}

/**
 * Legacy clipboard copy using a temporary textarea element.
 * @param {string} text - Text to copy.
 */
function fallbackCopy(text) {
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
  document.body.appendChild(el);
  el.select();

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch (err) {
    console.warn('Clipboard copy failed:', err);
  }

  document.body.removeChild(el);

  if (success) {
    showToast('✓  UPI ID Copied!');
  } else {
    showToast('⚠  Please copy manually: ' + text, 5000);
  }
}


/* ----------------------------------------------------------------
   OPEN UPI PAYMENT
   Attempts to open the UPI deep link.
   If the link fails to trigger an app (no UPI app installed),
   a friendly message is shown to the user after a short delay.
---------------------------------------------------------------- */
function openUpiPayment() {
  const noUpiMsg    = document.getElementById('no-upi-msg');
  const payBtn      = document.getElementById('btn-pay-upi');
  let   appOpened   = false;

  /* Hide any previous "no app" message */
  if (noUpiMsg) noUpiMsg.hidden = true;

  /* Attempt to open the deep link */
  window.location.href = UPI_DEEPLINK;

  /*
   * On desktop and devices without a UPI app the page stays focused.
   * We detect this with a visibility / focus listener after a short delay.
   * If the page was NOT backgrounded (app not opened), we show the message.
   */

  const onVisibilityChange = () => {
    if (document.hidden) {
      /* Page went to background — UPI app opened successfully */
      appOpened = true;
      cleanup();
    }
  };

  const onBlur = () => {
    /* Window lost focus — app opened */
    appOpened = true;
    cleanup();
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('blur', onBlur);

  function cleanup() {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('blur', onBlur);
  }

  /* After 2 seconds, if the page is still visible and focused, show the fallback */
  setTimeout(() => {
    cleanup();
    if (!appOpened && !document.hidden) {
      if (noUpiMsg) {
        noUpiMsg.hidden = false;
        /* Scroll the message into view */
        noUpiMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, 2000);
}


/* ----------------------------------------------------------------
   BUTTON RIPPLE EFFECT
   Adds a subtle radial ripple on button click for tactile feedback.
   Applied to all elements with the [data-ripple] attribute.
---------------------------------------------------------------- */
function initRipple() {
  /* Select buttons that should have a ripple */
  const rippleTargets = document.querySelectorAll(
    '.btn--primary, .btn--action, .btn--directions'
  );

  rippleTargets.forEach(btn => {
    btn.addEventListener('pointerdown', function (e) {
      /* Only run for left-click / touch */
      if (e.button !== undefined && e.button !== 0) return;

      const rect   = btn.getBoundingClientRect();
      const size   = Math.max(rect.width, rect.height) * 1.8;
      const x      = e.clientX - rect.left - size / 2;
      const y      = e.clientY - rect.top  - size / 2;

      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position: absolute;
        width:  ${size}px;
        height: ${size}px;
        left:   ${x}px;
        top:    ${y}px;
        border-radius: 50%;
        background: rgba(255,255,255,0.25);
        transform: scale(0);
        animation: ripple-animation 550ms linear;
        pointer-events: none;
      `;

      /* Button needs relative positioning for ripple to work */
      if (getComputedStyle(btn).position === 'static') {
        btn.style.position = 'relative';
      }
      btn.style.overflow = 'hidden';

      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  });

  /* Inject the keyframe once */
  if (!document.getElementById('ripple-style')) {
    const style = document.createElement('style');
    style.id = 'ripple-style';
    style.textContent = `
      @keyframes ripple-animation {
        to { transform: scale(1); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}


/* ----------------------------------------------------------------
   INITIALISE
   Run all setup once the DOM is ready.
---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  /* Ripple effect on interactive buttons */
  initRipple();

  /*
   * Polite prefers-reduced-motion check.
   * If the user has requested minimal animations, we skip
   * the ripple and honour the CSS media query (already handled in CSS).
   */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    /* CSS already handles transition durations via the media query.
       No additional JS needed here. */
  }
});
