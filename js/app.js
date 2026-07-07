/* ===================================================================
   TrailGear Co. — app.js
   =================================================================== */

// --- BUG: jQuery is loaded twice (see index.html) via two <script> tags
// with different filenames but identical content. $.noConflict noise below
// is a red herring some candidates chase instead of removing the duplicate tag.
$(document).ready(function () {
  console.log('jQuery ready, version', $.fn.jquery);
});

// --- FIX: Capped the mouseTrail array to prevent infinite memory leak.
const mouseTrail = [];
window.addEventListener('mousemove', function (e) {
  mouseTrail.push({ x: e.clientX, y: e.clientY, t: performance.now(), el: e.target });
  
  // Keep the array from growing out of control
  if (mouseTrail.length > 50) {
    mouseTrail.shift(); 
  }
});

// --- BUG: a resize handler that is re-registered on every call to
// initGallery() instead of once. Every window resize therefore adds
// ANOTHER listener on top of all previous ones, so work done per-resize
// grows over the life of the page (also a leak).
function initGallery() {
  window.addEventListener('resize', function () {
    document.querySelectorAll('.product-card').forEach(function (card) {
      // no-op-ish work, but multiplied by (leaked listener count) it adds up
      card.style.transform = 'translateZ(0)';
    });
  });
}
// --- FIX: Removed the immediate invocation of initGallery() to prevent 
// attaching duplicate window resize event listeners.
document.addEventListener('DOMContentLoaded', initGallery);

// --- FIX: Eliminated layout thrashing by separating DOM reads and writes.
// Batched all height calculations first, then applied the styles in a second loop.
function equalizeCardHeights() {
const cards = document.querySelectorAll('.product-card');
  
  const heights = Array.from(cards).map(function(card) {
    return card.offsetHeight;
  });

  cards.forEach(function (card, index) {
    card.style.minHeight = heights[index] + 2 + 'px';
    card.querySelector('.info').style.paddingTop = (heights[index] % 5) + 'px';
  });
}
// Optional but highly recommended fix: Debounce the scroll listener
// so it doesn't fire 100 times per second.
let scrollTimeout;
window.addEventListener('scroll', function() {
  if (scrollTimeout) {
    window.cancelAnimationFrame(scrollTimeout);
  }
  scrollTimeout = window.requestAnimationFrame(equalizeCardHeights);
});

// --- FIX: Replaced synchronous XHR with async fetch(). 
// Implemented pagination (slice) to prevent DOM overload.
// Moved DOM manipulation (innerHTML) outside the loop to prevent layout thrashing.
async function renderReviews() {
  try {
    const response = await fetch('data/reviews.json');
    const reviews = await response.json();

    const list = document.getElementById('review-list');
    let html = '';

    const initialReviews = reviews.slice(0, 15);

    for (let i = 0; i < initialReviews.length; i++) {
      html += '<div class="review-item"><strong>' + initialReviews[i].name +
        '</strong> <span class="stars">' + '★'.repeat(initialReviews[i].rating) +
        '</span><p>' + initialReviews[i].text + '</p></div>';
    }

    list.innerHTML = html;

  } catch (error) {
    console.error("Failed to load reviews:", error);
  }
}


// --- FIX: Replaced setInterval with requestAnimationFrame for display-synced performance.
// Moved array allocation outside the loop to prevent massive garbage collection churn.
function startParticles() {
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // 1. Allocate memory exactly once
  const particles = [];
  for (let i = 0; i < 400; i++) {
    particles.push({
      x: 0, 
      y: 0,
      r: Math.random() * 3 + 1,
    });
  }

  // 2. Use requestAnimationFrame for smooth, synced rendering
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(217,123,63,0.6)';
    
    // Mutate existing objects instead of destroying/recreating them
    particles.forEach(function (p) {
      p.x = Math.random() * canvas.width;
      p.y = Math.random() * canvas.height;
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    
    requestAnimationFrame(animate);
  }
  
  requestAnimationFrame(animate);
}

// --- Lightweight, honest performance HUD so you can SEE the impact of
// the bugs above (and confirm improvement after fixing them). This part
// is intentionally fine — don't "fix" the HUD itself, it's the ruler,
// not the problem.
function startPerfHud() {
  const hud = document.getElementById('perf-hud');
  let frames = 0;
  let lastFpsTime = performance.now();
  let fps = 0;

  function tick(now) {
    frames++;
    if (now - lastFpsTime >= 1000) {
      fps = frames;
      frames = 0;
      lastFpsTime = now;
    }
    const domCount = document.getElementsByTagName('*').length;
    const mem = performance.memory
      ? (performance.memory.usedJSHeapSize / 1048576).toFixed(1) + ' MB'
      : 'n/a (Chrome only)';
    const listenerHint = mouseTrail.length; // grows forever -> visible leak signal

    hud.innerHTML =
      'FPS: <span class="' + (fps < 30 ? 'warn' : '') + '">' + fps + '</span><br>' +
      'DOM nodes: <span class="' + (domCount > 3000 ? 'warn' : '') + '">' + domCount + '</span><br>' +
      'JS heap: ' + mem + '<br>' +
      'mousemove buffer: <span class="' + (listenerHint > 2000 ? 'warn' : '') + '">' + listenerHint + '</span>';

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

window.addEventListener('load', function () {
  renderReviews();
  startParticles();
  startPerfHud();
});
