# TrailGear Co. - Performance Optimization Assessment

**Author:** Pradeep Kumar K.
**Live Hosted Site:** []
**Original Broken Site:** https://abhikboruah.github.io/assesment-slow-website/

## Overview
This repository contains the optimized version of the TrailGear Co. dummy website. The initial state of the application suffered from severe main-thread blocking, memory leaks, and unoptimized network payloads that caused the browser to freeze and Lighthouse audits to timeout.

Through systematic debugging using Chrome DevTools (Network, Performance, and Sources panels), I isolated and resolved the critical bottlenecks while preserving all existing features and functionality.

---

## 1. Main Thread Freeze (Reviews Section)
* **What I saw:** The browser completely locked up upon loading the page. The initial Lighthouse report failed to generate due to a timeout.
* **Diagnosis Tool:** Chrome DevTools (Network & Sources Tab) and code inspection.
* **What made me suspicious:** I commented out the `js/app.js` script in the HTML and the page loaded instantly. Upon inspecting the JS file, the `loadReviewsSync()` function was utilizing a synchronous `XMLHttpRequest` paired with a loop injecting thousands of DOM nodes.
* **The Fix:** * Replaced the synchronous XHR with an asynchronous `fetch()` call.
  * Implemented array slicing (`.slice(0, 15)`) to paginate the initial load.
  * Refactored the DOM manipulation to build an HTML string in memory and update the DOM only once outside the loop, eliminating layout thrashing.

## 2. Layout Thrashing (Product Grid)
* **What I saw:** Scrolling performance felt sluggish and jerky, especially on slower devices.
* **Diagnosis Tool:** Chrome DevTools (Performance Tab) and code inspection.
* **What made me suspicious:** The `equalizeCardHeights()` function was attached to the `scroll` event without any debouncing. Inside the function's loop, it read a DOM layout property (`offsetHeight`) and immediately wrote a style (`style.minHeight`), forcing the browser to recalculate the layout on every single iteration.
* **The Fix:** * Separated DOM reads and writes into two distinct phases. I used one loop to calculate and store all heights, and a second loop to apply the styles, effectively batching the operations.
  * Wrapped the scroll event listener in a `requestAnimationFrame` to debounce the function and prevent it from firing excessively.

## 3. CPU & Memory Leaks (Animations & Event Listeners)
* **What I saw:** The custom Performance HUD showed dropping FPS over time, while the JS heap and mousemove buffer climbed infinitely.
* **Diagnosis Tool:** Built-in Performance HUD and code inspection.
* **What made me suspicious:** * The `mouseTrail` array grew infinitely on every `mousemove` event.
  * The `startParticles()` canvas animation used an unthrottled `setInterval` that destroyed and recreated an array of 400 objects every 16ms. 
  * `initGallery()` was called twice, compounding duplicate `resize` listeners.
* **The Fix:** * Capped the `mouseTrail` array length using `.shift()` to prevent infinite memory consumption.
  * Converted the canvas animation to use `requestAnimationFrame` for display-synced performance. Moved the particle object allocation outside the loop, mutating existing objects to prevent garbage collection churn.
  * Removed the redundant `initGallery()` initialization.

## 4. Network Bloat & Largest Contentful Paint (HTML Head & Images)
* **What I saw:** Once the JavaScript was unblocked, the Lighthouse performance score was still suffering due to massive render-blocking resources and a delayed Largest Contentful Paint (LCP).
* **Diagnosis Tool:** Lighthouse and Chrome DevTools (Network Tab).
* **What made me suspicious:** * The `<head>` contained a forced legacy polyfill bug (`|| true`), duplicate jQuery scripts, and unused heavy libraries (Moment, Lodash). 
  * Every product image in the grid had `loading="eager"` hardcoded, creating a network traffic jam that delayed the LCP.
* **The Fix:** * Removed the forced polyfill bug, the duplicate jQuery script, and the unused Moment/Lodash libraries.
  * Implemented native `loading="lazy"` for all below-the-fold product images, keeping only the top row `eager` for a fast LCP. 
  * Removed the "fake font preloader" div that forced unused font weights to download.## 5. Silent Memory Leaks & Garbage Collection (quickview.js)
* **What I saw:** The Quick View modal appeared to function correctly visually, but inspecting the code revealed classic memory leak patterns that would eventually bloat the JS heap.
* **Diagnosis Tool:** Code inspection (and theoretical Heap Snapshot analysis).
* **What made me suspicious:** * The `closedModalHistory` array was storing raw DOM nodes (`overlay`) after they had been removed from the document via `overlay.remove()`.
  * A new `document.addEventListener('click', ...)` was initialized every time a modal was opened, but `removeEventListener` was never called when it closed.
* **The Fix:** * Deleted the `closedModalHistory` array to prevent detached DOM nodes from being held in memory, allowing the browser's garbage collector to reclaim the memory when the modal closes.
  * Re-architected the click-outside-to-close logic. Instead of attaching the listener to the global `document`, I attached it directly to the `overlay` element. When the overlay is removed from the DOM, the event listener is safely garbage-collected alongside it.## 6. Logic Bugs & Disk Thrashing (analytics.js)
* **What I saw:** The analytics script appeared well-written on the surface, but deeper code inspection revealed logic flaws causing massive performance degradation over time, acting as a "boiling frog" scenario.
* **Diagnosis Tool:** Code inspection and logical deduction.
* **What made me suspicious:** * The `throttle` function contained a logic error (`now - last >= 0`) meaning it never actually throttled anything.
  * Synchronous `localStorage` writes were occurring inside `logEvent`, causing disk thrashing on every scroll event.
  * An `IntersectionObserver` was being initialized *inside* a scroll event listener.
* **The Fix:** * Corrected the throttle logic to `now - last >= wait`.
  * Moved the synchronous `localStorage` write out of the event listener and into the 2-second heartbeat `setInterval`.
  * Added `analyticsBuffer = [];` to the heartbeat to clear the array after syncing, fixing the infinite memory leak.
  * Removed the observer from the scroll event entirely. Initialized the `IntersectionObserver` exactly once on page load, allowing it to natively monitor element visibility as intended.## 7. CSS Rendering & Paint Bottlenecks (main.css)
* **What I saw:** The stylesheet contained rules that forced unnecessary network requests and caused extreme layout/paint recalculations, heavily impacting the GPU and First Contentful Paint (FCP).
* **Diagnosis Tool:** Code inspection and CSS architecture best practices.
* **What made me suspicious:** * An `@import` rule at the top of the file.
  * The universal selector (`*`) contained `transition: all` and `will-change: transform, opacity`.
  * `.divider-band` was requesting a duplicate texture image (`texture-copy.png`).
* **The Fix:** * Deleted the unused `@import url('vendor-framework.css');` to prevent CSSOM parsing delays.
  * Removed `transition` and `will-change` from the universal selector. This stopped the browser from promoting every DOM node to its own compositor layer and prevented cascading repaint cycles when JavaScript manipulated the DOM.
  * Updated `.divider-band` to point to the already-cached `bg-pattern.png`, eliminating a redundant HTTP request.

## 8. Image Optimization (Asset Delivery)
* **What I saw:** Lighthouse flagged a massive "Improve image delivery" warning, indicating over 10MB of unnecessary network payload.
* **Diagnosis Tool:** Lighthouse and Figma.
* **What made me suspicious:** The `hero-banner`, background textures, and product thumbnails were all saved as uncompressed `.png` files, with the hero banner alone weighing 2.7MB.
* **The Fix:** * Converted all heavy `.png` assets (hero banners, background patterns, and thumbnails) to the modern, highly compressed `.webp` format.
  * Updated all HTML `<img>` source paths and CSS `background-image` URLs to point to the new `.webp` files, drastically reducing the total page weight.

## 9. Critical Rendering Path & LCP (Network Chaining)
* **What I saw:** Despite shrinking the files, the mobile score hovered in the 70s and 80s due to render-blocking scripts, Critical Request Chains, and delayed LCP image discovery.
* **Diagnosis Tool:** Lighthouse (Network Dependency Tree).
* **What made me suspicious:** * The browser was waiting 1.5 seconds to download `jquery.min.js` before painting the screen.
  * The custom web fonts were hidden at the end of a request chain (HTML -> CSS -> Fonts).
  * The `hero-banner.webp` (the Largest Contentful Paint element) wasn't discoverable until the CSS was fully parsed.
* **The Fix:** * Completely removed jQuery as it was unused dead weight. 
  * Added the `defer` attribute to all custom JavaScript files (`app.js`, `analytics.js`, `quickview.js`) to remove them from the critical rendering path.
  * Added `<link rel="preload" as="font">` tags to the HTML `<head>` to break the font request chain.
  * Added `<link rel="preload" as="image" fetchpriority="high">` for the hero banner to ensure the browser downloads the LCP element immediately.

## Final Results
By resolving the main thread blocking, layout thrashing, memory leaks, and network bottlenecks, the application's performance metrics improved drastically.

**Before Optimization:**
![Initial failing Lighthouse score](docs/before-score.png)

**After Optimization (Desktop & Mobile):**
![Final 99 Desktop Lighthouse score](docs/after-desktop-score.png)
![Final 90+ Mobile Lighthouse score](docs/after-mobile-score.png)
