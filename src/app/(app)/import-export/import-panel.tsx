"use client";
// 파일 선택, 미리보기 표, 가져오기 확정을 맡는 클라이언트 컴포넌트

import { useState } from "react";
import { FileDrop, type FileDropStatus } from "@/components/lucian/file-drop";
import { InlineAlert } from "@/components/lucian/inline-alert";

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
    cls: "border border-mint bg-surface-2 text-ink",
  },
  update: {
    label: "갱신",
    cls: "border border-accent bg-surface-2 text-ink",
  },
  existing: {
    label: "기존",
    cls: "border border-line-2 bg-surface-2 text-ink",
  },
  ignored: {
    label: "수량 무시됨",
    cls: "border border-warn bg-surface-2 text-ink",
  },
  error: {
    label: "오류",
    cls: "border border-danger bg-surface-2 text-ink",
  },
};

const focus =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

// 서버 응답이 JSON 이 아니어도(용량 초과 등) 메시지를 만든다.
async function readJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return { error: "서버 응답을 읽을 수 없습니다. 파일 크기를 확인하세요" };
  }
}

export function ImportPanel() {
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
  // 파일 영역에 보일 실제 단계. 미리보기 요청 중, 실패(표 없이 메시지), 완료(표 있음) 순이다.
  const dropStatus: FileDropStatus = !file
    ? "idle"
    : busy === "preview"
      ? "working"
      : message && !rows
        ? "error"
        : rows
          ? "done"
          : "selected";
  const count = (s: RowStatus) => rows?.filter((r) => r.status === s).length ?? 0;

  return (
    <div className="space-y-4">
      <FileDrop
        id="import-file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        disabled={busy !== null}
        label="엑셀 파일(.xlsx)을 끌어다 놓거나"
        action="눌러서 고르세요"
        hint=".xlsx 파일 1개"
        file={file}
        status={dropStatus}
        statusText={
          dropStatus === "working"
            ? "미리보기 만드는 중"
            : dropStatus === "done"
              ? "미리보기 완료"
              : undefined
        }
        onFile={onPick}
      />

      <div role="status" aria-live="polite" className="space-y-2">
        {busy === "preview" && <p className="text-sm">미리보기를 만드는 중입니다...</p>}
        {busy === "apply" && <p className="text-sm">가져오는 중입니다...</p>}
        {message && (
          <InlineAlert role={null}>{message}</InlineAlert>
        )}
        {result && (
          <div className="rounded-xl border border-mint bg-surface-2 p-3 text-sm text-ink">
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
            <InlineAlert>
              오류가 있어 가져올 수 없습니다. 파일을 고쳐 다시 올리세요.
            </InlineAlert>
          )}

          {/* md 미만은 카드 목록, md 이상은 표 */}
          <ul className="space-y-2 md:hidden" aria-label="가져오기 미리보기">
            {sorted.map((r) => (
              <li
                key={`${r.sheet}-${r.row}`}
                className="rounded-xl border border-line p-3 text-sm"
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

          <div className="hidden max-w-full overflow-x-auto rounded-xl border border-line md:block">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <caption className="sr-only">가져오기 미리보기</caption>
              <thead className="bg-surface-2">
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
                    className="border-t border-line align-top"
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
            className={`min-h-11 rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-ink-2 ${focus}`}
          >
            가져오기 확정
          </button>
        </div>
      )}
    </div>
  );
}
