"use server";
// 품목 생성·수정·보관/복원 Server Action (입력 검증은 모두 서버에서 한다)

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid, koError, type FormState } from "./common";

const MAX_PHOTO = 5 * 1024 * 1024;
const MAX_INT = 2_000_000_000;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return supabase;
}

function text(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export async function saveItem(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const supabase = await requireUser();
  const mode = text(fd, "mode");
  const sku = text(fd, "sku");
  const name = text(fd, "name");
  const barcode = text(fd, "barcode");
  const unit = text(fd, "unit") || "개";
  const minQtyRaw = text(fd, "min_qty") || "0";
  const memo = text(fd, "memo");
  const photoPath = text(fd, "photo_path");

  if (!sku) return { error: "SKU를 입력해 주세요." };
  if (sku.length > 100) return { error: "SKU는 100자 이하로 입력해 주세요." };
  if (!name) return { error: "이름을 입력해 주세요." };
  if (name.length > 200) return { error: "이름은 200자 이하로 입력해 주세요." };
  if (barcode.length > 100)
    return { error: "바코드는 100자 이하로 입력해 주세요." };
  if (unit.length > 20) return { error: "단위는 20자 이하로 입력해 주세요." };
  if (!/^\d+$/.test(minQtyRaw) || Number(minQtyRaw) > MAX_INT)
    return { error: "최소 수량은 0 이상의 정수로 입력해 주세요." };
  if (memo.length > 2000)
    return { error: "메모는 2000자 이하로 입력해 주세요." };

  const isCreate = mode === "create";
  if (!isCreate && mode !== "update") return { error: "잘못된 요청입니다." };

  // 수정은 기존 id, 생성은 사진 업로드 때 클라이언트가 만든 id(없으면 DB가 생성)
  let id = text(fd, isCreate ? "new_id" : "id");
  if (id && !isUuid(id)) return { error: "잘못된 요청입니다." };

  // 사진은 클라이언트가 저장소에 직접 올린다. 서버는 경로와 실제 크기·형식을 다시 확인한다.
  if (photoPath) {
    if (!id || !new RegExp(`^${id}/[A-Za-z0-9._-]+$`).test(photoPath))
      return { error: "사진 경로가 올바르지 않습니다." };
    const { data: info, error: infoErr } = await supabase.storage
      .from("item-photos")
      .info(photoPath);
    if (infoErr || !info) return { error: "사진을 확인하지 못했습니다. 다시 올려 주세요." };
    if (!info.contentType?.startsWith("image/"))
      return { error: "이미지 파일만 올릴 수 있습니다." };
    if ((info.size ?? 0) > MAX_PHOTO)
      return { error: "사진은 5MB 이하여야 합니다." };
  }

  const row = {
    sku,
    name,
    barcode: barcode || null,
    unit,
    min_qty: Number(minQtyRaw),
    memo: memo || null,
    ...(photoPath ? { photo_path: photoPath } : {}),
  };

  if (isCreate) {
    const { data, error } = await supabase
      .from("items")
      .insert({ ...row, ...(id ? { id } : {}) })
      .select("id")
      .single();
    if (error) return { error: koError(error) };
    id = data.id;
    revalidatePath("/items");
    redirect(`/items/${id}`);
  }

  if (!id) return { error: "잘못된 요청입니다." };
  const { error } = await supabase.from("items").update(row).eq("id", id);
  if (error) return { error: koError(error) };
  revalidatePath("/items");
  revalidatePath(`/items/${id}`);
  return { error: null, ok: true };
}

export async function setItemActive(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const supabase = await requireUser();
  const id = text(fd, "id");
  if (!isUuid(id)) return { error: "잘못된 요청입니다." };
  const active = text(fd, "active") === "1";
  const { error } = await supabase.from("items").update({ active }).eq("id", id);
  if (error) return { error: koError(error) };
  revalidatePath("/items");
  revalidatePath(`/items/${id}`);
  return { error: null, ok: true };
}
