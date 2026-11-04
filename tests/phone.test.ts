import { test } from "node:test";
import assert from "node:assert/strict";
import { displayPkPhone, normalizePkPhone, waNumber } from "../src/lib/phone";

test("normalises common Pakistani mobile formats", () => {
  for (const v of ["03001234567", "0300-1234567", "0300 123 4567", "+923001234567", "923001234567", "3001234567", "00923001234567"]) {
    assert.equal(normalizePkPhone(v), "+923001234567", v);
  }
});

test("rejects invalid numbers", () => {
  for (const v of ["", "12345", "0421234567", "04235761234", "030012345", "+44 7700 900123"]) {
    assert.equal(normalizePkPhone(v), null, v);
  }
});

test("display and WhatsApp formats", () => {
  assert.equal(displayPkPhone("+923001234567"), "0300 1234567");
  assert.equal(waNumber("0300 1234567"), "923001234567");
});
