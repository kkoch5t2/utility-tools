export const qs=<T extends Element>(selector:string)=>document.querySelector<T>(selector);
export async function request(url:string,init?:RequestInit,errors:Record<string,string>={}){
  const response=await fetch(url,{...init,headers:{"content-type":"application/json",...(init?.headers??{})}});
  const body=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(errors[body?.error]??"処理に失敗しました。");
  return body;
}
export function setError(element:HTMLElement|null,message=""){if(!element)return;element.textContent=message;element.hidden=!message}
export function loadJson<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem(key)??JSON.stringify(fallback)) as T}catch{return fallback}}
export function saveJson(key:string,value:unknown){localStorage.setItem(key,JSON.stringify(value))}
export function touchRecent(item:{id:string;href:string;name:string;category:string}){try{const key="utility-tools:recent";const items=loadJson<any[]>(key,[]);saveJson(key,[item,...items.filter((x)=>x?.id!==item.id)].slice(0,6))}catch{}}
export async function copyShare(input:HTMLInputElement,message:HTMLElement){try{await navigator.clipboard.writeText(input.value);message.textContent="コピーしました。"}catch{input.select();message.textContent="URLを選択しました。コピーしてください。"}message.hidden=false;setTimeout(()=>message.hidden=true,1500)}
