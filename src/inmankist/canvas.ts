import { createCanvas, loadImage } from "canvas";

const width = 640; // Adjust box width
const height = 280; // Adjust box width
const radius = 22;
const margin = 48;
const padding = 28;
const fontSize = 42;
const textColor = "white";

export async function addTextToImage(
  file: Buffer<ArrayBuffer>,
  textRight: string,
  textLeft: string
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
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // 50% transparent black
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, radius);
    ctx.fill();

    // Set text properties
    ctx.font = `${fontSize}px 'Vazirmatn', 'Noto Color Emoji', sans-serif`;
    ctx.fillStyle = textColor;
    ctx.lineWidth = 3;

    // Right Texts
    textRight.split("\n").forEach((s, i) => {
      ctx.textAlign = "right";
      ctx.direction = "rtl";
      const rx = boxX + boxWidth - padding;
      const ry = boxY + padding + fontSize + i * (fontSize * 0.9);
      ctx.fillText(s, rx, ry);
    });

    // Left Texts
    textLeft.split("\n").forEach((s, i) => {
      ctx.textAlign = "left";
      ctx.direction = "ltr";
      const rx = boxX + padding;
      const ry = boxY + padding + fontSize + i * (fontSize * 0.9);
      ctx.fillText(s, rx, ry);
    });

    console.log("Text added to image successfully!");

    // Save the output
    const buffer = canvas.toBuffer("image/jpeg");
    return buffer;
  } catch (err) {
    console.error("Error:", err);
  }
  return file; // fallback main image
}
