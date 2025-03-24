import { createCanvas, loadImage } from "canvas";

const width = 640;
const height = 270;
const radius = 28;
const margin = 48;
const padding = 28;
const fontSize = 42;
const lineHeight = fontSize * 1.8;
const textColor = "white";

export async function addTextToImage(
  file: Buffer<ArrayBuffer>,
  textRight: string[],
  textLeft: string[]
): Promise<Buffer<ArrayBuffer>> {
  try {
    const image = await loadImage(file);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");

    // Draw the image onto the canvas
    ctx.drawImage(image, 0, 0, image.width, image.height);

    // Define transparent black box properties
    const boxWidth = width;
    const boxHeight = height;
    const boxX = (image.width - boxWidth) / 2; // Center horizontally
    const boxY = image.height - boxHeight - margin;

    // Set transparency and fill rectangle
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)"; // 50% transparent black
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, radius);
    ctx.fill();

    // Set text properties
    ctx.fillStyle = textColor;
    ctx.lineWidth = 3;

    // Right Texts
    textRight.forEach((s, i) => {
      ctx.font = `${fontSize}px 'Vazirmatn', sans-serif, 'Noto Color Emoji'`;
      ctx.textAlign = "right";
      ctx.direction = "rtl";
      const rx = boxX + boxWidth - padding;
      const ry = boxY + padding + fontSize + i * lineHeight;
      ctx.fillText(s, rx, ry);
    });

    // Left Texts
    textLeft.forEach((s, i) => {
      ctx.font = `${fontSize}px 'DejaVu Sans Mono', monospace`;
      ctx.textAlign = "left";
      ctx.direction = "ltr";
      const rx = boxX + padding + 10;
      const ry = boxY + padding + 4 + fontSize + i * lineHeight;
      ctx.fillText(s, rx, ry);
    });

    // Save the output
    return canvas.toBuffer("image/jpeg");
  } catch (err) {
    console.error("Error:", err);
  }
  return file; // fallback main image
}
