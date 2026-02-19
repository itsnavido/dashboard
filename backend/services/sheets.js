// Google Sheets API integration
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

let doc = null;
let sheetsClient = null;

/**
 * Get service account credentials
 * Priority: 1) JSON from .env, 2) File path (for local development)
 */
function getServiceAccount() {
  const serviceAccountJson = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON?.trim();
  const serviceAccountPath = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_PATH?.trim();

  let serviceAccount;

  // Option 1: Read from environment variable (preferred - for production/Vercel)
  if (serviceAccountJson && serviceAccountJson.length > 0) {
    try {
      // Handle various newline formats that might be in Vercel environment variables
      // 1. Replace escaped newlines (\n) with actual newlines
      // 2. Handle cases where newlines might already be in the string
      let cleanedJson = serviceAccountJson;
      
      // The issue: When JSON is pasted into Vercel env vars, the private_key field
      // may contain actual newlines instead of escaped \n, which breaks JSON parsing.
      // We need to fix control characters within JSON string values.
      
      // Strategy: Use a state machine to find all string values and fix control chars
      let fixedJson = '';
      let inString = false;
      let inEscape = false;
      
      for (let i = 0; i < cleanedJson.length; i++) {
        const char = cleanedJson[i];
        const nextChar = cleanedJson[i + 1];
        
        if (inEscape) {
          // We're in an escape sequence, just copy it
          fixedJson += char;
          inEscape = false;
          continue;
        }
        
        if (char === '\\') {
          // Start of escape sequence
          fixedJson += char;
          inEscape = true;
          continue;
        }
        
        if (char === '"' && !inEscape) {
          // Toggle string state
          inString = !inString;
          fixedJson += char;
          continue;
        }
        
        if (inString) {
          // We're inside a string value
          // Replace control characters with their escaped equivalents
          if (char === '\n') {
            fixedJson += '\\n';
          } else if (char === '\r') {
            // Handle \r\n as \n, standalone \r as \n
            if (nextChar === '\n') {
              fixedJson += '\\n';
              i++; // Skip the \n
            } else {
              fixedJson += '\\n';
            }
          } else if (char === '\t') {
            fixedJson += '\\t';
          } else if (char.charCodeAt(0) < 32) {
            // Other control characters
            fixedJson += `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
          } else {
            fixedJson += char;
          }
        } else {
          // Outside string, just copy
          fixedJson += char;
        }
      }
      
      cleanedJson = fixedJson;
      
      // Now handle escaped newlines that might already be in the string
      // Replace \\n (double-escaped) with \n (single-escaped)
      cleanedJson = cleanedJson.replace(/\\\\n/g, '\\n');
      
      // Try parsing
      serviceAccount = JSON.parse(cleanedJson);
    } catch (error) {
      throw new Error(`Invalid GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON. Must be valid JSON string. Error: ${error.message}. Hint: Make sure newlines in private_key are escaped as \\n`);
    }
  }
  // Option 2: Read from JSON file (fallback for local development)
  // Also check if serviceAccountPath actually contains JSON (common mistake)
  else if (serviceAccountPath && serviceAccountPath.length > 0) {
    // Check if the path looks like JSON (starts with {)
    if (serviceAccountPath.trim().startsWith('{')) {
      // Try to parse it as JSON (user might have put JSON in PATH variable by mistake)
      try {
        const cleanedJson = serviceAccountPath.replace(/\\n/g, '\n');
        serviceAccount = JSON.parse(cleanedJson);
        console.warn('Warning: JSON content found in GOOGLE_SHEETS_SERVICE_ACCOUNT_PATH. Consider using GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON instead.');
      } catch (parseError) {
        throw new Error('GOOGLE_SHEETS_SERVICE_ACCOUNT_PATH appears to contain JSON content but it is invalid. Use GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON instead for JSON strings, or provide a valid file path to GOOGLE_SHEETS_SERVICE_ACCOUNT_PATH.');
      }
    } else {
      // It's a file path, read from file
      const jsonPath = path.isAbsolute(serviceAccountPath) 
        ? serviceAccountPath 
        : path.join(__dirname, '..', serviceAccountPath);

      if (!fs.existsSync(jsonPath)) {
        throw new Error(`Google Sheets service account file not found at: ${jsonPath}`);
      }

      serviceAccount = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }
  }
  else {
    throw new Error('Google Sheets credentials not configured. Set GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON (JSON string) in .env, or GOOGLE_SHEETS_SERVICE_ACCOUNT_PATH (file path) for local development');
  }

  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Invalid service account JSON. Missing client_email or private_key');
  }

  return serviceAccount;
}

/**
 * Initialize Google Sheets connection (google-spreadsheet)
 */
async function initSheets() {
  if (doc) return doc;

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is required');
  }

  const serviceAccount = getServiceAccount();
  const serviceAccountAuth = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth);
  await doc.loadInfo();

  return doc;
}

/**
 * Initialize Google Sheets API client (raw API for Payment sheet)
 */
async function initSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is required');
  }

  const serviceAccount = getServiceAccount();
  const auth = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

/**
 * Get sheet by name
 */
async function getSheet(sheetName) {
  const spreadsheet = await initSheets();
  let sheet = spreadsheet.sheetsByTitle[sheetName];
  
    if (!sheet) {
      // Try to create the sheet if it doesn't exist (for Users sheet)
      if (sheetName === config.sheetNames.users) {
        sheet = await spreadsheet.addSheet({ title: sheetName });
        // Set headers: discordId (A), role (B), createdAt (C), updatedAt (D), nickname (E), username (F), password (G)
        await sheet.setHeaderRow(['discordId', 'role', 'createdAt', 'updatedAt', 'nickname', 'username', 'password']);
      } else {
        throw new Error(`Sheet "${sheetName}" not found`);
      }
    }
  
  return sheet;
}

/**
 * Get all rows from a sheet
 * For Payment sheet, use raw API to avoid header issues
 */
async function getRows(sheetName, options = {}) {
  // Use raw Google Sheets API for Payment sheet to avoid header issues
  if (sheetName === config.sheetNames.payment) {
    return await getPaymentRowsRaw();
  }
  
  const sheet = await getSheet(sheetName);
  return await sheet.getRows(options);
}

/**
 * Get Payment sheet rows using raw Google Sheets API (bypasses header processing)
 */
async function getPaymentRowsRaw() {
  const client = await initSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = config.sheetNames.payment;

  try {
    // Get the sheet ID
    const doc = await initSheets();
    const sheet = doc.sheetsByTitle[sheetName];
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    // Read data starting from row 4 (skip header rows 1-3)
    const response = await client.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A4:R`, // A4:R means start from row 4, columns A-R (18 columns, rows 1-3 are headers)
    });

    const rows = response.data.values || [];
    
    // Convert to format compatible with google-spreadsheet row objects
    return rows.map((rowData, index) => {
      // Pad row to 18 columns (A-R for Payment v2)
      const paddedRow = new Array(18).fill('').map((_, i) => rowData[i] || '');
      
      return {
        _rawData: paddedRow,
        get: (colIndex) => {
          if (typeof colIndex === 'number') {
            return paddedRow[colIndex] || '';
          }
          // If colIndex is a string (header name), try to find it
          return paddedRow[0] || ''; // Fallback
        },
        _sheet: { headerValues: null } // No headers
      };
    });
  } catch (error) {
    console.error('Error reading Payment sheet with raw API:', error);
    throw error;
  }
}

/**
 * Add a row to a sheet
 * For Payment sheet, use raw API to avoid header issues
 */
async function addRow(sheetName, data) {
  // Use raw Google Sheets API for Payment sheet to avoid header issues
  if (sheetName === config.sheetNames.payment) {
    return await addPaymentRowRaw(data);
  }
  
  const sheet = await getSheet(sheetName);
  return await sheet.addRow(data);
}

/**
 * Add a row to Payment sheet using raw Google Sheets API
 */
async function addPaymentRowRaw(rowData) {
  const client = await initSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = config.sheetNames.payment;

  try {
    // Get the sheet to find the last row
    const doc = await initSheets();
    const sheet = doc.sheetsByTitle[sheetName];
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    // Append row using raw API (will append after existing data, after row 3)
    await client.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:R`, // Append to columns A-R (18 columns for Payment v2)
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [rowData]
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding Payment row with raw API:', error);
    throw error;
  }
}

/**
 * Find row by value in a specific column
 * Returns the row with _rowIndex property (0-indexed from data rows, excluding header)
 */
async function findRowByValue(sheetName, columnIndex, value) {
  const rows = await getRows(sheetName);
  let foundIndex = -1;
  const foundRow = rows.find((row, index) => {
    let cellValue;
    
    // For Users sheet (google-spreadsheet), use header-based access
    if (sheetName === config.sheetNames.users && row._sheet && row._sheet.headerValues) {
      const headerRow = row._sheet.headerValues;
      if (columnIndex < headerRow.length) {
        const columnName = headerRow[columnIndex];
        // Try direct property access first (google-spreadsheet style)
        cellValue = row[columnName] || row.get(columnName);
      }
    }
    
    // Fallback to raw data access (for Payment sheet)
    if (cellValue === undefined || cellValue === null || cellValue === '') {
      const rawData = row._rawData || [];
      cellValue = rawData[columnIndex];
    }
    
    const matches = cellValue && String(cellValue).trim() === String(value).trim();
    if (matches) {
      foundIndex = index;
    }
    return matches;
  });
  
  if (foundRow) {
    foundRow._rowIndex = foundIndex; // Store the index for raw API updates
  }
  
  return foundRow;
}

/**
 * Update a row
 * For Payment sheet, use raw API to avoid header issues
 */
async function updateRow(row, data, sheetName = null, rowIndex = null) {
  // If this is a Payment sheet row (has _rawData but no save method), use raw API
  if (row._rawData && typeof row.save !== 'function' && sheetName && rowIndex !== null) {
    if (sheetName === config.sheetNames.payment) {
      return await updatePaymentRowRaw(rowIndex, data);
    }
  }
  
  // For Users sheet (google-spreadsheet), update by header name
  // google-spreadsheet rows have properties matching header names
  Object.keys(data).forEach(key => {
    const index = parseInt(key);
    // If key is a number, it's a column index (for Payment sheet raw data)
    if (!isNaN(index) && row._rawData) {
      row._rawData[index] = data[key];
    } else {
      // For Users sheet, set property directly on row object
      // google-spreadsheet uses properties matching header names
      row[key] = data[key];
    }
  });
  
  // Only call save if the method exists (google-spreadsheet rows have save method)
  if (typeof row.save === 'function') {
    await row.save();
  }
}

/**
 * Update a Users row using raw Google Sheets API
 */
async function updateUserRowRaw(rowIndex, updateData) {
  const client = await initSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = config.sheetNames.users;

  try {
    // Get the sheet
    const doc = await initSheets();
    const sheet = doc.sheetsByTitle[sheetName];
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    // Convert column names to indices
    // Users sheet: discordId (A=0), role (B=1), createdAt (C=2), updatedAt (D=3), nickname (E=4), username (F=5), password (G=6)
    const columnMap = {
      'discordId': 0,
      'role': 1,
      'createdAt': 2,
      'updatedAt': 3,
      'nickname': 4,
      'username': 5,
      'password': 6
    };

    const columnToLetter = (col) => {
      if (col < 0 || col > 6) {
        console.warn(`Column index ${col} is out of range (0-6)`);
        return null;
      }
      // A=0, B=1, ..., G=6
      return String.fromCharCode(65 + col);
    };

    // Build update requests
    const updateRequests = Object.keys(updateData)
      .filter(key => columnMap.hasOwnProperty(key))
      .map(key => {
        const col = columnMap[key];
        const actualRow = rowIndex + 2; // Row 1 is header, +1 for 1-indexed, so rowIndex + 2
        const columnLetter = columnToLetter(col);
        
        if (!columnLetter) {
          console.warn(`Invalid column: ${key}, skipping update`);
          return null;
        }
        
        const range = `${sheetName}!${columnLetter}${actualRow}`;
        
        return {
          range: range,
          values: [[updateData[key]]]
        };
      })
      .filter(req => req !== null);

    if (updateRequests.length === 0) {
      console.warn('No valid update requests to process');
      return { success: true };
    }

    // Update cells using batchUpdate
    await client.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data: updateRequests
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating User row with raw API:', error);
    throw error;
  }
}

/**
 * Update a Payment row using raw Google Sheets API
 */
async function updatePaymentRowRaw(rowIndex, updateData) {
  const client = await initSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = config.sheetNames.payment;

  try {
    // Get the sheet to find the sheet ID
    const doc = await initSheets();
    const sheet = doc.sheetsByTitle[sheetName];
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    // Convert column indices to A1 notation (A=0, B=1, etc.)
    // Payment sheet uses columns 0-15 (A-P), so simple conversion is sufficient
    const columnToLetter = (col) => {
      if (col < 0 || col > 15) {
        console.warn(`Column index ${col} is out of range (0-15)`);
        return null;
      }
      // A=0, B=1, ..., P=15
      return String.fromCharCode(65 + col);
    };

    // Build update requests for each column that needs updating
    // Filter out invalid columns (like column 5 which is #VALUE!)
    const updateRequests = Object.keys(updateData)
      .filter(colIndex => {
        const col = parseInt(colIndex);
        // Skip column 5 (#VALUE!) and ensure column is valid (0-15)
        return !isNaN(col) && col >= 0 && col <= 15 && col !== 5;
      })
      .map(colIndex => {
        const col = parseInt(colIndex);
        const actualRow = rowIndex + 4; // Account for 3 header rows + 1-indexed
        const columnLetter = columnToLetter(col);
        
        if (!columnLetter) {
          console.warn(`Invalid column index: ${col}, skipping update`);
          return null;
        }
        
        const range = `${sheetName}!${columnLetter}${actualRow}`;
        
        return {
          range: range,
          values: [[updateData[colIndex]]]
        };
      })
      .filter(req => req !== null); // Remove any null requests

    // If no valid update requests, return early
    if (updateRequests.length === 0) {
      console.warn('No valid update requests to process');
      return { success: true };
    }

    // Update cells using batchUpdate
    await client.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data: updateRequests
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating Payment row with raw API:', error);
    throw error;
  }
}

/**
 * Delete a row
 * For Payment sheet, use raw API
 */
async function deleteRow(row, sheetName = null, rowIndex = null) {
  // If this is a Payment sheet row (has _rawData but no delete method), use raw API
  if (row._rawData && typeof row.delete !== 'function' && sheetName && rowIndex !== null) {
    if (sheetName === config.sheetNames.payment) {
      return await deletePaymentRowRaw(rowIndex);
    }
  }
  
  // Use standard delete method if available
  if (typeof row.delete === 'function') {
    await row.delete();
  }
}

/**
 * Delete a Payment row using raw Google Sheets API
 */
async function deletePaymentRowRaw(rowIndex) {
  const client = await initSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = config.sheetNames.payment;

  try {
    // Get the sheet to find the sheet ID
    const doc = await initSheets();
    const sheet = doc.sheetsByTitle[sheetName];
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    const actualRow = rowIndex + 4; // Account for 3 header rows + 1-indexed

    // Delete the row using batchUpdate
    await client.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.sheetId,
              dimension: 'ROWS',
              startIndex: actualRow - 1, // 0-indexed
              endIndex: actualRow
            }
          }
        }]
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting Payment row with raw API:', error);
    throw error;
  }
}

/**
 * Get cell value by row and column
 */
async function getCellValue(sheetName, rowIndex, columnIndex) {
  const sheet = await getSheet(sheetName);
  await sheet.loadCells(`${String.fromCharCode(65 + columnIndex)}${rowIndex + 1}`);
  const cell = sheet.getCell(rowIndex, columnIndex);
  return cell.value;
}

/**
 * Set cell value
 */
async function setCellValue(sheetName, rowIndex, columnIndex, value) {
  const sheet = await getSheet(sheetName);
  await sheet.loadCells(`${String.fromCharCode(65 + columnIndex)}${rowIndex + 1}`);
  const cell = sheet.getCell(rowIndex, columnIndex);
  cell.value = value;
  await sheet.saveUpdatedCells();
}

/**
 * Add a payment log entry
 * Payment Logs sheet structure: Payment ID, Action, User, Timestamp, Changes (JSON)
 */
async function addPaymentLog(paymentUniqueID, action, userId, changes) {
  const client = await initSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = config.sheetNames.paymentLogs;

  try {
    const utils = require('./utils');
    const timestamp = utils.formatDate();
    const changesJson = JSON.stringify(changes || {});

    // Check if sheet exists, if not create it
    const doc = await initSheets();
    let sheet = doc.sheetsByTitle[sheetName];
    
    if (!sheet) {
      // Create the sheet with headers
      sheet = await doc.addSheet({ title: sheetName });
      // Add headers: Payment ID, Action, User, Timestamp, Changes
      await sheet.setHeaderRow(['Payment ID', 'Action', 'User', 'Timestamp', 'Changes']);
    }

    // Add log entry
    await sheet.addRow({
      'Payment ID': paymentUniqueID,
      'Action': action, // 'create' or 'edit'
      'User': userId,
      'Timestamp': timestamp,
      'Changes': changesJson
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding payment log:', error);
    // Don't throw - logging failures shouldn't break payment operations
    return { success: false, error: error.message };
  }
}

/**
 * Get payment logs for a specific payment
 */
async function getPaymentLogs(paymentUniqueID) {
  try {
    const doc = await initSheets();
    const sheetName = config.sheetNames.paymentLogs;
    const sheet = doc.sheetsByTitle[sheetName];
    
    if (!sheet) {
      return [];
    }

    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();

    // Filter logs for this payment ID
    const logs = rows
      .filter(row => row.get('Payment ID') === paymentUniqueID)
      .map(row => ({
        id: row.rowNumber,
        paymentID: row.get('Payment ID'),
        action: row.get('Action'),
        user: row.get('User'),
        timestamp: row.get('Timestamp'),
        changes: JSON.parse(row.get('Changes') || '{}')
      }))
      .sort((a, b) => {
        // Sort by timestamp descending (newest first)
        const parseTime = (timeStr) => {
          if (!timeStr || !timeStr.trim()) return 0;
          try {
            const [datePart, timePart] = timeStr.trim().split(' ');
            if (!datePart || !timePart) return 0;
            const [day, month, year] = datePart.split('/');
            const [hours, minutes, seconds] = timePart.split(':');
            if (!day || !month || !year || !hours || !minutes || !seconds) return 0;
            const date = new Date(
              parseInt(year),
              parseInt(month) - 1,
              parseInt(day),
              parseInt(hours),
              parseInt(minutes),
              parseInt(seconds)
            );
            return date.getTime() - (3.5 * 60 * 60 * 1000);
          } catch (e) {
            return 0;
          }
        };
        return parseTime(b.timestamp) - parseTime(a.timestamp);
      });

    return logs;
  } catch (error) {
    console.error('Error fetching payment logs:', error);
    return [];
  }
}

/**
 * Get Payment Info sheet options and due date info
 * Returns: paymentSources (col A), paymentMethods (col B), currencies (col C), dueDateInfo (col D:E)
 */
async function getPaymentInfoOptions() {
  try {
    const sheet = await getSheet(config.sheetNames.paymentInfo);
    const rows = await sheet.getRows();
    
    // Extract unique values from columns A, B, C
    const paymentSources = [];
    const paymentMethods = [];
    const currencies = [];
    const dueDateOptions = [];
    
    rows.forEach((row) => {
      // Access raw data directly (columns are 0-indexed)
      const rawData = row._rawData || [];
      
      // Column A (index 0): Payment Source
      const paymentSource = rawData[0] || '';
      if (paymentSource && paymentSource.trim() && !paymentSources.includes(paymentSource.trim())) {
        paymentSources.push(paymentSource.trim());
      }
      
      // Column B (index 1): Payment Method
      const paymentMethod = rawData[1] || '';
      if (paymentMethod && paymentMethod.trim() && !paymentMethods.includes(paymentMethod.trim())) {
        paymentMethods.push(paymentMethod.trim());
      }
      
      // Column C (index 2): Currency
      const currency = rawData[2] || '';
      if (currency && currency.trim() && !currencies.includes(currency.trim())) {
        currencies.push(currency.trim());
      }
      
      // Column D (index 3): Due Date title
      // Column E (index 4): Hours till due date
      const dueDateTitle = rawData[3] || '';
      const dueDateHours = rawData[4];
      
      // If both title and hours are present, add as an option
      if (dueDateTitle && dueDateTitle.trim() && dueDateHours) {
        const parsedHours = parseFloat(dueDateHours);
        if (!isNaN(parsedHours) && parsedHours > 0) {
          // Check if this option already exists (avoid duplicates)
          const exists = dueDateOptions.some(opt => 
            opt.title === dueDateTitle.trim() && opt.hours === parsedHours
          );
          if (!exists) {
            dueDateOptions.push({
              title: dueDateTitle.trim(),
              hours: parsedHours
            });
          }
        }
      }
    });
    
    // Default due date info (use first option if available, otherwise defaults)
    const defaultDueDateInfo = dueDateOptions.length > 0 
      ? dueDateOptions[0]
      : { title: 'Due Date', hours: 24 };
    
    return {
      paymentSources: paymentSources.filter(Boolean),
      paymentMethods: paymentMethods.filter(Boolean),
      currencies: currencies.filter(Boolean),
      dueDateOptions: dueDateOptions, // All available due date options
      dueDateInfo: defaultDueDateInfo // Default/selected due date info
    };
  } catch (error) {
    console.error('Error fetching Payment Info options:', error);
    // Return defaults if sheet doesn't exist or has errors
    return {
      paymentSources: [],
      paymentMethods: [],
      currencies: [],
      dueDateOptions: [],
      dueDateInfo: {
        title: 'Due Date',
        hours: 24
      }
    };
  }
}

module.exports = {
  initSheets,
  initSheetsClient,
  getSheet,
  getRows,
  addRow,
  findRowByValue,
  updateRow,
  updateUserRowRaw,
  deleteRow,
  getCellValue,
  setCellValue,
  addPaymentLog,
  getPaymentLogs,
  getPaymentInfoOptions
};

