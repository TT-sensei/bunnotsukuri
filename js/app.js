(function(){
  const root=document.getElementById("app");
  const DATA=window.BUN_DATA;
  let screen="home",stageId=1,run=null,currentIndex=0,selection=null,feedback=null,hintLevel=0,mode="stage",trainingSkill=null;
  const storage=window.BunStorage;
  function snapshot(){return storage.snapshot();}
  function shuffled(items){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function stageProgress(){const attempts=snapshot().attempts;const out={};DATA.stages.forEach(s=>{const rows=attempts.filter(a=>a.stage===s.id);out[s.id]=rows.length?Math.round(rows.filter(a=>a.correct).length/rows.length*100):0;});return out;}
  function render(){
    const s=snapshot();
    if(screen==="home")root.innerHTML=window.BunUI.home(DATA,stageProgress(),s.settings);
    else if(screen==="question"&&run&&run.questions[currentIndex])root.innerHTML=window.BunUI.question(run.questions[currentIndex],currentIndex,run.questions.length,selection,feedback,s.settings,mode);
    else if(screen==="result"&&run)root.innerHTML=window.BunUI.result(run);
    else if(screen==="records")root.innerHTML=window.BunUI.records(s);
    else if(screen==="settings")root.innerHTML=window.BunUI.settings(s.settings);
    else if(screen==="training")renderTraining();
    else {screen="home";render();return;}
    root.focus({preventScroll:true});
  }
  function renderTraining(){
    const attempts=snapshot().attempts,skills=window.BunAnalytics.summarize(attempts);
    const recommendation=window.BunAnalytics.recommend(skills);
    const stageMap={subject:1,predicate:2,subjectPredicate:3,modifier:4,modifierRelation:5,sentenceCore:6,predicateType:7,sentenceRepair:8,wordOrder:9,sentenceCreation:10};
    const id=stageMap[recommendation.skill]||1;
    root.innerHTML=window.BunUI.shell("もう一度練習","できるところから、少しずつ進もう。",'<section class="panel"><h2>'+window.BunUI.safe(recommendation.title)+'</h2><p>'+window.BunUI.safe(recommendation.message)+'</p><div class="record-actions">'+window.BunUI.button("おすすめの特訓を始める","startTraining","button primary",'data-stage="'+id+'"')+window.BunUI.button("ステージを選ぶ","home","button")+'</div></section><section class="panel" style="margin-top:14px"><h3>練習のヒント</h3><p>最初は短い文で考え、できたら言葉が多い文に進もう。正解したかだけでなく、どう考えたかも大切にしよう。</p></section>',"home");
  }
  function startStage(id,training=false,skill=null){
    stageId=Number(id)||1;mode=training?"training":"stage";trainingSkill=skill;
    let qs=DATA.questions.filter(q=>q.stage===stageId);
    if(training){
      const attempts=snapshot().attempts;
      const recommendation=window.BunAnalytics.recommend(window.BunAnalytics.summarize(attempts));
      const targetSkill=skill||recommendation.skill;
      if(targetSkill){
        const wrong=new Set(attempts.filter(a=>a.skill===targetSkill&&!a.correct&&!a.revealed).map(a=>a.questionId));
        const focused=DATA.questions.filter(q=>q.skill===targetSkill&&wrong.has(q.id));
        qs=focused.length>=3?focused:DATA.questions.filter(q=>q.skill===targetSkill);
      }else{
        qs=DATA.questions.filter(q=>q.stage===stageId);
      }
      if(!qs.length)qs=DATA.questions.filter(q=>q.stage===stageId);
    }
    const length=snapshot().settings.sessionLength;
    run={stage:stageId,questions:shuffled(qs).slice(0,Math.min(length,qs.length)),items:[],firstAttemptResults:{},lastStage:stageId};
    currentIndex=0;selection=null;feedback=null;hintLevel=0;screen="question";render();
  }
  function current(){return run&&run.questions[currentIndex];}
  function logAttempt(q,correct,firstCorrect,revealed=false){
    storage.addAttempt({questionId:q.id,stage:q.stage,skill:q.skill,correct,firstCorrect,hintLevel,revealed,difficulty:q.difficulty,type:q.type});
  }
  function updateRunItem(q,correct,firstCorrect,revealed=false){
    const item={questionId:q.id,prompt:q.prompt,correct,firstCorrect,revealed};
    const index=run.items.findIndex(x=>x.questionId===q.id);
    if(index>=0)run.items[index]={...run.items[index],...item};else run.items.push(item);
  }
  function check(){
    if(feedback)return;
    const q=current();if(!q)return;
    if(q.type==="compose"&&typeof selection!=="string")selection="";
    const result=window.BunGrading.evaluate(q,selection);
    if(!result.gradable){feedback={correct:false,message:"この答え方はまだ確認できません。問題を選び直してみよう。"};render();return;}
    if(!Object.prototype.hasOwnProperty.call(run.firstAttemptResults,q.id))run.firstAttemptResults[q.id]=!!result.correct&&hintLevel===0;
    const firstCorrect=!!run.firstAttemptResults[q.id];
    if(q.type==="compose"){
      feedback={correct:result.correct,message:result.feedback,explanation:q.explanation,criteria:result.criteria};
    }else if(result.correct){
      feedback={correct:true,message:"言葉のつながりを見つけられたね。",explanation:q.explanation};
    }else{
      feedback={correct:false,message:q.hint,explanation:"選んだ言葉を、問いかけに合わせてもう一度確かめよう。"};
    }
    logAttempt(q,!!result.correct,firstCorrect,false);
    updateRunItem(q,!!result.correct,firstCorrect,false);
    render();
  }
  function reveal(){
    if(feedback)return;const q=current();
    const ans=answerText(q);
    feedback={correct:false,message:"答えと考え方を確認しよう。",explanation:q.explanation,revealed:true,answer:ans};
    if(!Object.prototype.hasOwnProperty.call(run.firstAttemptResults,q.id))run.firstAttemptResults[q.id]=false;
    logAttempt(q,false,!!run.firstAttemptResults[q.id],true);
    updateRunItem(q,false,!!run.firstAttemptResults[q.id],true);
    render();
    const f=root.querySelector(".feedback");if(f)f.insertAdjacentHTML("beforeend",'<p class="feedback-detail"><strong>答え：</strong>'+window.BunUI.safe(ans)+'</p>');
  }
  function answerText(q){
    if(q.type==="select"||q.type==="classify")return q.parts.find(p=>p.id===q.answer)?.text||"";
    if(q.type==="pair")return q.parts.find(p=>p.id===q.answer.left)?.text+" → "+q.parts.find(p=>p.id===q.answer.right)?.text;
    if(q.type==="relation")return q.parts.find(p=>p.id===q.answer.from)?.text+" → "+q.parts.find(p=>p.id===q.answer.to)?.text;
    if(q.type==="strip")return q.answer.map(id=>q.parts.find(p=>p.id===id)?.text).join("、");
    if(q.type==="repair")return q.answer.map(id=>q.parts.find(p=>p.id===id)?.text).join(" / ");
    if(q.type==="reorder")return q.answer.map(id=>q.parts.find(p=>p.id===id)?.text).join(" ");
    return "自分で文を読み直して、条件を確かめよう。";
  }
  function next(){
    if(currentIndex+1<run.questions.length){currentIndex++;selection=null;feedback=null;hintLevel=0;render();}
    else{screen="result";render();}
  }
  function retry(){if(current()?.type!=="compose")selection=null;feedback=null;render();}
  function chooseAnswer(id){
    const q=current();if(!q||feedback)return;
    if(q.type==="repair"){selection=id;}
    else if(q.type==="strip"){selection=Array.isArray(selection)?selection.includes(id)?selection.filter(x=>x!==id):[...selection,id]:[id];}
    else selection=id;
    render();
  }
  function chooseWord(id){
    const q=current();if(!q||feedback)return;
    if(q.type==="pair"){
      if(!selection||!selection.left)selection={left:id,right:null};
      else if(!selection.right&&selection.left!==id)selection={...selection,right:id};
      else selection={left:id,right:null};
    } else if(q.type==="relation"){
      if(!selection||!selection.from)selection={from:id,to:null};
      else if(!selection.to&&selection.from!==id)selection={...selection,to:id};
      else selection={from:id,to:null};
    } else if(q.type==="reorder"){
      const order=Array.isArray(selection)?selection:q.parts.map(p=>p.id);
      if(!selection)selection=[id,...q.parts.filter(p=>p.id!==id).map(p=>p.id)];
      else if(!order.includes(id))selection=[...order,id];
    }
    render();
  }
  function reorderAdd(id){
    if(feedback)return;const q=current();let order=Array.isArray(selection)?selection:[];
    if(!selection)order=[];
    if(!order.includes(id))selection=[...order,id];
    render();
  }
  function reorderRemove(id){if(feedback)return;selection=(Array.isArray(selection)?selection:[]).filter(x=>x!==id);render();}
  root.addEventListener("click",e=>{
    const action=e.target.closest("[data-action]")?.dataset.action;
    if(action){
      const el=e.target.closest("[data-action]");
      if(action==="home"){screen="home";render();}
      else if(action==="firstStage")startStage(1);
      else if(action==="stage")startStage(el.dataset.stage);
      else if(action==="check")check();
      else if(action==="next")next();
      else if(action==="retry")retry();
      else if(action==="editCompose"){feedback=null;render();}
      else if(action==="hint"){hintLevel=Math.min(2,hintLevel+1);feedback={correct:false,message:current().hint,explanation:hintLevel>1?current().explanation:"まず、問いかけに合う言葉を探そう。"};render();}
      else if(action==="reveal")reveal();
      else if(action==="records"){screen="records";render();}
      else if(action==="settings"){screen="settings";render();}
      else if(action==="training"){screen="training";render();}
      else if(action==="startTraining")startStage(el.dataset.stage,true);
      else if(action==="again")startStage(run.lastStage);
      else if(action==="export"){const blob=new Blob([storage.exportData()],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="bunnotsukuri-records.json";a.click();URL.revokeObjectURL(url);}
      else if(action==="import"){root.querySelector("#import-file")?.click();}
      else if(action==="clearRecords"){if(confirm("学習記録をすべて消します。この操作は元に戻せません。先にバックアップしましたか？")){storage.clear();screen="records";render();}}
      else if(action==="resetOrder"){selection=null;render();}
      return;
    }
    const answer=e.target.closest("[data-answer]");if(answer){chooseAnswer(answer.dataset.answer);return;}
    const word=e.target.closest("[data-word]");if(word){chooseWord(word.dataset.word);return;}
    const pairSide=e.target.closest("[data-pair-side]");if(pairSide){if(!selection)selection={left:null,right:null};if(pairSide.dataset.pairSide==="left")selection={...selection,left:null};else selection={...selection,right:null};render();return;}
    const relSide=e.target.closest("[data-rel-side]");if(relSide){if(!selection)selection={from:null,to:null};if(relSide.dataset.relSide==="from")selection={...selection,from:null};else selection={...selection,to:null};render();return;}
    const add=e.target.closest("[data-order-add]");if(add){reorderAdd(add.dataset.orderAdd);return;}
    const remove=e.target.closest("[data-order-remove]");if(remove){reorderRemove(remove.dataset.orderRemove);return;}
  });
  root.addEventListener("input",e=>{if(e.target.matches("[data-compose]"))selection=e.target.value;});
  root.addEventListener("change",e=>{
    if(e.target.id==="setting-navi"){const s=snapshot().settings;storage.setSettings({...s,showNavi:e.target.checked});render();}
    if(e.target.id==="setting-length"){const s=snapshot().settings;storage.setSettings({...s,sessionLength:Number(e.target.value)});render();}
    if(e.target.id==="import-file"&&e.target.files&&e.target.files[0]){const reader=new FileReader();reader.onload=()=>{try{storage.importData(String(reader.result));screen="records";render();alert("学習記録を読み込みました。");}catch(err){alert("読み込めませんでした："+err.message);}};reader.readAsText(e.target.files[0]);}
  });
  document.querySelector(".brand").addEventListener("click",e=>{e.preventDefault();screen="home";render();});
  render();
})();