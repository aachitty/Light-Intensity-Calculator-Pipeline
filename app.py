import streamlit as st
import math

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
precise light setup recommendations.
""")

def calculate_light_settings_skypanels60(desired_t_stop, input_iso, input_framerate):
    # Reference constants from camera setup
    REFERENCE_ILLUMINANCE = 4225.0   # lux (base light level at reference settings)
    REFERENCE_T_STOP = 16.03         # reference T-stop (from lens aperture)
    REFERENCE_ISO = 800              # reference ISO (from film exposure index)
    REFERENCE_FRAMERATE = 24         # reference framerate (fps)
    
    # Derived from empirical data points using the inverse square law
    LUMINOUS_INTENSITY = 11350.0     # lux·m² (measured light output)
    MAX_LIGHT_INTENSITY = 45288.0    # Max output of ARRI SkyPanel S60-C

    # Calculate required illuminance using only aperture, ISO, and framerate.
    illuminance_ratio = (
        (REFERENCE_T_STOP / desired_t_stop) ** 2 *  # Aperture factor (inverse square law)
        (REFERENCE_ISO / input_iso) *               # ISO factor (linear relationship)
        (input_framerate / REFERENCE_FRAMERATE)     # Framerate factor (substitutes for exposure time at 180° shutter)
    )
    
    required_illuminance = REFERENCE_ILLUMINANCE * illuminance_ratio

    # Calculate ideal distance using inverse square law: E = I / d² → d = √(I/E)
    ideal_distance = math.sqrt(LUMINOUS_INTENSITY / required_illuminance)

    # Enforce minimum distance of 1 meter
    if ideal_distance < 1.0:
        ideal_distance = 1.0
    
    # Calculate required luminous intensity at the chosen distance
    required_intensity = required_illuminance * (ideal_distance ** 2)

    # Convert intensity to percentage
    intensity_percentage = (required_intensity / MAX_LIGHT_INTENSITY) * 100

    # Adjust distance to keep intensity within 30%-80% range
    while intensity_percentage > 80 and ideal_distance < 15:  # Move light farther if too bright
        ideal_distance += 0.1
        required_intensity = required_illuminance * (ideal_distance ** 2)
        intensity_percentage = (required_intensity / MAX_LIGHT_INTENSITY) * 100

    while intensity_percentage < 30 and ideal_distance > 1.0:  # Move light closer if too dim
        ideal_distance -= 0.1
        required_intensity = required_illuminance * (ideal_distance ** 2)
        intensity_percentage = (required_intensity / MAX_LIGHT_INTENSITY) * 100

    # Ensure values are within 30%-80% range or as close as possible
    if intensity_percentage > 80:
        intensity_percentage = 80
    elif intensity_percentage < 30:
        intensity_percentage = 30

    # Round values for clarity
    ideal_distance = round(ideal_distance, 2)
    intensity_percentage = round(intensity_percentage, 2)

    return ideal_distance, intensity_percentage

# Create a form for user input
with st.form("light_calculator_form"):
    st.subheader("Camera Settings")
    
    # Create three columns for input fields
    col1, col2, col3 = st.columns(3)
    
    with col1:
        t_stop = st.number_input(
            "T-Stop",
            min_value=0.8,
            max_value=32.0,
            value=2.8,
            step=0.1,
            format="%.1f",
            help="Standard T-stops include: 1.0, 1.4, 2.0, 2.8, 4.0, 5.6, 8.0, 11, 16, 22, 32"
        )
    
    with col2:
        iso = st.number_input(
            "ISO",
            min_value=50,
            max_value=25600,
            value=800,
            step=50,
            help="Common ISOs: 100, 200, 400, 800, 1600, 3200"
        )
    
    with col3:
        framerate = st.number_input(
            "Framerate (fps)",
            min_value=12,
            max_value=300,
            value=24,
            step=1,
            help="Standard framerates: 24 (film), 25 (PAL), 30 (NTSC), 60 (high speed)"
        )
    
    # Submit button
    calculate_button = st.form_submit_button("Calculate Light Settings")

# After form submission, calculate and display results
if calculate_button or 'distance' in st.session_state:
    try:
        # Calculate the light settings
        distance, intensity = calculate_light_settings_skypanels60(t_stop, iso, framerate)
        
        # Store calculation results in session state
        st.session_state.distance = distance
        st.session_state.intensity = intensity
        
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
        
        # Add explanatory text
        st.markdown(f"""
        ### Interpretation
        
        To expose your subject at T-{t_stop} with ISO {iso} and {framerate} fps:
        
        1. Position your ARRI SkyPanel S60-C **{distance} meters** from the subject
        2. Set the light intensity to **{intensity}%** of maximum output
        
        These settings will provide optimal exposure based on the inverse square law and the technical specifications of the ARRI SkyPanel S60-C.
        """)
        
        # Add notes about limitations
        st.info("""
        **Note:** This calculator assumes:
        - 180° shutter angle
        - No additional light modifiers (softboxes, diffusion, etc.)
        - A single key light setup
        - Perfect reflectivity of subject
        
        Adjust your final settings based on artistic intent and practical considerations.
        """)
        
    except Exception as e:
        st.error(f"An error occurred in the calculation: {str(e)}")
        st.error("Please check your input values and try again.")

# Add instructional footer
st.markdown("---")
st.caption("© 2023 Cinematographer's Light Calculator | ARRI SkyPanel S60-C Reference Tool")
