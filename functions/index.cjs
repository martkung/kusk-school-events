const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {getAuth}=require('firebase-admin/auth');
const {getStorage}=require('firebase-admin/storage');
const {enroll}=require('./enroll.cjs');
const {operate}=require('./operations.cjs');
const logger=require('firebase-functions/logger');
const {safeCall}=require('./safe-call.cjs');
initializeApp();
exports.schoolEventEnroll=onCall({region:'asia-southeast1',maxInstances:3,invoker:'public'},request=>safeCall('enroll',request,r=>enroll(r,{db:getFirestore(),HttpsError,FieldValue}),{logger,HttpsError}));
exports.schoolEventOperate=onCall({region:'asia-southeast1',maxInstances:3,invoker:'public'},request=>safeCall('operate',request,r=>operate(r,{db:getFirestore(),HttpsError,FieldValue,auth:getAuth()}),{logger,HttpsError}));
exports.schoolEventLinePilot=onCall({region:'asia-southeast1',maxInstances:3,invoker:'public'},request=>safeCall('line',request,r=>require('./line-pilot.cjs').linePilot(r,{db:getFirestore(),HttpsError,FieldValue,auth:getAuth()}),{logger,HttpsError}));
exports.schoolEventPurge=onCall({region:'asia-southeast1',maxInstances:1,concurrency:2,timeoutSeconds:300,invoker:'public'},request=>safeCall('purge',request,r=>require('./event-purge.cjs').purgeEvent(r,{db:getFirestore(),bucket:getStorage().bucket('kusk-register.firebasestorage.app'),HttpsError,FieldValue}),{logger,HttpsError}));

const signatureBucket=new (require('@google-cloud/storage').Storage)({retryOptions:{autoRetry:false,maxRetries:0,totalTimeout:30}}).bucket('kusk-register.firebasestorage.app');
exports.schoolEventSignature=onCall({region:'asia-southeast1',maxInstances:3,concurrency:8,timeoutSeconds:60,invoker:'public'},request=>safeCall('signature',request,r=>require('./signature.cjs').signature(r,{db:getFirestore(),bucket:signatureBucket,HttpsError,FieldValue}),{logger,HttpsError}));
