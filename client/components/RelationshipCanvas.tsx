import React, { useEffect, useRef } from 'react';
import { TableRelationship, TableColumn } from '@/lib/table-editor/types';

interface RelationshipCanvasProps {
  relationships: TableRelationship[];
  tables: Array<{
    id: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    columns?: TableColumn[];
  }>;
  zoom: number;
  pan: { x: number; y: number };
}

export function RelationshipCanvas({ relationships, tables, zoom, pan }: RelationshipCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x, pan.y);

    // Constants for table layout
    const TITLE_BAR_HEIGHT = 32; // Height of title bar
    const COLUMN_HEADER_HEIGHT = 40; // Height of column headers row
    const ROW_NUMBER_WIDTH = 60; // Width of row number column (#)
    const COLUMN_WIDTH = 200; // Min width per data column (from minWidth: '200px')

    // Draw relationships
    relationships.forEach(rel => {
      if (!rel.isActive) return;

      const fromTable = tables.find(t => t.id === rel.fromTable);
      const toTable = tables.find(t => t.id === rel.toTable);

      if (!fromTable || !toTable || !fromTable.columns || !toTable.columns) return;

      // Find column indices
      const fromColumnIndex = fromTable.columns.findIndex(c => c.column_name === rel.fromColumn);
      const toColumnIndex = toTable.columns.findIndex(c => c.column_name === rel.toColumn);

      if (fromColumnIndex === -1 || toColumnIndex === -1) return;

      // Calculate exact column positions
      // X position: account for row number column + column index * width
      const fromColumnX = fromTable.position.x + ROW_NUMBER_WIDTH + (fromColumnIndex + 0.5) * COLUMN_WIDTH;
      const toColumnX = toTable.position.x + ROW_NUMBER_WIDTH + (toColumnIndex + 0.5) * COLUMN_WIDTH;

      // Y position: go to the column header row (after title bar)
      const fromHeaderY = fromTable.position.y + TITLE_BAR_HEIGHT + COLUMN_HEADER_HEIGHT / 2;
      const toHeaderY = toTable.position.y + TITLE_BAR_HEIGHT + COLUMN_HEADER_HEIGHT / 2;

      // Use consistent color logic - same schema = cyan, different = orange
      const fromTableParts = rel.fromTable.split('.');
      const toTableParts = rel.toTable.split('.');
      const isSameSchema = fromTableParts[0] === toTableParts[0];
      const relationColor = isSameSchema ? '#06B6D4' : '#F59E0B';
      
      // Start from the specific column header center
      const startX = fromColumnX;
      const startY = fromHeaderY;
      
      // End at the specific column header center
      const endX = toColumnX;
      const endY = toHeaderY;
      
      // Create a curved path that goes ABOVE and connects to column headers
      const distance = Math.abs(endX - startX);
      const verticalDistance = Math.abs(endY - startY);
      
      // Make the curve go up from the column headers
      const curveHeight = Math.max(80, Math.min(250, distance * 0.4));
      const topY = Math.min(startY, endY) - curveHeight;
      
      // Control points for smooth curve
      const cp1x = startX;
      const cp1y = topY;
      const cp2x = endX;
      const cp2y = topY;
      
      // Function to draw small arrows along the path
      const drawArrowsAlongPath = () => {
        const numArrows = Math.max(24, Math.floor(distance / 15)); // Triple the arrows - much denser pattern
        
        for (let i = 0; i < numArrows; i++) {
          const t = (i + 1) / (numArrows + 1); // Don't put arrows at start/end
          
          // Calculate point on bezier curve
          const x = Math.pow(1-t, 3) * startX + 
                   3 * Math.pow(1-t, 2) * t * cp1x + 
                   3 * (1-t) * Math.pow(t, 2) * cp2x + 
                   Math.pow(t, 3) * endX;
          const y = Math.pow(1-t, 3) * startY + 
                   3 * Math.pow(1-t, 2) * t * cp1y + 
                   3 * (1-t) * Math.pow(t, 2) * cp2y + 
                   Math.pow(t, 3) * endY;
          
          // Calculate tangent for arrow direction
          const dx = 3 * Math.pow(1-t, 2) * (cp1x - startX) + 
                    6 * (1-t) * t * (cp2x - cp1x) + 
                    3 * Math.pow(t, 2) * (endX - cp2x);
          const dy = 3 * Math.pow(1-t, 2) * (cp1y - startY) + 
                    6 * (1-t) * t * (cp2y - cp1y) + 
                    3 * Math.pow(t, 2) * (endY - cp2y);
          
          const angle = Math.atan2(dy, dx);
          
          // Draw small arrow
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-6, -2);
          ctx.lineTo(-6, 2);
          ctx.closePath();
          ctx.fillStyle = relationColor;
          ctx.fill();
          ctx.restore();
        }
      };
      
      // Draw the arrows instead of a line
      drawArrowsAlongPath();
      
      // Draw circles at connection points (no vertical lines, but keep original position)
      // Draw circle at the end column (above header)
      ctx.beginPath();
      ctx.arc(endX, endY - 15, 4, 0, Math.PI * 2);
      ctx.fillStyle = relationColor;
      ctx.fill();
      
      // Draw circle at the start column (above header)
      ctx.beginPath();
      ctx.arc(startX, startY - 15, 4, 0, Math.PI * 2);
      ctx.fillStyle = relationColor;
      ctx.fill();
      
      // Draw column names below the connection points
      ctx.save();
      ctx.font = '11px sans-serif';
      ctx.fillStyle = relationColor;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3;
      
      // Background for better readability
      const drawTextWithBackground = (text: string, x: number, y: number) => {
        const metrics = ctx.measureText(text);
        const padding = 4;
        
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - metrics.width/2 - padding, y - 10, metrics.width + padding*2, 14);
        ctx.restore();
        
        ctx.fillStyle = relationColor;
        ctx.fillText(text, x, y);
      };
      
      // Column names removed for cleaner look
      ctx.restore();

      // Relationship type label removed for cleaner look
    });

    ctx.restore();
  }, [relationships, tables, zoom, pan]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      width={window.innerWidth}
      height={window.innerHeight}
      style={{ zIndex: 9999 }}
    />
  );
}