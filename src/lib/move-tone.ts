// 입고는 파란색, 출고는 빨간색으로 표시하는 글자색 클래스를 돌려준다.
export function moveTone(type: string): string {
  if (type === "receive") return "text-inbound";
  if (type === "issue") return "text-danger";
  return "";
}
