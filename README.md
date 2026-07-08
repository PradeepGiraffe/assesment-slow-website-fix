**Author:** Pradeep Kumar K.
**Live Hosted Site:** https://pradeepgiraffe.github.io/assesment-slow-website-fix/
**Original Broken Site:** https://abhikboruah.github.io/assesment-slow-website/


# Developer Assessment: Performance Fix Writeup

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
    * Removed the "fake font preloader" div that forced unused font weights to download.

## 5. Logic Bugs & Disk Thrashing (analytics.js)
* **What I saw:** The analytics script appeared well-written on the surface, but deeper code inspection revealed logic flaws causing massive performance degradation over time (a "boiling frog" scenario).
* **Diagnosis Tool:** Code inspection and logical deduction.
* **What made me suspicious:** * The `throttle` function contained a logic error (`now - last >= 0`) meaning it never actually throttled anything.
  * Synchronous `localStorage.setItem` writes were occurring inside `logEvent`, causing disk thrashing on every scroll event.
  * An `IntersectionObserver` was being initialized *inside* a scroll event listener, creating thousands of zombie observers.
  * The `analyticsBuffer` array was being stringified but never cleared, creating a memory leak.
* **The Fix:** * Corrected the throttle logic to `now - last >= wait`.
  * Moved the synchronous `localStorage` write out of the event listener and into a 2-second heartbeat `setInterval`.
  * Added `analyticsBuffer = [];` to the heartbeat to clear the array after syncing.
  * Removed the observer from the scroll event entirely. Initialized the `IntersectionObserver` exactly once on page load.

## 6. CSS Rendering & Paint Bottlenecks (main.css & fonts.css)
* **What I saw:** The stylesheets contained rules that forced unnecessary network requests and caused extreme layout/paint recalculations, heavily impacting the GPU and First Contentful Paint (FCP).
* **Diagnosis Tool:** Chrome DevTools (Performance & Network Tabs) and CSS architecture best practices.
* **What made me suspicious:** * A render-blocking `@import` rule at the top of the file for an unused framework.
  * The universal selector (`*`) contained `transition: all` and `will-change: transform, opacity`.
  * `.divider-band` was requesting a duplicate texture image (`texture-copy.png`).
  * `fonts.css` was downloading 4 unused font weights due to a fake `.font-preload` utility class.
* **The Fix:** * Deleted the unused `@import url('vendor-framework.css');` to prevent CSSOM parsing delays.
  * Removed `transition` and `will-change` from the universal selector. This stopped the browser from promoting every DOM node to its own compositor layer.
  * Updated `.divider-band` to point to the already-cached `bg-pattern.png`.
  * Removed the unused `@font-face` declarations and the `.font-preload` CSS rules entirely.

## 7. Image Optimization (Asset Delivery)
* **What I saw:** Lighthouse flagged a massive "Improve image delivery" warning, indicating over 10MB of unnecessary network payload.
* **Diagnosis Tool:** Lighthouse and Squoosh/Figma.
* **What made me suspicious:** The `hero-banner`, background textures, and product thumbnails were all saved as uncompressed `.png` files, with the hero banner alone weighing 2.7MB.
* **The Fix:** * Converted all heavy `.png` assets (hero banners, background patterns, and thumbnails) to the modern, highly compressed `.webp` format.
  * Updated all HTML `<img>` source paths and CSS `background-image` URLs to point to the new `.webp` files, drastically reducing the total page weight.

## 8. Critical Rendering Path & LCP (Network Chaining)
* **What I saw:** Despite shrinking the files, the mobile score hovered in the 70s and 80s due to render-blocking scripts, Critical Request Chains, and delayed LCP image discovery.
* **Diagnosis Tool:** Lighthouse (Network Dependency Tree).
* **What made me suspicious:** * The browser was waiting 1.5 seconds to download `jquery.min.js` before painting the screen.
  * The custom web fonts were hidden at the end of a request chain (HTML -> CSS -> Fonts).
  * The `hero-banner.webp` (the Largest Contentful Paint element) wasn't discoverable until the CSS was fully parsed.
* **The Fix:** * Completely removed jQuery as it was unused dead weight. 
  * Added the `defer` attribute to all custom JavaScript files (`app.js`, `analytics.js`, `quickview.js`) to remove them from the critical rendering path.
  * Added `<link rel="preload" as="font">` tags to the HTML `<head>` to break the font request chain.
  * Added `<link rel="preload" as="image" fetchpriority="high">` for the hero banner to ensure the browser downloads the LCP element immediately.

  ## Performance Results

**Before Optimization:**
![Initial failing Lighthouse score](docs/before-score.png)

**After Optimization (Desktop & Mobile):**
![Final 99 Desktop Lighthouse score](docs/after-desktop-score.png)
![Final 90+ Mobile Lighthouse score](docs/after-mobile-score.png)

## Final Results
By resolving the main thread blocking, layout thrashing, memory leaks, and network bottlenecks, the application's performance metrics improved drastically, resulting in a **99 Desktop** and **90+ Mobile** Lighthouse Performance score.