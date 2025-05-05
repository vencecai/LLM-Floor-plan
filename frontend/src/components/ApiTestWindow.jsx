import React, { useState, useEffect } from 'react';
import { extractFinalNodes } from '../utils/floorPlanUtils';

const ApiTestWindow = ({ floorPlanData, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [apiUrl, setApiUrl] = useState('http://localhost:5294/api/Apartment');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  
  // Process the floor plan data when it changes
  useEffect(() => {
    if (floorPlanData) {
      const apartmentData = prepareApartmentData(floorPlanData);
      setProcessedData(apartmentData);
    } else {
      setProcessedData(null);
    }
  }, [floorPlanData]);
  
  const prepareApartmentData = (floorPlanData) => {
    if (!floorPlanData) return null;
    
    console.log('Processing floor plan data:', floorPlanData);
    
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
    }
    
    // Function to recursively process the split structure
    const processSplitStructure = (node) => {
      if (!node) return null;
      
      // Create a new node object with the required properties
      const processedNode = {
        name: node.name || 'unnamed',
        area: node.area || 0,
        angle: node.angle || 0,
        final: !!node.final,
        children: []
      };
      
      // If this is a final node, ensure it has an empty children array
      if (node.final) {
        processedNode.children = [];
        return processedNode;
      }
      
      // Process children if they exist
      if (node.children && Array.isArray(node.children)) {
        processedNode.children = node.children
          .map(child => processSplitStructure(child))
          .filter(Boolean); // Remove null values
      }
      
      return processedNode;
    };
    
    // Try to find the split property or root of the hierarchy
    let splitNode = null;
    
    if (dataToProcess.split) {
      // If there's a split property directly available
      splitNode = processSplitStructure(dataToProcess.split);
    } else if (dataToProcess.root) {
      // If there's a root property
      splitNode = processSplitStructure(dataToProcess.root);
    } else if (dataToProcess.name === 'root' || dataToProcess.type === 'root') {
      // If the data itself is the root node
      splitNode = processSplitStructure(dataToProcess);
    } else {
      // If no valid structure is found, create a default structure
      console.warn('No valid split structure found, creating default');
      splitNode = {
        name: "root",
        area: 1631.34,
        angle: Math.PI/2, // 1.5707963267948966
        final: false,
        children: [
          {
            name: "livingSection",
            area: 897.24,
            angle: 0,
            final: false,
            children: [
              {
                name: "kitchenLiving",
                area: 652.54,
                angle: 0,
                final: true,
                children: []
              },
              {
                name: "office",
                area: 244.7,
                angle: 0,
                final: true,
                children: []
              }
            ]
          },
          {
            name: "privateSection",
            area: 734.1,
            angle: 0,
            final: false,
            children: [
              {
                name: "bedroomsSection",
                area: 570.97,
                angle: Math.PI/2, // 1.5707963267948966
                final: false,
                children: [
                  {
                    name: "masterBedroom",
                    area: 326.27,
                    angle: 0,
                    final: true,
                    children: []
                  },
                  {
                    name: "secondBedroom",
                    area: 244.7,
                    angle: 0,
                    final: true,
                    children: []
                  }
                ]
              },
              {
                name: "bathroom",
                area: 163.13,
                angle: 0,
                final: true,
                children: []
              }
            ]
          }
        ]
      };
    }
    
    // Create apartment data in the required format
    const apartmentData = {
      id: `apartment-${Date.now()}`,
      database: "default",
      country: "US",
      city: "Berkeley",
      name: "Test Apartment",
      
      // Use the processed split structure
      split: splitNode
    };
    
    return apartmentData;
  };
  
  const testApiConnection = async () => {
    setIsTestingConnection(true);
    setApiError(null);
    
    try {
      // Simple OPTIONS request to test connection
      const response = await fetch(apiUrl, {
        method: 'OPTIONS'
      }).catch(error => {
        // This catch will handle network errors that don't reach the server
        throw new Error(`Network error: ${error.message || 'Failed to connect to API'}`);
      });
      
      if (response.ok) {
        setApiResponse({ status: 'Connection successful', timestamp: new Date().toISOString() });
      } else {
        throw new Error(`API connection test failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('API connection test error:', error);
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
      // Use the processed data or prepare it again
      const data = processedData || prepareApartmentData(floorPlanData);
      
      if (!data) {
        throw new Error('No valid floor plan data available');
      }
      
      console.log('Sending data to API:', data);
      
      // Send data to the API with more detailed error handling
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(error => {
        // This catch will handle network errors that don't reach the server
        throw new Error(`Network error: ${error.message || 'Failed to connect to API'}`);
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available');
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      setApiResponse(responseData);
      console.log('API response:', responseData);
    } catch (error) {
      console.error('API request error:', error);
      setApiError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="api-test-window">
      <div className="window-header">
        <h3>ASP.NET Core API Test</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="window-content">
        <div className="api-config">
          <label htmlFor="apiUrl">API Endpoint:</label>
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
        
        <div className="button-container">
          <button 
            className="api-send-button" 
            onClick={sendToApi}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send to ASP.NET API'}
          </button>
        </div>
        
        <div className="data-status">
          <p>
            <strong>Data Status:</strong> 
            {processedData ? 'Floor plan data ready to send' : 'No floor plan data available'}
          </p>
        </div>
        
        {apiError && (
          <div className="api-error">
            <h4>Error:</h4>
            <p>{apiError}</p>
            <div className="troubleshooting-tips">
              <h5>Troubleshooting Tips:</h5>
              <ul>
                <li>Verify the ASP.NET Core API is running on the specified port</li>
                <li>Check that CORS is enabled on your API server</li>
                <li>Make sure the API endpoint URL is correct</li>
                <li>Check your browser's network tab for more details</li>
              </ul>
            </div>
          </div>
        )}
        
        {apiResponse && (
          <div className="api-response">
            <h4>API Response:</h4>
            <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
          </div>
        )}
        
        {processedData && (
          <div className="data-preview">
            <h4>Data Preview:</h4>
            <pre>{JSON.stringify(processedData, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiTestWindow; 