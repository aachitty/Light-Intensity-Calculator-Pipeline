import streamlit as st
import math
import numpy as np
from scipy import interpolate
import time  # For adding timestamp to force recalculation
import sys  # For flush to ensure print statements display immediately

# Page configuration
st.set_page_config(
    page_title="Cinematographer's Light Calculator",
    page_icon="🎬",
    layout="centered",
    initial_sidebar_state="collapsed"
)

# Add a title and description
st.title("Cinematographer's Light Calculator")
st.subheader("ARRI SkyPanel S60-C Light Calculator")

st.write("""
This tool helps cinematographers calculate the optimal light placement and intensity
for achieving desired exposure settings. Enter your camera parameters below to get 
precise light setup recommendations based on actual ARRI SkyPanel S60-C photometric data.
""")

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
    # Print debug info to help diagnose the issue
    print(f"Using diffusion type: {diffusion_type}", flush=True)
    
    # Ensure we have a valid diffusion type
    if diffusion_type not in skypanel_data:
        print(f"Warning: Invalid diffusion type '{diffusion_type}', defaulting to 'Standard'", flush=True)
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
try:
    interp_funcs = create_interpolation_functions()
except Exception as e:
    st.error(f"Error initializing interpolation functions: {str(e)}")
    st.stop()

# Initialize session state
if 'first_load' not in st.session_state:
    st.session_state.first_load = True
    st.session_state.diffusion = "Standard"
    st.session_state.color_temp = "5600K"
    st.session_state.t_stop = 2.8
    st.session_state.iso = 800
    st.session_state.framerate = 24
    st.session_state.calc_mode = "Auto Calculate"
    st.session_state.preferred_distance = 3.0
    st.session_state.preferred_intensity = 70
    st.session_state.t_stop_input_method = "Standard Values"

# Callback functions for diffusion and color temperature changes
def on_diffusion_change():
    st.session_state.diffusion_changed = True
    st.session_state.diffusion = st.session_state.diffusion_type
    
def on_color_temp_change():
    st.session_state.color_temp_changed = True
    st.session_state.color_temp = st.session_state.color_temp_select

# Create input widgets outside the form to detect changes
st.subheader("Camera Settings")

# Create three columns for input fields
col1, col2, col3 = st.columns(3)

with col1:
    # T-stop input method selection
    t_stop_input_method = st.radio(
        "T-Stop Input Method", 
        ["Standard Values", "Custom Value"],
        horizontal=True,
        key="t_stop_method"
    )
    
    if t_stop_input_method == "Standard Values":
        # Standard T-stop values used in cinematography
        t_stop_options = [1.4, 2.0, 2.8, 4.0, 5.6, 8.0, 11.0, 16.0, 22.0, 32.0]
        t_stop = st.selectbox(
            "T-Stop",
            options=t_stop_options,
            index=2,  # Default to 2.8
            help="Standard T-stops used in cinematography",
            key="t_stop_select"
        )
    else:
        # Custom T-stop input
        t_stop = st.number_input(
            "Custom T-Stop",
            min_value=0.8,
            max_value=32.0,
            value=2.8,
            step=0.1,
            format="%.1f",
            help="Enter a custom T-stop value for specialty lenses",
            key="t_stop_custom"
        )

with col2:
    iso = st.number_input(
        "ISO",
        min_value=50,
        max_value=25600,
        value=800,
        step=50,
        help="Common ISOs: 100, 200, 400, 800, 1600, 3200",
        key="iso_input"
    )

with col3:
    framerate = st.number_input(
        "Framerate (fps)",
        min_value=12,
        max_value=300,
        value=24,
        step=1,
        help="Standard framerates: 24 (film), 25 (PAL), 30 (NTSC), 60 (high speed)",
        key="framerate_input"
    )

st.subheader("Light Settings")
col1, col2 = st.columns(2)

# Add a key with timestamp to force re-render
timestamp = int(time.time() * 1000)

# Get the index of the last diffusion if it exists
diffusion_index = 0  # Default to Standard
if 'last_diffusion' in st.session_state:
    if st.session_state.last_diffusion == "Standard":
        diffusion_index = 0
    elif st.session_state.last_diffusion == "Lite":
        diffusion_index = 1
    elif st.session_state.last_diffusion == "Heavy":
        diffusion_index = 2
    elif st.session_state.last_diffusion == "Intensifier":
        diffusion_index = 3

# Get the index of the last color temp if it exists
color_temp_index = 1  # Default to 5600K
if 'last_color_temp' in st.session_state:
    if st.session_state.last_color_temp == "3200K":
        color_temp_index = 0
    elif st.session_state.last_color_temp == "5600K":
        color_temp_index = 1

with col1:
    # Create a callback for diffusion type changes
    if "diffusion_type" not in st.session_state:
        st.session_state.diffusion_type = ["Standard", "Lite", "Heavy", "Intensifier"][diffusion_index]
        
    def on_diffusion_change():
        # This will be called when the diffusion type changes
        # Store the old and new values to check for changes
        old_diffusion = st.session_state.get("last_diffusion", "Standard")
        new_diffusion = st.session_state.diffusion_type
        st.session_state.diffusion_changed = old_diffusion != new_diffusion
        
    diffusion = st.selectbox(
        "Diffusion Type",
        options=["Standard", "Lite", "Heavy", "Intensifier"],
        index=diffusion_index,  # Use remembered value
        help="Different diffusion panels affect light intensity and quality",
        key="diffusion_type",
        on_change=on_diffusion_change
    )

with col2:
    # Create a callback for color temperature changes
    if "color_temp_select" not in st.session_state:
        st.session_state.color_temp_select = ["3200K", "5600K"][color_temp_index]
        
    def on_color_temp_change():
        # This will be called when the color temp changes
        old_color_temp = st.session_state.get("last_color_temp", "5600K")
        new_color_temp = st.session_state.color_temp_select
        st.session_state.color_temp_changed = old_color_temp != new_color_temp
    
    color_temp = st.selectbox(
        "Color Temperature",
        options=["3200K", "5600K"],
        index=color_temp_index,  # Use remembered value
        help="3200K (tungsten) or 5600K (daylight)",
        key="color_temp_select",
        on_change=on_color_temp_change
    )

# Calculation Mode Selection
st.subheader("Calculation Mode")
calc_mode = st.radio(
    "Choose calculation mode:",
    ["Auto Calculate", "Specify Distance", "Specify Intensity"],
    index=0,
    help="Auto calculates optimal values, or you can specify your preferred distance or intensity",
    key="calc_mode_select"
)

# Based on mode selection, show additional fields
preferred_distance = None
preferred_intensity = None

if calc_mode == "Specify Distance":
    preferred_distance = st.slider(
        "Preferred Distance (meters)",
        min_value=1.0,
        max_value=10.0,
        value=3.0,
        step=0.1,
        help="The calculator will determine the required light intensity at this distance",
        key="distance_slider"
    )
elif calc_mode == "Specify Intensity":
    preferred_intensity = st.slider(
        "Preferred Intensity (%)",
        min_value=10,
        max_value=100,
        value=70,
        step=1,
        help="The calculator will determine the required distance at this intensity",
        key="intensity_slider"
    )

# Calculate button
calculate_button = st.button("Calculate Light Settings")

# Check if any setting has changed or Calculate button pressed, then recalculate
# Use the on_change flags when available to detect real changes
diffusion_changed = st.session_state.get("diffusion_changed", False)
color_temp_changed = st.session_state.get("color_temp_changed", False)

# Traditional change detection as backup
has_diffusion_changed = diffusion_changed or 'last_diffusion' not in st.session_state or st.session_state.last_diffusion != diffusion
has_color_temp_changed = color_temp_changed or 'last_color_temp' not in st.session_state or st.session_state.last_color_temp != color_temp
has_t_stop_changed = 'last_t_stop' not in st.session_state or st.session_state.last_t_stop != t_stop
has_iso_changed = 'last_iso' not in st.session_state or st.session_state.last_iso != iso
has_framerate_changed = 'last_framerate' not in st.session_state or st.session_state.last_framerate != framerate
has_calc_mode_changed = 'last_calc_mode' not in st.session_state or st.session_state.last_calc_mode != calc_mode

# Debug flagging for changes
if has_diffusion_changed:
    st.session_state.debug_diffusion = f"Changed from {st.session_state.get('last_diffusion', 'None')} to {diffusion}"

# Add debug info to help see what's happening with the diffusion selector
if 'debug_diffusion' in st.session_state:
    st.write(f"Debug: {st.session_state.debug_diffusion}")
    
# Reset change flags
if diffusion_changed:
    st.session_state.diffusion_changed = False
if color_temp_changed:
    st.session_state.color_temp_changed = False

# Force recalculation every time by adding the current timestamp
force_recalculate = True  # Always recalculate when any widget changes

# Automatically recalculate when diffusion or color temp changes, or when Calculate button is pressed
if calculate_button or has_diffusion_changed or has_color_temp_changed or has_t_stop_changed or has_iso_changed or has_framerate_changed or has_calc_mode_changed or force_recalculate:
    try:
        # Pass preferred settings based on calculation mode
        preferred_distance_arg = None
        preferred_intensity_arg = None
        
        if calc_mode == "Specify Distance":
            preferred_distance_arg = preferred_distance
            calculation_mode_text = f"at your specified distance of {preferred_distance} meters"
        elif calc_mode == "Specify Intensity":
            preferred_intensity_arg = preferred_intensity
            calculation_mode_text = f"at your specified intensity of {preferred_intensity}%"
        else:
            calculation_mode_text = "with automatically optimized settings"
        
        # Print for debug
        print(f"Calculating with diffusion: {diffusion}", flush=True)
        
        # Store input parameters to detect changes BEFORE calculation
        st.session_state.last_t_stop = t_stop
        st.session_state.last_iso = iso
        st.session_state.last_framerate = framerate
        st.session_state.last_diffusion = diffusion
        st.session_state.last_color_temp = color_temp
        st.session_state.last_calc_mode = calc_mode
        
        # Calculate the light settings
        distance, intensity, exposure_warning = calculate_light_settings_skypanels60(
            t_stop, iso, framerate, diffusion, color_temp, interp_funcs,
            preferred_distance_arg, preferred_intensity_arg
        )
        
        # Store calculation results in session state (for display purposes only)
        st.session_state.distance = distance
        st.session_state.intensity = intensity
        st.session_state.calc_mode = calc_mode
        st.session_state.exposure_warning = exposure_warning
        
        # Remove this duplicate parameter storage block - they're already stored above
        if calc_mode == "Specify Distance":
            st.session_state.last_preferred_distance = preferred_distance
        elif calc_mode == "Specify Intensity":
            st.session_state.last_preferred_intensity = preferred_intensity
        
        # Display results in a nice format
        st.markdown("---")
        st.subheader("Results")
        
        # Create columns for the results display
        col1, col2 = st.columns(2)
        
        with col1:
            st.metric(
                label="Light Distance",
                value=f"{distance} m",
                delta=None
            )
            st.caption("Distance from subject to light")
            
        with col2:
            st.metric(
                label="Light Intensity",
                value=f"{intensity}%",
                delta=None
            )
            st.caption("Percentage of maximum output")
        
        # Display exposure warnings if present
        if exposure_warning == "insufficient_light":
            st.warning("""
            **Underexposure Warning**: The calculated settings may result in underexposure.
            
            Consider one or more of these solutions:
            - Use a higher ISO setting
            - Use a wider aperture (lower T-stop)
            - Use the Intensifier diffusion panel
            - Add additional lights
            - Move the light closer to the subject
            """)
        elif exposure_warning == "too_much_light":
            st.warning("""
            **Overexposure Warning**: The calculated settings may result in overexposure.
            
            Consider one or more of these solutions:
            - Use a lower ISO setting
            - Use a narrower aperture (higher T-stop)
            - Use the Heavy diffusion panel
            - Move the light farther from the subject
            - Use additional diffusion or ND filters
            """)
        elif exposure_warning == "too_far":
            st.warning("""
            **Practical Range Warning**: The calculated distance exceeds practical range.
            
            The light has been placed at 15 meters (maximum recommended distance), but the intensity
            may still need to be adjusted for proper exposure. Consider the following solutions:
            - Use a higher ISO setting
            - Use a wider aperture (lower T-stop)
            - Use the Intensifier diffusion panel
            """)
            
        # Add explanatory text
        st.markdown(f"""
        ### Interpretation
        
        To expose your subject at T-{t_stop} with ISO {iso} and {framerate} fps using {diffusion} diffusion at {color_temp} {calculation_mode_text}:
        
        1. Position your ARRI SkyPanel S60-C **{distance} meters** from the subject
        2. Set the light intensity to **{intensity}%** of maximum output
        
        These settings will provide proper exposure based on actual photometric data from the ARRI SkyPanel S60-C and the inverse square law.
        """)
        
        # Add notes about limitations
        st.info("""
        **Note:** This calculator assumes:
        - 180° shutter angle
        - A single key light setup
        - Calculations based on measured photometric data from ARRI
        - Inverse square law for distance interpolation
        
        Adjust your final settings based on artistic intent and practical considerations.
        """)
        
    except Exception as e:
        st.error(f"An error occurred in the calculation: {str(e)}")
        st.error("Please check your input values and try again.")

# Add instructional footer
st.markdown("---")
st.caption("© 2023 Cinematographer's Light Calculator | ARRI SkyPanel S60-C Reference Tool")
