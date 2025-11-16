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
      // Set headers
      await sheet.setHeaderRow(['discordId', 'role', 'createdAt', 'updatedAt']);
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
      range: `${sheetName}!A4:V`, // A4:V means start from row 4, columns A-V (rows 1-3 are headers)
    });

    const rows = response.data.values || [];
    
    // Convert to format compatible with google-spreadsheet row objects
    return rows.map((rowData, index) => {
      // Pad row to 22 columns (A-V)
      const paddedRow = new Array(22).fill('').map((_, i) => rowData[i] || '');
      
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
      range: `${sheetName}!A:Q`, // Append to columns A-Q
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
 */
async function findRowByValue(sheetName, columnIndex, value) {
  const rows = await getRows(sheetName);
  return rows.find(row => {
    let cellValue;
    
    // Try to get by header name first, then by index
    if (row._sheet && row._sheet.headerValues) {
      const headerRow = row._sheet.headerValues;
      if (columnIndex < headerRow.length) {
        const columnName = headerRow[columnIndex];
        cellValue = row.get(columnName);
      }
    }
    
    // Fallback to raw data access
    if (cellValue === undefined || cellValue === null) {
      const rawData = row._rawData || [];
      cellValue = rawData[columnIndex];
    }
    
    return cellValue && String(cellValue).trim() === String(value).trim();
  });
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
  
  // Update raw data by column index
  Object.keys(data).forEach(colIndex => {
    const index = parseInt(colIndex);
    if (!isNaN(index) && row._rawData) {
      row._rawData[index] = data[colIndex];
    } else {
      // Try to update by header name
      const headerRow = row._sheet?.headerValues;
      if (headerRow && headerRow.includes(colIndex)) {
        row[colIndex] = data[colIndex];
      } else {
        row[colIndex] = data[colIndex];
      }
    }
  });
  
  // Only call save if the method exists
  if (typeof row.save === 'function') {
    await row.save();
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

module.exports = {
  initSheets,
  getSheet,
  getRows,
  addRow,
  findRowByValue,
  updateRow,
  deleteRow,
  getCellValue,
  setCellValue
};

