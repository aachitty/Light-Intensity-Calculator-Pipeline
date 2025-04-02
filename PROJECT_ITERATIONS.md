# Project Iterations

This document outlines the development process and evolution of the Haplon Light Intensity Calculator through various iterations.

## Iteration 1: Basic Calculator with Streamlit

- Initial implementation using Streamlit framework
- Basic UI with inputs for camera settings (T-stop, ISO, framerate)
- Simple calculation logic based on cinematography formula
- Limited to default light models with estimated photometric values
- Basic distance and intensity calculations without modifiers

**File: `app.py`**

## Iteration 2: Enhanced Flask Implementation

- Switched to Flask with HTML/JS frontend for greater flexibility
- Improved UI with tabbed interface
- Added form validation and more precise calculations
- Implemented light modifiers (diffusion types)
- Introduced color temperature options
- Added exposure warnings

**File: `app_flask.py` and template files**

## Iteration 3: Professional Light Data Integration

- Incorporated actual photometric data for professional lighting fixtures
- Added support for multiple light models (ARRI, Aputure, Litepanels)
- Implemented dynamic form controls that update based on selected light
- Enhanced calculation logic to handle different modifier types
- Added detailed information about light specifications
- Improved UI with professional branding

**Files: `new_calculator.py`, `app_flask.py` (updated)**

## Iteration 4: Comprehensive Calculation Modes

- Added three calculation modes:
  - Auto calculation (optimal balance)
  - Fixed distance (calculate intensity)
  - Fixed intensity (calculate distance)
- Improved error handling and edge case management
- Enhanced UI feedback for better user experience
- Refined exposure warnings with more detailed information
- Added rounding for user-friendly output values

**Files: Various improvements across all files**

## Future Development

- Mobile optimization for on-set use
- Additional light fixtures and modifier types
- Integration with DMX control systems
- Expanded photometric data library
- User accounts for saving and recalling setups
- Export functionality for sharing calculations