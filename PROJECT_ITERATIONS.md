# Haplon Light Intensity Calculator Project - Development Iterations

This document provides a detailed overview of the different development iterations of the Haplon Light Intensity Calculator.

## Iteration 1: Basic Calculator Functionality

**Key Features:**
- Initial implementation of the calculator using the formula FC = 25f²/(exp*ISO)
- Basic Streamlit interface for inputs (T-stop, ISO, Framerate)
- Single light model with basic calculations
- Simple UI with no branding

**Files:**
- `app.py` - Basic Streamlit implementation
- `calculator.py` - Core calculation functions

## Iteration 2: Flask Implementation and Enhanced UI

**Key Features:**
- Migrated from Streamlit to Flask for more control over UI
- Added HTML/CSS/JS frontend
- Implemented the inverse square law for light falloff calculations
- Added support for different diffusion types
- Basic exposure warnings

**Files:**
- `app_flask.py` - Flask application
- `templates/index.html` - HTML frontend
- `static/style.css` - CSS styling

## Iteration 3: Advanced Photometric Data and Diffusion Options

**Key Features:**
- Implemented real-world photometric data for light fixtures
- Added multiple diffusion types and color temperature options
- Enhanced UI with professional styling
- Added data visualization for light intensities
- Implemented intensity clamping at 100% 
- Rounded results to 2 decimal places

**Files:**
- `app_flask.py` - Enhanced with photometric data
- `new_calculator.py` - Advanced calculation functions
- `extract_pdf_data.py` - Tools for extracting photometric data

## Iteration 4: Brand Identity and Professional UI

**Key Features:**
- Added Haplon branding (dark theme, logo)
- Removed all ARRI references
- Enhanced UI with professional styling and better layout
- Added copyright information (updated to 2025)
- Improved error handling and edge cases

**Files:**
- `app_flask.py` - Updated branding
- `templates/index.html` - Enhanced UI
- `static/haplon_logo.png` - Brand logo

## Iteration 5: Multiple Light Models and Advanced Options

**Key Features:**
- Expanded support for multiple light fixtures:
  * ARRI SkyPanel S60-C: 45288 lux·m² max output
  * Aputure LS 300X (LED Fresnel): 39500 lux·m² max output
  * Litepanels Gemini 2x1 Hard RGBWW: 25000 lux·m² max output
  * Aputure MC RGBWW LED Panel: 100 lux·m² max output
- Dynamic dropdowns that change based on selected light model
- Custom T-stop input option
- Enhanced mobile responsiveness
- Better exposure warnings

**Files:**
- `app_flask.py` - Multiple light models
- `new_calculator.py` - Enhanced calculation engine
- `templates/index.html` - Dynamic UI elements

## Iteration 6: 2D Visualization Feature (In Progress)

**Key Features:**
- Interactive 2D canvas for visualizing light placement
- Ability to add, position, and remove lights in the scene
- Real-time calculations as lights are moved
- Distance rings and grid system for accurate measurements
- Visual representation of light intensity and color temperature

**Files:**
- `static/js/2d-visualizer.js` - Visualization functionality
- `templates/index.html` - Tab-based interface with visualization tab
- `app_flask.py` - Backend support for visualization calculations

## Technical Notes

### Calculation Method
The calculator employs the cinematography formula: 
```
FC = 25f²/(exp*ISO)
```
Where:
- FC = foot-candles
- f = T-stop
- exp = exposure time (1/framerate)
- ISO = camera sensitivity

This is then converted to lux (1 FC = 10.76 lux) for use with photometric data.

### Inverse Square Law
The calculator implements the inverse square law for determining how light intensity falls off with distance:
```
I₂ = I₁ × (d₁/d₂)²
```
Where:
- I₁ = intensity at distance d₁
- I₂ = intensity at distance d₂

### Light Data Structure
Each light fixture has data stored in the following format:
- Light model name
- Maximum output (in lux·m²)
- Supported diffusion types or beam angles
- Color temperature options
- Distance-illuminance data points for interpolation

### Interpolation Method
The calculator uses scipy's interpolation functions to determine illuminance values at arbitrary distances between measured data points.