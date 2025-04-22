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
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  
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
   * 使用流式API生成平面图
   * @param {string} promptText - 描述文本
   * @param {Array} boundaries - 边界数据
   * @param {Object} preferences - 可选参数
   */
  const generateFloorPlanStream = async (promptText, boundaries, preferences = {}) => {
    // 重置流文本
    setStreamingText("");
    setIsStreaming(true);
    
    try {
      // 构建API请求URL
      const apiUrl = `${apiBaseUrl}/api/generate-floor-plan-stream`;
      console.log(`发送流式请求到: ${apiUrl}`);
      
      // 准备请求数据
      const requestData = {
        boundary_data: boundaries,
        description: promptText,
        preferences: preferences
      };
      
      // 创建事件源
      const eventSource = new EventSource(`${apiUrl}?data=${encodeURIComponent(JSON.stringify(requestData))}`);
      
      // 使用fetch发送POST请求并获取流式响应
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      // 检查HTTP状态
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      // 获取响应的可读流
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // 处理流数据
      let done = false;
      let accumulatedData = "";
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (done) break;
        
        // 解码二进制数据为文本
        const textChunk = decoder.decode(value);
        accumulatedData += textChunk;
        
        // 处理SSE格式数据
        const events = accumulatedData.split("\n\n");
        accumulatedData = events.pop() || ""; // 最后一个可能不完整
        
        for (const event of events) {
          if (event.startsWith("data: ")) {
            const jsonData = event.substring(6); // 移除 "data: " 前缀
            try {
              const data = JSON.parse(jsonData);
              
              // 根据数据类型处理
              if (data.type === "chunk") {
                // 更新流式文本
                setStreamingText(prev => prev + data.content);
              } else if (data.type === "final") {
                // 流式响应完成，设置最终结果
                setStreamingText("");
                setGeneratedFloorPlan({
                  message: data.message,
                  data: {
                    floor_plan: JSON.parse(data.floor_plan),
                    boundary: boundaries,
                    description: promptText
                  }
                });
                setIsStreaming(false);
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error("解析事件数据失败:", e, jsonData);
            }
          }
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('流式生成过程中出错:', error);
      setStreamingText("");
      setIsStreaming(false);
      setError(error.message || '流式生成过程中发生错误');
      return { success: false, error: error.message };
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
      // 使用流式生成代替普通生成
      const result = await generateFloorPlanStream(description, boundaryData, {});
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // 注意：流式生成结果会由流处理函数设置到状态中
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
          
          {/* 生成的结果显示在上方 */}
          {isStreaming && (
            <div className="stream-section">
              <div className="stream-content">
                {streamingText}
                <span className="cursor"></span>
              </div>
            </div>
          )}
          
          {generatedFloorPlan && !isStreaming && (
            <div className="result-section">
              <h2>Generated Floor Plan</h2>
              <div className="result-tabs">
                <div className="result-content">
                  <div className="result-info">
                    <p><strong>Description:</strong> {generatedFloorPlan.data.description}</p>
                    <p><strong>Boundary Data:</strong> {generatedFloorPlan.data.boundary.length} shape(s)</p>
                  </div>
                  
                  <div className="result-json">
                    <h3>Floor Plan Structure</h3>
                    <div className="json-section">
                      <pre>{JSON.stringify(generatedFloorPlan.data.floor_plan.json_result, null, 2)}</pre>
                    </div>
                    
                    <h3>Thinking Process</h3>
                    <div className="thinking-section">
                      <pre className="thinking-content">{generatedFloorPlan.data.floor_plan.thinking_steps}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 输入控件固定在底部 */}
          <div className="input-container">
            <TextInput 
              value={description} 
              onChange={setDescription} 
              onGenerate={handleGenerate}
              isLoading={isLoading || isStreaming}
              hasResults={generatedFloorPlan !== null || isStreaming}
            />
          </div>
        </div>
      </main>
      
      {/* Debug panel for development */}
      <DebugPanel boundaryData={boundaryData} />
    </div>
  );
}

export default App; 