"use client";
// 품목 생성·수정 폼 (사진은 검증 후 저장소에 직접 올리고 경로만 서버로 보낸다)

import { useActionState, useState } from "react";
import { FileDrop, type FileDropStatus } from "@/components/lucian/file-drop";
import { InlineAlert } from "@/components/lucian/inline-alert";
import { createClient } from "@/lib/supabase/client";
import { saveItem } from "./actions";
import {
  btnPrimary,
  cardCls,
  inputCls,
  type FormState,
} from "./common";

type ItemValues = {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  unit: string;
  min_qty: number;
  memo: string | null;
};

const MAX_PHOTO = 5 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

const initial: FormState = { error: null };

export function ItemForm({
  item,
  photoUrl,
  demo = false,
}: {
  item?: ItemValues;
  photoUrl?: string | null;
  demo?: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveItem, initial);
  // 생성 시 사진 경로의 폴더가 될 id 는 파일을 고를 때 만든다(렌더 중 난수는 하이드레이션 불일치를 만든다).
  const [newId, setNewId] = useState("");
  const [photoPath, setPhotoPath] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // 파일 영역에 보일 선택 파일(제거하면 선택만 비운다)
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  async function onFile(file: File | null) {
    setPhotoError(null);
    setPhotoFile(file);
    if (!file) {
      // 제거. 이번에 고른 사진만 취소하고, 이미 저장된 사진(photoUrl)은 건드리지 않는다.
      setPhotoPath("");
      setPreview(null);
      return;
    }
    const ext = EXT[file.type];
    if (!ext) {
      setPhotoError("JPEG, PNG, WebP, GIF, HEIC 이미지만 올릴 수 있습니다.");
      return;
    }
    if (file.size > MAX_PHOTO) {
      setPhotoError("사진은 5MB 이하여야 합니다.");
      return;
    }
    // 데모는 실제 저장소로 올리지 않는다. 저장 시 서버 액션이 DEMO_MSG 로 막는다.
    if (demo) {
      setPreview(URL.createObjectURL(file));
      setPhotoError("데모에서는 저장되지 않습니다.");
      return;
    }
    const folder = item?.id || newId || crypto.randomUUID();
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    setUploading(true);
    const { error } = await createClient()
      .storage.from("item-photos")
      .upload(path, file, { contentType: file.type, upsert: false });
    setUploading(false);
    if (error) {
      setPhotoError("사진을 올리지 못했습니다. 다시 시도해 주세요.");
      return;
    }
    if (!item) setNewId(folder);
    setPhotoPath(path);
    setPreview(URL.createObjectURL(file));
  }

  const shownPhoto = preview ?? photoUrl ?? null;
  const dropStatus: FileDropStatus = !photoFile
    ? "idle"
    : uploading
      ? "working"
      : photoError
        ? "error"
        : photoPath
          ? "done"
          : "selected";

  return (
    <form action={formAction} className={`${cardCls} space-y-4`}>
      <input type="hidden" name="mode" value={item ? "update" : "create"} />
      {item && <input type="hidden" name="id" value={item.id} />}
      {!item && newId && <input type="hidden" name="new_id" value={newId} />}
      <input type="hidden" name="photo_path" value={photoPath} />

      <Field id="sku" label="SKU" required>
        <input
          id="sku"
          name="sku"
          required
          maxLength={100}
          defaultValue={item?.sku}
          autoComplete="off"
          className={inputCls}
        />
      </Field>
      <Field id="name" label="이름" required>
        <input
          id="name"
          name="name"
          required
          maxLength={200}
          defaultValue={item?.name}
          autoComplete="off"
          className={inputCls}
        />
      </Field>
      <Field id="barcode" label="바코드 (선택)">
        <input
          id="barcode"
          name="barcode"
          maxLength={100}
          defaultValue={item?.barcode ?? ""}
          autoComplete="off"
          className={inputCls}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="unit" label="단위">
          <input
            id="unit"
            name="unit"
            maxLength={20}
            defaultValue={item?.unit ?? "개"}
            className={inputCls}
          />
        </Field>
        <Field id="min_qty" label="최소 수량">
          <input
            id="min_qty"
            name="min_qty"
            inputMode="numeric"
            pattern="[0-9]*"
            defaultValue={item?.min_qty ?? 0}
            className={inputCls}
          />
        </Field>
      </div>
      <Field id="memo" label="메모 (선택)">
        <textarea
          id="memo"
          name="memo"
          rows={3}
          maxLength={2000}
          defaultValue={item?.memo ?? ""}
          className={inputCls}
        />
      </Field>

      <div className="space-y-2">
        {shownPhoto && (
          // 서명 URL 과 blob 미리보기라 next/image 최적화 대상이 아니다.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shownPhoto}
            alt="품목 사진"
            className="h-40 w-40 max-w-full rounded-xl border border-line object-cover"
          />
        )}
        <FileDrop
          id="photo"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
          disabled={uploading}
          label="사진을 끌어다 놓거나"
          action="눌러서 고르세요"
          hint="선택 사항 · 이미지 1장, 5MB 이하"
          file={photoFile}
          status={dropStatus}
          statusText={
            dropStatus === "working"
              ? "올리는 중"
              : dropStatus === "done"
                ? "올렸습니다"
                : undefined
          }
          onFile={onFile}
        />
        {uploading && <p className="text-sm">사진을 올리는 중...</p>}
        {photoError && (
          <InlineAlert>{photoError}</InlineAlert>
        )}
      </div>

      {state.error && (
        <InlineAlert>{state.error}</InlineAlert>
      )}
      {state.ok && (
        <InlineAlert kind="success">저장했습니다.</InlineAlert>
      )}

      <button
        type="submit"
        disabled={pending || uploading}
        className={`${btnPrimary} w-full sm:w-auto`}
      >
        {pending ? "저장 중..." : item ? "저장" : "품목 만들기"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && (
          <span aria-hidden="true" className="text-danger">
            {" *"}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
