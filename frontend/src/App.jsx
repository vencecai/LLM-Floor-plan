import React, { useState, useEffect, useCallback } from 'react';
import BoundaryCanvas from './components/BoundaryCanvas';
import TextInput from './components/TextInput';
import BoundaryInfo from './components/BoundaryInfo';
import DebugPanel from './components/DebugPanel';
import './styles/App.css';

function App() {
  const [boundaryData, setBoundaryData] = useState(null);
  const [description, setDescription] = useState('');
  const [generatedFloorPlan, setGeneratedFloorPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle boundary data changes safely
  const handleBoundaryChange = useCallback((data) => {
    try {
      // Log boundary data for debugging
      console.log("Boundary data received:", data);
      
      // Validate the incoming data
      if (data && Array.isArray(data)) {
        setBoundaryData(data);
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
  }, []);
  
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
        // Process shapes into boundary data
        const processedData = shapes.map(shape => {
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
  }, []);
  
  // Reset the state
  const resetState = useCallback(() => {
    setBoundaryData(null);
    setGeneratedFloorPlan(null);
    setError(null);
  }, []);

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
      // In a real application, this would be a call to your backend
      // For now, we'll just simulate a response
      console.log('Preparing to send data to backend:', { 
        boundaryData, 
        description,
        boundaryCount: boundaryData.length,
        firstBoundaryType: boundaryData[0]?.type
      });
      
      // Simulate API call delay
      console.log("Simulating API call with 2 second delay");
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const floorPlanResponse = {
        message: 'Floor plan generated successfully!',
        // This would be actual floor plan data from the backend
        data: { boundary: boundaryData, description }
      };
      
      console.log("Generated floor plan response:", floorPlanResponse);
      setGeneratedFloorPlan(floorPlanResponse);
    } catch (error) {
      console.error('Error generating floor plan:', error);
      setError('Error generating floor plan. Please try again.');
      alert('Error generating floor plan. Please try again.');
    } finally {
      console.log("Generation process complete");
      setIsLoading(false);
    }
  };

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
        </div>
      </header>

      {error && (
        <div className="error-notification">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <main className="main-container">
        <div className="drawing-section">
          <BoundaryCanvas onBoundaryChange={handleBoundaryChange} />
        </div>

        <div className="chat-section">
          <h2>Describe Your Floor Plan</h2>
          <TextInput 
            value={description} 
            onChange={setDescription} 
            onGenerate={handleGenerate}
            isLoading={isLoading}
          />
          
          {generatedFloorPlan && (
            <div className="result-section">
              <h2>Generated Floor Plan</h2>
              <pre>{JSON.stringify(generatedFloorPlan, null, 2)}</pre>
            </div>
          )}
        </div>
      </main>
      
      {/* Debug panel for development */}
      <DebugPanel boundaryData={boundaryData} />
    </div>
  );
}

export default App; 