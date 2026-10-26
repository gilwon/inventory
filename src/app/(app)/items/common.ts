// 품목·위치 화면이 함께 쓰는 오류 문구 변환, 검증 보조, 공통 스타일 상수

export type FormState = { error: string | null; ok?: boolean };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}

// DB 오류를 한국어 안내 문구로 바꾼다. 알 수 없는 오류는 내부 메시지를 숨긴다.
export function koError(e: { message: string; code?: string }): string {
  const m = e.message ?? "";
  if (e.code === "23505") {
    if (m.includes("items_sku_lower_key")) return "이미 사용 중인 SKU입니다.";
    if (m.includes("items_barcode_lower_key"))
      return "이미 사용 중인 바코드입니다.";
    if (m.includes("locations_code_lower_key"))
      return "이미 사용 중인 위치 코드입니다.";
    return "이미 같은 값이 있습니다.";
  }
  if (e.code === "23514") return "입력값이 허용 범위를 벗어났습니다.";
  // 트리거가 보내는 한국어 메시지는 그대로 보여 준다.
  if (m.includes("보관할 수 없습니다")) return `${m}.`;
  if (m.includes("하위로")) return `${m}.`;
  return "저장에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

// RPC 오류는 한글 문구만 그대로 보여 주고, 그 외(DB 원문)는 일반 문구로 바꾼다.
export function koRpcError(e: { message: string }): string {
  const m = e.message ?? "";
  return /[가-힣]/.test(m)
    ? m
    : "처리에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

export const focusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-blue-400";
export const inputCls = `block w-full min-w-0 rounded-md border border-zinc-400 bg-white px-3 py-2 text-base text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 ${focusRing}`;
export const btnPrimary = `inline-flex min-h-11 items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60 ${focusRing} focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900`;
export const btnSecondary = `inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-400 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 ${focusRing}`;
export const cardCls =
  "rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900";
export const badgeCls =
  "inline-block rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100";
export const linkCls = `font-medium text-blue-800 underline underline-offset-2 hover:text-blue-950 dark:text-blue-300 dark:hover:text-blue-200 ${focusRing} rounded-sm`;
export const errCls =
  "text-sm font-medium text-red-700 dark:text-red-400";
