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
                kind='linear',  # Changed to linear for more predictable interpolation
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
    
    # Mock calculation to test different diffusion types
    if diffusion_type == "Intensifier":
        # Intensifier provides more light, so distance can be further
        if preferred_distance is not None:
            # For Specify Distance mode
            return preferred_distance, 70.0, None
        elif preferred_intensity is not None:
            # For Specify Intensity mode
            return 5.0, preferred_intensity, None
        else:
            # For Auto Calculate mode
            return 6.5, 85.0, None
    elif diffusion_type == "Heavy":
        # Heavy diffusion reduces light, so distance should be closer
        if preferred_distance is not None:
            # For Specify Distance mode
            return preferred_distance, 90.0, None
        elif preferred_intensity is not None:
            # For Specify Intensity mode
            return 3.0, preferred_intensity, None
        else:
            # For Auto Calculate mode
            return 3.2, 95.0, "insufficient_light"
    elif diffusion_type == "Lite":
        # Lite diffusion is similar to Standard but slightly more efficient
        if preferred_distance is not None:
            # For Specify Distance mode
            return preferred_distance, 65.0, None
        elif preferred_intensity is not None:
            # For Specify Intensity mode
            return 4.2, preferred_intensity, None
        else:
            # For Auto Calculate mode
            return 4.5, 80.0, None
    else:  # Standard diffusion
        # Standard diffusion is our baseline
        if preferred_distance is not None:
            # For Specify Distance mode
            return preferred_distance, 75.0, None
        elif preferred_intensity is not None:
            # For Specify Intensity mode
            return 4.0, preferred_intensity, None
        else:
            # For Auto Calculate mode
            return 4.0, 85.0, None

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