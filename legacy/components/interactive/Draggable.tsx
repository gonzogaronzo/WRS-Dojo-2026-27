
import React, { useState, useRef, useEffect } from 'react';

interface DraggableProps {
  children: React.ReactNode;
  initialPos?: { x: number; y: number };
  onDragEnd?: (pos: { x: number; y: number }) => void;
  className?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  viewportScale?: number;
}

const Draggable: React.FC<DraggableProps> = ({ 
  children, 
  initialPos = { x: 0, y: 0 }, 
  onDragEnd, 
  className = '',
  disabled = false,
  style,
  viewportScale = 1
}) => {
  const [pos, setPos] = useState(initialPos);
  const [isDragging, setIsDragging] = useState(false);
  
  // High-fidelity tracking refs
  const startMousePos = useRef({ x: 0, y: 0 });
  const startElemPos = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  // Sync state if external position changes
  useEffect(() => {
    if (!isDragging) {
      setPos(initialPos);
    }
  }, [initialPos.x, initialPos.y, isDragging]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    
    setIsDragging(true);
    hasMovedRef.current = false;
    
    // Remember EXACT starting points
    startMousePos.current = { x: e.clientX, y: e.clientY };
    startElemPos.current = { x: pos.x, y: pos.y };
    
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
      setPos({
        x: startElemPos.current.x + dx,
        y: startElemPos.current.y + dy
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (nodeRef.current) {
      nodeRef.current.releasePointerCapture(e.pointerId);
    }
    
    if (hasMovedRef.current && onDragEnd) {
      onDragEnd(pos);
    }
  };

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
        left: `${pos.x}px`,
        top: `${pos.y}px`,
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
