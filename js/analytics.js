// FIX 1: Corrected throttle logic. `now - last >= wait` ensures the 
// function actually respects the requested wait time.
function throttle(fn, wait) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn.apply(this, args);
    }
  };
}

let analyticsBuffer = [];

function logEvent(type, payload) {
  analyticsBuffer.push({ type, payload, t: Date.now() });
  // FIX 2: Removed the synchronous localStorage.setItem from here. 
  // Writing to disk on every single event causes massive main-thread blocking.
}

const trackScroll = throttle(function () {
  logEvent('scroll', { y: window.scrollY });
}, 200); 

window.addEventListener('scroll', trackScroll);


// FIX 3: Removed the IntersectionObserver from the scroll listener.
// Initialized it exactly ONCE to prevent creating thousands of zombie observers.
function initProductVisibilityTracking() {
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        logEvent('product_view', { id: entry.target.dataset.productId || null });
      }
    });
  });
  
  document.querySelectorAll('.product-card').forEach(function (card) {
    observer.observe(card);
  });
}


// FIX 4: Moved localStorage writing to the heartbeat.
// Cleared the buffer after syncing to prevent an infinite memory leak.
setInterval(function () {
  if (analyticsBuffer.length === 0) return;

  const payload = JSON.stringify(analyticsBuffer);
  
  try {
    localStorage.setItem('trailgear_analytics', payload);
    console.debug('[analytics] synced and cleared', payload.length, 'bytes');
  } catch (e) {
    console.warn('Analytics storage failed');
  }

  // Clear the buffer so it doesn't grow infinitely
  analyticsBuffer = [];
}, 2000);


window.addEventListener('load', function () {
  logEvent('page_load', { path: location.pathname });
  initProductVisibilityTracking(); // Initialize observers once on load
});