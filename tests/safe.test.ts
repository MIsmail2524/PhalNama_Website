import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell, isAllowedImage, jsonLd, safeHref } from "../src/lib/safe";

test("jsonLd cannot break out of a script tag", () => {
  const out = jsonLd({ name: "</script><script>alert(1)</script>" });
  assert.ok(!out.includes("</script>"));
  assert.deepEqual(JSON.parse(out), { name: "</script><script>alert(1)</script>" });
});

test("safeHref blocks dangerous schemes", () => {
  for (const bad of ["javascript:alert(1)", " JAVASCRIPT:alert(1)", "data:text/html,<b>", "vbscript:x", "//evil.com"]) assert.equal(safeHref(bad), "#", bad);
  assert.equal(safeHref("/shop"), "/shop");
  assert.equal(safeHref("https://instagram.com/phalnama"), "https://instagram.com/phalnama");
  assert.equal(safeHref("tel:+923001234567"), "tel:+923001234567");
});

test("isAllowedImage only accepts local files and approved hosts", () => {
  assert.ok(isAllowedImage("/images/photos/a.jpg"));
  assert.ok(isAllowedImage("https://abc.public.blob.vercel-storage.com/x.jpg"));
  assert.ok(!isAllowedImage("http://abc.public.blob.vercel-storage.com/x.jpg"));
  assert.ok(!isAllowedImage("https://evil.com/x.jpg"));
  assert.ok(!isAllowedImage("//evil.com/x.jpg"));
  assert.ok(!isAllowedImage("javascript:alert(1)"));
});

test("csvCell neutralises spreadsheet formulas", () => {
  assert.equal(csvCell("=HYPERLINK(\"x\")"), "'=HYPERLINK(\"x\")");
  assert.equal(csvCell("+92300"), "'+92300");
  assert.equal(csvCell("Ali"), "Ali");
});
