export {};
type Expense={id:string;payer:string;amount:number;memo:string;members:string[];createdAt:number;updatedAt:number};
type Settlement={from:string;to:string;amount:number};
type SplitData={id:string;type:"split";title:string;description:string;createdAt:number;expiresAt:number;participants:string[];expenses:Expense[];total:number;balances:Record<string,number>;settlements:Settlement[];expenseCount:number};
type SavedExpense={expenseId:string;editToken:string};
const qs=<T extends Element>(s:string)=>document.querySelector<T>(s);
const loading=qs<HTMLElement>("[data-loading]")!,createView=qs<HTMLElement>("[data-create]")!,eventView=qs<HTMLElement>("[data-event]")!,notFound=qs<HTMLElement>("[data-not-found]")!;
const params=new URLSearchParams(location.search),id=params.get("id")?.trim()??"";
const toolPath=location.pathname.startsWith("/travel-expense")?"/travel-expense/":"/split-bill/";
const createButtonLabel=toolPath==="/travel-expense/"?"旅行精算を作成":"割り勘を作成";
const recentItem=toolPath==="/travel-expense/"?{id:"travel-expense-share",href:toolPath,name:"旅行費用分担",category:"share"}:{id:"shared-split-bill",href:toolPath,name:"割り勘・立替精算",category:"share"};
let current:SplitData|null=null;
let editingId="";
const expenseKey=(id:string)=>"utility-tools:split:expenses:"+id,adminKey=(id:string)=>"utility-tools:split:admin:"+id;
const errors:Record<string,string>={title_required:"グループ名を入力してください。",at_least_two_participants:"参加者を2人以上入力してください。",invalid_payer:"支払った人を選択してください。",invalid_amount:"金額を正しく入力してください。",members_required:"負担する人を1人以上選択してください。",expense_limit:"支払いの登録上限に達しました。",expense_not_found:"支払いが見つかりません。",shared_item_not_found:"割り勘データが見つかりません。"};
const request=async(url:string,init?:RequestInit)=>{const r=await fetch(url,{...init,headers:{"content-type":"application/json",...(init?.headers??{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(errors[j?.error]??"処理に失敗しました。");return j};
const setError=(el:HTMLElement,msg="")=>{el.textContent=msg;el.hidden=!msg};
const money=(n:number)=>Math.round(n).toLocaleString("ja-JP")+"円";
try{const k="utility-tools:recent",item=recentItem;const a=JSON.parse(localStorage.getItem(k)??"[]");localStorage.setItem(k,JSON.stringify([item,...(Array.isArray(a)?a.filter((x:any)=>x?.id!==item.id):[])].slice(0,6)))}catch{}
function savedExpenses():SavedExpense[]{try{const v=JSON.parse(localStorage.getItem(expenseKey(id))??"[]");return Array.isArray(v)?v:[]}catch{return[]}}
function saveExpenseToken(item:SavedExpense){const arr=savedExpenses().filter(x=>x.expenseId!==item.expenseId);arr.push(item);localStorage.setItem(expenseKey(id),JSON.stringify(arr))}
function removeExpenseToken(expenseId:string){localStorage.setItem(expenseKey(id),JSON.stringify(savedExpenses().filter(x=>x.expenseId!==expenseId)))}
function tokenFor(expenseId:string){return savedExpenses().find(x=>x.expenseId===expenseId)}
function initCreate(){
  loading.hidden=true;createView.hidden=false;
  const form=qs<HTMLFormElement>("[data-create-form]")!,button=qs<HTMLButtonElement>("[data-create-button]")!,error=qs<HTMLElement>("[data-create-error]")!;
  form.addEventListener("submit",async e=>{e.preventDefault();setError(error);const fd=new FormData(form);const participants=[...new Set(String(fd.get("participants")??"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean))];if(participants.length<2){setError(error,"参加者は2人以上必要です。");return}if(participants.length>20){setError(error,"参加者は20人以内にしてください。");return}button.disabled=true;button.textContent="作成中...";try{const r=await request("/api/split-bills",{method:"POST",body:JSON.stringify({title:String(fd.get("title")??""),description:String(fd.get("description")??""),participants})});localStorage.setItem(adminKey(r.id),r.adminToken);location.assign(toolPath+"?id="+encodeURIComponent(r.id)+"&created=1")}catch(err){setError(error,err instanceof Error?err.message:"作成に失敗しました。");button.disabled=false;button.textContent=createButtonLabel}});
}
function setupForm(expense?:Expense){
  if(!current)return;
  const payer=qs<HTMLSelectElement>("[data-payer]")!,members=qs<HTMLElement>("[data-members]")!;
  payer.replaceChildren();for(const name of current.participants){const o=document.createElement("option");o.value=name;o.textContent=name;payer.append(o)}
  members.replaceChildren();for(const name of current.participants){const l=document.createElement("label");l.className="member-check";const input=document.createElement("input");input.type="checkbox";input.value=name;input.checked=expense?expense.members.includes(name):true;const span=document.createElement("span");span.textContent=name;l.append(input,span);members.append(l)}
  payer.value=expense?.payer??current.participants[0]??"";
  qs<HTMLInputElement>("[data-amount]")!.value=expense?String(expense.amount):"";
  qs<HTMLInputElement>("[data-memo]")!.value=expense?.memo??"";
  editingId=expense?.id??"";
  qs<HTMLElement>("[data-expense-heading]")!.textContent=expense?"支払いを編集":"支払いを追加";
  qs<HTMLButtonElement>("[data-expense-submit]")!.textContent=expense?"支払いを更新":"支払いを追加";
  qs<HTMLButtonElement>("[data-expense-delete]")!.hidden=!expense;
  qs<HTMLButtonElement>("[data-cancel-edit]")!.hidden=!expense;
}
function render(){
  if(!current)return;
  qs<HTMLElement>("[data-title]")!.textContent=current.title;
  const desc=qs<HTMLElement>("[data-description]")!;desc.textContent=current.description;desc.hidden=!current.description;
  qs<HTMLElement>("[data-total]")!.textContent="合計 "+money(current.total);
  qs<HTMLElement>("[data-expiry]")!.textContent="保存期限: "+new Date(current.expiresAt).toLocaleDateString("ja-JP");
  qs<HTMLInputElement>("[data-share-url]")!.value=location.origin+toolPath+"?id="+encodeURIComponent(current.id);
  qs<HTMLElement>("[data-created]")!.hidden=params.get("created")!=="1";
  qs<HTMLButtonElement>("[data-delete]")!.hidden=!localStorage.getItem(adminKey(current.id));

  const settlement=qs<HTMLElement>("[data-settlements]")!;settlement.replaceChildren();qs<HTMLElement>("[data-settlement-empty]")!.hidden=current.settlements.length>0;
  for(const s of current.settlements){const row=document.createElement("div");row.className="settlement-row";const strong=document.createElement("strong");strong.textContent=s.from+" → "+s.to;const amount=document.createElement("span");amount.textContent=money(s.amount);row.append(strong,amount);settlement.append(row)}
  const balances=qs<HTMLElement>("[data-balances]")!;balances.replaceChildren();for(const name of current.participants){const v=current.balances[name]??0;const row=document.createElement("div");row.className="balance-row";const n=document.createElement("span");n.textContent=name;const b=document.createElement("strong");b.className=v>0?"positive":v<0?"negative":"zero";b.textContent=v>0?"+"+money(v):money(v);row.append(n,b);balances.append(row)}
  qs<HTMLElement>("[data-expense-count]")!.textContent=String(current.expenseCount);
  const list=qs<HTMLElement>("[data-expenses]")!;list.replaceChildren();qs<HTMLElement>("[data-expense-empty]")!.hidden=current.expenses.length>0;
  for(const e of [...current.expenses].reverse()){const row=document.createElement("div");row.className="expense-item";const main=document.createElement("div");main.className="expense-item-main";const head=document.createElement("div");head.className="expense-item-head";const payer=document.createElement("strong");payer.textContent=e.payer+"が支払い";const amount=document.createElement("b");amount.textContent=money(e.amount);head.append(payer,amount);main.append(head);const p=document.createElement("p");p.textContent=(e.memo?e.memo+" / ":"")+"負担: "+e.members.join("・");main.append(p);row.append(main);if(tokenFor(e.id)){const edit=document.createElement("button");edit.className="expense-edit";edit.type="button";edit.textContent="編集";edit.addEventListener("click",()=>setupForm(e));row.append(edit)}list.append(row)}
  if(editingId){const still=current.expenses.find(e=>e.id===editingId);if(still)setupForm(still);else setupForm()}else setupForm();
}
async function reload(){current=await request("/api/split-bills/"+id);render()}
function wire(){
  const form=qs<HTMLFormElement>("[data-expense-form]")!,error=qs<HTMLElement>("[data-expense-error]")!,submit=qs<HTMLButtonElement>("[data-expense-submit]")!;
  form.addEventListener("submit",async e=>{e.preventDefault();setError(error);if(!current)return;const members=[...document.querySelectorAll<HTMLInputElement>("[data-members] input:checked")].map(x=>x.value);const body={payer:qs<HTMLSelectElement>("[data-payer]")!.value,amount:Number(qs<HTMLInputElement>("[data-amount]")!.value),memo:qs<HTMLInputElement>("[data-memo]")!.value,members};submit.disabled=true;try{if(editingId){const s=tokenFor(editingId);if(!s)throw new Error("この支払いを編集する権限がありません。");await request("/api/split-bills/"+id+"/expenses/"+editingId,{method:"PUT",headers:{authorization:"Bearer "+s.editToken},body:JSON.stringify(body)});editingId=""}else{const r=await request("/api/split-bills/"+id+"/expenses",{method:"POST",body:JSON.stringify(body)});saveExpenseToken({expenseId:r.expenseId,editToken:r.editToken})}await reload()}catch(err){setError(error,err instanceof Error?err.message:"保存に失敗しました。")}finally{submit.disabled=false}});
  qs<HTMLButtonElement>("[data-all-members]")!.addEventListener("click",()=>document.querySelectorAll<HTMLInputElement>("[data-members] input").forEach(x=>x.checked=true));
  qs<HTMLButtonElement>("[data-cancel-edit]")!.addEventListener("click",()=>{editingId="";setupForm()});
  qs<HTMLButtonElement>("[data-expense-delete]")!.addEventListener("click",async()=>{if(!editingId||!confirm("この支払いを削除しますか？"))return;const s=tokenFor(editingId);if(!s)return;await request("/api/split-bills/"+id+"/expenses/"+editingId,{method:"DELETE",headers:{authorization:"Bearer "+s.editToken}});removeExpenseToken(editingId);editingId="";await reload()});
  qs<HTMLButtonElement>("[data-copy]")!.addEventListener("click",async()=>{const input=qs<HTMLInputElement>("[data-share-url]")!,m=qs<HTMLElement>("[data-copy-message]")!;try{await navigator.clipboard.writeText(input.value);m.textContent="コピーしました。"}catch{input.select();m.textContent="URLを選択しました。コピーしてください。"}m.hidden=false;setTimeout(()=>m.hidden=true,1500)});
  qs<HTMLButtonElement>("[data-delete]")!.addEventListener("click",async()=>{const token=localStorage.getItem(adminKey(id));if(!token||!confirm("この割り勘データを削除しますか？"))return;await request("/api/split-bills/"+id,{method:"DELETE",headers:{authorization:"Bearer "+token}});localStorage.removeItem(adminKey(id));localStorage.removeItem(expenseKey(id));location.assign(toolPath)});
}
if(id){wire();reload().then(()=>{loading.hidden=true;eventView.hidden=false}).catch(()=>{loading.hidden=true;notFound.hidden=false})}else initCreate();
