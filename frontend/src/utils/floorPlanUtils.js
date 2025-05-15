/**
 * 楼层平面图数据处理工具函数
 */

/**
 * 从API响应中提取楼层平面图JSON数据
 * @param {Object} floorPlanData - 从API获取的楼层平面图数据
 * @returns {Object|null} 解析后的JSON数据或null
 */
export const extractFloorPlanJson = (floorPlanData) => {
  try {
    if (!floorPlanData) return null;
    
    // 如果是字符串，尝试解析为JSON
    if (typeof floorPlanData === 'string') {
      return JSON.parse(floorPlanData);
    }
    
    // 如果是API响应格式
    if (floorPlanData.data && floorPlanData.data.floor_plan) {
      // 尝试获取json_result字段
      if (floorPlanData.data.floor_plan.json_result) {
        // 如果json_result是字符串，解析它
        if (typeof floorPlanData.data.floor_plan.json_result === 'string') {
          return JSON.parse(floorPlanData.data.floor_plan.json_result);
        }
        // 如果已经是对象，直接返回
        return floorPlanData.data.floor_plan.json_result;
      }
    }
    
    // 如果是简单对象，尝试直接返回
    if (typeof floorPlanData === 'object') {
      return floorPlanData;
    }
    
    console.warn('No valid floor plan data found in:', floorPlanData);
    return null;
  } catch (error) {
    console.error('Error extracting floor plan JSON:', error);
    return null;
  }
};

/**
 * 计算给定节点的绝对坐标
 * @param {Object} node - 节点数据
 * @param {Object} boundaryData - 边界数据
 * @param {Object} parentCoords - 父节点坐标和尺寸
 * @returns {Object} 包含x, y, width, height的对象
 */
export const calculateNodeCoordinates = (node, boundaryData, parentCoords = null) => {
  // 如果没有父节点坐标，使用边界数据的第一个形状作为根节点范围
  if (!parentCoords && boundaryData && boundaryData.length > 0) {
    const mainBoundary = boundaryData[0];
    parentCoords = {
      x: mainBoundary.x,
      y: mainBoundary.y,
      width: mainBoundary.width,
      height: mainBoundary.height
    };
  }
  
  // 如果还是没有父节点坐标，使用默认值
  if (!parentCoords) {
    parentCoords = {
      x: 0,
      y: 0,
      width: 1000,
      height: 800
    };
  }
  
  // 默认使用父节点的坐标和尺寸
  const coords = { ...parentCoords };
  
  // 如果是叶子节点，直接返回其相对于父节点的坐标
  if (!node.children || node.children.length === 0 || node.final === true) {
    // 计算相对位置
    if (node.position) {
      coords.x = parentCoords.x + parentCoords.width * node.position.x;
      coords.y = parentCoords.y + parentCoords.height * node.position.y;
      coords.width = parentCoords.width * node.position.width;
      coords.height = parentCoords.height * node.position.height;
    }
    // 如果有ratio信息，使用它来计算尺寸
    else if (node.ratio !== undefined) {
      // 假设是左到右或上到下的分割
      if (node.split === 'vertical') {
        coords.width = parentCoords.width * node.ratio;
      } else {
        coords.height = parentCoords.height * node.ratio;
      }
    }
  }
  
  return coords;
};

/**
 * 递归提取所有叶子节点（终端房间）
 * @param {Object} rootNode - 根节点
 * @param {Object} boundaryData - 边界数据
 * @returns {Array} 所有叶子节点（房间）的数组
 */
export const extractLeafNodes = (rootNode, boundaryData) => {
  const extractNodes = (node, parentCoords = null) => {
    if (!node) return [];
    
    // 计算当前节点的坐标
    const coords = calculateNodeCoordinates(node, boundaryData, parentCoords);
    
    // 如果是终端节点（没有子节点或标记为final=true），则返回房间信息
    if (!node.children || node.children.length === 0 || node.final === true) {
      // 尝试从不同属性中获取房间名称
      let roomName = node.name || node.roomType || 'Unnamed Room';
      
      // 检查名称是否为"root"，如果是则替换为类型名称
      if (roomName === 'root') {
        roomName = node.type || 'Room';
      }
      
      // 提取房间类型
      const roomType = node.roomType || node.type || 
                      (node.name && node.name !== 'root' ? node.name : 'room');
      
      console.log('Extracting room information:', { name: roomName, type: roomType, node });
      
      return [{
        id: node.id || Math.random().toString(36).substring(2, 9),
        name: roomName,
        type: roomType,
        area: node.area || 0,
        x: coords.x,
        y: coords.y,
        width: coords.width,
        height: coords.height,
        angle: node.angle || 0,
        isFinal: node.final === true
      }];
    }
    
    // 递归处理子节点
    return node.children.flatMap(child => extractNodes(child, coords));
  };
  
  // 使用rootNode作为起点
  return extractNodes(rootNode);
};

/**
 * 从JSON对象直接提取最终节点（final=true）
 * @param {Object} jsonData - JSON树结构
 * @returns {Array} 最终节点数组，包含名称和面积
 */
export const extractFinalNodes = (jsonData) => {
  const result = [];
  
  const extractFinal = (node) => {
    if (!node) return;
    
    // 如果节点是最终节点，添加到结果中
    if (node.final === true) {
      result.push({
        name: node.name || 'Unnamed',
        area: node.area || 0,
        type: node.type || node.name || 'room'
      });
    }
    
    // 如果有子节点，递归处理
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => extractFinal(child));
    }
  };
  
  // 处理根节点
  if (jsonData.split) {
    extractFinal(jsonData.split);
  } else if (jsonData.root) {
    extractFinal(jsonData.root);
  } else {
    extractFinal(jsonData);
  }
  
  return result;
};

/**
 * 直接使用LLM生成的split结构布局房间
 * @param {Object} splitData - split树结构
 * @param {Object} boundaryRect - 边界矩形
 * @returns {Array} 布局后的房间数组
 */
export const layoutFromSplitStructure = (splitData, boundaryRect) => {
  if (!splitData) return [];
  
  // 查找根节点
  let rootNode = splitData;
  if (splitData.split) {
    rootNode = splitData.split;
  } else if (splitData.root) {
    rootNode = splitData.root;
  }
  
  const layoutedRooms = [];
  
  // 递归处理split树
  const processSplitNode = (node, rect, depth = 0) => {
    if (!node) return;
    
    console.log(`Processing node at depth ${depth}:`, node.name, rect);
    
    // 如果是最终节点，添加到结果中
    if (node.final === true) {
      layoutedRooms.push({
        name: node.name || 'Unnamed',
        type: node.type || node.name || 'room',
        area: node.area || 0,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        angle: node.angle || 0
      });
      return;
    }
    
    // 如果没有子节点，也作为房间处理
    if (!node.children || node.children.length === 0) {
      layoutedRooms.push({
        name: node.name || 'Unnamed',
        type: node.type || node.name || 'room',
        area: node.area || 0,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        angle: node.angle || 0
      });
      return;
    }
    
    // 有子节点，需要递归处理
    const childrenWithArea = node.children.map(child => ({
      ...child,
      area: child.area || 100 // 确保每个子节点都有面积
    }));
    
    // 计算总面积用于比例划分
    const totalArea = childrenWithArea.reduce((sum, child) => sum + child.area, 0);
    
    // 根据节点的angle属性确定分割方向
    // 重要：angle属性定义该节点本身的分割方向，不是子节点的排列方式
    // 根据输入的示例数据和LLM思考过程:
    // angle = 0：水平分割（上下分割）- 节点被水平线分割成上下两部分
    // angle ≈ 1.57 (π/2)：垂直分割（左右分割）- 节点被垂直线分割成左右两部分
    const angle = node.angle || 0;
    const isVerticalSplit = Math.abs(angle - Math.PI/2) < 0.1; // 判断是否接近π/2
    
    console.log(`Node ${node.name} with angle ${angle} - isVerticalSplit: ${isVerticalSplit}`);
    
    // 计算子节点的位置
    let currentOffset = 0;
    
    // 注意顺序：根据LLM的想法，第一个子节点通常放在左边或上面
    childrenWithArea.forEach(child => {
      // 计算该子节点占用的比例
      const ratio = child.area / totalArea;
      
      let childRect;
      if (isVerticalSplit) {
        // 垂直分割线 - 子节点水平排列（左右排列）
        childRect = {
          x: rect.x + currentOffset,
          y: rect.y,
          width: rect.width * ratio,
          height: rect.height
        };
        currentOffset += rect.width * ratio;
      } else {
        // 水平分割线 - 子节点垂直排列（上下排列）
        childRect = {
          x: rect.x,
          y: rect.y + currentOffset,
          width: rect.width,
          height: rect.height * ratio
        };
        currentOffset += rect.height * ratio;
      }
      
      // 递归处理子节点
      processSplitNode(child, childRect, depth + 1);
    });
  };
  
  // 开始处理根节点
  processSplitNode(rootNode, boundaryRect);
  
  return layoutedRooms;
};

/**
 * 从楼层平面图数据中提取所有房间信息
 * @param {Object} floorPlanData - 楼层平面图数据
 * @param {Object} boundaryData - 边界数据
 * @returns {Array} 房间数据数组
 */
export const extractAllRooms = (floorPlanData, boundaryData) => {
  try {
    console.log("Extracting rooms from:", floorPlanData);
    
    // 如果没有数据，返回空数组
    if (!floorPlanData) return [];
    
    // 提取JSON数据
    let jsonData = null;
    
    // 处理API响应结构
    if (floorPlanData.data && floorPlanData.data.floor_plan) {
      if (floorPlanData.data.floor_plan.json_result) {
        jsonData = typeof floorPlanData.data.floor_plan.json_result === 'string'
          ? JSON.parse(floorPlanData.data.floor_plan.json_result)
          : floorPlanData.data.floor_plan.json_result;
      }
    } else {
      // 尝试直接使用floorPlanData作为jsonData
      jsonData = floorPlanData;
    }
    
    if (!jsonData) {
      console.warn("No valid floor plan data found");
      return [];
    }
    
    console.log("Parsed floor plan JSON data:", jsonData);
    
    // 获取根节点
    const rootNode = jsonData.root || jsonData;
    
    // 提取所有叶子节点
    const rooms = extractLeafNodes(rootNode, boundaryData);
    console.log("Extracted rooms:", rooms);
    
    return rooms;
  } catch (error) {
    console.error('Error extracting rooms from floor plan data:', error);
    return [];
  }
}; 