// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  void main() {
    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`

// Global variables
let canvas;
let gl; 
let a_Position;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_GlobalRotateMatrix;

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  // gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST);
  // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function connectVariablesToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return; 
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return; 
  }

  // Set an initial value for this matrix to identity 
  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

let g_selectedColor = [1.0, 1.0, 1.0, 1.0]; 
let g_selectedSize = 5;
let g_selectedType = POINT;
let g_globalAngle = 0;
let g_yellowAngle = 0;
let g_magentaAngle = 0;
let g_yellowAnimation = false;
// let g_segment = 10;  // segment for the circle

// Set up actions for HTML UI elements
function addActionsForHTMLUI() {

  // color slider events
  document.getElementById('redSlider').addEventListener('mouseup', function() { g_selectedColor[0] = this.value/100; });
  document.getElementById('greenSlider').addEventListener('mouseup', function()  { g_selectedColor[1] = this.value/100; });
  document.getElementById('blueSlider').addEventListener('mouseup', function() { g_selectedColor[2] = this.value/100; });

  // // pick a specific color
  // document.getElementById('colorPicker').addEventListener('input', function (e) {
  //   let hexColor = e.target.value;
  //   let rgb = hexToRgb(hexColor); // Convert to [r, g, b]
  //   g_selectedColor = [rgb.r / 255, rgb.g / 255, rgb.b / 255, 1.0];
  // });

  // // size slider event
  // document.getElementById('sizeSlider').addEventListener('mouseup', function() { g_selectedSize = this.value; });

  // // segment slider event for the circle
  // document.getElementById('segmentSlider').addEventListener('mouseup', function() { g_segment = this.value; });

  // point and triangle button event
  document.getElementById('pointButton').onclick = function() {g_selectedType=POINT};
  document.getElementById('triButton').onclick = function() {g_selectedType=TRIANGLE};
  document.getElementById('circleButton').onclick = function() {g_selectedType=CIRCLE};

  // clear button event
  document.getElementById('clearButton').onclick = function() {g_shapesList = []; renderAllShapes();};

  document.getElementById('magentaSlide').addEventListener('mousemove', function() { g_magentaAngle = this.value; renderAllShapes(); });

  document.getElementById('yellowSlide').addEventListener('mousemove', function() { g_yellowAngle = this.value; renderAllShapes(); });

  document.getElementById('animationYellowOnButton').onclick = function() {g_yellowAnimation = true };
  document.getElementById('animationYellowOffButton').onclick = function() {g_yellowAnimation = false};

  // Size Slider Event 
  document.getElementById('angleSlide').addEventListener('mousemove', function() { g_globalAngle = this.value; renderAllShapes(); });

}

function hexToRgb(hex) {
  let bigint = parseInt(hex.slice(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

function main() {
  
  // Set up canvas and gl variables
  setupWebGL();

  // Set up GLSL shader programs and connect GLSL variables
  connectVariablesToGLSL();

  // Set up actions for HTML UI elements
  addActionsForHTMLUI();
  
  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;
  canvas.onmousemove = function(ev) { if(ev.buttons == 1) { click(ev) } };

  // canvas.onmouseup = function() {
  //   g_prevMousePos = null;
  // };  

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // // Clear <canvas>
  // gl.clear(gl.COLOR_BUFFER_BIT);
  // renderAllShapes();
  requestAnimationFrame(tick);
}

var g_startTime = performance.now() / 1000.0;
var g_seconds = performance.now() / 1000.0 + g_startTime;

// Called by browser repeatedly whenever its time
function tick() {
  // Prints some debugging information to console
  g_seconds = performance.now() / 1000.0 + g_startTime;
  console.log(performance.now);

  // Update Animation Angles
  updateAnimationAngles();

  // Draw everything
  renderAllShapes();

  // Tell the browser to update again when it has time
  requestAnimationFrame(tick);
}

var g_shapesList = [];

function click(ev) {

  // Extract the event click and return it in WebGL coordinates
  let [x, y] = convertCoordinatesEventToGL(ev);

  // Create and store the new Point
  let point;

  if (g_selectedType == POINT) {
    point = new Point();
  } else if (g_selectedType == TRIANGLE) {
    point = new Triangle();
  } else {
    point = new Circle();
  }

  point.position = [x,y];
  point.color = g_selectedColor.slice();
  point.size = g_selectedSize;
  point.segments = g_segment;
  g_shapesList.push(point);

  // Draw every shape that is supposed to be in the canvas
  renderAllShapes();
}

// Extract the event click and return it in WebGL coordinates
function convertCoordinatesEventToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return([x,y]);
}

// Update the angles of everything if currently animated
function updateAnimationAngles() {
  if (g_yellowAnimation) {
    g_yellowAngle = (45 * Math.sin(g_seconds));
  }
}

// Draw every shape that is supposed to be in the canvas
function renderAllShapes() {

  // Check the time at the start of this function
  var startTime = performance.now();

  // Pass the matrix to u_ModelMatrix attribute
  var globalRotMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // // var len = g_points.length;
  // var len = g_shapesList.length;

  // for(var i = 0; i < len; i++) {
  //   g_shapesList[i].render();
  // }

  // drawTriangle3D([-1.0, 0.0, 0.0,   -0.5, -1.0, 0.0,  0.0, 0.0, 0.0]);

  // Draw the body cube
  var body = new Cube();
  body.color = [1.0, 0.0, 0.0, 1.0];
  body.matrix.translate(-.25, -.75, 0.0);
  body.matrix.rotate(-5, 1, 0, 0);
  body.matrix.scale(0.5, .3, .5); 
  body.render();

  // Draw a left arm
  var leftarm = new Cube();
  leftarm.color = [1, 1, 0, 1];
  leftarm.matrix.setTranslate(0, -.5, 0.0);
  leftarm.matrix.rotate(-5, 1, 0, 0);
  leftarm.matrix.rotate(-g_yellowAngle, 0, 0, 1);
  // leftarm.matrix.rotate(45*Math.sin(g_seconds), 0, 0, 1);

  // if (g_yellowAnimation) {
  //   leftarm.matrix.rotate(45*Math.sin(g_seconds), 0, 0, 1);
  // } else {
  //   leftarm.matrix.rotate(-g_yellowAngle, 0, 0, 1);
  // }

  var yellowCoordinatesMat = new Matrix4(leftarm.matrix);
  leftarm.matrix.scale(0.25, .7, .5);
  leftarm.matrix.translate(-.5, 0, 0);
  leftarm.render();

  // Test box
  var box = new Cube();
  box.color = [1, 0, 1, 1];
  box.matrix = yellowCoordinatesMat;
  // box.matrix.translate(0, 0.65, 0);
  // box.matrix.rotate(45, 1, 0, 0);
  // box.matrix.scale(.3, .3, .3);
  // box.matrix.translate(-5.0, -0.001);

  box.matrix.translate(0, 0.65, 0);
  box.matrix.rotate(g_magentaAngle, 0, 0, 1);
  box.matrix.scale(.3, .3, .3);
  box.matrix.translate(-.5, 0, -0.001);
  box.render();

  // Check the time at the end of the function, and show on web page
  var duration = performance.now() - startTime;
  sendTextToHTML(" ms: " + Math.floor(duration) + " fps: " + (Math.floor(1000/duration))/10, "numdot");
}

// Set the text of an HTML element
function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + "from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}