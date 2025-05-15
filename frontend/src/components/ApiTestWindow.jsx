import React, { useState, useEffect } from 'react';
import { extractFinalNodes } from '../utils/floorPlanUtils';

const ApiTestWindow = ({ floorPlanData, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [apiUrl, setApiUrl] = useState('http://localhost:5000/api');
  const [isSaving, setIsSaving] = useState(false);
  
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
  
  const testBackendConnection = async () => {
    setIsLoading(true);
    setApiError(null);
    
    try {
      // Simple OPTIONS request to test connection to Flask backend
      const response = await fetch(`${apiUrl}`, {
        method: 'OPTIONS'
      }).catch(error => {
        // This catch will handle network errors that don't reach the server
        throw new Error(`Network error: ${error.message || 'Failed to connect to Python backend'}`);
      });
      
      if (response.ok) {
        setApiResponse({ status: 'Backend connection successful', timestamp: new Date().toISOString() });
      } else {
        throw new Error(`Backend connection test failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Backend connection test error:', error);
      setApiError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const saveToLocalPath = async () => {
    setIsSaving(true);
    setApiError(null);
    
    try {
      // Use the processed data or prepare it again
      const data = processedData || prepareApartmentData(floorPlanData);
      
      if (!data) {
        throw new Error('No valid floor plan data available');
      }
      
      console.log('Saving data to local path:', data);
      
      // Send data to the Python backend to save to local path
      const response = await fetch(`${apiUrl}/save-local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: data,
          path: 'C:\\Users\\Kenne\\AppData\\Roaming\\Grasshopper\\Libraries'
        })
      }).catch(error => {
        throw new Error(`Network error: ${error.message || 'Failed to connect to Python backend'}`);
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available');
        throw new Error(`Save request failed with status ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      setApiResponse({
        ...responseData,
        saveTime: new Date().toLocaleString(),
        saveStatus: 'success'
      });
      console.log('Save response:', responseData);
      
      // Display success message if browser supports notifications
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Save successful', {
          body: `Floor plan saved to: ${responseData.file_path}`,
          icon: '/favicon.ico'
        });
      } else {
        // Display save success message in the page
        alert(`Floor plan saved successfully to Grasshopper Libraries folder!`);
      }
    } catch (error) {
      console.error('Save request error:', error);
      setApiError(error.message);
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="api-test-window">
      <div className="window-header">
        <h3>Save Floor Plan to Grasshopper</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="window-content">
        <div className="api-config">
          <label htmlFor="apiUrl">Python Backend URL:</label>
          <input 
            type="text" 
            id="apiUrl" 
            value={apiUrl} 
            onChange={(e) => setApiUrl(e.target.value)}
            className="api-url-input"
          />
          <button 
            className="api-test-button" 
            onClick={testBackendConnection}
            disabled={isLoading}
          >
            {isLoading ? 'Testing...' : 'Test Backend Connection'}
          </button>
        </div>
        
        <div className="save-info">
          <h4>Save Information</h4>
          <p className="save-path-info">
            <strong>Save Path:</strong> C:\Users\Kenne\AppData\Roaming\Grasshopper\Libraries
          </p>
          <p>
            <strong>File Name:</strong> floor_plan.json (any existing file will be replaced)
          </p>
          <p>
            <strong>Data Status:</strong> 
            {processedData ? 'Floor plan data ready to save' : 'No floor plan data available'}
          </p>
        </div>
        
        <div className="button-container">
          <button 
            className="api-save-button" 
            onClick={saveToLocalPath}
            disabled={isSaving || !processedData}
          >
            {isSaving ? 'Saving...' : 'Save to Grasshopper'}
          </button>
        </div>
        
        {apiError && (
          <div className="api-error">
            <h4>Error:</h4>
            <p>{apiError}</p>
            <div className="troubleshooting-tips">
              <h5>Troubleshooting Tips:</h5>
              <ul>
                <li>Verify the Python backend API is running</li>
                <li>Check that the API URL is correct (default: http://localhost:5000/api)</li>
                <li>Ensure save path exists and is writable</li>
                <li>Check browser network panel for more details</li>
              </ul>
            </div>
          </div>
        )}
        
        {apiResponse && apiResponse.saveStatus === 'success' && (
          <div className="api-response success">
            <h4>Save Successful!</h4>
            <p>File saved to: <code>{apiResponse.file_path}</code></p>
            <p>Any previous floor plan file has been replaced.</p>
            <p>Save time: {apiResponse.saveTime}</p>
          </div>
        )}
        
        {processedData && (
          <div className="data-preview">
            <h4>Floor Plan Data Preview:</h4>
            <pre>{JSON.stringify(processedData, null, 2).substring(0, 300)}...</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiTestWindow; 