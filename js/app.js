
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


function startParticles() {
  const canvas = document.querySelector('canvas'); 
  if (!canvas) return; 
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // 1. Initialize particles with a LENGTH property
  const particleCount = window.innerWidth < 768 ? 30 : 75;
  const particles = [];
  
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      w: Math.random() * 4 + 2,       // Width of the raindrop
      l: Math.random() * 25 + 15,     // LENGTH of the raindrop (10px to 25px long)
      speed: Math.random() * 60 + 50  // Very fast falling speed to match the heavy rain look
    });
  }

  // 2. Animate using lines instead of circles
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // We use strokeStyle for lines instead of fillStyle
    ctx.strokeStyle = 'rgba(217,123,63,0.6)';
    ctx.lineCap = 'round'; // Makes the ends of the drops look like water instead of flat rectangles

    particles.forEach(function (p) {
      // Set the width of this specific drop
      ctx.lineWidth = p.w;

      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y + p.l);
      ctx.stroke();

   
      p.y += p.speed;

      if (p.y > canvas.height) {
        p.y = -p.l; 
        p.x = Math.random() * canvas.width;
      }
    });

    requestAnimationFrame(animate);
  }

  animate();
}

startParticles();

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
