import type { MascotMood } from "@/lib/mascot-state";

const W = 528;
const H = 502;

const FACE_URL: Partial<Record<MascotMood, string>> = {
  calm: "/models/faces/face_calm.png",
  happy: "/models/faces/face_happy.png",
  wink: "/models/faces/face_wink.png",
  joy: "/models/faces/face_joy.png",
  surprised: "/models/faces/face_surprised.png",
  cute: "/models/faces/face_cute.png",
  music: "/models/faces/face_music.png",
};

const GLITCH_RED = "#FF2B4A";
const GLITCH_CYAN = "#2BD9FF";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function easeOut(x: number) {
  return 1 - (1 - x) ** 3;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  emo: string,
  open = 1,
  color = "#F3F5F7",
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = width * 0.035;
  const cx = width / 2;
  const ey = height * 0.43;
  const left = cx - width * 0.17;
  const right = cx + width * 0.17;
  const mouth = height * 0.66;
  const lid = Math.max(0.1, open);
  ctx.lineWidth = width * 0.032;
  const eye = (x: number, w = width * 0.085, h = height * 0.15, rad = width * 0.028) => {
    const hh = h * lid;
    roundRect(ctx, x - w / 2, ey - hh / 2, w, hh, rad * Math.min(1, lid * 1.5));
    ctx.fill();
  };
  const arch = (x: number, rad = width * 0.058) => {
    ctx.beginPath();
    ctx.arc(x, ey + rad * 0.7, rad, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  };
  const s = width * 0.045;
  switch (emo) {
    case "happy":
      eye(left);
      eye(right);
      ctx.beginPath();
      ctx.arc(cx, mouth - height * 0.025, width * 0.12, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      break;
    case "neutral":
      eye(left);
      eye(right);
      ctx.beginPath();
      ctx.moveTo(cx - width * 0.11, mouth);
      ctx.lineTo(cx + width * 0.11, mouth);
      ctx.lineWidth = width * 0.024;
      ctx.stroke();
      break;
    case "wink":
      eye(left);
      arch(right, width * 0.052);
      break;
    case "angry": {
      const w = width * 0.07;
      const h = height * 0.1;
      (
        [
          [left, 1],
          [right, -1],
        ] as const
      ).forEach(([x, sg]) => {
        const xi = x + sg * w;
        const xo = x - sg * w;
        ctx.beginPath();
        ctx.moveTo(xo, ey - h * 0.8);
        ctx.lineTo(xi, ey - h * 0.05);
        ctx.lineTo(xi, ey + h * 0.5);
        ctx.lineTo(xo, ey + h * 0.5);
        ctx.closePath();
        ctx.fill();
      });
      ctx.beginPath();
      ctx.arc(cx, mouth + height * 0.13, width * 0.12, Math.PI * 1.22, Math.PI * 1.78);
      ctx.lineWidth = width * 0.026;
      ctx.stroke();
      break;
    }
    case "surprised":
      eye(left);
      eye(right);
      ctx.beginPath();
      ctx.arc(cx, mouth, width * 0.028, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "cute":
      arch(left);
      arch(right);
      ctx.beginPath();
      ctx.lineWidth = width * 0.024;
      ctx.arc(cx - width * 0.03, mouth - height * 0.04, width * 0.03, Math.PI, 0, true);
      ctx.arc(cx + width * 0.03, mouth - height * 0.04, width * 0.03, Math.PI, 0, true);
      ctx.stroke();
      break;
    case "bored":
      [left, right].forEach((x) => {
        roundRect(ctx, x - width * 0.065, ey - height * 0.013, width * 0.13, height * 0.026, height * 0.013);
        ctx.fill();
      });
      break;
    case "focus":
      eye(left, width * 0.115, height * 0.125, width * 0.024);
      eye(right, width * 0.115, height * 0.125, width * 0.024);
      break;
    case "error":
      ctx.lineWidth = width * 0.03;
      [left, right].forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(x - s, ey - s);
        ctx.lineTo(x + s, ey + s);
        ctx.moveTo(x + s, ey - s);
        ctx.lineTo(x - s, ey + s);
        ctx.stroke();
      });
      break;
    case "joy":
      arch(left, width * 0.065);
      arch(right, width * 0.065);
      break;
    case "sly":
      ctx.lineWidth = width * 0.03;
      ctx.beginPath();
      ctx.moveTo(left + s * 0.8, ey - s);
      ctx.lineTo(left - s * 0.8, ey);
      ctx.lineTo(left + s * 0.8, ey + s);
      ctx.moveTo(right - s * 0.8, ey - s);
      ctx.lineTo(right + s * 0.8, ey);
      ctx.lineTo(right - s * 0.8, ey + s);
      ctx.stroke();
      break;
    case "sad":
      (
        [
          [left, -0.2],
          [right, 0.2],
        ] as const
      ).forEach(([x, angle]) => {
        ctx.save();
        ctx.translate(x, ey + height * 0.02);
        ctx.rotate(angle);
        roundRect(ctx, -width * 0.055, -height * 0.03, width * 0.11, height * 0.06, height * 0.02);
        ctx.fill();
        ctx.restore();
      });
      break;
    default:
      eye(left);
      eye(right);
  }
  ctx.restore();
}

type EqLayout = { x0: number; x1: number; yTop: number; yBot: number; rows: number };

function drawEq(
  ctx: CanvasRenderingContext2D,
  vals: Float32Array,
  layout: EqLayout,
  color: (row: number) => string,
  dim: string,
) {
  const count = vals.length;
  const cw = (layout.x1 - layout.x0) / count;
  const rh = (layout.yBot - layout.yTop) / layout.rows;
  const gx = cw * 0.22;
  const gy = rh * 0.24;
  for (let i = 0; i < count; i += 1) {
    const lit = Math.round(clamp(vals[i] ?? 0) * layout.rows);
    for (let row = 0; row < layout.rows; row += 1) {
      ctx.fillStyle = row < lit ? color(row / (layout.rows - 1)) : dim;
      ctx.fillRect(layout.x0 + i * cw + gx / 2, layout.yBot - (row + 1) * rh + gy / 2, cw - gx, rh - gy);
    }
  }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(url));
    image.src = url;
  });
}

export class MascotScreen {
  readonly canvas: HTMLCanvasElement;
  readonly ready: Promise<void>;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly images = new Map<MascotMood, HTMLImageElement>();
  private readonly scratch: HTMLCanvasElement;
  private readonly plate: HTMLCanvasElement;
  private readonly frame: HTMLCanvasElement;
  private readonly accentRed: HTMLCanvasElement;
  private readonly accentCyan: HTMLCanvasElement;
  private readonly eq = new Float32Array(14);
  private readonly eqTarget = new Float32Array(14);
  private eqNext = 0;
  private lastKey = "";
  private switchAt = 0;
  private painted = false;
  private held = false;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = W;
    this.canvas.height = H;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2d");
    this.ctx = ctx;
    this.scratch = document.createElement("canvas");
    this.scratch.width = W;
    this.scratch.height = H;
    this.plate = document.createElement("canvas");
    this.plate.width = W;
    this.plate.height = H;
    this.frame = document.createElement("canvas");
    this.frame.width = W;
    this.frame.height = H;
    this.accentRed = document.createElement("canvas");
    this.accentRed.width = W;
    this.accentRed.height = H;
    this.accentCyan = document.createElement("canvas");
    this.accentCyan.width = W;
    this.accentCyan.height = H;
    this.ready = this.load();
  }

  private async load() {
    await Promise.all(
      Object.entries(FACE_URL).map(async ([mood, url]) => {
        if (!url) return;
        try {
          this.images.set(mood as MascotMood, await loadImage(url));
        } catch {
          return;
        }
      }),
    );
  }

  private image(mood: MascotMood) {
    return this.images.get(mood) ?? this.images.get("calm") ?? null;
  }

  private fillChannel(layer: HTMLCanvasElement, source: CanvasImageSource, color: string) {
    const ctx = layer.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(source, 0, 0, W, H);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
  }

  private stampAccent(source: CanvasImageSource) {
    this.fillChannel(this.accentRed, source, GLITCH_RED);
    this.fillChannel(this.accentCyan, source, GLITCH_CYAN);
    const ctx = this.ctx;
    const shift = Math.round(W * 0.055);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(this.accentRed, -shift, 0, W, H);
    ctx.drawImage(this.accentCyan, shift, 0, W, H);
    ctx.restore();
  }

  private drawGlitch(target: CanvasRenderingContext2D) {
    const off = this.scratch.getContext("2d");
    if (!off) return;
    off.setTransform(1, 0, 0, 1, 0, 0);
    off.globalCompositeOperation = "source-over";
    off.clearRect(0, 0, W, H);
    off.fillStyle = "#040506";
    off.fillRect(0, 0, W, H);
    off.globalCompositeOperation = "lighter";
    const channels: Array<[string, number, number, number]> = [
      [GLITCH_RED, -W * 0.18, -H * 0.045, 1.08],
      [GLITCH_CYAN, W * 0.16, H * 0.03, 1.04],
      ["#FFFFFF", W * 0.04, -H * 0.01, 1],
    ];
    channels.forEach(([color, dx, dy, scale]) => {
      off.save();
      off.translate(W / 2 + dx, H / 2 + dy);
      off.scale(scale, 1);
      off.translate(-W / 2, -H / 2);
      drawFace(off, W, H, "calm", 1, color);
      off.restore();
    });
    off.globalCompositeOperation = "source-over";
    off.fillStyle = "rgba(255,255,255,0.82)";
    off.font = `600 ${Math.round(W * 0.055)}px ui-monospace, Menlo, Consolas, monospace`;
    off.fillText("0 dB_4OE", W * 0.2, H * 0.8);

    target.setTransform(1, 0, 0, 1, 0, 0);
    target.globalCompositeOperation = "source-over";
    target.fillStyle = "#040506";
    target.fillRect(0, 0, W, H);
    const cuts: Array<[number, number, number]> = [
      [0, H * 0.18, -W * 0.12],
      [H * 0.18, H * 0.14, W * 0.22],
      [H * 0.32, H * 0.16, -W * 0.18],
      [H * 0.48, H * 0.12, W * 0.2],
      [H * 0.6, H * 0.4, -W * 0.1],
    ];
    cuts.forEach(([y, h, dx]) => {
      target.drawImage(this.scratch, 0, y, W, h, dx, y, W, h);
    });
    target.fillStyle = "rgba(255,43,74,0.9)";
    target.fillRect(0, H * 0.16, W, 8);
    target.fillStyle = "rgba(43,217,255,0.9)";
    target.fillRect(0, H * 0.46, W, 8);
    target.fillStyle = "rgba(255,255,255,0.7)";
    target.fillRect(0, H * 0.7, W, 3);
  }

  private stepEq(mood: MascotMood, time: number, dt: number, reduced: boolean) {
    if (reduced) {
      const preset =
        mood === "alarm"
          ? [0.6, 0.7, 0.55, 0.85, 0.75, 0.9, 0.65, 0.95, 0.8, 0.7, 0.9, 0.6, 0.75, 0.5]
          : mood === "sad"
            ? [0.6, 0.55, 0.5, 0.45, 0.4, 0.38, 0.3, 0.3, 0.25, 0.2, 0.18, 0.15, 0.12, 0.1]
            : [0.3, 0.5, 0.4, 0.65, 0.35, 0.55, 0.45, 0.3, 0.6, 0.4, 0.3, 0.5, 0.35, 0.25];
      preset.forEach((value, index) => {
        this.eq[index] = value;
      });
      return;
    }
    if (time > this.eqNext) {
      this.eqNext = time + (mood === "alarm" ? 0.07 : 0.11);
      for (let i = 0; i < this.eqTarget.length; i += 1) {
        const f = i / (this.eqTarget.length - 1);
        let value = 0.15 + 0.5 * Math.random() * (0.6 + 0.4 * Math.sin(time * 3 + i * 0.9));
        if (mood === "alarm") value = 0.4 + 0.6 * Math.random() * (0.6 + 0.4 * Math.sin(time * 9 + i));
        else if (mood === "sad") value = 0.6 * (1 - f) * (0.7 + 0.3 * Math.sin(time * 1.5 + i * 0.5)) + 0.1;
        this.eqTarget[i] = clamp(value);
      }
    }
    for (let i = 0; i < this.eq.length; i += 1) {
      this.eq[i] += ((this.eqTarget[i] ?? 0) - (this.eq[i] ?? 0)) * Math.min(1, dt * 18);
    }
  }

  private writeRgb(data: Uint8ClampedArray, index: number, color: string) {
    const value = Number.parseInt(color.slice(1), 16);
    data[index] = (value >> 16) & 255;
    data[index + 1] = (value >> 8) & 255;
    data[index + 2] = value & 255;
  }

  private tintPixels(split: "mouth" | "sides" | "bands") {
    const ctx = this.plate.getContext("2d");
    if (!ctx) return;
    const image = ctx.getImageData(0, 0, W, H);
    const data = image.data;
    const mouth = Math.round(H * 0.54);
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const index = (y * W + x) * 4;
        const lum = (data[index] ?? 0) + (data[index + 1] ?? 0) + (data[index + 2] ?? 0);
        if (lum < 90) continue;
        if (split === "mouth" && y < mouth) continue;
        let color = "#FFFFFF";
        if (split === "bands") {
          const band = y / H;
          color = band < 0.42 ? GLITCH_CYAN : band > 0.62 ? GLITCH_RED : "#FFFFFF";
        } else if (x < W * 0.46) color = GLITCH_CYAN;
        else if (x > W * 0.54) color = GLITCH_RED;
        this.writeRgb(data, index, color);
      }
    }
    ctx.putImageData(image, 0, 0);
  }

  private paintFace(target: CanvasRenderingContext2D, mood: MascotMood) {
    const plate = this.plate.getContext("2d");
    if (!plate) return;
    plate.setTransform(1, 0, 0, 1, 0, 0);
    plate.globalCompositeOperation = "source-over";
    plate.clearRect(0, 0, W, H);
    plate.fillStyle = "#040506";
    plate.fillRect(0, 0, W, H);
    const photo = this.image(mood);
    if (photo) plate.drawImage(photo, 0, 0, W, H);
    else drawFace(plate, W, H, mood);
    if (mood === "happy" || mood === "cute" || mood === "surprised") this.tintPixels("mouth");
    else if (mood === "wink" || mood === "joy" || mood === "music") {
      this.tintPixels(mood === "music" ? "bands" : "sides");
    }
    target.drawImage(this.plate, 0, 0);
  }

  paint(mood: MascotMood, time: number, dt: number, reduced: boolean) {
    const animated = mood === "listen" || mood === "sad" || mood === "alarm";
    if (mood !== this.lastKey) {
      this.lastKey = mood;
      this.switchAt = time;
      this.painted = false;
      this.held = false;
    }
    const pop = reduced ? 1 : clamp((time - this.switchAt) / 0.18);
    const settled = pop >= 1;
    if (mood === "glitch" && settled && this.held) return false;
    if (!animated && mood !== "glitch" && settled && this.painted) return false;

    const board = this.frame.getContext("2d");
    if (!board) return false;
    board.setTransform(1, 0, 0, 1, 0, 0);
    board.globalCompositeOperation = "source-over";
    board.clearRect(0, 0, W, H);
    board.fillStyle = "#040506";
    board.fillRect(0, 0, W, H);

    if (mood === "glitch") this.drawGlitch(board);
    else if (mood === "alarm") {
      this.stepEq(mood, time, dt, reduced);
      drawEq(
        board,
        this.eq,
        { x0: 0.12 * W, x1: 0.88 * W, yTop: 0.16 * H, yBot: 0.86 * H, rows: 16 },
        (row) => (row > 0.72 ? "#FFFFFF" : row > 0.4 ? GLITCH_CYAN : GLITCH_RED),
        "rgba(43,217,255,0.08)",
      );
    } else if (mood === "listen" || mood === "sad") {
      this.stepEq(mood, time, dt, reduced);
      if (mood === "sad") {
        drawFace(board, W, H, "sad", 1, GLITCH_CYAN);
        drawEq(
          board,
          this.eq,
          { x0: 0.2 * W, x1: 0.8 * W, yTop: 0.57 * H, yBot: 0.84 * H, rows: 7 },
          (row) => (row > 0.55 ? "#FFFFFF" : GLITCH_RED),
          "rgba(255,43,74,0.08)",
        );
      } else {
        const photo = this.image("calm");
        if (photo) board.drawImage(photo, 0, 0, W, H);
        else drawFace(board, W, H, "calm");
        drawEq(
          board,
          this.eq,
          { x0: 0.2 * W, x1: 0.8 * W, yTop: 0.57 * H, yBot: 0.84 * H, rows: 7 },
          (row) => (row > 0.66 ? GLITCH_RED : row > 0.33 ? "#FFFFFF" : GLITCH_CYAN),
          "rgba(255,255,255,0.06)",
        );
      }
    } else this.paintFace(board, mood);

    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#040506";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (pop < 1) {
      ctx.translate(W / 2, H / 2);
      ctx.scale(1, 0.03 + 0.97 * easeOut(pop));
      ctx.translate(-W / 2, -H / 2);
    }
    ctx.drawImage(this.frame, 0, 0);
    if (mood !== "glitch") this.stampAccent(this.frame);
    ctx.restore();
    if (pop < 1) {
      ctx.fillStyle = `rgba(255,255,255,${((1 - pop) * 0.55).toFixed(3)})`;
      ctx.fillRect(0, H / 2 - 2, W, 4);
    }
    this.painted = true;
    if (settled) this.held = true;
    return true;
  }
}
