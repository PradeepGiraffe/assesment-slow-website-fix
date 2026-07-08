

// FIX 1: Deleted the `closedModalHistory` array entirely. 
// Trapping removed DOM nodes in a global array prevents garbage collection 
// and causes a detached-node memory leak.

function openQuickView(card) {
  const name = card.querySelector('h3').textContent;
  const price = card.querySelector('.price').textContent;
  const img = card.querySelector('img').src;

  const overlay = document.createElement('div');
  overlay.className = 'quickview-overlay';
  overlay.innerHTML =
    '<div class="quickview-modal">' +
    '  <button class="quickview-close" aria-label="Close">&times;</button>' +
    '  <img src="' + img + '" alt="' + name + '">' +
    '  <h3>' + name + '</h3>' +
    '  <p class="price">' + price + '</p>' +
    '</div>';

  document.body.appendChild(overlay);

  // FIX 2: Attached the "click outside" listener to the overlay itself, 
  // rather than the global document. When the overlay is removed, this 
  // listener gets safely garbage-collected with it.
  overlay.addEventListener('click', function (e) {
    // Only close if they clicked the dark overlay background, not the modal itself
    if (e.target === overlay) {
      closeQuickView(overlay);
    }
  });

  overlay.querySelector('.quickview-close').addEventListener('click', function () {
    closeQuickView(overlay);
  });
}

function closeQuickView(overlay) {
  overlay.remove(); 
  // Removed the code that pushed the overlay into the global array here.
}

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.product-card').forEach(function (card) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', function () {
      openQuickView(card);
    });
  });
});