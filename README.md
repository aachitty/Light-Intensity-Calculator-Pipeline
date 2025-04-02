# Haplon Light Intensity Calculator

A professional tool for cinematographers to calculate optimal light placement and intensity based on camera and lighting parameters.

## Overview

The Haplon Light Intensity Calculator is designed for cinematographers to determine the ideal positioning and intensity settings for professional lighting equipment based on camera settings (ISO, framerate, and T-stop). This tool uses accurate photometric data from real-world lighting fixtures to provide precise calculations that follow the physics of light.

## Features

- Calculate optimal light distance and intensity based on desired exposure
- Support for multiple professional lighting fixtures with actual photometric data
- Adjustable parameters including:
  - Camera settings (T-stop, ISO, framerate)
  - Light models (ARRI SkyPanel S60-C, Aputure LS 300X, etc.)
  - Light modifiers (diffusion types, beam angles)
  - Color temperature options
- Exposure warnings for under/overexposed scenes
- Multiple calculation modes:
  - Auto calculation (optimal balance)
  - Specify distance (fixed distance, calculate intensity)
  - Specify intensity (fixed intensity, calculate distance)

## Lighting Formula

The calculator uses the standard cinematography formula:

```
FC = 25f²/(exp×ISO)
```

Where:
- FC is foot-candles
- f is the T-stop (aperture)
- exp is exposure time (derived from framerate)
- ISO is the camera sensitivity

## Supported Lighting Fixtures

- ARRI SkyPanel S60-C (45288 lux·m² max output)
- Aputure LS 300X LED Fresnel (39500 lux·m² max output)
- Litepanels Gemini 2x1 Hard RGBWW (25000 lux·m² max output)
- Aputure MC RGBWW LED Panel (100 lux·m² max output)

## Usage

1. Select your camera settings (T-stop, ISO, framerate)
2. Choose your light fixture and modifier type
3. Select color temperature
4. Choose calculation mode (auto, fixed distance, or fixed intensity)
5. View results displaying optimal distance and intensity settings

## Technical Notes

- Calculations use the inverse square law for light falloff
- Light output values are based on manufacturer photometric data
- Intensity is displayed as a percentage of maximum fixture output

## Copyright

© 2025 Haplon Light Intensity Calculator | Professional Lighting Tool