import {
  createCanvas,
  CanvasRenderingContext2D as NodeCanvasRenderingContext2D,
} from "canvas";

type DailyActivePoint = {
  date: Date;
  active: number;
};

type ChartOptions = {
  title?: string;
  activeLabel?: string;
  totalLabel?: string;
};

type ChartDimensions = {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
  chartWidth: number;
  chartHeight: number;
  legendX: number;
  legendY: number;
};

type Scale = {
  toX: (index: number) => number;
  toY: (value: number) => number;
  yMax: number;
  labelEvery: number;
  dateFormatter: Intl.DateTimeFormat;
};

const COLORS = {
  background: "#ffffff",
  textPrimary: "#2d3436",
  textMuted: "#636e72",
  grid: "#dfe6e9",
  axis: "#b2bec3",
  areaStart: "rgba(33, 150, 243, 0.18)",
  areaEnd: "rgba(33, 150, 243, 0)",
  activeLine: "#2196f3",
  activePoint: "#1565c0",
  totalsLine: "#e91e63",
  totalsPoint: "#d81b60",
  totalsAreaStart: "rgba(233, 30, 99, 0.14)",
  totalsAreaEnd: "rgba(233, 30, 99, 0)",
};

const GRID_LINES = 5;
const WIDTH = 900;
const HEIGHT = 420;
const PADDING = { top: 60, right: 30, bottom: 70, left: 70 };

export function generateDailyActiveUsersChart(
  points: DailyActivePoint[],
  totalPoints: DailyActivePoint[],
  options: ChartOptions = {}
): Buffer {
  const dimensions = createDimensions();
  const canvas = createCanvas(dimensions.width, dimensions.height);
  const ctx = canvas.getContext("2d");

  // Guard against empty data
  const series = points.length > 0 ? points : [{ date: new Date(), active: 0 }];
  const totals = totalPoints.length > 0 ? totalPoints : undefined;
  const scale = createScale(series, totals, dimensions);

  drawBackground(ctx, dimensions);
  drawTitle(ctx, dimensions, options.title);
  drawGrid(ctx, dimensions, scale.yMax);
  drawAxes(ctx, dimensions);

  drawArea(ctx, series, scale, dimensions, COLORS.areaStart, COLORS.areaEnd);
  drawLine(ctx, series, scale, COLORS.activeLine, 2.5);
  drawPoints(ctx, series, scale, COLORS.activePoint, 4);

  if (totals) {
    drawArea(ctx, totals, scale, dimensions, COLORS.totalsAreaStart, COLORS.totalsAreaEnd);
    drawLine(ctx, totals, scale, COLORS.totalsLine, 2);
    drawPoints(ctx, totals, scale, COLORS.totalsPoint, 3.5);
  }

  drawXAxisLabels(ctx, series, scale, dimensions);
  drawLegend(ctx, dimensions, options, Boolean(totals));

  return canvas.toBuffer("image/png");
}

function createDimensions(): ChartDimensions {
  const chartWidth = WIDTH - PADDING.left - PADDING.right;
  const chartHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const legendX = WIDTH - PADDING.right - 150;
  const legendY = PADDING.top - 30;

  return {
    width: WIDTH,
    height: HEIGHT,
    padding: PADDING,
    chartWidth,
    chartHeight,
    legendX,
    legendY,
  };
}

function createScale(
  series: DailyActivePoint[],
  totals: DailyActivePoint[] | undefined,
  dimensions: ChartDimensions
): Scale {
  const maxValue = Math.max(
    1,
    ...series.map((p) => p.active),
    ...(totals ? totals.map((p) => p.active) : [])
  );
  const stepValue = Math.max(1, Math.ceil(maxValue / GRID_LINES));
  const yMax = stepValue * GRID_LINES;
  const xStep =
    series.length > 1 ? dimensions.chartWidth / (series.length - 1) : dimensions.chartWidth;

  const toX = (index: number) => dimensions.padding.left + index * xStep;
  const toY = (value: number) =>
    dimensions.padding.top +
    dimensions.chartHeight -
    Math.min(1, value / yMax) * dimensions.chartHeight;

  const labelEvery = Math.max(1, Math.floor(series.length / 7));
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  return { toX, toY, yMax, labelEvery, dateFormatter };
}

function drawBackground(ctx: NodeCanvasRenderingContext2D, dimensions: ChartDimensions) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, dimensions.width, dimensions.height);
  ctx.font = "14px Arial";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.textPrimary;
}

function drawTitle(ctx: NodeCanvasRenderingContext2D, dimensions: ChartDimensions, title?: string) {
  if (!title) return;
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.fillText(title, dimensions.width / 2, dimensions.padding.top / 2);
}

function drawGrid(ctx: NodeCanvasRenderingContext2D, dimensions: ChartDimensions, yMax: number) {
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  for (let i = 0; i <= GRID_LINES; i++) {
    const value = (yMax / GRID_LINES) * i;
    const y =
      dimensions.padding.top +
      dimensions.chartHeight -
      (value / yMax) * dimensions.chartHeight +
      (i === GRID_LINES ? 0.5 : 0);

    ctx.beginPath();
    ctx.moveTo(dimensions.padding.left, y);
    ctx.lineTo(dimensions.width - dimensions.padding.right, y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.textAlign = "right";
    ctx.font = "12px Arial";
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(value.toString(), dimensions.padding.left - 10, y);
    ctx.setLineDash([4, 4]);
  }
}

function drawAxes(ctx: NodeCanvasRenderingContext2D, dimensions: ChartDimensions) {
  ctx.setLineDash([]);
  ctx.strokeStyle = COLORS.axis;
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(dimensions.padding.left, dimensions.padding.top);
  ctx.lineTo(dimensions.padding.left, dimensions.height - dimensions.padding.bottom);
  ctx.lineTo(dimensions.width - dimensions.padding.right, dimensions.height - dimensions.padding.bottom);
  ctx.stroke();
}

function drawArea(
  ctx: NodeCanvasRenderingContext2D,
  series: DailyActivePoint[],
  scale: Scale,
  dimensions: ChartDimensions,
  startColor: string,
  endColor: string
) {
  ctx.beginPath();
  ctx.moveTo(scale.toX(0), scale.toY(series[0].active));
  series.forEach((point, idx) => {
    ctx.lineTo(scale.toX(idx), scale.toY(point.active));
  });
  ctx.lineTo(scale.toX(series.length - 1), dimensions.height - dimensions.padding.bottom);
  ctx.lineTo(scale.toX(0), dimensions.height - dimensions.padding.bottom);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(
    0,
    dimensions.padding.top,
    0,
    dimensions.height - dimensions.padding.bottom
  );
  gradient.addColorStop(0, startColor);
  gradient.addColorStop(1, endColor);
  ctx.fillStyle = gradient;
  ctx.fill();
}

function drawLine(
  ctx: NodeCanvasRenderingContext2D,
  series: DailyActivePoint[],
  scale: Scale,
  color: string,
  lineWidth: number
) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  series.forEach((point, idx) => {
    const x = scale.toX(idx);
    const y = scale.toY(point.active);
    if (idx === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
}

function drawPoints(
  ctx: NodeCanvasRenderingContext2D,
  series: DailyActivePoint[],
  scale: Scale,
  color: string,
  radius: number
) {
  ctx.fillStyle = color;
  series.forEach((point, idx) => {
    const x = scale.toX(idx);
    const y = scale.toY(point.active);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawXAxisLabels(
  ctx: NodeCanvasRenderingContext2D,
  series: DailyActivePoint[],
  scale: Scale,
  dimensions: ChartDimensions
) {
  ctx.font = "12px Arial";
  ctx.fillStyle = COLORS.textPrimary;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  series.forEach((point, idx) => {
    if (idx % scale.labelEvery !== 0 && idx !== series.length - 1) return;
    const x = scale.toX(idx);
    const label = scale.dateFormatter.format(point.date);
    ctx.fillText(label, x, dimensions.height - dimensions.padding.bottom + 16);
  });
}

function drawLegend(
  ctx: NodeCanvasRenderingContext2D,
  dimensions: ChartDimensions,
  options: ChartOptions,
  hasTotals: boolean
) {
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "13px Arial";

  ctx.fillStyle = COLORS.activeLine;
  ctx.beginPath();
  ctx.arc(dimensions.legendX, dimensions.legendY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.textPrimary;
  ctx.fillText(options.activeLabel ?? "Daily Active Users", dimensions.legendX + 12, dimensions.legendY);

  if (hasTotals) {
    const row2Y = dimensions.legendY + 18;
    ctx.fillStyle = COLORS.totalsLine;
    ctx.beginPath();
    ctx.arc(dimensions.legendX, row2Y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.textPrimary;
    ctx.fillText(options.totalLabel ?? "Total Users", dimensions.legendX + 12, row2Y);
  }
}

