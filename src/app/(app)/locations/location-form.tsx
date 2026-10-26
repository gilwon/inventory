"use client";
// 위치 생성·수정 폼 (상위 위치 선택지는 서버가 후손을 제외해 내려 준다)

import { useActionState } from "react";
import { InlineAlert } from "@/components/lucian/inline-alert";
import { saveLocation } from "./actions";
import { btnPrimary, inputCls, type FormState } from "../items/common";

type Props = {
  location?: { id: string; code: string; name: string; parent_id: string | null };
  options: { id: string; label: string }[];
};

const initial: FormState = { error: null };

export function LocationForm({ location, options }: Props) {
  const [state, formAction, pending] = useActionState(saveLocation, initial);
  const p = location ? "e" : "n";
  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <input type="hidden" name="mode" value={location ? "update" : "create"} />
      {location && <input type="hidden" name="id" value={location.id} />}

      <div className="space-y-1">
        <label htmlFor={`${p}-code`} className="block text-sm font-medium">
          코드
        </label>
        <input
          id={`${p}-code`}
          name="code"
          required
          maxLength={50}
          autoComplete="off"
          defaultValue={location?.code}
          className={inputCls}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor={`${p}-name`} className="block text-sm font-medium">
          이름
        </label>
        <input
          id={`${p}-name`}
          name="name"
          required
          maxLength={100}
          autoComplete="off"
          defaultValue={location?.name}
          className={inputCls}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor={`${p}-parent`} className="block text-sm font-medium">
          상위 위치
        </label>
        <select
          id={`${p}-parent`}
          name="parent_id"
          defaultValue={location?.parent_id ?? ""}
          className={`${inputCls} min-h-11`}
        >
          <option value="">없음 (최상위)</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {state.error && (
        <InlineAlert>{state.error}</InlineAlert>
      )}
      {state.ok && (
        <InlineAlert kind="success">저장했습니다.</InlineAlert>
      )}
      <button
        type="submit"
        disabled={pending}
        className={`${btnPrimary} w-full sm:w-auto`}
      >
        {pending ? "저장 중..." : location ? "저장" : "위치 만들기"}
      </button>
    </form>
  );
}
