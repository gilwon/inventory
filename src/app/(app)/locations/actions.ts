"use server";
// 위치 생성·수정·보관/복원 Server Action (입력 검증은 모두 서버에서 한다)

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { DEMO_MSG, isDemo } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import { isUuid, koError, type FormState } from "../items/common";

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

export async function saveLocation(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  if (await isDemo()) return { error: DEMO_MSG };
  const supabase = await requireUser();
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };
  const mode = text(fd, "mode");
  const code = text(fd, "code");
  const name = text(fd, "name");
  const parent = text(fd, "parent_id");

  if (!code) return { error: "위치 코드를 입력해 주세요." };
  if (code.length > 50) return { error: "위치 코드는 50자 이하로 입력해 주세요." };
  if (!name) return { error: "이름을 입력해 주세요." };
  if (name.length > 100) return { error: "이름은 100자 이하로 입력해 주세요." };
  if (parent && !isUuid(parent)) return { error: "잘못된 요청입니다." };
  const row = { code, name, parent_id: parent || null };

  if (mode === "create") {
    const { data, error } = await supabase
      .from("locations")
      .insert(row)
      .select("id")
      .single();
    if (error) return { error: koError(error) };
    revalidatePath("/locations");
    redirect(`/locations/${data.id}`);
  }

  const id = text(fd, "id");
  if (mode !== "update" || !isUuid(id)) return { error: "잘못된 요청입니다." };
  // 순환(자기 자신·후손을 상위로 지정)은 DB 트리거가 거절한다.
  const { error } = await supabase.from("locations").update(row).eq("id", id);
  if (error) return { error: koError(error) };
  revalidatePath("/locations");
  revalidatePath(`/locations/${id}`);
  return { error: null, ok: true };
}

export async function setLocationActive(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  if (await isDemo()) return { error: DEMO_MSG };
  const supabase = await requireUser();
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };
  const id = text(fd, "id");
  if (!isUuid(id)) return { error: "잘못된 요청입니다." };
  const active = text(fd, "active") === "1";
  const { error } = await supabase
    .from("locations")
    .update({ active })
    .eq("id", id);
  if (error) return { error: koError(error) };
  revalidatePath("/locations");
  revalidatePath(`/locations/${id}`);
  return { error: null, ok: true };
}
