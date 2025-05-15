import React, { useState, useEffect } from 'react';
import { extractFinalNodes } from '../utils/floorPlanUtils';

const CoreApiTestWindow = ({ floorPlanData, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [apiUrl, setApiUrl] = useState('http://localhost:5294/api/apartment');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [useRealLlmData, setUseRealLlmData] = useState(true); // Default to using real LLM data
  
  // Process the floor plan data when it changes
  useEffect(() => {
    if (floorPlanData) {
      const processedData = prepareApiData(floorPlanData);
      setProcessedData(processedData);
    } else {
      setProcessedData(null);
    }
  }, [floorPlanData, useRealLlmData]);
  
  const prepareApiData = (floorPlanData) => {
    if (!floorPlanData) return null;
    
    console.log('Processing floor plan data for Web Core API:', floorPlanData);
    
    // Handle various formats of floor plan data
    let dataToProcess = floorPlanData;
    
    // If it's an API response with json_result as string, parse it
    if (typeof floorPlanData === 'object' && floorPlanData.json_result) {
      if (typeof floorPlanData.json_result === 'string') {
        try {
          dataToProcess = JSON.parse(floorPlanData.json_result);
        } catch (error) {
          console.error('Error parsing json_result:', error);
          return null;
        }
      } else {
        dataToProcess = floorPlanData.json_result;
      }
    } else if (floorPlanData.data && floorPlanData.data.floor_plan) {
      // Handle nested floor plan structure from LLM service
      if (typeof floorPlanData.data.floor_plan === 'string') {
        try {
          dataToProcess = JSON.parse(floorPlanData.data.floor_plan);
        } catch (e) {
          console.error('Error parsing floor_plan string:', e);
        }
      } else if (floorPlanData.data.floor_plan.json_result) {
        dataToProcess = typeof floorPlanData.data.floor_plan.json_result === 'string' 
          ? JSON.parse(floorPlanData.data.floor_plan.json_result) 
          : floorPlanData.data.floor_plan.json_result;
      } else {
        dataToProcess = floorPlanData.data.floor_plan;
      }
    }
    
    // If we want to use real LLM data (with proper processing)
    if (useRealLlmData) {
      return prepareLlmApiData(dataToProcess);
    }
    
    // Otherwise, continue with the previous approach (simpler processing)
    // Ensure we have the rooms data
    let roomsData = [];
    if (dataToProcess.rooms) {
      roomsData = dataToProcess.rooms;
    } else if (Array.isArray(dataToProcess)) {
      roomsData = dataToProcess;
    }
    
    // Extract nodes for building the split hierarchy
    const nodes = extractFinalNodes(roomsData);
    if (!nodes || nodes.length === 0) {
      console.error('No room nodes found in floor plan data');
      return null;
    }
    
    // Create root node with children
    const rootNode = {
      name: "root",
      area: nodes.reduce((sum, node) => sum + (node.area || 0), 0),
      angle: 0,
      final: false,
      children: nodes.map(node => ({
        name: node.name || node.id,
        area: node.area || 100,
        angle: 0,
        final: true,
        children: []
      }))
    };
    
    // Create apartment data in the format expected by the API
    const apartmentData = {
      id: `apartment-${Date.now()}`,
      database: "default",
      country: "US",
      city: "Berkeley",
      name: "Generated Floor Plan",
      split: rootNode
    };
    
    return apartmentData;
  };
  
  // New function to prepare LLM-generated data properly
  const prepareLlmApiData = (llmData) => {
    console.log('Preparing LLM data for API:', llmData);
    
    // If no data, return null
    if (!llmData) return null;
    
    let splitData = null;
    
    // Find the room structure in various possible formats
    if (llmData.split) {
      // Format already suitable for API
      splitData = llmData.split;
    } else if (llmData.root) {
      // Some LLM generations use 'root' as the top level key
      splitData = llmData.root;
    } else if (llmData.floorPlan && llmData.floorPlan.root) {
      // Some formats nest it under floorPlan
      splitData = llmData.floorPlan.root;
    } else if (llmData.rooms) {
      // If just an array of rooms, create a hierarchy
      const totalArea = llmData.rooms.reduce((sum, room) => sum + (room.area || 100), 0);
      
      splitData = {
        name: "root",
        area: totalArea,
        angle: 0,
        final: false,
        children: llmData.rooms.map(room => ({
          name: room.name || room.type || "room",
          area: room.area || 100,
          angle: room.angle || 0,
          final: true,
          children: []
        }))
      };
    }
    
    // If we still don't have split data, try to use the entire object
    if (!splitData && typeof llmData === 'object') {
      // Attempt to use the object as is if it has a name property
      if (llmData.name) {
        splitData = llmData;
      }
    }
    
    // Ensure required fields exist and process data correctly
    if (splitData) {
      // Make sure 'final' property exists in each node and is boolean
      const processNode = (node) => {
        if (!node) return null;
        
        // Ensure 'final' is a boolean
        if (node.final === undefined) {
          node.final = node.children && node.children.length > 0 ? false : true;
        } else if (typeof node.final === 'string') {
          node.final = node.final.toLowerCase() === 'true';
        }
        
        // Ensure 'area' is a number
        if (node.area === undefined) {
          node.area = 100; // Default area
        } else if (typeof node.area === 'string') {
          node.area = parseFloat(node.area) || 100;
        }
        
        // Ensure 'angle' is a number
        if (node.angle === undefined) {
          node.angle = 0; // Default angle
        } else if (typeof node.angle === 'string') {
          node.angle = parseFloat(node.angle) || 0;
        }
        
        // Ensure 'children' is an array
        if (!node.children) {
          node.children = [];
        }
        
        // Process all children recursively
        node.children = node.children.map(child => processNode(child)).filter(Boolean);
        
        return node;
      };
      
      // Process the entire tree
      splitData = processNode(splitData);
      
      // Create the final API data structure
      const apartmentData = {
        id: `apartment-${Date.now()}`,
        database: "default",
        country: "US",
        city: "Berkeley",
        name: llmData.name || "LLM Generated Floor Plan",
        split: splitData
      };
      
      return apartmentData;
    }
    
    console.error('Could not extract valid split structure from LLM data:', llmData);
    return null;
  };
  
  const testApiConnection = async () => {
    setIsTestingConnection(true);
    setApiError(null);
    
    try {
      // Use exactly the same data that works in the Python script
      const testData = {
        "id": "apartment-1747263344225",
        "database": "default",
        "country": "US",
        "city": "Berkeley",
        "name": "Test Apartment",
        "split": {
          "name": "root",
          "area": 999.6231,
          "angle": 0,
          "final": false,
          "children": [
            {
              "name": "livingSpace",
              "area": 599.77,
              "angle": 0,
              "final": true,
              "children": []
            },
            {
              "name": "kitchenBathroom",
              "area": 399.85,
              "angle": 1.5708,
              "final": false,
              "children": [
                {
                  "name": "kitchen",
                  "area": 249.91,
                  "angle": 1.5708,
                  "final": true,
                  "children": []
                },
                {
                  "name": "bathroom",
                  "area": 149.94,
                  "angle": 1.5708,
                  "final": true,
                  "children": []
                }
              ]
            }
          ]
        }
      };
      
      console.log('Testing connection with data:', testData);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(testData)
      }).catch(error => {
        throw new Error(`Network error: ${error.message || 'Unable to connect to Apartment API'}`);
      });
      
      if (response.ok) {
        // Try to parse response
        try {
          const data = await response.json();
          setApiResponse({ 
            status: 'Apartment API connection successful', 
            message: data.message || 'Connection test successful',
            data: data,
            timestamp: new Date().toISOString() 
          });
        } catch (e) {
          setApiResponse({ 
            status: 'Apartment API connection successful, but response was not JSON', 
            timestamp: new Date().toISOString() 
          });
        }
      } else {
        // Try to get error details
        const errorText = await response.text().catch(() => '');
        throw new Error(`Apartment API connection test failed with status: ${response.status}${errorText ? ` - ${errorText}` : ''}`);
      }
    } catch (error) {
      console.error('Apartment API connection test error:', error);
      setApiError(error.message);
    } finally {
      setIsTestingConnection(false);
    }
  };
  
  const sendToApi = async () => {
    setIsLoading(true);
    setApiError(null);
    setApiResponse(null);
    
    try {
      // Use processed data or prepare it again
      const data = processedData || prepareApiData(floorPlanData);
      
      if (!data) {
        throw new Error('No valid floor plan data available');
      }
      
      console.log('Sending data to Apartment API:', data);
      
      // Add extra headers to help with CORS issues
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify(data)
      }).catch(error => {
        throw new Error(`Network error: ${error.message || 'Unable to connect to Apartment API'}`);
      });
      
      // Pre-read response text to have content even if parsing fails
      const responseText = await response.text();
      let responseData;
      
      try {
        // Try to parse JSON
        responseData = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        console.warn('Response is not valid JSON:', responseText);
        // If not JSON, use text as response
        responseData = { text: responseText, parseError: true };
      }
      
      if (!response.ok) {
        // Still display API returned content
        setApiResponse(responseData);
        
        throw new Error(`Apartment API request failed with status: ${response.status}`);
      }
      
      setApiResponse(responseData);
      console.log('Apartment API response:', responseData);
    } catch (error) {
      console.error('Apartment API request error:', error);
      setApiError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="api-test-window">
      <div className="window-header">
        <h3>Send to Apartment API</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="window-content">
        <div className="api-config">
          <label htmlFor="apiUrl">Apartment API URL:</label>
          <input 
            type="text" 
            id="apiUrl" 
            value={apiUrl} 
            onChange={(e) => setApiUrl(e.target.value)}
            className="api-url-input"
          />
          <button 
            className="api-test-button" 
            onClick={testApiConnection}
            disabled={isTestingConnection}
          >
            {isTestingConnection ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
        
        <div className="api-info">
          <h4>API Information</h4>
          <p>
            <strong>Endpoint:</strong> /api/apartment
          </p>
          <p>
            <strong>Data Status:</strong> 
            {processedData ? 'Floor plan data ready to send' : 'No floor plan data available'}
          </p>
          <div className="data-mode-toggle">
            <label>
              <input
                type="checkbox"
                checked={useRealLlmData}
                onChange={(e) => setUseRealLlmData(e.target.checked)}
              />
              Use real LLM-generated data structure
            </label>
            <div className="mode-description">
              {useRealLlmData 
                ? 'Using actual LLM-generated JSON data with processing' 
                : 'Using simplified test data structure'}
            </div>
          </div>
        </div>
        
        <div className="button-container">
          <button 
            className="send-api-button" 
            onClick={sendToApi}
            disabled={isLoading || !processedData}
          >
            {isLoading ? 'Sending...' : 'Send to Apartment API'}
          </button>
        </div>
        
        {apiError && (
          <div className="api-error">
            <h4>Error:</h4>
            <p>{apiError}</p>
            <div className="troubleshooting-tips">
              <h5>Troubleshooting:</h5>
              <ul>
                <li>Verify that the Apartment API is running at http://localhost:5294</li>
                <li>Confirm the API endpoint is correct: /api/apartment</li>
                <li>Make sure CORS is enabled in the API by adding this to ASP.NET Core:
                  <pre className="code-snippet">
                    builder.Services.AddCors();<br/>
                    app.UseCors(x {'=>'} x.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
                  </pre>
                </li>
                <li>Check the browser's Network tab for detailed error information</li>
                <li>Verify that the API accepts the data format being sent</li>
              </ul>
            </div>
          </div>
        )}
        
        {apiResponse && (
          <div className="api-response success">
            <h4>API Response:</h4>
            {apiResponse.data ? (
              <div>
                <div className="response-summary">
                  <p><strong>Status:</strong> {apiResponse.status}</p>
                  <p><strong>Message:</strong> {apiResponse.message || 'No message'}</p>
                  <p><strong>Timestamp:</strong> {apiResponse.timestamp}</p>
                </div>
                
                {apiResponse.data.data && apiResponse.data.data.rooms && (
                  <div className="rooms-data">
                    <h5>Apartment Data:</h5>
                    <p><strong>ID:</strong> {apiResponse.data.data.id}</p>
                    <p><strong>Name:</strong> {apiResponse.data.data.name}</p>
                    
                    <h5>Rooms ({apiResponse.data.data.rooms.length}):</h5>
                    <ul className="room-list">
                      {apiResponse.data.data.rooms.map((room, index) => (
                        <li key={index}>
                          <strong>{room.id}</strong> ({room.type}) - {room.area} sq units
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <details>
                  <summary>Full Response JSON</summary>
                  <pre className="full-json">{JSON.stringify(apiResponse.data, null, 2)}</pre>
                </details>
              </div>
            ) : (
              <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
            )}
          </div>
        )}
        
        {processedData && (
          <div className="data-preview">
            <h4>Floor Plan Data Preview:</h4>
            <pre>{JSON.stringify(processedData, null, 2).substring(0, 300)}...</pre>
            <details>
              <summary>View Full Data</summary>
              <pre>{JSON.stringify(processedData, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoreApiTestWindow; 