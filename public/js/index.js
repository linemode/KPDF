// K-PDF client JS: initializes filters, performs searches, and renders results
(async function(){
  const qs = (s)=>document.querySelector(s);
  const qInput = qs('#q');
  const l1 = qs('#l1');
  const l2 = qs('#l2');
  const l3 = qs('#l3');
  const l4 = qs('#l4');
  const resultBody = qs('#resultBody');
  const searchBtn = qs('#searchBtn');
  const clearBtn = qs('#clearBtn');

  function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function setLoading(on){
    if(on){ resultBody.innerHTML = '<tr><td colspan="6" class="loading">Loading...</td></tr>'; }
  }

  async function fetchEnums(){
    try{
      const res = await fetch('/api/enums');
      return await res.json();
    }catch(e){ console.error('enum fetch',e); return null; }
  }

  function buildSelect(sel, items, includeAll=true){
    sel.innerHTML = includeAll ? '<option value="">--All--</option>' : '';
    items.forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; sel.appendChild(o); });
  }

  async function init(){
    const enums = await fetchEnums();
    if(!enums) return;
    buildSelect(l1, enums.l1);
    buildSelect(l2, enums.l2);
    buildSelect(l4, enums.l4);
    function populateL3(){
      const arr = (l1.value || '').includes('\uc911\ub4f1') ? enums.l3_secondary : enums.l3_high;
      buildSelect(l3, arr);
    }
    l1.addEventListener('change', populateL3);
    populateL3();

    attachHandlers();
    doSearch();
  }

  function attachHandlers(){
    let deb = null;
    qInput.addEventListener('input', ()=>{ clearTimeout(deb); deb=setTimeout(()=>doSearch(), 450); });
    searchBtn.addEventListener('click', ()=>doSearch());
    clearBtn.addEventListener('click', ()=>{ qInput.value=''; l1.selectedIndex=0; l2.selectedIndex=0; l3.selectedIndex=0; l4.selectedIndex=0; doSearch(); });
  }

  async function doSearch(){
    setLoading(true);
    try{
      const params = new URLSearchParams();
      if(qInput.value) params.set('q', qInput.value);
      if(l1.value) params.set('l1', l1.value);
      if(l2.value) params.set('l2', l2.value);
      if(l3.value) params.set('l3', l3.value);
      if(l4.value) params.set('l4', l4.value);
      const res = await fetch('/api/pdfs?'+params.toString());
      const arr = await res.json();
      renderResults(arr);
    }catch(e){ console.error(e); resultBody.innerHTML = '<tr><td colspan="6">Error fetching results</td></tr>'; }
  }

  function renderResults(items){
    resultBody.innerHTML = '';
    if(!items || !items.length){ resultBody.innerHTML = '<tr><td colspan="5">No results found.</td></tr>'; return; }
    items.forEach(r=>{
      const tr = document.createElement('tr');
      const d = r.upload_date ? new Date(r.upload_date).toLocaleString() : '';
      const cat = `${r.category_l1} / ${r.category_l2} / ${r.category_l3} / ${r.category_l4}`;
      const titleText = r.main_title || r.subtitle || '';
      tr.innerHTML = `<td data-label="Date">${escapeHtml(d)}</td><td data-label="Category">${escapeHtml(cat)}</td><td data-label="Title">${escapeHtml(titleText)}</td><td data-label="Publisher">${escapeHtml(r.publisher||'')}</td><td data-label="Link"><a href="${r.pdf_url}" target="_blank" rel="noopener">Open</a></td>`;
      resultBody.appendChild(tr);
    });
  }

  // init
  init();
})();
