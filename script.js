/* script.js — fade-ins, Vimeo thumbnails via oEmbed, modal player, Formspree helper */

// header shadow tweak
(function(){
  const header = document.querySelector('header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.style.boxShadow = (window.scrollY > 60) ? '0 14px 36px rgba(8,10,8,0.14)' : '0 8px 30px rgba(8,10,8,0.12)';
  });
})();

// smooth in-view animations
(function(){
  const obs = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, {threshold: 0.12});
  document.querySelectorAll('.product-card, .benefit-card, .media-thumb, .about-box, .contact-card').forEach(el => obs.observe(el));
})();

/* Fetch Vimeo thumbnails using oEmbed. 
   We read each .media-thumb[data-video-src] and fill its inner <img>.
*/
(async function(){
  const thumbs = document.querySelectorAll('.media-thumb[data-video-src]');
  for (const t of thumbs) {
    try {
      const url = t.getAttribute('data-video-src');
      // player URL -> public video page URL
      const videoPage = url.replace('https://player.vimeo.com/video/', 'https://vimeo.com/');
      const oembed = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoPage)}`;
      const res = await fetch(oembed, { mode: 'cors' });
      if (!res.ok) continue;
      const data = await res.json();
      const img = t.querySelector('.frame img');
      if (img && data.thumbnail_url) img.src = data.thumbnail_url;
    } catch(e){ /* ignore errors silently */ }
  }
})();

/* Modal gallery: click media-thumb to open video/image. */
(function(){
  let items = [];
  let currentIndex = 0;
  let backdrop = null;

  function collectItems(){
    items = [];
    const thumbs = Array.from(document.querySelectorAll('.media-thumb'));
    thumbs.forEach(el=>{
      if (el.dataset.videoSrc) items.push({type:'video', src: el.dataset.videoSrc, el});
      else if (el.dataset.imageSrc) items.push({type:'image', src: el.dataset.imageSrc, el});
      else {
        const img = el.querySelector('img');
        if (img) items.push({type:'image', src: img.src, el});
      }
    });
  }

  function showModalAt(index){
    collectItems();
    currentIndex = (index + items.length) % items.length;
    renderModal();
  }

  function renderModal(){
    if (backdrop) backdrop.remove();
    backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const inner = document.createElement('div');
    inner.className = 'modal-inner';

    const item = items[currentIndex];
    if (!item) return;

    if (item.type === 'video') {
      const iframe = document.createElement('iframe');
      iframe.src = item.src + (item.src.includes('?') ? '&autoplay=1' : '?autoplay=1');
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      iframe.setAttribute('allowfullscreen', '');
      inner.appendChild(iframe);
    } else {
      const img = document.createElement('img');
      img.src = item.src;
      inner.appendChild(img);
    }

    const close = document.createElement('button');
    close.className = 'modal-close';
    close.innerHTML = '✕';
    close.addEventListener('click', () => { backdrop.remove(); backdrop = null; });

    const controls = document.createElement('div');
    controls.className = 'modal-controls';
    const prev = document.createElement('button'); prev.textContent = '◀ Prev';
    const next = document.createElement('button'); next.textContent = 'Next ▶';
    const closeText = document.createElement('button'); closeText.textContent = 'Close ✕';

    prev.addEventListener('click', () => { currentIndex = (currentIndex - 1 + items.length) % items.length; renderModal(); });
    next.addEventListener('click', () => { currentIndex = (currentIndex + 1) % items.length; renderModal(); });
    closeText.addEventListener('click', () => { backdrop.remove(); backdrop = null; });

    controls.appendChild(prev); controls.appendChild(next); controls.appendChild(closeText);
    inner.appendChild(close); inner.appendChild(controls);
    backdrop.appendChild(inner);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });

    document.body.appendChild(backdrop);
    close.focus();
  }

  document.addEventListener('DOMContentLoaded', () => {
    collectItems();
    document.querySelectorAll('.media-thumb').forEach((thumb, idx) => {
      thumb.addEventListener('click', () => {
        collectItems();
        const index = items.findIndex(it => it.el === thumb);
        showModalAt(index === -1 ? idx : index);
      });
    });
  });

  // keyboard nav
  document.addEventListener('keydown', (e) => {
    if (!document.querySelector('.modal-backdrop')) return;
    if (e.key === 'ArrowLeft') document.querySelector('.modal-controls button:first-child')?.click();
    if (e.key === 'ArrowRight') document.querySelector('.modal-controls button:nth-child(2)')?.click();
    if (e.key === 'Escape') document.querySelector('.modal-close')?.click();
  });
})();

/* Formspree helper:
   - Disabled until you paste your endpoint in contact.html (data-formspree-endpoint)
*/
(function(){
  const form = document.getElementById('vs-form');
  if (!form) return;

  const endpoint = form.getAttribute('data-formspree-endpoint');
  const submitBtn = document.getElementById('vs-submit');
  const status = document.getElementById('vs-status');

  if (!endpoint || endpoint === 'REPLACE_WITH_YOUR_FORMSPREE_ENDPOINT') {
    if (submitBtn) submitBtn.disabled = true;
    if (status){
      status.style.color = '#b65757';
      status.textContent = 'Form not configured yet. Add your Formspree endpoint to enable submissions.';
    }
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitBtn) submitBtn.disabled = true;
    if (status){ status.style.color = '#7f847f'; status.textContent = 'Sending...'; }

    try {
      const formData = new FormData(form);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData
      });

      if (res.ok) {
        if (status){ status.style.color = '#1C352D'; status.textContent = 'Thank you! Your message has been sent.'; }
        form.reset();
      } else {
        if (status){ status.style.color = '#b65757'; status.textContent = 'Submission failed. If this is your first submission, check your email to verify Formspree.'; }
      }
    } catch (err) {
      if (status){ status.style.color = '#b65757'; status.textContent = 'Network error. Please try again later.'; }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();
