/*
  The key to taking a flat shaded model and transforming it into a lit
  one lies in the user of a normal vector. The normal vector is a
  normalized vector (a vector with the length of one) that is
  perpendicular to the surface of the object.

  The bunny model has these values pre-calculated, but they can be
  calculated on the fly. There are typically two basic approaches.
  The first is to calculate the vertex normals. At each vertex
  the normal is calculated. The shader then smooths these out for
  each fragment creating a nicely smoothed surface.

  The next way to do this is with face normals. These normals are
  calculated once per triangle. The three vertices of the triangle
  then share the same normal values. Each triangle is flat when
  shaded and is not smoothed from its neighbors.

  At this point the shader accomplishes some pseudo-lighting by
  assigning the color to the normal itself. The only transformation
  is that the normal's three dimensions are in the range of -1 to 1.
  The shader will transform the normal to be in the range of 0 to 1
  in order to work as a color.
*/

// A utility function to make a vector have a length of 1
function normalize( vector ) {
  
  var length = Math.sqrt(
    vector[0] * vector[0] +
    vector[1] * vector[1] +
    vector[2] * vector[2]
  )
  
  return [
    vector[0] / length,
    vector[1] / length,
    vector[2] / length
  ]
}

function BunnyDemo () {
  
  // Prep the canvas
  this.canvas = document.getElementById("canvas");
  this.canvas.width = window.innerWidth;
  this.canvas.height = window.innerHeight;
  
  // Grab a context
  this.gl = createContext(this.canvas);

  this.webglProgram = this.setupProgram();
  this.buffers = this.createBuffers();
  this.locations = this.createLocations();
  this.transforms = {}; // All of the matrix transforms get saved here
  
  this.color = [0.0, 0.4, 0.7, 1.0];
  
  this.lightIntensity = 2;
  this.lights = {
    spot : normalize([-0.5, 1.0, 0.2]), // from the front left and down
    fill : normalize([0.8, 0.2, -1.0]), // point straight down
    back : normalize([0.5, -0.2, 1.0])  // back light
  };
  
  //These matrices don't change and only need to be computed once
  this.computeProjectionMatrix();
  this.computeViewMatrix();
  //the model matrix gets re-computed every draw call
  
  // Start the drawing loop
  this.draw();
}

BunnyDemo.prototype.createBuffers = function() {
  
  var gl = this.gl;
  
  // See /shared/bunny-model.js for the array buffers referenced by bunnyModel.positions and bunnyModel.elements
  
  var positionsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, bunnyModel.positions, gl.STATIC_DRAW);

  var normalsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, bunnyModel.vertexNormals, gl.STATIC_DRAW);
  
  var elementsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementsBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, bunnyModel.elements, gl.STATIC_DRAW);
  
  return {
    positions: positionsBuffer,
    elements: elementsBuffer,
    normals: normalsBuffer
  }
  
};

BunnyDemo.prototype.setupProgram = function() {
  
  var gl = this.gl;
    
  // Setup a WebGL program
  var webglProgram = createWebGLProgramFromIds(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(webglProgram);

  // Tell WebGL to test the depth when drawing
  gl.enable(gl.DEPTH_TEST);
  
  return webglProgram;
};

BunnyDemo.prototype.createLocations = function() {
  
  var gl = this.gl;
  
  var locations = {
    
    // Save the uniform locations
    model          : gl.getUniformLocation(this.webglProgram, "model"),
    view           : gl.getUniformLocation(this.webglProgram, "view"),
    projection     : gl.getUniformLocation(this.webglProgram, "projection"),
    normalMatrix   : gl.getUniformLocation(this.webglProgram, "normalMatrix"),
    color          : gl.getUniformLocation(this.webglProgram, "color"),
    spotLight      : gl.getUniformLocation(this.webglProgram, "spotLight"),
    fillLight      : gl.getUniformLocation(this.webglProgram, "fillLight"),
    backLight      : gl.getUniformLocation(this.webglProgram, "backLight"),
    lightIntensity : gl.getUniformLocation(this.webglProgram, "lightIntensity"),
    
    // Save the attribute location
    position       : gl.getAttribLocation(this.webglProgram, "position"),
    normal         : gl.getAttribLocation(this.webglProgram, "normal")
  }
  
  return locations;
};

BunnyDemo.prototype.computeViewMatrix = function() {
  
  // Move the camera back and down so that the bunny is in view
  var view = translateMatrix(0, -5, -10);
  
  //Save as a typed array so that it can be sent to the GPU
  this.transforms.view = new Float32Array(view);
}

BunnyDemo.prototype.computeProjectionMatrix = function() {
  
  var fieldOfViewInRadians      = Math.PI * 0.5;
  var aspectRatio               = window.innerWidth / window.innerHeight;
  var nearClippingPlaneDistance = 1;
  var farClippingPlaneDistance  = 200;
  
  var projection = perspectiveMatrix(
    fieldOfViewInRadians,
    aspectRatio,
    nearClippingPlaneDistance,
    farClippingPlaneDistance
  );
  
  //Save as a typed array so that it can be sent to the GPU
  this.transforms.projection = new Float32Array(projection);
  
};

BunnyDemo.prototype.computeModelMatrix = function( now ) {
  
  // Rotate according to time
  var model = rotateYMatrix( now * 0.0005 )
  
  //Save as a typed array so that it can be sent to the GPU
  this.transforms.model = new Float32Array( model );
  
  /*
    Performance caveat: in real production code it's best to re-use
    objects and arrays. It's best not to create new arrays and objects
    in a loop. This example chooses code clarity over performance.
  */
};

BunnyDemo.prototype.computeNormalMatrix = function() {
  
  //Combine the view and the model together
  var modelView = multiplyMatrices(this.transforms.view, this.transforms.model);
  
  // Run the function from the shared/matrices.js that takes
  // the inverse and then transpose of the provided matrix
  // and returns a 3x3 matrix.
  this.transforms.normalMatrix = normalMatrix(modelView)
};

BunnyDemo.prototype.draw = function() {
  
  var gl = this.gl;
  var now = Date.now();
  
  // Compute our model matrix
  this.computeModelMatrix( now );
  this.computeNormalMatrix();
  
  // Update the data going to the GPU
  this.updateAttributesAndUniforms();
  
  // Perform the actual draw
  gl.drawElements(gl.TRIANGLES, bunnyModel.elements.length, gl.UNSIGNED_SHORT, 0);

  // Run the draw as a loop
  requestAnimationFrame( this.draw.bind(this) );
};

BunnyDemo.prototype.updateAttributesAndUniforms = function() {

  var gl = this.gl;
  
  // Set the uniforms
  gl.uniformMatrix4fv(this.locations.projection, false, this.transforms.projection);
  gl.uniformMatrix4fv(this.locations.view, false, this.transforms.view);
  gl.uniformMatrix4fv(this.locations.model, false, this.transforms.model);
  gl.uniformMatrix3fv(this.locations.normalMatrix, false, this.transforms.normalMatrix);
  gl.uniform4fv(this.locations.color, this.color);
  gl.uniform3fv(this.locations.spotLight, this.lights.spot);
  gl.uniform3fv(this.locations.fillLight, this.lights.fill);
  gl.uniform3fv(this.locations.backLight, this.lights.back);
  gl.uniform1f(this.locations.lightIntensity, this.lightIntensity);
  
  // Set the positions attribute
  gl.enableVertexAttribArray(this.locations.position);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.positions);
  gl.vertexAttribPointer(this.locations.position, 3, gl.FLOAT, false, 0, 0);
  
  // Set the normals attribute
  gl.enableVertexAttribArray(this.locations.normal);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normals);
  gl.vertexAttribPointer(this.locations.normal, 3, gl.FLOAT, false, 0, 0);
  
  // Set the elements array, or the order the positions will be drawn
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.elements );
  
};

//Run the code
var bunnyDemo = new BunnyDemo();
bunnyDemo.draw();