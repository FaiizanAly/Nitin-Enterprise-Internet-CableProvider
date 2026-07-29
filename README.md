# 💳 Nitin Enterprise — UPI Payment Landing Page

> A production-ready, mobile-first UPI payment website for **Nitin Enterprise** — an Internet & Cable TV provider based in Rudrapur, Uttarakhand. Built with pure HTML, CSS, and Vanilla JavaScript. No frameworks. No backend. No payment gateway required.

---

## 🌐 Live Demo

> Replace with your deployed URL
> `https://nitinenterprise.in`

---

## ✨ Features

### 💰 Smart Payment System
- **Dynamic QR Code Generator** — Generates a UPI QR code based on the entered amount and payment purpose
- **Pay via UPI App** — Direct UPI deep link to open any UPI app (GPay, PhonePe, Paytm, BHIM)
- **Quick Pay** — One-tap UPI payment without entering an amount
- **Copy UPI ID** — One-click copy to clipboard with fallback for older browsers
- **Download QR** — Save generated QR code as a PNG image
- **Share QR** — Native Web Share API support on mobile

### 🧾 Payment Form
- Customer Name field (optional)
- Amount input with validation (₹1 – ₹1,00,000, whole numbers only)
- Quick-select amount chips (₹300, ₹500, ₹700, ₹1000, ₹1500)
- Payment purpose dropdown (Internet Bill, Cable TV Bill, Recharge, New Connection, Other)
- Live Payment Summary card that updates in real-time
- Friendly error messages with shake animation

### 📱 Progressive Web App (PWA)
- Installable on Android & iOS home screen
- Offline support via Service Worker
- App manifest with icons and shortcuts
- Cache-first strategy for static assets
- Network-first strategy for HTML pages

### 🎨 Premium UI / UX
- Apple-inspired minimal design
- Smooth animations and micro-interactions
- Ripple effect on button taps
- Toast notifications
- Loading screen with progress bar
- FAQ accordion section
- Floating Action Buttons (Call + WhatsApp) on mobile
- Sticky bottom action bar on mobile

### 📐 Fully Responsive Layout

| Breakpoint | Layout |
|------------|--------|
| Mobile (< 768px) | Single column · FABs · Sticky bar |
| Tablet (768–1023px) | Centered card · Better spacing |
| Desktop (≥ 1024px) | 2-column grid · Sticky QR panel · No FABs |

---

## 🛠️ Tech Stack

| Technology | Usage |
|-----------|-------|
| **HTML5** | Semantic structure, ARIA accessibility |
| **CSS3** | Custom Properties, CSS Grid, Flexbox, Animations |
| **Vanilla JavaScript** | Payment logic, QR generation, clipboard, service worker |
| **QRCode.js** | Client-side QR code generation (CDN) |
| **Lucide Icons** | Icon library for the payment page (CDN) |
| **Google Fonts** | Inter typeface |
| **Service Worker** | PWA offline support |

> ⚡ **Zero dependencies installed.** No npm, no build step, no framework.

---

## 📁 Project Structure

```
nitin-enterprise/
│
├── index.html          # Landing page (hero, QR card, business info)
├── style.css           # Landing page styles (design tokens + responsive)
├── script.js           # Landing page JS (copy UPI, ripple, toast)
│
├── pay.html            # Smart Payment page (tabs, QR generator, UPI app)
├── pay.css             # Payment page styles (form, tabs, summary card)
├── pay.js              # Payment page JS (validation, QR gen, download, share)
│
├── manifest.json       # PWA web app manifest
├── sw.js               # Service Worker (cache strategies)
├── README.md           # Project documentation
│
└── assets/
    ├── qr.png          # Static UPI QR code image (replace with your own)
    ├── favicon.svg     # Browser favicon
    ├── icon-192.png    # PWA icon (192×192)
    └── icon-512.png    # PWA icon (512×512)
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/nitin-enterprise.git
cd nitin-enterprise
```

### 2. Replace the QR code

Replace `assets/qr.png` with your actual UPI QR code image.
Export it at **600×600px** for best quality.

You can generate a UPI QR code from:
- Google Pay Business
- PhonePe for Business
- Paytm for Business
- BHIM app

### 3. Open locally

Just open `index.html` in your browser — no server required.

```bash
# Or serve with any static file server:
npx serve .
```

### 4. Deploy

Upload all files to any static hosting:
- **GitHub Pages** — free, easy
- **Netlify** — drag and drop deploy
- **Vercel** — connect repo and deploy
- **Any web hosting** — FTP upload

> ⚠️ For the Service Worker and PWA features to work, the site must be served over **HTTPS**.

---

## ⚙️ Customisation

### Change Business Details

Edit the constants in `pay.js`:

```js
const UPI_PA    = 'tradesnitin1-1@okicici'; // Your UPI ID
const UPI_PN    = 'Nitin Trades';            // Your name
const WA_NUMBER = '918630473928';            // WhatsApp number (no +)
```

Update the HTML in `index.html` and `pay.html` for:
- Business name, address, phone number
- Page title and meta description
- WhatsApp link
- Call link
- Google Maps link

### Change Brand Color

In `style.css` `:root`:

```css
--color-primary:       #16A34A;  /* Main green */
--color-primary-dark:  #15803D;  /* Hover green */
--color-primary-light: #22C55E;  /* Light green */
```

---

## 🔒 Security & Privacy

- **No data is stored** — all fields are client-side only
- **No backend** — no server, no database
- **No payment gateway** — UPI deep links are handled by the user's UPI app
- **No tracking** — no analytics, no cookies

> Payment verification must be done manually via your UPI app transaction history.

---

## ♿ Accessibility

- Semantic HTML5 elements
- ARIA labels on all interactive elements
- Keyboard navigation support
- Skip-to-content link
- `prefers-reduced-motion` support
- Screen reader compatible

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**Faizan Ali**
[Instagram @faiizanaly](https://instagram.com/faiizanaly)

---

## 🏢 Business

**Nitin Enterprise**
Internet & Cable TV Provider
Indra Colony, Street No. 4, Rudrapur
Udham Singh Nagar — 263153
+91 86304 73928

---

Made with ❤️ for Nitin Enterprise
