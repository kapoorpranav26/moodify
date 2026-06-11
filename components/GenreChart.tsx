'use client';
import { useEffect, useRef } from 'react';
import { GenreInfo } from '@/lib/genres';
import styles from './GenreChart.module.css';

interface GenreChartProps {
  data: { genre: GenreInfo; count: number }[];
  total: number;
  activeGenres: Set<string>;
  onToggle: (name: string) => void;
}

export default function GenreChart({ data, total, activeGenres, onToggle }: GenreChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 180;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const outerR = 78;
    const innerR = 48;
    let startAngle = -Math.PI / 2;

    ctx.clearRect(0, 0, size, size);

    data.forEach(({ genre, count }) => {
      const slice = (count / total) * Math.PI * 2;
      const isActive = activeGenres.size === 0 || activeGenres.has(genre.name);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = isActive ? genre.color : genre.color + '40';
      ctx.fill();
      ctx.strokeStyle = 'var(--bg-surface, #0e0e1a)';
      ctx.lineWidth = 2;
      ctx.stroke();
      startAngle += slice;
    });

    // Inner circle cutout
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--bg-surface') || '#0e0e1a';
    ctx.fill();

    // Center text
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${dpr > 1 ? 22 : 20}px Space Grotesk, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total.toString(), cx, cy - 8);
    ctx.font = `500 11px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('tracks', cx, cy + 12);
  }, [data, total, activeGenres]);

  if (data.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.legend}>
        {data.slice(0, 6).map(({ genre, count }) => {
          const isActive = activeGenres.size === 0 || activeGenres.has(genre.name);
          return (
            <button
              key={genre.name}
              className={`${styles.legendItem} ${!isActive ? styles.legendDim : ''}`}
              onClick={() => onToggle(genre.name)}
            >
              <span className={styles.legendDot} style={{ background: genre.color }} />
              <span className={styles.legendName}>{genre.name}</span>
              <span className={styles.legendPct}>{Math.round((count / total) * 100)}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
