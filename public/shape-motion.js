const { gsap, Physics2DPlugin } = window;
const gravity = 460;
gsap.registerPlugin(Physics2DPlugin);

export function rotated(point, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return { x: point.x * cosine - point.y * sine, y: point.x * sine + point.y * cosine };
}

function edge(shape, axis, direction) {
  const cosine = Math.cos(shape.angle);
  const sine = Math.sin(shape.angle);
  const x = axis === "x" ? cosine : sine;
  const y = axis === "x" ? -sine : cosine;
  return Math.max(...shape.outline.map((point) => direction * (point.x * x + point.y * y))) + 3;
}

export function putOnFloor(shape, height) {
  shape.y = height - edge(shape, "y", 1);
  shape.settled = true;
}

export function fly(shape, vx, vy, spin, viewport, render) {
  const startAngle = shape.angle;
  shape.settled = false;
  shape.tween = gsap.to(shape, {
    duration: 8,
    physics2D: { velocity: Math.hypot(vx, vy), angle: Math.atan2(vy, vx) * 180 / Math.PI, gravity },
    onUpdate() {
      const time = this.time();
      const currentVy = vy + gravity * time;
      shape.angle = startAngle + spin * (1 - Math.exp(-0.9 * time)) / 0.9;
      const { width, height } = viewport();
      const bottom = height - edge(shape, "y", 1);
      const left = edge(shape, "x", -1);
      const right = width - edge(shape, "x", 1);
      const top = edge(shape, "y", -1);

      if (shape.y >= bottom && currentVy >= 0) {
        this.kill();
        shape.y = bottom;
        if (currentVy > 120) fly(shape, vx * 0.45, -currentVy * 0.22, spin * 0.18, viewport, render);
        else putOnFloor(shape, height);
      } else if (left < right && ((shape.x < left && vx < 0) || (shape.x > right && vx > 0))) {
        this.kill();
        shape.x = vx < 0 ? left : right;
        fly(shape, -vx * 0.43, currentVy, -spin * 0.55, viewport, render);
      } else if (shape.y < top && currentVy < 0) {
        this.kill();
        shape.y = top;
        fly(shape, vx, -currentVy * 0.33, spin * 0.55, viewport, render);
      }
      render();
    },
    onComplete() {
      putOnFloor(shape, viewport().height);
      render();
    },
  });
}
