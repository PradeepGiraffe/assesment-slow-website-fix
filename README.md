# Developer Assessment: Performance Fix Writeup

## 1. Main Thread Freeze (Reviews Section)
* **What I saw:** The browser completely locked up upon loading the page. The initial Lighthouse report failed to generate due to a timeout.
* **Diagnosis Tool:** Chrome DevTools (Network & Sources Tab) and code inspection.
* **What made me suspicious:** I commented out the `js/app.js` script in the HTML and the page loaded instantly. Upon inspecting the JS file, the `loadReviewsSync()` function was utilizing a synchronous `XMLHttpRequest` paired with a loop injecting thousands of DOM nodes.
* **The Fix:** * Replaced the synchronous XHR with an asynchronous `fetch()` call.
    * Implemented array slicing (`.slice(0, 15)`) to paginate the initial load.
    * Refactored the DOM manipulation to build an HTML string in memory and update the DOM only once outside the loop, eliminating layout thrashing.

## 2. [Next Issue You Fix...]
* **What I saw:** ...
* **Diagnosis Tool:** ...
* **What made me suspicious:** ...
* **The Fix:** ...