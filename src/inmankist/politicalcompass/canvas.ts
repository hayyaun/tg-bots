import { createCanvas } from "canvas";
import { getStrings } from "../i18n";
import { Language } from "../types";

const width = 800;
const height = 800;
const padding = 80;
const chartSize = width - padding * 2;
const centerX = width / 2;
const centerY = height / 2;
const axisRange = 100; // -100 to +100

export function generateCompassChart(
  economicScore: number,
  socialScore: number,
  language: Language = Language.Persian
): Buffer {
  const strings = getStrings(language);
  const isRTL = language === Language.Persian || language === Language.Arabic;
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
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = isRTL ? "rtl" : "ltr";
  
  // Use appropriate font based on language
  if (isRTL) {
    ctx.font = "bold 20px 'Vazirmatn', sans-serif, 'Noto Color Emoji'";
  } else {
    ctx.font = "bold 20px Arial, sans-serif";
  }

  // X-axis labels
  ctx.fillText(strings.compass_left, padding - 30, centerY);
  ctx.fillText(strings.compass_right, width - padding + 30, centerY);

  // Y-axis labels
  if (isRTL) {
    ctx.font = "bold 20px 'Vazirmatn', sans-serif, 'Noto Color Emoji'";
  } else {
    ctx.font = "bold 20px Arial, sans-serif";
  }
  ctx.fillText(strings.compass_authoritarian, centerX, padding - 30);
  ctx.fillText(strings.compass_libertarian, centerX, height - padding + 30);

  // Draw quadrant labels
  if (isRTL) {
    ctx.font = "18px 'Vazirmatn', sans-serif, 'Noto Color Emoji'";
  } else {
    ctx.font = "18px Arial, sans-serif";
  }
  ctx.fillStyle = "#888888";

  // Top-left (LibLeft)
  ctx.fillText(strings.compass_libLeft, padding + 60, padding + 30);
  // Top-right (LibRight)
  ctx.fillText(strings.compass_libRight, width - padding - 60, padding + 30);
  // Bottom-left (AuthLeft)
  ctx.fillText(strings.compass_authLeft, padding + 60, height - padding - 30);
  // Bottom-right (AuthRight)
  ctx.fillText(strings.compass_authRight, width - padding - 60, height - padding - 30);

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

