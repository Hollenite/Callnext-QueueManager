import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#12263A",
          color: "#C81E1E",
          fontSize: 22,
          fontWeight: 800,
        }}
      >
        Q
      </div>
    ),
    size,
  );
}
