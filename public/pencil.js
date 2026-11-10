const pencilColor = getComputedStyle(document.documentElement).getPropertyValue("--pencil").trim();

// Individual pencil flecks build up where a stroke passes repeatedly.
export function pencilSegment(from, to, brush, color = pencilColor) {
  const chalkControl = document.getElementById("chalk-grain");
  const grain = chalkControl ? Number(chalkControl.value) / 100 : 0.5;
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(distance / 0.55));
  brush.save();
  brush.globalCompositeOperation = "source-over";
  brush.strokeStyle = color;
  brush.fillStyle = color;
  brush.lineWidth = Math.max(0.7, 2.2 - grain * 3);
  brush.lineCap = "round";
  brush.globalAlpha = 0.055 + Math.max(0, 1 - 2 * grain) * 0.75;
  brush.beginPath();
  brush.moveTo(from.x, from.y);
  brush.lineTo(to.x, to.y);
  brush.stroke();
  if (!distance && grain < 0.5) {
    brush.beginPath();
    brush.arc(to.x, to.y, brush.lineWidth / 2, 0, Math.PI * 2);
    brush.fill();
  }

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    const pressure = from.pressure + (to.pressure - from.pressure) * t;
    const spread = (1.25 + pressure * 1.8) * (0.55 + grain * 0.9);
    const flecks = Math.ceil(3 + pressure * 4);
    for (let j = 0; j < flecks; j++) {
      const dx = (Math.random() + Math.random() - 1) * spread;
      const dy = (Math.random() + Math.random() - 1) * spread;
      const size = 0.3 + Math.random() * 0.65;
      brush.globalAlpha = (0.12 + Math.random() * 0.32) * (0.55 + pressure) * Math.min(1.4, 2 * grain);
      brush.fillRect(x + dx, y + dy, size, size * (0.65 + Math.random() * 0.7));
    }
  }
  brush.restore();
}
