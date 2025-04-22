import React, { useState, useEffect } from 'react';
import { getRoomColor } from '../utils/roomColors';

// tldraw支持的颜色
const TLDRAW_COLORS = [
  'black', 'grey', 'light-violet', 'violet', 'blue', 
  'light-blue', 'yellow', 'orange', 'green', 
  'light-green', 'light-red', 'red', 'white'
];

// 颜色名称到十六进制的映射（用于显示）
const COLOR_TO_HEX = {
  'black': '#1e1e1e',
  'grey': '#9ca3af',
  'light-violet': '#d8b4fe',
  'violet': '#8b5cf6',
  'blue': '#3b82f6',
  'light-blue': '#93c5fd',
  'yellow': '#facc15',
  'orange': '#f97316',
  'green': '#16a34a',
  'light-green': '#86efac',
  'light-red': '#fca5a5',
  'red': '#ef4444',
  'white': '#ffffff'
};

const RoomStyler = ({ floorPlanData, onColorChange }) => {
  const [roomColors, setRoomColors] = useState({});
  const [roomTypes, setRoomTypes] = useState([]);

  // Extract room types from floor plan data and initialize colors
  useEffect(() => {
    if (!floorPlanData || !floorPlanData.rooms) return;
    
    // Extract unique room types
    const uniqueRoomTypes = [...new Set(floorPlanData.rooms.map(room => room.type))];
    setRoomTypes(uniqueRoomTypes);
    
    // Initialize colors for each room type
    const initialColors = {};
    uniqueRoomTypes.forEach(type => {
      initialColors[type] = getRoomColor(type);
    });
    
    setRoomColors(initialColors);
    
    // Notify parent component about initial colors
    if (onColorChange) {
      onColorChange(initialColors);
    }
  }, [floorPlanData, onColorChange]);

  // Handle color change for a specific room type
  const handleColorChange = (roomType, color) => {
    const updatedColors = {
      ...roomColors,
      [roomType]: color
    };
    
    setRoomColors(updatedColors);
    
    // Notify parent component about color change
    if (onColorChange) {
      onColorChange(updatedColors);
    }
  };

  // Reset colors to defaults
  const applyDefaultColors = () => {
    const defaultColors = {};
    roomTypes.forEach(type => {
      defaultColors[type] = getRoomColor(type);
    });
    
    setRoomColors(defaultColors);
    
    // Notify parent component about reset colors
    if (onColorChange) {
      onColorChange(defaultColors);
    }
  };

  if (!floorPlanData || !floorPlanData.rooms || roomTypes.length === 0) {
    return null;
  }

  return (
    <div className="room-styler">
      <div className="room-styler-header">
        <h3>Room Colors</h3>
        <button 
          className="reset-button"
          onClick={applyDefaultColors}
        >
          Reset Colors
        </button>
      </div>
      
      <div className="room-colors-list">
        {roomTypes.map((roomType) => (
          <div key={roomType} className="room-color-item">
            <span className="room-type-label">{roomType}</span>
            <div className="color-selector">
              <select
                value={roomColors[roomType] || 'white'}
                onChange={(e) => handleColorChange(roomType, e.target.value)}
                className="color-dropdown"
              >
                {TLDRAW_COLORS.map(color => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
              <div 
                className="color-preview" 
                style={{ backgroundColor: COLOR_TO_HEX[roomColors[roomType]] || '#ffffff' }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <style jsx>{`
        .room-styler {
          background: white;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }
        
        .room-styler-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .room-styler-header h3 {
          margin: 0;
          font-size: 18px;
        }
        
        .reset-button {
          background: #f1f1f1;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .reset-button:hover {
          background: #e5e5e5;
        }
        
        .room-colors-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        
        .room-color-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px;
          border-radius: 4px;
          background: #f9f9f9;
        }
        
        .room-type-label {
          font-size: 14px;
        }
        
        .color-selector {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .color-dropdown {
          padding: 4px;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        
        .color-preview {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          border: 1px solid #ccc;
        }
      `}</style>
    </div>
  );
};

export default RoomStyler;