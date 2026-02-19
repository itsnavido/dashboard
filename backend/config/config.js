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
  // Headers: Timestamp, Due Date, Discord ID, Amount, PPU, Total, Payment Source, Payment Method, Currency, Card Number, Iban, Name, Wallet, Paypal Address, UUID, Note, Status, Note admin
  paymentSheetColumns: {
    time: 0,              // Timestamp
    dueDate: 1,           // Due Date
    userid: 2,            // Discord ID
    amount: 3,            // Amount
    ppu: 4,               // PPU (Price Per Unit)
    total: 5,             // Total (amount * PPU)
    paymentSource: 6,     // Payment Source
    paymentMethod: 7,     // Payment Method
    currency: 8,           // Currency
    card: 9,             // Card Number
    iban: 10,             // Iban
    name: 11,             // Name
    wallet: 12,           // Wallet
    paypalAddress: 13,    // Paypal Address
    uniqueID: 14,         // UUID
    note: 15,             // Note
    status: 16,           // Status
    noteAdmin: 17         // Note admin
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

