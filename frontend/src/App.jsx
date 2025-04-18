import React, { useState } from 'react';
import BoundaryCanvas from './components/BoundaryCanvas';
import TextInput from './components/TextInput';
import './styles/App.css';

function App() {
  const [boundaryData, setBoundaryData] = useState(null);
  const [description, setDescription] = useState('');
  const [generatedFloorPlan, setGeneratedFloorPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!boundaryData || !description) {
      alert('Please draw a boundary and enter a description.');
      return;
    }

    setIsLoading(true);
    
    try {
      // In a real application, this would be a call to your backend
      // For now, we'll just simulate a response
      console.log('Sending data to backend:', { boundaryData, description });
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setGeneratedFloorPlan({
        message: 'Floor plan generated successfully!',
        // This would be actual floor plan data from the backend
        data: { boundary: boundaryData, description }
      });
    } catch (error) {
      console.error('Error generating floor plan:', error);
      alert('Error generating floor plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>LLM Floor Plan Generator</h1>
        <p>Draw a boundary and describe your floor plan requirements</p>
      </header>

      <main>
        <div className="canvas-section">
          <h2>Draw Boundary</h2>
          <BoundaryCanvas onBoundaryChange={setBoundaryData} />
        </div>

        <div className="input-section">
          <h2>Describe Your Floor Plan</h2>
          <TextInput 
            value={description} 
            onChange={setDescription} 
            onGenerate={handleGenerate}
            isLoading={isLoading}
          />
        </div>

        {generatedFloorPlan && (
          <div className="result-section">
            <h2>Generated Floor Plan</h2>
            <pre>{JSON.stringify(generatedFloorPlan, null, 2)}</pre>
          </div>
        )}
      </main>
    </div>
  );
}

export default App; 