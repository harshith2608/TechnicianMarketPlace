# Legal Documents - Quick Reference Guide

**For:** Developers, Product Managers, Support Team  
**Updated:** January 17, 2026

---

## 🎯 What Every Role Should Know

### For Developers
**Key Files:**
- `docs/TERMS_OF_SERVICE.md` → Reference when building cancellation logic
- `docs/CANCELLATION_POLICY.md` → Build 2-hour cancellation window
- `docs/WARRANTY_POLICY.md` → Build warranty claim feature
- `docs/PRIVACY_POLICY.md` → Data handling requirements

**Key Implementation:**
```
1. Cancellation: Must allow FREE cancellation 2+ hours before
2. Warranty: 7-day claim window from completion date
3. Materials: Customer must provide basic items (water, etc.)
4. Timestamps: Use server time, not local device time
5. Data: Delete within 30 days of account deletion
```

### For Product Managers
**Key Talking Points:**
- ✅ 7-day service warranty (competitive advantage)
- ✅ 2-hour free cancellation (fair, transparent)
- ✅ Material requirements clearly defined (avoid disputes)
- ✅ Platform protections (legally sound)
- ✅ GDPR/CCPA compliant (international ready)

**When Users Complain:**
- Service quality → "Check 7-day warranty policy"
- Cancellation charge → "Policy allows charges within 2 hours"
- Data privacy → "See Privacy Policy"
- Responsibility → "See Terms of Service"

### For Support Team
**Quick Resolution Guide:**

| User Issue | Reference Doc | Action |
|-----------|---------------|--------|
| "Why was I charged for cancellation?" | Cancellation Policy | Check if 2+ hours before booking → refund if yes |
| "Service failed, want refund" | Warranty Policy | Within 7 days? → approve warranty claim |
| "What materials do I need?" | Terms of Service (Section 5) | Provide material checklist |
| "Technician didn't show up" | Cancellation Policy | Technician no-show = 100% refund + 5% bonus |
| "Privacy question" | Privacy Policy | Direct to appropriate section |
| "Platform responsibility?" | Platform Disclaimer | "Platform is marketplace, not service provider" |

---

## ⏰ Key Timelines to Remember

```
Cancellation:
├─ 2+ hours before → FREE (₹0)
├─ 30 mins to 2 hours → 50% charge
└─ Less than 30 mins → 100% charge

Warranty Claims:
├─ Must file within 7 days of completion
├─ Platform reviews in 2-3 days
├─ Technician responds in 1-2 days
└─ Final decision in 7 days total

Data Retention:
├─ Active account → Forever (or until deleted)
├─ After deletion → 30 days to delete
├─ Financial records → 7 years (legal requirement)
└─ Backups → 90 days after deletion

User Consent:
├─ New users → Must accept all docs
├─ Policy updates → Must re-accept
└─ No acceptance → Cannot book services
```

---

## 💰 Cost & Liability Structure

```
Customer Cancels:
├─ 2+ hours before: Customer pays ₹0 → Full refund
├─ 30 min to 2 hours: Customer pays 50% → Tech gets 50%
└─ <30 mins or no-show: Customer pays 100% → Tech gets 100%

Technician No-Shows:
├─ Customer pays: ₹0 (refunded)
├─ Technician pays: 10% penalty to Platform
└─ Customer gets: +5% bonus credit

Platform Liability:
├─ Maximum: Amount paid for service
├─ Example: Service ₹1,000 → Platform max liability ₹1,000
└─ Not liable for: Damage beyond service cost
```

---

## 🛡️ What Platform is Responsible For

### ✅ Platform IS Responsible For:
- Processing payments securely
- Matching customers with technicians
- 7-day service warranty claims
- Dispute mediation
- User account management
- Data privacy & security
- Platform technical issues (if any)

### ❌ Platform is NOT Responsible For:
- Service quality or outcomes
- Technician professionalism
- Property damage (unless Platform negligent)
- Personal injury (unless Platform negligent)
- Technician availability
- Service delays
- Technician no-shows (after no-show policy applied)

---

## 📋 Material Requirements Checklist

**Every Customer MUST Provide:**

### Universal (All Services):
- [ ] Access to service location (keys, gates)
- [ ] Adequate lighting
- [ ] Safe working environment
- [ ] Electrical supply (if needed)
- [ ] Water supply and drainage (if needed)
- [ ] Clear workspace
- [ ] Workspace for tools/equipment

### Service-Specific:
**Plumbing:**
- [ ] Water supply access
- [ ] Drainage access
- [ ] Main shut-off valve location

**Electrical:**
- [ ] Power supply access
- [ ] Circuit breaker location
- [ ] Clear workspace for panel

**Cleaning:**
- [ ] Access to all areas
- [ ] Cleaning supplies (if using customer's)
- [ ] Furniture protection info

**Carpentry:**
- [ ] Protective coverings for furniture
- [ ] Material storage space
- [ ] Access to utilities (if needed)

**If NOT provided:** Technician can charge extra for providing materials

---

## 🚨 Dispute Resolution Quick Reference

### Customer Service Issue Dispute

```
Step 1: Direct Contact (48 hours)
- Customer & Technician try to resolve
- Platform available for questions

Step 2: Platform Mediation (5 business days)
- Customer submits issue details
- Platform reviews documentation
- Technician responds
- Platform mediates

Step 3: Platform Decision (Day 5-7)
- Platform makes final decision
- Binding on both parties

Step 4: Legal Action (Optional)
- Either party can pursue legal remedies
- Last resort
```

### Warranty Claim Process

```
Day 1: Customer files claim with photos
Day 2-3: Platform reviews
Day 3-4: Technician responds
Day 5-6: Counter-arguments reviewed
Day 7: Final decision
└─ Remedy: FREE redo or refund
```

---

## 📞 Escalation Path for Support

```
Level 1: Automated Response
- Send relevant policy doc
- Explain decision
- Offer next steps

Level 2: Support Team Review
- Manual review of issue
- Check policy against case
- Offer appropriate remedy

Level 3: Manager Review
- If customer not satisfied
- Manager re-evaluates
- May override support decision

Level 4: Legal/Executive
- Complex legal issues
- Precedent-setting cases
- Escalate to management
```

---

## 🔄 Common Support Scenarios & Responses

### Scenario 1: "Service Failed, I Want Refund"
**Check:**
1. Within 7 days of completion? → YES
2. Service quality issue or outcome issue? → QUALITY ISSUE
3. Documented with photos? → YES

**Response:** "You're covered by our 7-day warranty! We'll arrange a free redo or refund your service cost."

**If outside 7 days:** "The warranty period has expired. We recommend contacting the technician directly for follow-up work."

---

### Scenario 2: "I Cancelled, But Was Charged"
**Check:**
1. How much time before booking?
2. Check cancellation window from policy

**Response:**
- If 2+ hours: "This shouldn't have been charged. Refunding your payment immediately."
- If <2 hours: "Per our cancellation policy, ₹X is charged for cancellations within 2 hours. This is to fairly compensate our technician for blocked time."

---

### Scenario 3: "Technician Didn't Show Up"
**Check:**
1. Confirm technician no-show (not customer confusion)
2. Refund customer 100%
3. Apply 10% penalty to technician

**Response:** "We apologize! Since the technician didn't show up, you're getting a full refund plus a 5% bonus credit (₹X) for your next booking."

---

### Scenario 4: "I Provided Materials, Technician Didn't Use Them"
**Reference:** Terms of Service Section 5

**Response:** "If the technician used different materials without your approval, you can file a warranty claim within 7 days explaining the issue. If there's a quality problem due to material choice, we can arrange a redo."

---

### Scenario 5: "What Happens if Service Causes Damage?"
**Reference:** Platform Disclaimer + Warranty Policy

**Response:** "If damage occurs during the service due to technician negligence, this is covered by our service warranty within 7 days. Please document with photos and file a claim. We'll either arrange repairs or issue a refund for that portion of work."

---

## 📧 Email Templates

### Warranty Claim Approved - Redo Offered
```
Subject: Warranty Claim Approved - We'll Fix It

Hi [Customer Name],

Your warranty claim has been approved! 
[Technician Name] will contact you within 24 hours to reschedule the repair at NO ADDITIONAL COST.

Your 7-day warranty covers:
- Complete redo of the work
- No labor charges
- Any necessary materials
- New 7-day warranty on redo work

Expected completion: Within 3-5 business days

Thank you for choosing Technician Marketplace!
```

### Cancellation Charge Explanation
```
Subject: About Your Cancellation Charge

Hi [Customer Name],

You cancelled your booking with [Technician Name] at [time], 
which was [X minutes/hours] before your scheduled appointment.

Per our Cancellation Policy:
- Cancellations 2+ hours before: FREE (no charge)
- Cancellations 30 mins to 2 hours: 50% charge
- Cancellations <30 mins: 100% charge

Your cancellation was [X minutes] before, so a [X]% charge of ₹[X] was applied.

This policy ensures fairness to our technicians when their time is blocked.

If you have questions, reply to this email.
```

---

## 🎓 Training Checklist for New Support Staff

- [ ] Read all 5 legal documents (2 hours)
- [ ] Understand 7-day warranty policy
- [ ] Understand 2-hour cancellation window
- [ ] Know material requirements
- [ ] Know dispute resolution process
- [ ] Practice common scenarios (above)
- [ ] Understand liability limitations
- [ ] Know how to escalate
- [ ] Know data privacy basics
- [ ] Pass training quiz (80%+ required)

---

## 🔗 Quick Links (For Bookmarks)

```
Legal Documents Folder:
/docs/

Specific Documents:
- Terms: /docs/TERMS_OF_SERVICE.md
- Warranty: /docs/WARRANTY_POLICY.md
- Cancellation: /docs/CANCELLATION_POLICY.md
- Privacy: /docs/PRIVACY_POLICY.md
- Disclaimer: /docs/PLATFORM_DISCLAIMER.md
- Summary: /docs/LEGAL_COMPLIANCE_SUMMARY.md
```

---

**Status: ✅ COMPLETE & READY FOR REFERENCE**

All staff should bookmark this document and the individual legal documents for quick reference during support interactions.

