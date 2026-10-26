// 라벨 출력 형식(QR/바코드)의 타입과 Code128 바코드 가능 여부 검사 순수 함수

export type LabelFormat = "qr" | "barcode";

// 바코드 한 줄에 넣을 수 있는 최대 글자 수(칸 너비 약 55mm에서 스캔 가능한 모듈 폭을 지키는 상한)
export const BARCODE_MAX_LEN = 24;

export function isLabelFormat(v: unknown): v is LabelFormat {
  return v === "qr" || v === "barcode";
}

// Code128로 만들 수 있는 코드인지 확인한다. ASCII 32~126만, 1~24자.
export function canBarcode(code: string): boolean {
  return (
    code.length >= 1 &&
    code.length <= BARCODE_MAX_LEN &&
    [...code].every((c) => {
      const n = c.charCodeAt(0);
      return n >= 32 && n <= 126;
    })
  );
}

// 바코드로 만들 수 없는 코드만 중복 없이 입력 순서대로 돌려준다.
export function unsupportedCodes(codes: string[]): string[] {
  return [...new Set(codes)].filter((c) => !canBarcode(c));
}
