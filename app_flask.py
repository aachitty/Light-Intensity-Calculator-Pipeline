from flask import Flask, render_template, request, jsonify
import math
import numpy as np
from scipy import interpolate

app = Flask(__name__)

# SkyPanel S60-C photometric data
skypanel_data = {
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
}

# Create intensity interpolation functions for each diffusion and color temperature
def create_interpolation_functions():
    interp_funcs = {}
    
    for diffusion in skypanel_data:
        interp_funcs[diffusion] = {}
        
        for cct in ["3200K", "5600K"]:
            distances = []
            illuminances = []
            
            for distance, cct_values in skypanel_data[diffusion].items():
                distances.append(distance)
                illuminances.append(cct_values[cct])
            
            # Convert lists to numpy arrays for interpolation
            distances = np.array(distances)
            illuminances = np.array(illuminances)
            
            # Create interpolation function (using inverse square law relationship)
            # We'll interpolate distance -> illuminance
            interp_funcs[diffusion][cct] = interpolate.interp1d(
                distances, 
                illuminances, 
                kind='quadratic',
                bounds_error=False,
                fill_value=(illuminances[0], illuminances[-1])
            )
    
    return interp_funcs

# Create reverse interpolation for illuminance -> distance
def get_distance_for_illuminance(illuminance, diffusion, color_temp, interp_funcs):
    # Get the measured distances and corresponding illuminances
    distances = list(skypanel_data[diffusion].keys())
    illuminances = [skypanel_data[diffusion][d][color_temp] for d in distances]
    
    # We don't use the interpolation function directly here because we need the inverse
    # relationship. Instead, we'll use the inverse square law to estimate distance
    
    # First, let's find the closest measured points
    distances = np.array(distances)
    illuminances = np.array(illuminances)
    
    # Ensure we're within the reasonable range of our data
    max_illuminance = max(illuminances)
    min_illuminance = min(illuminances)
    
    if illuminance > max_illuminance:
        # If we need more light than available at the closest distance, we need to increase intensity
        return min(distances), illuminance / max_illuminance * 100
    
    if illuminance < min_illuminance:
        # If we need less light than available at the farthest distance, we need to decrease intensity
        return max(distances), illuminance / min_illuminance * 100
    
    # For values within our measurement range, we'll use inverse square law interpolation
    # Find the reference point with closest illuminance
    idx = np.abs(illuminances - illuminance).argmin()
    ref_distance = distances[idx]
    ref_illuminance = illuminances[idx]
    
    # Use inverse square law: illuminance ∝ 1/distance²
    # If ref_illuminance is at ref_distance, then illuminance should be at:
    calculated_distance = ref_distance * math.sqrt(ref_illuminance / illuminance)
    
    # Ensure minimum distance is 1 meter
    calculated_distance = max(1.0, calculated_distance)
    
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
    
    # Get the reference illuminance at 3 meters (a middle value from our data)
    reference_distance = 3.0
    reference_illuminance = skypanel_data[diffusion_type][int(reference_distance)][color_temp]
    
    # Convert lux to foot-candles (1 lux = 0.0929 fc)
    reference_fc = reference_illuminance * 0.0929
    
    # Calculate required illuminance
    required_fc = reference_fc * illuminance_factor
    
    # Convert back to lux for our calculations (1 fc = 10.764 lux)
    required_illuminance = required_fc * 10.764
    
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
    
    # ---------------------------------------------------------------------------
    # Mode 1: Preferred Distance specified - calculate intensity at that distance
    # ---------------------------------------------------------------------------
    if preferred_distance is not None:
        # Check if distance is within our data range
        if preferred_distance < min_distance:
            # Extrapolate using inverse square law from closest measurement
            ref_illuminance = skypanel_data[diffusion_type][min_distance][color_temp]
            illuminance_at_preferred = ref_illuminance * (min_distance / preferred_distance) ** 2
        elif preferred_distance > max_distance:
            # Extrapolate using inverse square law from farthest measurement
            ref_illuminance = skypanel_data[diffusion_type][max_distance][color_temp]
            illuminance_at_preferred = ref_illuminance * (max_distance / preferred_distance) ** 2
        else:
            # Find the two closest distances in our data
            lower_distance = max([d for d in distances if d <= preferred_distance])
            upper_distance = min([d for d in distances if d >= preferred_distance])
            
            # If we've found an exact match
            if lower_distance == upper_distance:
                illuminance_at_preferred = skypanel_data[diffusion_type][lower_distance][color_temp]
            else:
                # Linear interpolation between the two closest points
                lower_illuminance = skypanel_data[diffusion_type][lower_distance][color_temp]
                upper_illuminance = skypanel_data[diffusion_type][upper_distance][color_temp]
                
                # Calculate the interpolation factor
                alpha = (preferred_distance - lower_distance) / (upper_distance - lower_distance)
                
                # Linear interpolation
                illuminance_at_preferred = lower_illuminance + alpha * (upper_illuminance - lower_illuminance)
        
        # Calculate required intensity percentage
        intensity_percentage = (required_illuminance / illuminance_at_preferred) * 100
        
        # Check exposure conditions
        if intensity_percentage > 100:
            exposure_warning = "insufficient_light"
            intensity_percentage = 100.0  # Cap at maximum
        elif intensity_percentage < 10:
            exposure_warning = "too_much_light"
            intensity_percentage = 10.0  # Enforce minimum
        
        return preferred_distance, round(intensity_percentage, 1), exposure_warning
    
    # ---------------------------------------------------------------------------
    # Mode 2: Preferred Intensity specified - calculate distance for that intensity
    # ---------------------------------------------------------------------------
    elif preferred_intensity is not None:
        # Get max illuminance at closest distance with full intensity
        max_illuminance_at_min_distance = skypanel_data[diffusion_type][min_distance][color_temp]
        
        # Adjust for the preferred intensity
        achievable_illuminance = (preferred_intensity / 100) * max_illuminance_at_min_distance
        
        # If we cannot achieve the required illuminance even at the closest distance
        if achievable_illuminance < required_illuminance and preferred_intensity >= 99:
            exposure_warning = "insufficient_light"
            return min_distance, 100.0, exposure_warning
        
        # Calculate the ideal distance using inverse square law
        # If distance₁ gives illuminance₁, then distance₂ for illuminance₂ is:
        # distance₂ = distance₁ * sqrt(illuminance₁ / illuminance₂)
        ideal_distance = min_distance * math.sqrt(achievable_illuminance / required_illuminance)
        
        # Check if distance is too far
        if ideal_distance > 15.0:
            exposure_warning = "too_far"
            ideal_distance = 15.0  # Cap at maximum practical distance
        
        # Ensure minimum distance of 1 meter
        ideal_distance = max(1.0, ideal_distance)
        
        return round(ideal_distance, 2), preferred_intensity, exposure_warning
    
    # ---------------------------------------------------------------------------
    # Mode 3: Auto calculation - find best distance and intensity combination
    # ---------------------------------------------------------------------------
    else:
        # Get max illuminance at closest distance with full intensity
        max_illuminance_at_min_distance = skypanel_data[diffusion_type][min_distance][color_temp]
        
        # If we cannot achieve the required illuminance even at the closest distance
        if required_illuminance > max_illuminance_at_min_distance:
            exposure_warning = "insufficient_light"
            return min_distance, 100.0, exposure_warning
        
        # Get ideal distance for 100% intensity
        ideal_distance = min_distance * math.sqrt(max_illuminance_at_min_distance / required_illuminance)
        
        # Check if distance is practical
        if ideal_distance > 15.0:
            # Distance is too far, cap it and adjust intensity
            ideal_distance = 15.0
            exposure_warning = "too_far"
            
            # Calculate required intensity at this capped distance
            illuminance_at_distance = max_illuminance_at_min_distance * (min_distance / ideal_distance) ** 2
            intensity_percentage = (required_illuminance / illuminance_at_distance) * 100
        else:
            # Distance is practical, use 100% intensity
            intensity_percentage = 100.0
            
            # Check if we can reduce intensity (to allow for future increases if needed)
            if ideal_distance < 3.0:
                # We're close enough that we can probably reduce intensity
                # Calculate the ideal intensity at 3.0 meters
                illuminance_at_3m = max_illuminance_at_min_distance * (min_distance / 3.0) ** 2
                reduced_intensity = (required_illuminance / illuminance_at_3m) * 100
                
                # If we can use a reasonable intensity at 3.0 meters, do so
                if 20 <= reduced_intensity <= 80:
                    ideal_distance = 3.0
                    intensity_percentage = reduced_intensity
                    
                    # No warning needed, this is a good balance
                    exposure_warning = None
        
        # Ensure values are in practical ranges
        ideal_distance = max(1.0, ideal_distance)
        intensity_percentage = max(10.0, min(100.0, intensity_percentage))
        
        return round(ideal_distance, 2), round(intensity_percentage, 1), exposure_warning

# Create the interpolation functions
interp_funcs = create_interpolation_functions()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calculate', methods=['POST'])
def calculate():
    # Get form data
    data = request.get_json()
    
    t_stop = float(data.get('t_stop', 2.8))
    iso = int(data.get('iso', 800))
    framerate = int(data.get('framerate', 24))
    diffusion = data.get('diffusion', 'Standard')
    color_temp = data.get('color_temp', '5600K')
    calc_mode = data.get('calc_mode', 'Auto Calculate')
    
    # Set preferred distance or intensity based on mode
    preferred_distance = None
    preferred_intensity = None
    
    if calc_mode == 'Specify Distance':
        preferred_distance = float(data.get('preferred_distance', 3.0))
    elif calc_mode == 'Specify Intensity':
        preferred_intensity = float(data.get('preferred_intensity', 70))
    
    # Calculate light settings
    distance, intensity, exposure_warning = calculate_light_settings_skypanels60(
        t_stop, iso, framerate, diffusion, color_temp, interp_funcs,
        preferred_distance, preferred_intensity
    )
    
    # Prepare response
    response = {
        'distance': distance,
        'intensity': intensity,
        'exposure_warning': exposure_warning,
        'calculation_mode_text': ''
    }
    
    if calc_mode == 'Specify Distance':
        response['calculation_mode_text'] = f"at your specified distance of {preferred_distance} meters"
    elif calc_mode == 'Specify Intensity':
        response['calculation_mode_text'] = f"at your specified intensity of {preferred_intensity}%"
    else:
        response['calculation_mode_text'] = "with automatically optimized settings"
    
    return jsonify(response)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)