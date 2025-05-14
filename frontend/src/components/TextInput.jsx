import React from 'react';

function TextInput({ value, onChange, onGenerate, isLoading, hasResults }) {
  const handleChange = (e) => {
    onChange(e.target.value);
  };

  const examplePrompts = [
    "Create a 2-bedroom apartment with an open kitchen-living area, a bathroom, and a small office space.",
    "Design a small studio with a kitchen area, bathroom, and multi-purpose living space.",
    "Generate a family home with 3 bedrooms, 2 bathrooms, a kitchen, dining room, living room, and a home office."
  ];

  return (
    <div className={`text-input-container ${hasResults ? 'with-results' : ''}`}>
      {!hasResults && (
        <div className="example-prompts">
          <h3>Example prompts:</h3>
          <ul>
            {examplePrompts.map((prompt, index) => (
              <li key={index} onClick={() => onChange(prompt)}>
                {prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="input-area">
        <textarea
          className="description-textarea"
          placeholder="Describe your floor plan requirements..."
          value={value}
          onChange={handleChange}
          rows={hasResults ? 3 : 4}
        />
        
        <button 
          className={`generate-button ${isLoading ? 'loading' : ''}`}
          onClick={onGenerate}
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Generate Floor Plan'}
        </button>
      </div>
    </div>
  );
}

export default TextInput; 