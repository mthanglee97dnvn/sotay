# Product

Sổ Tay Nhắc Việc: the in-house operations notebook of MThanglee Studio, a wedding photojournalism studio in Đà Nẵng. Owner: Lê Minh Thắng (MThanglee).

Written 18/11/2026 from what the owner has said while building it; review and correct anything stale.

## Platform
web

## Stack
Vite + Preact + @preact/signals + TypeScript (`web/`), Firebase Spark (free) for Google sign-in and Firestore, GitHub Pages hosting at https://sotay.mthangleestudio.com. Public client form is a separate light entry (`form.html`). New-form email alerts come from an Apps Script on the owner's Google account. No paid plan, no app stores.

## Users
- The owner (only admin: edits, grants roles, sees summaries) and his wife, who answer the fanpage, collect couples' wedding-day schedules and plan shoots.
- A small ekip (up to 10–20 Gmail accounts) with "edit" or "view only" roles.
- Couples (and often their parents) who open a form link on their phone, usually from Messenger or Zalo, and fill in their schedule and addresses.

## Product Purpose
Take in each couple's wedding-day details, keep one profile per ceremony (đám hỏi, cưới, tiệc báo hỷ), count down upcoming weddings to remind consult appointments, and hold to-do reminders for the team.

## Positioning
A private working tool, not a product for sale. Ekip scheduling stays in Framevis, and Framevis plus Google Calendar are the source of truth for bookings; Sổ Tay follows them.

## Operating Context
- Peak load around 57 weddings a month.
- Used mostly on iPhones and iPads during busy days, sometimes on a computer.
- Delivery of photos and video is tracked outside Sổ Tay (the Kho sản phẩm tab and the late-delivery filter were removed on 22 Nov 2026; old `photo`/`video` link fields stay in Firestore untouched).
- Wedding-day timing rules (makeup finished 1h30 before trình lễ, ekip at the groom's house 1h30 before departure, 1 hour for đính hôn) are business rules the form computes and explains to the couple.

## Capabilities and Constraints
- Must stay free (Firebase Spark, GitHub Pages).
- Main app bundle budget 200 KB gzip, client form 80 KB gzip (`web/scripts/size.mjs`).
- Clients may submit incomplete forms and come back to the same link to add details later.
- One form link per profile (`formToken`). The link opens prefilled with the profile's current client-facing fields (a `prefill` copy on the invite, refreshed whenever an editor saves the profile; internal notes, consult, delivery and channel never go there). On resubmit the client also sends `base` (the prefill they saw), and applying takes only answers that differ from it, so the owner's newer edits and blank fields never overwrite the profile.

## Brand Commitments
- Client-facing voice: the studio says "mình", the client is "bạn" / "hai bạn", warm and casual; never "anh chị".
- Inside the app the owner is addressed as "anh".
- Visual identity lives in DESIGN.md (contact-sheet paper, charcoal ink, lens-blue actions, grease-pencil red only for what is late).

## Evidence on Hand
Live app and real calendar data; no formal user research.

## Product Principles
- One clear next step per screen: who to consult, what is late, what to send.
- Red means late, nothing else.
- Explain the why to couples (makeup and ekip arrival times) instead of only asking for times.

## Accessibility & Inclusion
WCAG 2.1 AA: keyboard and screen-reader use, 44px touch targets, Light and Dark themes (Tự động follows the device, switchable in the app); the client form is always Light. Couples' relatives may be older readers on small phones, so form labels stay large and clear.
