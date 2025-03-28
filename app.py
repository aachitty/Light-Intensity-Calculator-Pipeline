import streamlit as st
import math
import numpy as np
from scipy import interpolate

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

def calculate_light_settings_skypanels60(desired_t_stop, input_iso, input_framerate, diffusion, color_temp, interp_funcs, 
                                 preferred_distance=None, preferred_intensity=None):
    """
    Calculate light settings based on camera parameters and preferred constraints.
    
    Args:
        desired_t_stop: The T-stop setting on the camera
        input_iso: The ISO setting on the camera
        input_framerate: The framerate setting on the camera
        diffusion: The type of diffusion used on the light
        color_temp: The color temperature of the light
        interp_funcs: Interpolation functions for the light data
        preferred_distance: If specified, calculate intensity at this distance
        preferred_intensity: If specified, calculate distance at this intensity
        
    Returns:
        Tuple of (distance, intensity_percentage, exposure_warning)
    """
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
    # Where:
    # - FC is foot-candles (illuminance)
    # - f is the f-stop number (T-stop in our case)
    # - exp is the exposure time in seconds
    # - ISO is the ISO sensitivity
    #
    # For our calculation, we need to determine the ratio between our settings and reference settings
    # to adjust the illuminance required
    
    # For reference settings, FC_ref = (25 * REFERENCE_T_STOP²) / (reference_exp_time * REFERENCE_ISO)
    # For input settings, FC_input = (25 * desired_t_stop²) / (exposure_time * input_ISO)
    
    # The ratio FC_input / FC_ref gives us our adjustment factor using the formula:
    # FC = (25 * f²) / (exp * ISO)
    # 
    # If we have two different camera settings, then:
    # FC_input / FC_ref = ((25 * desired_t_stop²) / (exposure_time * input_ISO)) / ((25 * REFERENCE_T_STOP²) / (reference_exposure_time * REFERENCE_ISO))
    # 
    # Simplifying:
    # FC_input / FC_ref = (desired_t_stop² * reference_exposure_time * REFERENCE_ISO) / (REFERENCE_T_STOP² * exposure_time * input_ISO)
    illuminance_factor = (
        (desired_t_stop**2 * reference_exposure_time * REFERENCE_ISO) /
        (REFERENCE_T_STOP**2 * exposure_time * input_iso)
    )
    
    # Get the reference illuminance at 3 meters (a middle value from our data)
    reference_distance = 3.0
    reference_illuminance = skypanel_data[diffusion][int(reference_distance)][color_temp]
    
    # Convert lux to foot-candles (1 lux = 0.0929 fc)
    reference_fc = reference_illuminance * 0.0929
    
    # Calculate required illuminance based on the formula FC = (25 * f²) / (exp * ISO)
    # We use illuminance_factor to adjust our reference value
    required_fc = reference_fc * illuminance_factor
    
    # Convert back to lux for our calculations (1 fc = 10.764 lux)
    required_illuminance = required_fc * 10.764
    
    # Initialize exposure warning flag
    exposure_warning = None
    
    # Determine the max illuminance possible at the closest distance (typically 3m) with max intensity
    distances = np.array(list(skypanel_data[diffusion].keys()))
    illuminances = np.array([skypanel_data[diffusion][d][color_temp] for d in distances])
    min_distance = min(distances)
    max_illuminance_at_min_distance = skypanel_data[diffusion][int(min_distance)][color_temp]
    
    # If preferred_distance is specified, calculate intensity at that distance
    if preferred_distance is not None:
        # Find closest reference point
        idx = np.abs(distances - preferred_distance).argmin()
        ref_distance = distances[idx]
        ref_illuminance = illuminances[idx]
        
        # Calculate illuminance at preferred distance based on inverse square law from reference point
        illuminance_at_preferred = ref_illuminance * (ref_distance / preferred_distance) ** 2
        
        # Maximum possible illuminance at the preferred distance with 100% intensity
        max_illuminance_at_preferred = illuminance_at_preferred
        
        # Calculate required intensity percentage to get required_illuminance at preferred_distance
        intensity_percentage = (required_illuminance / max_illuminance_at_preferred) * 100
        
        # Check if we're in a difficult exposure situation - use more reasonable thresholds
        if intensity_percentage > 90:
            # Only warn if we're very close to maxing out the intensity
            if intensity_percentage > 100:
                exposure_warning = "insufficient_light"
                intensity_percentage = 100.0  # Cap at 100%
        elif intensity_percentage < 15:
            exposure_warning = "too_much_light"
            intensity_percentage = max(10.0, intensity_percentage)  # Ensure minimum
            
        return preferred_distance, round(intensity_percentage, 1), exposure_warning
    
    # If preferred_intensity is specified, calculate distance at that intensity
    elif preferred_intensity is not None:
        # Get the reference illuminance at the closest distance (typically 3m)
        ref_distance = min(distances)
        ref_illuminance = skypanel_data[diffusion][int(ref_distance)][color_temp]
        
        # Calculate what illuminance we can achieve at preferred intensity at reference distance
        achievable_illuminance = (preferred_intensity / 100) * ref_illuminance
        
        # Calculate the distance needed to get required_illuminance with achievable_illuminance
        if achievable_illuminance < required_illuminance:
            # If we can't achieve required illuminance, get as close as possible
            ratio = achievable_illuminance / required_illuminance
            
            # If the ratio is close, we can probably achieve proper exposure
            if ratio > 0.7:  # Within 70% of required illuminance
                distance = 1.0  # Closest possible distance
                exposure_warning = None  # No warning needed, we're close enough
            else:
                # Can't achieve required illuminance at the preferred intensity
                exposure_warning = "insufficient_light"
                distance = 1.0  # Closest possible distance
        else:
            # We can achieve required illuminance - calculate ideal distance
            distance = ref_distance * math.sqrt(achievable_illuminance / required_illuminance)
            
            # Check if distance is too far (beyond practical range)
            if distance > 15.0:
                exposure_warning = "too_far"
                distance = 15.0  # Cap at maximum practical distance
        
        # Ensure minimum distance of 1 meter
        distance = max(1.0, distance)
        
        return round(distance, 2), preferred_intensity, exposure_warning
    
    # Auto calculation mode
    else:
        # First check if the max possible illuminance at closest distance is enough
        max_possible_illuminance = max_illuminance_at_min_distance
        
        if required_illuminance > max_possible_illuminance * 1.1:  # Need 10% more than possible
            # Even at closest distance and full intensity, we can't get enough light
            exposure_warning = "insufficient_light"
            return 1.0, 100.0, exposure_warning
            
        # Get ideal distance for the required illuminance
        ideal_distance, intensity_percentage = get_distance_for_illuminance(
            required_illuminance, diffusion, color_temp, interp_funcs
        )
        
        # Check exposure conditions with more reasonable thresholds
        if ideal_distance > 15.0:
            exposure_warning = "too_far"
            ideal_distance = 15.0  # Cap at maximum practical distance
        elif ideal_distance < 1.5 and intensity_percentage > 95:
            # Only warn if we're very close and need near max intensity
            exposure_warning = "insufficient_light"
        elif ideal_distance > 8.0 and intensity_percentage < 20:
            exposure_warning = "too_much_light"
        
        # Adjust distance and intensity to keep within practical ranges
        # Minimum distance is 1 meter
        ideal_distance = max(1.0, ideal_distance)
        
        # Clamp intensity between 10% and 100%
        intensity_percentage = min(100.0, max(10.0, intensity_percentage))
        
        # Round values for clarity
        ideal_distance = round(ideal_distance, 2)
        intensity_percentage = round(intensity_percentage, 1)
        
        return ideal_distance, intensity_percentage, exposure_warning

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

with col1:
    diffusion = st.selectbox(
        "Diffusion Type",
        options=["Standard", "Lite", "Heavy", "Intensifier"],
        index=0,  # Default to Standard
        help="Different diffusion panels affect light intensity and quality",
        key="diffusion_type"
    )

with col2:
    color_temp = st.selectbox(
        "Color Temperature",
        options=["3200K", "5600K"],
        index=1,  # Default to 5600K (daylight)
        help="3200K (tungsten) or 5600K (daylight)",
        key="color_temp_select"
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
has_diffusion_changed = 'last_diffusion' not in st.session_state or st.session_state.last_diffusion != diffusion
has_color_temp_changed = 'last_color_temp' not in st.session_state or st.session_state.last_color_temp != color_temp
has_t_stop_changed = 'last_t_stop' not in st.session_state or st.session_state.last_t_stop != t_stop
has_iso_changed = 'last_iso' not in st.session_state or st.session_state.last_iso != iso
has_framerate_changed = 'last_framerate' not in st.session_state or st.session_state.last_framerate != framerate
has_calc_mode_changed = 'last_calc_mode' not in st.session_state or st.session_state.last_calc_mode != calc_mode

# Automatically recalculate when diffusion or color temp changes, or when Calculate button is pressed
if calculate_button or has_diffusion_changed or has_color_temp_changed or has_t_stop_changed or has_iso_changed or has_framerate_changed or has_calc_mode_changed:
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
        
        # Store input parameters to detect changes
        st.session_state.last_t_stop = t_stop
        st.session_state.last_iso = iso
        st.session_state.last_framerate = framerate
        st.session_state.last_diffusion = diffusion
        st.session_state.last_color_temp = color_temp
        st.session_state.last_calc_mode = calc_mode
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
