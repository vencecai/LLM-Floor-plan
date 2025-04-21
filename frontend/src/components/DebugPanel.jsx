import React, { useState, useEffect } from 'react';

function DebugPanel({ boundaryData }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editorInfo, setEditorInfo] = useState({});
  const [lastEvent, setLastEvent] = useState(null);
  
  const togglePanel = () => {
    setIsExpanded(!isExpanded);
  };
  
  // Gather editor information when available
  useEffect(() => {
    if (window.editor) {
      try {
        // Get basic editor info
        const editor = window.editor;
        const editorDetails = {
          hasEditor: !!editor,
          storeAvailable: !!editor.store,
          currentPageId: editor.getCurrentPageId?.() || 'unknown',
          recordCount: editor.store?.allRecords?.().length || 0,
          shapeCount: editor.getCurrentPageShapes?.()?.length || 0
        };
        
        setEditorInfo(editorDetails);
        
        // Update every second when expanded
        if (isExpanded) {
          const interval = setInterval(() => {
            try {
              const updatedDetails = {
                ...editorDetails,
                recordCount: editor.store?.allRecords?.().length || 0,
                shapeCount: editor.getCurrentPageShapes?.()?.length || 0,
                lastUpdate: new Date().toLocaleTimeString()
              };
              setEditorInfo(updatedDetails);
            } catch (e) {
              console.warn("Error updating editor info:", e);
            }
          }, 1000);
          
          return () => clearInterval(interval);
        }
        
        // Listen for shape events
        if (isExpanded && editor.on) {
          try {
            const eventHandler = (info) => {
              setLastEvent({
                type: 'shape-update',
                time: new Date().toLocaleTimeString(),
                data: JSON.stringify(info)
              });
            };
            
            editor.on('shape-update', eventHandler);
            
            return () => {
              editor.off('shape-update', eventHandler);
            };
          } catch (e) {
            console.warn("Could not add event listeners:", e);
          }
        }
      } catch (e) {
        console.warn("Error gathering editor info:", e);
        setEditorInfo({ error: e.message });
      }
    } else {
      setEditorInfo({ hasEditor: false });
    }
  }, [isExpanded]);
  
  // Function to directly scan for shapes
  const scanForShapes = () => {
    try {
      // Try multiple methods to find shapes
      if (!window.editor) {
        alert("Editor not found");
        return;
      }
      
      const shapesCount = {
        getCurrentPageShapes: 0,
        allRecordsFiltered: 0,
        canvasElements: document.querySelectorAll('canvas').length,
        svgElements: document.querySelectorAll('svg').length
      };
      
      try {
        shapesCount.getCurrentPageShapes = window.editor.getCurrentPageShapes?.()?.length || 0;
      } catch (e) {
        console.error("Error getting shapes via getCurrentPageShapes:", e);
      }
      
      try {
        shapesCount.allRecordsFiltered = window.editor.store.allRecords()
          .filter(r => r.typeName === 'shape').length;
      } catch (e) {
        console.error("Error getting shapes via allRecords:", e);
      }
      
      console.log("Shape counts:", shapesCount);
      alert(`Shapes found:
        - via getCurrentPageShapes: ${shapesCount.getCurrentPageShapes}
        - via filtered records: ${shapesCount.allRecordsFiltered}
        - Canvas elements: ${shapesCount.canvasElements}
        - SVG elements: ${shapesCount.svgElements}`);
    } catch (e) {
      console.error("Error scanning for shapes:", e);
      alert(`Error scanning for shapes: ${e.message}`);
    }
  };
  
  // Function to force boundary data update
  const forceBoundaryUpdate = () => {
    try {
      if (!window.editor) {
        alert("Editor not found");
        return;
      }
      
      // Create a rectangle programmatically
      window.editor.createShapes([
        {
          id: 'debug-rect-' + Date.now(),
          type: 'geo',
          x: 100,
          y: 100,
          props: {
            w: 200,
            h: 100,
            geo: 'rectangle',
            color: 'red',
            opacity: 1
          }
        }
      ]);
      
      alert("Created a debug rectangle shape");
    } catch (e) {
      console.error("Error creating shape:", e);
      alert(`Error creating shape: ${e.message}`);
    }
  };
  
  return (
    <div className={`debug-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button className="debug-toggle" onClick={togglePanel}>
        {isExpanded ? 'Hide Debug Info' : 'Show Debug Info'}
      </button>
      
      {isExpanded && (
        <div className="debug-content">
          <h3>Debug Information</h3>
          
          <div className="debug-section">
            <h4>TLDraw Editor Status</h4>
            <table className="debug-table">
              <tbody>
                {Object.entries(editorInfo).map(([key, value]) => (
                  <tr key={key}>
                    <th>{key}</th>
                    <td>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="debug-actions">
              <button className="debug-action-button" onClick={scanForShapes}>
                Scan for Shapes
              </button>
              <button className="debug-action-button" onClick={forceBoundaryUpdate}>
                Create Debug Shape
              </button>
            </div>
          </div>
          
          {lastEvent && (
            <div className="debug-section">
              <h4>Last Event ({lastEvent.time})</h4>
              <pre>{lastEvent.type}: {lastEvent.data}</pre>
            </div>
          )}
          
          <div className="debug-section">
            <h4>Boundary Data ({boundaryData ? boundaryData.length : 0} items)</h4>
            <pre>
              {boundaryData 
                ? JSON.stringify(boundaryData, null, 2) 
                : 'No boundary data available'}
            </pre>
          </div>
          
          {boundaryData && boundaryData.length > 0 && (
            <div className="debug-section">
              <h4>First Shape Properties</h4>
              <table className="debug-table">
                <tbody>
                  {Object.entries(boundaryData[0]).map(([key, value]) => {
                    // Skip complex objects like startPoint
                    if (typeof value === 'object' && value !== null) {
                      value = JSON.stringify(value);
                    }
                    return (
                      <tr key={key}>
                        <th>{key}</th>
                        <td>{value}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DebugPanel; 