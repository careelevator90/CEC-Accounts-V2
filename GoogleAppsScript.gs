/**
 * =====================================================================
 * CARE ELEVATOR CENTRE - GOOGLE SHEETS DATABASE INTEGRATION SCRIPT
 * =====================================================================
 * 
 * Google Sheets Integration Script (Enhanced Version)
 * Real-time synchronization with Google Sheets database.
 * 
 * INSTRUCTIONS FOR SETTING UP YOUR DATABASE:
 * 
 * 1. Create a new Google Sheet:
 *    - Go to https://sheets.new and create a new spreadsheet.
 * 
 * 2. Rename and Setup Sheet Tabs:
 *    - Create two tabs inside the spreadsheet, naming them exactly:
 *      a) "Expenses"
 *      b) "Incomes"
 * 
 * 3. Setup Header Rows:
 *    - In the "Expenses" tab, enter these headers in row 1 (A1:J1):
 *      [ Date, Invoice, Category, SubCategory, LiftNo, Owner, Location, Description, Amount, Account ]
 * 
 *    - In the "Incomes" tab, enter these headers in row 1 (A1:J1):
 *      [ Date, Source, LiftNo, Owner, Location, TotalAmt, PaidAmt, DueAmt, Description, Account ]
 * 
 * 4. Open Apps Script Editor:
 *    - Inside Google Sheets, click: Extensions -> Apps Script
 * 
 * 5. Paste this Code:
 *    - Delete any default code in Code.gs, paste this entire script, and save.
 * 
 * 6. Deploy as Web App:
 *    - Click "Deploy" -> "New deployment"
 *    - Select type: "Web app"
 *    - Description: "Care Elevator DB API"
 *    - Execute as: "Me" (your-email@gmail.com)
 *    - Who has access: "Anyone"
 *    - Click "Deploy", and authorize all Google permissions if prompted.
 * 
 * 7. Copy Web App URL:
 *    - Copy the deployment "Web app URL" (ends with /exec).
 *    - Open the Care Elevator web app, paste the URL in Settings, and save.
 */

// Handle GET Requests - Retrieve all records from the Database
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const timeZone = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone();
    
    // Get and parse Expenses sheet
    const expenseSheet = ss.getSheetByName("Expenses");
    const expenses = [];
    if (expenseSheet) {
      const rows = expenseSheet.getDataRange().getValues();
      // Skip the header row (idx 0)
      for (let i = 1; i < rows.length; i++) {
        const originalRow = rows[i];
        const formattedValues = [];
        
        // Loop through each cell to ensure safe formats
        for (let j = 0; j < originalRow.length; j++) {
          let cellVal = originalRow[j];
          
          if (j === 0) { // Column A is Date
            if (cellVal instanceof Date) {
              // Convert JS Date object to yyyy-MM-dd cleanly to avoid UTC/timezone shifting
              cellVal = Utilities.formatDate(cellVal, timeZone, "yyyy-MM-dd");
            } else if (cellVal) {
              let strVal = cellVal.toString();
              if (strVal.indexOf("T") !== -1) {
                strVal = strVal.split("T")[0];
              }
              cellVal = strVal;
            } else {
              cellVal = "";
            }
          } else {
            // Ensure null or undefined cells are returned as empty string
            if (cellVal === null || cellVal === undefined) {
              cellVal = "";
            }
          }
          formattedValues.push(cellVal);
        }

        expenses.push({
          rowId: i + 1, // Store the spreadsheet row number (1-indexed row number)
          values: formattedValues
        });
      }
    }

    // Get and parse Incomes sheet
    const incomeSheet = ss.getSheetByName("Incomes");
    const incomes = [];
    if (incomeSheet) {
      const rows = incomeSheet.getDataRange().getValues();
      // Skip the header row (idx 0)
      for (let i = 1; i < rows.length; i++) {
        const originalRow = rows[i];
        const formattedValues = [];
        
        // Loop through each cell to ensure safe formats
        for (let j = 0; j < originalRow.length; j++) {
          let cellVal = originalRow[j];
          
          if (j === 0) { // Column A is Date
            if (cellVal instanceof Date) {
              // Convert JS Date object to yyyy-MM-dd cleanly to avoid UTC/timezone shifting
              cellVal = Utilities.formatDate(cellVal, timeZone, "yyyy-MM-dd");
            } else if (cellVal) {
              let strVal = cellVal.toString();
              if (strVal.indexOf("T") !== -1) {
                strVal = strVal.split("T")[0];
              }
              cellVal = strVal;
            } else {
              cellVal = "";
            }
          } else {
            if (cellVal === null || cellVal === undefined) {
              cellVal = "";
            }
          }
          formattedValues.push(cellVal);
        }

        incomes.push({
          rowId: i + 1, // Store the spreadsheet row number (1-indexed row number)
          values: formattedValues
        });
      }
    }

    const responseData = {
      expenses: expenses,
      incomes: incomes
    };

    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle POST Requests - Add, Edit, or Delete records in the Database
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;

    // 1. DELETE ACTION
    if (action === "deleteRow") {
      const sheetName = postData.sheetName; // "Expenses" or "Incomes"
      const rowId = parseInt(postData.rowId);
      const sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) throw new Error("Sheet '" + sheetName + "' not found.");
      if (rowId <= 1 || rowId > sheet.getLastRow()) throw new Error("Invalid Row ID for deletion.");
      
      sheet.deleteRow(rowId);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Row " + rowId + " deleted successfully." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. EXPENSE ACTIONS (Add / Edit)
    if (action === "addExpense") {
      const sheet = ss.getSheetByName("Expenses") || ss.insertSheet("Expenses");
      
      // Ensure headers if sheet is empty
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["Date", "Invoice", "Category", "SubCategory", "LiftNo", "Owner", "Location", "Description", "Amount", "Account"]);
      }

      sheet.appendRow([
        postData.date,
        postData.invoice,
        postData.category,
        postData.subCategory,
        postData.liftNo,
        postData.owner,
        postData.location,
        postData.description,
        postData.amount,
        postData.account || "Cash"
      ]);

      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Expense record added successfully." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "editExpense") {
      const sheet = ss.getSheetByName("Expenses");
      const rowId = parseInt(postData.rowId);
      
      if (!sheet) throw new Error("Expenses sheet not found.");
      if (rowId <= 1 || rowId > sheet.getLastRow()) throw new Error("Invalid Row ID.");

      // Set values of the row (Columns A to J)
      const range = sheet.getRange(rowId, 1, 1, 10);
      range.setValues([[
        postData.date,
        postData.invoice,
        postData.category,
        postData.subCategory,
        postData.liftNo,
        postData.owner,
        postData.location,
        postData.description,
        postData.amount,
        postData.account || "Cash"
      ]]);

      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Expense record updated successfully." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3. INCOME ACTIONS (Add / Edit)
    if (action === "addIncome") {
      const sheet = ss.getSheetByName("Incomes") || ss.insertSheet("Incomes");
      
      // Ensure headers if sheet is empty
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["Date", "Source", "LiftNo", "Owner", "Location", "TotalAmt", "PaidAmt", "DueAmt", "Description", "Account"]);
      }

      sheet.appendRow([
        postData.date,
        postData.source,
        postData.liftNo,
        postData.owner,
        postData.location,
        postData.totalAmt,
        postData.paidAmt,
        postData.dueAmt,
        postData.description,
        postData.account || "Cash"
      ]);

      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Income record added successfully." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "editIncome") {
      const sheet = ss.getSheetByName("Incomes");
      const rowId = parseInt(postData.rowId);
      
      if (!sheet) throw new Error("Incomes sheet not found.");
      if (rowId <= 1 || rowId > sheet.getLastRow()) throw new Error("Invalid Row ID.");

      // Set values of the row (Columns A to J)
      const range = sheet.getRange(rowId, 1, 1, 10);
      range.setValues([[
        postData.date,
        postData.source,
        postData.liftNo,
        postData.owner,
        postData.location,
        postData.totalAmt,
        postData.paidAmt,
        postData.dueAmt,
        postData.description,
        postData.account || "Cash"
      ]]);

      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Income record updated successfully." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    throw new Error("Action '" + action + "' is unrecognized.");

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
