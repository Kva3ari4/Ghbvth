const DB = [
    {university:'Satbayev University',city:'Алматы',rating:8.8,has_hostel:true,specialties:[{name:'Информационные системы',pass_score:110,cost:0},{name:'Кибербезопасность',pass_score:125,cost:800000}]},
    {university:'Astana IT University',city:'Астана',rating:8.5,has_hostel:false,specialties:[{name:'Программная инженерия',pass_score:118,cost:900000}]}
    ];
    
    const $ = id => document.getElementById(id);
    function formatCost(v){return v===0?'Грант':v.toLocaleString('ru-RU')+' ₸'}
    
    $('runBtn').onclick = ()=>{
    const ent = Number($('ent_total').value)||0;
    const interests = $('interests').value.toLowerCase();
    const city = $('city').value;
    const results=[];
    DB.forEach(u=>u.specialties.forEach(s=>{
    let score = (ent / s.pass_score)*50 + (u.rating*5);
    if(interests && s.name.toLowerCase().includes(interests)) score+=20;
    if(city && u.city===city) score+=10;
    results.push({...s,uni:u,score});
    }));
    results.sort((a,b)=>b.score-a.score);
    render(results);
    };
    
    function render(res){
    const el=$('cards');
    el.innerHTML='';
    res.forEach(r=>{
    const card=document.createElement('div');
    card.className='card';
    card.innerHTML=`<h3>${r.uni.university}</h3><div class='meta'>${r.uni.city} · ${r.name}</div><div class='score'>${r.score.toFixed(1)}%</div><div class='meta'>Проходной ${r.pass_score} · ${formatCost(r.cost)}</div>`;
    el.appendChild(card);
    });
    }
    
    window.onload=()=>{
    const db=$('dbList');
    db.innerHTML=DB.map(u=>`<div class='meta'><b>${u.university}</b> (${u.city})</div>`).join('');
    };