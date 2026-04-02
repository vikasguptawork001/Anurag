import { forwardRef } from "react";
import { formatDisplayDate, formatKm } from "../../lib/format.js";

/**
 * Dedicated layout for html2pdf / html2canvas — not shown on screen.
 * Uses inline styles so capture is consistent regardless of Tailwind build order.
 */
const ServiceHistoryPdfTemplate = forwardRef(function ServiceHistoryPdfTemplate(
  { vehicle, records, generatedAtIso },
  ref
) {
  const generatedLabel = generatedAtIso
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(generatedAtIso))
    : "—";

  const rows = Array.isArray(records) ? records : [];

  return (
    <div
      ref={ref}
      aria-hidden
      className="pdf-export-root"
      style={{
        boxSizing: "border-box",
        width: "1123px",
        minHeight: "794px",
        backgroundColor: "#ffffff",
        color: "#0f172a",
        fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        fontSize: "10px",
        lineHeight: 1.35,
        padding: "20px 24px 16px",
      }}
    >
      {/* Header band */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          border: "1px solid #0f172a",
          borderBottom: "none",
        }}
      >
        <div
          style={{
            width: "8px",
            backgroundColor: "#FF6600",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, padding: "14px 18px" }}>
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "#64748b",
            }}
          >
            Bajaj Authorised Service Center
          </div>
          <div
            style={{
              marginTop: "6px",
              fontSize: "18px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Vehicle service history register
          </div>
          <div style={{ marginTop: "4px", fontSize: "10px", color: "#475569" }}>
            Chronological record of all job cards and workshop entries for the vehicle below.
          </div>
        </div>
        <div
          style={{
            width: "220px",
            borderLeft: "1px solid #e2e8f0",
            padding: "12px 14px",
            backgroundColor: "#f8fafc",
            fontSize: "9px",
            color: "#334155",
          }}
        >
          <div style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Document
          </div>
          <div style={{ marginTop: "6px", fontSize: "13px", fontWeight: 700, fontFamily: "ui-monospace, monospace" }}>
            {vehicle?.vehicle_number ?? "—"}
          </div>
          <div style={{ marginTop: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Generated
          </div>
          <div style={{ marginTop: "4px", lineHeight: 1.3 }}>{generatedLabel}</div>
        </div>
      </div>

      {/* Vehicle master strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          border: "1px solid #0f172a",
          borderTop: "1px solid #cbd5e1",
        }}
      >
        {[
          { label: "Registered owner", value: vehicle?.owner_name ?? "—" },
          { label: "Contact", value: vehicle?.owner_phone ?? "—" },
          { label: "Model", value: vehicle?.vehicle_model ?? "—" },
          {
            label: "Avg. daily km",
            value:
              vehicle?.avg_daily_km != null
                ? `${Number(vehicle.avg_daily_km).toLocaleString("en-IN")} km`
                : "—",
          },
        ].map((cell) => (
          <div
            key={cell.label}
            style={{
              padding: "10px 12px",
              borderRight: "1px solid #e2e8f0",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                fontSize: "8px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#64748b",
              }}
            >
              {cell.label}
            </div>
            <div style={{ marginTop: "4px", fontSize: "11px", fontWeight: 600 }}>{cell.value}</div>
          </div>
        ))}
      </div>

      {/* Table title */}
      <div
        style={{
          marginTop: "12px",
          padding: "8px 10px",
          backgroundColor: "#f1f5f9",
          border: "1px solid #cbd5e1",
          borderBottom: "none",
          fontSize: "9px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#475569",
        }}
      >
        Service entries (oldest → newest) · {rows.length} record{rows.length === 1 ? "" : "s"}
      </div>

      {/* Data table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border: "1px solid #0f172a",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#e2e8f0", color: "#0f172a" }}>
            {[
              ["S.No", "36px"],
              ["Job card", "88px"],
              ["Service date", "84px"],
              ["Odometer", "78px"],
              ["Type", "44px"],
              ["Work performed", "180px"],
              ["Parts replaced", "150px"],
              ["Next due (km)", "72px"],
              ["Next due date", "84px"],
              ["Feedback", "120px"],
              ["Follow-up", "64px"],
            ].map(([label, w]) => (
              <th
                key={label}
                style={{
                  width: w,
                  padding: "6px 5px",
                  fontSize: "8px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  borderBottom: "1px solid #0f172a",
                  borderRight: "1px solid #94a3b8",
                  textAlign: label === "S.No" ? "center" : "left",
                  verticalAlign: "bottom",
                }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={11}
                style={{
                  padding: "24px",
                  textAlign: "center",
                  fontSize: "11px",
                  color: "#64748b",
                  borderTop: "1px solid #cbd5e1",
                }}
              >
                No service records on file.
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={row.id} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                <td
                  style={{
                    padding: "5px 4px",
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: "9px",
                    borderRight: "1px solid #cbd5e1",
                    borderBottom: "1px solid #cbd5e1",
                    verticalAlign: "top",
                  }}
                >
                  {idx + 1}
                </td>
                <td
                  style={{
                    padding: "5px 5px",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "9px",
                    borderRight: "1px solid #cbd5e1",
                    borderBottom: "1px solid #cbd5e1",
                    verticalAlign: "top",
                    wordBreak: "break-word",
                  }}
                >
                  {row.job_card_no}
                </td>
                <td
                  style={{
                    padding: "5px 5px",
                    borderRight: "1px solid #cbd5e1",
                    borderBottom: "1px solid #cbd5e1",
                    verticalAlign: "top",
                  }}
                >
                  {formatDisplayDate(row.service_date)}
                </td>
                <td
                  style={{
                    padding: "5px 5px",
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    borderRight: "1px solid #cbd5e1",
                    borderBottom: "1px solid #cbd5e1",
                    verticalAlign: "top",
                  }}
                >
                  {formatKm(row.odometer_km)}
                </td>
                <td
                  style={{
                    padding: "5px 4px",
                    borderRight: "1px solid #cbd5e1",
                    borderBottom: "1px solid #cbd5e1",
                    verticalAlign: "top",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      padding: "1px 4px",
                      fontSize: "8px",
                      fontWeight: 800,
                      border: "1px solid #94a3b8",
                      borderRadius: "2px",
                      backgroundColor: row.service_type === "FREE" ? "#ecfdf5" : "#fffbeb",
                    }}
                  >
                    {row.service_type}
                  </span>
                </td>
                <td
                  style={{
                    padding: "5px 5px",
                    borderRight: "1px solid #cbd5e1",
                    borderBottom: "1px solid #cbd5e1",
                    verticalAlign: "top",
                    wordBreak: "break-word",
                  }}
                >
                  {row.work_done || "—"}
                </td>
                <td
                  style={{
                    padding: "5px 5px",
                    borderRight: "1px solid #cbd5e1",
                    borderBottom: "1px solid #cbd5e1",
                    verticalAlign: "top",
                    wordBreak: "break-word",
                  }}
                >
                  {row.parts_replaced || "—"}
                </td>
                <td
                  style={{
                    padding: "5px 5px",
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    borderRight: "1px solid #cbd5e1",
                    borderBottom: "1px solid #cbd5e1",
                    verticalAlign: "top",
                  }}
                >
                  {row.next_due_km != null ? Number(row.next_due_km).toLocaleString("en-IN") : "—"}
                </td>
                <td
                  style={{
                    padding: "5px 5px",
                    borderRight: "1px solid #cbd5e1",
                    borderBottom: "1px solid #cbd5e1",
                    verticalAlign: "top",
                  }}
                >
                  {formatDisplayDate(row.next_due_date)}
                </td>
                <td
                  style={{
                    padding: "5px 5px",
                    borderRight: "1px solid #cbd5e1",
                    borderBottom: "1px solid #cbd5e1",
                    verticalAlign: "top",
                    wordBreak: "break-word",
                  }}
                >
                  {row.feedback || "—"}
                </td>
                <td
                  style={{
                    padding: "5px 5px",
                    borderBottom: "1px solid #cbd5e1",
                    verticalAlign: "top",
                    fontWeight: 600,
                    color: row.followup_call_done ? "#047857" : "#b45309",
                  }}
                >
                  {row.followup_call_done ? "Completed" : "Pending"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div
        style={{
          marginTop: "12px",
          paddingTop: "8px",
          borderTop: "1px solid #cbd5e1",
          fontSize: "8px",
          color: "#64748b",
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        This document was produced by the Bajaj Service Center Management System for workshop and customer records.
        <br />
        Not valid unless issued from an authorised service outlet. Reproduction without authorisation is prohibited.
      </div>
    </div>
  );
});

export default ServiceHistoryPdfTemplate;
