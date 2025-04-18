import { useState, useCallback } from 'react';

/**
 * Custom hook for handling boundary data from tldraw
 * 
 * @returns {Object} The hook with state and handlers
 */
export function useBoundaryData() {
  const [boundaryData, setBoundaryData] = useState(null);
  
  // Handler for when boundary data changes
  const handleBoundaryChange = useCallback((data) => {
    setBoundaryData(data);
  }, []);
  
  // Validate if the boundary data is complete/valid
  const isValidBoundary = useCallback(() => {
    if (!boundaryData || !Array.isArray(boundaryData) || boundaryData.length === 0) {
      return false;
    }
    
    // Check if at least one shape is a polygon/rect/similar
    return boundaryData.some(shape => 
      shape.type === 'rectangle' || 
      shape.type === 'polygon' || 
      shape.type === 'ellipse'
    );
  }, [boundaryData]);
  
  // Get a simplified representation for API calls
  const getSimplifiedBoundary = useCallback(() => {
    if (!boundaryData || !isValidBoundary()) {
      return null;
    }
    
    // Extract just the basic information needed for the backend
    return boundaryData.map(shape => ({
      id: shape.id,
      type: shape.type,
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      points: shape.points
    }));
  }, [boundaryData, isValidBoundary]);
  
  return {
    boundaryData,
    setBoundaryData: handleBoundaryChange,
    isValidBoundary,
    getSimplifiedBoundary
  };
} 