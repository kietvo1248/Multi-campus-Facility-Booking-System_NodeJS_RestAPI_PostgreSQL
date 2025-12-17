function normalizeToYYYYMMDD(dateInput) {
  if (!dateInput) throw new Error("Thiếu date");

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput;

  // MM/DD/YYYY (FE bạn đang gửi kiểu này)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
    const [mm, dd, yyyy] = dateInput.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }

  // fallback
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) throw new Error(`Date không hợp lệ: ${dateInput}`);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function slotTimeMap(slot) {
  const map = {
    1: { start: '07:00', end: '09:00' },
    2: { start: '09:00', end: '11:00' },
    3: { start: '11:00', end: '13:00' },
    4: { start: '13:00', end: '15:00' },
    5: { start: '15:00', end: '17:00' }
  };
  return map[Number(slot)];
}

function buildVNTime(yyyyMMdd, hhmm) {
  // ép timezone VN
  return new Date(`${yyyyMMdd}T${hhmm}:00+07:00`);
}

function calculateTimeRangeFromSlots(dateInput, slots) {
  const yyyyMMdd = normalizeToYYYYMMDD(dateInput);

  const sorted = [...slots].map(Number).sort((a, b) => a - b);
  if (sorted.length === 0) throw new Error("Slots rỗng");

  const first = slotTimeMap(sorted[0]);
  const last = slotTimeMap(sorted[sorted.length - 1]);
  if (!first || !last) throw new Error("Slot không hợp lệ");

  const startTime = buildVNTime(yyyyMMdd, first.start);
  const endTime = buildVNTime(yyyyMMdd, last.end);

  return { startTime, endTime };
}

module.exports = { calculateTimeRangeFromSlots };
