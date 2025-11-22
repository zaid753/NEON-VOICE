
import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyser, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
        const parent = canvas.parentElement;
        if (parent) {
            canvas.width = parent.clientWidth * window.devicePixelRatio;
            canvas.height = parent.clientHeight * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = () => {
      // 1. Calculate Audio Data
      let average = 0;
      if (analyser) {
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyser.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for(let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
          }
          average = sum / bufferLength;
      }

      // 2. Animate Grid (Synthwave Floor Effect)
      if (gridRef.current) {
          // Pulse opacity
          const targetOpacity = 0.15 + (average / 255) * 0.4;
          gridRef.current.style.opacity = isActive ? targetOpacity.toFixed(3) : '0.15';
          
          // Move grid to simulate forward movement
          const moveSpeed = isActive ? 2 : 0.5;
          const currentPos = parseFloat(gridRef.current.style.backgroundPositionY || '0');
          gridRef.current.style.backgroundPositionY = `${currentPos + moveSpeed}px`;
          
          // Pulse color slightly
          if (isActive && average > 128) {
              gridRef.current.style.boxShadow = `inset 0 0 50px rgba(56, 189, 248, ${average/500})`;
          } else {
              gridRef.current.style.boxShadow = 'none';
          }
      }

      // 3. Draw Visualizer Bars
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, width, height);

      // Idle State Line
      if (!analyser || !isActive) {
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)'; 
        ctx.lineWidth = 1;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#38bdf8';
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        return;
      }

      // Active State Bars
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const barWidth = (width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      const centerX = width / 2;

      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        const percent = value / 255;
        
        barHeight = percent * (height * 0.7); 

        // Dynamic Color: Cyan -> Purple -> Pink based on intensity
        const r = 56 + (200 * percent);
        const g = 189 - (100 * percent);
        const b = 248;
        
        ctx.fillStyle = `rgba(${r},${g},${b}, ${0.6 + percent * 0.4})`;
        
        // Add glow
        ctx.shadowBlur = 15 * percent;
        ctx.shadowColor = `rgba(${r},${g},${b}, 0.8)`;

        const y = (height / 2) - (barHeight / 2);
        
        // Mirror effect
        ctx.fillRect(centerX + x, y, barWidth - 1, barHeight);
        ctx.fillRect(centerX - x - barWidth, y, barWidth - 1, barHeight);

        x += barWidth;
        if (x > width / 2) break;
      }
      
      // Reset shadow for next frame
      ctx.shadowBlur = 0;

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [analyser, isActive]);

  return (
    <div className="w-full h-48 md:h-64 bg-[#09090b] rounded-2xl border border-zinc-800 relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] group perspective-1000">
        
        {/* 3D Grid Floor */}
        <div 
            className="absolute inset-0 pointer-events-none z-0"
            style={{
                perspective: '500px',
                transformStyle: 'preserve-3d',
                height: '100%',
                overflow: 'hidden'
            }}
        >
            <div
                ref={gridRef}
                className="absolute w-full h-[200%]"
                style={{
                    top: '-50%',
                    transform: 'rotateX(60deg) scale(2)',
                    backgroundImage: `
                        linear-gradient(rgba(39, 39, 42, 0.8) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(39, 39, 42, 0.8) 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px',
                    backgroundPosition: '0 0',
                    opacity: 0.15,
                    transition: 'opacity 0.2s ease'
                }}
            />
        </div>

        {/* Vignette & CRT Scanline */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#09090b_90%)] pointer-events-none z-20"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-30 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20"></div>

        {/* Canvas */}
        <canvas 
            ref={canvasRef} 
            className="w-full h-full relative z-10 mix-blend-screen"
            style={{ width: '100%', height: '100%' }}
        />
    </div>
  );
};

export default AudioVisualizer;
