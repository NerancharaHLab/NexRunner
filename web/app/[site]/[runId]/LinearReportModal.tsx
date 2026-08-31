"use client";

import { useMemo, useState } from "react";
import type { RunEntity } from "@/lib/types";
import type { ScenarioWithResult } from "@/lib/runs";

interface Props {
  run: RunEntity;
  scenarios: ScenarioWithResult[];
  onClose: () => void;
}

// Builds the same Thai-language summary text as the old app's
// exportLinearReport() — meant to be pasted manually into a Linear comment,
// not pushed via API (confirmed with the user).
function buildReportText(run: RunEntity, scenarios: ScenarioWithResult[]): string {
  const failedList = scenarios
    .filter((s) => s.status === "failed")
    .map((s) => `${s.id} ${s.name} (Note: ${s.notes || "N/A"})`);
  const blockedList = scenarios
    .filter((s) => s.status === "blocked")
    .map((s) => `${s.id} ${s.name} [BLOCKED] (Note: ${s.notes || "N/A"})`);
  const issues = [...failedList, ...blockedList];

  const readyText =
    run.gateResult === "READY"
      ? `🟢 READY FOR ${run.environment} (Pass Rate: ${run.passRatePercent}%)`
      : `🔴 NOT READY FOR ${run.environment} (Pass Rate: ${run.passRatePercent}%)`;

  let text = `📢 **[Smoke Test Summary Report] - Pre-UAT Verification Sign-off**\n`;
  text += `🏥 Hospital Site: ${run.siteName} | Version: ${run.version || "-"} | Delivery Batch: ${run.deliveryBatch || "-"}\n`;
  text += `🗓 Date: ${run.executedDate} | Test Cycle: ${run.testCycle} | Environment: ${run.environment} | Run ID: ${run.rowKey}\n`;
  text += `👤 Tester: ${run.tester || "[ยังไม่ได้ระบุชื่อ]"}\n\n`;
  text += `📊 Overall Status: ${readyText}\n\n`;
  text += `• Total Scenarios: ${run.totalScenarios} Scenarios\n`;
  text += `• 🟢 Passed: ${run.passed} Scenarios\n`;
  text += `• 🔴 Failed: ${run.failed} Scenarios\n`;
  text += `• 🟡 Blocked: ${run.blocked} Scenarios\n`;
  text += `• ⚪ Not Run: ${run.notrun} Scenarios\n\n`;
  text += `🔗 Primary E2E Data Chain Tracked:\n`;
  text += `• HN: ${run.hn || "-"}  |  VN: ${run.vn || "-"}  |  AN: ${run.an || "-"}  |  Bill No: ${run.bill || "-"}\n\n`;

  if (issues.length > 0) {
    text += `⚠️ Open Defect / Failed Items:\n`;
    issues.forEach((item) => {
      text += `• ${item}\n`;
    });
    text += `\n`;
  } else {
    text += `✨ No Defect Found during Smoke Testing.\n\n`;
  }

  text += `✅ Recommendation / Sign-off:\n`;
  text +=
    run.gateResult === "READY"
      ? `ระบบผ่านการตรวจความพร้อมหลักครบถ้วน อนุมัติเปิดให้ผู้ใช้งานทดสอบรอบ ${run.environment} ได้ตามกำหนดการ`
      : `ระบบยังมีข้อบกพร่องใน Scenario สำคัญ โปรดแก้ไข Bug ก่อนเริ่มรอบ ${run.environment}`;

  return text;
}

export default function LinearReportModal({ run, scenarios, onClose }: Props) {
  const text = useMemo(() => buildReportText(run, scenarios), [run, scenarios]);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.getElementById("linear-report-output") as HTMLTextAreaElement | null;
        textarea?.select();
        document.execCommand("copy");
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied — user can still select-all + copy manually from the textarea.
    }
  }

  return (
    <div
      className="modal-overlay"
      data-testid="smoke-runner:linear-report:modal__dialog"
      onClick={onClose}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>สรุปผลส่ง Linear</h3>
          <button
            type="button"
            className="btn btn-sm"
            onClick={onClose}
            data-testid="smoke-runner:linear-report:btn__close"
          >
            ปิด
          </button>
        </div>
        <textarea
          id="linear-report-output"
          className="notes-input"
          readOnly
          value={text}
          data-testid="smoke-runner:linear-report:input__output"
          onFocus={(e) => e.target.select()}
        />
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCopy}
            data-testid="smoke-runner:linear-report:btn__copy"
          >
            {copied ? "คัดลอกแล้ว!" : "คัดลอกไปยัง Clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
