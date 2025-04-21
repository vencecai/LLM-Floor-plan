import React, { useEffect } from 'react';

function BoundaryInfo({ boundaryData }) {
  // Log the incoming data when the component renders or data changes
  useEffect(() => {
    console.log("BoundaryInfo received data:", boundaryData);
  }, [boundaryData]);
  
  if (!boundaryData || boundaryData.length === 0) {
    return <div className="boundary-info-content">No shapes drawn</div>;
  }

  const formatNumber = (num) => {
    if (num === undefined || num === null) return 'N/A';
    if (typeof num === 'number') {
      return Math.round(num * 100) / 100; // Round to 2 decimal places
    }
    return num;
  };

  return (
    <div className="boundary-info-content">
      {/* Rectangle Measurements section removed */}
    </div>
  );
}

export default BoundaryInfo; 