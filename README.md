# Haplon Light Intensity Calculator

## Professional Cinematography Lighting Calculator (Working Version)

A professional web application designed for cinematographers to calculate and optimize light placement and intensity. This tool provides precise photometric calculations and exposure guidance, with a focus on interactive and user-friendly design for professional lighting decisions.

### Features

- **Real-world Professional Lighting Fixtures**: Includes actual photometric data for:
  - ARRI SkyPanel S60-C
  - Aputure LS 300X
  - Litepanels Gemini 2x1
  - Aputure MC RGBWW LED Panel

- **Dynamic Modifiers**: Automatically updates available diffusion types and beam angles based on the selected light.

- **Physics-based Calculations**: Uses the cinematography formula `FC = 25f²/(exp*ISO)` and inverse square law for accurate exposure settings.

- **Specialized Calculations**: Each light type has custom handling for its modifiers to provide accurate intensity calculations.

- **Standard Cinema T-stops**: Includes all standard cinema T-stop increments (1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22, 32) plus custom T-stop input.

- **Exposure Warning System**: Alerts when the subject might be under or overexposed.

### Technical Details

- Built with Flask backend and JavaScript frontend
- Implements real photometric data with proper mathematical models
- Accounts for different modifier types (diffusion panels, beam angles)
- Performs necessary lux/foot-candle conversions
- Uses the inverse square law for distance calculations
- Provides clear, actionable results for cinematographers

### Calculation Modes

1. **Auto Calculate**: Automatically determines optimal distance and intensity
2. **Specify Distance**: Calculates required intensity for a fixed distance
3. **Specify Intensity**: Calculates ideal distance for a fixed intensity

### Usage

1. Input your camera settings (T-stop, ISO, Framerate)
2. Select a light model
3. Choose appropriate modifier/diffusion type
4. Select color temperature
5. Choose calculation mode
6. View results including distance, intensity and any exposure warnings

### Development Notes

This version includes fully functioning calculations with proper differentiation between different modifier types. The intensity calculations now correctly adjust based on the selected diffusion type or beam angle.

### License

© 2024 Haplon Light Intensity Calculator | Professional Lighting Tool