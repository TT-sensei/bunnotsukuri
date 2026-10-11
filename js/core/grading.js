(function(){
  function norm(s){return String(s||"").normalize("NFKC").replace(/[、。,.!?！？\s　]/g,"").trim();}
  function equalArray(a,b){return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>v===b[i]);}
  function evaluate(question,answer){
    if(!question)return {correct:false,gradable:false,reason:"問題が見つかりません。"};
    switch(question.type){
      case "select": case "classify":
        return {correct:question.answer===answer,gradable:true};
      case "pair":
        return {correct:!!answer&&answer.left===question.answer.left&&answer.right===question.answer.right,gradable:true};
      case "relation":
        return {correct:!!answer&&answer.from===question.answer.from&&answer.to===question.answer.to,gradable:true};
      case "strip":
        return {correct:Array.isArray(answer)&&equalArray([...answer].sort(),[...question.answer].sort()),gradable:true};
      case "repair":
        return {correct:Array.isArray(answer)?answer.length===1&&question.answer.includes(answer[0]):question.answer.includes(answer),gradable:true};
      case "reorder":
        return {correct:equalArray(answer,question.answer),gradable:true};
      case "compose":{
        const value=String(answer||"").trim();
        const normalized=norm(value);
        const criteria=[];
        if(question.required)question.required.forEach(term=>criteria.push({label:"「"+term+"」を使っている",done:normalized.includes(norm(term))}));
        if(question.requiredAny)question.requiredAny.forEach(group=>criteria.push({label:"指定された言葉を使っている",done:group.some(term=>normalized.includes(norm(term)))}));
        if(question.minimumLength)criteria.push({label:"文をくわしく書いている",done:[...value].filter(ch=>!/[、。！？\s　]/.test(ch)).length>=question.minimumLength});
        if(question.requiresSubjectPredicate){
          const hasSubject=/(は|が|も)(、|は|が|も|[ぁ-んァ-ン一-龥])/u.test(value);
          const hasPredicate=/(です|ます|した|する|いる|ある|なる|たい|い。|る。|だ。|た。|ます。|です。|。)$/.test(value);
          criteria.push({label:"主語と述語がある",done:hasSubject&&hasPredicate});
        }
        const correct=criteria.length>0&&criteria.every(c=>c.done);
        return {correct,gradable:true,criteria,feedback:correct?"条件を満たしているね。文を声に出さずに目で読み、言葉のつながりも確かめよう。":"条件をもう一度確かめよう。必要な言葉が入っているか、文として自然かを読み直してみよう。",selfAssessment:true};
      }
      default:return {correct:false,gradable:false,reason:"この問題形式はまだ判定できません。"};
    }
  }
  window.BunGrading={evaluate,norm};
})();