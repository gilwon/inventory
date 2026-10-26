// KST 시각 표시와 수량 표시 함수 (날짜·수량 표시는 이 파일의 함수만 쓴다)

const kstFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// UTC ISO 문자열을 "YYYY-MM-DD HH:mm" (KST) 로 바꾼다. 잘못된 값이면 빈 문자열.
export function formatKst(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const p = Object.fromEntries(
    kstFormatter.formatToParts(date).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

// 수량을 천 단위 구분과 단위로 표시한다. 예: formatQty(1234, "개") -> "1,234 개"
export function formatQty(n: number, unit = ""): string {
  const num = n.toLocaleString("ko-KR");
  return unit ? `${num} ${unit}` : num;
}
