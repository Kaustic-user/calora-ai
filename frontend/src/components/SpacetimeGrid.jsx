import React, { useEffect, useRef } from 'react';

/**
 * SpacetimeGrid - Albert Einstein Gravitational Well / Spacetime Distortion Canvas
 * Simulates a dynamic 2D spacetime fabric where moving the pointer indents the grid inwards
 * towards the cursor like mass curving the fabric of general relativity.
 */
export default function SpacetimeGrid({ currentTheme }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000, active: false });
  const pointsRef = useRef([]);
  const animFrameRef = useRef(null);

  const SPACING = 38; // Grid cell spacing in px
  const RADIUS = 220; // Gravitational influence radius in px
  const PULL_STRENGTH = 0.55; // Intensity of the inward curvature
  const EASE = 0.12; // Relaxation spring interpolation

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Initialize spacetime grid points
    const initPoints = () => {
      const cols = Math.ceil(width / SPACING) + 2;
      const rows = Math.ceil(height / SPACING) + 2;
      const pts = [];

      for (let r = 0; r <= rows; r++) {
        const row = [];
        for (let c = 0; c <= cols; c++) {
          const originX = c * SPACING;
          const originY = r * SPACING;
          row.push({
            originX,
            originY,
            currentX: originX,
            currentY: originY,
            targetX: originX,
            targetY: originY,
          });
        }
        pts.push(row);
      }
      pointsRef.current = pts;
    };

    initPoints();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initPoints();
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

    // Render loop
    const render = () => {
      // Smooth mouse coordinate tracking
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.15;
      mouse.y += (mouse.targetY - mouse.y) * 0.15;

      ctx.clearRect(0, 0, width, height);

      // Get theme primary color dynamically from computed styles
      const computedStyle = getComputedStyle(document.documentElement);
      const accentColor = computedStyle.getPropertyValue('--accent-primary').trim() || '#6366F1';
      const borderColor = computedStyle.getPropertyValue('--border-card').trim() || '#1E293B';

      const pts = pointsRef.current;
      if (!pts || pts.length === 0) return;

      const rows = pts.length;
      const cols = pts[0].length;

      // 1. Update Physics (Gravitational Inward Curvature)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const p = pts[r][c];
          const dx = mouse.x - p.originX;
          const dy = mouse.y - p.originY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (mouse.active && dist < RADIUS) {
            // Curvature equation: Inverse exponential gravity well
            const force = Math.pow(1 - dist / RADIUS, 1.8) * PULL_STRENGTH;
            p.targetX = p.originX + dx * force;
            p.targetY = p.originY + dy * force;
          } else {
            // Relax back to flat spacetime
            p.targetX = p.originX;
            p.targetY = p.originY;
          }

          // Smooth spring physics interpolation
          p.currentX += (p.targetX - p.currentX) * EASE;
          p.currentY += (p.targetY - p.currentY) * EASE;
        }
      }

      // 2. Draw Horizontal Grid Lines
      ctx.lineWidth = 1;
      for (let r = 0; r < rows; r++) {
        ctx.beginPath();
        for (let c = 0; c < cols; c++) {
          const p = pts[r][c];
          if (c === 0) {
            ctx.moveTo(p.currentX, p.currentY);
          } else {
            ctx.lineTo(p.currentX, p.currentY);
          }
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.stroke();
      }

      // 3. Draw Vertical Grid Lines
      for (let c = 0; c < cols; c++) {
        ctx.beginPath();
        for (let r = 0; r < rows; r++) {
          const p = pts[r][c];
          if (r === 0) {
            ctx.moveTo(p.currentX, p.currentY);
          } else {
            ctx.lineTo(p.currentX, p.currentY);
          }
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.stroke();
      }

      // 4. Draw Glowing Curvature Horizon near Mouse Cursor (Gravity Well Highlight)
      if (mouse.active && mouse.x > 0 && mouse.y > 0) {
        // Radial ambient glow
        const radialGrad = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          10,
          mouse.x,
          mouse.y,
          RADIUS
        );
        radialGrad.addColorStop(0, `${accentColor}25`);
        radialGrad.addColorStop(0.5, `${accentColor}0C`);
        radialGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = radialGrad;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Highlight local warped grid lines around the gravity well
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const p = pts[r][c];
            const dist = Math.sqrt(Math.pow(mouse.x - p.currentX, 2) + Math.pow(mouse.y - p.currentY, 2));
            if (dist < RADIUS) {
              const alpha = Math.pow(1 - dist / RADIUS, 1.5) * 0.35;
              ctx.fillStyle = `${accentColor}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
              ctx.beginPath();
              ctx.arc(p.currentX, p.currentY, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [currentTheme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-80"
    />
  );
}
