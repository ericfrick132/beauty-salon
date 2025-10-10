// Lightweight confetti and helper animations (no deps)
export type ConfettiOpts = { particleCount?: number; colors?: string[] };

export function launchConfetti(opts: ConfettiOpts = {}) {
  const particleCount = opts.particleCount ?? 100;
  const colors = opts.colors || ['#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#f5c518'];
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '3000';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  let running = true;
  const particles = Array.from({ length: particleCount }).map(() => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.2,
    vx: (Math.random() - 0.5) * 2,
    vy: Math.random() * 2 + 2,
    size: Math.random() * 6 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.2,
  }));
  const start = performance.now();
  const duration = 1600;
  const tick = (t: number) => {
    if (!running) return;
    const elapsed = t - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });
    if (elapsed < duration) requestAnimationFrame(tick); else cleanup();
  };
  const cleanup = () => { running = false; window.removeEventListener('resize', resize); canvas.remove(); };
  window.addEventListener('resize', resize);
  requestAnimationFrame(tick);
}

