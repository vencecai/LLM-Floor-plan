import React, { useState, useEffect, useCallback, useRef } from 'react';
import BoundaryCanvas from './components/BoundaryCanvas';
import TextInput from './components/TextInput';
import BoundaryInfo from './components/BoundaryInfo';
import DebugPanel from './components/DebugPanel';
import RoomVisualizer from './components/RoomVisualizer';
import RoomStyler from './components/RoomStyler';
import ApiTestWindow from './components/ApiTestWindow';
import CoreApiTestWindow from './components/CoreApiTestWindow';
import './styles/App.css';
import './styles/ApiTestWindow.css';
import { extractAllRooms } from './utils/floorPlanUtils';

function App() {
  const [boundaryData, setBoundaryData] = useState(null);
  const [description, setDescription] = useState('');
  const [generatedFloorPlan, setGeneratedFloorPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const editorRef = useRef(null);
  
  // Add state for room colors
  const [roomColors, setRoomColors] = useState({});
  
  // Add state to store extracted room data
  const [extractedRooms, setExtractedRooms] = useState([]);
  
  // New state for windows
  const [showGrasshopperWindow, setShowGrasshopperWindow] = useState(false);
  const [showCoreApiWindow, setShowCoreApiWindow] = useState(false);
  
  // API base URL
  const apiBaseUrl = process.env.NODE_ENV === 'production' 
    ? window.location.origin
    : 'http://localhost:5000';

  // Function to check if a shape is a valid geometric object
  const isValidGeometricShape = useCallback((shape) => {
    // Define a list of valid geometric shape types
    const validGeometricTypes = [
      'rectangle', 
      'ellipse', 
      'triangle', 
      'diamond', 
      'polygon', 
      'star', 
      'line', 
      'frame',
      'geo',
      'box',
      'arrow',
      'square',
      'circle',
      // Add any other shape types that tldraw might use
      'sticky',
      'pencil',
      'group'
    ];
    
    // For debugging
    console.log(`Validating shape type: ${shape.type}, isValid: ${validGeometricTypes.includes(shape.type)}`);
    
    // Check if shape type is geometric (not image, video, etc.)
    return shape.type !== 'image' && 
           shape.type !== 'video' && 
           shape.type !== 'note' && 
           validGeometricTypes.includes(shape.type);
  }, []);

  // Handle boundary data changes safely
  const handleBoundaryChange = useCallback((data) => {
    try {
      // Log boundary data for debugging
      console.log("Boundary data received:", data);
      
      // Validate the incoming data
      if (data && Array.isArray(data)) {
        // Filter out any non-geometric objects
        const geoData = data.filter(item => isValidGeometricShape(item));
        
        console.log("Filtered geometric boundary data:", geoData);
        
        if (geoData.length === 0 && data.length > 0) {
          console.warn("No geometric shapes in boundary data");
          setError("No valid geometry found. Please draw rectangles or other shapes to define boundaries.");
          return;
        }
        
        setBoundaryData(geoData);
        setError(null);
      } else if (data === null) {
        setBoundaryData(null);
      } else {
        console.warn("Invalid boundary data received:", data);
        setError("Invalid boundary data format");
      }
    } catch (err) {
      console.error("Error processing boundary data:", err);
      setError("Error processing boundary data");
    }
  }, [isValidGeometricShape]);
  
  // Function to manually force a boundary capture
  const forceBoundaryCapture = useCallback(() => {
    if (!window.editor) {
      setError("Editor not initialized yet");
      return;
    }
    
    try {
      // Try to get shapes from the editor
      const shapes = window.editor.getCurrentPageShapes?.() || [];
      console.log("Manual capture - found shapes:", shapes);
      
      if (shapes.length > 0) {
        // Filter out non-geometric objects
        const geoShapes = shapes.filter(shape => isValidGeometricShape(shape));
        
        console.log("Manual capture - filtered geometric shapes:", geoShapes);
        
        if (geoShapes.length === 0) {
          setError("No geometric shapes found on canvas. Please draw rectangles or other shapes to define boundaries.");
          return;
        }
        
        // Process shapes into boundary data
        const processedData = geoShapes.map(shape => {
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
          
          return {
            id: shape.id,
            type: shape.type || 'rectangle',
            x: shape.x || 0,
            y: shape.y || 0,
            width: width,
            height: height,
            rotation: props.rotation || 0,
            // Add derived properties
            widthInUnits: parseFloat((width * 0.1).toFixed(2)),
            heightInUnits: parseFloat((height * 0.1).toFixed(2)),
          };
        });
        
        console.log("Manual capture - processed data:", processedData);
        setBoundaryData(processedData);
        setError(null);
      } else {
        setError("No shapes found on canvas");
      }
    } catch (err) {
      console.error("Error in manual boundary capture:", err);
      setError(`Error capturing boundaries: ${err.message}`);
    }
  }, [isValidGeometricShape]);
  
  // Reset the state
  const resetState = useCallback(() => {
    setBoundaryData(null);
    setGeneratedFloorPlan(null);
    setError(null);
  }, []);

  /**
   * Generate floor plan using streaming API
   * @param {string} promptText - Description text
   * @param {Array} boundaries - Boundary data
   * @param {Object} preferences - Optional parameters
   */
  const generateFloorPlanStream = async (promptText, boundaries, preferences = {}) => {
    // Reset stream text
    setStreamingText("");
    setIsStreaming(true);
    
    try {
      // Build API request URL
      const apiUrl = `${apiBaseUrl}/api/generate-floor-plan-stream`;
      console.log(`Sending stream request to: ${apiUrl}`);
      
      // Prepare request data
      const requestData = {
        boundary_data: boundaries,
        description: promptText,
        preferences: preferences
      };
      
      // Create event source
      const eventSource = new EventSource(`${apiUrl}?data=${encodeURIComponent(JSON.stringify(requestData))}`);
      
      // Use fetch to send POST request and get streaming response
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      // Check HTTP status
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      // Get readable stream from response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // Process stream data
      let done = false;
      let accumulatedData = "";
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (done) break;
        
        // Decode binary data to text
        const textChunk = decoder.decode(value);
        accumulatedData += textChunk;
        
        // Process SSE format data
        const events = accumulatedData.split("\n\n");
        accumulatedData = events.pop() || ""; // Last one may be incomplete
        
        for (const event of events) {
          if (event.startsWith("data: ")) {
            const jsonData = event.substring(6); // Remove "data: " prefix
            try {
              const data = JSON.parse(jsonData);
              
              // Process based on data type
              if (data.type === "chunk") {
                // Update streaming text
                setStreamingText(prev => prev + data.content);
              } else if (data.type === "final") {
                // Stream response complete, set final result
                setStreamingText("");
                setGeneratedFloorPlan({
                  message: data.message,
                  data: {
                    floor_plan: JSON.parse(data.floor_plan),
                    boundary: boundaries,
                    description: promptText
                  }
                });
                setIsStreaming(false);
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error("Parsing event data failed:", e, jsonData);
            }
          }
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Stream generation failed:', error);
      setStreamingText("");
      setIsStreaming(false);
      setError(error.message || 'Stream generation failed');
      return { success: false, error: error.message };
    }
  };

  const handleGenerate = async () => {
    console.log("Generate button clicked");
    console.log("Current boundary data:", boundaryData);
    console.log("Current description:", description);
    
    if (!boundaryData || boundaryData.length === 0) {
      console.warn("No boundary data available");
      
      // Try to force capture before alerting
      forceBoundaryCapture();
      
      // If still no boundary data after forced capture
      if (!boundaryData || boundaryData.length === 0) {
        alert('Please draw a boundary on the canvas.');
        return;
      }
    }
    
    // Check that we only have geometric objects
    const nonGeoObjects = boundaryData.filter(item => !isValidGeometricShape(item));
    if (nonGeoObjects.length > 0) {
      console.warn("Found non-geometric objects in boundary data");
      setError("Only geometric shapes can be used as boundaries. Please use rectangles, ellipses, or other shapes to define your floor plan.");
      return;
    }

    if (!description.trim()) {
      console.warn("No description provided");
      alert('Please enter a description for your floor plan.');
      return;
    }

    // Set loading state
    console.log("Setting loading state");
    setIsLoading(true);
    setError(null);
    
    try {
      // Use streaming generation instead of regular generation
      const result = await generateFloorPlanStream(description, boundaryData, {});
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Note: Stream generation results will be set to state by the stream handler
    } catch (error) {
      console.error('Error generating floor plan:', error);
      setError(error.message || 'Error generating floor plan. Please try again.');
      alert(error.message || 'Error generating floor plan. Please try again.');
    } finally {
      console.log("Generation process complete");
      setIsLoading(false);
    }
  };

  // Store editor instance reference
  useEffect(() => {
    if (window.editor) {
      editorRef.current = window.editor;
    }
  }, [generatedFloorPlan]);

  // Handle room color changes
  const handleRoomColorChange = useCallback((colors) => {
    setRoomColors(colors);
  }, []);

  // Process room data after floor plan is generated
  useEffect(() => {
    if (generatedFloorPlan && boundaryData) {
      try {
        console.log("Extracting room data for styling");
        
        // Check if there's a JSON result
        let jsonData = null;
        if (generatedFloorPlan.data?.floor_plan?.json_result) {
          // If json_result is a string, try to parse it
          if (typeof generatedFloorPlan.data.floor_plan.json_result === 'string') {
            try {
              jsonData = JSON.parse(generatedFloorPlan.data.floor_plan.json_result);
              console.log("Parsed JSON data:", jsonData);
            } catch (e) {
              console.error("Failed to parse JSON string:", e);
              // Use original string
              jsonData = generatedFloorPlan.data.floor_plan.json_result;
            }
          } else {
            // If it's already an object, use it directly
            jsonData = generatedFloorPlan.data.floor_plan.json_result;
          }
        }
        
        // Use parsed JSON data or original floorPlanData
        const rooms = extractAllRooms(jsonData || generatedFloorPlan, boundaryData);
        console.log("Extracted room data:", rooms);
        setExtractedRooms(rooms);
        
        // Initialize room colors
        if (rooms.length > 0 && Object.keys(roomColors).length === 0) {
          const initialColors = {};
          // Set default color for each unique room type
          const uniqueTypes = [...new Set(rooms.map(r => r.type))];
          uniqueTypes.forEach(type => {
            initialColors[type] = 'white'; // Default white
          });
          setRoomColors(initialColors);
        }
      } catch (error) {
        console.error("Error extracting room data:", error);
      }
    }
  }, [generatedFloorPlan, boundaryData]);

  return (
    <div className="app-fullscreen">
      <header>
        <h1>LLM Floor Plan Generator</h1>
        <div className="header-actions">
          <button className="header-button" onClick={forceBoundaryCapture}>
            Capture Shapes
          </button>
          <button className="header-button" onClick={resetState}>
            Reset
          </button>
          {generatedFloorPlan && (
            <button 
              className="header-button save-button"
              onClick={() => {
                if (showGrasshopperWindow) {
                  // If Grasshopper window is already open, close it
                  setShowGrasshopperWindow(false);
                }
                // Show Grasshopper save window and automatically trigger save function
                setShowGrasshopperWindow(true);
                // Short delay to ensure the component is mounted
                setTimeout(() => {
                  const saveButton = document.querySelector('.api-save-button');
                  if (saveButton) saveButton.click();
                }, 500);
              }}
            >
              Save to Grasshopper
            </button>
          )}
          <button 
            className="header-button api-test-toggle" 
            onClick={() => setShowCoreApiWindow(!showCoreApiWindow)}
          >
            {showCoreApiWindow ? 'Hide Apartment API' : 'Send to Apartment API'}
          </button>
        </div>
      </header>
      
      {/* Show Grasshopper Save Window when toggled */}
      {showGrasshopperWindow && (
        <ApiTestWindow 
          floorPlanData={generatedFloorPlan?.data?.floor_plan?.json_result || generatedFloorPlan?.data?.floor_plan} 
          onClose={() => setShowGrasshopperWindow(false)} 
        />
      )}

      {/* Show Core API Test Window when toggled */}
      {showCoreApiWindow && (
        <CoreApiTestWindow 
          floorPlanData={generatedFloorPlan?.data?.floor_plan?.json_result || generatedFloorPlan?.data?.floor_plan} 
          onClose={() => setShowCoreApiWindow(false)} 
        />
      )}

      {error && (
        <div className="error-notification">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <main className="main-container">
        <div className="drawing-section">
          <BoundaryCanvas onBoundaryChange={handleBoundaryChange} />
          
          {/* 添加房间可视化组件 */}
          {generatedFloorPlan && editorRef.current && (
            <RoomVisualizer 
              floorPlanData={generatedFloorPlan} 
              editor={editorRef.current} 
              boundaryData={boundaryData}
              roomColors={roomColors}
            />
          )}
        </div>

        <div className="floating-chat-section">
          <h2>Describe Your Floor Plan</h2>
          
          {/* Room Styler Component when floor plan is generated */}
          {generatedFloorPlan && !isStreaming && extractedRooms.length > 0 && (
            <RoomStyler 
              floorPlanData={{ rooms: extractedRooms }} 
              onColorChange={handleRoomColorChange}
            />
          )}
          
          {/* Display generated results above */}
          {isStreaming && (
            <div className="stream-section">
              <div className="stream-content">
                {streamingText}
                <span className="cursor"></span>
              </div>
            </div>
          )}
          
          {generatedFloorPlan && !isStreaming && (
            <div className="result-section">
              <h2>Generated Floor Plan</h2>
              <div className="result-tabs">
                <div className="result-content">
                  <div className="result-info">
                    <p><strong>Description:</strong> {generatedFloorPlan.data.description}</p>
                    <p><strong>Boundary Data:</strong> {generatedFloorPlan.data.boundary.length} shape(s)</p>
                  </div>
                  
                  <div className="result-json">
                    <h3>Floor Plan Structure</h3>
                    <div className="json-section">
                      <pre>{JSON.stringify(generatedFloorPlan.data.floor_plan.json_result, null, 2)}</pre>
                    </div>
                    
                    <h3>Thinking Process</h3>
                    <div className="thinking-section">
                      <pre className="thinking-content">{generatedFloorPlan.data.floor_plan.thinking_steps}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Input controls fixed at the bottom */}
          <div className="input-container">
            <TextInput 
              value={description} 
              onChange={setDescription} 
              onGenerate={handleGenerate}
              isLoading={isLoading || isStreaming}
              hasResults={generatedFloorPlan !== null || isStreaming}
            />
          </div>
        </div>
      </main>
      
      {/* Debug panel for development */}
      <DebugPanel 
        boundaryData={boundaryData} 
        floorPlanData={generatedFloorPlan} 
      />
    </div>
  );
}

export default App; 