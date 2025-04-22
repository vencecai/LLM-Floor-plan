import React, { useState, useEffect } from 'react';
import { extractAllRooms, extractFinalNodes } from '../utils/floorPlanUtils';

function DebugPanel({ boundaryData, floorPlanData }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editorInfo, setEditorInfo] = useState({});
  const [lastEvent, setLastEvent] = useState(null);
  const [roomData, setRoomData] = useState([]);
  const [finalNodes, setFinalNodes] = useState([]);
  
  // Extract room data when floor plan data changes
  useEffect(() => {
    if (floorPlanData && boundaryData) {
      try {
        const rooms = extractAllRooms(floorPlanData, boundaryData);
        setRoomData(rooms);
      } catch (error) {
        console.error('Error extracting room data:', error);
        setRoomData([]);
      }
    } else {
      setRoomData([]);
    }
  }, [floorPlanData, boundaryData]);
  
  // 提取最终节点（final=true）的信息
  useEffect(() => {
    if (floorPlanData) {
      try {
        // 从JSON结果中提取最终节点
        const jsonResult = floorPlanData.data?.floor_plan?.json_result;
        if (jsonResult) {
          console.log("Extracting final nodes from JSON result:", jsonResult);
          const nodes = extractFinalNodes(jsonResult);
          console.log("Extracted final nodes:", nodes);
          setFinalNodes(nodes);
        }
      } catch (error) {
        console.error("Error extracting final nodes:", error);
        setFinalNodes([]);
      }
    }
  }, [floorPlanData]);
  
  const togglePanel = () => {
    setIsExpanded(!isExpanded);
  };
  
  // 使用示例 JSON 数据进行测试
  const testWithSampleJson = () => {
    try {
      const sampleJson = {
        "split": {
          "name": "root",
          "area": 820.4526000000001,
          "angle": 1.5707963267948966,
          "final": false,
          "children": [
            {
              "name": "livingSpace",
              "area": 533.29,
              "angle": 0,
              "final": true,
              "children": []
            },
            {
              "name": "kitchenBathroom",
              "area": 287.16,
              "angle": 0,
              "final": false,
              "children": [
                {
                  "name": "kitchen",
                  "area": 164.09,
                  "angle": 0,
                  "final": true,
                  "children": []
                },
                {
                  "name": "bathroom",
                  "area": 123.07,
                  "angle": 0,
                  "final": true,
                  "children": []
                }
              ]
            }
          ]
        }
      };
      
      console.log("Testing with sample JSON data:", sampleJson);
      const nodes = extractFinalNodes(sampleJson);
      console.log("Final nodes extracted from sample data:", nodes);
      setFinalNodes(nodes);
      
      alert(`Extracted ${nodes.length} final nodes`);
    } catch (error) {
      console.error("Error testing sample data:", error);
      alert("Failed to test sample data: " + error.message);
    }
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
          id: 'shape:debug-rect-' + Date.now(),
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
          
          {/* 最终节点信息部分 */}
          {finalNodes.length > 0 && (
            <div className="debug-section">
              <h4>Final Room Nodes ({finalNodes.length} rooms)</h4>
              <table className="debug-table">
                <thead>
                  <tr>
                    <th>Room Name</th>
                    <th>Area</th>
                  </tr>
                </thead>
                <tbody>
                  {finalNodes.map((node, index) => (
                    <tr key={index}>
                      <td>{node.name}</td>
                      <td>{node.area.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* 既有的房间类型和面积部分 */}
          {roomData.length > 0 && (
            <div className="debug-section">
              <h4>Room Types and Areas ({roomData.length} rooms)</h4>
              <table className="debug-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Area</th>
                    <th>Position (x, y)</th>
                    <th>Size (w × h)</th>
                    <th>Final</th>
                  </tr>
                </thead>
                <tbody>
                  {roomData.map((room, index) => (
                    <tr key={index}>
                      <td>{room.name}</td>
                      <td>{room.type}</td>
                      <td>{room.area.toFixed(2)}</td>
                      <td>({room.x.toFixed(1)}, {room.y.toFixed(1)})</td>
                      <td>{room.width.toFixed(1)} × {room.height.toFixed(1)}</td>
                      <td>{room.isFinal ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
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
              <button className="debug-action-button" onClick={testWithSampleJson}>
                Test with Sample JSON
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
          
          {/* Floor Plan JSON Data Section */}
          {floorPlanData && (
            <div className="debug-section">
              <h4>Floor Plan Data</h4>
              <pre className="json-preview">
                {JSON.stringify(floorPlanData, null, 2).substring(0, 500)}...
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DebugPanel; 