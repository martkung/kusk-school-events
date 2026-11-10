export function mountLinePilotLink(area,client){
 let disposed=false;
 const uid=client.auth.currentUser?.uid;
 client.linePilot({action:'status'}).then(state=>{if(disposed||!area.isConnected||client.auth.currentUser?.uid!==uid||!state.enabled||!state.eligible)return;const a=document.createElement('a');a.href='./line-pilot.html?mode=manage';a.textContent='จัดการการเชื่อมบัญชี LINE';a.className='secondary';area.append(a)}).catch(()=>{});
 return ()=>{disposed=true};
}
