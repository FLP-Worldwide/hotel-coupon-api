function phoneToPasswordRaw(phone) {
    if (!phone) throw new Error("Phone required");
  
    // Remove everything except digits
    const digits = phone.replace(/\D/g, ""); // "+91 98765-43210" -> "919876543210"
  
    // Agar 10 se zyada digits hai, last 10 lo (handles +91, 91 prefix etc.)
    if (digits.length >= 10) {
      return String(digits.slice(-10)); // always return as string
    }
  
    throw new Error("Invalid phone number — not enough digits");
  }
  
  module.exports = { phoneToPasswordRaw };
  