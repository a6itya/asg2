// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewProjMatrix;
  void main() {
    // note: ViewProj first, then global, then model
    gl_Position = u_ViewProjMatrix
                  * u_GlobalRotateMatrix
                  * u_ModelMatrix
                  * a_Position;
  }`;

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
}`

// --- Global Variables ---
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let u_ViewProjMatrix; // Added for completeness

const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

// UI / Shape Globals
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5;
let g_selectedType = POINT;
let g_shapesList = []; // List of shapes to render (though not used in current static drawing)

// Angle / Animation Globals
let g_globalAngle = 0;
let g_yellowAngle = 0;
let g_magentaAngle = 0;
let g_yellowAnimation = false;

// Timing / FPS Globals - NEW/MODIFIED
var g_startTime = performance.now() / 1000.0; // Start time for animation logic
var g_seconds = 0;                            // Current time in seconds for animation logic
var g_lastFrameTime = performance.now();      // Time of the last frame
var g_frameCount = 0;                         // Frame counter for FPS calculation
var g_fpsDisplay = 0;                         // Calculated FPS to display
var g_fpsUpdateTime = performance.now();      // Last time FPS was updated

// --- WebGL Setup ---
function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return false; // Indicate failure
  }
  gl.enable(gl.DEPTH_TEST);
  return true; // Indicate success
}

// --- Shader Variable Connection ---
function connectVariablesToGLSL(){
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return false; // Indicate failure
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return false; // Indicate failure
  }

  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return false; // Indicate failure
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if(!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return false; // Indicate failure
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if(!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return false; // Indicate failure
  }

  u_ViewProjMatrix = gl.getUniformLocation(gl.program, 'u_ViewProjMatrix');
   if (!u_ViewProjMatrix) {
    console.error('Failed to get the location of u_ViewProjMatrix');
    return false; // Indicate failure
  }

  // Set initial model matrix to identity
  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);

  return true; // Indicate success
}

// --- HTML UI Actions --- // MODIFIED EVENT LISTENERS
function addActionsForHtmlUi(){
  // Sliders for joint/camera control
  // Use 'input' event: Fires when the slider value changes (on drag/click)
  document.getElementById('angleSlide').addEventListener('input', function() { g_globalAngle = this.value; });
  document.getElementById('yellowSlide').addEventListener('input', function() { if (!g_yellowAnimation) { g_yellowAngle = this.value; } }); // Only update if animation is off
  document.getElementById('magentaSlide').addEventListener('input', function() { g_magentaAngle = this.value; });

  // Buttons for animation control
  document.getElementById('animationYellowOnButton').onclick = function() { g_yellowAnimation = true; };
  document.getElementById('animationYellowOffButton').onclick = function() { g_yellowAnimation = false; };

  // Mouse controls for interaction (e.g., camera or drawing)
  canvas.onmousedown = click; // Example: handle mouse click
  // Allow dragging for rotation (example)
  canvas.onmousemove = function(ev) {
      if (ev.buttons === 1) { // Check if left mouse button is pressed
          // Example drag logic: Update global angle based on mouse movement
          let movementX = ev.movementX;
          if (movementX) { // Check if movementX is available and non-zero
            g_globalAngle = g_globalAngle + movementX * 0.5; // Adjust sensitivity as needed
            // Update the slider position to match the dragged angle
            document.getElementById('angleSlide').value = g_globalAngle;
          }
          // click(ev); // If you want click logic on drag, keep this
      }
  };
}

// --- Main Function ---
function main() {
  // Setup WebGL and shaders
  if (!setupWebGL()) return;
  if (!connectVariablesToGLSL()) return;

  // Setup View Projection Matrix
  const vpMatrix = new Matrix4()
    .setPerspective(45, canvas.width / canvas.height, 0.1, 100)
    .lookAt(0, 0, 6, 0, 0, 0, 0, 1, 0); // Eye position slightly further back
  gl.uniformMatrix4fv(u_ViewProjMatrix, false, vpMatrix.elements);

  // Setup UI interactions
  addActionsForHtmlUi();

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0); // Black background

  // Start the rendering loop
  requestAnimationFrame(tick);
}

// --- Animation Loop (Tick) ---
function tick() {
  // --- Calculate Time Delta and FPS ---
  let now = performance.now();
  let delta = now - g_lastFrameTime; // Time elapsed since last frame in ms
  g_lastFrameTime = now;

  // Update FPS counter periodically (e.g., every 500ms)
  g_frameCount++;
  let timeSinceFpsUpdate = now - g_fpsUpdateTime;
  if (timeSinceFpsUpdate > 500) { // Update FPS display every 500ms
      // Prevent division by zero if timeSinceFpsUpdate is too small
      g_fpsDisplay = timeSinceFpsUpdate > 0 ? Math.round(g_frameCount * 1000 / timeSinceFpsUpdate) : 0; // Calculate FPS
      g_fpsUpdateTime = now;
      g_frameCount = 0; // Reset frame counter
  }

  // --- Update Animation State ---
  // Update g_seconds based on elapsed time since start (more stable than adding delta)
  g_seconds = (now / 1000.0) - g_startTime;
  // console.log(g_seconds); // Optional: Debugging time

  updateAnimationAngles(); // Update angles based on animation state and time

  // --- Render Scene ---
  renderAllShapes(); // Draw all elements in the scene

  // --- Update HTML Display ---
  // Display the calculated FPS (updated periodically)
  sendTextToHTML("fps: " + g_fpsDisplay, "numdot");

  // --- Request Next Frame ---
  requestAnimationFrame(tick); // Ask the browser to call tick again when ready
}

// --- Shape/Coordinate Handling ---
// var g_shapesList = []; // Defined globally already

function click(ev) {
  // Example click function - currently not drawing shapes based on clicks
  // in the blocky animal setup, but could be used for interaction.
  let [x,y] = convertCoordinatesEventToGL(ev);
  console.log("Clicked GL coords:", x, y);
  // Add shape creation logic here if needed later
}

function convertCoordinatesEventToGL(ev){
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  // Convert to WebGL coordinates (-1 to +1)
  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return([x,y]);
}

// --- Animation Logic ---
function updateAnimationAngles() {
  // Only update the yellow angle if the animation is enabled
  if (g_yellowAnimation) {
    // Use sine wave for smooth oscillation between -45 and +45 degrees
    g_yellowAngle = (45 * Math.sin(g_seconds * Math.PI)); // Adjust speed by multiplying g_seconds
  }
  // Could add animation logic for magenta angle or others here if needed
}

// --- Rendering Function ---
function renderAllShapes() {
  // Pass the matrix to u_ModelMatrix attribute
  var globalRotMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // --- Draw Robot Parts using ORIGINAL transformation logic ---

  // Draw the body cube
  var body = new Cube();
  body.color = [1.0, 0.0, 0.0, 1.0]; // Red
  body.matrix.translate(-.25, -.75, 0.0); // Original Y: -0.75
  body.matrix.rotate(-5, 1, 0, 0);
  body.matrix.scale(0.5, .3, .5);
  body.render();

  // Draw a left arm
  var leftarm = new Cube();
  leftarm.color = [1, 1, 0, 1]; // Yellow
  leftarm.matrix.setTranslate(0, -.5, 0.0); // Original position
  leftarm.matrix.rotate(-5, 1, 0, 0); // Original rotation
  leftarm.matrix.rotate(-g_yellowAngle, 0, 0, 1); // Original rotation

  var yellowCoordinatesMat = new Matrix4(leftarm.matrix); // Save the matrix *before* scaling/translating the arm itself

  leftarm.matrix.scale(0.25, .7, .5); // Original scale (Note: Z was 0.5)
  leftarm.matrix.translate(-.5, 0, 0); // Original translation
  leftarm.render();

  // Draw Head / Test box
  var box = new Cube(); // Renamed from 'head' back to 'box' for consistency with original
  box.color = [1, 0, 1, 1]; // Magenta
  box.matrix = yellowCoordinatesMat; // Start from the saved arm matrix

  // Apply original transformations for the head/box relative to the arm's matrix
  box.matrix.translate(0, 0.65, 0); // Original translation
  box.matrix.rotate(-g_magentaAngle, 0, 0, 1); // Original rotation axis (Z-axis)
  box.matrix.scale(.3, .3, .3); // Original scale
  box.matrix.translate(-.5, 0, -0.001); // Original translation
  box.render();

  // --- FPS Calculation Removed From Here ---
  // Performance metrics are now handled in tick()
}

// --- Utility Function ---
// Set the text of an HTML element
function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}
