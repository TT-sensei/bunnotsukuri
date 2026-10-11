(function(){
  function summarize(attempts){
    const skills={};
    attempts.forEach(a=>{
      if(!a.skill)return;
      if(!skills[a.skill])skills[a.skill]={skill:a.skill,attempts:0,firstCorrect:0,finalCorrect:0,hints:0,byQuestion:{}};
      const s=skills[a.skill];s.attempts++;if(a.firstCorrect)s.firstCorrect++;if(a.correct)s.finalCorrect++;if(a.hintLevel>0)s.hints++;
      if(!s.byQuestion[a.questionId])s.byQuestion[a.questionId]={attempts:0,correct:0};s.byQuestion[a.questionId].attempts++;if(a.correct)s.byQuestion[a.questionId].correct++;
    });
    Object.values(skills).forEach(s=>{s.accuracy=Math.round(s.finalCorrect/s.attempts*100);s.firstAccuracy=Math.round(s.firstCorrect/s.attempts*100);});
    return skills;
  }
  function stageSummary(attempts,stageId){
    const rows=attempts.filter(a=>a.stage===stageId);
    return {attempts:rows.length,correct:rows.filter(a=>a.correct).length,firstCorrect:rows.filter(a=>a.firstCorrect).length,accuracy:rows.length?Math.round(rows.filter(a=>a.correct).length/rows.length*100):0};
  }
  function recommend(skills){
    const rows=Object.values(skills).filter(s=>s.attempts>=3).sort((a,b)=>a.accuracy-b.accuracy);
    if(!rows.length)return {title:"いろいろな問題を解いてみよう",message:"もう少し問題に取り組むと、次に練習するとよい内容が見えてくるよ。",skill:null};
    const s=rows[0],labels={subject:"主語を見つける",predicate:"じゅつ語を見つける",subjectPredicate:"主語とじゅつ語をつなぐ",modifier:"くわしくする言葉",modifierRelation:"言葉のつながり",sentenceCore:"文の中心",predicateType:"じゅつ語のなかま",sentenceRepair:"文を読みやすく直す",wordOrder:"言葉の順番",sentenceCreation:"自分で文を作る"};
    return {title:labels[s.skill]||"もう一度練習",message:"まずは短い文から練習し、できたら少し長い文に進もう。",skill:s.skill,accuracy:s.accuracy};
  }
  window.BunAnalytics={summarize,stageSummary,recommend};
})();