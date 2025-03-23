import { createCanvas, loadImage } from "canvas";

const width = 640; // Adjust box width
const height = 280; // Adjust box width
const radius = 22;
const padding = 50;
const fontSize = 48;
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
    const boxY = image.height - boxHeight - 50; // 50px from bottom

    // Set transparency and fill rectangle
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // 50% transparent black
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, radius);
    ctx.fill();

    // Set text properties
    ctx.font = `${fontSize}px 'Vazirmatn', 'Noto Color Emoji', sans-serif`;
    ctx.textAlign = "right";
    ctx.direction = "rtl";
    ctx.fillStyle = textColor;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;

    // Draw the text with stroke for visibility
    textRight.split("\n").forEach((s, i) => {
      const rx = boxX + boxWidth - padding;
      const ry = boxY + padding + 20 + i * (fontSize * 1.0);
      // ctx.strokeText(s, rx, ry);
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
