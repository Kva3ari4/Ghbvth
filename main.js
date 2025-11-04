 // -------------------- Sample DB --------------------
    const SAMPLE_DB = [
      {id:'mgtu_it', university:'МГТУ им. Н.Э. Баумана', city:'Москва', rating:9.2, has_hostel:true, specialties:[{name:'Информатика и вычислительная техника', pass_score:280, cost:0, demand:0.95},{name:'Прикладная математика', pass_score:275,cost:0,demand:0.9}]},
      {id:'hse_ai', university:'НИУ ВШЭ', city:'Москва', rating:9.5, has_hostel:false, specialties:[{name:'Прикладная информатика', pass_score:290,cost:200000,demand:0.97},{name:'Информационные системы', pass_score:270,cost:150000,demand:0.9}]},
      {id:'kgtu', university:'КГТУ', city:'Калининград', rating:6.8, has_hostel:true, specialties:[{name:'Информационные системы и технологии', pass_score:220,cost:80000,demand:0.7},{name:'Программная инженерия', pass_score:230,cost:90000,demand:0.75}]},
      {id:'itmo', university:'ИТМО', city:'Санкт-Петербург', rating:9.0, has_hostel:true, specialties:[{name:'Программная инженерия', pass_score:275,cost:0,demand:0.93},{name:'Информатика и вычислительная техника', pass_score:278,cost:0,demand:0.9}]}
    ];

    // state
    let DB = JSON.parse(JSON.stringify(SAMPLE_DB));
    let results = [];

    // helpers
    const $ = id => document.getElementById(id);
    function formatMoney(n){return n===0? 'Бюджет' : n.toLocaleString('ru-RU')+' ₽';}

    // compute score (port from python)
    function computeScore(profile, uni, spec, weights){
      let score = 0; let expl = [];
      const ege = profile.ege || 0; const pass = spec.pass_score || 0;
      let ege_score = pass<=0 ? (ege>0?0.5:0) : Math.min(1, ege/pass);
      score += weights.ege * ege_score; expl.push(`EGE: ${ege} vs ${pass} → ${ege_score.toFixed(2)} (вес ${weights.ege})`);

      // interest match
      const interests = profile.interests.map(s=>s.toLowerCase()); const sname = spec.name.toLowerCase();
      let interest_match = 0;
      for(const it of interests){ if(it && (sname.includes(it)|| it.includes(sname))) { interest_match = 1; break; } }
      if(!interest_match){
        const mapping = {it:['информат','программ','компьютер'], programming:['программ','software'], design:['дизайн','архитектур'], economics:['эконом','финан'], biology:['биолог'], math:['матем','матик']}
        for(const it of interests){ for(const k in mapping){ if(it.startsWith(k)){ for(const kw of mapping[k]) if(sname.includes(kw)) { interest_match=0.9; break;} if(interest_match) break;} if(interest_match) break; }}
      }
      score += weights.interest * interest_match; expl.push(`Interest match → ${interest_match.toFixed(2)} (вес ${weights.interest})`);

      // city
      const city_pref = (profile.city||'').toLowerCase().trim(); const city_score = (!city_pref||city_pref===uni.city.toLowerCase())?1:0;
      score += weights.city * city_score; expl.push(`City: prefer '${profile.city||"Любой"}', uni city '${uni.city}' → ${city_score.toFixed(2)} (вес ${weights.city})`);

      // cost
      const wants_budget = profile.want_budget; const cost = spec.cost||0; let cost_score = 1;
      if(wants_budget){ cost_score = cost===0?1:Math.max(0,1 - Math.min(1,cost/Math.max(1,profile.maxCost||300000))); }
      score += weights.cost * cost_score; expl.push(`Cost: ${cost} (max ${profile.maxCost}) → ${cost_score.toFixed(2)} (вес ${weights.cost})`);

      // hostel
      const hostel_score = (!profile.need_hostel || uni.has_hostel)?1:0; score += weights.hostel * hostel_score; expl.push(`Hostel → ${hostel_score.toFixed(2)} (вес ${weights.hostel})`);

      // demand
      const demand = spec.demand||0.5; score += weights.demand * demand; expl.push(`Demand → ${demand.toFixed(2)} (вес ${weights.demand})`);

      // rating
      const rating = (uni.rating || 5)/10; score += weights.rating * rating; expl.push(`Rating ${uni.rating} → ${rating.toFixed(2)} (вес ${weights.rating})`);

      const total_weights = Object.values(weights).reduce((a,b)=>a+b,0);
      const final = total_weights>0? score/total_weights : 0;
      return {score:final, explanation: expl.join('\n') + `\nFinal raw ${score.toFixed(3)}, normalized ${final.toFixed(3)}`};
    }

    // run matching
    function runMatching(){
      const profile = {
        ege: Number($('ege').value)||0,
        interests: $('interests').value.split(',').map(s=>s.trim()).filter(Boolean),
        city: $('city').value.trim(),
        want_budget: $('budget').checked,
        need_hostel: $('hostel').checked,
        maxCost: Number($('maxCost').value)||200000
      };
      const weights = { ege: Number($('w_ege').value), interest: Number($('w_interest').value), city: Number($('w_city').value), cost: Number($('w_cost').value), hostel: Number($('w_hostel').value), demand: Number($('w_demand').value), rating:1 };
      weights.rating = 1; // static

      let matches = [];
      for(const uni of DB){ for(const spec of uni.specialties){ const res = computeScore(profile, uni, spec, weights); matches.push({...res, uni, spec}); }}
      matches.sort((a,b)=>b.score - a.score);
      results = matches;
      renderResults();
    }

    // render results
    function renderResults(){
      const container = $('cards'); container.innerHTML='';
      results.forEach((r,i)=>{
        const el = document.createElement('div'); el.className='card floating';
        el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><h3>${r.uni.university}</h3><div class="meta">${r.uni.city} · ${r.spec.name}</div></div><div style="text-align:right"><div class="score">${(r.score*100).toFixed(1)}%</div><div class="small">Рейтинг ${r.uni.rating}</div></div></div><div style="margin-top:10px" class="meta"><div class="pill">Проходной ${r.spec.pass_score}</div><div class="pill">${formatMoney(r.spec.cost)}</div></div>`;
        // animation delay
        setTimeout(()=> el.classList.add('show'), 50*i);
        // double click -> modal
        el.addEventListener('dblclick', ()=> showModal(r));
        container.appendChild(el);
      });
    }

    // modal
    function showModal(rec){
      const root = document.createElement('div'); root.className='modal';
      root.innerHTML = `<div class="modal-card"><h3 style="margin-top:0">${rec.uni.university} — ${rec.spec.name}</h3><div class="small" style="margin-bottom:8px">Город: ${rec.uni.city} · Проходной: ${rec.spec.pass_score} · Стоимость: ${formatMoney(rec.spec.cost)} · Рейтинг: ${rec.uni.rating}</div><pre style="white-space:pre-wrap;background:transparent;color:#cfe7ef;padding:8px;border-radius:8px;border:1px dashed rgba(255,255,255,0.03);max-height:320px;overflow:auto">${rec.explanation}</pre><div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end"><button id="closeModal" class="ghost">Закрыть</button><button id="applyBtn" class="btn">Сохранить в избранное</button></div></div>`;
      document.body.appendChild(root);
      $('closeModal').onclick = ()=> root.remove();
      $('applyBtn').onclick = ()=>{ alert('Добавлено в избранное (демо)'); root.remove(); };
    }

    // DB list
    function renderDB(){
      const list = $('dbList'); list.innerHTML='';
      DB.forEach(u=>{
        const el = document.createElement('div'); el.className='db-item';
        el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${u.university}</strong><div class="small">${u.city} · рейтинг ${u.rating}</div></div><div style="display:flex;flex-direction:column;gap:6px"><button class="ghost" data-id="${u.id}">Ред.</button><button class="ghost" data-id-del="${u.id}">Удал.</button></div></div>`;
        list.appendChild(el);
        el.querySelector('[data-id]')?.addEventListener('click', ()=> editUniversity(u.id));
        el.querySelector('[data-id-del]')?.addEventListener('click', ()=>{ if(confirm('Удалить вуз?')){ DB = DB.filter(x=>x.id!==u.id); renderDB(); } });
      });
    }

    function editUniversity(id){
      const u = DB.find(x=>x.id===id); if(!u) return; const name = prompt('Название', u.university); if(name) u.university = name; renderDB(); }

    // export CSV
    function exportCSV(){ if(!results.length){ alert('Нет результатов'); return;} const rows = [['score','university','city','specialty','pass','cost','rating','explanation']]; results.forEach(r=> rows.push([ (r.score).toFixed(3), r.uni.university, r.uni.city, r.spec.name, r.spec.pass_score, r.spec.cost, r.uni.rating, r.explanation.replace(/\n/g,'; ') ])); const csv = rows.map(r=> r.map(c=> '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n'); const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'educhoice_results.csv'; a.click(); URL.revokeObjectURL(url); }

    // save profile
    function saveProfile(){ const profile = { ege:$('ege').value, interests:$('interests').value, city:$('city').value, want_budget:$('budget').checked, need_hostel:$('hostel').checked, maxCost:$('maxCost').value, weights:{ege:$('w_ege').value, interest:$('w_interest').value, city:$('w_city').value, cost:$('w_cost').value, hostel:$('w_hostel').value, demand:$('w_demand').value}}; const blob = new Blob([JSON.stringify(profile,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='educhoice_profile.json'; a.click(); URL.revokeObjectURL(a.href); }

    // save DB
    function saveDB(){ const blob = new Blob([JSON.stringify(DB,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='educhoice_db.json'; a.click(); URL.revokeObjectURL(a.href); }

    // load DB
    function loadDBFile(){ const inp = document.createElement('input'); inp.type='file'; inp.accept='.json'; inp.onchange = e=>{ const f = e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload = ev=>{ try{ const j = JSON.parse(ev.target.result); if(Array.isArray(j)){ DB=j; renderDB(); alert('БД загружена'); } else alert('Некорректный формат (ожидается список)'); } catch(err){ alert('Ошибка чтения файла'); } }; r.readAsText(f); }; inp.click(); }

    // restore sample
    function restoreSample(){ if(confirm('Восстановить примерную БД?')){ DB = JSON.parse(JSON.stringify(SAMPLE_DB)); renderDB(); alert('Встроенная БД восстановлена'); }}

    // init listeners
    document.addEventListener('DOMContentLoaded', ()=>{
      $('runBtn').onclick = runMatching; $('exportCSV').onclick = exportCSV; $('saveProfile').onclick = saveProfile; $('saveDB').onclick = saveDB; $('loadDB').onclick = loadDBFile; $('restoreSample').onclick = restoreSample; $('addUni').onclick = ()=>{ const id = 'u'+Date.now(); DB.push({id,university:'Новый вуз',city:'Город',rating:5,has_hostel:false,specialties:[{name:'Новая специальность',pass_score:200,cost:0,demand:0.5}]}); renderDB(); }; $('clearBtn').onclick = ()=>{ $('cards').innerHTML=''; results=[]; };
      $('themeBtn').onclick = ()=>{ document.body.style.background = document.body.style.background? 'linear-gradient(180deg,#071028 0%, #071426 60%)' : 'linear-gradient(180deg,#f6f7fb 0%, #e9eef6 60%)'; };
      renderDB();
    });
