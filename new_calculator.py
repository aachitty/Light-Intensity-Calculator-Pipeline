import math
import numpy as np
from scipy import interpolate

def calculate_light_settings(desired_t_stop, input_iso, input_framerate, 
                             light_model, modifier_type, color_temp, light_data,
                             preferred_distance=None, preferred_intensity=None):
    """
    Calculate light settings based on camera parameters and preferred constraints for any light model.
    
    Args:
        desired_t_stop: The T-stop setting on the camera
        input_iso: The ISO setting on the camera
        input_framerate: The framerate setting on the camera
        light_model: The specific light fixture model to use
        modifier_type: The type of diffusion or beam angle modifier used on the light
        color_temp: The color temperature of the light
        light_data: The comprehensive light data dictionary
        preferred_distance: If specified, calculate intensity at this distance
        preferred_intensity: If specified, calculate distance at this intensity
        
    Returns:
        Tuple of (distance, intensity_percentage, exposure_warning, calculation_mode_text)
    """
    print(f"Using light model: {light_model}, modifier: {modifier_type}, color temp: {color_temp}")
    
    # Check if all selections are valid
    if light_model not in light_data:
        print(f"Warning: Invalid light model '{light_model}', defaulting to 'ARRI SkyPanel S60-C'")
        light_model = "ARRI SkyPanel S60-C"
    
    if modifier_type not in light_data[light_model]["modifiers"]:
        print(f"Warning: Invalid modifier '{modifier_type}' for {light_model}, using default")
        modifier_type = list(light_data[light_model]["modifiers"].keys())[0]
        
    if color_temp not in light_data[light_model]["color_temps"]:
        print(f"Warning: Invalid color temp '{color_temp}' for {light_model}, using default")
        color_temp = light_data[light_model]["color_temps"][0]
    
    # Get the light's maximum output value
    max_output = light_data[light_model]["max_output"]
    
    # Get data points for this specific configuration
    modifier_data = light_data[light_model]["modifiers"][modifier_type]
    
    # Extract distance and illuminance values for the selected color temperature
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
    
    # Get range values
    min_distance = min(distances)
    max_distance = max(distances)
    min_illuminance = min(illuminances)
    max_illuminance = max(illuminances)
    
    print(f"Distance range: {min_distance}m - {max_distance}m")
    print(f"Illuminance range: {min_illuminance} - {max_illuminance} lux")
    
    # Reference camera settings (base exposure)
    REFERENCE_T_STOP = 4.0      # A common middle T-stop
    REFERENCE_ISO = 800         # Standard cinema camera ISO
    REFERENCE_FRAMERATE = 24    # Film standard framerate
    REFERENCE_SHUTTER = 180     # 180-degree shutter angle
    
    # Calculate exposure time based on framerate and 180° shutter angle
    # Exposure time (in seconds) = (1/framerate) * (shutter_angle/360)
    exposure_time = (1/input_framerate) * (180/360)
    reference_exposure_time = (1/REFERENCE_FRAMERATE) * (180/360)
    
    # Using the formula FC = (25 * f²) / (exp * ISO) and its rearrangements
    illuminance_factor = (
        (desired_t_stop**2 * reference_exposure_time * REFERENCE_ISO) /
        (REFERENCE_T_STOP**2 * exposure_time * input_iso)
    )
    print(f"Illuminance factor based on camera settings: {illuminance_factor}")
    
    # Get the reference illuminance at the middle distance
    middle_idx = len(distances) // 2
    reference_distance = distances[middle_idx]
    reference_illuminance = illuminances[middle_idx]
    print(f"Reference illuminance for {modifier_type} at {reference_distance}m: {reference_illuminance} lux")
    
    # Convert lux to foot-candles for the formula (1 lux = 0.0929 fc)
    reference_fc = reference_illuminance * 0.0929
    
    # Calculate required illuminance
    required_fc = reference_fc * illuminance_factor
    
    # Convert back to lux for our calculations (1 fc = 10.764 lux)
    required_illuminance = required_fc * 10.764
    print(f"Required illuminance: {required_illuminance} lux")
    
    # Initialize exposure warning and calculation mode text
    exposure_warning = None
    calculation_mode_text = ""
    
    # Full calculation based on camera settings and photometric data
    if preferred_distance is not None:
        # Mode 1: Calculate intensity at specified distance
        calculation_mode_text = f"at your specified distance of {preferred_distance} meters"
        
        print(f"Calculating illuminance at {preferred_distance}m")
        # Determine illuminance at the preferred distance
        if preferred_distance < min_distance:
            # Extrapolate using inverse square law from closest measurement
            ref_illuminance = modifier_data[min_distance][color_temp]
            illuminance_at_preferred = ref_illuminance * (min_distance / preferred_distance) ** 2
            print(f"Extrapolating below measured range: {illuminance_at_preferred}")
        elif preferred_distance > max_distance:
            # Extrapolate using inverse square law from farthest measurement
            ref_illuminance = modifier_data[max_distance][color_temp]
            illuminance_at_preferred = ref_illuminance * (max_distance / preferred_distance) ** 2
            print(f"Extrapolating above measured range: {illuminance_at_preferred}")
        else:
            # Find the two closest distances in our data
            lower_distance = max([d for d in distances if d <= preferred_distance])
            upper_distance = min([d for d in distances if d >= preferred_distance])
            
            # If exact match
            if lower_distance == upper_distance:
                illuminance_at_preferred = modifier_data[lower_distance][color_temp]
                print(f"Exact match at {lower_distance}m: {illuminance_at_preferred}")
            else:
                # Linear interpolation between two closest points
                lower_illuminance = modifier_data[lower_distance][color_temp]
                upper_illuminance = modifier_data[upper_distance][color_temp]
                
                # Calculate interpolation factor
                alpha = (preferred_distance - lower_distance) / (upper_distance - lower_distance)
                
                # Linear interpolation
                illuminance_at_preferred = lower_illuminance + alpha * (upper_illuminance - lower_illuminance)
                print(f"Interpolating between points: {illuminance_at_preferred}")
        
        # Calculate intensity percentage based on the illuminance available at the preferred distance
        intensity_percentage = (required_illuminance / illuminance_at_preferred) * 100
        print(f"Required illuminance: {required_illuminance} lux")
        print(f"Available illuminance at {preferred_distance}m: {illuminance_at_preferred} lux")
        print(f"Calculated intensity: {intensity_percentage}%")
        
        # Check exposure conditions
        if intensity_percentage > 100:
            exposure_warning = "insufficient_light"
            intensity_percentage = 100.0  # Cap at maximum
        elif intensity_percentage < 10:
            exposure_warning = "too_much_light"
            intensity_percentage = 10.0  # Enforce minimum
        
        return preferred_distance, round(intensity_percentage, 2), exposure_warning, calculation_mode_text
        
    elif preferred_intensity is not None:
        # Mode 2: Calculate distance for specified intensity
        calculation_mode_text = f"at your specified intensity of {preferred_intensity}%"
        
        # Get max illuminance at closest distance with full intensity
        max_illuminance_at_min_distance = modifier_data[min_distance][color_temp]
        
        # Adjust for the preferred intensity - how much light can we get at the closest distance?
        achievable_illuminance = (preferred_intensity / 100) * max_illuminance_at_min_distance
        print(f"Max illuminance at {min_distance}m with 100%: {max_illuminance_at_min_distance} lux")
        print(f"Achievable illuminance at {preferred_intensity}%: {achievable_illuminance} lux")
        
        # If we cannot achieve the required illuminance
        if achievable_illuminance < required_illuminance and preferred_intensity >= 99:
            print(f"Cannot achieve required illuminance even at max intensity")
            exposure_warning = "insufficient_light"
            return min_distance, 100.0, exposure_warning, calculation_mode_text
        
        # Calculate ideal distance using inverse square law
        # distance₂ = distance₁ * sqrt(illuminance₁ / illuminance₂)
        ideal_distance = min_distance * math.sqrt(achievable_illuminance / required_illuminance)
        print(f"Calculated distance at {preferred_intensity}%: {ideal_distance}m")
        
        # Check if distance is too far (typical studio limit)
        max_practical_distance = 15.0
        if ideal_distance > max_practical_distance:
            exposure_warning = "too_far"
            ideal_distance = max_practical_distance  # Cap at practical maximum
        
        # Ensure minimum distance is appropriate for this light
        ideal_distance = max(min_distance, ideal_distance)
        
        return round(ideal_distance, 2), preferred_intensity, exposure_warning, calculation_mode_text
        
    else:
        # Mode 3: Auto calculate - find best combination
        calculation_mode_text = "with automatically optimized settings"
        
        # Get max illuminance at closest distance with full intensity
        max_illuminance_at_min_distance = modifier_data[min_distance][color_temp]
        
        print(f"Max illuminance at {min_distance}m: {max_illuminance_at_min_distance} lux")
        
        # Check if we can achieve required illuminance at closest distance
        if required_illuminance > max_illuminance_at_min_distance:
            # Cannot achieve needed illuminance even at max intensity
            print(f"WARNING: Required illuminance exceeds maximum available")
            exposure_warning = "insufficient_light"
            return min_distance, 100.0, exposure_warning, calculation_mode_text
        
        # Calculate ideal distance for 100% intensity
        ideal_distance = min_distance * math.sqrt(max_illuminance_at_min_distance / required_illuminance)
        print(f"Auto-calculated ideal distance at 100% intensity: {ideal_distance}m")
        
        # Check if distance is practical
        max_practical_distance = 15.0
        if ideal_distance > max_practical_distance:
            # Too far, cap distance and adjust intensity
            ideal_distance = max_practical_distance
            exposure_warning = "too_far"
            print(f"Capping distance at {max_practical_distance}m for practicality")
            
            # Calculate required intensity at capped distance
            illuminance_at_distance = max_illuminance_at_min_distance * (min_distance / ideal_distance) ** 2
            intensity_percentage = (required_illuminance / illuminance_at_distance) * 100
            print(f"At {ideal_distance}m, requires {intensity_percentage}% intensity")
        else:
            # Distance is practical, check if we should reduce intensity or maintain 100%
            intensity_percentage = 100.0
            
            # Check if we can reduce intensity (for better flexibility)
            if ideal_distance < 3.0 and min_distance <= 3.0:
                # Close enough to reduce intensity
                preferred_distance = 3.0
                illuminance_at_preferred = max_illuminance_at_min_distance * (min_distance / preferred_distance) ** 2
                reduced_intensity = (required_illuminance / illuminance_at_preferred) * 100
                print(f"Checking if we can use 3m standard distance with reduced intensity: {reduced_intensity}%")
                
                # If reduced intensity is reasonable, use it
                if 20 <= reduced_intensity <= 80:
                    ideal_distance = preferred_distance
                    intensity_percentage = reduced_intensity
                    print(f"Using standard 3m distance with {intensity_percentage}% intensity")
        
        return round(ideal_distance, 2), round(intensity_percentage, 2), exposure_warning, calculation_mode_text