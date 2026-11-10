const parent='projects/kusk-register/databases/(default)/backupSchedules';
exports.backupSchedulePlan=schedules=>{
 const operations=[];if(schedules.filter(s=>Object.hasOwn(s,'dailyRecurrence')).length>1)throw Error('Unexpected duplicate daily schedules');
 for(const schedule of schedules)if(typeof schedule.name!=='string'||!schedule.name.startsWith(parent+'/')||!/^[\w-]+$/.test(schedule.name.slice(parent.length+1)))throw Error('Schedule outside the intended database');
 const daily=schedules.find(s=>Object.hasOwn(s,'dailyRecurrence'));
 if(!daily)operations.push({method:'POST',name:parent,body:{retention:'604800s',dailyRecurrence:{}}});
 else if(daily.retention!=='604800s')operations.push({method:'PATCH',name:daily.name,body:{name:daily.name,retention:'604800s'}});
 for(const weekly of schedules.filter(s=>Object.hasOwn(s,'weeklyRecurrence')))operations.push({method:'DELETE',name:weekly.name});
 return operations;
};
