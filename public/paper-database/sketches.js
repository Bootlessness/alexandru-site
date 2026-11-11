const graphite = "#4d493e";
const blue = "#304aaf";

function pencil(context) {
  let seed = 4817;
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  function line(points, color = graphite, width = 1.15, opacity = .83) {
    const marks = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const [x, y] = points[i - 1];
      const [nextX, nextY] = points[i];
      const steps = Math.ceil(Math.hypot(nextX - x, nextY - y) / 6);
      for (let j = 1; j <= steps; j++) {
        const t = j / steps;
        marks.push([x + (nextX - x) * t + (random() - .5) * .74, y + (nextY - y) * t + (random() - .5) * .74]);
      }
    }

    context.save();
    context.strokeStyle = color;
    context.lineJoin = "round";
    context.lineCap = "round";
    for (const [weight, alpha, offset] of [[width * 2, opacity * .13, .28], [width, opacity, 0]]) {
      context.beginPath();
      context.lineWidth = weight;
      context.globalAlpha = alpha;
      marks.forEach(([x, y], i) => i ? context.lineTo(x, y + offset) : context.moveTo(x, y + offset));
      context.stroke();
    }
    context.restore();
  }

  const box = (x, y, w, h, color, width) => line([[x, y], [x + w, y - .7], [x + w + .3, y + h], [x - .5, y + h + .5], [x, y]], color, width);
  function ellipse(x, y, rx, ry, rotation = 0, color = graphite, width = 1.15, start = 0, end = 2.09 * Math.PI) {
    const points = Array.from({ length: 55 }, (_, i) => {
      const theta = start + (end - start) * i / 54;
      const cx = rx * Math.cos(theta);
      const cy = ry * Math.sin(theta);
      return [x + cx * Math.cos(rotation) - cy * Math.sin(rotation), y + cx * Math.sin(rotation) + cy * Math.cos(rotation)];
    });
    line(points, color, width);
  }

  function label(value, x, y, { color = graphite, font = "10px 'Courier New', monospace", angle = 0 } = {}) {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.fillStyle = color;
    context.font = font;
    context.fillText(value, 0, 0);
    context.restore();
  }

  function fill(points, color) {
    context.save();
    context.beginPath();
    points.forEach(([x, y], i) => i ? context.lineTo(x, y) : context.moveTo(x, y));
    context.closePath();
    context.fillStyle = color;
    context.fill();
    context.restore();
  }

  return { line, box, ellipse, label, fill };
}

const icons = {
  folder: [[[2, 6], [8, 6], [10, 8], [22, 8], [21, 20], [2, 20], [2, 6]], [[2, 10], [19, 10]]],
  stack: [[[6, 2], [21, 4], [19, 21], [4, 19], [6, 2]], [[3, 6], [1, 21], [16, 23]], [[8, 8], [17, 9]], [[7, 12], [16, 13]], [[7, 16], [12, 17]]],
  file: [[[5, 2], [14, 2], [19, 7], [19, 22], [5, 22], [5, 2]], [[14, 2], [14, 7], [19, 7]], [[8, 12], [16, 12]], [[8, 16], [15, 16]]],
  arrow: [[[5, 18], [18, 5]], [[8, 5], [18, 5], [18, 15]]],
  menu: [[[3, 6], [21, 6]], [[3, 12], [18, 12]], [[3, 18], [21, 18]]],
  search: [[[15, 15], [21, 21]]],
  gallery: [[[3, 3], [21, 3], [21, 21], [3, 21], [3, 3]], [[12, 3], [12, 21]], [[3, 12], [21, 12]]],
  table: [[[3, 3], [21, 3], [21, 21], [3, 21], [3, 3]], [[3, 9], [21, 9]], [[3, 15], [21, 15]], [[10, 3], [10, 21]]],
  sort: [[[6, 3], [6, 20], [2, 16]], [[6, 20], [10, 16]], [[14, 5], [22, 5]], [[14, 10], [20, 10]], [[14, 15], [17, 15]]],
};

const art = {
  index({ line, ellipse, fill, label }) {
    const back = [[108, 40], [151, 30], [158, 19], [197, 11], [203, 19], [248, 10], [266, 110], [127, 142]];
    const middle = [[87, 50], [121, 44], [129, 34], [168, 28], [173, 36], [239, 23], [257, 128], [108, 156]];
    const front = [[60, 62], [94, 62], [101, 52], [146, 51], [156, 60], [233, 57], [236, 154], [64, 160]];
    fill(back, "#f8f6ef");
    line([...back, back[0]], graphite, 1.45);
    fill(middle, "#ede9db");
    line([...middle, middle[0]], graphite, 1.5);
    fill(front, "#f1eddf");
    line([...front, front[0]], graphite, 1.5);
    line([[68, 70], [132, 69], [204, 68], [229, 66]], graphite, .8, .47);
    line([[70, 156], [143, 154], [230, 151]], graphite, .85, .51);
    line([[64, 165], [151, 164], [237, 158], [252, 153]], graphite, .95, .45);
    label("A. OPREA", 89, 105, { font: "bold 13px 'Courier New'", angle: -.018 });
    label("PORTFOLIO", 88, 123, { font: "10px 'Courier New'", angle: -.035 });
    ellipse(121, 107, 49, 25, -.13, blue, 1.45, -.28, 6.24);
    label("open a folder", 250, 69, { color: blue, font: "27px Kristi, cursive", angle: -.14 });
    line([[303, 77], [287, 88], [275, 89], [259, 85], [245, 76]], blue, 1.15);
    line([[249, 86], [245, 76], [256, 76]], blue, 1.1);
  },
  etf({ line, box, ellipse, label }) {
    box(51, 27, 258, 115);
    line([[51, 46], [309, 45]]);
    label("ETF SCREENER", 63, 40, { font: "bold 9px 'Courier New'" });
    ellipse(283, 36, 4, 4);
    line([[285, 39], [291, 42]]);
    [65, 82, 100, 118].forEach(y => {
      line([[62, y], [152, y]], graphite, .8, .45);
      box(66, y - 12, 6, 6);
      line([[78, y - 9], [120 + y % 14, y - 9]], graphite, .85, .6);
    });
    line([[163, 54], [163, 133]], graphite, .85, .55);
    line([[177, 123], [290, 123]], graphite, .9, .55);
    line([[180, 108], [201, 96], [215, 100], [231, 77], [249, 84], [266, 70], [287, 65]], "#536747", 1.85);
    ellipse(107, 73, 50, 10, -.09, blue, 1.25);
  },
  movo({ line, box, ellipse, label }) {
    box(94, 18, 84, 131);
    box(99, 25, 74, 117, graphite, .7);
    line([[122, 30], [149, 30]], graphite, .85, .61);
    label("MOVO", 110, 51, { font: "bold 12px 'Courier New'" });
    label("INCOME", 110, 74, { font: "9px 'Courier New'" });
    line([[110, 79], [153, 79]], graphite, .8, .55);
    label("TAX POT", 110, 101, { font: "9px 'Courier New'", color: blue });
    line([[110, 106], [157, 106]], blue, 1.1);
    ellipse(137, 98, 33, 14, -.16, blue, 1.18);
    line([[190, 97], [213, 92], [224, 81], [232, 63]], blue);
    line([[224, 66], [232, 63], [234, 73]], blue);
    ellipse(249, 59, 18, 18, -.12, graphite, .95);
    ellipse(253, 59, 18, 18, -.12, graphite, .8, -1.4, 1.36);
    label("%", 245, 63, { font: "bold 12px 'Courier New'" });
  },
  ledger({ line, box, ellipse, label }) {
    box(60, 30, 235, 112);
    label("TRANSACTION REVIEW", 74, 45, { font: "bold 9px 'Courier New'" });
    [52, 70, 89, 109, 128].forEach(y => line([[60, y], [295, y]], graphite, .85, .65));
    [120, 202, 253].forEach(x => line([[x, 52], [x, 142]], graphite, .9, .65));
    [62, 80, 99, 119, 135].forEach((y, i) => {
      line([[72, y], [106, y]], graphite, .8, .64);
      line([[132, y], [155 + i * 3, y]], graphite, .8, .64);
      line([[216, y], [236, y]], graphite, .8, .64);
      line([[266, y], [270, y + 3], [277, y - 4]], i === 2 ? "#9f4533" : graphite, 1.05);
    });
    ellipse(264, 98, 41, 15, -.14, "#9f4533", 1.4);
    line([[308, 86], [319, 77]], "#9f4533", 1.25);
    line([[313, 96], [328, 92]], "#9f4533", 1.25);
  },
  investment({ line, box, ellipse, label }) {
    box(48, 42, 68, 85);
    box(146, 42, 68, 85);
    box(244, 42, 68, 85);
    label("LEARN", 58, 62);
    label("WEIGH", 155, 62);
    label("DECIDE", 254, 62);
    line([[123, 84], [138, 84], [132, 78]]);
    line([[222, 84], [237, 84], [231, 78]]);
    line([[62, 104], [72, 94], [84, 101], [102, 80]], graphite, 1.3);
    line([[160, 105], [169, 86], [181, 101], [190, 82], [202, 98]], blue, 1.3);
    ellipse(178, 94, 30, 23, -.16, blue, 1.3);
    line([[264, 96], [274, 107], [293, 83]], graphite, 1.8);
  },
  trust({ line, box, ellipse, label }) {
    box(99, 31, 153, 106);
    label("WHAT YOU KNOW", 113, 51, { font: "bold 10px 'Courier New'" });
    line([[113, 63], [234, 63]], graphite, .8, .55);
    line([[113, 73], [211, 73]], graphite, .8, .55);
    label("WHAT YOU CAN CHECK", 113, 98, { font: "bold 10px 'Courier New'", color: blue });
    line([[113, 109], [228, 109]], blue, 1.1);
    ellipse(176, 96, 72, 17, -.11, blue, 1.2);
    line([[267, 93], [278, 102], [297, 76]], blue, 1.55);
  },
  quiet({ line, box, ellipse }) {
    box(79, 31, 202, 107);
    line([[95, 47], [134, 47]], graphite, 1.15);
    line([[95, 56], [116, 56]], graphite, .8);
    box(95, 108, 49, 14);
    ellipse(202, 89, 52, 32, -.17, blue, 1.15);
  },
  risk({ line, box, ellipse, label }) {
    box(60, 28, 239, 112);
    label("RANGE OF OUTCOMES", 76, 48, { font: "bold 10px 'Courier New'" });
    line([[83, 113], [278, 113]], graphite, .9);
    line([[90, 110], [127, 104], [150, 85], [174, 64], [191, 62], [213, 80], [235, 99], [269, 108]], blue, 1.55);
    [111, 148, 185, 222, 259].forEach(x => line([[x, 111], [x, 119]], graphite, .9));
    ellipse(189, 65, 22, 12, -.12, blue, 1.1);
  },
  profile({ line, box, ellipse, label }) {
    box(75, 30, 208, 109);
    ellipse(126, 68, 13, 14, 0, blue, 1.25);
    ellipse(126, 101, 25, 18, 0, blue, 1.25, Math.PI, 2 * Math.PI);
    label("ALEXANDRU OPREA", 168, 65, { font: "bold 10px 'Courier New'" });
    line([[168, 75], [254, 75]], graphite, .9);
    line([[168, 91], [257, 91]], graphite, .9, .55);
    line([[168, 101], [251, 101]], graphite, .9, .55);
    line([[168, 111], [225, 111]], graphite, .9, .55);
  },
  hobbies({ line, ellipse }) {
    const guitar = [[100, 113], [94, 99], [102, 88], [114, 90], [121, 80], [128, 67], [140, 65], [150, 73], [193, 44], [201, 36], [214, 41], [214, 49], [200, 54], [158, 86], [160, 97], [154, 105], [142, 109], [134, 109], [125, 125], [111, 125], [100, 113]];
    line(guitar, graphite, 1.5);
    ellipse(133, 94, 8, 8, -.3, graphite, 1.05);
    line([[116, 108], [206, 46]], graphite, .7);
    line([[122, 109], [207, 50]], graphite, .7);
    ellipse(234, 103, 41, 24, -.24, graphite, 1.45);
    ellipse(256, 96, 5, 5, -.24, graphite, .95);
    [208, 224, 241].forEach((x, i) => ellipse(x, 110 - i * 8, 5, 4, -.24, blue, 1.05));
  },
  letter({ line, ellipse }) {
    line([[88, 50], [262, 46], [268, 126], [91, 129], [88, 50]], graphite, 1.35);
    line([[88, 50], [178, 100], [262, 46]], graphite, 1.15);
    line([[91, 129], [154, 86]], graphite, .9, .64);
    line([[268, 126], [207, 84]], graphite, .9, .64);
    ellipse(179, 96, 15, 13, -.12, blue, 1.5);
    line([[176, 95], [180, 99], [186, 91]], blue, 1.2);
  },
};

export function draw(canvas) {
  const icon = canvas.dataset.icon;
  const [width, height] = icon ? [24, 24] : [360, 170];
  const scale = icon ? 3 : 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  const tools = pencil(context);

  if (icon) {
    const color = icon === "stack" ? blue : graphite;
    icons[icon].forEach(path => tools.line(path, color, 1.45));
    if (icon === "search") tools.ellipse(10, 10, 7, 7, 0, graphite, 1.5);
    return;
  }
  art[canvas.dataset.sketch](tools);
}
