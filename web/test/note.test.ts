import { describe, it, expect } from 'vitest'
import { timelineNote } from '../src/domain/note'
import { parseBooking } from '../src/domain/calparse'
import type { Wedding } from '../src/domain/types'

const w = (o: Partial<Wedding>): Wedding => ({
  id: 'x', kind: 'Cưới', date: '2026-11-22', bride: 'Thanh Huyền', groom: 'Văn Thương', phoneBride: '', phoneGroom: '',
  addrBride: '', addrGroom: '', addrRest: '', times: {}, notes: '', ...o } as Wedding)

const full = w({
  addrGroom: '130/52 Trường Chinh', phoneGroom: '0935458040', addrBride: 'Ksan Santori 769 đường Nguyễn Tất Thành', phoneBride: '0326154149',
  addrRest: 'New Orient ( Tầng 5 )', notes: 'Chụp ảnh đầy đủ 2 họ nhà trai và nhà gái cùng cô dâu chú rể tại nhà hàng',
  times: { tDepart: '08:00', tArrive: '08:30', tRuoc: '08:45', tMakeup: '03:30', tWelcome: '11:00', tParty: '12:00' } })

describe('timelineNote', () => {
  it("writes a Cưới profile in the owner's timeline format", () => {
    expect(timelineNote(full)).toBe(`2026_WEDDING TIMELINE / THANH HUYỀN - VĂN THƯƠNG

NGÀY 22/11

* Nhà trai
- Địa chỉ : 130/52 Trường Chinh
- SĐT : 0935458040
- Giờ Nhà trai xuất phát : 8h00 (6h30 Ekip có mặt)
- Giờ nhà trai có mặt trình lễ : 8h30
- Giờ rước dâu từ nhà gái về nhà trai : 8h45

* Nhà gái
- Địa chỉ : Ksan Santori 769 đường Nguyễn Tất Thành
- SĐT : 0326154149
- Giờ makeup buổi sáng : 3h30 (6h45 Ekip có mặt)

* Nhà hàng
- Tên nhà hàng : New Orient ( Tầng 5 )
- Giờ đón khách : 11h00
- Giờ đãi tiệc : 12h00

Note :
- Chụp ảnh đầy đủ 2 họ nhà trai và nhà gái cùng cô dâu chú rể tại nhà hàng`)
  })
  it('Đính hôn: no rước dâu, no nhà hàng, 1-hour ekip rules', () => {
    const t = timelineNote(w({ ...full, kind: 'Đính hôn' }))
    expect(t).not.toMatch(/rước dâu|Nhà hàng|đón khách/)
    expect(t).toContain('- Giờ Nhà trai xuất phát : 8h00 (7h00 Ekip có mặt)')
    expect(t).toContain('- Giờ makeup buổi sáng : 3h30 (7h15 Ekip có mặt)')
  })
  it('Tiệc báo hỷ: only the restaurant, with the ekip time on the guest-welcome line', () => {
    const t = timelineNote(w({ ...full, kind: 'Tiệc báo hỷ' }))
    expect(t).not.toMatch(/Nhà trai|Nhà gái/)
    expect(t).toContain('- Giờ đón khách : 11h00 (9h30 Ekip có mặt)')
  })
  it('leaves out empty lines and empty sections; no ekip time without its anchor', () => {
    const t = timelineNote(w({ addrBride: '267 Núi Thành', times: { tMakeup: '04:30' } }))
    expect(t).toBe(`2026_WEDDING TIMELINE / THANH HUYỀN - VĂN THƯƠNG

NGÀY 22/11

* Nhà gái
- Địa chỉ : 267 Núi Thành
- Giờ makeup buổi sáng : 4h30`)
  })
  it('reads back through the calendar sync parser', () => {
    const b = parseBooking({ id: 'e', summary: 'Phóng sự cưới - Thanh Huyền / Page (2 Chụp)', description: timelineNote(full), start: { dateTime: '2026-11-22T06:00:00+07:00' } } as never)!
    expect(b).toMatchObject({ bride: 'Thanh Huyền', groom: 'Văn Thương', addrGroom: '130/52 Trường Chinh', addrBride: 'Ksan Santori 769 đường Nguyễn Tất Thành', addrRest: 'New Orient ( Tầng 5 )', phoneGroom: '0935458040', phoneBride: '0326154149' })
    expect(b.times).toEqual(full.times)
  })
})
