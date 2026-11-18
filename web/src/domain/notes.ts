import type { Kind } from './types'

// Explanations shown to the client under derived times. Kept out of ceremony.ts so the text
// loads only with the client form, not with the main app.

const makeupNote = (part: string, before: string) => `Đây là mốc quan trọng nhất của ${part}. Từ giờ này ekip bắt đầu chụp những tấm chân dung thật đẹp của cô dâu, cùng những hình ảnh bên người thân, bạn bè ${before}. Nếu makeup trễ, khoảng thời gian quý giá này sẽ bị rút ngắn hoặc bỏ lỡ, và nghi thức trước lễ dễ rối. Bạn báo giúp mình với chuyên viên trang điểm (makeup artist): đây là giờ phải hoàn thiện, không phải giờ bắt đầu, để bạn ấy tính giờ bắt đầu cho kịp nhé!`

const groomNote = (day: string, rite: string) => `Ekip đến sớm để ghi lại những khoảnh khắc đầu tiên của ${day} bên nhà trai: chú rể chỉnh trang áo vest, cài hoa, những phút bên bố mẹ và gia đình cạnh mâm quả, nghi thức thắp hương xin phép gia tiên, rồi cả đoàn lên đường sang nhà gái làm ${rite}. Bạn nhớ dậy sớm và chuẩn bị sẵn tóc tai, trang phục để ekip bắt đầu ngay khi đến, mọi thứ sẽ thong thả và trọn vẹn hơn nhé!`

export interface FieldNote { title: string; text: string }

export function noteFor(k: string | undefined, kind: Kind): FieldNote | undefined {
  if (k === 'tMakeupDone') return { title: 'Vì sao cô dâu cần makeup xong', text: kind === 'Tiệc báo hỷ' ? makeupNote('buổi tiệc', 'trước khi buổi tiệc bắt đầu') : makeupNote('buổi sáng', 'trước khi buổi lễ diễn ra') }
  if (k === 'tCrewGroom' && kind !== 'Tiệc báo hỷ') return { title: 'Vì sao ekip có mặt ở nhà trai', text: kind === 'Đính hôn' ? groomNote('ngày đính hôn', 'lễ đính hôn') : groomNote('ngày cưới', 'lễ xin dâu') }
  return undefined
}
