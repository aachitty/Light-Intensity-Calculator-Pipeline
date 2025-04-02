/**
 * 2D Lighting Visualizer (Fixed Version)
 * For Haplon Light Intensity Calculator
 * 
 * This script provides an interactive 2D visualization of lighting setups,
 * allowing users to place and move lights around a subject and see real-time
 * calculations of intensity and exposure.
 * 
 * This version includes fixes for rendering issues identified in previous versions.
 */

class LightingVisualizer {
    constructor(canvasId, lightData) {
        console.log('Initializing LightingVisualizer with canvas ID:', canvasId);
        
        // Get the canvas element
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas element with id ${canvasId} not found`);
            return;
        }
        
        // Force set canvas dimensions if they're not already set
        if (this.canvas.width === 0 || this.canvas.height === 0) {
            console.log('Setting default canvas dimensions');
            this.canvas.width = 600;
            this.canvas.height = 400;
        }
        
        // Log actual canvas dimensions
        console.log(`Canvas dimensions: ${this.canvas.width}x${this.canvas.height}`);
        
        // Get 2D context and verify it exists
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error('Unable to get 2D context from canvas');
            return;
        }
        
        // Store lighting data
        this.lightData = lightData;
        
        // Initialize state variables
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
        
        // Set up event listeners
        this.initEventListeners();
        
        // Perform initial render with timing for debugging
        console.log('Performing initial render');
        this.render();
        
        console.log('LightingVisualizer initialization complete');
    }
    
    // Set up all event listeners for canvas interaction
    initEventListeners() {
        console.log('Setting up event listeners');
        
        // Mouse down event for selecting lights
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.lastMousePos = { x, y };
            
            // Check if clicked on a light
            let clickedLight = null;
            for (let i = this.lights.length - 1; i >= 0; i--) {
                const light = this.lights[i];
                const dx = light.x - x;
                const dy = light.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= light.radius) {
                    clickedLight = light;
                    break;
                }
            }
            
            if (clickedLight) {
                this.selectedLight = clickedLight;
                this.isDragging = true;
                
                // Update the light properties display
                this.updateLightPropertiesDisplay(clickedLight);
                
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
                
                // Update the last mouse position
                this.lastMousePos = { x, y };
                
                // Update the distance calculation
                this.updateLightDistance(this.selectedLight);
                
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
        
        // Setup add/remove light buttons
        const addBtn = document.getElementById('add-light-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                // Get current selections from the form
                const lightModel = document.getElementById('light-model-selector').value;
                const modifierType = document.getElementById('modifier-selector').value;
                const colorTemp = document.getElementById('color-temp-selector').value;
                
                // Default intensity
                const intensity = 70;
                
                this.addLight(lightModel, modifierType, colorTemp, intensity);
            });
        } else {
            console.error('Add light button not found');
        }
        
        const removeBtn = document.getElementById('remove-light-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                if (this.selectedLight) {
                    this.removeLight(this.selectedLight.id);
                }
            });
        } else {
            console.error('Remove light button not found');
        }
    }
    
    // Add a new light to the scene
    addLight(lightModel, modifierType, colorTemp, intensity) {
        const id = ++this.lightIdCounter;
        const light = {
            id,
            model: lightModel,
            modifierType,
            colorTemp,
            intensity,
            x: this.subject.x + 200, // Place it to the right of the subject
            y: this.subject.y,
            radius: 20,
            color: this.getLightColor(colorTemp),
            distance: 0, // Will be calculated
            requiredIntensity: 0 // Will be calculated
        };
        
        // Calculate the distance from subject
        this.updateLightDistance(light);
        
        // Add to lights array
        this.lights.push(light);
        
        // Select the new light
        this.selectedLight = light;
        
        // Update UI
        this.updateLightPropertiesDisplay(light);
        
        // Redraw
        this.render();
        
        return id;
    }
    
    // Remove a light from the scene
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
    
    // Update a light's properties
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
    
    // Get a color based on color temperature
    getLightColor(colorTemp) {
        if (colorTemp === '3200K') {
            return 'rgb(255, 200, 120)'; // Warm tungsten
        } else if (colorTemp === '5600K') {
            return 'rgb(200, 220, 255)'; // Cool daylight
        } else {
            return 'rgb(230, 230, 230)'; // Neutral
        }
    }
    
    // Update a light's distance from the subject
    updateLightDistance(light) {
        // Calculate distance from subject in pixels
        const dx = light.x - this.subject.x;
        const dy = light.y - this.subject.y;
        const distancePixels = Math.sqrt(dx * dx + dy * dy);
        
        // Convert pixels to meters based on our scale (gridSize = 1 meter)
        const distanceMeters = distancePixels / this.gridSize;
        light.distance = Math.round(distanceMeters * 100) / 100; // Round to 2 decimal places
        
        // Update the UI with the new distance
        this.updateLightPropertiesDisplay(light);
        
        // Calculate the required intensity based on the distance
        this.calculateRequiredIntensity(light);
    }
    
    // Calculate required intensity based on distance
    calculateRequiredIntensity(light) {
        // Example calculation using inverse square law
        // In a real app, this would call an API endpoint to do proper calculations
        try {
            // Make an API call to calculate the required intensity
            const formData = new FormData();
            formData.append('t_stop', document.getElementById('t-stop').value || '4');
            formData.append('iso', document.getElementById('iso').value || '800');
            formData.append('framerate', document.getElementById('framerate').value || '24');
            formData.append('light_model', light.model);
            formData.append('modifier_type', light.modifierType);
            formData.append('color_temp', light.colorTemp);
            formData.append('preferred_distance', light.distance);
            
            fetch('/calculate', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    light.requiredIntensity = data.intensity;
                    // Update UI with calculated intensity
                    this.updateLightPropertiesDisplay(light);
                } else {
                    console.error('Error calculating intensity:', data.error);
                }
            })
            .catch(error => {
                console.error('API error:', error);
            });
        } catch (e) {
            console.error('Error in calculateRequiredIntensity:', e);
        }
    }
    
    // Update the UI to display light properties
    updateLightPropertiesDisplay(light) {
        if (!light) return;
        
        const resultsElement = document.getElementById('visualizer-results');
        if (!resultsElement) {
            console.error('Results element not found');
            return;
        }
        
        resultsElement.innerHTML = `
            <h5>Light Properties</h5>
            <p><strong>Model:</strong> ${light.model}</p>
            <p><strong>Modifier:</strong> ${light.modifierType}</p>
            <p><strong>Color Temp:</strong> ${light.colorTemp}</p>
            <p><strong>Distance:</strong> ${light.distance} meters</p>
            <p><strong>Required Intensity:</strong> ${light.requiredIntensity ? light.requiredIntensity + '%' : 'Calculating...'}</p>
        `;
    }
    
    // Main render function
    render() {
        console.log('Rendering canvas');
        
        try {
            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw dark background
            this.ctx.fillStyle = '#222222';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
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
            
            console.log('Render complete');
        } catch (e) {
            console.error('Error during render:', e);
        }
    }
    
    // Draw the background grid
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
    
    // Draw the subject in the center
    drawSubject() {
        // Draw subject background glow
        const gradient = this.ctx.createRadialGradient(
            this.subject.x, this.subject.y, 0,
            this.subject.x, this.subject.y, this.subject.radius * 1.5
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(this.subject.x, this.subject.y, this.subject.radius * 1.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw subject
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(this.subject.x, this.subject.y, this.subject.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw label
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SUBJECT', this.subject.x, this.subject.y + this.subject.radius + 20);
    }
    
    // Draw distance rings from the subject
    drawDistanceRings() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.setLineDash([5, 5]); // Dashed lines
        
        this.distanceRings.forEach(distance => {
            const radius = distance * this.gridSize;
            
            this.ctx.beginPath();
            this.ctx.arc(this.subject.x, this.subject.y, radius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Draw distance label
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${distance}m`, this.subject.x, this.subject.y - radius - 5);
        });
        
        this.ctx.setLineDash([]); // Reset to solid lines
    }
    
    // Draw a light
    drawLight(light) {
        // Draw glow around light based on intensity
        const glowRadius = light.radius * (1 + light.intensity / 100);
        const gradient = this.ctx.createRadialGradient(
            light.x, light.y, 0,
            light.x, light.y, glowRadius
        );
        const color = light.color || 'rgb(255, 200, 120)';
        gradient.addColorStop(0, color.replace('rgb', 'rgba').replace(')', ', 0.8)'));
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(light.x, light.y, glowRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw light body
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = this.selectedLight && this.selectedLight.id === light.id 
            ? 'white'
            : color.replace('rgb', 'rgba').replace(')', ', 0.8)');
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        this.ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Draw line from light to subject if selected
        if (this.selectedLight && this.selectedLight.id === light.id) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]); // Dashed line
            this.ctx.beginPath();
            this.ctx.moveTo(light.x, light.y);
            this.ctx.lineTo(this.subject.x, this.subject.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]); // Reset to solid line
            
            // Draw distance text on the line
            const midX = (light.x + this.subject.x) / 2;
            const midY = (light.y + this.subject.y) / 2;
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${light.distance}m`, midX, midY - 10);
        }
        
        // Draw light label
        const shortName = light.model.split(' ').pop(); // Just take the last part of the model name
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(shortName, light.x, light.y + light.radius + 15);
    }
}

// Function to initialize the visualizer
function initFixedVisualizer(lightData) {
    console.log('initFixedVisualizer called with lightData:', lightData);
    
    // Update diagnostics panel
    const debugElement = document.getElementById('canvas-debug');
    if (debugElement) {
        debugElement.innerHTML = '<p class="text-info">Initializing visualizer...</p>';
    }
    
    // Clear any existing visualizer
    if (window.visualizer) {
        console.log('Clearing existing visualizer');
        window.visualizer = null;
        
        if (debugElement) {
            debugElement.innerHTML += '<p>Cleared previous visualizer instance</p>';
        }
    }
    
    try {
        // Verify canvas existence
        const canvas = document.getElementById('lighting-canvas');
        if (!canvas) {
            console.error('Canvas element not found');
            if (debugElement) {
                debugElement.innerHTML += '<p class="text-danger">ERROR: Canvas element not found</p>';
                debugElement.innerHTML += '<p>Please try reloading the page or check your browser support for HTML5 canvas.</p>';
            }
            return;
        }
        
        if (debugElement) {
            const dimensions = `Canvas dimensions: ${canvas.width}x${canvas.height}`;
            debugElement.innerHTML += `<p class="text-success">Canvas found ✓</p>`;
            debugElement.innerHTML += `<p>${dimensions}</p>`;
        }
        
        // Verify canvas context
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Cannot get 2D context');
            if (debugElement) {
                debugElement.innerHTML += '<p class="text-danger">ERROR: Cannot get 2D context</p>';
                debugElement.innerHTML += '<p>Your browser may not support the 2D canvas context.</p>';
            }
            return;
        }
        
        if (debugElement) {
            debugElement.innerHTML += '<p class="text-success">Canvas context available ✓</p>';
        }
        
        // Draw a simple test shape first to verify canvas works
        ctx.fillStyle = '#222222';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillText('Initializing visualizer...', canvas.width/2, canvas.height/2);
        
        if (debugElement) {
            debugElement.innerHTML += '<p>Basic test render completed</p>';
        }
        
        // Create a new visualizer instance
        window.visualizer = new LightingVisualizer('lighting-canvas', lightData);
        console.log('Visualizer initialized');
        
        // Update final status
        if (debugElement) {
            debugElement.innerHTML += `<p class="text-success">Visualizer successfully initialized ✓</p>`;
            debugElement.innerHTML += `
                <p class="mt-2">Status summary:</p>
                <ul>
                    <li>Canvas exists: <span class="text-success">Yes ✓</span></li>
                    <li>Canvas dimensions: ${canvas.width}x${canvas.height}</li>
                    <li>Context: <span class="text-success">Available ✓</span></li>
                    <li>Visualizer: <span class="text-success">Initialized ✓</span></li>
                </ul>
                <p class="text-secondary small">If the visualizer is still not rendering correctly, use the "Force Render Test" button above.</p>
            `;
        }
        
    } catch (e) {
        console.error('Error initializing visualizer:', e);
        
        if (debugElement) {
            debugElement.innerHTML += `<p class="text-danger">ERROR during initialization: ${e.message}</p>`;
            debugElement.innerHTML += '<p>See browser console for more details.</p>';
        }
    }
}

// Function to update a light in the visualizer
function updateLightInVisualizer(data) {
    if (window.visualizer && window.visualizer.selectedLight) {
        window.visualizer.updateLight(window.visualizer.selectedLight.id, data);
    }
}

// Initialize when this script loads
window.addEventListener('load', function() {
    console.log('2D-visualizer-fixed.js loaded');
    
    // Check if modifiersByModel is defined
    if (typeof modifiersByModel !== 'undefined') {
        // Wait a bit for DOM to fully load
        setTimeout(() => {
            // Check if we're on the visualizer tab
            if (document.querySelector('#visualizer-tab').classList.contains('active')) {
                console.log('On visualizer tab, initializing fixed visualizer');
                initFixedVisualizer(modifiersByModel);
            }
            
            // Add a handler for tab switching
            document.querySelectorAll('.nav-link').forEach(tab => {
                tab.addEventListener('shown.bs.tab', function(e) {
                    if (e.target.id === 'visualizer-tab') {
                        console.log('Switched to visualizer tab, initializing fixed visualizer');
                        initFixedVisualizer(modifiersByModel);
                    }
                });
            });
        }, 300);
    } else {
        console.error('modifiersByModel is not defined, cannot initialize visualizer');
    }
});