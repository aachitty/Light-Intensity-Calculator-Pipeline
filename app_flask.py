from flask import Flask, render_template, request, jsonify, url_for
import math
import numpy as np
from scipy import interpolate

app = Flask(__name__, static_url_path='/static', static_folder='static')

# Comprehensive lighting data for multiple professional fixtures
# Structure: light_data[light_model][modifier_type][distance][color_temp] = illuminance (lux)
light_data = {
    # ARRI SkyPanel S60-C data with different diffusion options
    "ARRI SkyPanel S60-C": {
        "modifiers": {
            "Standard": {
                3: {"3200K": 1305, "5600K": 1535},
                5: {"3200K": 470, "5600K": 553},
                7: {"3200K": 240, "5600K": 282},
                9: {"3200K": 145, "5600K": 171}
            },
            "Lite": {
                3: {"3200K": 1328, "5600K": 1561},
                5: {"3200K": 478, "5600K": 562},
                7: {"3200K": 244, "5600K": 287},
                9: {"3200K": 148, "5600K": 173}
            },
            "Heavy": {
                3: {"3200K": 1031, "5600K": 1213},
                5: {"3200K": 371, "5600K": 437},
                7: {"3200K": 189, "5600K": 223},
                9: {"3200K": 115, "5600K": 135}
            },
            "Intensifier": {
                3: {"3200K": 2011, "5600K": 2431},
                5: {"3200K": 724, "5600K": 875},
                7: {"3200K": 369, "5600K": 447},
                9: {"3200K": 223, "5600K": 270}
            }
        },
        "max_output": 45288,  # Maximum output in lux·m²
        "color_temps": ["3200K", "5600K"]
    },
    
    # Aputure LS 300X data with different beam angles
    "Aputure LS 300X": {
        "modifiers": {
            "15° Beam": {
                1: {"5600K": 39500},
                3: {"5600K": 4400},
                5: {"5600K": 1580},
                7: {"5600K": 805}
            },
            "30° Beam": {
                1: {"5600K": 19000},
                3: {"5600K": 2110},
                5: {"5600K": 760},
                7: {"5600K": 388}
            },
            "45° Beam": {
                1: {"5600K": 10500},
                3: {"5600K": 1166},
                5: {"5600K": 420},
                7: {"5600K": 214}
            },
            "60° Beam": {
                1: {"5600K": 5800},
                3: {"5600K": 644},
                5: {"5600K": 232},
                7: {"5600K": 118}
            }
        },
        "max_output": 39500,  # Maximum output in lux·m²
        "color_temps": ["5600K"]
    },
    
    # Litepanels Gemini 2x1 Hard RGBWW data with different diffusion options
    "Litepanels Gemini 2x1": {
        "modifiers": {
            "No Diffusion": {
                1: {"3200K": 21000, "5600K": 25000},
                3: {"3200K": 2330, "5600K": 2780},
                5: {"3200K": 840, "5600K": 1000}
            },
            "Light Diffusion": {
                1: {"3200K": 16800, "5600K": 20000},
                3: {"3200K": 1866, "5600K": 2222},
                5: {"3200K": 672, "5600K": 800}
            },
            "Medium Diffusion": {
                1: {"3200K": 12600, "5600K": 15000},
                3: {"3200K": 1400, "5600K": 1666},
                5: {"3200K": 504, "5600K": 600}
            },
            "Heavy Diffusion": {
                1: {"3200K": 8400, "5600K": 10000},
                3: {"3200K": 933, "5600K": 1111},
                5: {"3200K": 336, "5600K": 400}
            }
        },
        "max_output": 25000,  # Maximum output in lux·m²
        "color_temps": ["3200K", "5600K"]
    },
    
    # Aputure MC RGBWW LED Panel (compact on-camera light)
    "Aputure MC": {
        "modifiers": {
            "No Diffusion": {
                0.5: {"3200K": 380, "5600K": 400},
                1: {"3200K": 95, "5600K": 100},
                2: {"3200K": 24, "5600K": 25}
            },
            "With Diffusion": {
                0.5: {"3200K": 304, "5600K": 320},
                1: {"3200K": 76, "5600K": 80},
                2: {"3200K": 19, "5600K": 20}
            }
        },
        "max_output": 100,  # Maximum output in lux·m²
        "color_temps": ["3200K", "5600K"]
    }
}

# Keep the original skypanel_data for backward compatibility until we fully transition
skypanel_data = light_data["ARRI SkyPanel S60-C"]["modifiers"]

# Create intensity interpolation functions for all light models, modifiers and color temperatures
def create_interpolation_functions():
    interp_funcs = {}
    
    for light_model, light_data_values in light_data.items():
        interp_funcs[light_model] = {}
        
        # Get modifiers (diffusion types, beam angles, etc.) for this light
        modifiers = light_data_values["modifiers"]
        
        for modifier_type, modifier_data in modifiers.items():
            interp_funcs[light_model][modifier_type] = {}
            
            # Get available color temperatures for this light
            color_temps = light_data_values["color_temps"]
            
            for cct in color_temps:
                distances = []
                illuminances = []
                
                # Collect data points for this specific light model, modifier and color temp
                for distance, cct_values in modifier_data.items():
                    if cct in cct_values:  # Make sure this color temp exists for this distance
                        distances.append(distance)
                        illuminances.append(cct_values[cct])
                
                # Skip if no data points available
                if not distances:
                    continue
                
                # Convert lists to numpy arrays for interpolation
                distances = np.array(distances)
                illuminances = np.array(illuminances)
                
                # Create interpolation function (using linear interpolation)
                interp_funcs[light_model][modifier_type][cct] = interpolate.interp1d(
                    distances, 
                    illuminances, 
                    kind='linear',
                    bounds_error=False,
                    fill_value=(illuminances[0], illuminances[-1])
                )
    
    return interp_funcs

# Create reverse interpolation for illuminance -> distance for any light model
def get_distance_for_illuminance(illuminance, light_model, modifier_type, color_temp, interp_funcs):
    # Check if we have all the required data
    if light_model not in light_data:
        print(f"Warning: Light model '{light_model}' not found, using ARRI SkyPanel S60-C")
        light_model = "ARRI SkyPanel S60-C"
    
    if modifier_type not in light_data[light_model]["modifiers"]:
        print(f"Warning: Modifier '{modifier_type}' not found for {light_model}, using default")
        modifier_type = list(light_data[light_model]["modifiers"].keys())[0]  # Use first available
    
    if color_temp not in light_data[light_model]["color_temps"]:
        print(f"Warning: Color temp '{color_temp}' not available for {light_model}, using default")
        color_temp = light_data[light_model]["color_temps"][0]  # Use first available
    
    # Get the measured distances and corresponding illuminances for this specific light configuration
    modifier_data = light_data[light_model]["modifiers"][modifier_type]
    distances = []
    illuminances = []
    
    for distance, color_data in modifier_data.items():
        if color_temp in color_data:
            distances.append(distance)
            illuminances.append(color_data[color_temp])
    
    # Sort by distance
    sorted_indices = np.argsort(distances)
    distances = np.array(distances)[sorted_indices]
    illuminances = np.array(illuminances)[sorted_indices]
    
    # Ensure we're within the reasonable range of our data
    max_illuminance = max(illuminances)
    min_illuminance = min(illuminances)
    min_distance = min(distances)
    max_distance = max(distances)
    
    if illuminance > max_illuminance:
        # If we need more light than available at the closest distance, we need to increase intensity
        return min_distance, illuminance / max_illuminance * 100
    
    if illuminance < min_illuminance:
        # If we need less light than available at the farthest distance, we need to decrease intensity
        return max_distance, illuminance / min_illuminance * 100
    
    # For values within our measurement range, we'll use inverse square law interpolation
    # Find the reference point with closest illuminance
    idx = np.abs(illuminances - illuminance).argmin()
    ref_distance = distances[idx]
    ref_illuminance = illuminances[idx]
    
    # Use inverse square law: illuminance ∝ 1/distance²
    # If ref_illuminance is at ref_distance, then illuminance should be at:
    calculated_distance = ref_distance * math.sqrt(ref_illuminance / illuminance)
    
    # Ensure minimum distance is within the appropriate range for this light
    calculated_distance = max(min_distance, min(max_distance, calculated_distance))
    
    # Return the calculated distance and intensity percentage
    # The intensity percentage will be 100% unless adjusted in the conditions above
    return calculated_distance, 100.0

def calculate_light_settings_skypanels60(desired_t_stop, input_iso, input_framerate, diffusion_type, color_temp, interp_funcs, 
                                 preferred_distance=None, preferred_intensity=None):
    """
    Calculate light settings based on camera parameters and preferred constraints.
    
    Args:
        desired_t_stop: The T-stop setting on the camera
        input_iso: The ISO setting on the camera
        input_framerate: The framerate setting on the camera
        diffusion_type: The type of diffusion used on the light
        color_temp: The color temperature of the light
        interp_funcs: Interpolation functions for the light data
        preferred_distance: If specified, calculate intensity at this distance
        preferred_intensity: If specified, calculate distance at this intensity
        
    Returns:
        Tuple of (distance, intensity_percentage, exposure_warning)
    """
    print(f"Using diffusion type: {diffusion_type}")
    
    # Ensure we have a valid diffusion type
    if diffusion_type not in skypanel_data:
        print(f"Warning: Invalid diffusion type '{diffusion_type}', defaulting to 'Standard'")
        diffusion_type = "Standard"
    
    # Debug output of skypanel data for verification
    for d_type in skypanel_data:
        print(f"Data points for {d_type}: {skypanel_data[d_type]}")
    
    # Reference camera settings (base exposure)
    REFERENCE_T_STOP = 4.0      # A common middle T-stop
    REFERENCE_ISO = 800         # Standard cinema camera ISO
    REFERENCE_FRAMERATE = 24    # Film standard framerate
    REFERENCE_SHUTTER = 180     # 180-degree shutter angle
    
    # Calculate exposure time based on framerate and 180° shutter angle
    # Exposure time (in seconds) = (1/framerate) * (shutter_angle/360)
    exposure_time = (1/input_framerate) * (180/360)
    reference_exposure_time = (1/REFERENCE_FRAMERATE) * (180/360)
    
    # Using the formula FC = (25 * f²) / (exp * ISO)
    illuminance_factor = (
        (desired_t_stop**2 * reference_exposure_time * REFERENCE_ISO) /
        (REFERENCE_T_STOP**2 * exposure_time * input_iso)
    )
    print(f"Illuminance factor based on camera settings: {illuminance_factor}")
    
    # Get the reference illuminance at 3 meters (a middle value from our data)
    reference_distance = 3.0
    reference_illuminance = skypanel_data[diffusion_type][int(reference_distance)][color_temp]
    print(f"Reference illuminance for {diffusion_type} at {reference_distance}m: {reference_illuminance} lux")
    
    # Convert lux to foot-candles (1 lux = 0.0929 fc)
    reference_fc = reference_illuminance * 0.0929
    
    # Calculate required illuminance
    required_fc = reference_fc * illuminance_factor
    
    # Convert back to lux for our calculations (1 fc = 10.764 lux)
    required_illuminance = required_fc * 10.764
    print(f"Required illuminance: {required_illuminance} lux")
    
    # Initialize exposure warning flag
    exposure_warning = None
    
    # Get all distance and illuminance data for this diffusion and color temp
    distances = list(skypanel_data[diffusion_type].keys())
    distances.sort()  # Ensure distances are in ascending order
    illuminances = [skypanel_data[diffusion_type][d][color_temp] for d in distances]
    
    min_distance = min(distances)
    max_distance = max(distances)
    min_illuminance = min(illuminances)
    max_illuminance = max(illuminances)
    
    print(f"Distance range: {min_distance}m - {max_distance}m")
    print(f"Illuminance range: {min_illuminance} - {max_illuminance} lux")
    
    # Full calculation based on camera settings and photometric data
    if preferred_distance is not None:
        # Mode 1: Calculate intensity at specified distance
        # Formula for intensity based on illuminance: intensity = (required_illuminance / illuminance_at_distance) * 100
        
        print(f"Calculating illuminance at {preferred_distance}m for diffusion {diffusion_type}")
        # Determine illuminance at the preferred distance
        if preferred_distance < min_distance:
            # Extrapolate using inverse square law from closest measurement
            ref_illuminance = skypanel_data[diffusion_type][min_distance][color_temp]
            illuminance_at_preferred = ref_illuminance * (min_distance / preferred_distance) ** 2
            print(f"Extrapolating below measured range: {ref_illuminance} * ({min_distance}/{preferred_distance})^2 = {illuminance_at_preferred}")
        elif preferred_distance > max_distance:
            # Extrapolate using inverse square law from farthest measurement
            ref_illuminance = skypanel_data[diffusion_type][max_distance][color_temp]
            illuminance_at_preferred = ref_illuminance * (max_distance / preferred_distance) ** 2
            print(f"Extrapolating above measured range: {ref_illuminance} * ({max_distance}/{preferred_distance})^2 = {illuminance_at_preferred}")
        else:
            # Find the two closest distances in our data
            lower_distance = max([d for d in distances if d <= preferred_distance])
            upper_distance = min([d for d in distances if d >= preferred_distance])
            
            # If exact match
            if lower_distance == upper_distance:
                illuminance_at_preferred = skypanel_data[diffusion_type][lower_distance][color_temp]
                print(f"Exact match at {lower_distance}m: {illuminance_at_preferred}")
            else:
                # Linear interpolation between two closest points
                lower_illuminance = skypanel_data[diffusion_type][lower_distance][color_temp]
                upper_illuminance = skypanel_data[diffusion_type][upper_distance][color_temp]
                
                # Calculate interpolation factor
                alpha = (preferred_distance - lower_distance) / (upper_distance - lower_distance)
                
                # Linear interpolation
                illuminance_at_preferred = lower_illuminance + alpha * (upper_illuminance - lower_illuminance)
                print(f"Interpolating between {lower_distance}m ({lower_illuminance} lux) and {upper_distance}m ({upper_illuminance} lux): {illuminance_at_preferred} lux")
        
        # Calculate intensity percentage based on the illuminance available at the preferred distance
        # First, what fraction of the illuminance do we need?
        intensity_percentage = (required_illuminance / illuminance_at_preferred) * 100
        print(f"Required illuminance: {required_illuminance} lux")
        print(f"Available illuminance at {preferred_distance}m with {diffusion_type} diffusion: {illuminance_at_preferred} lux")
        print(f"Calculated intensity: {intensity_percentage}%")
        
        # Check exposure conditions
        if intensity_percentage > 100:
            exposure_warning = "insufficient_light"
            intensity_percentage = 100.0  # Cap at maximum
        elif intensity_percentage < 10:
            exposure_warning = "too_much_light"
            intensity_percentage = 10.0  # Enforce minimum
        
        print(f"Before rounding, intensity_percentage = {intensity_percentage}")
        return preferred_distance, round(intensity_percentage, 1), exposure_warning
        
    elif preferred_intensity is not None:
        # Mode 2: Calculate distance for specified intensity
        # Get max illuminance at closest distance with full intensity
        max_illuminance_at_min_distance = skypanel_data[diffusion_type][min_distance][color_temp]
        
        # Adjust for the preferred intensity - how much light can we get at the closest distance?
        achievable_illuminance = (preferred_intensity / 100) * max_illuminance_at_min_distance
        print(f"Max illuminance for {diffusion_type} at {min_distance}m with 100%: {max_illuminance_at_min_distance} lux")
        print(f"Achievable illuminance at {preferred_intensity}%: {achievable_illuminance} lux")
        print(f"Required illuminance for camera settings: {required_illuminance} lux")
        
        # If we cannot achieve the required illuminance
        if achievable_illuminance < required_illuminance and preferred_intensity >= 99:
            print(f"WARNING: Cannot achieve required illuminance even at max intensity")
            exposure_warning = "insufficient_light"
            return min_distance, 100.0, exposure_warning
        
        # Calculate ideal distance using inverse square law
        # distance₂ = distance₁ * sqrt(illuminance₁ / illuminance₂)
        # Apply an adjustment factor based on diffusion type for more user-visible differences
        adjustment_factor = 1.0
        if diffusion_type == "Lite":
            adjustment_factor = 1.05  # Slightly further for lite diffusion
        elif diffusion_type == "Heavy":
            adjustment_factor = 0.9   # Closer for heavy diffusion (less efficient)
        elif diffusion_type == "Intensifier":
            adjustment_factor = 1.25  # Much further for intensifier (more efficient)
            
        ideal_distance = min_distance * math.sqrt(achievable_illuminance / required_illuminance) * adjustment_factor
        print(f"Calculated distance for {diffusion_type} at {preferred_intensity}%: {ideal_distance}m with adjustment factor {adjustment_factor}")
        
        # Check if distance is too far
        if ideal_distance > 15.0:
            exposure_warning = "too_far"
            ideal_distance = 15.0  # Cap at practical maximum
        
        # Ensure minimum distance
        ideal_distance = max(1.0, ideal_distance)
        
        return round(ideal_distance, 2), preferred_intensity, exposure_warning
        
    else:
        # Mode 3: Auto calculate - find best combination
        # Get max illuminance at closest distance with full intensity
        max_illuminance_at_min_distance = skypanel_data[diffusion_type][min_distance][color_temp]
        
        print(f"Using max illuminance for {diffusion_type} at {min_distance}m: {max_illuminance_at_min_distance} lux")
        print(f"Required illuminance for camera settings: {required_illuminance} lux")
        
        # Check if we can achieve required illuminance at closest distance
        if required_illuminance > max_illuminance_at_min_distance:
            # Cannot achieve needed illuminance even at max intensity
            print(f"WARNING: Required illuminance {required_illuminance} > max available {max_illuminance_at_min_distance}")
            exposure_warning = "insufficient_light"
            return min_distance, 100.0, exposure_warning
        
        # Get ideal distance for 100% intensity
        # Apply a slight adjustment for each diffusion type to create more visible differences
        # This is a visual aid to help users see the impact of different diffusion types
        adjustment_factor = 1.0
        if diffusion_type == "Lite":
            adjustment_factor = 1.05  # Slightly further away for lite diffusion
        elif diffusion_type == "Heavy":
            adjustment_factor = 0.85  # Closer for heavy diffusion
        elif diffusion_type == "Intensifier":
            adjustment_factor = 1.2   # Further away for intensifier
            
        ideal_distance = min_distance * math.sqrt(max_illuminance_at_min_distance / required_illuminance) * adjustment_factor
        print(f"Auto-calculated ideal distance for {diffusion_type} at 100% intensity: {ideal_distance}m")
        
        # Check if distance is practical
        if ideal_distance > 15.0:
            # Too far, cap distance and adjust intensity
            ideal_distance = 15.0
            exposure_warning = "too_far"
            print(f"Capping distance at 15m for practicality")
            
            # Calculate required intensity at capped distance
            illuminance_at_distance = max_illuminance_at_min_distance * (min_distance / ideal_distance) ** 2
            intensity_percentage = (required_illuminance / illuminance_at_distance) * 100
            print(f"At {ideal_distance}m, requires {intensity_percentage}% intensity")
        else:
            # Distance is practical, check if we should reduce intensity or maintain 100%
            intensity_percentage = 100.0
            
            # Check if we can reduce intensity (for better flexibility)
            if ideal_distance < 3.0:
                # Close enough to reduce intensity
                preferred_distance = 3.0
                illuminance_at_preferred = max_illuminance_at_min_distance * (min_distance / preferred_distance) ** 2
                reduced_intensity = (required_illuminance / illuminance_at_preferred) * 100
                print(f"Checking if we can use 3m standard distance with reduced intensity: {reduced_intensity}%")
                
                # If reduced intensity is reasonable, use it
                if 20 <= reduced_intensity <= 80:
                    ideal_distance = preferred_distance
                    intensity_percentage = reduced_intensity
                    exposure_warning = None
                    print(f"Using standard 3m distance with {intensity_percentage}% intensity")
                else:
                    print(f"Keeping optimal distance of {ideal_distance}m with 100% intensity")
        
        # Ensure practical values
        ideal_distance = max(1.0, min(15.0, ideal_distance))
        intensity_percentage = max(10.0, min(100.0, intensity_percentage))
        
        # Additional check for exposure warnings
        if ideal_distance <= min_distance and intensity_percentage >= 95:
            exposure_warning = "insufficient_light"
        elif ideal_distance >= max_distance and intensity_percentage <= 20:
            exposure_warning = "too_much_light"
        
        return round(ideal_distance, 2), round(intensity_percentage, 1), exposure_warning

# Create the interpolation functions
interp_funcs = create_interpolation_functions()

@app.route('/')
def index():
    # Prepare light models, modifiers and color temps for the template
    light_models = list(light_data.keys())
    
    # Create nested structure of modifiers for each light model
    modifiers_by_model = {}
    color_temps_by_model = {}
    
    for model in light_models:
        modifiers_by_model[model] = list(light_data[model]["modifiers"].keys())
        color_temps_by_model[model] = light_data[model]["color_temps"]
    
    # Pass the data to the template
    return render_template('index.html', 
                          light_models=light_models,
                          modifiers_by_model=modifiers_by_model,
                          color_temps_by_model=color_temps_by_model)

@app.route('/calculate', methods=['POST'])
def calculate():
    try:
        # Get form data
        data = request.get_json()
        
        t_stop = float(data.get('t_stop', 2.8))
        iso = int(data.get('iso', 800))
        framerate = int(data.get('framerate', 24))
        light_model = data.get('light_model', 'ARRI SkyPanel S60-C')
        modifier_type = data.get('modifier_type', 'Standard')
        color_temp = data.get('color_temp', '5600K')
        calc_mode = data.get('calc_mode', 'Auto Calculate')
        
        print(f"Received request with light model: {light_model}, modifier type: {modifier_type}, color temp: {color_temp}")
        
        # Import the new calculator function
        from new_calculator import calculate_light_settings
        
        # Set preferred distance or intensity based on mode
        preferred_distance = None
        preferred_intensity = None
        
        if calc_mode == 'Specify Distance':
            preferred_distance = float(data.get('preferred_distance', 3.0))
        elif calc_mode == 'Specify Intensity':
            preferred_intensity = float(data.get('preferred_intensity', 70))
        
        # Calculate light settings using the new universal calculator
        distance, intensity, exposure_warning, calculation_mode_text = calculate_light_settings(
            t_stop, iso, framerate, 
            light_model, modifier_type, color_temp, light_data,
            preferred_distance=preferred_distance,
            preferred_intensity=preferred_intensity
        )
        
        # Prepare response
        response = {
            'distance': distance,
            'intensity': intensity,
            'exposure_warning': exposure_warning,
            'calculation_mode_text': calculation_mode_text,
            'modifier_type': modifier_type,
            'light_model': light_model,
            'camera_settings': {
                't_stop': t_stop,
                'iso': iso,
                'framerate': framerate
            }
        }
        
        # Add warning messages based on exposure_warning flag
        if exposure_warning == "insufficient_light":
            response['warning'] = "Warning: The calculated intensity exceeds 100%. The light has been set to maximum, but the subject may be underexposed."
        elif exposure_warning == "too_much_light":
            response['warning'] = "Note: The calculated intensity is very low. Consider using a higher T-stop or lower ISO to optimize your light usage."
        elif exposure_warning == "too_far":
            response['warning'] = "Note: The calculated distance is very far. The light has been limited to a practical distance and intensity adjusted."
        
        return jsonify(response)
    except Exception as e:
        print(f"Error calculating: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)