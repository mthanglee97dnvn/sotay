# Copy ghi chú (timeline note) — short design

**Why:** the owner pastes each wedding's schedule elsewhere (Framevis, Google Calendar, Zalo to the ekip) in his own note format. He wants a button in the profile that writes that note for him.

**Approved (owner, 26/11):** a "Copy ghi chú" button next to "Gửi phiếu cho khách điền" in the wedding sheet copies a note in his format:

```
2026_WEDDING TIMELINE / BRIDE - GROOM
(blank)
NGÀY dd/mm
(blank)
* Nhà trai
- Địa chỉ : …
- SĐT : …
- Giờ Nhà trai xuất phát : 8h00 (6h30 Ekip có mặt)
- Giờ nhà trai có mặt trình lễ : 8h30
- Giờ rước dâu từ nhà gái về nhà trai : 8h45
(blank)
* Nhà gái
- Địa chỉ : …
- SĐT : …
- Giờ makeup buổi sáng : 3h30 (6h15 Ekip có mặt)
(blank)
* Nhà hàng
- Tên nhà hàng : …
- Giờ đón khách : 11h00 (9h30 Ekip có mặt — tiệc báo hỷ only)
- Giờ đãi tiệc : 12h00
(blank)
Note :
- each line of the profile's notes
```

- Year in the title = the wedding's year. Names upper-cased.
- Times are written as `8h00`. Ekip times use the app's own derived fields (same rules as the form).
- Empty lines are left out; a section with nothing in it is left out. If a time is missing, its ekip time is left out too.
- By kind: Đính hôn has no rước dâu and no Nhà hàng. Tiệc báo hỷ has only Nhà hàng, with the ekip time on the đón khách line.
- Note = the profile's notes, one "- " line each (owner accepted).
- The text must parse back through `parseBooking` (calendar sync reads this format).
- Visible to editors (like the form button).

**Approaches:** a button that copies the text (chosen); a share sheet (phones only, no desktop); a preview screen first (extra tap, owner wants it quick).
