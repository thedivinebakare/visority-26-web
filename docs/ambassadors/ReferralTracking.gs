// Bind this script to a PRIVATE Google spreadsheet. Run setupReferralSheets once.
// Add REFERRAL_SHARED_SECRET in Project Settings > Script Properties.
function setupReferralSheets(){
  const spreadsheet=SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('REFERRAL_SPREADSHEET_ID',spreadsheet.getId());
  const headers={Ambassadors:['Code','Name','OwnerEmail','Status','ShareLink','Registrations','PremiumPurchases'],ReferralEvents:['EventKey','Code','Kind','ParticipantHash','RecordedAt']};
  Object.keys(headers).forEach(name=>{let sheet=spreadsheet.getSheetByName(name);if(!sheet)sheet=spreadsheet.insertSheet(name);if(sheet.getLastRow()===0)sheet.appendRow(headers[name]);sheet.setFrozenRows(1);});
}
function referralJSON(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
function referralHash(value){const key=PropertiesService.getScriptProperties().getProperty('REFERRAL_SHARED_SECRET');return Utilities.computeHmacSha256Signature(value.toLowerCase().trim(),key).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');}
function doPost(e){
  let input;try{input=JSON.parse(e.postData.contents);}catch(err){return referralJSON({ok:false});}
  const properties=PropertiesService.getScriptProperties(),secret=properties.getProperty('REFERRAL_SHARED_SECRET');
  if(!secret||input.secret!==secret)return referralJSON({ok:false});
  if(!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(input.code||'')||['ambassador','test','preview'].includes(input.code))return referralJSON({ok:true,active:false,ignored:true});
  const lock=LockService.getScriptLock();if(!lock.tryLock(3000))return referralJSON({ok:false});
  try{
    const book=SpreadsheetApp.openById(properties.getProperty('REFERRAL_SPREADSHEET_ID'));
    const registry=book.getSheetByName('Ambassadors'),events=book.getSheetByName('ReferralEvents');
    const rows=registry.getDataRange().getValues();const matches=rows.map((r,i)=>({r,i})).filter(x=>String(x.r[0])===input.code&&x.i>0);
    if(matches.length!==1||String(matches[0].r[3]).toLowerCase()!=='active')return referralJSON({ok:true,active:false,ignored:true});
    const owner=matches[0];if(input.action==='resolve')return referralJSON({ok:true,active:true});
    if(input.action!=='record'||!['registration','premium'].includes(input.kind)||typeof input.email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))return referralJSON({ok:false});
    if(input.test===true||input.email.toLowerCase().endsWith('.invalid')||input.email.toLowerCase().endsWith('.test')||referralHash(input.email)===referralHash(String(owner.r[2])))return referralJSON({ok:true,ignored:true});
    if(input.kind==='premium'&&(input.domain!=='live'||!/^viso26-[a-z0-9-]+$/i.test(input.reference||'')))return referralJSON({ok:true,ignored:true});
    const participant=referralHash(input.email),key=input.kind==='registration'?'registration:'+participant:'premium:'+input.reference;
    const values=events.getDataRange().getValues();const duplicate=values.some(row=>row[0]===key);
    if(!duplicate)events.appendRow([key,input.code,input.kind,participant,new Date().toISOString()]);
    // Recompute from the ledger, so retries never increment a counter twice.
    const all=events.getDataRange().getValues().slice(1);
    registry.getRange(owner.i+1,5,1,3).setValues([['https://www.visoritylive.com/?ref='+input.code,all.filter(r=>r[1]===input.code&&r[2]==='registration').length,all.filter(r=>r[1]===input.code&&r[2]==='premium').length]]);
    return referralJSON({ok:true,duplicate:duplicate});
  }catch(err){return referralJSON({ok:false});}finally{lock.releaseLock();}
}
