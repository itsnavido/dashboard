  # API Format Documentation

  This document provides instructions for sending data to the Dashboard API with the new format for both Payment v2 and Seller Info sheets.

  ## Table of Contents
  - [Payment v2 Sheet](#payment-v2-sheet)
  - [Seller Info Sheet](#seller-info-sheet)
  - [API Endpoints](#api-endpoints)
  - [Data Format Examples](#data-format-examples)

  ---

  ## Payment v2 Sheet

  ### Sheet Name
  `Payment v2`

  ### Column Structure (17 columns: A-Q)

  | Column | Index | Field Name | Description | Required | Notes |
  |--------|-------|------------|-------------|----------|-------|
  | A | 0 | `time` | Timestamp | Auto-generated | Format: `DD/MM/YYYY HH:MM:SS` (GMT+3:30) |
  | B | 1 | `dueDate` | Due Date | Yes | Format: `DD/MM/YYYY HH:MM:SS` (calculated from Payment Info hours) |
  | C | 2 | `userid` | Discord ID | Yes | User's Discord ID |
  | D | 3 | `amount` | Amount | Yes | Numeric value (can include commas) |
  | E | 4 | `ppu` | Price Per Unit | Yes | Numeric value (can include commas) |
  | F | 5 | `total` | Total Amount | Auto-calculated | Always `amount * ppu` |
  | G | 6 | `paymentSource` | Payment Source | No | Options from Payment Info sheet (Column A) |
  | H | 7 | `paymentMethod` | Payment Method | No | Options from Payment Info sheet (Column B) |
  | I | 8 | `card` | Card Number | No | Shomare Kart (from Seller Info) |
  | J | 9 | `iban` | IBAN | No | ShomareSheba (from Seller Info) |
  | K | 10 | `name` | Name | No | Seller's name (from Seller Info) |
  | L | 11 | `wallet` | Wallet | No | Wallet address (from Seller Info) |
  | M | 12 | `paypalAddress` | Paypal Address | No | Paypal Wallet (from Seller Info) |
  | N | 13 | `uniqueID` | UUID | Auto-generated | 256-bit hash (64 hex characters) |
  | O | 14 | `note` | Note | No | User note |
  | P | 15 | `status` | Status | No | Values: `Paid`, `Failed`, or empty (`Unpaid`) |
  | Q | 16 | `noteAdmin` | Admin Note | No | Admin-only note |

  ### Important Notes:
  - **Total Calculation**: The `total` field is always calculated as `amount * ppu` on the backend. Do not send a custom total value.
  - **UUID Generation**: The `uniqueID` is automatically generated as a 256-bit SHA-256 hash (64 hex characters). Do not send this field.
  - **Timestamp**: The `time` field is automatically generated. Do not send this field.
  - **Status Field**: The `status` field is read-only in the API. It can be manually updated in the sheet but is not written by the API.
  - **Due Date**: Can be provided or will be calculated from Payment Info sheet (columns D:E).

  ---

  ## Seller Info Sheet

  ### Sheet Name
  `Seller Info`

  ### Column Structure (7 columns: A-G)

  | Column | Index | Field Name | Description | Required | Notes |
  |--------|-------|------------|-------------|----------|-------|
  | A | 0 | `discordId` | Discord ID | Yes | Primary key, unique identifier |
  | B | 1 | `card` | Shomare Kart | No | Card number |
  | C | 2 | `sheba` | ShomareSheba | No | IBAN/Sheba number |
  | D | 3 | `name` | Name | No | Seller's full name |
  | E | 4 | `phone` | Shomare Tamas | No | Phone number |
  | F | 5 | `wallet` | Wallet | No | Wallet address |
  | G | 6 | `paypalWallet` | Paypal Wallet | No | Paypal wallet address |

  ### Important Notes:
  - **Discord ID**: This is the primary key. Each Discord ID should have only one row.
  - **Payment Integration**: When creating a payment, the system automatically fetches seller info using the Discord ID and populates payment fields:
    - `card` → Payment `card` (Column I)
    - `sheba` → Payment `iban` (Column J)
    - `name` → Payment `name` (Column K)
    - `wallet` → Payment `wallet` (Column L)
    - `paypalWallet` → Payment `paypalAddress` (Column M)

  ---

  ## API Endpoints

  ### Create Payment
  **Endpoint**: `POST /api/payments`

  **Authentication**: Required (Bearer token)

  **Request Body**:
  ```json
  {
    "discordId": "123456789012345678",
    "amount": "1000",
    "ppu": "50000",
    "dueDate": "19/02/2026 15:30:00",
    "paymentSource": "Source Name",
    "paymentMethod": "Method Name",
    "note": "Optional note",
    "noteAdmin": "Optional admin note"
  }
  ```

  **Fields**:
  - `discordId` (required): Discord ID of the user
  - `amount` (required): Payment amount (can include commas, will be stripped)
  - `ppu` (required): Price per unit (can include commas, will be stripped)
  - `dueDate` (optional): Due date in format `DD/MM/YYYY HH:MM:SS`. If not provided, calculated from Payment Info sheet
  - `paymentSource` (optional): Payment source from Payment Info sheet
  - `paymentMethod` (optional): Payment method from Payment Info sheet
  - `note` (optional): User note
  - `noteAdmin` (optional): Admin note

  **Auto-populated Fields** (from Seller Info):
  - `card`: Automatically fetched from Seller Info using `discordId`
  - `iban`: Automatically fetched from Seller Info (`sheba` field)
  - `name`: Automatically fetched from Seller Info
  - `wallet`: Automatically fetched from Seller Info
  - `paypalAddress`: Automatically fetched from Seller Info (`paypalWallet` field)

  **Auto-generated Fields**:
  - `time`: Current timestamp
  - `total`: Calculated as `amount * ppu`
  - `uniqueID`: 256-bit hash (64 hex characters)

  **Response**:
  ```json
  {
    "message": "Payment created successfully",
    "payment": {
      "id": 123,
      "uniqueID": "a1b2c3d4e5f6...",
      "time": "19/02/2026 12:00:00",
      "dueDate": "19/02/2026 15:30:00",
      "userid": "123456789012345678",
      "amount": "1000",
      "ppu": "50000",
      "total": "50000000",
      ...
    }
  }
  ```

  ---

  ### Create/Update Seller Info
  **Endpoint**: `POST /api/sellers`

  **Authentication**: Required (Bearer token)

  **Request Body**:
  ```json
  {
    "discordId": "123456789012345678",
    "card": "1234567890123456",
    "sheba": "IR123456789012345678901234",
    "name": "John Doe",
    "phone": "09123456789",
    "wallet": "0x1234567890abcdef",
    "paypalWallet": "paypal@example.com"
  }
  ```

  **Fields**:
  - `discordId` (required): Discord ID (primary key)
  - `card` (optional): Card number (Shomare Kart)
  - `sheba` (optional): IBAN/Sheba number (ShomareSheba)
  - `name` (optional): Full name
  - `phone` (optional): Phone number (Shomare Tamas)
  - `wallet` (optional): Wallet address
  - `paypalWallet` (optional): Paypal wallet address

  **Response**:
  ```json
  {
    "message": "Seller info saved successfully"
  }
  ```

  **Note**: If a seller with the same `discordId` exists, it will be updated. Otherwise, a new row will be created.

  ---

  ### Get Seller Info
  **Endpoint**: `GET /api/sellers/:discordId`

  **Authentication**: Not required

  **Response**:
  ```json
  {
    "card": "1234567890123456",
    "sheba": "IR123456789012345678901234",
    "name": "John Doe",
    "phone": "09123456789",
    "wallet": "0x1234567890abcdef",
    "paypalWallet": "paypal@example.com"
  }
  ```

  ---

  ### Get Payment Info Options
  **Endpoint**: `GET /api/payment-info`

  **Authentication**: Not required

  **Response**:
  ```json
  {
    "paymentSources": ["Source 1", "Source 2"],
    "paymentMethods": ["Method 1", "Method 2"],
    "dueDateOptions": [
      {
        "title": "Standard Due Date",
        "hours": 24
      },
      {
        "title": "Extended Due Date",
        "hours": 48
      }
    ],
    "dueDateInfo": {
      "title": "Standard Due Date",
      "hours": 24
    }
  }
  ```

  **Payment Info Sheet Structure**:
  - Column A: Payment Source options
  - Column B: Payment Method options
  - Column C: (Not used - currency removed)
  - Column D: Due Date title
  - Column E: Hours till due date

  ---

  ## Data Format Examples

  ### Example 1: Create Payment with All Fields
  ```json
  POST /api/payments
  {
    "discordId": "180032303303491584",
    "amount": "1,000",
    "ppu": "50,000",
    "dueDate": "20/02/2026 14:30:00",
    "paymentSource": "Online Store",
    "paymentMethod": "Bank Transfer",
    "note": "Payment for order #12345",
    "noteAdmin": "Verified by admin"
  }
  ```

  **Result in Sheet**:
  - Column A (time): `19/02/2026 12:00:00` (auto-generated)
  - Column B (dueDate): `20/02/2026 14:30:00`
  - Column C (userid): `180032303303491584`
  - Column D (amount): `1000`
  - Column E (ppu): `50000`
  - Column F (total): `50000000` (auto-calculated: 1000 * 50000)
  - Column G (paymentSource): `Online Store`
  - Column H (paymentMethod): `Bank Transfer`
  - Column I (card): `[from Seller Info]`
  - Column J (iban): `[from Seller Info]`
  - Column K (name): `[from Seller Info]`
  - Column L (wallet): `[from Seller Info]`
  - Column M (paypalAddress): `[from Seller Info]`
  - Column N (uniqueID): `a1b2c3d4e5f6...` (64 hex chars, auto-generated)
  - Column O (note): `Payment for order #12345`
  - Column P (status): `` (empty, read-only)
  - Column Q (noteAdmin): `Verified by admin`

  ---

  ### Example 2: Create Payment with Minimal Fields
  ```json
  POST /api/payments
  {
    "discordId": "180032303303491584",
    "amount": "500",
    "ppu": "30000"
  }
  ```

  **Result**:
  - Due date will be calculated from Payment Info sheet
  - Seller info will be automatically fetched and populated
  - Total will be calculated: `500 * 30000 = 15000000`

  ---

  ### Example 3: Create/Update Seller Info
  ```json
  POST /api/sellers
  {
    "discordId": "180032303303491584",
    "card": "6037991234567890",
    "sheba": "IR120620000000000012345678",
    "name": "Ali Rezaei",
    "phone": "09123456789",
    "wallet": "TRX1234567890abcdef",
    "paypalWallet": "alirezaei@example.com"
  }
  ```

  **Result in Sheet**:
  - Column A: `180032303303491584`
  - Column B: `6037991234567890`
  - Column C: `IR120620000000000012345678`
  - Column D: `Ali Rezaei`
  - Column E: `09123456789`
  - Column F: `TRX1234567890abcdef`
  - Column G: `alirezaei@example.com`

  ---

  ## Column Index Reference

  ### Payment v2 (17 columns: 0-16)
  ```
  0:  time
  1:  dueDate
  2:  userid
  3:  amount
  4:  ppu
  5:  total
  6:  paymentSource
  7:  paymentMethod
  8:  card
  9:  iban
  10: name
  11: wallet
  12: paypalAddress
  13: uniqueID
  14: note
  15: status
  16: noteAdmin
  ```

  ### Seller Info (7 columns: 0-6)
  ```
  0: discordId
  1: card
  2: sheba
  3: name
  4: phone
  5: wallet
  6: paypalWallet
  ```

  ---

  ## Important Reminders

  1. **Always use Discord ID** as the identifier for both payments and seller info
  2. **Total is auto-calculated** - never send a custom total value
  3. **UUID is auto-generated** - never send a uniqueID
  4. **Timestamp is auto-generated** - never send a time value
  5. **Seller info is auto-fetched** - payment endpoints will automatically populate seller fields
  6. **Status field is read-only** - cannot be set via API, only manually in sheet
  7. **Due date can be calculated** - if not provided, it uses Payment Info sheet hours
  8. **Commas in numbers** - will be automatically stripped (e.g., "1,000" becomes "1000")

  ---

  ## Error Handling

  ### Common Errors

  **400 Bad Request**:
  - Missing required fields (`discordId`, `amount`, `ppu`)
  - Invalid data format

  **401 Unauthorized**:
  - Missing or invalid authentication token

  **404 Not Found**:
  - Seller info not found (when fetching)

  **500 Internal Server Error**:
  - Server-side error (check logs)

  ---

  ## Testing

  ### Test Payment Creation
  ```bash
  curl -X POST http://localhost:3000/api/payments \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -d '{
      "discordId": "123456789012345678",
      "amount": "1000",
      "ppu": "50000",
      "paymentSource": "Test Source",
      "paymentMethod": "Test Method"
    }'
  ```

  ### Test Seller Info Creation
  ```bash
  curl -X POST http://localhost:3000/api/sellers \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -d '{
      "discordId": "123456789012345678",
      "name": "Test User",
      "card": "1234567890"
    }'
  ```

  ---

  **Last Updated**: February 19, 2026
  **Version**: 2.0
