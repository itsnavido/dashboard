// Non-secret configuration settings

module.exports = {
  // Payment duration options and messages mapping
  paymentDurationMessages: {
    "usdt days": "USD Payment(12-24 hour)",
    "lahzei": "1-3 saat",
    "2-3 days": "2-3 rooz",
    "3-5 days": "3-5 rooz",
    "5-10 days": "5-10 rooz",
    "12-24 hours": "12-24 Saat",
    "24-48 hours": "24-48 saat"
  },

  // Payment duration options for form
  paymentDurationOptions: [
    { value: "lahzei", label: "lahzei" },
    { value: "12-24 hours", label: "12-24" },
    { value: "24-48 hours", label: "24-48" },
    { value: "2-3 days", label: "2-3" },
    { value: "3-5 days", label: "3-5" },
    { value: "5-10 days", label: "5-10" },
    { value: "usdt days", label: "USDT" }
  ],

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
  // Headers: Timestamp, Due Date, Discord ID, Payment Time, Amount, PPU, Total, Payment Source, Payment Method, Currency, Card Number, Iban, Name, Wallet, Paypal Address, UUID, Note, Status, Note admin
  paymentSheetColumns: {
    time: 0,              // Timestamp
    dueDate: 1,           // Due Date
    userid: 2,            // Discord ID
    paymentDuration: 3,  // Payment Time
    amount: 4,            // Amount
    ppu: 5,               // PPU (Price Per Unit)
    total: 6,             // Total (amount * PPU)
    paymentSource: 7,     // Payment Source
    paymentMethod: 8,     // Payment Method
    currency: 9,           // Currency
    card: 10,             // Card Number
    iban: 11,             // Iban
    name: 12,             // Name
    wallet: 13,           // Wallet
    paypalAddress: 14,    // Paypal Address
    uniqueID: 15,         // UUID
    note: 16,             // Note
    status: 17,           // Status
    noteAdmin: 18         // Note admin
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

