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
                    <option value="Standard">Standard</option>
                    <option value="Lite">Lite</option>
                    <option value="Heavy">Heavy</option>
                    <option value="Intensifier">Intensifier</option>
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
        // Create a new light object
        const light = {
            type: type,
            x: x,
            y: y,
            diffusion: "Standard", // Default diffusion
            colorTemp: "5600K",    // Default color temp
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
        
        // Get light-specific photometric data based on the light type
        // Real-world data for each light fixture
        let intensity;
        
        switch (light.type) {
            case "ARRI SkyPanel S60-C":
                // SkyPanel S60-C has highest output at 3m with Standard diffusion: 1305 lux
                // Using the product's real photometric data
                const skyPanelReferenceDistance = 3.0; // meters
                const skyPanelReferenceLux = light.diffusion === "Intensifier" ? 1700 : 
                                            light.diffusion === "Standard" ? 1305 : 
                                            light.diffusion === "Light" ? 920 : 
                                            light.diffusion === "Medium" ? 680 : 
                                            light.diffusion === "Heavy" ? 450 : 1305;
                
                // Distance ratio squared (inverse square law)
                const skyPanelDistanceRatio = Math.pow(distance / skyPanelReferenceDistance, 2);
                
                // Calculate intensity needed
                intensity = skyPanelDistanceRatio * 100 * exposureFactor;
                
                console.log(`SkyPanel at ${distance.toFixed(2)}m with ${light.diffusion} diffusion requires ${intensity.toFixed(2)}% intensity (ISO: ${this.cameraSettings.iso}, T-stop: ${this.cameraSettings.tStop}, FPS: ${this.cameraSettings.framerate})`);
                break;
                
            case "Aputure LS 300X":
                // Aputure LS 300X has different characteristics from SkyPanel
                // Higher output but narrower beam angle
                const ls300xReferenceDistance = 3.0; // meters
                const ls300xReferenceLux = light.diffusion === "Bare Bulb" ? 1900 :
                                          light.diffusion === "15° Hyper-Reflector" ? 10500 :
                                          light.diffusion === "30° Standard Reflector" ? 4400 :
                                          light.diffusion === "60° Soft Light Reflector" ? 1600 : 4400;
                                          
                // Calculate intensity with falloff
                const ls300xDistanceRatio = Math.pow(distance / ls300xReferenceDistance, 2);
                intensity = ls300xDistanceRatio * 100 * exposureFactor;
                
                // For narrow beam angles, increase the intensity for longer distances
                if (light.diffusion === "15° Hyper-Reflector" && distance > 5) {
                    intensity = intensity * 0.85; // Slight reduction in effectiveness at very long distances
                }
                
                console.log(`Aputure LS 300X at ${distance.toFixed(2)}m with ${light.diffusion} requires ${intensity.toFixed(2)}% intensity (ISO: ${this.cameraSettings.iso}, T-stop: ${this.cameraSettings.tStop}, FPS: ${this.cameraSettings.framerate})`);
                break;
                
            case "Litepanels Gemini 2x1":
                // Gemini 2x1 has moderate output with wide, soft light pattern
                const geminiReferenceDistance = 3.0; // meters
                const geminiReferenceLux = light.diffusion === "Raw" ? 1100 :
                                         light.diffusion === "Dome Diffuser" ? 780 :
                                         light.diffusion === "Honeycomb Grid" ? 850 : 1100;
                                          
                // Calculate intensity with falloff
                const geminiDistanceRatio = Math.pow(distance / geminiReferenceDistance, 2);
                intensity = geminiDistanceRatio * 100 * exposureFactor;
                
                console.log(`Gemini 2x1 at ${distance.toFixed(2)}m with ${light.diffusion} requires ${intensity.toFixed(2)}% intensity (ISO: ${this.cameraSettings.iso}, T-stop: ${this.cameraSettings.tStop}, FPS: ${this.cameraSettings.framerate})`);
                break;
                
            case "Aputure MC":
                // Aputure MC is a small on-camera light with different characteristics
                // It has much shorter optimal distances (0.5m-2m instead of 3m-9m)
                const mcReferenceDistance = 1.0; // 1 meter is more appropriate for this light
                const mcReferenceLux = 100; // Much lower output than the larger fixtures
                
                // Calculate distance ratio squared
                let mcDistanceRatio = Math.pow(distance / mcReferenceDistance, 2);
                
                // Calculate intensity based on distance and exposure factor
                // Higher exposure factor = need more intensity
                intensity = mcDistanceRatio * 100 * exposureFactor;
                
                // Adjust the falloff curve to be more dramatic for this small light
                if (distance < 0.5) {
                    intensity = intensity * (distance / 0.5); // Reduce intensity when very close
                } else if (distance > 2.0) {
                    // The MC's output falls off more rapidly at longer distances due to its size
                    intensity = intensity * (1 + (distance - 2.0) * 0.3); // Increase intensity more rapidly beyond 2m
                }
                
                console.log(`Aputure MC at ${distance.toFixed(2)}m requires ${intensity.toFixed(2)}% intensity (ISO: ${this.cameraSettings.iso}, T-stop: ${this.cameraSettings.tStop}, FPS: ${this.cameraSettings.framerate})`);
                break;
                
            default:
                // Generic calculation for any other light type
                const genericReferenceDistance = 3.0;
                const genericDistanceRatio = Math.pow(distance / genericReferenceDistance, 2);
                intensity = genericDistanceRatio * 100 * exposureFactor;
                console.log(`Generic light at ${distance.toFixed(2)}m requires ${intensity.toFixed(2)}% intensity (ISO: ${this.cameraSettings.iso}, T-stop: ${this.cameraSettings.tStop}, FPS: ${this.cameraSettings.framerate})`);
        }
        
        // Cap intensity to 100%
        intensity = Math.min(100, intensity);
        
        // Set the calculated intensity
        light.intensity = Math.round(intensity * 100) / 100; // Round to 2 decimal places
        
        // Update light info display
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
            
            // Find or create option for diffusion
            let diffusionOption = Array.from(modifierSelect.options).find(opt => opt.value === light.diffusion);
            if (!diffusionOption) {
                diffusionOption = new Option(light.diffusion, light.diffusion);
                modifierSelect.add(diffusionOption);
            }
            modifierSelect.value = light.diffusion;
            
            // Find or create option for color temp
            let colorTempOption = Array.from(colorTempSelect.options).find(opt => opt.value === light.colorTemp);
            if (!colorTempOption) {
                const label = light.colorTemp === "3200K" ? "3200K (Tungsten)" : "5600K (Daylight)";
                colorTempOption = new Option(label, light.colorTemp);
                colorTempSelect.add(colorTempOption);
            }
            colorTempSelect.value = light.colorTemp;
        } else {
            // Disable controls when nothing is selected
            modifierSelect.disabled = true;
            colorTempSelect.disabled = true;
            removeButton.disabled = this.lights.length === 0;
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
        
        // For visualization purposes, use the inverse square law to calculate
        // the radius of the light effect based on intensity and distance
        // 
        // Higher intensity and shorter distance should result in a larger light radius
        // on the subject, which is actually the opposite of our light intensity calculation
        // (where we need more intensity at greater distances)
        
        // Determine color and set parameters based on light type
        let baseColor;
        let maxRadius = 250;
        let radiusScaleFactor = 1.0;
        
        switch (light.type) {
            case "ARRI SkyPanel S60-C":
                baseColor = "169, 212, 255"; // RGB for light blue
                maxRadius = 250;
                break;
            case "Aputure LS 300X":
                baseColor = "255, 214, 138"; // RGB for light amber
                maxRadius = 230;
                break;
            case "Litepanels Gemini 2x1":
                baseColor = "186, 234, 255"; // RGB for sky blue
                maxRadius = 230;
                break;
            case "Aputure MC":
                baseColor = "255, 123, 123"; // RGB for light red
                // Aputure MC is a small light with shorter range
                maxRadius = 100; // Much smaller radius for this small light
                radiusScaleFactor = 0.8; // Sharper falloff
                break;
            default:
                baseColor = "247, 195, 95"; // Default Haplon gold
        }
        
        // Base the radius on how much light would reach the subject
        // Special handling for the Aputure MC
        let radius;
        
        if (light.type === "Aputure MC") {
            // For the MC, a small light with rapid falloff
            radius = Math.sqrt(light.intensity / 100) * maxRadius / Math.pow(distance, radiusScaleFactor);
            
            // Additionally, cap the radius for the MC at closer distances
            // This represents its limited throw distance
            if (distance < 1.0) {
                radius = Math.min(radius, maxRadius * 1.0);
            } else if (distance < 1.5) {
                radius = Math.min(radius, maxRadius * 0.8);
            } else if (distance < 2.0) {
                radius = Math.min(radius, maxRadius * 0.6);
            } else {
                radius = Math.min(radius, maxRadius * 0.4);
            }
        } else {
            // Standard calculation for larger lights
            radius = Math.sqrt(light.intensity / 100) * maxRadius / Math.sqrt(distance);
        }
        
        // Draw intensity circle
        this.ctx.beginPath();
        this.ctx.arc(light.x, light.y, radius, 0, Math.PI * 2);
        
        // Create gradient based on light type with custom stops for each light
        const gradient = this.ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, radius);
        
        if (light.type === "Aputure MC") {
            // More concentrated, focused gradient for the small MC light
            gradient.addColorStop(0, `rgba(${baseColor}, 0.8)`);
            gradient.addColorStop(0.3, `rgba(${baseColor}, 0.4)`);
            gradient.addColorStop(0.6, `rgba(${baseColor}, 0.2)`);
            gradient.addColorStop(0.8, `rgba(${baseColor}, 0.1)`);
            gradient.addColorStop(1, `rgba(${baseColor}, 0)`);
        } else {
            // Standard gradient for larger lights
            gradient.addColorStop(0, `rgba(${baseColor}, 0.7)`);
            gradient.addColorStop(0.5, `rgba(${baseColor}, 0.3)`);
            gradient.addColorStop(0.8, `rgba(${baseColor}, 0.1)`);
            gradient.addColorStop(1, `rgba(${baseColor}, 0)`);
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Draw a line from the light to the subject to help visualize the connection
        this.ctx.beginPath();
        this.ctx.moveTo(light.x, light.y);
        this.ctx.lineTo(SUBJECT.x, SUBJECT.y);
        this.ctx.strokeStyle = `rgba(${baseColor}, 0.3)`;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
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
            const distance = this.calculateDistance(light).toFixed(1);
            
            const panelX = this.canvas.width - 210;
            const panelY = this.canvas.height - 100;
            const panelWidth = 200;
            const panelHeight = 90;
            
            // Panel background
            this.ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
            this.ctx.strokeStyle = '#F7C35F';
            this.ctx.lineWidth = 1;
            this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
            this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
            
            // Panel title
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillStyle = '#F7C35F';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`${light.type}`, panelX + 10, panelY + 20);
            
            // Panel info
            this.ctx.font = '12px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.fillText(`Distance: ${distance} meters`, panelX + 10, panelY + 40);
            this.ctx.fillText(`Intensity: ${Math.round(light.intensity)}%`, panelX + 10, panelY + 55);
            this.ctx.fillText(`Modifier: ${light.diffusion}`, panelX + 10, panelY + 70);
            this.ctx.fillText(`Color Temp: ${light.colorTemp}`, panelX + 10, panelY + 85);
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