(function(){
  const KEY="tt-sensei:bunnotsukuri:v1";
  const blank=()=>({version:1,attempts:[],stageRuns:{},settings:{sessionLength:10,showNavi:true},updatedAt:new Date().toISOString()});
  function read(){
    try{const raw=localStorage.getItem(KEY);if(!raw)return blank();const data=JSON.parse(raw);if(!data||data.version!==1||!Array.isArray(data.attempts))return blank();return {...blank(),...data,settings:{...blank().settings,...(data.settings||{})}};}
    catch(e){return blank();}
  }
  let state=read();
  function save(){state.updatedAt=new Date().toISOString();try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch(e){return false;}}
  function addAttempt(attempt){state.attempts.push({...attempt,recordedAt:new Date().toISOString()});if(state.attempts.length>5000)state.attempts=state.attempts.slice(-5000);save();}
  function setSettings(settings){state.settings={...state.settings,...settings};save();}
  function clear(){state=blank();save();return state;}
  function exportData(){return JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2);}
  function importData(raw){
    const parsed=JSON.parse(raw);
    if(!parsed||parsed.version!==1||!Array.isArray(parsed.attempts))throw new Error("このアプリのバックアップデータではありません。");
    state={...blank(),...parsed,settings:{...blank().settings,...(parsed.settings||{})}};
    save();return state;
  }
  function snapshot(){return JSON.parse(JSON.stringify(state));}
  window.BunStorage={snapshot,addAttempt,setSettings,clear,exportData,importData,saveStatus:()=>{try{localStorage.setItem(KEY+"-test","1");localStorage.removeItem(KEY+"-test");return true;}catch(e){return false;}}};
})();