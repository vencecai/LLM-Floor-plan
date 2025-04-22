import React, { useEffect, useState, useRef } from 'react';
import { nanoid } from 'nanoid';
import { extractAllRooms, extractFinalNodes } from '../utils/floorPlanUtils';

// 房间类型映射到tldraw支持的颜色名称
const ROOM_COLORS_MAP = {
  livingRoom: 'light-blue',  // 客厅
  bedroom: 'violet',        // 卧室
  kitchen: 'yellow',        // 厨房
  bathroom: 'light-green',  // 浴室
  diningRoom: 'orange',     // 餐厅
  corridor: 'grey',         // 走廊
  study: 'light-red',       // 书房
  default: 'white'          // 默认
};

/**
 * 根据房间类型获取支持的颜色名称
 * @param {string} roomType - 房间类型
 * @returns {string} 对应的tldraw颜色名称
 */
const getRoomColor = (roomType) => {
  if (!roomType) return ROOM_COLORS_MAP.default;
  
  // 转换房间类型为小写并移除空格
  const normalized = roomType.toLowerCase().replace(/\s+/g, '');
  
  // 匹配房间类型
  if (normalized.includes('living') || normalized.includes('lounge')) {
    return ROOM_COLORS_MAP.livingRoom;
  } else if (normalized.includes('bed') || normalized.includes('master')) {
    return ROOM_COLORS_MAP.bedroom;
  } else if (normalized.includes('kitchen')) {
    return ROOM_COLORS_MAP.kitchen;
  } else if (normalized.includes('bath') || normalized.includes('wc') || normalized.includes('toilet')) {
    return ROOM_COLORS_MAP.bathroom;
  } else if (normalized.includes('dining')) {
    return ROOM_COLORS_MAP.diningRoom;
  } else if (normalized.includes('corridor') || normalized.includes('hall') || normalized.includes('passage')) {
    return ROOM_COLORS_MAP.corridor;
  } else if (normalized.includes('study') || normalized.includes('office') || normalized.includes('work')) {
    return ROOM_COLORS_MAP.study;
  }
  
  return ROOM_COLORS_MAP.default;
};

/**
 * 楼层平面图可视化组件
 * 将生成的楼层平面图数据绘制到TLDraw画布上
 */
const RoomVisualizer = ({ floorPlanData, editor, boundaryData, roomColors }) => {
  const [roomShapeIds, setRoomShapeIds] = useState([]);
  // 添加一个ref来存储上一次处理的数据hash，避免重复处理
  const lastDataRef = useRef('');
  // 添加一个ref来避免重复渲染导致的无限循环
  const renderInProgressRef = useRef(false);
  
  // 清除所有已绘制的房间
  const clearRooms = () => {
    if (!editor || !roomShapeIds.length) return;
    
    try {
      console.log(`Clearing ${roomShapeIds.length} room shapes`);
      
      // 使用 tldraw API 删除形状
      if (typeof editor.deleteShapes === 'function') {
        editor.deleteShapes(roomShapeIds);
      } else {
        // 备用方法
        roomShapeIds.forEach(id => {
          try {
            editor.delete([id]);
          } catch (e) {
            console.error(`Failed to delete shape ${id}:`, e);
          }
        });
      }
      
      setRoomShapeIds([]);
    } catch (error) {
      console.error('Error clearing rooms:', error);
    }
  };
  
  // 绘制房间
  const drawRooms = () => {
    // 防止重复执行
    if (renderInProgressRef.current) {
      console.log('Render already in progress, skipping');
      return;
    }
    
    renderInProgressRef.current = true;
    
    // 检查必要的数据和API是否存在
    if (!editor || !floorPlanData) {
      console.log("Cannot draw rooms: editor or floorPlanData missing", { 
        hasEditor: !!editor, 
        hasFloorPlanData: !!floorPlanData,
        editorMethods: editor ? Object.keys(editor) : [],
        hasData: floorPlanData?.data?.floor_plan,
      });
      renderInProgressRef.current = false;
      return;
    }
    
    // 检查 TLDraw API
    if (typeof editor.createShape !== 'function' && typeof editor.create !== 'function') {
      console.error("TLDraw API missing required methods:", { 
        hasCreateShape: typeof editor.createShape === 'function',
        hasCreate: typeof editor.create === 'function',
        availableMethods: Object.keys(editor)
      });
      renderInProgressRef.current = false;
      return;
    }
    
    // 生成当前数据的简单哈希值，用于检测变化
    let currentDataHash;
    try {
      currentDataHash = JSON.stringify({
        floorPlanId: floorPlanData?.data?.floor_plan?.id || Math.random(),
        boundaryCount: boundaryData?.length,
        roomColorsHash: JSON.stringify(roomColors || {})
      });
    } catch (e) {
      console.error("Error creating data hash:", e);
      currentDataHash = String(Date.now()); // 使用时间戳作为后备
    }
    
    // 如果数据没有变化，跳过绘制
    if (currentDataHash === lastDataRef.current) {
      console.log('Data unchanged, skipping redraw');
      renderInProgressRef.current = false;
      return;
    }
    
    // 更新lastDataRef
    lastDataRef.current = currentDataHash;
    
    console.log("Drawing rooms with data:", {
      floorPlanData: floorPlanData,
      boundaryData: boundaryData
    });
    
    // 先清除之前的房间
    clearRooms();
    
    try {
      // 直接使用extractFinalNodes函数从JSON数据中提取最终节点
      const jsonResult = floorPlanData.data?.floor_plan?.json_result;
      if (!jsonResult) {
        console.warn('No JSON result data found, data structure:', floorPlanData);
        renderInProgressRef.current = false;
        return;
      }
      
      // 提取最终节点
      const finalRooms = extractFinalNodes(jsonResult);
      
      if (!finalRooms || finalRooms.length === 0) {
        console.warn('No final rooms found in JSON data:', jsonResult);
        renderInProgressRef.current = false;
        return;
      }
      
      console.log('Final rooms to draw:', finalRooms);
      
      // 如果有边界数据，计算绘制位置
      let boundaryRect = { x: 200, y: 200, width: 600, height: 400 };
      if (boundaryData && boundaryData.length > 0) {
        const mainBoundary = boundaryData[0];
        boundaryRect = {
          x: mainBoundary.x || 0,
          y: mainBoundary.y || 0,
          width: mainBoundary.width || 600,
          height: mainBoundary.height || 400
        };
      }
      
      console.log('Using boundary rect:', boundaryRect);
      
      // 创建一个递归划分算法来布局房间
      // 这里使用简化的算法，根据房间面积比例划分空间
      const totalArea = finalRooms.reduce((sum, room) => sum + room.area, 0);
      
      // 先按面积从大到小排序
      const sortedRooms = [...finalRooms].sort((a, b) => b.area - a.area);
      
      // 创建简单的格子布局
      const layoutRooms = (rooms, rect, isHorizontal = true) => {
        if (rooms.length === 0) return [];
        if (rooms.length === 1) {
          return [{
            ...rooms[0],
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          }];
        }
        
        // 计算当前组的总面积
        const groupArea = rooms.reduce((sum, r) => sum + r.area, 0);
        
        // 找到最佳分割点
        let bestIndex = 1;
        let bestDiff = Infinity;
        let area1 = 0;
        
        for (let i = 1; i < rooms.length; i++) {
          const areaLeft = rooms.slice(0, i).reduce((sum, r) => sum + r.area, 0);
          const areaRight = groupArea - areaLeft;
          const diff = Math.abs(areaLeft - areaRight);
          
          if (diff < bestDiff) {
            bestDiff = diff;
            bestIndex = i;
            area1 = areaLeft;
          }
        }
        
        // 分割成两组
        const group1 = rooms.slice(0, bestIndex);
        const group2 = rooms.slice(bestIndex);
        
        // 按面积比例分割空间
        const ratio = area1 / groupArea;
        
        let rect1, rect2;
        if (isHorizontal) {
          // 水平分割
          rect1 = {
            x: rect.x,
            y: rect.y,
            width: rect.width * ratio,
            height: rect.height
          };
          rect2 = {
            x: rect.x + rect.width * ratio,
            y: rect.y,
            width: rect.width * (1 - ratio),
            height: rect.height
          };
        } else {
          // 垂直分割
          rect1 = {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height * ratio
          };
          rect2 = {
            x: rect.x,
            y: rect.y + rect.height * ratio,
            width: rect.width,
            height: rect.height * (1 - ratio)
          };
        }
        
        // 递归处理两组
        return [
          ...layoutRooms(group1, rect1, !isHorizontal),
          ...layoutRooms(group2, rect2, !isHorizontal)
        ];
      };
      
      // 布局房间
      const layoutedRooms = layoutRooms(sortedRooms, boundaryRect);
      console.log('Layouted rooms:', layoutedRooms);
      
      // 创建新的房间形状
      const newShapeIds = layoutedRooms.map(room => {
        const id = 'shape:' + nanoid();
        
        // 使用自定义颜色（如果有）
        let color = getRoomColor(room.type || room.name);
        if (roomColors && roomColors[room.type]) {
          color = roomColors[room.type];
        }
        
        // 确保颜色是tldraw支持的
        const validColors = ['black', 'grey', 'light-violet', 'violet', 'blue', 
                            'light-blue', 'yellow', 'orange', 'green', 
                            'light-green', 'light-red', 'red', 'white'];
        
        if (!validColors.includes(color)) {
          console.warn(`Invalid color: ${color}, room: ${room.name}, using default value`);
          color = 'white';
        }
        
        console.log(`Creating room shape: ${room.name || room.type}`, {
          id,
          x: room.x,
          y: room.y,
          width: room.width,
          height: room.height,
          color
        });
        
        try {
          // 尝试不同的TLDraw API版本
          if (typeof editor.createShape === 'function') {
            // 新版API
            editor.createShape({
              id,
              type: 'geo',
              x: room.x,
              y: room.y,
              props: {
                w: room.width,
                h: room.height,
                geo: 'rectangle',
                color: color,
                text: room.name || room.type || 'Room',
                size: 'm',
                font: 'draw'
              }
            });
          } else if (typeof editor.create === 'function') {
            // 备用API
            editor.create({
              id: id,
              type: 'geo',
              parentId: editor.currentPageId,
              point: [room.x, room.y],
              props: {
                geo: 'rectangle',
                w: room.width,
                h: room.height,
                color: color,
                text: room.name || room.type || 'Room',
                size: 'm',
                font: 'draw'
              }
            });
          } else {
            throw new Error('No compatible create method found in TLDraw API');
          }
          
          return id;
        } catch (error) {
          console.error(`Error creating shape for room ${room.name}:`, error);
          return null;
        }
      }).filter(id => id !== null);
      
      console.log(`Created ${newShapeIds.length} room shapes`);
      
      // 更新房间ID列表
      setRoomShapeIds(newShapeIds);
      
      // 居中显示
      if (newShapeIds.length > 0) {
        try {
          if (typeof editor.zoomToFit === 'function') {
            editor.zoomToFit();
          } else if (typeof editor.zoomToContent === 'function') {
            editor.zoomToContent();
          }
          console.log("Zooming to fit all rooms");
        } catch (e) {
          console.warn("Could not zoom to fit:", e);
        }
      }
      
    } catch (error) {
      console.error('Error drawing rooms:', error);
    } finally {
      renderInProgressRef.current = false;
    }
  };
  
  // 当floorPlanData或editor变化时重新绘制房间
  useEffect(() => {
    if (!editor || !floorPlanData) return;
    
    console.log("RoomVisualizer: Data or editor changed", {
      hasEditor: !!editor,
      hasFloorPlanData: !!floorPlanData,
      hasRoomShapeIds: roomShapeIds.length,
    });
    
    // 使用setTimeout确保DOM已经完全加载
    const timer = setTimeout(() => {
      drawRooms();
    }, 300);
    
    // 清除timeout
    return () => {
      clearTimeout(timer);
    };
  }, [floorPlanData, editor]);
  
  // 处理颜色变化的单独效果
  useEffect(() => {
    if (roomColors && Object.keys(roomColors).length > 0 && editor && roomShapeIds.length > 0) {
      console.log("Updating colors for existing rooms:", roomColors);
      // 这里可以添加更新现有房间颜色的逻辑
    }
  }, [roomColors]);
  
  // 组件卸载时清除房间
  useEffect(() => {
    return () => {
      clearRooms();
    };
  }, []);
  
  // 此组件不渲染任何UI元素，只执行副作用
  return null;
};

export default RoomVisualizer; 