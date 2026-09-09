
import React, { useState, useRef } from 'react';

interface DraggableProps {
  children: React.ReactNode;
  initialPos?: { x: number; y: number };
  /** Emits the live position while a card is moving; existing callers may ignore it. */
  onDrag?: (pos: { x: number; y: number }) => void;
  onDragEnd?: (pos: { x: number; y: number }) => void;
  className?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  viewportScale?: number;
}

const Draggable: React.FC<DraggableProps> = ({ 
  children, 
  initialPos = { x: 0, y: 0 }, 
  onDrag,
  onDragEnd, 
  className = '',
  disabled = false,
  style,
  viewportScale = 1
}) => {
  const [pos, setPos] = useState(initialPos);
  const posRef = useRef(initialPos);
  const [isDragging, setIsDragging] = useState(false);
  
  // High-fidelity tracking refs
  const startMousePos = useRef({ x: 0, y: 0 });
  const startElemPos = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    
    setIsDragging(true);
    hasMovedRef.current = false;
    
    // Remember EXACT starting points
    const startingPos = initialPos;
    posRef.current = startingPos;
    setPos(startingPos);
    startMousePos.current = { x: e.clientX, y: e.clientY };
    startElemPos.current = startingPos;
    
    if (nodeRef.current) {
      nodeRef.current.setPointerCapture(e.pointerId);
    }
    
    e.stopPropagation();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    // Calculate the mouse shift (delta), adjusting for container scale
    const dx = (e.clientX - startMousePos.current.x) / viewportScale;
    const dy = (e.clientY - startMousePos.current.y) / viewportScale;

    // Filter out micro-jitters - lowered for immediate response
    if (!hasMovedRef.current) {
      hasMovedRef.current = true;
    }

    if (hasMovedRef.current) {
      // Apply the delta to the initial position
      // This is "Absolute Delta" positioning - immune to layout jumps
      const nextPos = {
        x: startElemPos.current.x + dx,
        y: startElemPos.current.y + dy
      };
      posRef.current = nextPos;
      setPos(nextPos);
      onDrag?.(nextPos);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    if (nodeRef.current) {
      nodeRef.current.releasePointerCapture(e.pointerId);
    }
    
    if (hasMovedRef.current && onDragEnd) {
      onDragEnd(posRef.current);
    }
    setIsDragging(false);
  };

  // Outside a drag, the caller remains the source of truth. This lets
  // synchronized presenter positions update without a setState effect.
  const displayPos = isDragging ? pos : initialPos;

  const handleClick = (e: React.MouseEvent) => {
    if (hasMovedRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  return (
    <div
      ref={nodeRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={handleClick}
      className={`touch-none cursor-grab active:cursor-grabbing ${className}`}
      style={{
        ...style,
        position: style?.position || 'absolute',
        left: `${displayPos.x}px`,
        top: `${displayPos.y}px`,
        // Transitions are disabled during drag to prevent lag/rubber-banding
        transition: isDragging ? 'none' : 'transform 0.15s ease-out, left 0.1s, top 0.1s',
        zIndex: isDragging ? 9999 : (style?.zIndex || 10),
        // Visual "lift" feedback
        boxShadow: isDragging ? '0 30px 60px -12px rgba(0, 0, 0, 0.6)' : style?.boxShadow,
        transform: `${style?.transform || ''} ${isDragging ? 'scale(1.05)' : 'scale(1)'}`,
      }}
    >
      {children}
    </div>
  );
};

export default Draggable;
