"use client";

import { useState, useRef, useCallback } from "react";

interface DraggableListProps<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number, dragHandleProps: DragHandleProps) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
}

interface DragHandleProps {
  onTouchStart: (e: React.TouchEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function DraggableList<T>({
  items,
  onReorder,
  renderItem,
  keyExtractor,
}: DraggableListProps<T>) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleDragStart = useCallback((index: number, clientY: number) => {
    setDraggingIndex(index);
    startY.current = clientY;
    currentY.current = clientY;
  }, []);

  const handleDragMove = useCallback(
    (clientY: number) => {
      if (draggingIndex === null || !containerRef.current) return;
      currentY.current = clientY;

      // Find which item we're over
      for (let i = 0; i < itemRefs.current.length; i++) {
        const ref = itemRefs.current[i];
        if (!ref) continue;
        const rect = ref.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (clientY < midY) {
          setOverIndex(i);
          return;
        }
      }
      setOverIndex(items.length - 1);
    },
    [draggingIndex, items.length]
  );

  const handleDragEnd = useCallback(() => {
    if (draggingIndex !== null && overIndex !== null && draggingIndex !== overIndex) {
      const newItems = [...items];
      const [moved] = newItems.splice(draggingIndex, 1);
      newItems.splice(overIndex, 0, moved);
      onReorder(newItems);
    }
    setDraggingIndex(null);
    setOverIndex(null);
  }, [draggingIndex, overIndex, items, onReorder]);

  // Touch handlers
  const handleTouchStart = (index: number) => (e: React.TouchEvent) => {
    handleDragStart(index, e.touches[0].clientY);
  };

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (draggingIndex === null) return;
      e.preventDefault();
      handleDragMove(e.touches[0].clientY);
    },
    [draggingIndex, handleDragMove]
  );

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Mouse handlers
  const handleMouseDown = (index: number) => (e: React.MouseEvent) => {
    handleDragStart(index, e.clientY);
    const onMouseMove = (ev: MouseEvent) => handleDragMove(ev.clientY);
    const onMouseUp = () => {
      handleDragEnd();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      ref={containerRef}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="space-y-3"
    >
      {items.map((item, index) => {
        const isDragging = draggingIndex === index;
        const isOver = overIndex === index && draggingIndex !== index;

        return (
          <div
            key={keyExtractor(item, index)}
            ref={(el) => { itemRefs.current[index] = el; }}
            className={`transition-transform duration-150 ${
              isDragging ? "opacity-50 scale-[0.97]" : ""
            } ${isOver ? "border-t-2 border-forge-accent" : ""}`}
          >
            {renderItem(item, index, {
              onTouchStart: handleTouchStart(index),
              onMouseDown: handleMouseDown(index),
            })}
          </div>
        );
      })}
    </div>
  );
}
