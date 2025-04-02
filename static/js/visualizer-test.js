/**
 * Simple testing script for the 2D visualizer
 * This provides basic drawing functions to test if the canvas is working
 */

// Function to test basic canvas drawing
function testCanvasDrawing() {
    console.log('Running canvas drawing test');
    
    const canvas = document.getElementById('lighting-canvas');
    if (!canvas) {
        console.error('Cannot find lighting-canvas element');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Cannot get 2D context from canvas');
        return;
    }
    
    console.log(`Test canvas size: ${canvas.width}x${canvas.height}`);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw a grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    
    const gridSize = 50;
    
    // Draw vertical grid lines
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Draw horizontal grid lines
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Draw center subject
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const subjectRadius = 25;
    
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(centerX, centerY, subjectRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw text
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TEST SUBJECT', centerX, centerY + subjectRadius + 20);
    
    // Draw a test light
    const lightX = centerX + 150;
    const lightY = centerY;
    const lightRadius = 20;
    
    // Draw light glow
    const gradient = ctx.createRadialGradient(
        lightX, lightY, 0,
        lightX, lightY, lightRadius * 2
    );
    gradient.addColorStop(0, 'rgba(255, 200, 120, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(lightX, lightY, lightRadius * 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw light body
    ctx.fillStyle = 'rgb(255, 200, 120)';
    ctx.strokeStyle = '#F7C35F';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lightX, lightY, lightRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw line from light to subject
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(lightX, lightY);
    ctx.lineTo(centerX, centerY);
    ctx.stroke();
    
    console.log('Canvas drawing test completed');
}

// Add a button to manually test the visualizer
function addTestButton() {
    const container = document.querySelector('.visualizer-container');
    if (!container) {
        console.error('Cannot find visualizer container');
        return;
    }
    
    const button = document.createElement('button');
    button.textContent = 'Test Visualizer';
    button.className = 'btn btn-warning mt-2';
    button.onclick = testCanvasDrawing;
    
    container.appendChild(button);
    console.log('Test button added');
}

// Add our test functions to window load event
window.addEventListener('load', function() {
    console.log('Visualizer test script loaded');
    
    // Wait a bit for everything to load
    setTimeout(() => {
        addTestButton();
        
        // Check if we're on the visualizer tab and run the test
        if (document.querySelector('#visualizer-tab').classList.contains('active')) {
            console.log('On visualizer tab, running test');
            testCanvasDrawing();
        }
    }, 500);
});