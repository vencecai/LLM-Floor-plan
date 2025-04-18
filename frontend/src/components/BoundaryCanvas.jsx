import React, { useEffect, useCallback } from 'react';
import { Tldraw } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';

function BoundaryCanvas({ onBoundaryChange }) {
  const handleMount = useCallback((editor) => {
    // Store editor instance for later use if needed
    window.editor = editor;

    // Set up listener for changes to the canvas
    editor.store.listen(
      () => {
        const shapes = editor.store.allRecords().filter(record => 
          record.typeName === 'shape'
        );
        
        // Extract boundary data from shapes
        if (shapes.length > 0) {
          const boundaryData = shapes.map(shape => ({
            id: shape.id,
            type: shape.type,
            x: shape.x,
            y: shape.y,
            width: shape.props.w,
            height: shape.props.h,
            rotation: shape.props.rotation,
            points: shape.props.points
          }));
          
          onBoundaryChange(boundaryData);
        } else {
          onBoundaryChange(null);
        }
      },
      { scope: 'boundary-listener' }
    );
  }, [onBoundaryChange]);

  return (
    <div className="boundary-canvas">
      <Tldraw
        onMount={handleMount}
        shapeUtils={[]}
        components={{}}
        customConfig={{
          snapToGrid: true,
          gridSize: 20
        }}
      />
    </div>
  );
}

export default BoundaryCanvas; 