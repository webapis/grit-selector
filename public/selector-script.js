let selectedElement = null;
const overlay = document.createElement('div');
overlay.style.position = 'absolute';
overlay.style.backgroundColor = 'rgba(0, 102, 255, 0.5)';
overlay.style.zIndex = '999999999';
overlay.style.pointerEvents = 'none';
document.body.appendChild(overlay);

document.addEventListener('mousemove', (e) => {
  const element = document.elementFromPoint(e.clientX, e.clientY);
  if (element && element !== overlay) {
    const rect = element.getBoundingClientRect();
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.top = `${window.scrollY + rect.top}px`;
    overlay.style.left = `${window.scrollX + rect.left}px`;
  }
});

document.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();

  const element = document.elementFromPoint(e.clientX, e.clientY);
  if (element && element !== overlay) {
    const selector = generateSelector(element);
    window.parent.postMessage({ type: 'selector', selector }, '*');
  }
}, true);

function generateSelector(element) {
  if (!element) return '';

  const parts = [];
  while (element && element.nodeType === Node.ELEMENT_NODE) {
    let part = element.tagName.toLowerCase();
    if (element.id) {
      part += `#${element.id}`;
      parts.unshift(part);
      break; // ID is unique, no need to go further
    } else {
      const classes = Array.from(element.classList).join('.');
      if (classes) {
        part += `.${classes}`;
      }

      const parent = element.parentNode;
      if (parent) {
        const siblings = Array.from(parent.children).filter(child => child.tagName === element.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(element) + 1;
          part += `:nth-of-type(${index})`;
        }
      }
    }

    parts.unshift(part);
    element = element.parentNode;
  }

  return parts.join(' > ');
}
