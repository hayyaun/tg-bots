import { createCanvas } from "canvas";

type DailyActivePoint = {
  date: Date;
  active: number;
};

type ChartOptions = {
  title?: string;
};

export function generateDailyActiveUsersChart(
  points: DailyActivePoint[],
  options: ChartOptions = {}
): Buffer {
  const width = 900;
  const height = 420;
  const padding = { top: 60, right: 30, bottom: 70, left: 70 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.font = "14px Arial";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#2d3436";

  // Title
  if (options.title) {
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText(options.title, width / 2, padding.top / 2);
  }

  // Guard against empty data
  const series = points.length > 0 ? points : [{ date: new Date(), active: 0 }];

  const maxValue = Math.max(1, ...series.map((p) => p.active));
  const gridLines = 5;
  const stepValue = Math.max(1, Math.ceil(maxValue / gridLines));
  const yMax = stepValue * gridLines;

  // Axes and grid
  ctx.strokeStyle = "#dfe6e9";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  for (let i = 0; i <= gridLines; i++) {
    const value = (yMax / gridLines) * i;
    const y =
      padding.top + chartHeight - (value / yMax) * chartHeight + (i === gridLines ? 0.5 : 0);

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.textAlign = "right";
    ctx.font = "12px Arial";
    ctx.fillStyle = "#636e72";
    ctx.fillText(value.toString(), padding.left - 10, y);
    ctx.setLineDash([4, 4]);
  }

  ctx.setLineDash([]);
  ctx.strokeStyle = "#b2bec3";
  ctx.lineWidth = 1.5;

  // Axes lines
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  // Prepare scales
  const xStep = series.length > 1 ? chartWidth / (series.length - 1) : chartWidth;
  const toX = (index: number) => padding.left + index * xStep;
  const toY = (value: number) =>
    padding.top + chartHeight - Math.min(1, value / yMax) * chartHeight;

  // Area fill
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(series[0].active));
  series.forEach((point, idx) => {
    ctx.lineTo(toX(idx), toY(point.active));
  });
  ctx.lineTo(toX(series.length - 1), height - padding.bottom);
  ctx.lineTo(toX(0), height - padding.bottom);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, "rgba(33, 150, 243, 0.18)");
  gradient.addColorStop(1, "rgba(33, 150, 243, 0)");
  ctx.fillStyle = gradient;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.strokeStyle = "#2196f3";
  ctx.lineWidth = 2.5;
  series.forEach((point, idx) => {
    const x = toX(idx);
    const y = toY(point.active);
    if (idx === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  // Points
  ctx.fillStyle = "#1565c0";
  series.forEach((point, idx) => {
    const x = toX(idx);
    const y = toY(point.active);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // X labels
  const labelEvery = Math.max(1, Math.floor(series.length / 7));
  ctx.font = "12px Arial";
  ctx.fillStyle = "#2d3436";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  series.forEach((point, idx) => {
    if (idx % labelEvery !== 0 && idx !== series.length - 1) return;
    const x = toX(idx);
    const label = dateFormatter.format(point.date);
    ctx.fillText(label, x, height - padding.bottom + 16);
  });

  return canvas.toBuffer("image/png");
}

