export {};
type PollOption={id:number;label:string};
type PollData={id:string;type:"poll";title:string;description:string;createdAt:number;expiresAt:number;options:PollOption[];counts:Record<string,number>;totalVotes:number};
const qs=<T extends Element>(s:string)=>document.querySelector<T>(s);
const loading=qs<HTMLElement>("[data-loading]")!,createView=qs<HTMLElement>("[data-create]")!,eventView=qs<HTMLElement>("[data-event]")!,notFound=qs<HTMLElement>("[data-not-found]")!;
const params=new URLSearchParams(location.search),id=params.get("id")?.trim()??"";
let current:PollData|null=null;
const key=(id:string)=>"utility-tools:poll:vote:"+id,adminKey=(id:string)=>"utility-tools:poll:admin:"+id;
const errors:Record<string,string>={title_required:"質問を入力してください。",at_least_two_options:"選択肢を2件以上入力してください。",invalid_option:"選択肢を選んでください。",response_limit:"投票上限に達しました。",shared_item_not_found:"投票が見つかりません。"};
const request=async(url:string,init?:RequestInit)=>{const r=await fetch(url,{...init,headers:{"content-type":"application/json",...(init?.headers??{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(errors[j?.error]??"処理に失敗しました。");return j};
const setError=(el:HTMLElement,msg="")=>{el.textContent=msg;el.hidden=!msg};
try{const k="utility-tools:recent",item={id:"anonymous-poll",href:"/poll/",name:"匿名投票",category:"share"};const a=JSON.parse(localStorage.getItem(k)??"[]");localStorage.setItem(k,JSON.stringify([item,...(Array.isArray(a)?a.filter((x:any)=>x?.id!==item.id):[])].slice(0,6)))}catch{}

function initCreate(){
  loading.hidden=true;createView.hidden=false;
  const form=qs<HTMLFormElement>("[data-create-form]")!,button=qs<HTMLButtonElement>("[data-create-button]")!,error=qs<HTMLElement>("[data-create-error]")!;
  form.addEventListener("submit",async e=>{e.preventDefault();setError(error);const fd=new FormData(form);const options=[...new Set(String(fd.get("options")??"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean))];if(options.length<2){setError(error,"選択肢は2件以上必要です。");return}button.disabled=true;button.textContent="作成中...";try{const r=await request("/api/polls",{method:"POST",body:JSON.stringify({title:String(fd.get("title")??""),description:String(fd.get("description")??""),options})});localStorage.setItem(adminKey(r.id),r.adminToken);location.assign("/poll/?id="+encodeURIComponent(r.id)+"&created=1")}catch(err){setError(error,err instanceof Error?err.message:"作成に失敗しました。");button.disabled=false;button.textContent="投票を作成"}});
}
function savedVote(){try{return JSON.parse(localStorage.getItem(key(id))??"null")}catch{return null}}
function render(){
  if(!current)return;
  qs<HTMLElement>("[data-title]")!.textContent=current.title;
  const desc=qs<HTMLElement>("[data-description]")!;desc.textContent=current.description;desc.hidden=!current.description;
  qs<HTMLElement>("[data-expiry]")!.textContent="保存期限: "+new Date(current.expiresAt).toLocaleDateString("ja-JP");
  qs<HTMLElement>("[data-total]")!.textContent=current.totalVotes+"票";
  qs<HTMLInputElement>("[data-share-url]")!.value=location.origin+"/poll/?id="+encodeURIComponent(current.id);
  qs<HTMLElement>("[data-created]")!.hidden=params.get("created")!=="1";
  qs<HTMLButtonElement>("[data-delete]")!.hidden=!localStorage.getItem(adminKey(current.id));
  const options=qs<HTMLElement>("[data-options]")!;options.replaceChildren();
  const saved=savedVote();
  for(const option of current.options){const label=document.createElement("label");label.className="poll-option";const input=document.createElement("input");input.type="radio";input.name="poll-option";input.value=String(option.id);input.checked=Number(saved?.optionId)===option.id;const span=document.createElement("span");span.textContent=option.label;label.append(input,span);options.append(label)}
  qs<HTMLElement>("[data-vote-heading]")!.textContent=saved?"投票を変更":"投票する";
  qs<HTMLButtonElement>("[data-vote-submit]")!.textContent=saved?"投票を変更":"投票する";
  qs<HTMLButtonElement>("[data-vote-delete]")!.hidden=!saved;
  const results=qs<HTMLElement>("[data-results]")!;results.replaceChildren();qs<HTMLElement>("[data-empty]")!.hidden=current.totalVotes>0;
  for(const option of current.options){const count=current.counts[String(option.id)]??0,pct=current.totalVotes?Math.round(count/current.totalVotes*100):0;const row=document.createElement("div");row.innerHTML='<div class="poll-result-head"><span></span><strong></strong></div><div class="poll-result-bar"><div class="poll-result-fill"></div></div>';row.querySelector("span")!.textContent=option.label;row.querySelector("strong")!.textContent=count+"票 / "+pct+"%";(row.querySelector(".poll-result-fill") as HTMLElement).style.width=pct+"%";results.append(row)}
}
async function reload(){current=await request("/api/polls/"+id);render()}
function wire(){
  const form=qs<HTMLFormElement>("[data-vote-form]")!,error=qs<HTMLElement>("[data-vote-error]")!,submit=qs<HTMLButtonElement>("[data-vote-submit]")!;
  form.addEventListener("submit",async e=>{e.preventDefault();setError(error);const selected=document.querySelector<HTMLInputElement>('input[name="poll-option"]:checked');if(!selected){setError(error,"選択肢を選んでください。");return}const saved=savedVote();submit.disabled=true;try{if(saved){await request("/api/polls/"+id+"/votes/"+saved.voteId,{method:"PUT",headers:{authorization:"Bearer "+saved.editToken},body:JSON.stringify({optionId:Number(selected.value)})});saved.optionId=Number(selected.value);localStorage.setItem(key(id),JSON.stringify(saved))}else{const r=await request("/api/polls/"+id+"/votes",{method:"POST",body:JSON.stringify({optionId:Number(selected.value)})});localStorage.setItem(key(id),JSON.stringify({voteId:r.voteId,editToken:r.editToken,optionId:Number(selected.value)}))}await reload()}catch(err){setError(error,err instanceof Error?err.message:"投票に失敗しました。")}finally{submit.disabled=false}});
  qs<HTMLButtonElement>("[data-vote-delete]")!.addEventListener("click",async()=>{const saved=savedVote();if(!saved||!confirm("投票を取り消しますか？"))return;await request("/api/polls/"+id+"/votes/"+saved.voteId,{method:"DELETE",headers:{authorization:"Bearer "+saved.editToken}});localStorage.removeItem(key(id));await reload()});
  qs<HTMLButtonElement>("[data-copy]")!.addEventListener("click",async()=>{const v=qs<HTMLInputElement>("[data-share-url]")!.value,m=qs<HTMLElement>("[data-copy-message]")!;try{await navigator.clipboard.writeText(v);m.textContent="コピーしました。"}catch{m.textContent="URLを選択してコピーしてください。";qs<HTMLInputElement>("[data-share-url]")!.select()}m.hidden=false;setTimeout(()=>m.hidden=true,1500)});
  qs<HTMLButtonElement>("[data-delete]")!.addEventListener("click",async()=>{const token=localStorage.getItem(adminKey(id));if(!token||!confirm("この投票を削除しますか？"))return;await request("/api/polls/"+id,{method:"DELETE",headers:{authorization:"Bearer "+token}});localStorage.removeItem(adminKey(id));localStorage.removeItem(key(id));location.assign("/poll/")});
}
if(id){wire();reload().then(()=>{loading.hidden=true;eventView.hidden=false}).catch(()=>{loading.hidden=true;notFound.hidden=false})}else initCreate();
