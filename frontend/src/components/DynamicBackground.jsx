import React, { useEffect, useRef } from 'react';

/**
 * DynamicBackground - Curated 5 High-Performance Interactive Canvas Backgrounds
 *
 * 1. spacetime - Albert Einstein Gravitational Spacetime Inward Curvature
 * 2. metabolic - Cellular ATP & Glucose Lattice (Calorie Combustion Sparks)
 * 3. amino - Amino Acid & Macronutrient Peptide Chains (Protein Synthesis)
 * 4. magnetic - Magnetic Monopole Vector Field (Flux Lines)
 * 5. interstellar - Optical Relativistic Gravitational Lensing & Satellite Orbit
 */
export default function DynamicBackground({ bgMode = 'spacetime', currentTheme = 'cyber' }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000, active: false });
  const animFrameRef = useRef(null);
  const stateRef = useRef({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Helper to get active theme CSS colors
    const getThemeColors = () => {
      const style = getComputedStyle(document.documentElement);
      return {
        primary: style.getPropertyValue('--accent-primary').trim() || '#6366F1',
        secondary: style.getPropertyValue('--accent-secondary').trim() || '#06B6D4',
        border: style.getPropertyValue('--border-card').trim() || '#1E293B',
        protein: style.getPropertyValue('--color-protein').trim() || '#818CF8',
        carbs: style.getPropertyValue('--color-carbs').trim() || '#F59E0B',
        fat: style.getPropertyValue('--color-fat').trim() || '#F43F5E',
      };
    };

    // ==========================================
    // 1. SPACETIME GRID INIT
    // ==========================================
    const initSpacetime = () => {
      const SPACING = 38;
      const cols = Math.ceil(width / SPACING) + 2;
      const rows = Math.ceil(height / SPACING) + 2;
      const pts = [];
      for (let r = 0; r <= rows; r++) {
        const row = [];
        for (let c = 0; c <= cols; c++) {
          const originX = c * SPACING;
          const originY = r * SPACING;
          row.push({ originX, originY, currentX: originX, currentY: originY, targetX: originX, targetY: originY });
        }
        pts.push(row);
      }
      stateRef.current.spacetimePts = pts;
    };

    // ==========================================
    // 2. METABOLIC ATP HEX LATTICE INIT
    // ==========================================
    const initMetabolic = () => {
      const hexes = [];
      const stepX = 46;
      const stepY = 28;
      const cols = Math.ceil(width / stepX) + 3;
      const rows = Math.ceil(height / stepY) + 3;

      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const x = c * stepX + (r % 2 === 0 ? 0 : stepX / 2);
          const y = r * stepY;
          hexes.push({ x, y, energy: 0 });
        }
      }
      const sparks = [];
      for (let i = 0; i < 50; i++) {
        sparks.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
        });
      }
      stateRef.current.hexes = hexes;
      stateRef.current.sparks = sparks;
    };

    // ==========================================
    // 3. AMINO ACID PEPTIDE CHAINS INIT
    // ==========================================
    const initAmino = () => {
      const nodes = [];
      const count = 55;
      const types = ['protein', 'carbs', 'fat', 'fiber'];
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          type: types[i % types.length],
          radius: 3.5 + Math.random() * 2,
        });
      }
      stateRef.current.aminoNodes = nodes;
    };

    // ==========================================
    // 4. MAGNETIC MONOPOLE INIT
    // ==========================================
    const initMagnetic = () => {
      const needles = [];
      const spacing = 32;
      const cols = Math.ceil(width / spacing);
      const rows = Math.ceil(height / spacing);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          needles.push({ x: c * spacing + spacing / 2, y: r * spacing + spacing / 2, angle: 0 });
        }
      }
      stateRef.current.needles = needles;
    };

    // ==========================================
    // 5. INTERSTELLAR LENSING INIT
    // ==========================================
    const initInterstellar = () => {
      const stars = [];
      for (let i = 0; i < 120; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 1.8 + 0.5,
          alpha: Math.random() * 0.7 + 0.3,
        });
      }
      const satellites = [
        { angle: 0, dist: 45, speed: 0.04, size: 2.5 },
        { angle: Math.PI / 2, dist: 70, speed: -0.025, size: 2 },
        { angle: Math.PI, dist: 95, speed: 0.018, size: 3 },
      ];
      stateRef.current.stars = stars;
      stateRef.current.satellites = satellites;
    };

    // Initializer dispatch
    const initCurrentBg = () => {
      switch (bgMode) {
        case 'spacetime': initSpacetime(); break;
        case 'metabolic': initMetabolic(); break;
        case 'amino': initAmino(); break;
        case 'magnetic': initMagnetic(); break;
        case 'interstellar': initInterstellar(); break;
        default: initSpacetime(); break;
      }
    };

    initCurrentBg();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initCurrentBg();
    };

    const handleMouseMove = (e) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
      mouseRef.current.targetX = -1000;
      mouseRef.current.targetY = -1000;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // ==========================================
    // RENDER LOOP
    // ==========================================
    const render = () => {
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.15;
      mouse.y += (mouse.targetY - mouse.y) * 0.15;

      ctx.clearRect(0, 0, width, height);
      const colors = getThemeColors();

      if (bgMode === 'spacetime') {
        // 1. EINSTEIN SPACETIME GRAVITY WELL
        const pts = stateRef.current.spacetimePts;
        if (pts && pts.length > 0) {
          const rows = pts.length;
          const cols = pts[0].length;
          const RADIUS = 220;
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const p = pts[r][c];
              const dx = mouse.x - p.originX;
              const dy = mouse.y - p.originY;
              const dist = Math.hypot(dx, dy);
              if (mouse.active && dist < RADIUS) {
                const force = Math.pow(1 - dist / RADIUS, 1.8) * 0.55;
                p.targetX = p.originX + dx * force;
                p.targetY = p.originY + dy * force;
              } else {
                p.targetX = p.originX;
                p.targetY = p.originY;
              }
              p.currentX += (p.targetX - p.currentX) * 0.12;
              p.currentY += (p.targetY - p.currentY) * 0.12;
            }
          }
          ctx.lineWidth = 1;
          for (let r = 0; r < rows; r++) {
            ctx.beginPath();
            for (let c = 0; c < cols; c++) {
              const p = pts[r][c];
              if (c === 0) ctx.moveTo(p.currentX, p.currentY);
              else ctx.lineTo(p.currentX, p.currentY);
            }
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.stroke();
          }
          for (let c = 0; c < cols; c++) {
            ctx.beginPath();
            for (let r = 0; r < rows; r++) {
              const p = pts[r][c];
              if (r === 0) ctx.moveTo(p.currentX, p.currentY);
              else ctx.lineTo(p.currentX, p.currentY);
            }
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.stroke();
          }
          if (mouse.active && mouse.x > 0) {
            const radGrad = ctx.createRadialGradient(mouse.x, mouse.y, 10, mouse.x, mouse.y, RADIUS);
            radGrad.addColorStop(0, `${colors.primary}22`);
            radGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = radGrad;
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, RADIUS, 0, Math.PI * 2);
            ctx.fill();
          }
        }

      } else if (bgMode === 'metabolic') {
        // 2. METABOLIC ATP / GLUCOSE LATTICE
        const hexes = stateRef.current.hexes || [];
        const sparks = stateRef.current.sparks || [];
        const RADIUS = 180;

        hexes.forEach((h) => {
          const dist = Math.hypot(mouse.x - h.x, mouse.y - h.y);
          if (mouse.active && dist < RADIUS) {
            h.energy = Math.min(1, h.energy + (1 - dist / RADIUS) * 0.2);
          } else {
            h.energy *= 0.94;
          }

          ctx.beginPath();
          const r = 10 + h.energy * 4;
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const hx = h.x + r * Math.cos(angle);
            const hy = h.y + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.strokeStyle = h.energy > 0.05 ? `${colors.primary}${Math.floor(h.energy * 200).toString(16).padStart(2, '0')}` : 'rgba(255, 255, 255, 0.03)';
          ctx.lineWidth = 1 + h.energy * 1.5;
          ctx.stroke();
        });

        // Glowing ATP Sparks
        sparks.forEach((s) => {
          s.x += s.vx;
          s.y += s.vy;
          if (s.x < 0) s.x = width;
          if (s.x > width) s.x = 0;
          if (s.y < 0) s.y = height;
          if (s.y > height) s.y = 0;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `${colors.secondary}66`;
          ctx.fill();
        });

      } else if (bgMode === 'amino') {
        // 3. AMINO ACID PEPTIDE CHAINS
        const nodes = stateRef.current.aminoNodes || [];
        nodes.forEach((n) => {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > width) n.vx *= -1;
          if (n.y < 0 || n.y > height) n.vy *= -1;

          const dist = Math.hypot(mouse.x - n.x, mouse.y - n.y);
          if (mouse.active && dist < 160) {
            const angle = Math.atan2(mouse.y - n.y, mouse.x - n.x);
            n.x += Math.cos(angle) * 1.8;
            n.y += Math.sin(angle) * 1.8;
          }

          let color = colors.primary;
          if (n.type === 'protein') color = colors.protein;
          if (n.type === 'carbs') color = colors.carbs;
          if (n.type === 'fat') color = colors.fat;

          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        });

        // Peptide Bonds
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
            if (d < 110) {
              ctx.beginPath();
              ctx.moveTo(nodes[i].x, nodes[i].y);
              ctx.lineTo(nodes[j].x, nodes[j].y);
              ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 * (1 - d / 110)})`;
              ctx.stroke();
            }
          }
        }

      } else if (bgMode === 'magnetic') {
        // 4. MAGNETIC MONOPOLE
        const needles = stateRef.current.needles || [];
        needles.forEach((n) => {
          let angle = 0;
          if (mouse.active && mouse.x > 0) {
            angle = Math.atan2(mouse.y - n.y, mouse.x - n.x);
          }
          n.angle += (angle - n.angle) * 0.1;
          const len = 7;
          ctx.beginPath();
          ctx.moveTo(n.x - Math.cos(n.angle) * len, n.y - Math.sin(n.angle) * len);
          ctx.lineTo(n.x + Math.cos(n.angle) * len, n.y + Math.sin(n.angle) * len);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        });

      } else if (bgMode === 'interstellar') {
        // 5. INTERSTELLAR LENSING
        const stars = stateRef.current.stars || [];
        const satellites = stateRef.current.satellites || [];
        const LENS_R = 170;

        stars.forEach((s) => {
          let rx = s.x;
          let ry = s.y;
          if (mouse.active && mouse.x > 0) {
            const dx = s.x - mouse.x;
            const dy = s.y - mouse.y;
            const dist = Math.hypot(dx, dy);
            if (dist < LENS_R && dist > 1) {
              const warp = Math.pow(1 - dist / LENS_R, 2) * 35;
              rx = s.x + (dx / dist) * warp;
              ry = s.y + (dy / dist) * warp;
            }
          }
          ctx.beginPath();
          ctx.arc(rx, ry, s.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
          ctx.fill();
        });

        // Orbiting satellites around cursor
        if (mouse.active && mouse.x > 0) {
          satellites.forEach((sat) => {
            sat.angle += sat.speed;
            const sx = mouse.x + Math.cos(sat.angle) * sat.dist;
            const sy = mouse.y + Math.sin(sat.angle) * (sat.dist * 0.4);
            ctx.beginPath();
            ctx.arc(sx, sy, sat.size, 0, Math.PI * 2);
            ctx.fillStyle = colors.secondary;
            ctx.shadowColor = colors.secondary;
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
          });
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [bgMode, currentTheme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-80 transition-opacity duration-500"
    />
  );
}
