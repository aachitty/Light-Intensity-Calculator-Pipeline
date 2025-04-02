/**
 * 2D Lighting Visualizer
 * For Haplon Light Intensity Calculator
 * 
 * This script provides an interactive 2D visualization of lighting setups,
 * allowing users to place and move lights around a subject and see real-time
 * calculations of intensity and exposure.
 */

class LightingVisualizer {
    constructor(canvasId, width, height, lightData) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas element with id ${canvasId} not found`);
            return;
        }
        
        // Set canvas size directly with attributes
        this.canvas.setAttribute('width', width || 800);
        this.canvas.setAttribute('height', height || 500);
        
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.display = 'block';
        this.lightData = lightData;
        
        console.log(`Canvas initialized with size: ${this.canvas.width}x${this.canvas.height}`);
        
        this.lights = [];
        this.selectedLight = null;
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.gridSize = 50; // Each grid square = 1 meter
        
        // Subject position (center of canvas)
        this.subject = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            radius: 25
        };
        
        // Distance rings (in meters)
        this.distanceRings = [3, 6, 9];
        
        // Unique ID counter for lights
        this.lightIdCounter = 0;
        
        this.initEventListeners();
        this.render();
        
        // Setup add/remove light buttons
        document.getElementById('add-light-btn').addEventListener('click', () => {
            // Get current selections from the form
            const lightModel = document.getElementById('light-model-selector').value;
            const modifierType = document.getElementById('modifier-selector').value;
            const colorTemp = document.getElementById('color-temp-selector').value;
            
            // Default intensity
            const intensity = 70;
            
            this.addLight(lightModel, modifierType, colorTemp, intensity);
        });
        
        document.getElementById('remove-light-btn').addEventListener('click', () => {
            if (this.selectedLight) {
                this.removeLight(this.selectedLight.id);
            }
        });
    }
    
    initEventListeners() {
        // Mouse down event for selecting or starting drag
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Check if clicked on a light
            const clickedLight = this.lights.find(light => {
                const dx = light.x - x;
                const dy = light.y - y;
                return Math.sqrt(dx * dx + dy * dy) <= light.radius;
            });
            
            if (clickedLight) {
                this.selectedLight = clickedLight;
                this.isDragging = true;
                this.lastMousePos = { x, y };
                
                // Update visualizer-results with selected light info
                this.updateLightDistance(clickedLight);
                
                // Redraw to show selection
                this.render();
            } else {
                // Deselect if clicked elsewhere
                this.selectedLight = null;
                this.render();
            }
        });
        
        // Mouse move event for dragging
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging && this.selectedLight) {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                // Calculate move delta
                const dx = x - this.lastMousePos.x;
                const dy = y - this.lastMousePos.y;
                
                // Update light position
                this.selectedLight.x += dx;
                this.selectedLight.y += dy;
                
                // Update the distance calculation
                this.updateLightDistance(this.selectedLight);
                
                // Update last mouse position
                this.lastMousePos = { x, y };
                
                // Redraw
                this.render();
            }
        });
        
        // Mouse up event for ending drag
        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
        
        // Mouse leave event (in case drag ends outside canvas)
        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });
    }
    
    addLight(lightModel, modifierType, colorTemp, intensity) {
        const id = ++this.lightIdCounter;
        const light = {
            id,
            model: lightModel,
            modifierType,
            colorTemp,
            intensity,
            x: this.subject.x + 150, // Position to the right of subject
            y: this.subject.y,
            radius: 20,
            distance: 3, // Starting distance in meters
            color: this.getLightColor(colorTemp)
        };
        
        this.lights.push(light);
        this.selectedLight = light;
        
        // Update the distance calculation
        this.updateLightDistance(light);
        
        // Redraw
        this.render();
        
        return id;
    }
    
    removeLight(lightId) {
        const index = this.lights.findIndex(light => light.id === lightId);
        if (index !== -1) {
            this.lights.splice(index, 1);
            
            // Clear selection if removed light was selected
            if (this.selectedLight && this.selectedLight.id === lightId) {
                this.selectedLight = null;
            }
            
            // Update results if no lights left
            if (this.lights.length === 0) {
                document.getElementById('visualizer-results').innerHTML = `
                    <h5>Visualizer Results</h5>
                    <p>Add lights to the scene and move them to see real-time calculations.</p>
                `;
            }
            
            // Redraw
            this.render();
        }
    }
    
    updateLight(lightId, properties) {
        const light = this.lights.find(light => light.id === lightId);
        if (light) {
            Object.assign(light, properties);
            
            // Update color if colorTemp changed
            if (properties.colorTemp) {
                light.color = this.getLightColor(properties.colorTemp);
            }
            
            // Redraw
            this.render();
        }
    }
    
    getLightColor(colorTemp) {
        // Return appropriate color based on color temperature
        if (colorTemp === '3200K') {
            return 'rgb(255, 200, 120)'; // Warm/tungsten color
        } else {
            return 'rgb(220, 240, 255)'; // Cool/daylight color
        }
    }
    
    updateLightDistance(light) {
        // Calculate distance from subject (in pixels)
        const dx = light.x - this.subject.x;
        const dy = light.y - this.subject.y;
        const distanceInPixels = Math.sqrt(dx * dx + dy * dy);
        
        // Convert to meters (based on gridSize = 1 meter)
        light.distance = (distanceInPixels / this.gridSize).toFixed(1);
        
        // Update results display
        if (this.selectedLight && this.selectedLight.id === light.id) {
            document.getElementById('visualizer-results').innerHTML = `
                <h5>Selected Light</h5>
                <div class="row">
                    <div class="col-md-6">
                        <ul class="list-unstyled">
                            <li><strong>Model:</strong> ${light.model}</li>
                            <li><strong>Modifier:</strong> ${light.modifierType}</li>
                            <li><strong>Color Temp:</strong> ${light.colorTemp}</li>
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <ul class="list-unstyled">
                            <li><strong>Distance:</strong> ${light.distance} meters</li>
                            <li><strong>Intensity:</strong> ${light.intensity}%</li>
                        </ul>
                    </div>
                </div>
                <div class="mt-2">
                    <p class="small text-muted">Drag the light to adjust its distance from the subject. 
                    The visualizer automatically calculates the required intensity based on this distance.</p>
                </div>
            `;
            
            // Auto-calculate based on the new distance
            // First, get all the current form values to pass to the calculation
            const tStop = document.getElementById('t-stop-selector').value === 'custom' 
                ? document.getElementById('custom-t-stop').value 
                : document.getElementById('t-stop-selector').value;
            const iso = document.getElementById('iso-input').value;
            const framerate = document.getElementById('framerate-input').value;
            
            // Prepare and send the calculation request
            const requestData = {
                t_stop: parseFloat(tStop),
                iso: parseInt(iso),
                framerate: parseInt(framerate),
                light_model: light.model,
                modifier_type: light.modifierType,
                color_temp: light.colorTemp,
                calc_mode: 'Specify Distance',
                preferred_distance: parseFloat(light.distance)
            };
            
            // Make API call to backend
            fetch('/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            })
            .then(response => response.json())
            .then(data => {
                // Update the light's intensity
                light.intensity = data.intensity;
                
                // Update the results display
                document.getElementById('visualizer-results').innerHTML = `
                    <h5>Selected Light</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <ul class="list-unstyled">
                                <li><strong>Model:</strong> ${light.model}</li>
                                <li><strong>Modifier:</strong> ${light.modifierType}</li>
                                <li><strong>Color Temp:</strong> ${light.colorTemp}</li>
                            </ul>
                        </div>
                        <div class="col-md-6">
                            <ul class="list-unstyled">
                                <li><strong>Distance:</strong> ${light.distance} meters</li>
                                <li><strong>Intensity:</strong> ${light.intensity}%</li>
                            </ul>
                        </div>
                    </div>
                    <div class="alert ${data.exposure_warning ? 'alert-warning' : 'alert-success'} mt-2">
                        <strong>${data.exposure_warning ? 'Warning:' : 'Success:'}</strong> 
                        ${data.exposure_warning === 'insufficient_light' ? 'Light may be too far for proper exposure.' : 
                          data.exposure_warning === 'too_much_light' ? 'Light may be too close, causing overexposure.' : 
                          'Light distance and intensity optimal for selected settings.'}
                    </div>
                `;
                
                // Update the render to reflect intensity changes
                this.render();
            })
            .catch(error => {
                console.error('Error calculating light settings:', error);
            });
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw distance rings
        this.drawDistanceRings();
        
        // Draw subject
        this.drawSubject();
        
        // Draw lights
        this.lights.forEach(light => {
            this.drawLight(light);
        });
    }
    
    drawGrid() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Draw vertical grid lines
        for (let x = 0; x < width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        
        // Draw horizontal grid lines
        for (let y = 0; y < height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }
    
    drawSubject() {
        // Draw subject (circle representing the person/object)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.beginPath();
        this.ctx.arc(this.subject.x, this.subject.y, this.subject.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add a label
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SUBJECT', this.subject.x, this.subject.y + this.subject.radius + 15);
    }
    
    drawDistanceRings() {
        // Draw distance indicator rings
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.setLineDash([5, 5]);
        
        this.distanceRings.forEach(distance => {
            const radius = distance * this.gridSize;
            
            this.ctx.beginPath();
            this.ctx.arc(this.subject.x, this.subject.y, radius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Add distance label
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${distance}m`, this.subject.x, this.subject.y - radius - 5);
        });
        
        this.ctx.setLineDash([]);
    }
    
    drawLight(light) {
        // Draw connection line from light to subject
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.moveTo(light.x, light.y);
        this.ctx.lineTo(this.subject.x, this.subject.y);
        this.ctx.stroke();
        
        // Draw light with appropriate color
        const gradient = this.ctx.createRadialGradient(
            light.x, light.y, 0,
            light.x, light.y, light.radius * 2
        );
        
        // Adjust alpha based on intensity
        const alpha = 0.3 + (light.intensity / 100) * 0.7;
        
        gradient.addColorStop(0, light.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        // Draw light glow
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(light.x, light.y, light.radius * 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw light icon
        this.ctx.fillStyle = light.color;
        this.ctx.strokeStyle = this.selectedLight && this.selectedLight.id === light.id ? '#F7C35F' : '#444';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Draw light label
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${light.model.split(' ').pop()}`, light.x, light.y - light.radius - 8);
        this.ctx.font = '9px Arial';
        this.ctx.fillText(`${light.distance}m`, light.x, light.y + light.radius + 12);
        
        // Draw small indicator inside the light
        this.ctx.fillStyle = '#222';
        this.ctx.beginPath();
        this.ctx.arc(light.x, light.y, light.radius * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
    }
}

// Function to initialize the visualizer (called when visualizer tab is shown)
function initVisualizer(lightData) {
    console.log('initVisualizer called with lightData:', lightData);
    
    // Clear any existing visualizer
    if (window.visualizer) {
        console.log('Clearing existing visualizer');
        window.visualizer = null;
    }
    
    // Get canvas container dimensions
    const container = document.querySelector('.visualizer-container');
    if (!container) {
        console.error('Cannot find visualizer container element');
        return;
    }
    
    const canvas = document.getElementById('lighting-canvas');
    if (!canvas) {
        console.error('Cannot find lighting-canvas element');
        return;
    }
    
    // Set dimensions
    const width = container.clientWidth - 20; // Accounting for padding
    const height = Math.min(500, width * 0.75); // Maintain aspect ratio
    
    console.log(`Canvas dimensions: ${width}x${height}`);
    
    // Create the visualizer
    window.visualizer = new LightingVisualizer('lighting-canvas', width, height, lightData);
    console.log('Visualizer initialized');
}

// Function to update a light in the visualizer from calculator results
function updateLightInVisualizer(data) {
    if (!window.visualizer || !window.visualizer.selectedLight) return;
    
    // Update the selected light's properties
    window.visualizer.updateLight(window.visualizer.selectedLight.id, {
        intensity: data.intensity
    });
}