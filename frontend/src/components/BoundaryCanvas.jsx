import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Tldraw, TldrawEditor } from 'tldraw';
import 'tldraw/tldraw.css';

function BoundaryCanvas({ onBoundaryChange }) {
  const [mounted, setMounted] = useState(false);
  const editorRef = useRef(null);
  
  // When shapes change, process and notify parent component
  const processShapes = useCallback((editor) => {
    try {
      if (!editor) {
        console.warn("No editor instance available");
        return;
      }
      
      // Try different ways to get shapes from the editor
      let shapes = [];
      
      try {
        // Method 1: getCurrentPageShapes
        shapes = editor.getCurrentPageShapes?.() || [];
        console.log("Method 1 - getCurrentPageShapes:", shapes);
      } catch (err) {
        console.error("Error with getCurrentPageShapes:", err);
      }
      
      // If shapes is empty, try alternative methods
      if (!shapes || shapes.length === 0) {
        try {
          // Method 2: Using store
          const store = editor.store;
          const currentPageId = editor.getCurrentPageId();
          
          if (store && currentPageId) {
            const pageState = store.getPage(currentPageId);
            shapes = Object.values(pageState?.shapes || {});
            console.log("Method 2 - Using store:", shapes);
          }
        } catch (err) {
          console.error("Error accessing shapes via store:", err);
        }
      }
      
      // If we have shapes, process them
      if (shapes && shapes.length > 0) {
        console.log("Processing shapes:", shapes);
        
        // Map shapes to boundary data format
        const boundaryData = shapes.map(shape => {
          // Extract shape properties safely
          const props = shape.props || {};
          
          // For geo shapes, ensure we're getting width and height correctly
          let width = 0;
          let height = 0;
          
          if (props.w !== undefined) {
            width = props.w;
          } else if (props.width !== undefined) {
            width = props.width;
          } else {
            width = 100; // Default fallback
          }
          
          if (props.h !== undefined) {
            height = props.h;
          } else if (props.height !== undefined) {
            height = props.height;
          } else {
            height = 100; // Default fallback
          }
          
          // Create boundary object with enhanced details
          return {
            id: shape.id,
            type: shape.type || 'rectangle',
            x: shape.x || 0,
            y: shape.y || 0,
            width: width,
            height: height,
            rotation: props.rotation || 0,
            // Add derived properties (convert to meters with 1 unit = 10cm)
            widthInUnits: parseFloat((width * 0.1).toFixed(2)),
            heightInUnits: parseFloat((height * 0.1).toFixed(2))
          };
        });
        
        console.log("Processed boundary data:", boundaryData);
        onBoundaryChange(boundaryData);
      } else {
        console.log("No shapes found, setting boundary data to empty array");
        onBoundaryChange([]);
      }
    } catch (err) {
      console.error("Error processing shapes:", err);
      onBoundaryChange(null);
    }
  }, [onBoundaryChange]);
  
  // Set up event listeners for the editor
  const setupEventListeners = useCallback((editor) => {
    if (!editor) return;
    
    try {
      // Log editor properties for debugging
      console.log("Setting up TLDraw event listeners with editor:", editor);
      console.log("Editor properties:", {
        hasStore: !!editor.store,
        hasCurrentPageId: !!editor.getCurrentPageId(),
        hasGetCurrentPageShapes: typeof editor.getCurrentPageShapes === 'function',
      });
      
      // Make editor available globally for debugging
      window.editor = editor;
      
      // Set up shape change listeners
      editor.on('update', (update) => {
        console.log("TLDraw update event:", update);
        
        if (update && update.source === 'user') {
          console.log("User-initiated update, processing shapes");
          processShapes(editor);
        } else {
          // Process shapes for any update to ensure we don't miss any
          processShapes(editor);
        }
      });
      
      // Initial shape processing
      console.log("Initial shape processing");
      processShapes(editor);
      
    } catch (err) {
      console.error("Error setting up TLDraw event listeners:", err);
    }
  }, [processShapes]);
  
  // Main render callback for TLDraw
  const handleMount = useCallback((editor) => {
    console.log("TLDraw editor mounted:", editor);
    editorRef.current = editor;
    
    if (editor) {
      setupEventListeners(editor);
      setMounted(true);
    }
  }, [setupEventListeners]);
  
  // Clean up event listeners when component unmounts
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        console.log("Cleaning up TLDraw event listeners");
        editorRef.current.off('update');
        window.editor = null;
      }
    };
  }, []);
  
  // Report editor mounting status
  useEffect(() => {
    console.log("BoundaryCanvas mounted state:", mounted);
  }, [mounted]);

  return (
    <div className="boundary-canvas">
      <Tldraw 
        onMount={handleMount}
      />
    </div>
  );
}

export default BoundaryCanvas; 