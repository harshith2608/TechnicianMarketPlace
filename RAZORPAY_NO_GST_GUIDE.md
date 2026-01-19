# Razorpay Setup Without GST - Quick Guide

**Date:** January 18, 2026  
**Situation:** Setting up Razorpay payment gateway without GST registration

---

## ✅ Good News: You DON'T Need GST!

Razorpay **fully supports** business accounts without GST. This is very common in India for:
- Individual technicians/freelancers
- Sole proprietors
- Small businesses just starting out
- Anyone with turnover < ₹40 lakhs/year

---

## 🎯 Recommended Path for You

### **STEP 1: Choose Account Type**

**If you're operating as an individual/freelancer:**
```
Account Type: Sole Proprietor
Documents Needed: PAN + Aadhaar + Address Proof + Bank Account
GST: NOT REQUIRED
```

**If you have a registered business:**
```
Account Type: Partnership/Private Company
Documents Needed: PAN + Aadhaar + Business Proof + Bank Account
GST: NOT REQUIRED (until ₹40 lakhs turnover)
```

---

## 📋 Documents You Need to Gather

### **MUST HAVE:**
- [ ] **PAN Card** (Your personal PAN number)
  - Download from: https://incometax.gov.in/
  - What to provide: PAN number + Photo of card
  - Time to get: If you don't have one, 2-3 weeks online application

- [ ] **Aadhaar Number** (12-digit ID)
  - Already have if you're in India
  - What to provide: Aadhaar number + Photo of Aadhaar

- [ ] **Bank Account Details**
  - Account number
  - IFSC code
  - Account holder name
  - (Personal or business account - either works)

- [ ] **Address Proof** (Any ONE of these)
  - [ ] Electricity/Water bill (latest, with address)
  - [ ] Lease agreement
  - [ ] Property tax receipt
  - [ ] Passport
  - [ ] Driving license
  - [ ] Ration card

### **OPTIONAL (For Business Address):**
- If different from residential:
  - [ ] Proof of business address (rent agreement, utility bill, etc.)

---

## 🚀 Quick Setup Steps

### **Step 1: Create Razorpay Account (5 min)**
1. Go to: https://razorpay.com/signup
2. Enter email, password, phone number
3. Click verify
4. **Result:** Account created

### **Step 2: Complete Profile (10 min)**
1. Login to: https://dashboard.razorpay.com
2. Go to Settings → My Account
3. Fill personal details:
   - [ ] Full Name
   - [ ] Email
   - [ ] Phone number
   - [ ] PAN number
   - [ ] Aadhaar number
4. Upload documents:
   - [ ] PAN photo/copy
   - [ ] Aadhaar photo/copy
   - [ ] Address proof
5. **Result:** Profile completed

### **Step 3: Add Bank Account (10 min)**
1. Go to Settings → Accounts & Settlements
2. Add Bank Account:
   - [ ] Account number
   - [ ] IFSC code
   - [ ] Account holder name
3. Razorpay will send 2-3 small test deposits
4. **Result:** Bank account verified (2-3 days)

### **Step 4: Get Test API Keys (5 min)**
1. Go to Settings → API Keys
2. Make sure you're in "Test Mode" (toggle at top)
3. Copy your keys:
   - [ ] Key ID (starts with `rzp_test_`)
   - [ ] Key Secret (keep secret!)
4. **Result:** Test keys ready to use

### **Step 5: Get Live API Keys (5 min)**
1. Once test phase is complete:
2. Toggle to "Live Mode"
3. Copy live keys:
   - [ ] Key ID (starts with `rzp_live_`)
   - [ ] Key Secret (HIGHLY SECRET!)
4. **Result:** Ready for production!

---

## ⏱️ Timeline

| Step | Time | Status |
|------|------|--------|
| Create Account | 5 min | Immediate |
| Complete Profile | 10 min | Immediate |
| Add Bank Account | 10 min | 2-3 days for verification |
| Get Test Keys | 5 min | Immediate |
| Start Development | N/A | Can start while bank verifies |
| Get Live Keys | 5 min | After testing complete |
| Go Live | N/A | Ready! |

---

## 💡 Important Notes

### **About GST:**
- You do NOT need GST to use Razorpay
- GST only required when annual turnover exceeds ₹40 lakhs
- Once you cross that, register for GST and update Razorpay
- No penalty for upgrading later

### **About Business Verification:**
- Takes 1-3 business days
- You can get test API keys immediately
- Start development while verification is pending
- By the time you're ready for live payments, it will be done

### **About Bank Account Verification:**
- Razorpay sends 2-3 small deposits (₹1-₹10 each)
- You confirm these amounts in dashboard
- Takes 2-3 business days
- Can still develop meanwhile with test cards

### **About Test Mode:**
- Free! No charges for test transactions
- Use test cards: `4111 1111 1111 1111` (success)
- Test UPI: `success@razorpay`
- No real money involved

---

## 📞 Support Resources

### **Razorpay Documentation (No GST):**
- Sole Proprietor: https://razorpay.com/docs/accounts/verify-account/#sole-proprietor
- Account Types: https://razorpay.com/docs/accounts/account-types/
- Onboarding: https://razorpay.com/docs/accounts/onboarding/

### **Get Help:**
- **Razorpay Support Chat:** https://dashboard.razorpay.com/app/help
- **Contact Page:** https://razorpay.com/contact-us/
- **Email:** support@razorpay.com
- **Phone:** +91-22-4949-8989

### **FAQ:**
- **Do I need GST?** No (if turnover < ₹40 lakhs/year)
- **How long does verification take?** 1-3 business days
- **Can I start development now?** Yes! Use test keys immediately
- **What if I don't have PAN?** Apply online at https://incometax.gov.in/ (takes 2-3 weeks)
- **Can I use someone else's PAN?** No, must be yours
- **Can I use business address instead of residential?** Yes, just provide proof

---

## 🎯 Action Items (Today)

**Priority 1 (Do Now):**
1. [ ] Gather documents:
   - [ ] PAN number
   - [ ] Aadhaar number
   - [ ] Bank account details
   - [ ] Address proof (utility bill, etc.)

**Priority 2 (Do This Week):**
1. [ ] Go to https://razorpay.com/signup and create account
2. [ ] Complete profile with your details
3. [ ] Add bank account
4. [ ] Get test API keys

**Priority 3 (Next Steps):**
1. [ ] Verify bank account (Razorpay will send test deposits)
2. [ ] Start development with test keys
3. [ ] Test payment flow thoroughly
4. [ ] Request live keys when ready

---

## ✨ You're Good to Go!

You have **everything you need** to set up Razorpay without GST. It's a standard and fully supported setup. Just follow the steps above and you'll be live in a few days!

**Questions?** Check the support links or contact Razorpay support directly.

**Ready to start?** Reply once you have the test API keys and I'll begin the implementation!
