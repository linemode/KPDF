(async function(){
  const qs = (s)=>document.querySelector(s);
  const form = qs('#reqForm');
  const status = qs('#status');
  const l1 = qs('#l1');
  const l2 = qs('#l2');
  const l3 = qs('#l3');
  const l4 = qs('#l4');
  const reqType = qs('#request_type');
  const categoryBlock = qs('#categoryBlock');

  function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  async function fetchEnums(){
    try{ const res = await fetch('/api/enums'); return await res.json(); } catch(e){ console.error(e); return null; }
  }

  function buildSelect(sel, items, includeAll=true){
    sel.innerHTML = includeAll ? '<option value="">--Select--</option>' : '';
    items.forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; sel.appendChild(o); });
  }

  const enums = await fetchEnums();
  if(enums){
    // Include placeholder so we can clear selections when categories are hidden
    buildSelect(l1, enums.l1, true);
    buildSelect(l2, enums.l2, true);
    function populateL3(){ const arr = (l1.value || '').includes('\uc911\ub4f1') ? enums.l3_secondary : enums.l3_high; buildSelect(l3, arr, true); }
    l1.addEventListener('change', populateL3);
    populateL3();
    buildSelect(l4, enums.l4, true);
  }

  function toggleCategoryBlock(){
    if(!categoryBlock || !reqType) return;
    if(reqType.value === '자료요청'){
      categoryBlock.style.display = '';
    } else {
      categoryBlock.style.display = 'none';
      // clear selections
      try{ l1.selectedIndex = 0; l2.selectedIndex = 0; l3.selectedIndex = 0; l4.selectedIndex = 0; }catch(e){}
    }
  }
  if(reqType){ reqType.addEventListener('change', toggleCategoryBlock); toggleCategoryBlock(); }

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    status.textContent = '';
    const payload = {
      request_type: qs('#request_type').value || '자료요청',
      requested_title: qs('#requested_title').value.trim(),
      category_l1: qs('#l1').value || '',
      category_l2: qs('#l2').value || '',
      category_l3: qs('#l3').value || '',
      category_l4: qs('#l4').value || '',
      comments: qs('#comments').value.trim()
    };
    if(!payload.requested_title){ status.textContent = 'Please enter the requested title.'; return; }
    try{
      const res = await fetch('/api/requests', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if(res.ok){ status.textContent = 'Request submitted. Thank you.'; form.reset(); qs('#request_type').value = '자료요청'; toggleCategoryBlock(); } else { const j = await res.json().catch(()=>null); status.textContent = 'Error: ' + (j && j.error ? j.error : 'Server error'); }
    }catch(e){ status.textContent = 'Network error'; }
  });
})();
