import {watchOwnedApplications} from './application-listener.js';
import {normalizePhone} from './phone.js';
import {watchEventSignal} from './event-signal.js';
import {watchCatalog} from './catalog-state.js';
// Production adapter: loaded on demand; the demo never writes to Firebase.
export const firebaseConfig = Object.freeze({
  apiKey: 'AIzaSyAkSIiL859bdUL1EBshmDYvjo0Rj1VAg4Q',
  authDomain: 'kusk-register.firebaseapp.com',
  databaseURL: 'https://kusk-register-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'kusk-register',
  storageBucket: 'kusk-register.firebasestorage.app',
  messagingSenderId: '364604187830',
  appId: '1:364604187830:web:a7b8709bc40c1e5286b217'
});
let connection;
export function connectFirebase() {
  if (!connection) connection = initialize().catch(error => { connection = null; throw error; });
  return connection;
}
async function initialize() {
  const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const [appSDK, authSDK, dbSDK, functionsSDK,storageSDK] = await Promise.all([
    import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js'), import(base + 'firebase-functions.js'),import(base+'firebase-storage.js')
  ]);
  const app = appSDK.getApps().find(app => app.name === 'school-events') || appSDK.initializeApp(firebaseConfig, 'school-events');
  const auth = authSDK.getAuth(app), db = dbSDK.getFirestore(app);
  return {
    auth,
    watchBanners(onData,onError,{admin=false}={}){
      const ref=dbSDK.collection(db,'schoolEventBanners');
      const source=admin?ref:dbSDK.query(ref,dbSDK.where('published','==',true));
      let disposed=false;const stop=dbSDK.onSnapshot(source,snapshot=>{if(!disposed)onData(snapshot.docs.map(doc=>({...doc.data(),id:doc.id})))},error=>{if(!disposed)onError?.(error)});
      return ()=>{disposed=true;stop()};
    },
    async uploadBannerImage(bannerId,blob){
      if(!auth.currentUser)throw new Error('กรุณาเข้าสู่ระบบ');
      const ref=storageSDK.ref(storageSDK.getStorage(app),`schoolEventBanners/${bannerId}/${crypto.randomUUID()}.jpg`);
      await storageSDK.uploadBytes(ref,blob,{contentType:'image/jpeg',cacheControl:'public,max-age=86400'});
      return storageSDK.getDownloadURL(ref);
    },
    async uploadPoster(eventId,blob){
      if(!auth.currentUser)throw new Error('กรุณาเข้าสู่ระบบ');
      const ref=storageSDK.ref(storageSDK.getStorage(app),`schoolEventPosters/${eventId}/${crypto.randomUUID()}.jpg`);
      await storageSDK.uploadBytes(ref,blob,{contentType:'image/jpeg',cacheControl:'public,max-age=86400'});
      const posterUrl=await storageSDK.getDownloadURL(ref);
      await functionsSDK.httpsCallable(functionsSDK.getFunctions(app,'asia-southeast1'),'schoolEventOperate')({action:'setPoster',eventId,posterUrl});
      return posterUrl;
    },
    observeAccount: listener => authSDK.onAuthStateChanged(auth, listener),
    watchEvents: (onData,onError) => watchCatalog({sdk:dbSDK,db},onData,onError),
    watchAdminEvents(onData,onError){let disposed=false;const stop=dbSDK.onSnapshot(dbSDK.collection(db,'schoolEventCatalog'),{includeMetadataChanges:true},snapshot=>{if(!disposed)onData(snapshot.docs.map(doc=>({...doc.data(),id:doc.id})),{fromCache:snapshot.metadata.fromCache})},error=>{if(!disposed)onError?.(error)});return ()=>{disposed=true;stop()};},
    async loadAdminEvents(){const snapshot=await dbSDK.getDocs(dbSDK.collection(db,'schoolEventCatalog'));return snapshot.docs.map(doc=>({...doc.data(),id:doc.id})).filter(event=>event.deleted!==true)},
    watchMyApplications: (onData,onError) => watchOwnedApplications({sdk:dbSDK,db,auth},onData,onError),
    watchEventChanges: (eventId,onData,onError) => watchEventSignal({sdk:dbSDK,db,auth},eventId,onData,onError),
    signInGoogle: () => authSDK.signInWithPopup(auth, new authSDK.GoogleAuthProvider()),
    signInGoogleCredential: credential => authSDK.signInWithCredential(auth, authSDK.GoogleAuthProvider.credential(credential)),
    signOut: () => authSDK.signOut(auth),
    async linePilot(data){return (await functionsSDK.httpsCallable(functionsSDK.getFunctions(app,'asia-southeast1'),'schoolEventLinePilot')(data)).data},
    signInLine: token=>authSDK.signInWithCustomToken(auth,token),
    async staffContext(){
      if(!auth.currentUser)throw new Error('กรุณาเข้าสู่ระบบ');
      const token=await auth.currentUser.getIdTokenResult(true);
      const line=token.claims.line_login===true||token.claims.firebase?.sign_in_provider==='custom';
      if(line&&!(token.claims.line_login===true&&token.claims.line_admin===true&&token.claims.admin===true&&token.claims.firebase?.sign_in_provider==='custom'))return {admin:false,events:[]};
      const snapshot=await dbSDK.getDocs(dbSDK.collection(db,'schoolEventStaff',auth.currentUser.uid,'events'));
      const delegate=await dbSDK.getDoc(dbSDK.doc(db,'schoolEventDelegates',auth.currentUser.uid));const systemPermissions=delegate.data()?.active===true?delegate.data().permissions||[]:[];
      return {admin:token.claims.admin===true,systemPermissions,events:snapshot.docs.map(d=>({...d.data(),id:d.id})).filter(d=>d.active)};
    },
    async operate(data){
      return (await functionsSDK.httpsCallable(functionsSDK.getFunctions(app,'asia-southeast1'),'schoolEventOperate')(data)).data;
    },
    async signCheckin(data){return (await functionsSDK.httpsCallable(functionsSDK.getFunctions(app,'asia-southeast1'),'schoolEventSignature',{timeout:90000})(data)).data},
    async purgeEvent(data){return (await functionsSDK.httpsCallable(functionsSDK.getFunctions(app,'asia-southeast1'),'schoolEventPurge',{timeout:330000})(data)).data},
    async loadAudit(eventId,after){
      if(!auth.currentUser)throw new Error('กรุณาเข้าสู่ระบบ');
      const constraints=[dbSDK.where('eventId','==',eventId),dbSDK.orderBy(dbSDK.documentId()),dbSDK.limit(50)];
      if(after)constraints.push(dbSDK.startAfter(after));
      const snapshot=await dbSDK.getDocs(dbSDK.query(dbSDK.collection(db,'schoolEventAudit'),...constraints));
      return {items:snapshot.docs.map(d=>({...d.data(),id:d.id})),next:snapshot.size===50?snapshot.docs.at(-1).id:null};
    },
    async loadEvents() {
      const q=dbSDK.query(dbSDK.collection(db,'schoolEventCatalog'),dbSDK.where('published','==',true));
      const snapshot=await dbSDK.getDocs(q);
      return snapshot.docs.map(doc=>({...doc.data(),id:doc.id}));
    },
    async enroll(eventId,displayName,phone) {
      if(!auth.currentUser)throw new Error('กรุณาเข้าสู่ระบบ');
      return (await functionsSDK.httpsCallable(functionsSDK.getFunctions(app,'asia-southeast1'),'schoolEventEnroll')({eventId,displayName,phone:normalizePhone(phone)})).data;
    },
    async loadProfile(){
      if(!auth.currentUser)throw new Error('กรุณาเข้าสู่ระบบ');
      const snapshot=await dbSDK.getDoc(dbSDK.doc(db,'schoolEventProfiles',auth.currentUser.uid));
      return snapshot.exists()?snapshot.data():{displayName:auth.currentUser.displayName||''};
    },
    async saveProfile(displayName,phone){
      if(!auth.currentUser)throw new Error('กรุณาเข้าสู่ระบบ');
      if(typeof displayName!=='string'||!displayName.trim()||displayName.trim().length>120)throw new Error('กรุณาระบุชื่อไม่เกิน 120 ตัวอักษร');
      await dbSDK.setDoc(dbSDK.doc(db,'schoolEventProfiles',auth.currentUser.uid),{displayName:displayName.trim(),phone:normalizePhone(phone),updatedAt:dbSDK.serverTimestamp()});
    },
    async loadParticipants() {
      if (!auth.currentUser) throw new Error('กรุณาเข้าสู่ระบบ');
      const snapshot = await dbSDK.getDocs(dbSDK.collection(db, 'schoolEventAccounts', auth.currentUser.uid, 'participants'));
      return snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));
    },
    async addParticipant({displayName, relationship}) {
      if (!auth.currentUser) throw new Error('กรุณาเข้าสู่ระบบ');
      if (typeof displayName !== 'string' || !displayName.trim() || displayName.trim().length > 120) throw new Error('กรุณาระบุชื่อผู้เข้าร่วม');
      if (!['self', 'child'].includes(relationship)) throw new Error('ความสัมพันธ์ไม่ถูกต้อง');
      const ref = await dbSDK.addDoc(dbSDK.collection(db, 'schoolEventAccounts', auth.currentUser.uid, 'participants'), {
        displayName: displayName.trim(), relationship, createdAt: dbSDK.serverTimestamp()
      });
      return ref.id;
    },
    async loadMyApplications() {
      if (!auth.currentUser) throw new Error('กรุณาเข้าสู่ระบบ');
      const q = dbSDK.query(dbSDK.collection(db, 'schoolEventApplications'), dbSDK.where('ownerUid', '==', auth.currentUser.uid));
      const snapshot = await dbSDK.getDocs(q);
      return snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));
    }
  };
}
