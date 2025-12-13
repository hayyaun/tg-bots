import { createCanvas } from "canvas";

const width = 800;
const height = 800;
const padding = 80;
const chartSize = width - padding * 2;
const centerX = width / 2;
const centerY = height / 2;
const axisRange = 100; // -100 to +100

export function generateCompassChart(
  economicScore: number,
  socialScore: number
): Buffer {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Draw grid lines
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 1;

  // Vertical grid lines
  for (let i = -100; i <= 100; i += 25) {
    const x = centerX + (i / axisRange) * (chartSize / 2);
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, height - padding);
    ctx.stroke();
  }

  // Horizontal grid lines
  for (let i = -100; i <= 100; i += 25) {
    const y = centerY - (i / axisRange) * (chartSize / 2);
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Draw axes
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 2;

  // X-axis (Economic: Left to Right)
  ctx.beginPath();
  ctx.moveTo(padding, centerY);
  ctx.lineTo(width - padding, centerY);
  ctx.stroke();

  // Y-axis (Social: Authoritarian to Libertarian)
  ctx.beginPath();
  ctx.moveTo(centerX, padding);
  ctx.lineTo(centerX, height - padding);
  ctx.stroke();

  // Draw axis labels
  ctx.fillStyle = "#333333";
  ctx.font = "bold 20px 'Vazirmatn', sans-serif, 'Noto Color Emoji'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "rtl";

  // X-axis labels
  ctx.fillText("چپ", padding - 30, centerY);
  ctx.fillText("راست", width - padding + 30, centerY);
  ctx.font = "16px 'Vazirmatn', sans-serif, 'Noto Color Emoji'";
  ctx.fillText("اقتصادی", width / 2, height - padding + 40);

  // Y-axis labels
  ctx.save();
  ctx.translate(centerX - 40, padding - 30);
  ctx.rotate(-Math.PI / 2);
  ctx.font = "16px 'Vazirmatn', sans-serif, 'Noto Color Emoji'";
  ctx.fillText("اجتماعی", 0, 0);
  ctx.restore();

  ctx.font = "bold 20px 'Vazirmatn', sans-serif, 'Noto Color Emoji'";
  ctx.fillText("اقتدارگرا", centerX, padding - 30);
  ctx.fillText("آزادی‌خواه", centerX, height - padding + 30);

  // Draw quadrant labels
  ctx.font = "18px 'Vazirmatn', sans-serif, 'Noto Color Emoji'";
  ctx.fillStyle = "#888888";

  // Top-left (LibLeft)
  ctx.fillText("چپ آزادی‌خواه", padding + 60, padding + 30);
  // Top-right (LibRight)
  ctx.fillText("راست آزادی‌خواه", width - padding - 60, padding + 30);
  // Bottom-left (AuthLeft)
  ctx.fillText("چپ اقتدارگرا", padding + 60, height - padding - 30);
  // Bottom-right (AuthRight)
  ctx.fillText("راست اقتدارگرا", width - padding - 60, height - padding - 30);

  // Draw center point
  ctx.fillStyle = "#999999";
  ctx.beginPath();
  ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
  ctx.fill();

  // Calculate user's position on chart
  // X: economicScore (-100 to +100) maps to (padding to width-padding)
  // Y: socialScore (-100 to +100) maps to (height-padding to padding) [inverted]
  const userX = centerX + (economicScore / axisRange) * (chartSize / 2);
  const userY = centerY - (socialScore / axisRange) * (chartSize / 2);

  // Draw user's position as a dot
  ctx.fillStyle = "#ff4444";
  ctx.beginPath();
  ctx.arc(userX, userY, 8, 0, Math.PI * 2);
  ctx.fill();

  // Draw a circle around the dot for visibility
  ctx.strokeStyle = "#ff4444";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(userX, userY, 12, 0, Math.PI * 2);
  ctx.stroke();

  // Draw coordinates text near the dot
  ctx.fillStyle = "#ff4444";
  ctx.font = "bold 16px 'DejaVu Sans Mono', monospace";
  ctx.textAlign = "center";
  ctx.direction = "ltr";
  ctx.fillText(
    `(${Math.round(economicScore)}, ${Math.round(socialScore)})`,
    userX,
    userY - 25
  );

  // Return as PNG buffer
  return canvas.toBuffer("image/png");
}

