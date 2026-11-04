"use client";
export function PrintButton() {
  return <button onClick={() => window.print()} className="admin-btn">Print</button>;
}
