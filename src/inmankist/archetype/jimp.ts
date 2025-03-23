import {
  BlendMode,
  Jimp,
  JimpInstance,
  loadFont,
  measureText,
  measureTextHeight,
} from "jimp";
import path from "path";

const boxWidth = 720; // Adjust box width
const padding = 50;

export async function addTextToImage(
  file: Buffer<ArrayBuffer>,
  textRight: string,
  textLeft: string
): Promise<Buffer<ArrayBuffer>> {
  try {
    // Load image
    const image = await Jimp.read(file);
    const fontPath = path.join(
      process.cwd(),
      `assets/fonts/open-sans/open-sans-32-white/open-sans-32-white.fnt`
    );
    const font = await loadFont(fontPath);

    // text box
    const textHeight = measureTextHeight(font, textRight, 300);
    const boxHeight = textHeight + padding * 2;
    const boxX = image.bitmap.width / 2 - boxWidth / 2;
    const boxY = image.bitmap.height - boxHeight - padding;
    addRoundedBox(image as JimpInstance, boxX, boxY, boxWidth, boxHeight);

    // right text
    const textWidth = measureText(font, textRight);
    const rx = boxX + boxWidth - textWidth - padding;
    const ry = boxY + padding;
    image.print({ x: rx, y: ry, text: textRight, font });

    // left text
    const lx = boxX + padding;
    const ly = boxY + padding;
    image.print({ x: lx, y: ly, text: textLeft, font });

    console.log("Text added to image successfully!");
    return await image.getBuffer("image/jpeg");
  } catch (err) {
    console.error("Error:", err);
  }
  return file; // fallback main image
}

async function addRoundedBox(
  image: JimpInstance,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const radius = 20;

  // Create a new image for the box
  const box = new Jimp({ width, height, color: 0x00000080 }); // Black with 50% transparency

  // Apply rounded corners
  box.scan(0, 0, width, height, (x, y, idx) => {
    const distX = Math.min(x, width - x);
    const distY = Math.min(y, height - y);
    if (distX < radius && distY < radius) {
      box.bitmap.data[idx + 3] = 0; // Make corners transparent
    }
  });

  // Composite box onto image
  image.composite(box, x, y, {
    mode: BlendMode.SRC_OVER,
    opacitySource: 1,
  });

  return image;
}
