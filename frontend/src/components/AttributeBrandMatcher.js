import React, { useState, useEffect } from 'react';

const AttributeBrandMatcher = ({ 
  attribute, 
  attributeText, 
  mcJeansBrand, 
  otherBrands, 
  onSelectionChange,
  currentSelections = []
}) => {
  // State to track which brands are selected for this attribute
  const [selectedBrands, setSelectedBrands] = useState(currentSelections);
  
  // State to hold the shuffled brands with positions
  const [positionedBrands, setPositionedBrands] = useState([]);
  
  // Shuffle brands and position them when attribute changes
  useEffect(() => {
    // Make sure mcJeansBrand exists, use a fallback if not
    const mcJeansForPositioning = mcJeansBrand || { value: '1', label: 'Mc Jeans' };
    
    // Ensure we have Mc Jeans + 3 other brands
    let brandsToPosition = [mcJeansForPositioning];
    
    // Add other brands, up to 3, only if otherBrands is defined and has elements
    if (otherBrands && otherBrands.length > 0) {
      // Take up to 3 other brands
      brandsToPosition = [...brandsToPosition, ...otherBrands.slice(0, 3)];
    }
    
    // If we have fewer than 4 brands total, create dummy brands to fill positions
    while (brandsToPosition.length < 4) {
      // Create a new dummy brand rather than duplicating existing ones
      brandsToPosition.push({ 
        value: `dummy-${brandsToPosition.length}`, 
        label: `Brand ${brandsToPosition.length}`
      });
    }
    
    // Shuffle the brands
    const shuffled = [...brandsToPosition].sort(() => Math.random() - 0.5);
    
    // Assign positions to corners: top-left, top-right, bottom-right, bottom-left
    setPositionedBrands([
      { ...shuffled[0], position: 'top' },    // Top-left
      { ...shuffled[1], position: 'right' },  // Top-right
      { ...shuffled[2], position: 'bottom' }, // Bottom-right
      { ...shuffled[3], position: 'left' }    // Bottom-left
    ]);
    
    // Reset selections using currentSelections or an empty array if it's undefined
    setSelectedBrands(currentSelections || []);
  }, [attribute, mcJeansBrand, otherBrands]);
  
  useEffect(() => {
    // Only update selections without reshuffling positions
    setSelectedBrands(currentSelections || []);
  }, [currentSelections]);
  
  // Handle brand selection toggle
  const toggleBrandSelection = (brandValue) => {
    let newSelections;
    
    if (selectedBrands.includes(brandValue)) {
      // Remove brand if already selected
      newSelections = selectedBrands.filter(value => value !== brandValue);
    } else {
      // Add brand if not selected
      newSelections = [...selectedBrands, brandValue];
    }
    
    setSelectedBrands(newSelections);
    
    // Notify parent component of the change
    onSelectionChange(attribute, newSelections);
  };
  
  // Get style class based on position
  // Renamed positions to better reflect corner placement
  const getPositionClass = (position) => {
    switch (position) {
      case 'top': return 'brand-top';      // Top-left
      case 'right': return 'brand-right';  // Top-right
      case 'bottom': return 'brand-bottom'; // Bottom-right
      case 'left': return 'brand-left';    // Bottom-left
      default: return '';
    }
  };
  
  return (
    <div className="attribute-matcher-container">
      {/* Central attribute */}
      <div className="attribute-center">
        <div className="attribute-text-box">
          <p className="attribute-text">{attributeText}</p>
        </div>
      </div>
      
      {/* Positioned brands */}
      {Array.isArray(positionedBrands) && positionedBrands.map((brand, index) => (
        <div 
          key={`${brand.position || 'pos'}-${index}`}
          className={`brand-option ${getPositionClass(brand.position || 'top')} ${Array.isArray(selectedBrands) && brand && selectedBrands.includes(brand.value) ? 'selected' : ''}`}
          onClick={() => brand && toggleBrandSelection(brand.value)}
        >
          <div className="brand-box">
            <p className="brand-name">{brand ? brand.label : `Brand ${index + 1}`}</p>
          </div>
        </div>
      ))}
      
      {/* Optional instructions */}
      <div className="matcher-instructions">
        <p>Select all brands that match this attribute</p>
      </div>
    </div>
  );
};



// Attribute questionnaire that cycles through all attributes
const AttributeQuestionnaire = ({ 
  attributes = [], 
  mcJeansBrand = { value: '1', label: 'Mc Jeans' },
  pipelineBrands = [],
  onComplete = () => {},
  initialSelections = {}
}) => {
  // Current attribute index
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Store all selections
  const [allSelections, setAllSelections] = useState(initialSelections);
  
  const validateAllSelectionsComplete = () => {
    // Check if all attributes have at least one brand selected
    const isComplete = attributes.every(attr => 
      allSelections[attr.id] && allSelections[attr.id].length > 0
    );
    
    return isComplete;
  };

  // Get current attribute (with safety check)
  const currentAttribute = attributes && attributes.length > 0 
    ? attributes[currentIndex] 
    : { id: 'default', text: 'Select brands that match this attribute' };
  
  // Handle selection change for current attribute
  const handleSelectionChange = (attribute, selections) => {
    setAllSelections(prev => ({
      ...prev,
      [attribute]: selections
    }));
  };
  
  // Move to next attribute
  const goToNext = () => {
    if (currentIndex < attributes.length - 1) {
      // If not the last attribute, just move to the next one
      setCurrentIndex(currentIndex + 1);
    } else {
      // On the last attribute, validate all selections before completing
      if (validateAllSelectionsComplete()) {
        // All attributes have at least one selection, we can complete
        onComplete(allSelections);
      } else {
        // Show an alert if validation fails
        alert('Please select at least one option for each attribute statement before finishing.');
      }
    }
  };
  
  // Move to previous attribute
  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  // Filter 3 random brands from pipeline brands (excluding McJeans)
  const getOtherBrands = () => {
    // Ensure pipelineBrands is an array
    const brandsArray = Array.isArray(pipelineBrands) ? pipelineBrands : [];
    
    // Safe filtering - check if mcJeansBrand exists and has a value property
    const filteredBrands = brandsArray.filter(brand => 
      brand && mcJeansBrand && brand.value !== mcJeansBrand.value
    );
    
    // Handle empty filtered brands case
    if (filteredBrands.length === 0) {
      // Return some dummy brands if we don't have any real ones
      return [
        { value: 'dummy-1', label: 'Brand 1' },
        { value: 'dummy-2', label: 'Brand 2' },
        { value: 'dummy-3', label: 'Brand 3' }
      ];
    }
    
    // Shuffle and take up to 3
    return [...filteredBrands]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
  };
  
  // Use the brands getter in useState
  const [otherBrands] = useState(getOtherBrands());
  
  return (
    <div className="attribute-questionnaire">
      {/* Progress indicator */}
      <div className="questionnaire-progress">
        <div className="progress-text">
          Statement {currentIndex + 1} of {attributes.length}
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${((currentIndex + 1) / attributes.length) * 100}%` }} 
          />
        </div>
      </div>
      
      {/* Current attribute matcher */}
      <AttributeBrandMatcher
        attribute={currentAttribute.id}
        attributeText={currentAttribute.text}
        mcJeansBrand={mcJeansBrand}
        otherBrands={otherBrands}
        onSelectionChange={handleSelectionChange}
        currentSelections={allSelections[currentAttribute.id] || []}
      />
      
      {/* Navigation buttons */}
      <div className="questionnaire-nav-centered">
        <div className="questionnaire-button-group">
          <button 
            className="btn-attribute-previous"
            onClick={goToPrevious} 
            disabled={currentIndex === 0}
          >
            Previous
          </button>
          
          <button 
            className="btn-attribute-next"
            onClick={goToNext}
            disabled={currentIndex === attributes.length - 1 && !validateAllSelectionsComplete()}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttributeQuestionnaire;