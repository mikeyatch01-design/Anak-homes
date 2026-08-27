// ---------- Generic canvas chart utilities ----------
// No page-specific data here — finances.js supplies the numbers.

function setupCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.width;
  const height = rect.height || canvas.height;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width, height };
}

function cssVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

// ---------- Donut chart ----------
function drawDonut(canvasId, segments) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2, cy = height / 2;
  const radius = Math.min(width, height) / 2 - 4;
  const lineWidth = radius * 0.42;
  let start = -Math.PI / 2;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  segments.forEach(seg => {
    const angle = (seg.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - lineWidth / 2, start, start + angle);
    ctx.strokeStyle = seg.color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'butt';
    ctx.stroke();
    start += angle;
  });
}

// Rounds the axis top up to the next multiple of `step` so gridlines
// always land on clean values (10, 20, 30… or 100k, 200k, 300k…).
function axisTicks(maxVal, step) {
  const top = Math.max(step, Math.ceil((maxVal * 1.15) / step) * step);
  return { top, count: top / step };
}

function formatAxisValue(val) {
  if (val >= 1000000) return (val / 1000000) + 'M';
  if (val >= 1000) return (val / 1000) + 'k';
  return String(val);
}

// Only draws every Nth label so dense datasets (e.g. 31 daily points)
// don't overlap; sparse ones (7-12 points) show every label.
function pickLabelStep(count) {
  return Math.max(1, Math.ceil(count / 7));
}

// ---------- Bar chart ----------
function drawBarChart(canvasId, labels, data, color, axisStep) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  const padding = { top: 10, right: 10, bottom: 26, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const { top: max, count: steps } = axisTicks(Math.max(...data, 0), axisStep);

  ctx.strokeStyle = cssVar('--border') || '#EEF0F4';
  ctx.fillStyle = cssVar('--text-muted') || '#6B7280';
  ctx.font = '11px Inter, sans-serif';
  ctx.lineWidth = 1;

  for (let i = 0; i <= steps; i++) {
    const y = padding.top + chartH - (chartH / steps) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.fillText(formatAxisValue(axisStep * i), padding.left - 8, y + 3);
  }

  const barSlot = chartW / data.length;
  const barWidth = Math.min(barSlot * 0.45, 34);
  const labelStep = pickLabelStep(labels.length);

  data.forEach((val, i) => {
    const barHeight = max > 0 ? (val / max) * chartH : 0;
    const x = padding.left + i * barSlot + (barSlot - barWidth) / 2;
    const y = padding.top + chartH - barHeight;

    const radius = Math.min(6, barWidth / 2);
    ctx.beginPath();
    ctx.moveTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.lineTo(x + barWidth - radius, y);
    ctx.arcTo(x + barWidth, y, x + barWidth, y + radius, radius);
    ctx.lineTo(x + barWidth, y + barHeight);
    ctx.lineTo(x, y + barHeight);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    if (i % labelStep === 0) {
      ctx.fillStyle = cssVar('--text-muted') || '#6B7280';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + barWidth / 2, height - 8);
    }
  });
}

// ---------- Line / area chart ----------
// Returns the plotted points (in CSS-pixel canvas space) so callers can
// do hit-testing for tooltips without recomputing the layout.
function drawLineChart(canvasId, labels, data, color, axisStep, hoverIndex) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return [];
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  const padding = { top: 10, right: 10, bottom: 26, left: 44 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const { top: max, count: steps } = axisTicks(Math.max(...data, 0), axisStep);

  ctx.strokeStyle = cssVar('--border') || '#EEF0F4';
  ctx.fillStyle = cssVar('--text-muted') || '#6B7280';
  ctx.font = '11px Inter, sans-serif';
  ctx.lineWidth = 1;

  for (let i = 0; i <= steps; i++) {
    const y = padding.top + chartH - (chartH / steps) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.fillText(formatAxisValue(axisStep * i), padding.left - 8, y + 3);
  }

  const stepX = chartW / Math.max(data.length - 1, 1);
  const points = data.map((val, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + chartH - (max > 0 ? (val / max) * chartH : 0)
  }));

  // area fill
  ctx.beginPath();
  ctx.moveTo(points[0].x, padding.top + chartH);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
  ctx.closePath();
  const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
  gradient.addColorStop(0, color + '33');
  gradient.addColorStop(1, color + '00');
  ctx.fillStyle = gradient;
  ctx.fill();

  // line
  ctx.beginPath();
  points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  const labelStep = pickLabelStep(labels.length);
  ctx.fillStyle = cssVar('--text-muted') || '#6B7280';
  ctx.textAlign = 'center';
  labels.forEach((label, i) => {
    if (i % labelStep === 0) {
      ctx.fillText(label, points[i].x, height - 8);
    }
  });

  // hover guideline + highlighted point
  if (hoverIndex != null && points[hoverIndex]) {
    const p = points[hoverIndex];

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = cssVar('--border') || '#EEF0F4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, padding.top);
    ctx.lineTo(p.x, padding.top + chartH);
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = cssVar('--card') || '#FFFFFF';
    ctx.stroke();
  }

  return points;
}
