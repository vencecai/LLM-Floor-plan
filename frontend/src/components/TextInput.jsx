import React from 'react';

function TextInput({ value, onChange, onGenerate, isLoading }) {
  const handleChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <div className="text-input-container">
      <textarea
        className="description-textarea"
        placeholder="Describe your floor plan requirements... (e.g., 'Create a 2-bedroom apartment with an open kitchen-living area, a bathroom, and a small office space')"
        value={value}
        onChange={handleChange}
        rows={10}
      />
      
      <div className="example-prompts">
        <h3>Example prompts:</h3>
        <ul>
          <li onClick={() => onChange("Create a 2-bedroom apartment with an open kitchen-living area, a bathroom, and a small office space.")}>
            2-bedroom apartment with open plan
          </li>
          <li onClick={() => onChange("Design a small studio with a kitchen area, bathroom, and multi-purpose living space. Maximize natural light.")}>
            Studio with multi-purpose space
          </li>
          <li onClick={() => onChange("Generate a family home with 3 bedrooms, 2 bathrooms, a kitchen, dining room, living room, and a home office.")}>
            3-bedroom family home
          </li>
        </ul>
      </div>
      
      <button 
        className={`generate-button ${isLoading ? 'loading' : ''}`}
        onClick={onGenerate}
        disabled={isLoading}
      >
        {isLoading ? 'Generating...' : 'Generate Floor Plan'}
      </button>
    </div>
  );
}

export default TextInput; 