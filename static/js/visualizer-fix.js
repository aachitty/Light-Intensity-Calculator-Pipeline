/**
 * Simplified 2D Lighting Visualizer Fix
 * 
 * This is a diagnostic version to isolate and fix rendering issues.
 */

// Create a simple function to test canvas rendering
function testCanvasRendering() {
    console.log('Testing canvas rendering - simplified version');
    
    // Update the debug panel
    const debugPanel = document.getElementById('canvas-debug');
    if (debugPanel) {
        debugPanel.innerHTML = '<p>Starting canvas rendering test...</p>';
    }
    
    // Get the canvas directly
    const canvas = document.getElementById('lighting-canvas');
    if (!canvas) {
        console.error('Cannot find lighting-canvas element');
        if (debugPanel) {
            debugPanel.innerHTML += '<p class="text-danger">ERROR: Cannot find lighting-canvas element</p>';
        }
        return;
    }
    
    // Get the 2D context and check if it exists
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Cannot get 2D context from canvas');
        if (debugPanel) {
            debugPanel.innerHTML += '<p class="text-danger">ERROR: Cannot get 2D context from canvas</p>';
        }
        return;
    }
    
    const dimensions = `Canvas dimensions: ${canvas.width}x${canvas.height}`;
    console.log(dimensions);
    if (debugPanel) {
        debugPanel.innerHTML += `<p>${dimensions}</p>`;
    }
    
    try {
        // Clear the canvas with a solid color to make sure drawing works
        ctx.fillStyle = '#222222';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        console.log('Basic background fill completed');
        if (debugPanel) {
            debugPanel.innerHTML += '<p class="text-success">Background fill completed ✓</p>';
        }
        
        // Draw a simple shape to test rendering
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(canvas.width/2, canvas.height/2, 50, 0, Math.PI * 2);
        ctx.fill();
        console.log('Red circle drawn in center');
        if (debugPanel) {
            debugPanel.innerHTML += '<p class="text-success">Red circle drawn in center ✓</p>';
        }
        
        // Draw some text
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VISUALIZER TEST', canvas.width/2, canvas.height/2 + 80);
        console.log('Text drawn');
        if (debugPanel) {
            debugPanel.innerHTML += '<p class="text-success">Text drawing successful ✓</p>';
            debugPanel.innerHTML += '<p class="mt-2">Canvas rendering test completed successfully.</p>';
        }
    } catch (e) {
        console.error('Error during canvas rendering:', e);
        if (debugPanel) {
            debugPanel.innerHTML += `<p class="text-danger">ERROR during rendering: ${e.message}</p>`;
        }
    }
}

// Simple initialization function that bypasses the complex LightingVisualizer class
function initSimpleVisualizer() {
    console.log('Initializing simple visualizer test');
    
    // Add a test button to manually trigger rendering
    const container = document.querySelector('.visualizer-container');
    if (!container) {
        console.error('Cannot find visualizer container');
        return;
    }
    
    // Create a test render button
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Render';
    testButton.className = 'btn btn-danger mt-2 me-2';
    testButton.onclick = testCanvasRendering;
    container.appendChild(testButton);
    
    // Create a debug info div
    const debugInfo = document.createElement('div');
    debugInfo.className = 'mt-3 p-2 bg-dark text-light rounded';
    debugInfo.innerHTML = `
        <h6>Canvas Debug Info:</h6>
        <div id="canvas-debug">Click "Test Render" to see debug info</div>
    `;
    container.appendChild(debugInfo);
    
    // Run the test automatically
    setTimeout(testCanvasRendering, 300);
}

// Run simple visualizer on page load
window.addEventListener('load', function() {
    console.log('Visualizer fix script loaded');
    
    // Wait a bit for DOM to fully load
    setTimeout(() => {
        // Check if we're on the visualizer tab
        if (document.querySelector('#visualizer-tab').classList.contains('active')) {
            console.log('On visualizer tab, running simple visualizer');
            initSimpleVisualizer();
        } else {
            console.log('Not on visualizer tab, waiting for tab switch');
            
            // Add tab switch detection
            document.querySelectorAll('.nav-link').forEach(tab => {
                tab.addEventListener('shown.bs.tab', function(e) {
                    if (e.target.id === 'visualizer-tab') {
                        console.log('Switched to visualizer tab, initializing');
                        initSimpleVisualizer();
                    }
                });
            });
        }
    }, 500);
});