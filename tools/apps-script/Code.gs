// Sổ Tay MThanglee – báo phiếu mới qua email. Tạo tự động bởi web/scripts/build-apps-script.mjs, đừng sửa tay.
var SoTay = (function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	// src/domain/ceremony.ts
	const ALL = [
		{
			k: "kind",
			l: "Loại lễ",
			type: "select",
			opts: [
				"Cưới",
				"Đính hôn",
				"Tiệc báo hỷ"
			]
		},
		{
			k: "date",
			l: "Ngày tổ chức",
			req: true,
			type: "date"
		},
		{ sec: "Cô dâu & chú rể" },
		{
			k: "bride",
			l: "Tên cô dâu",
			req: true,
			ph: "vd: Nguyễn Thị A"
		},
		{
			k: "groom",
			l: "Tên chú rể",
			req: true,
			ph: "vd: Trần Văn B"
		},
		{
			k: "phoneBride",
			l: "Số điện thoại cô dâu",
			type: "tel"
		},
		{
			k: "phoneGroom",
			l: "Số điện thoại chú rể",
			req: true,
			type: "tel"
		},
		{
			sec: "Nhà gái",
			hideFor: ["Tiệc báo hỷ"]
		},
		{
			k: "addrBride",
			l: "Địa chỉ nhà gái",
			full: true,
			hint: "Nếu khó tìm, dán link Google Maps",
			hideFor: ["Tiệc báo hỷ"]
		},
		{
			k: "tMakeup",
			l: "Giờ makeup (trang điểm)",
			type: "time",
			hideFor: ["Tiệc báo hỷ"]
		},
		{
			k: "tMakeupDone",
			l: "Giờ cô dâu cần makeup xong",
			type: "time",
			derived: true,
			from: "tArrive",
			hideFor: ["Tiệc báo hỷ"],
			hint: "Tự tính: trước giờ nhà trai trình lễ 1 tiếng 30 phút, để ekip có mặt và bắt đầu chụp",
			per: { "Đính hôn": {
				minus: 60,
				hint: "Tự tính: trước giờ nhà trai trình lễ 1 tiếng, để ekip có mặt và bắt đầu chụp"
			} }
		},
		{
			k: "tCrewBride",
			l: "Giờ ekip có mặt ở nhà gái",
			type: "time",
			derived: true,
			from: "tArrive",
			minus: 105,
			hideFor: ["Tiệc báo hỷ"],
			hint: "Tự tính: trước giờ cô dâu makeup xong 15 phút",
			per: { "Đính hôn": { minus: 75 } }
		},
		{
			sec: "Nhà trai",
			hideFor: ["Tiệc báo hỷ"]
		},
		{
			k: "addrGroom",
			l: "Địa chỉ nhà trai",
			req: true,
			full: true,
			hint: "Nếu khó tìm, dán link Google Maps",
			hideFor: ["Tiệc báo hỷ"]
		},
		{
			k: "tDepart",
			l: "Giờ nhà trai xuất phát đến nhà gái",
			type: "time",
			hideFor: ["Tiệc báo hỷ"]
		},
		{
			k: "tCrewGroom",
			l: "Giờ ekip có mặt ở nhà trai",
			type: "time",
			derived: true,
			from: "tDepart",
			hideFor: ["Tiệc báo hỷ"],
			hint: "Tự tính: trước giờ nhà trai xuất phát 1 tiếng 30 phút",
			per: { "Đính hôn": {
				minus: 60,
				hint: "Tự tính: trước giờ nhà trai xuất phát 1 tiếng"
			} }
		},
		{
			k: "tArrive",
			l: "Giờ nhà trai có mặt tại nhà gái & trình lễ",
			type: "time",
			hideFor: ["Tiệc báo hỷ"]
		},
		{
			k: "tRuoc",
			l: "Giờ rước dâu từ nhà gái về nhà trai",
			type: "time",
			hideFor: ["Đính hôn", "Tiệc báo hỷ"]
		},
		{
			sec: "Nhà hàng",
			hideFor: ["Đính hôn"]
		},
		{
			k: "addrRest",
			l: "Địa chỉ nhà hàng",
			full: true,
			hint: "Tên nhà hàng / sảnh, hoặc link Google Maps",
			hideFor: ["Đính hôn"],
			reqFor: ["Tiệc báo hỷ"]
		},
		{
			k: "tWelcome",
			l: "Giờ đón khách tại nhà hàng",
			type: "time",
			hideFor: ["Đính hôn"]
		},
		{
			k: "tParty",
			l: "Giờ đãi tiệc tại nhà hàng",
			type: "time",
			hideFor: ["Đính hôn"]
		},
		{
			k: "tMakeupDone",
			l: "Giờ cô dâu cần makeup xong",
			type: "time",
			derived: true,
			from: "tWelcome",
			hideFor: ["Cưới", "Đính hôn"],
			hint: "Tự tính: trước giờ đón khách 1 tiếng 30 phút, để ekip có mặt và bắt đầu chụp"
		}
	];
	/** Form fields (with section headers) for a ceremony kind. */
	function fieldsFor(kind) {
		return ALL.filter((f) => !f.hideFor?.includes(kind)).map(({ hideFor, reqFor, per, ...f }) => ({
			...f,
			...reqFor?.includes(kind) ? { req: true } : {},
			...per?.[kind] || {}
		}));
	}
	const TIME_KEYS = [
		"tMakeup",
		"tDepart",
		"tArrive",
		"tRuoc",
		"tWelcome",
		"tParty"
	];
	ALL.filter((f) => f.k && !f.derived).map((f) => f.k);
	// src/domain/types.ts
	const KINDS = [
		"Cưới",
		"Đính hôn",
		"Tiệc báo hỷ"
	];
	const coupleName = (w) => [w.bride, w.groom].map((s) => (s || "").trim()).filter(Boolean).join(" & ") || "Chưa có tên";
	new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Ho_Chi_Minh",
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	});
	const dmy = (date) => date ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : "";
	// src/domain/notify.ts
	const APP_URL = "https://sotay.mthangleestudio.com/";
	/** Plain-text email about a client's form, or null when it has no answers. */
	function buildEmail(inv) {
		const a = inv.answers || {};
		if (!Object.values(a).some((v) => (v || "").trim())) return null;
		const kind = KINDS.includes(a.kind) ? a.kind : KINDS.includes(inv.kind) ? inv.kind : "Cưới";
		const update = !!inv.appliedAt;
		const subject = `${update ? "Khách bổ sung phiếu" : "Phiếu mới"}: ${coupleName({
			bride: a.bride || "",
			groom: a.groom || ""
		})} – ${kind} ${a.date ? dmy(a.date) : ""}`.trim();
		const fields = fieldsFor(kind).filter((f) => f.k && !f.derived && f.k !== "kind");
		const lines = fields.filter((f) => (a[f.k] || "").trim()).map((f) => `${f.l}: ${f.k === "date" ? dmy(a[f.k]) : a[f.k].trim()}`);
		if ((a.note || "").trim()) lines.push(`Ghi chú thêm: ${a.note.trim()}`);
		const missing = fields.filter((f) => !(a[f.k] || "").trim()).map((f) => f.l);
		return {
			subject,
			body: [
				update ? "Khách vừa bổ sung phiếu thông tin." : "Khách vừa gửi phiếu thông tin.",
				"",
				`Loại lễ: ${kind}`,
				...lines,
				...missing.length ? ["", `Chưa có: ${missing.join(", ")}`] : [],
				"",
				`Mở Sổ Tay để đưa vào hồ sơ: ${APP_URL}`
			].join("\n")
		};
	}
	// src/domain/invite.ts
	const TEXT_KEYS = [
		"bride",
		"groom",
		"phoneBride",
		"phoneGroom",
		"date",
		"addrBride",
		"addrGroom",
		"addrRest"
	];
	/** Stable signature of a set of answers (key order doesn't matter). */
	function answersSig(a) {
		const s = JSON.stringify(Object.keys(a || {}).sort().map((k) => [k, (a || {})[k]]));
		let h1 = 5381, h2 = 52711;
		for (let i = 0; i < s.length; i++) {
			const c = s.charCodeAt(i);
			h1 = (h1 * 33 ^ c) >>> 0;
			h2 = h2 * 31 + c >>> 0;
		}
		return h1.toString(36) + h2.toString(36);
	}
	[...TEXT_KEYS, ...TIME_KEYS];
	// scripts/apps-script/runtime.ts
	const DB = "https://firestore.googleapis.com/v1/projects/sotay-mthanglee/databases/(default)/documents";
	function decode(v) {
		if ("stringValue" in v) return v.stringValue;
		if ("integerValue" in v) return Number(v.integerValue);
		if ("booleanValue" in v) return v.booleanValue;
		if ("timestampValue" in v) return v.timestampValue;
		if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue?.fields || {}).map(([k, x]) => [k, decode(x)]));
		if ("arrayValue" in v) return (v.arrayValue?.values || []).map(decode);
		return null;
	}
	function call(url, method, payload) {
		const r = UrlFetchApp.fetch(url, {
			method,
			contentType: "application/json",
			muteHttpExceptions: true,
			headers: {
				Authorization: "Bearer " + ScriptApp.getOAuthToken(),
				"X-Goog-User-Project": "sotay-mthanglee"
			},
			...payload ? { payload: JSON.stringify(payload) } : {}
		});
		const code = r.getResponseCode();
		if (code < 200 || code >= 300) throw new Error(`${method} ${code}: ${String(r.getContentText()).slice(0, 200)}`);
		return JSON.parse(r.getContentText() || "{}");
	}
	const MARGIN_MS = 3e5;
	/** One check: email every newly submitted form whose answers haven't been emailed yet.
	*  Throws when anything failed, so Google emails the owner about the failed run. */
	function kiemTraPhieu() {
		const lock = LockService.getScriptLock();
		if (!lock.tryLock(0)) return;
		try {
			const props = PropertiesService.getScriptProperties();
			const cache = CacheService.getScriptCache();
			const startedAt = /* @__PURE__ */ new Date();
			const last = props.getProperty("lastCheck");
			const since = (/* @__PURE__ */ new Date((last ? Date.parse(last) : startedAt.getTime() - 864e5) - MARGIN_MS)).toISOString();
			const rows = call(`${DB}:runQuery`, "post", { structuredQuery: {
				from: [{ collectionId: "invites" }],
				where: { fieldFilter: {
					field: { fieldPath: "submittedAt" },
					op: "GREATER_THAN",
					value: { timestampValue: since }
				} }
			} });
			const to = Session.getEffectiveUser().getEmail();
			let failed = 0;
			for (const row of rows || []) try {
				const d = row.document;
				if (!d) continue;
				const id = String(d.name).split("/invites/")[1];
				const inv = decode({ mapValue: { fields: d.fields } });
				if (inv.org !== "mthanglee" || inv.status !== "submitted") continue;
				const sig = answersSig(inv.answers || {});
				if (inv.notifiedSig === sig) continue;
				const key = "sent:" + id + ":" + sig;
				if (!cache.get(key)) {
					const mail = buildEmail(inv);
					if (!mail) continue;
					MailApp.sendEmail({
						to,
						subject: mail.subject,
						body: mail.body,
						name: "Sổ Tay MThanglee"
					});
					cache.put(key, "1", 21600);
				}
				call(`${DB}/invites/${encodeURIComponent(id)}?updateMask.fieldPaths=notifiedSig`, "patch", { fields: { notifiedSig: { stringValue: sig } } });
			} catch (e) {
				failed++;
				Logger.log("Lỗi khi báo một phiếu: " + e);
			}
			if (failed) throw new Error(`Có ${failed} phiếu chưa báo được, lần sau sẽ thử lại`);
			props.setProperty("lastCheck", startedAt.toISOString());
		} finally {
			lock.releaseLock();
		}
	}
	/** Run once after pasting: checks every minute from now on. */
	function caiDat() {
		for (const t of ScriptApp.getProjectTriggers()) if (t.getHandlerFunction && t.getHandlerFunction() === "kiemTraPhieu") ScriptApp.deleteTrigger(t);
		ScriptApp.newTrigger("kiemTraPhieu").timeBased().everyMinutes(1).create();
		kiemTraPhieu();
		Logger.log("Đã cài xong: mỗi phút Sổ Tay sẽ kiểm tra phiếu mới và gửi email cho " + Session.getEffectiveUser().getEmail());
	}
	/** Sends a sample email so you can see what it looks like. */
	function guiThu() {
		const mail = buildEmail({
			kind: "Cưới",
			answers: {
				bride: "Lan",
				groom: "Minh",
				date: "2027-02-15",
				phoneGroom: "0905 000 000",
				tArrive: "08:00"
			}
		});
		MailApp.sendEmail({
			to: Session.getEffectiveUser().getEmail(),
			subject: "[Thử] " + mail.subject,
			body: mail.body,
			name: "Sổ Tay MThanglee"
		});
		Logger.log("Đã gửi email thử.");
	}
	exports.caiDat = caiDat;
	exports.guiThu = guiThu;
	exports.kiemTraPhieu = kiemTraPhieu;
	return exports;
})({});

function kiemTraPhieu() { SoTay.kiemTraPhieu() }
function caiDat() { SoTay.caiDat() }
function guiThu() { SoTay.guiThu() }
