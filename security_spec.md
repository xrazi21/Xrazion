# Security Specifications & Rules Testing (TDD)

## 1. Data Invariants
- **Identity Integrity**: A user can only write, update, or read their own `/users/{userId}` profile document and subcollection `/users/{userId}/transactions/{transactionId}`.
- **Strict Keys**: Field-level validation disables ghost/shadow fields by matching exact schema keys in creations and limiting updates.
- **Abuse Reports Routing**: Authenticated users can create reports `/reports/{reportId}` with `status = "Pending"`. Only administrators (manually registered) can update report statuses to `Reviewed` or `Dismissed` or list outstanding reports.

---

## 2. The "Dirty Dozen" Rogue Payloads
Here are 12 specific hostile payloads engineered to test the limits of our Firestore Security Gates, which must return `PERMISSION_DENIED`:

1.  **PII Blanket Read (Rogue Get)**
    - *Path*: `/users/attacker_uid` (attempted by `victim_auth_uid`)
    - *Action*: Read profile of another user.
    - *Outcome*: Expected `PERMISSION_DENIED`.
2.  **Shadow Update (Ghost Injection)**
    - *Path*: `/users/user_uid`
    - *Payload*: `{ "name": "Aditya", "vip": true, "ghost_field": "hacker_bypass" }`
    - *Outcome*: Prevented by key size checks and strict schema validations.
3.  **Self-Assigned Coins Increment**
    - *Path*: `/users/user_uid`
    - *Payload*: `{ "coins": 999999 }`
    - *Outcome*: Prevented by limiting updates to specific fields or locking immutable ones.
4.  **Transaction Hijack (Stealing Wallet logs)**
    - *Path*: `/users/victim_uid/transactions/random_tx`
    - *Payload*: Attempt to write new transaction into someone else's subcollection pathway.
    - *Outcome*: Expected `PERMISSION_DENIED`.
5.  **Illegal Admin Privilege Escalation**
    - *Path*: `/users/user_uid`
    - *Payload*: `{ "role": "admin", "isAdmin": true }`
    - *Outcome*: Blocked because profile schema doesn't accept role field, and `isAdmin` helper utilizes an explicit `/admins/` lookup instead of customizable auth token or profile claims.
6.  **Immortal Field Mutating (Overwriting createdAt)**
    - *Path*: `/users/user_uid/transactions/tx_123`
    - *Payload*: Modifying timestamp of an already success-completed transaction document.
    - *Outcome*: Expected `PERMISSION_DENIED` since transaction logs are immutable.
7.  **Resource Poisoning (Junk/Large ID Injection)**
    - *Path*: `/users/VERY_LONG_JUNK_CHARACTER_NAME_THAT_EXCEEDS_128_BYTES_TO_DROWN_WALLET_LOGS`
    - *Action*: Target document action.
    - *Outcome*: Expected `PERMISSION_DENIED` through `isValidId({userId})`.
8.  **Status State Skipping (Shortcut Bypass)**
    - *Path*: `/reports/rep_456`
    - *Action*: Non-admin sets status to `Reviewed` or `Dismissed` directly during creation.
    - *Outcome*: Blocked because validation helper forces `incoming().status == "Pending"`.
9.  **Relational Verification Spoofing (Orphan Transaction)**
    - *Path*: `/users/attacker_uid/transactions/tx_789`
    - *Payload*: Reference a transaction linked to a non-existent host or invalid timestamp.
    - *Outcome*: Expected `PERMISSION_DENIED`.
10. **Query Scraping (Insecure List)**
    - *Path*: `/users` collection list
    - *Action*: Query all profiles without `userId == request.auth.uid`.
    - *Outcome*: Blocked because line-by-line list check mandates self-profile only.
11. **Spoofed Email Signup**
    - *Path*: `/users/attacker_uid`
    - *Action*: Try to save verified profile even though `email_verified == false` in request.auth token.
    - *Outcome*: Expected `PERMISSION_DENIED`.
12. **Malicious Report Spoofing (Modifying Author Identity)**
    - *Path*: `/reports/rep_999`
    - *Payload*: Submitting a report listing another user's UID as author.
    - *Outcome*: Blocked by checking `request.auth.uid` against creator references.

---

## 3. Threat Model Evaluation Dashboard

| Attack vector | Vulnerability Vector | Gate Enforcment | Status |
|---|---|---|---|
| Identity Spoofing | Injecting sibling's UID | `request.auth.uid == userId` check | **SATIATED** |
| State Shortcutting | Standard user resolving reports | `isAdmin()` admin credentials checks | **SATIATED** |
| Resource Poisoning | Malformed bulky document IDs | `isValidId(docId)` regex string bounds | **SATIATED** |
| Shadow Updates | Unauthorized map parameters | `.affectedKeys().hasOnly([...])` diff | **SATIATED** |
