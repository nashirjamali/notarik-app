import { ImageResponse } from "next/og";

export const alt = "Notarik · Snap it. We'll sort it.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "linear-gradient(135deg, #8d54ea 0%, #753dd1 100%)",
          color: "#fefefe",
        }}
      >
        <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: -4 }}>notarik</div>
        <div style={{ fontSize: 64, fontWeight: 700, marginTop: 24 }}>Snap it. We&apos;ll sort it.</div>
        <div style={{ fontSize: 32, marginTop: 24, opacity: 0.9 }}>
          Receipts and quick notes, turned into a clear picture of your month.
        </div>
      </div>
    ),
    size,
  );
}
