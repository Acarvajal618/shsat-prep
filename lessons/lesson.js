document.addEventListener('DOMContentLoaded', function () {
  var isStyleA = !!document.querySelector('.or.c');
  var isStyleB = !isStyleA && !!document.querySelector('.option-row.correct');
  if (!isStyleA && !isStyleB) return;
  var correctSel=isStyleA?'.or.c':'.option-row.correct',wrongSel=isStyleA?'.or.w':'.option-row.wrong',badgeSel=isStyleA?'.cb':'.correct-badge',correctClass=isStyleA?'c':'correct',wrongClass=isStyleA?'w':'wrong',badgeClass=isStyleA?'cb':'correct-badge';
  var correctEl=document.querySelector(correctSel);
  if(!correctEl)return;
  correctEl.dataset.correct='true';
  correctEl.classList.remove(correctClass);
  var badge=correctEl.querySelector(badgeSel);
  if(badge)badge.remove();
  document.querySelectorAll(wrongSel).forEach(function(el){el.classList.remove(wrongClass);});
  var solutionCard=document.querySelector('.card.ag,.card.card-accent-green');
  var sts=document.querySelectorAll('.st,.section-title');
  var solutionSt=null,mistakesSt=null,readySt=null;
  sts.forEach(function(el){var t=el.textContent.trim().toLowerCase();if(t.includes('step')||t.includes('solution'))solutionSt=el;else if(t.includes('mistake'))mistakesSt=el;else if(t.includes('ready'))readySt=el;});
  function hide(el){if(el)el.style.display='none';}
  function show(el){if(el)el.style.display='';}
  hide(solutionSt);hide(solutionCard);hide(mistakesSt);hide(readySt);
  var allCards=Array.prototype.slice.call(document.querySelectorAll('.card'));
  var solIdx=allCards.indexOf(solutionCard);
  if(solIdx>=0){for(var i=solIdx+1;i<allCards.length;i++)hide(allCards[i]);}
  var problemCards=document.querySelectorAll('.card.aa,.card.card-accent-amber');
  var problemCard=problemCards[problemCards.length-1];
  var btn=document.createElement('button');
  btn.textContent='👉 Show Step-by-Step Solution';
  btn.style.cssText='display:block;width:100%;margin-bottom:1.5rem;padding:.9rem 1.5rem;background:#1a73e8;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:700;cursor:pointer';
  btn.addEventListener('mouseover',function(){btn.style.background='#1557b0';});
  btn.addEventListener('mouseout',function(){btn.style.background='#1a73e8';});
  if(problemCard)problemCard.parentNode.insertBefore(btn,problemCard.nextSibling);
  btn.addEventListener('click',function(){
    document.querySelectorAll('.or,.option-row').forEach(function(el){
      if(el.dataset.correct==='true'){el.classList.add(correctClass);var b=document.createElement('span');b.className=badgeClass;b.textContent='✓';el.appendChild(b);}
      else{el.classList.add(wrongClass);}
    });
    show(solutionSt);show(solutionCard);show(mistakesSt);show(readySt);
    allCards.forEach(function(c){show(c);});
    btn.remove();
    if(solutionCard)solutionCard.scrollIntoView({behavior:'smooth',block:'start'});
  });
});
