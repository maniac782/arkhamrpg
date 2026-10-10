/* Dropdowns.
   Every <select> opens the site's own list instead of the browser's menu, so they all look the same.
   Lists with more than 10 choices also get a search box.
   Picking an item sets the select's value and fires a normal "change" event, so the page code doesn't need to know.
   Add data-nosearch to a select to keep the plain browser menu. */
(function(){
  'use strict';
  const SEARCH_MIN = 11;                      // show the search box from this many choices
  const touch = window.matchMedia && matchMedia('(pointer:coarse)').matches;
  const css = `
.spk{position:fixed;z-index:60;background:var(--surface,#fff);color:var(--ink,#111);border:1px solid var(--line,#bbb);border-radius:10px;
 box-shadow:0 10px 30px rgba(0,0,0,.28);display:flex;flex-direction:column;overflow:hidden;font:inherit}
.spk:focus{outline:none}
.spk input[hidden]{display:none}
.spk input{border:0;border-bottom:1px solid var(--line,#bbb);padding:10px 12px;font:inherit;background:transparent;color:inherit;outline:none;width:100%}
.spk ul{list-style:none;margin:0;padding:4px 0;overflow:auto;overscroll-behavior:contain}
.spk li{padding:7px 12px;cursor:pointer;line-height:1.3}
.spk li.g{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#666);cursor:default;padding:8px 12px 4px}
.spk li.on{background:var(--surface2,#eee)}
.spk li.cur{font-weight:700}
.spk li.dis{opacity:.45;cursor:default}
.spk .none{padding:10px 12px;color:var(--muted,#666)}
.spk-back{position:fixed;inset:0;z-index:59}
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  let open = null; // {sel, box, back, items, hi}
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const searchable = s => s && s.tagName === 'SELECT' && !s.disabled && !s.multiple && !s.hasAttribute('data-nosearch') && s.options.length > 0;

  function close(focusBack){
    if(!open) return;
    const {sel, box, back} = open; open = null;
    box.remove(); back.remove();
    // Not on phones: focusing a select there can pop up the system picker.
    if(focusBack && !touch){ const live = sel.id ? document.getElementById(sel.id) : sel; if(live && live.isConnected) try{ live.focus({preventScroll:true}); }catch(e){} }
  }

  function choose(value){
    if(!open) return;
    const sel = open.sel;
    // The page may have redrawn while the list was open: use the select that's on screen now.
    const live = (sel.id && document.getElementById(sel.id)) || sel;
    close(true);
    if(!live.isConnected) return;
    live.value = value;
    live.dispatchEvent(new Event('change', {bubbles:true}));
  }

  function build(q){
    const {sel, box} = open;
    const ul = box.querySelector('ul');
    const nq = norm(q).trim();
    let html = '', items = [];
    const add = (opt, group) => {
      if(opt.value === '' && nq) return;            // hide the "Choose…" placeholder while searching
      const text = opt.textContent;
      if(nq && !norm(text + ' ' + (group || '')).includes(nq)) return;
      items.push(opt);
      html += '<li data-i="' + (items.length - 1) + '" class="' + (opt.disabled ? 'dis ' : '') + (opt.value === sel.value ? 'cur' : '') + '" role="option">' + esc(text) + '</li>';
    };
    for(const node of sel.children){
      if(node.tagName === 'OPTGROUP'){
        const before = items.length, mark = html.length;
        html += '<li class="g" aria-hidden="true">' + esc(node.label) + '</li>';
        for(const o of node.children) add(o, node.label);
        if(items.length === before) html = html.slice(0, mark); // drop empty groups
      } else add(node, '');
    }
    ul.innerHTML = html || '<div class="none">Nothing matches.</div>';
    open.items = items;
    let hi = items.findIndex(o => !o.disabled && (nq ? true : o.value === sel.value));
    if(hi < 0) hi = items.findIndex(o => !o.disabled);
    setHi(hi, true);
  }

  function setHi(i, scroll){
    if(!open) return;
    open.hi = i;
    open.box.querySelectorAll('li.on').forEach(li => li.classList.remove('on'));
    const li = open.box.querySelector('li[data-i="' + i + '"]');
    if(li){ li.classList.add('on'); if(scroll) li.scrollIntoView({block:'nearest'}); }
  }

  function move(d){
    if(!open || !open.items.length) return;
    let i = open.hi;
    for(let n = 0; n < open.items.length; n++){
      i = (i + d + open.items.length) % open.items.length;
      if(!open.items[i].disabled) break;
    }
    setHi(i, true);
  }

  function place(){
    if(!open) return;
    const r = open.sel.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(vw - 16, Math.max(r.width, 300));
    const left = Math.max(8, Math.min(r.left, vw - w - 8));
    const below = vh - r.bottom - 12, above = r.top - 12;
    const up = below < 240 && above > below;
    const maxH = Math.max(180, Math.min(420, up ? above : below));
    Object.assign(open.box.style, {left: left + 'px', width: w + 'px', maxHeight: maxH + 'px',
      top: up ? '' : (r.bottom + 4) + 'px', bottom: up ? (vh - r.top + 4) + 'px' : ''});
  }

  function openFor(sel, firstKey){
    if(open) close(false);
    const back = document.createElement('div'); back.className = 'spk-back';
    const box = document.createElement('div'); box.className = 'spk'; box.setAttribute('role', 'dialog');
    const lab = sel.getAttribute('aria-label') || (sel.labels && sel.labels[0] ? sel.labels[0].textContent : '') || 'Choose';
    const withSearch = sel.options.length >= SEARCH_MIN;
    box.tabIndex = -1;
    box.innerHTML = '<input type="search" placeholder="Search…" aria-label="Search ' + esc(lab.trim()) + '" autocomplete="off" autocapitalize="off" spellcheck="false"' + (withSearch ? '' : ' hidden') + '><ul role="listbox" aria-label="' + esc(lab.trim()) + '"></ul>';
    document.body.appendChild(back); document.body.appendChild(box);
    open = {sel, box, back, items: [], hi: -1};
    const input = box.querySelector('input');
    if(firstKey && withSearch) input.value = firstKey;
    build(input.value); place();
    // Short lists have no search box: keep the keyboard closed on phones and steer with the arrow keys.
    if(withSearch) input.focus(); else box.focus({preventScroll:true});
    back.addEventListener('mousedown', e => { e.preventDefault(); close(true); });
    back.addEventListener('touchstart', e => { e.preventDefault(); close(true); }, {passive:false});
    input.addEventListener('input', () => build(input.value));
    (withSearch ? input : box).addEventListener('keydown', e => {
      if(e.key === 'ArrowDown'){ e.preventDefault(); move(1); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); move(-1); }
      else if(e.key === 'Enter'){ e.preventDefault(); const o = open && open.items[open.hi]; if(o && !o.disabled) choose(o.value); }
      else if(e.key === 'Escape' || e.key === 'Tab'){ e.preventDefault(); close(true); }
    });
    box.addEventListener('mousedown', e => { if(e.target !== input) e.preventDefault(); });
    box.addEventListener('mousemove', e => { const li = e.target.closest('li[data-i]'); if(li) setHi(Number(li.dataset.i), false); });
    box.addEventListener('click', e => {
      const li = e.target.closest('li[data-i]'); if(!li) return;
      const o = open && open.items[Number(li.dataset.i)]; if(o && !o.disabled) choose(o.value);
    });
  }

  // Open our list instead of the browser's menu (mouse, touch and keyboard).
  document.addEventListener('mousedown', e => {
    const sel = e.target.closest && e.target.closest('select');
    if(!searchable(sel) || e.button !== 0) return;
    e.preventDefault(); sel.focus({preventScroll:true}); openFor(sel);
  }, true);
  document.addEventListener('touchend', e => {
    const sel = e.target.closest && e.target.closest('select');
    if(!searchable(sel)) return;
    e.preventDefault(); openFor(sel);
  }, {capture:true, passive:false});
  document.addEventListener('keydown', e => {
    const sel = e.target;
    if(open || !searchable(sel) || e.altKey || e.ctrlKey || e.metaKey) return;
    if(e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'F4'){ e.preventDefault(); openFor(sel); }
    else if(e.key.length === 1 && sel.options.length >= SEARCH_MIN){ e.preventDefault(); openFor(sel, e.key); }
  }, true);
  window.addEventListener('resize', () => place());
  window.addEventListener('scroll', e => { if(open && !open.box.contains(e.target)) place(); }, true);

  function esc(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
})();
