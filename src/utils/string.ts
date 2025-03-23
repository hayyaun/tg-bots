export function toPercentage(n: number, max: number) {
  return Math.round((n / max) * 100);
}

export function escapeMarkdownV2(text: string): string {
  return text.replace(/\*\*/g, "*").replace(/[_[\]()~`>#+\-=|{}.!]/g, "\\$&");
}
