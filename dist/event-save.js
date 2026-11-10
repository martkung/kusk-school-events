export async function saveEventDetails(client,eventId,event,state){
 if(state.created){await client.operate({action:'editEvent',eventId,event});return}
 try{await client.operate({action:'createEvent',eventId,event});state.created=true}catch(error){if(error.code!=='functions/already-exists')throw error;state.created=true;await client.operate({action:'editEvent',eventId,event})}
}
