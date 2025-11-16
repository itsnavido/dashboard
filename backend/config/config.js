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
    payment: "Payment",
    sellerInfo: "Seller Info",
    info: "Info",
    users: "Users"
  },

  // Column mappings for Payment sheet (0-indexed)
  // Headers: Timestamp, Discord ID, Payment Time, Amount, Price, #VALUE!, Gheymat, Realm, Shomare Kart, Shomare Sheba, Name, Shomare tamas, Note, ID, Admin, Ki Pay Kard
  paymentSheetColumns: {
    time: 0,              // Timestamp
    userid: 1,            // Discord ID
    paymentDuration: 2,   // Payment Time
    amount: 3,            // Amount
    price: 4,             // Price
    // Column 5 is #VALUE! - ignore it
    gheymat: 6,           // Gheymat
    realm: 7,             // Realm
    card: 8,              // Shomare Kart
    sheba: 9,             // Shomare Sheba
    name: 10,             // Name
    phone: 11,            // Shomare tamas
    note: 12,             // Note
    uniqueID: 13,         // ID
    admin: 14,            // Admin
    processed: 15         // Ki Pay Kard (processed flag)
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

