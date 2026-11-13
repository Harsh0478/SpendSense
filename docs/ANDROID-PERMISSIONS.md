# Android transaction-import permissions

**Do not declare `READ_SMS` or `RECEIVE_SMS` in the first Android manifest.** The initial build uses manual entry and statement import while the product's Play Console eligibility is assessed.

Google Play's current SMS/Call Log policy explicitly lists **SMS-based money management (for example, budget tracking)** as a possible exception use case for SMS permissions. The permission list includes `READ_SMS`, `RECEIVE_MMS`, `RECEIVE_SMS` and `RECEIVE_WAP_PUSH`. However, the exception is conditional: Google Play says there must be no alternative method to provide the core functionality, the feature must be core to the app, permissions must be declared in Play Console, and the exception remains subject to review and approval. Do not assume SpendSense will be granted access.

Policy source: https://support.google.com/googleplay/android-developer/answer/10208820

## MVP behavior

- Manual transaction creation remains available.
- CSV and PDF statement import are the preferred broad-availability alternatives.
- SMS import stays disabled until the product owner decides whether to pursue the Play Console declaration/exception or distribute outside Google Play.
- If any SMS feature is later added, it must have a prominent disclosure, explicit user consent, a narrowly scoped parser, no upload of raw SMS, and immediate deletion of temporary message content after parsing.

The Play policy page also announces a future change effective **January 27, 2027** concerning phone-call verification via `READ_CALL_LOG`; that change does not create an SMS permission entitlement for this app.
