import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarize,csvCell,reportCsv} from './dist/reports.js';
test('deleted applications are excluded from report totals and CSV',()=>{const rows=[{id:'removed',participantName:'Removed',status:'deleted',checkedIn:true},{id:'active',participantName:'Active',status:'approved'}];assert.equal(summarize(rows).total,1);assert.equal(summarize(rows).checkedIn,0);assert.ok(!reportCsv(rows).includes('Removed'));assert.ok(reportCsv(rows).includes('Active'))});
test('report counts statuses and check-in independently',()=>assert.deepEqual(summarize([{status:'pending'},{status:'approved',checkedIn:true},{status:'approved'},{status:'rejected'},{status:'cancelled'}]),{total:5,pending:1,approved:2,rejected:1,cancelled:1,checkedIn:1}));
test('spreadsheet formulas cannot execute through names',()=>{for(const value of ['=HYPERLINK("https://example.com")','+SUM(1,2)','-1','@name','  =1','\tcmd'])assert.ok(csvCell(value).startsWith('"\''))});
test('CSV preserves Thai, quotes and embedded line breaks',()=>{const csv=reportCsv([{id:'test',participantName:'เด็ก "ก"\nทดสอบ',status:'pending',checkedIn:false}]);assert.ok(csv.startsWith('\ufeff'));assert.ok(csv.includes('เด็ก ""ก""\nทดสอบ'));assert.ok(csv.includes('รอพิจารณา'))});
