// Non-secret configuration settings

module.exports = {

  // Realm options
  realmOptions: [
    { value: "Retail", label: "Retail" },
    { value: "POE", label: "POE" },
    { value: "Classic", label: "Classic" }
  ],

  // Payment type options
  paymentTypeOptions: [
    { value: "Naghdi", label: "پرداخت نقدی" },
    { value: "Gold", label: "فروش گلد" }
  ],

  // Sheet names
  sheetNames: {
    payment: "Payment v2",
    sellerInfo: "Seller Info",
    info: "Info",
    users: "Users",
    paymentLogs: "Payment Logs",
    paymentInfo: "Payment Info"
  },

  // Column mappings for Payment v2 sheet (0-indexed)
  // Write A–R (0–17). Status (S) is read-only for display.
  // Headers: Timestamp, Due Date, Discord ID, Payment Time, Amount, PPU, Total, [Empty], Payment Source, Payment Method, Card Number, Iban, Name, Wallet, Paypal Address, UUID, Note, Author [, Status]
  paymentSheetColumns: {
    time: 0,              // Timestamp
    dueDate: 1,            // Due Date
    userid: 2,             // Discord ID
    paymentTime: 3,        // Payment Time (Due Date option)
    amount: 4,             // Amount
    ppu: 5,                // PPU (Price Per Unit)
    total: 6,              // Total (amount * PPU)
    paymentSource: 8,      // Payment Source (moved from H to I)
    paymentMethod: 9,      // Payment Method (moved from I to J)
    card: 10,              // Card Number (moved from J to K)
    iban: 11,              // Iban (Sheba) (moved from K to L)
    name: 12,              // Name (moved from L to M)
    wallet: 13,            // Wallet (moved from M to N)
    paypalAddress: 14,     // Paypal Address (moved from N to O)
    uniqueID: 15,          // UUID (moved from O to P)
    note: 16,              // Note (moved from P to Q)
    author: 17,            // Author (admin who submitted) (moved from Q to R)
    status: 18             // Status (read-only; we write up to Author)
  },

  // Column mappings for Seller Info sheet (0-indexed)
  // Headers: Discord ID, Shomare Kart, ShomareSheba, Name, Shomare Tamas, Wallet, Paypal Wallet
  sellerInfoColumns: {
    discordId: 0,         // Discord ID
    card: 1,              // Shomare Kart
    sheba: 2,             // ShomareSheba
    name: 3,              // Name
    phone: 4,             // Shomare Tamas
    wallet: 5,            // Wallet
    paypalWallet: 6       // Paypal Wallet
  },

  // Cache TTL settings (in seconds)
  cacheTTL: {
    sellerInfo: 600,    // 10 minutes
    userRole: 1800,     // 30 minutes
    paymentList: 120    // 2 minutes
  },


  // Default admin Discord IDs (for initial setup)
  defaultAdmins: ["180032303303491584"],

  // Admin name
  defaultAdmin: "Celestial Shop",

  // Timezone for date formatting
  timezone: "GMT+3:30"
};

