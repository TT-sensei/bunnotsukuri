(function(){
  function shuffle(items,random=Math.random){
    const result=items.slice();
    for(let i=result.length-1;i>0;i--){
      const j=Math.floor(random()*(i+1));
      [result[i],result[j]]=[result[j],result[i]];
    }
    return result;
  }
  function build(items,length,random=Math.random){
    const limit=Math.min(Math.max(0,Number(length)||0),items.length);
    if(!limit)return [];
    const tiers={
      basic:shuffle(items.filter(q=>q.difficulty==="basic"),random),
      standard:shuffle(items.filter(q=>q.difficulty==="standard"),random),
      challenge:shuffle(items.filter(q=>q.difficulty==="challenge"),random)
    };
    const chosen=[];
    const basicTarget=Math.min(limit,Math.ceil(limit*0.4));
    const standardTarget=Math.min(Math.ceil(limit*0.4),limit-basicTarget);
    const challengeTarget=limit-basicTarget-standardTarget;
    chosen.push(...tiers.basic.splice(0,basicTarget));
    chosen.push(...tiers.standard.splice(0,standardTarget));
    chosen.push(...tiers.challenge.splice(0,challengeTarget));
    if(chosen.length<limit){
      const remaining=[...tiers.basic,...tiers.standard,...tiers.challenge];
      const fillOrder={basic:0,standard:1,challenge:2};
      remaining.sort((a,b)=>(fillOrder[a.difficulty]??1)-(fillOrder[b.difficulty]??1));
      chosen.push(...shuffle(remaining,random).slice(0,limit-chosen.length));
    }
    const rank={basic:0,standard:1,challenge:2};
    return chosen.map((question,index)=>({question,index}))
      .sort((a,b)=>(rank[a.question.difficulty]??1)-(rank[b.question.difficulty]??1)||a.index-b.index)
      .map(entry=>entry.question);
  }
  window.BunSession={build};
})();