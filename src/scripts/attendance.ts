export {};
type AttendanceStatus="yes"|"maybe"|"no";
type AttendanceResponse={id:string;name:string;status:AttendanceStatus;comment:string;createdAt:number;updatedAt:number};
type AttendanceData={id:string;type:"attendance";title:string;description:string;eventDate:string;place:string;createdAt:number;expiresAt:number;responses:AttendanceResponse[];counts:{yes:number;maybe:number;no:number};responseCount:number};
const qs=<T extends Element>(s:string)=>document.querySelector<T>(s);
const loading=qs<HTMLElement>("[data-loading]")!,createView=qs<HTMLElement>("[data-create]")!,eventView=qs<HTMLElement>("[data-event]")!,notFound=qs<HTMLElement>("[data-not-found]")!;
const params=new URLSearchParams(location.search),id=params.get("id")?.trim()??"";
let current:AttendanceData|null=null;
const responseKey=(id:string)=>"utility-tools:attendance:response:"+id,adminKey=(id:string)=>"utility-tools:attendance:admin:"+id;
const errors:Record<string,string>={title_required:"イベント名を入力してください。",name_required:"名前を入力してください。",invalid_status:"出欠を選んでください。",invalid_response:"入力内容を確認してください。",name_already_used:"同じ名前の回答があります。",response_limit:"回答上限に達しました。",shared_item_not_found:"出欠確認が見つかりません。"};
const request=async(url:string,init?:RequestInit)=>{const r=await fetch(url,{...init,headers:{"content-type":"application/json",...(init?.headers??{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(errors[j?.error]??"処理に失敗しました。");return j};
const setError=(el:HTMLElement,msg="")=>{el.textContent=msg;el.hidden=!msg};
try{const k="utility-tools:recent",item={id:"attendance-check",href:"/attendance/",name:"出欠確認",category:"share"};const a=JSON.parse(localStorage.getItem(k)??"[]");localStorage.setItem(k,JSON.stringify([item,...(Array.isArray(a)?a.filter((x:any)=>x?.id!==item.id):[])].slice(0,6)))}catch{}
function saved(){try{return JSON.parse(localStorage.getItem(responseKey(id))??"null")}catch{return null}}
function initCreate(){
  loading.hidden=true;createView.hidden=false;
  const form=qs<HTMLFormElement>("[data-create-form]")!,button=qs<HTMLButtonElement>("[data-create-button]")!,error=qs<HTMLElement>("[data-create-error]")!;
  form.addEventListener("submit",async e=>{e.preventDefault();setError(error);const fd=new FormData(form);button.disabled=true;button.textContent="作成中...";try{const r=await request("/api/attendance",{method:"POST",body:JSON.stringify({title:String(fd.get("title")??""),eventDate:String(fd.get("eventDate")??""),place:String(fd.get("place")??""),description:String(fd.get("description")??"")})});localStorage.setItem(adminKey(r.id),r.adminToken);location.assign("/attendance/?id="+encodeURIComponent(r.id)+"&created=1")}catch(err){setError(error,err instanceof Error?err.message:"作成に失敗しました。");button.disabled=false;button.textContent="出欠確認を作成"}});
}
function render(){
  if(!current)return;
  qs<HTMLElement>("[data-title]")!.textContent=current.title;
  const desc=qs<HTMLElement>("[data-description]")!;desc.textContent=current.description;desc.hidden=!current.description;
  const date=qs<HTMLElement>("[data-date]")!;date.textContent=current.eventDate;date.hidden=!current.eventDate;
  const place=qs<HTMLElement>("[data-place]")!;place.textContent=current.place;place.hidden=!current.place;
  qs<HTMLElement>("[data-expiry]")!.textContent="保存期限: "+new Date(current.expiresAt).toLocaleDateString("ja-JP");
  qs<HTMLElement>("[data-count-yes]")!.textContent=String(current.counts.yes);
  qs<HTMLElement>("[data-count-maybe]")!.textContent=String(current.counts.maybe);
  qs<HTMLElement>("[data-count-no]")!.textContent=String(current.counts.no);
  qs<HTMLInputElement>("[data-share-url]")!.value=location.origin+"/attendance/?id="+encodeURIComponent(current.id);
  qs<HTMLElement>("[data-created]")!.hidden=params.get("created")!=="1";
  qs<HTMLButtonElement>("[data-delete]")!.hidden=!localStorage.getItem(adminKey(current.id));

  const s=saved(),mine=s?current.responses.find(x=>x.id===s.responseId):undefined;
  const name=qs<HTMLInputElement>("[data-name]")!,comment=qs<HTMLTextAreaElement>("[data-comment]")!,submit=qs<HTMLButtonElement>("[data-response-submit]")!,del=qs<HTMLButtonElement>("[data-response-delete]")!;
  name.value=mine?.name??"";comment.value=mine?.comment??"";document.querySelectorAll<HTMLInputElement>('input[name="attendance-status"]').forEach(el=>el.checked=mine?.status===el.value);
  qs<HTMLElement>("[data-response-heading]")!.textContent=mine?"自分の回答を編集":"回答する";submit.textContent=mine?"回答を更新":"回答を送信";del.hidden=!mine;
  const list=qs<HTMLElement>("[data-list]")!;list.replaceChildren();qs<HTMLElement>("[data-empty]")!.hidden=current.responses.length>0;
  const labels={yes:"○ 参加",maybe:"△ 未定",no:"× 不参加"};
  for(const r of current.responses){const row=document.createElement("div");row.className="attendance-person";const head=document.createElement("div");head.className="attendance-person-head";const n=document.createElement("strong");n.textContent=r.name;const st=document.createElement("span");st.className=r.status;st.textContent=labels[r.status];head.append(n,st);row.append(head);if(r.comment){const p=document.createElement("p");p.textContent=r.comment;row.append(p)}list.append(row)}
}
async function reload(){current=await request("/api/attendance/"+id);render()}
function wire(){
  const form=qs<HTMLFormElement>("[data-response-form]")!,error=qs<HTMLElement>("[data-response-error]")!,submit=qs<HTMLButtonElement>("[data-response-submit]")!;
  form.addEventListener("submit",async e=>{e.preventDefault();setError(error);if(!current)return;const status=document.querySelector<HTMLInputElement>('input[name="attendance-status"]:checked')?.value as AttendanceStatus|undefined;if(!status){setError(error,"参加・未定・不参加を選んでください。");return}const body={name:qs<HTMLInputElement>("[data-name]")!.value,comment:qs<HTMLTextAreaElement>("[data-comment]")!.value,status};const s=saved(),mine=s?current.responses.find(x=>x.id===s.responseId):undefined;submit.disabled=true;try{if(s&&mine){await request("/api/attendance/"+id+"/responses/"+s.responseId,{method:"PUT",headers:{authorization:"Bearer "+s.editToken},body:JSON.stringify(body)})}else{const r=await request("/api/attendance/"+id+"/responses",{method:"POST",body:JSON.stringify(body)});localStorage.setItem(responseKey(id),JSON.stringify({responseId:r.responseId,editToken:r.editToken}))}await reload()}catch(err){setError(error,err instanceof Error?err.message:"回答に失敗しました。")}finally{submit.disabled=false}});
  qs<HTMLButtonElement>("[data-response-delete]")!.addEventListener("click",async()=>{const s=saved();if(!s||!confirm("自分の回答を削除しますか？"))return;await request("/api/attendance/"+id+"/responses/"+s.responseId,{method:"DELETE",headers:{authorization:"Bearer "+s.editToken}});localStorage.removeItem(responseKey(id));await reload()});
  qs<HTMLButtonElement>("[data-copy]")!.addEventListener("click",async()=>{const input=qs<HTMLInputElement>("[data-share-url]")!,m=qs<HTMLElement>("[data-copy-message]")!;try{await navigator.clipboard.writeText(input.value);m.textContent="コピーしました。"}catch{input.select();m.textContent="URLを選択しました。コピーしてください。"}m.hidden=false;setTimeout(()=>m.hidden=true,1500)});
  qs<HTMLButtonElement>("[data-delete]")!.addEventListener("click",async()=>{const token=localStorage.getItem(adminKey(id));if(!token||!confirm("この出欠確認を削除しますか？"))return;await request("/api/attendance/"+id,{method:"DELETE",headers:{authorization:"Bearer "+token}});localStorage.removeItem(adminKey(id));localStorage.removeItem(responseKey(id));location.assign("/attendance/")});
}
if(id){wire();reload().then(()=>{loading.hidden=true;eventView.hidden=false}).catch(()=>{loading.hidden=true;notFound.hidden=false})}else initCreate();
