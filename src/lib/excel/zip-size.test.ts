// assertZipSize 의 압축 해제 크기 상한 검사 테스트
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { assertZipSize, UploadError } from "./parse";

// 비압축 크기만 채운 최소 zip(중앙 디렉터리 항목 1개 + EOCD)을 만든다.
function fakeZip(uncompressed: number): ArrayBuffer {
  const buf = new ArrayBuffer(46 + 22);
  const v = new DataView(buf);
  v.setUint32(0, 0x02014b50, true);
  v.setUint32(24, uncompressed, true);
  v.setUint32(46, 0x06054b50, true);
  v.setUint16(46 + 10, 1, true);
  v.setUint32(46 + 12, 46, true);
  v.setUint32(46 + 16, 0, true);
  return buf;
}

describe("assertZipSize", () => {
  it("정상 xlsx 는 통과한다", async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("시트").addRow(["a", 1]);
    const out = await wb.xlsx.writeBuffer();
    const ab = new Uint8Array(out as ArrayBuffer).slice().buffer;
    expect(() => assertZipSize(ab)).not.toThrow();
  });

  it("비압축 크기 합이 상한을 넘으면 413 으로 거절한다", () => {
    expect(() => assertZipSize(fakeZip(51 * 1024 * 1024))).toThrow(UploadError);
    try {
      assertZipSize(fakeZip(51 * 1024 * 1024));
    } catch (e) {
      expect((e as UploadError).status).toBe(413);
    }
    expect(() => assertZipSize(fakeZip(1024))).not.toThrow();
  });

  it("zip 이 아닌 바이트는 거절한다", () => {
    expect(() => assertZipSize(new Uint8Array(100).fill(7).buffer)).toThrow(UploadError);
  });
});
