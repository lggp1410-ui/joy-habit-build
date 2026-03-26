import { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';

interface WheelPickerProps {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  itemHeight?: number;
  visibleItems?: number;
  className?: string;
}

export function WheelPicker({
  items,
  selectedIndex,
  onChange,
  itemHeight = 44,
  visibleItems = 5,
  className = '',
}: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScroll = useRef(0);
  const velocity = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const animFrame = useRef<number>(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const totalHeight = visibleItems * itemHeight;
  const centerOffset = Math.floor(visibleItems / 2) * itemHeight;

  // Sync scroll to selected index
  useEffect(() => {
    setScrollOffset(selectedIndex * itemHeight);
  }, [selectedIndex, itemHeight]);

  const snapToNearest = useCallback((offset: number) => {
    const maxOffset = (items.length - 1) * itemHeight;
    const clamped = Math.max(0, Math.min(maxOffset, offset));
    const index = Math.round(clamped / itemHeight);
    setScrollOffset(index * itemHeight);
    onChange(index);
  }, [items.length, itemHeight, onChange]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startScroll.current = scrollOffset;
    velocity.current = 0;
    lastY.current = e.clientY;
    lastTime.current = Date.now();
    cancelAnimationFrame(animFrame.current);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [scrollOffset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dy = startY.current - e.clientY;
    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocity.current = (lastY.current - e.clientY) / dt;
    }
    lastY.current = e.clientY;
    lastTime.current = now;
    setScrollOffset(startScroll.current + dy);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    // Apply momentum
    const momentumOffset = scrollOffset + velocity.current * 150;
    snapToNearest(momentumOffset);
  }, [scrollOffset, snapToNearest]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const newOffset = scrollOffset + e.deltaY;
    snapToNearest(newOffset);
  }, [scrollOffset, snapToNearest]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden select-none touch-none ${className}`}
      style={{ height: totalHeight }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      {/* Selection highlight */}
      <div
        className="absolute left-0 right-0 rounded-inner bg-muted/60 pointer-events-none z-0"
        style={{ top: centerOffset, height: itemHeight }}
      />

      {/* Fade edges */}
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-card to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none z-10" />

      {/* Items */}
      <div
        className="relative z-[1]"
        style={{ transform: `translateY(${centerOffset - scrollOffset}px)` }}
      >
        {items.map((item, i) => {
          const distance = Math.abs(i * itemHeight - scrollOffset);
          const scale = Math.max(0.7, 1 - distance / (itemHeight * 3));
          const opacity = Math.max(0.3, 1 - distance / (itemHeight * 2.5));

          return (
            <div
              key={i}
              className="flex items-center justify-center text-foreground font-medium text-numbers cursor-pointer"
              style={{
                height: itemHeight,
                transform: `scale(${scale})`,
                opacity,
                transition: isDragging.current ? 'none' : 'all 0.2s ease-out',
              }}
              onClick={() => {
                setScrollOffset(i * itemHeight);
                onChange(i);
              }}
            >
              <span className="text-lg">{item}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
