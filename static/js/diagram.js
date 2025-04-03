// Interactive Lighting Diagram JavaScript
// Based on the Haplon Light Intensity Calculator system

// Canvas dimensions
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Light fixture types and their properties
const LIGHT_TYPES = {
    "ARRI SkyPanel S60-C": {
        color: "#A9D4FF",
        width: 60,
        height: 30
    },
    "Aputure LS 300X": {
        color: "#FFD68A",
        width: 50,
        height: 40
    },
    "Litepanels Gemini 2x1": {
        color: "#BAEAFF",
        width: 65,
        height: 35
    },
    "Aputure MC": {
        color: "#FF7B7B",
        width: 25,
        height: 25
    }
};

// Subject dimensions - now a small circle
const SUBJECT = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    radius: 20 // Small circle radius
};

// SVG icon paths for each light type (can be replaced with actual SVG files)
const LIGHT_ICONS = {
    "ARRI SkyPanel S60-C": `
        <rect x="-30" y="-15" width="60" height="30" rx="5" fill="#A9D4FF" />
        <text x="0" y="5" font-size="8" text-anchor="middle" fill="#222">SkyPanel</text>
    `,
    "Aputure LS 300X": `
        <circle cx="0" cy="0" r="20" fill="#FFD68A" />
        <text x="0" y="5" font-size="8" text-anchor="middle" fill="#222">LS 300X</text>
    `,
    "Litepanels Gemini 2x1": `
        <rect x="-32.5" y="-17.5" width="65" height="35" rx="5" fill="#BAEAFF" />
        <text x="0" y="5" font-size="8" text-anchor="middle" fill="#222">Gemini</text>
    `,
    "Aputure MC": `
        <rect x="-12.5" y="-12.5" width="25" height="25" rx="3" fill="#FF7B7B" />
        <text x="0" y="3" font-size="6" text-anchor="middle" fill="#222">MC</text>
    `
};

// Define light-specific modifiers and color temps based on precise photometric data
const LIGHT_MODIFIERS = {
    "ARRI SkyPanel S60-C": {
        modifiers: ["Standard", "Lite", "Heavy", "Intensifier"],
        colorTemps: ["3200K", "5600K"],
        defaultModifier: "Standard",
        // Real photometric data (lux at 3m) from ARRI documentation
        photometricData: {
            "Standard": {
                "3200K": 1305,
                "5600K": 1200
            },
            "Lite": {
                "3200K": 1328,
                "5600K": 1220
            },
            "Heavy": {
                "3200K": 1031,
                "5600K": 955
            },
            "Intensifier": {
                "3200K": 2011,
                "5600K": 1845
            }
        },
        referenceDistance: 3.0, // Meters
        beamAngle: 115, // Degrees - wide soft source
        effectiveRange: [1.5, 9.0] // Effective distance range in meters
    },
    "Aputure LS 300X": {
        modifiers: ["15° Beam", "30° Beam", "45° Beam", "60° Beam"],
        colorTemps: ["5600K"],
        defaultModifier: "15° Beam",
        // Photometric data based on beam angle (lux at 3m)
        photometricData: {
            "15° Beam": {
                "5600K": 4400
            },
            "30° Beam": {
                "5600K": 2110
            },
            "45° Beam": {
                "5600K": 1166
            },
            "60° Beam": {
                "5600K": 644
            }
        },
        referenceDistance: 3.0, // Meters
        // Beam angles are in the modifier names
        effectiveRange: [1.5, 12.0] // Greater throw distance for focused beams
    },
    "Litepanels Gemini 2x1": {
        modifiers: ["No Diffusion", "Light Diffusion", "Medium Diffusion", "Heavy Diffusion"],
        colorTemps: ["3200K", "5600K"],
        defaultModifier: "No Diffusion",
        // Photometric data (lux at 3m)
        photometricData: {
            "No Diffusion": {
                "3200K": 2780,
                "5600K": 2650
            },
            "Light Diffusion": {
                "3200K": 2222,
                "5600K": 2120
            },
            "Medium Diffusion": {
                "3200K": 1666,
                "5600K": 1590
            },
            "Heavy Diffusion": {
                "3200K": 1111,
                "5600K": 1060
            }
        },
        referenceDistance: 3.0, // Meters
        beamAngle: 95, // Degrees
        effectiveRange: [1.5, 8.0] // Effective distance range in meters
    },
    "Aputure MC": {
        modifiers: ["No Diffusion", "With Diffusion"],
        colorTemps: ["3200K", "5600K"],
        defaultModifier: "No Diffusion",
        // Photometric data (lux at 1m) - much smaller values due to size
        photometricData: {
            "No Diffusion": {
                "3200K": 100,
                "5600K": 95
            },
            "With Diffusion": {
                "3200K": 80,
                "5600K": 76
            }
        },
        referenceDistance: 1.0, // Meters - smaller reference distance due to lower output
        beamAngle: 120, // Degrees - wide spread but weak
        effectiveRange: [0.3, 2.0] // Limited effective range due to small size
    }
};

class LightingDiagram {
    constructor(containerId) {
        // Get the container element
        this.container = document.getElementById(containerId);
        
        // Create the canvas to draw on
        this.canvas = document.createElement('canvas');
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
        this.canvas.className = 'diagram-canvas';
        this.container.appendChild(this.canvas);
        
        // Get the 2D drawing context
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize the lights array
        this.lights = [];
        
        // Set up tracking for selected light
        this.selectedLight = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isDragging = false;
        
        // Camera settings (default values)
        this.cameraSettings = {
            tStop: 2.8,
            iso: 800,
            framerate: 24
        };
        
        // Set up event listeners for canvas interactions
        this.initializeEventListeners();
        
        // Create control panel
        this.createControlPanel();
        
        // Initial draw
        this.draw();
    }
    
    initializeEventListeners() {
        // Mouse events for desktop
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        window.addEventListener('touchmove', this.handleTouchMove.bind(this));
        window.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }
    
    createControlPanel() {
        // Create the controls container
        const controls = document.createElement('div');
        controls.className = 'diagram-controls';
        
        // Add lighting controls
        const lightControls = document.createElement('div');
        lightControls.className = 'diagram-control-group';
        lightControls.innerHTML = `
            <h5>Add Lights</h5>
            <div>
                <button class="diagram-btn add-light" data-type="ARRI SkyPanel S60-C">SkyPanel S60-C</button>
                <button class="diagram-btn add-light" data-type="Aputure LS 300X">Aputure LS 300X</button>
                <button class="diagram-btn add-light" data-type="Litepanels Gemini 2x1">Gemini 2x1</button>
                <button class="diagram-btn add-light" data-type="Aputure MC">Aputure MC</button>
            </div>
            <button class="diagram-btn remove-light" disabled>Remove Selected Light</button>
        `;
        
        // Add light settings controls
        const settingsControls = document.createElement('div');
        settingsControls.className = 'diagram-control-group light-settings';
        settingsControls.innerHTML = `
            <h5>Light Settings</h5>
            <div class="diagram-form-group">
                <label class="diagram-label">Modifier/Diffusion:</label>
                <select class="diagram-select modifier-select" disabled>
                    <!-- Options will be populated dynamically -->
                </select>
            </div>
            <div class="diagram-form-group">
                <label class="diagram-label">Color Temperature:</label>
                <select class="diagram-select color-temp-select" disabled>
                    <option value="3200K">3200K (Tungsten)</option>
                    <option value="5600K">5600K (Daylight)</option>
                </select>
            </div>
        `;
        
        // Add camera settings controls
        const cameraControls = document.createElement('div');
        cameraControls.className = 'diagram-control-group';
        cameraControls.innerHTML = `
            <h5>Camera Settings</h5>
            <div class="diagram-form-group">
                <label class="diagram-label">T-Stop:</label>
                <select class="diagram-select t-stop-select">
                    <option value="1.4">T-1.4</option>
                    <option value="2">T-2</option>
                    <option value="2.8" selected>T-2.8</option>
                    <option value="4">T-4</option>
                    <option value="5.6">T-5.6</option>
                    <option value="8">T-8</option>
                    <option value="11">T-11</option>
                    <option value="16">T-16</option>
                </select>
            </div>
            <div class="diagram-form-group">
                <label class="diagram-label">ISO:</label>
                <input type="number" class="diagram-input iso-input" value="800" min="100" max="12800">
            </div>
            <div class="diagram-form-group">
                <label class="diagram-label">Framerate (fps):</label>
                <input type="number" class="diagram-input framerate-input" value="24" min="12" max="60">
            </div>
        `;
        
        // Append controls to the container
        controls.appendChild(lightControls);
        controls.appendChild(settingsControls);
        controls.appendChild(cameraControls);
        this.container.appendChild(controls);
        
        // Add event listeners for buttons
        const addLightButtons = controls.querySelectorAll('.add-light');
        addLightButtons.forEach(button => {
            button.addEventListener('click', () => {
                const lightType = button.getAttribute('data-type');
                // Add light in a random position around the subject
                const angle = Math.random() * Math.PI * 2;
                const distance = 150 + Math.random() * 100;
                const x = SUBJECT.x + Math.cos(angle) * distance;
                const y = SUBJECT.y + Math.sin(angle) * distance;
                this.addLight(lightType, x, y);
            });
        });
        
        // Remove light button
        const removeButton = controls.querySelector('.remove-light');
        removeButton.addEventListener('click', () => {
            this.removeSelectedLight();
        });
        
        // Camera settings events
        const tStopSelect = controls.querySelector('.t-stop-select');
        const isoInput = controls.querySelector('.iso-input');
        const framerateInput = controls.querySelector('.framerate-input');
        
        tStopSelect.addEventListener('change', () => {
            this.updateCameraSettings(parseFloat(tStopSelect.value), 
                                     parseInt(isoInput.value), 
                                     parseInt(framerateInput.value));
        });
        
        isoInput.addEventListener('change', () => {
            this.updateCameraSettings(parseFloat(tStopSelect.value), 
                                     parseInt(isoInput.value), 
                                     parseInt(framerateInput.value));
        });
        
        framerateInput.addEventListener('change', () => {
            this.updateCameraSettings(parseFloat(tStopSelect.value), 
                                     parseInt(isoInput.value), 
                                     parseInt(framerateInput.value));
        });
        
        // Light settings events
        const modifierSelect = controls.querySelector('.modifier-select');
        const colorTempSelect = controls.querySelector('.color-temp-select');
        
        modifierSelect.addEventListener('change', () => {
            if (this.selectedLight !== null) {
                this.updateLightSettings(this.selectedLight, 
                                        modifierSelect.value, 
                                        colorTempSelect.value);
            }
        });
        
        colorTempSelect.addEventListener('change', () => {
            if (this.selectedLight !== null) {
                this.updateLightSettings(this.selectedLight, 
                                        modifierSelect.value, 
                                        colorTempSelect.value);
            }
        });
    }
    
    addLight(type, x, y) {
        // Get the default modifier and color temperature for this light type
        const defaultModifier = LIGHT_MODIFIERS[type].defaultModifier;
        const defaultColorTemp = LIGHT_MODIFIERS[type].colorTemps[0];
        
        // Create a new light object with appropriate defaults
        const light = {
            type: type,
            x: x,
            y: y,
            diffusion: defaultModifier,
            colorTemp: defaultColorTemp,
            intensity: 100        // Default intensity (percentage)
        };
        
        // Add the light to our array
        this.lights.push(light);
        
        // Select the newly added light
        this.selectedLight = this.lights.length - 1;
        
        // Enable the remove button
        document.querySelector('.remove-light').disabled = false;
        
        // Update light settings controls
        this.updateLightSettingsControls();
        
        // Calculate the light settings
        this.calculateLightSettings(this.selectedLight);
        
        // Redraw the canvas
        this.draw();
    }
    
    removeSelectedLight() {
        if (this.selectedLight !== null) {
            // Remove the selected light from the array
            this.lights.splice(this.selectedLight, 1);
            
            // Reset selection
            this.selectedLight = null;
            
            // Disable the remove button if no lights remain
            if (this.lights.length === 0) {
                document.querySelector('.remove-light').disabled = true;
            }
            
            // Update light settings controls
            this.updateLightSettingsControls();
            
            // Redraw the canvas
            this.draw();
        }
    }
    
    getLightAt(x, y) {
        // Check each light starting from the top (last added)
        for (let i = this.lights.length - 1; i >= 0; i--) {
            const light = this.lights[i];
            const lightType = LIGHT_TYPES[light.type];
            
            // Make the hit area slightly larger than the visual element for easier selection
            const hitPadding = 10; // Extra padding around the light to make selection easier
            
            // Check if the point is within the light's bounds (with padding)
            if (x >= light.x - lightType.width/2 - hitPadding && 
                x <= light.x + lightType.width/2 + hitPadding && 
                y >= light.y - lightType.height/2 - hitPadding && 
                y <= light.y + lightType.height/2 + hitPadding) {
                
                console.log(`Hit light ${i} at position (${light.x}, ${light.y})`);
                return i;
            }
        }
        
        return null;
    }
    
    handleMouseDown(e) {
        // Get the mouse position relative to the canvas
        const rect = this.canvas.getBoundingClientRect();
        // Calculate the scaling factor between canvas coordinates and display size
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        // Apply the scaling to get the true canvas coordinates
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        
        console.log("Mouse down at:", mouseX, mouseY);
        
        // Check if we clicked on a light
        const lightIndex = this.getLightAt(mouseX, mouseY);
        
        if (lightIndex !== null) {
            // Select this light
            this.selectedLight = lightIndex;
            
            // Calculate the offset from the light's center
            const light = this.lights[lightIndex];
            this.dragOffset.x = light.x - mouseX;
            this.dragOffset.y = light.y - mouseY;
            this.isDragging = true;
            
            console.log("Selected light:", lightIndex, "at position:", light.x, light.y);
            console.log("Drag offset:", this.dragOffset.x, this.dragOffset.y);
            
            // Update the light settings controls
            this.updateLightSettingsControls();
        } else {
            // Deselect if we clicked elsewhere
            this.selectedLight = null;
            this.updateLightSettingsControls();
        }
        
        // Redraw with the new selection
        this.draw();
    }
    
    handleMouseMove(e) {
        if (this.isDragging && this.selectedLight !== null) {
            // Get the mouse position relative to the canvas with scaling
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;
            
            // Update the light's position with offset
            const light = this.lights[this.selectedLight];
            light.x = mouseX + this.dragOffset.x;
            light.y = mouseY + this.dragOffset.y;
            
            // Optional: Ensure the light stays within the canvas bounds
            light.x = Math.max(0, Math.min(this.canvas.width, light.x));
            light.y = Math.max(0, Math.min(this.canvas.height, light.y));
            
            // Recalculate the light settings
            this.calculateLightSettings(this.selectedLight);
            
            // Redraw
            this.draw();
        }
    }
    
    handleMouseUp() {
        this.isDragging = false;
    }
    
    handleTouchStart(e) {
        e.preventDefault(); // Prevent scrolling
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            
            // Calculate the scaling factor between canvas coordinates and display size
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            // Apply the scaling to get the true canvas coordinates
            const touchX = (touch.clientX - rect.left) * scaleX;
            const touchY = (touch.clientY - rect.top) * scaleY;
            
            console.log("Touch start at:", touchX, touchY);
            
            // Check if we touched a light
            const lightIndex = this.getLightAt(touchX, touchY);
            
            if (lightIndex !== null) {
                // Select this light
                this.selectedLight = lightIndex;
                
                // Calculate the offset from the light's center
                const light = this.lights[lightIndex];
                this.dragOffset.x = light.x - touchX;
                this.dragOffset.y = light.y - touchY;
                this.isDragging = true;
                
                console.log("Selected light (touch):", lightIndex, "at position:", light.x, light.y);
                console.log("Touch drag offset:", this.dragOffset.x, this.dragOffset.y);
                
                // Update the light settings controls
                this.updateLightSettingsControls();
            } else {
                // Deselect if we touched elsewhere
                this.selectedLight = null;
                this.updateLightSettingsControls();
            }
            
            // Redraw with the new selection
            this.draw();
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault(); // Prevent scrolling
        if (this.isDragging && this.selectedLight !== null && e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            
            // Calculate the scaling factor between canvas coordinates and display size
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            // Apply the scaling to get the true canvas coordinates
            const touchX = (touch.clientX - rect.left) * scaleX;
            const touchY = (touch.clientY - rect.top) * scaleY;
            
            // Update the light's position with offset
            const light = this.lights[this.selectedLight];
            light.x = touchX + this.dragOffset.x;
            light.y = touchY + this.dragOffset.y;
            
            // Optional: Ensure the light stays within the canvas bounds
            light.x = Math.max(0, Math.min(this.canvas.width, light.x));
            light.y = Math.max(0, Math.min(this.canvas.height, light.y));
            
            // Recalculate the light settings
            this.calculateLightSettings(this.selectedLight);
            
            // Redraw
            this.draw();
        }
    }
    
    handleTouchEnd(e) {
        this.isDragging = false;
    }
    
    calculateDistance(light) {
        // Calculate the distance from the subject
        const dx = light.x - SUBJECT.x;
        const dy = light.y - SUBJECT.y;
        return Math.sqrt(dx*dx + dy*dy) / 50; // Scale to realistic meters
    }
    
    calculateLightSettings(lightIndex) {
        if (lightIndex === null || lightIndex >= this.lights.length) return;
        
        const light = this.lights[lightIndex];
        const lightData = LIGHT_MODIFIERS[light.type];
        
        // Calculate the distance in meters from the subject
        const distance = this.calculateDistance(light);
        
        // Calculate an exposure factor based on camera settings
        // Using the cinematography formula: FC = 25f²/(exp*ISO)
        // ISO is inversely proportional - higher ISO needs less light
        const isoFactor = 800 / this.cameraSettings.iso; // 800 ISO as reference (inverse because higher ISO = less light needed)
        const tStopFactor = Math.pow(this.cameraSettings.tStop / 2.8, 2); // T2.8 as reference (squared because f² in formula)
        const framerateFactor = this.cameraSettings.framerate <= 30 ? 1 : (this.cameraSettings.framerate / 30); // 24-30fps as reference
        
        // Combined exposure setting factor - higher values need more light
        // Higher exposure factor = need more intensity
        // - Higher T-stop (smaller aperture) needs more light (tStopFactor increases)
        // - Lower ISO needs more light (isoFactor increases when ISO decreases)
        // - Higher framerate needs more light (framerateFactor increases)
        const exposureFactor = tStopFactor * isoFactor * framerateFactor;
        
        // Get the reference lux value from our photometric data
        const referenceLux = lightData.photometricData[light.diffusion]?.[light.colorTemp] || 
                           // Fallback if exact combo not found
                           lightData.photometricData[light.diffusion]?.[lightData.colorTemps[0]] || 
                           lightData.photometricData[lightData.defaultModifier]?.[light.colorTemp] || 
                           lightData.photometricData[lightData.defaultModifier][lightData.colorTemps[0]];
        
        const referenceDistance = lightData.referenceDistance;
        const effectiveRange = lightData.effectiveRange;
        
        // Determine if the light is in its effective range
        const inEffectiveRange = distance >= effectiveRange[0] && distance <= effectiveRange[1];
        
        // Calculate the base intensity using inverse square law
        const distanceRatio = Math.pow(distance / referenceDistance, 2);
        
        // Get the reference output to normalize against
        // This is typically the highest output configuration of each light
        const referenceOutput = light.type === "ARRI SkyPanel S60-C" ? 
                               lightData.photometricData["Intensifier"]["3200K"] : 
                             light.type === "Aputure LS 300X" ? 
                               lightData.photometricData["15° Beam"]["5600K"] : 
                             light.type === "Litepanels Gemini 2x1" ? 
                               lightData.photometricData["No Diffusion"]["3200K"] : 
                             light.type === "Aputure MC" ? 
                               lightData.photometricData["No Diffusion"]["3200K"] * 13.05 : // Scale factor to match larger lights
                               referenceLux;
        
        // Output multiplier - how much more/less intense we need to be vs. reference
        // Lower reference lux means we need MORE intensity to achieve the same result
        const outputFactor = referenceOutput / referenceLux;
        
        // Calculate the base intensity
        let intensity = distanceRatio * 100 * exposureFactor * outputFactor;
        
        // Apply light-specific adjustments
        switch (light.type) {
            case "Aputure LS 300X":
                // Focused beams behave differently at long distances
                // Narrow beam angles maintain intensity better at distance but fall off more rapidly at edges
                if (light.diffusion === "15° Beam") {
                    if (distance > 6) {
                        // At very long distances, narrow beams lose some efficiency
                        intensity = intensity * (1 - (distance - 6) * 0.05);
                    }
                } else if (light.diffusion === "30° Beam") {
                    if (distance > 8) {
                        intensity = intensity * (1 - (distance - 8) * 0.03);
                    }
                }
                
                // Apply a small boost to intensity when in optimal range
                if (distance >= 2.5 && distance <= 8) {
                    intensity = intensity * 0.95; // Slight efficiency boost within optimal range
                }
                break;
                
            case "Aputure MC":
                // The MC is effective only at very short distances
                if (distance < 0.5) {
                    // Very close proximity modulation - reduced intensity when too close
                    intensity = intensity * (distance / 0.5);
                } else if (distance > 2.0) {
                    // Rapid falloff beyond effective range
                    // More aggressive correction for this small light
                    intensity = intensity * (1 + Math.pow(distance - 2.0, 1.5) * 0.4);
                }
                break;
                
            case "ARRI SkyPanel S60-C":
                // SkyPanel maintains better efficiency at mid-distances
                if (distance > 1.5 && distance < 6) {
                    intensity = intensity * 0.97; // Slight efficiency boost
                }
                
                // Color temperature adjustment - 5600K is slightly less efficient
                if (light.colorTemp === "5600K") {
                    intensity = intensity * 1.05; // Needs 5% more power for equivalent output
                }
                break;
                
            case "Litepanels Gemini 2x1":
                // Gemini has slightly more directionality than SkyPanel
                if (distance > 2 && distance < 5) {
                    intensity = intensity * 0.98; // Slight efficiency boost in optimal range
                }
                break;
        }
        
        // Apply warning flags or outright cap if beyond effective range
        let exposureWarning = false;
        let outOfRangeMessage = "";
        
        if (!inEffectiveRange) {
            if (distance < effectiveRange[0]) {
                outOfRangeMessage = `Too close (min: ${effectiveRange[0]}m)`;
                // If too close, reduce intensity to prevent overexposure artifacts
                intensity = intensity * 0.8;
            } else if (distance > effectiveRange[1]) {
                outOfRangeMessage = `Too far (max: ${effectiveRange[1]}m)`;
                // If too far, apply additional penalty beyond inverse square
                intensity = intensity * 1.2;
            }
            exposureWarning = true;
        }
        
        // Cap intensity at 100%
        const isTooIntense = intensity > 100;
        if (isTooIntense) {
            exposureWarning = true;
            intensity = 100;
        }
        
        // Set the warning message
        light.exposureWarning = exposureWarning;
        light.warningMessage = isTooIntense ? "Max intensity reached" : outOfRangeMessage;
        
        // Set the calculated intensity (rounded to 2 decimal places)
        light.intensity = Math.round(intensity * 100) / 100;
        
        // Log for debugging
        console.log(`${light.type} at ${distance.toFixed(2)}m with ${light.diffusion} (${light.colorTemp}) requires ${light.intensity.toFixed(2)}% intensity (ISO: ${this.cameraSettings.iso}, T-stop: ${this.cameraSettings.tStop}, FPS: ${this.cameraSettings.framerate})`);
        if (exposureWarning) console.log(`WARNING: ${outOfRangeMessage || "Max intensity reached"}`);
        
        // Update display
        this.draw();
    }
    
    updateCameraSettings(tStop, iso, framerate) {
        this.cameraSettings.tStop = tStop;
        this.cameraSettings.iso = iso;
        this.cameraSettings.framerate = framerate;
        
        // Recalculate all light settings
        for (let i = 0; i < this.lights.length; i++) {
            this.calculateLightSettings(i);
        }
        
        // Redraw
        this.draw();
    }
    
    updateLightSettings(lightIndex, diffusion, colorTemp) {
        if (lightIndex === null || lightIndex >= this.lights.length) return;
        
        const light = this.lights[lightIndex];
        light.diffusion = diffusion;
        light.colorTemp = colorTemp;
        
        // Recalculate the light settings
        this.calculateLightSettings(lightIndex);
        
        // Redraw
        this.draw();
    }
    
    updateLightSettingsControls() {
        const modifierSelect = document.querySelector('.modifier-select');
        const colorTempSelect = document.querySelector('.color-temp-select');
        const removeButton = document.querySelector('.remove-light');
        
        if (this.selectedLight !== null) {
            // Enable controls
            modifierSelect.disabled = false;
            colorTempSelect.disabled = false;
            removeButton.disabled = false;
            
            // Update values to match the selected light
            const light = this.lights[this.selectedLight];
            
            // Clear existing modifier options and add the appropriate ones for this light type
            modifierSelect.innerHTML = '';
            const lightModifiers = LIGHT_MODIFIERS[light.type].modifiers;
            
            lightModifiers.forEach(modifier => {
                const option = new Option(modifier, modifier);
                modifierSelect.add(option);
            });
            
            // Set the current value or default to the first option if the current isn't available
            if (lightModifiers.includes(light.diffusion)) {
                modifierSelect.value = light.diffusion;
            } else {
                light.diffusion = lightModifiers[0]; // Update the light's diffusion to the first available
                modifierSelect.value = light.diffusion;
            }
            
            // Similarly, update color temperature options
            colorTempSelect.innerHTML = '';
            const lightColorTemps = LIGHT_MODIFIERS[light.type].colorTemps;
            
            lightColorTemps.forEach(temp => {
                const label = temp === "3200K" ? "3200K (Tungsten)" : "5600K (Daylight)";
                const option = new Option(label, temp);
                colorTempSelect.add(option);
            });
            
            // Set the current value or default to the first option
            if (lightColorTemps.includes(light.colorTemp)) {
                colorTempSelect.value = light.colorTemp;
            } else {
                light.colorTemp = lightColorTemps[0]; // Update the light's color temp
                colorTempSelect.value = light.colorTemp;
            }
        } else {
            // Disable controls when nothing is selected
            modifierSelect.disabled = true;
            colorTempSelect.disabled = true;
            removeButton.disabled = this.lights.length === 0;
            
            // Clear the dropdowns when no light is selected
            modifierSelect.innerHTML = '<option value="">-- Select a light first --</option>';
            colorTempSelect.innerHTML = '<option value="">-- Select a light first --</option>';
        }
    }
    
    drawGrid() {
        // Set up grid styling
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Draw vertical grid lines
        for (let x = 0; x <= this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Draw horizontal grid lines
        for (let y = 0; y <= this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    drawSubject() {
        // Draw the subject as a small circle
        const x = SUBJECT.x;
        const y = SUBJECT.y;
        const radius = SUBJECT.radius;
        
        // Draw circle
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#F7C35F'; // Haplon gold color
        this.ctx.fill();
        
        // Draw outline
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Label
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Subject', x, y + radius + 20);
    }
    
    drawLightIntensity(light) {
        if (!light) return;
        
        // Calculate the distance in meters
        const distance = this.calculateDistance(light);
        const lightData = LIGHT_MODIFIERS[light.type];
        
        // For visualization purposes, use the inverse square law to calculate
        // the radius of the light effect based on intensity and distance
        
        // Determine color and set parameters based on light type
        let baseColor;
        let maxRadius = 250;
        let radiusScaleFactor = 1.0;
        
        // Get effective beam angle from the light data or derive from modifier name
        // This affects the spread of the light visualization
        let beamAngle = lightData.beamAngle || 110; // Default to wide if not specified
        
        // For lights with beam angle in the modifier name (e.g., Aputure LS 300X)
        if (light.type === "Aputure LS 300X") {
            // Extract the beam angle from the modifier name (e.g., "15° Beam")
            const match = light.diffusion.match(/(\d+)°/);
            if (match) {
                beamAngle = parseInt(match[1]);
            }
        }
        
        // Adjust visualization based on the light type and settings
        switch (light.type) {
            case "ARRI SkyPanel S60-C":
                // Color based on color temperature
                baseColor = light.colorTemp === "3200K" ? 
                           "255, 213, 170" : // Warm tungsten color
                           "169, 212, 255";  // Cooler daylight color
                
                // Adjust the spread based on diffusion
                if (light.diffusion === "Intensifier") {
                    beamAngle = 95; // More focused
                } else if (light.diffusion === "Heavy") {
                    beamAngle = 125; // Wider spread
                }
                
                maxRadius = 250;
                break;
                
            case "Aputure LS 300X":
                // Fresnel light with very directional beam
                baseColor = "255, 214, 138"; // Amber color
                
                // Radius calculation adjusts based on beam angle
                // Narrower beams get more concentrated but smaller visual spread
                if (beamAngle <= 15) {
                    maxRadius = 180;
                    radiusScaleFactor = 0.7; // More concentrated falloff 
                } else if (beamAngle <= 30) {
                    maxRadius = 200;
                    radiusScaleFactor = 0.8;
                } else if (beamAngle <= 45) {
                    maxRadius = 220;
                    radiusScaleFactor = 0.9;
                } else {
                    maxRadius = 230;
                    radiusScaleFactor = 1.0;
                }
                break;
                
            case "Litepanels Gemini 2x1":
                // More cyan-tint daylight than the SkyPanel
                baseColor = light.colorTemp === "3200K" ? 
                           "255, 202, 155" : // Warm tungsten color
                           "186, 234, 255";  // Cooler daylight color with slight cyan tint
                
                // Adjust spread based on diffusion type
                if (light.diffusion === "No Diffusion") {
                    beamAngle = 95;
                } else if (light.diffusion === "Heavy Diffusion") {
                    beamAngle = 115;
                }
                
                maxRadius = 230;
                break;
                
            case "Aputure MC":
                // Smaller light with more dramatic falloff
                // Color depends on color temperature
                baseColor = light.colorTemp === "3200K" ? 
                           "255, 159, 128" : // Warm reddish 
                           "255, 123, 123";  // Cool reddish
                           
                // Drastically smaller radius and more concentrated
                maxRadius = light.diffusion === "No Diffusion" ? 100 : 90;
                radiusScaleFactor = light.diffusion === "No Diffusion" ? 0.8 : 0.9;
                break;
                
            default:
                baseColor = "247, 195, 95"; // Default Haplon gold
        }
        
        // Base the radius on how much light would reach the subject and beam angle
        // - Narrower beam angles = more concentrated, smaller visual spread but more intensity
        // - Wider beam angles = larger visual spread but less intensity at distance
        let radius;
        let innerRadius = 0; // Used for Fresnel lights to create a focused hotspot
        
        // Calculate the cone angle visualization - affects the gradient appearance
        const coneRatio = Math.min(1.0, 100 / beamAngle); // Normalize to create visual effect
        
        if (light.type === "Aputure LS 300X") {
            // Fresnel light has a more concentrated center beam with hotspot
            // We'll use the beam angle to determine the visual spread
            radius = Math.sqrt(light.intensity / 100) * maxRadius / Math.pow(distance, radiusScaleFactor); 
            
            // Create a hotspot effect for Fresnel - smaller inner radius for narrow beams
            innerRadius = radius * (beamAngle <= 30 ? 0.2 : beamAngle <= 45 ? 0.3 : 0.4);
        } else if (light.type === "Aputure MC") {
            // Small light with very rapid falloff
            radius = Math.sqrt(light.intensity / 100) * maxRadius / Math.pow(distance, radiusScaleFactor);
            
            // Cap the radius based on distance to represent limited throw distance
            if (distance < 1.0) {
                radius = Math.min(radius, maxRadius * 1.0);
            } else if (distance < 1.5) {
                radius = Math.min(radius, maxRadius * 0.7);
            } else if (distance < 2.0) {
                radius = Math.min(radius, maxRadius * 0.5);
            } else {
                radius = Math.min(radius, maxRadius * 0.3);
            }
        } else {
            // Standard calculation for panel lights
            // Use the beam angle to adjust the visual spread
            radius = Math.sqrt(light.intensity / 100) * maxRadius / Math.sqrt(distance);
            radius = radius * (beamAngle / 110); // Normalize against a standard 110° angle
        }
        
        // Draw intensity visualization
        this.ctx.save();
        
        // For Fresnel lights, we'll create a more directional beam shape
        if (light.type === "Aputure LS 300X") {
            // Calculate angle from light to subject
            const dx = SUBJECT.x - light.x;
            const dy = SUBJECT.y - light.y;
            const angle = Math.atan2(dy, dx);
            
            // Create a focused cone of light for Fresnel
            // The smaller the beam angle, the more focused the cone
            const coneAngle = (beamAngle / 2) * (Math.PI / 180); // Convert to radians
            
            // Create a cone/sector shape for the light
            this.ctx.beginPath();
            this.ctx.moveTo(light.x, light.y);
            
            // Draw an arc forming the cone edge
            this.ctx.arc(light.x, light.y, radius, 
                         angle - coneAngle, 
                         angle + coneAngle);
            
            // Close the cone
            this.ctx.closePath();
            
            // Create gradient along the cone
            const gradient = this.ctx.createRadialGradient(light.x, light.y, innerRadius, light.x, light.y, radius);
            
            // More intense, concentrated gradient for Fresnel fixtures
            gradient.addColorStop(0, `rgba(${baseColor}, 0.9)`);
            gradient.addColorStop(0.2, `rgba(${baseColor}, 0.7)`);
            gradient.addColorStop(0.5, `rgba(${baseColor}, 0.4)`);
            gradient.addColorStop(0.8, `rgba(${baseColor}, 0.2)`);
            gradient.addColorStop(1, `rgba(${baseColor}, 0)`);
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        } else {
            // For soft lights like panels, use a circular gradient
            this.ctx.beginPath();
            this.ctx.arc(light.x, light.y, radius, 0, Math.PI * 2);
            
            // Create gradient based on light type
            const gradient = this.ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, radius);
            
            if (light.type === "Aputure MC") {
                // More concentrated, focused gradient for the small MC light
                gradient.addColorStop(0, `rgba(${baseColor}, 0.8)`);
                gradient.addColorStop(0.3, `rgba(${baseColor}, 0.4)`);
                gradient.addColorStop(0.6, `rgba(${baseColor}, 0.2)`);
                gradient.addColorStop(0.8, `rgba(${baseColor}, 0.1)`);
                gradient.addColorStop(1, `rgba(${baseColor}, 0)`);
            } else {
                // Standard gradient for larger panel lights
                gradient.addColorStop(0, `rgba(${baseColor}, 0.7)`);
                gradient.addColorStop(0.5, `rgba(${baseColor}, 0.3)`);
                gradient.addColorStop(0.8, `rgba(${baseColor}, 0.1)`);
                gradient.addColorStop(1, `rgba(${baseColor}, 0)`);
            }
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }
        
        // Draw a line from the light to the subject to help visualize the connection
        this.ctx.beginPath();
        this.ctx.moveTo(light.x, light.y);
        this.ctx.lineTo(SUBJECT.x, SUBJECT.y);
        
        // If there's an exposure warning, use a different color for the connection line
        if (light.exposureWarning) {
            this.ctx.strokeStyle = 'rgba(255, 100, 100, 0.4)'; // Red warning
        } else {
            this.ctx.strokeStyle = `rgba(${baseColor}, 0.4)`;
        }
        
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // If there's an exposure warning, draw a warning indicator
        if (light.exposureWarning) {
            // Draw warning icon at the light position
            this.ctx.font = 'bold 16px Arial';
            this.ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('!', light.x, light.y - 25);
        }
        
        this.ctx.restore();
    }
    
    drawLight(light, index) {
        // Draw the light intensity halo first (behind the light icon)
        this.drawLightIntensity(light);
        
        // Get light type dimensions
        const lightType = LIGHT_TYPES[light.type];
        
        // Create SVG for the light icon
        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${lightType.width}" height="${lightType.height}" viewBox="-${lightType.width/2} -${lightType.height/2} ${lightType.width} ${lightType.height}">
            ${LIGHT_ICONS[light.type]}
        </svg>`;
        
        // Convert SVG to base64 for drawing
        const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + svgBase64;
        
        // Draw the light once the image has loaded
        img.onload = () => {
            this.ctx.save();
            
            // Draw a highlight if this light is selected
            if (index === this.selectedLight) {
                this.ctx.strokeStyle = '#F7C35F';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(
                    light.x - lightType.width/2 - 3, 
                    light.y - lightType.height/2 - 3, 
                    lightType.width + 6, 
                    lightType.height + 6
                );
            }
            
            // Draw the light icon
            this.ctx.drawImage(
                img, 
                light.x - lightType.width/2, 
                light.y - lightType.height/2, 
                lightType.width, 
                lightType.height
            );
            
            // Draw distance and intensity near the light
            const distance = this.calculateDistance(light).toFixed(1);
            this.ctx.font = '12px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${distance}m / ${Math.round(light.intensity)}%`, light.x, light.y - lightType.height/2 - 5);
            
            this.ctx.restore();
        };
        
        // Draw the SVG immediately using an alternate method if needed
        if (!img.complete) {
            // Fallback rectangle if SVG doesn't load
            this.ctx.fillStyle = lightType.color;
            this.ctx.fillRect(
                light.x - lightType.width/2, 
                light.y - lightType.height/2, 
                lightType.width, 
                lightType.height
            );
            
            // Add text label
            this.ctx.font = '10px Arial';
            this.ctx.fillStyle = '#222';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(light.type.split(' ')[0], light.x, light.y + 4);
        }
    }
    
    drawInfoPanel() {
        // Draw camera settings panel at the top left
        this.ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
        this.ctx.strokeStyle = '#F7C35F';
        this.ctx.lineWidth = 1;
        
        const cameraX = 10;
        const cameraY = 10;
        const cameraWidth = 180;
        const cameraHeight = 60;
        
        // Camera panel background
        this.ctx.fillRect(cameraX, cameraY, cameraWidth, cameraHeight);
        this.ctx.strokeRect(cameraX, cameraY, cameraWidth, cameraHeight);
        
        // Camera panel title
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillStyle = '#F7C35F';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Camera Settings`, cameraX + 10, cameraY + 20);
        
        // Camera settings info
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(`T-Stop: ${this.cameraSettings.tStop}`, cameraX + 10, cameraY + 35);
        this.ctx.fillText(`ISO: ${this.cameraSettings.iso}`, cameraX + 10, cameraY + 50);
        this.ctx.fillText(`FPS: ${this.cameraSettings.framerate}`, cameraX + 100, cameraY + 50);
        
        // Draw selected light info panel at the bottom right
        if (this.selectedLight !== null) {
            const light = this.lights[this.selectedLight];
            const lightData = LIGHT_MODIFIERS[light.type];
            const distance = this.calculateDistance(light).toFixed(1);
            
            // Calculate panel size - taller if we have warnings or equipment details
            const hasWarning = light.exposureWarning;
            const panelX = this.canvas.width - 210;
            let panelY = this.canvas.height - (hasWarning ? 130 : 100);
            const panelWidth = 200;
            let panelHeight = hasWarning ? 120 : 90; // More height for warnings
            
            // Panel background
            this.ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
            this.ctx.strokeStyle = light.exposureWarning ? 'rgba(255, 100, 100, 0.8)' : '#F7C35F';
            this.ctx.lineWidth = light.exposureWarning ? 2 : 1; // Thicker border for warnings
            this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
            this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
            
            // Panel title with equipment model
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillStyle = '#F7C35F';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`${light.type}`, panelX + 10, panelY + 20);
            
            // Get reference lux and display it in the panel
            const referenceLux = lightData.photometricData[light.diffusion]?.[light.colorTemp] || 
                               lightData.photometricData[light.diffusion]?.[lightData.colorTemps[0]] || 
                               lightData.photometricData[lightData.defaultModifier][lightData.colorTemps[0]];
            
            // Display effective light range
            const effectiveRange = lightData.effectiveRange;
            
            // Panel info
            this.ctx.font = '12px Arial';
            this.ctx.fillStyle = 'white';
            
            // Basic information
            this.ctx.fillText(`Distance: ${distance} meters`, panelX + 10, panelY + 40);
            
            // Color the intensity value red if at maximum
            if (light.intensity >= 99.5) {
                this.ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
            }
            this.ctx.fillText(`Intensity: ${Math.round(light.intensity)}%`, panelX + 10, panelY + 55);
            this.ctx.fillStyle = 'white'; // Reset color
            
            this.ctx.fillText(`Modifier: ${light.diffusion}`, panelX + 10, panelY + 70);
            this.ctx.fillText(`Color Temp: ${light.colorTemp}`, panelX + 10, panelY + 85);
            
            // Add reference output value in small text
            this.ctx.font = '10px Arial';
            this.ctx.fillStyle = 'rgba(180, 180, 180, 0.8)';
            this.ctx.fillText(`Output: ${referenceLux} lux @ ${lightData.referenceDistance}m`, panelX + 10, panelY + 100);
            
            // Add warning message if needed
            if (light.exposureWarning) {
                this.ctx.font = 'bold 12px Arial';
                this.ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
                this.ctx.fillText(`Warning: ${light.warningMessage}`, panelX + 10, panelY + 115);
            }
            
            // Draw effective range indicator on a small ruler
            const rulerX = panelX + 10;
            const rulerY = hasWarning ? panelY + 130 : panelY + 115;
            const rulerWidth = 180;
            const rulerHeight = 10;
            
            if (panelY + rulerY + rulerHeight > this.canvas.height) {
                // Skip drawing the ruler if it would go off-screen
                return;
            }
            
            // Extend panel height to include ruler
            this.ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
            this.ctx.fillRect(panelX, rulerY - 10, panelWidth, 25);
            
            // Draw ruler background
            this.ctx.fillStyle = 'rgba(60, 60, 60, 0.8)';
            this.ctx.fillRect(rulerX, rulerY, rulerWidth, rulerHeight);
            
            // Draw effective range on ruler
            const rangeStart = Math.max(0, effectiveRange[0] / 12 * rulerWidth);
            const rangeEnd = Math.min(rulerWidth, effectiveRange[1] / 12 * rulerWidth);
            this.ctx.fillStyle = 'rgba(100, 200, 100, 0.8)';
            this.ctx.fillRect(rulerX + rangeStart, rulerY, rangeEnd - rangeStart, rulerHeight);
            
            // Draw current distance marker on ruler
            const distanceMarker = Math.min(rulerWidth, distance / 12 * rulerWidth);
            this.ctx.fillStyle = distance < effectiveRange[0] || distance > effectiveRange[1] ?
                              'rgba(255, 100, 100, 0.8)' :
                              'rgba(255, 255, 255, 0.8)';
            this.ctx.fillRect(rulerX + distanceMarker - 1, rulerY - 3, 2, rulerHeight + 6);
            
            // Draw ruler tick marks and labels
            this.ctx.font = '8px Arial';
            this.ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
            this.ctx.textAlign = 'center';
            
            // Draw tick marks every 2 meters
            for (let i = 0; i <= 12; i += 2) {
                const tickX = rulerX + (i/12 * rulerWidth);
                this.ctx.fillRect(tickX, rulerY - 2, 1, rulerHeight + 4);
                this.ctx.fillText(`${i}m`, tickX, rulerY + rulerHeight + 8);
            }
        }
    }
    
    draw() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Fill the background
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw subject
        this.drawSubject();
        
        // Draw each light
        for (let i = 0; i < this.lights.length; i++) {
            this.drawLight(this.lights[i], i);
        }
        
        // Draw info panel for selected light
        this.drawInfoPanel();
    }
}

// Initialize the lighting diagram when the DOM content is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.lightingDiagram = new LightingDiagram('diagram-container');
});

// Helper function to update camera settings from the calculator
function updateCameraSettings(tStop, iso, framerate) {
    if (window.lightingDiagram) {
        window.lightingDiagram.updateCameraSettings(tStop, iso, framerate);
    }
}

// Helper function to update light modifier settings
function updateLightModifier(lightIndex, modifier, colorTemp) {
    if (window.lightingDiagram && lightIndex !== null) {
        window.lightingDiagram.updateLightSettings(lightIndex, modifier, colorTemp);
    }
}

// Initialize the form controls with the correct options for the selected light
function updateLightSettingsControls() {
    if (window.lightingDiagram) {
        window.lightingDiagram.updateLightSettingsControls();
    }
}