/**
 * WRS Dojo - Backend API v4.0 (Full State Sync)
 * 
 * 1. Open your Google Sheet.
 * 2. Extensions > Apps Script.
 * 3. Delete ALL existing code and paste this.
 * 4. Click 'Deploy' > 'New Deployment'.
 * 5. Select 'Web App'.
 * 6. Execute as: 'Me'.
 * 7. Who has access: 'Anyone'. (Note: The app sends data via POST/GET)
 * 8. Click 'Deploy' and copy the NEW URL.
 */

function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'ping') {
    return ContentService.createTextOutput("ready").setMimeType(ContentService.MimeType.TEXT);
  }
  
  if (action === 'loadState') {
    var sheet = ss.getSheetByName("dojo_state");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({error: "No state found"})).setMimeType(ContentService.MimeType.JSON);
    }
    var data = sheet.getRange(1, 1).getValue();
    return ContentService.createTextOutput(data).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput("WRS Dojo API v4.0 Active").setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    
    // --- ACTION: LOG ENTRIES (Single Mission Reports) ---
    if (payload.action === 'logEntries') {
      var sheet = ss.getSheetByName("progress_log") || ss.insertSheet("progress_log");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["Timestamp", "Squad", "Ninja", "Mission Step", "Accuracy Score", "Notes/Errors"]);
        sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#f3f3f3");
        sheet.setFrozenRows(1);
      }
      var records = payload.records || [];
      var now = new Date();
      records.forEach(function(r) {
        sheet.appendRow([now, r.group, r.student, r.activity, r.score, r.notes]);
      });
      return ContentService.createTextOutput("Success: Logged").setMimeType(ContentService.MimeType.TEXT);
    }
    
    // --- ACTION: SAVE STATE (Global Sync) ---
    if (payload.action === 'saveState') {
      var sheet = ss.getSheetByName("dojo_state") || ss.insertSheet("dojo_state");
      sheet.clear();
      sheet.getRange(1, 1).setValue(JSON.stringify(payload.data));
      return ContentService.createTextOutput("Success: State Saved").setMimeType(ContentService.MimeType.TEXT);
    }

  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}