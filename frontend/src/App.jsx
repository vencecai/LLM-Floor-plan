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
  
  // API基础URL
  const apiBaseUrl = process.env.NODE_ENV === 'production' 
    ? window.location.origin
    : 'http://localhost:5000';

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

  /**
   * Generates a floor plan by sending data to the API
   * @param {string} promptText - Description of the floor plan
   * @param {Array} boundaries - Boundary data for the floor plan
   * @param {Object} preferences - Optional preferences for generation
   * @returns {Promise<Object>} - The generated floor plan data
   */
  const generateFloorPlan = async (promptText, boundaries, preferences = {}) => {
    // Log the request details for debugging
    console.log("Generating floor plan with:", {
      description: promptText,
      boundaries: boundaries,
      preferences: preferences
    });
    
    try {
      // Build API request URL
      const apiUrl = `${apiBaseUrl}/api/generate-floor-plan`;
      console.log(`Sending request to: ${apiUrl}`);
      
      // Prepare request data
      const requestData = {
        boundary_data: boundaries,
        description: promptText,
        preferences: preferences
      };
      
      console.log("Sending request with data:", requestData);
      
      // Send API request
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      // Check response status
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      // Parse successful response
      const responseData = await response.json();
      console.log("Received response:", responseData);
      
      return {
        success: true,
        message: responseData.message,
        data: {
          floor_plan: JSON.parse(responseData.floor_plan),
          boundary: responseData.boundary_data,
          description: responseData.description
        }
      };
    } catch (error) {
      console.error('Error in floor plan generation:', error);
      return {
        success: false,
        error: error.message || 'Unknown error during floor plan generation'
      };
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
      // Call the generateFloorPlan function
      const result = await generateFloorPlan(description, boundaryData, {});
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      setGeneratedFloorPlan({
        message: result.message,
        data: result.data
      });
    } catch (error) {
      console.error('Error generating floor plan:', error);
      setError(error.message || 'Error generating floor plan. Please try again.');
      alert(error.message || 'Error generating floor plan. Please try again.');
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

        <div className="floating-chat-section">
          <h2>Describe Your Floor Plan</h2>
          <TextInput 
            value={description} 
            onChange={setDescription} 
            onGenerate={handleGenerate}
            isLoading={isLoading}
            hasResults={generatedFloorPlan !== null}
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