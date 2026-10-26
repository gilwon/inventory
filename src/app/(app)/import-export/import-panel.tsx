"use client";
// 파일 선택, 미리보기 표, 가져오기 확정을 맡는 클라이언트 컴포넌트

import { useRef, useState } from "react";

type RowStatus = "new" | "update" | "existing" | "ignored" | "error";
type Row = {
  sheet: string;
  row: number;
  label: string;
  status: RowStatus;
  reason: string;
};
type ApplyResult = {
  locations_created: number;
  items_created: number;
  items_updated: number;
  stocks_imported: number;
  stocks_ignored: number;
};

const STATUS: Record<RowStatus, { label: string; cls: string }> = {
  new: {
    label: "신규",
    cls: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  },
  update: {
    label: "갱신",
    cls: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  },
  existing: {
    label: "기존",
    cls: "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200",
  },
  ignored: {
    label: "수량 무시됨",
    cls: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  },
  error: {
    label: "오류",
    cls: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  },
};

const focus =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-blue-400";

// 서버 응답이 JSON 이 아니어도(용량 초과 등) 메시지를 만든다.
async function readJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return { error: "서버 응답을 읽을 수 없습니다. 파일 크기를 확인하세요" };
  }
}

export function ImportPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [hasError, setHasError] = useState(false);
  // 서버가 센 갱신 품목 수 (확정 후 결과의 "품목 N건 갱신"과 같은 기준)
  const [itemsUpdated, setItemsUpdated] = useState(0);
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ApplyResult | null>(null);

  async function send(url: string, f: File) {
    const body = new FormData();
    body.append("file", f);
    const res = await fetch(url, { method: "POST", body });
    return { res, data: await readJson(res) };
  }

  async function onPick(f: File | null) {
    setFile(f);
    setRows(null);
    setResult(null);
    setMessage(null);
    if (!f) return;
    setBusy("preview");
    try {
      const { res, data } = await send("/api/import/preview", f);
      if (!res.ok) setMessage(data.error ?? "미리보기를 만들지 못했습니다");
      else {
        setRows(data.rows);
        setHasError(data.hasError);
        setItemsUpdated(data.itemsUpdated);
      }
    } catch {
      setMessage("서버에 연결하지 못했습니다");
    }
    setBusy(null);
  }

  async function onApply() {
    if (!file) return;
    setBusy("apply");
    setMessage(null);
    try {
      const { res, data } = await send("/api/import/apply", file);
      if (!res.ok) {
        setMessage(data.error ?? "가져오기에 실패했습니다");
        // 서버 재검증에서 오류가 나왔으면 표를 최신으로 바꾼다.
        if (data.rows) {
          setRows(data.rows);
          setHasError(true);
          setItemsUpdated(data.itemsUpdated);
        }
      } else {
        setResult(data.result);
        setRows(null);
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
      }
    } catch {
      setMessage("서버에 연결하지 못했습니다");
    }
    setBusy(null);
  }

  // 오류 행을 위로 올리고 나머지는 파일 순서를 유지한다.
  const sorted = rows
    ? [...rows].sort(
        (a, b) => Number(b.status === "error") - Number(a.status === "error"),
      )
    : [];
  const count = (s: RowStatus) => rows?.filter((r) => r.status === s).length ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="import-file" className="mb-1 block text-sm font-medium">
          엑셀 파일(.xlsx)
        </label>
        <input
          ref={inputRef}
          id="import-file"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={busy !== null}
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          className={`block w-full max-w-full rounded-md border border-zinc-400 bg-white p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-200 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:file:bg-zinc-700 dark:file:text-zinc-100 ${focus}`}
        />
      </div>

      <div role="status" aria-live="polite" className="space-y-2">
        {busy === "preview" && <p className="text-sm">미리보기를 만드는 중입니다...</p>}
        {busy === "apply" && <p className="text-sm">가져오는 중입니다...</p>}
        {message && (
          <p className="rounded-md bg-red-100 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-200">
            {message}
          </p>
        )}
        {result && (
          <div className="rounded-md bg-green-100 p-3 text-sm text-green-900 dark:bg-green-950 dark:text-green-200">
            <p className="font-semibold">가져오기를 마쳤습니다.</p>
            <ul className="mt-1 list-disc pl-5">
              <li>위치 {result.locations_created}건 생성</li>
              <li>품목 {result.items_created}건 생성</li>
              <li>품목 {result.items_updated}건 갱신</li>
              <li>수량 {result.stocks_imported}건 입고</li>
              <li>수량 {result.stocks_ignored}건 무시</li>
            </ul>
          </div>
        )}
      </div>

      {rows && (
        <div className="space-y-3">
          <p className="text-sm">
            총 {rows.length}행. 신규 {count("new")}, 갱신 {itemsUpdated}, 기존 {count("existing")}
            , 수량 무시됨 {count("ignored")}, 오류 {count("error")}
          </p>
          {hasError && (
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              오류가 있어 가져올 수 없습니다. 파일을 고쳐 다시 올리세요.
            </p>
          )}

          {/* md 미만은 카드 목록, md 이상은 표 */}
          <ul className="space-y-2 md:hidden" aria-label="가져오기 미리보기">
            {sorted.map((r) => (
              <li
                key={`${r.sheet}-${r.row}`}
                className="rounded-md border border-zinc-300 p-3 text-sm dark:border-zinc-700"
              >
                <dl className="space-y-1">
                  <div className="flex gap-2">
                    <dt className="w-12 shrink-0 font-semibold">시트·행</dt>
                    <dd className="min-w-0">
                      {r.sheet} · {r.row}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-12 shrink-0 font-semibold">대상</dt>
                    <dd className="min-w-0 break-all">{r.label}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-12 shrink-0 font-semibold">상태</dt>
                    <dd className="min-w-0">
                      <span
                        className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${STATUS[r.status].cls}`}
                      >
                        {STATUS[r.status].label}
                      </span>
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-12 shrink-0 font-semibold">사유</dt>
                    <dd className="min-w-0 break-words">{r.reason}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          <div className="hidden max-w-full overflow-x-auto rounded-md border border-zinc-300 md:block dark:border-zinc-700">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <caption className="sr-only">가져오기 미리보기</caption>
              <thead className="bg-zinc-100 dark:bg-zinc-800">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">시트</th>
                  <th scope="col" className="px-3 py-2 font-semibold">행</th>
                  <th scope="col" className="px-3 py-2 font-semibold">대상</th>
                  <th scope="col" className="px-3 py-2 font-semibold">상태</th>
                  <th scope="col" className="px-3 py-2 font-semibold">사유</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr
                    key={`${r.sheet}-${r.row}`}
                    className="border-t border-zinc-200 align-top dark:border-zinc-700"
                  >
                    <td className="px-3 py-2">{r.sheet}</td>
                    <td className="px-3 py-2">{r.row}</td>
                    <td className="break-all px-3 py-2">{r.label}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${STATUS[r.status].cls}`}
                      >
                        {STATUS[r.status].label}
                      </span>
                    </td>
                    <td className="min-w-48 px-3 py-2">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={onApply}
            disabled={hasError || rows.length === 0 || busy !== null}
            className={`min-h-11 rounded-md bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-400 disabled:text-zinc-900 dark:bg-blue-600 dark:hover:bg-blue-500 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-300 ${focus}`}
          >
            가져오기 확정
          </button>
        </div>
      )}
    </div>
  );
}
