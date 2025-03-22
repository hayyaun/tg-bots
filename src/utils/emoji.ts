export function intToEmoji(num: number): string {
  if (!Number.isInteger(num)) throw new Error("Input must be an integer");

  const digitMap: { [key: string]: string } = {
    "0": "0️⃣",
    "1": "1️⃣",
    "2": "2️⃣",
    "3": "3️⃣",
    "4": "4️⃣",
    "5": "5️⃣",
    "6": "6️⃣",
    "7": "7️⃣",
    "8": "8️⃣",
    "9": "9️⃣",
    "-": "➖", // Handle negative numbers
  };

  return num
    .toString()
    .split("")
    .map((digit) => digitMap[digit])
    .join("");
}
