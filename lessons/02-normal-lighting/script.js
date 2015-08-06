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

  Exercise:

    * Combine the existing color uniform with the normal in the
      fragment shader to change the color of the model. The overall
      brightness of the color will most likely need to be dimmed.
*/

function BunnyDemo () {
  
  // Prep the canvas
  this.canvas = document.getElementById("canvas");
  this.canvas.width = window.innerWidth;
  this.canvas.height = window.innerHeight;
  
  // Grab a context
  this.gl = MDN.createContext(this.canvas);

  this.webglProgram = this.setupProgram();
  this.buffers = this.createBuffers();
  this.locations = this.createLocations();
  this.transforms = {}; // All of the matrix transforms get saved here
  
  this.color = [0.0, 0.4, 0.7, 1.0];
  
  //These matrices don't change and only need to be computed once
  this.computeProjectionMatrix();
  this.computeViewMatrix();
  //the model matrix gets re-computed every draw call
  
  // Start the drawing loop
  this.draw();
}

BunnyDemo.prototype.createBuffers = function() {
  
  var gl = this.gl;
  
  // See /shared/bunny-model.js for the array buffers referenced by MDN.bunnyModel.positions and MDN.bunnyModel.elements
  
  var positionsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, MDN.bunnyModel.positions, gl.STATIC_DRAW);

  var normalsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, MDN.bunnyModel.vertexNormals, gl.STATIC_DRAW);
  
  var elementsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementsBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, MDN.bunnyModel.elements, gl.STATIC_DRAW);
  
  return {
    positions: positionsBuffer,
    elements: elementsBuffer,
    normals: normalsBuffer
  }
  
};

BunnyDemo.prototype.setupProgram = function() {
  
  var gl = this.gl;
    
  // Setup a WebGL program
  var webglProgram = MDN.createWebGLProgramFromIds(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(webglProgram);

  // Tell WebGL to test the depth when drawing
  gl.enable(gl.DEPTH_TEST);
  
  return webglProgram;
};

BunnyDemo.prototype.createLocations = function() {
  
  var gl = this.gl;
  
  var locations = {
    
    // Save the uniform locations
    model      : gl.getUniformLocation(this.webglProgram, "model"),
    view       : gl.getUniformLocation(this.webglProgram, "view"),
    projection : gl.getUniformLocation(this.webglProgram, "projection"),
    color      : gl.getUniformLocation(this.webglProgram, "color"),
  
    // Save the attribute location
    position   : gl.getAttribLocation(this.webglProgram, "position"),
    normal     : gl.getAttribLocation(this.webglProgram, "normal")
  }
  
  return locations;
};

BunnyDemo.prototype.computeViewMatrix = function() {
  
  // Move the camera so that the bunny is in view
  var view = MDN.invertMatrix(
    MDN.translateMatrix(0, 5, 10)
  );
  
  //Save as a typed array so that it can be sent to the GPU
  this.transforms.view = new Float32Array(view);
}

BunnyDemo.prototype.computeProjectionMatrix = function() {
  
  var fieldOfViewInRadians      = Math.PI * 0.5;
  var aspectRatio               = window.innerWidth / window.innerHeight;
  var nearClippingPlaneDistance = 1;
  var farClippingPlaneDistance  = 200;
  
  var projection = MDN.perspectiveMatrix(
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
  var model = MDN.rotateYMatrix( now * 0.0005 )
  
  //Save as a typed array so that it can be sent to the GPU
  this.transforms.model = new Float32Array( model );
  
  /*
    Performance caveat: in real production code it's best to re-use
    objects and arrays. It's best not to create new arrays and objects
    in a loop. This example chooses code clarity over performance.
  */
};

BunnyDemo.prototype.draw = function() {
  
  var gl = this.gl;
  var now = Date.now();
  
  // Compute our model matrix
  this.computeModelMatrix( now );
  
  // Update the data going to the GPU
  this.updateAttributesAndUniforms();
  
  // Perform the actual draw
  gl.drawElements(gl.TRIANGLES, MDN.bunnyModel.elements.length, gl.UNSIGNED_SHORT, 0);

  // Run the draw as a loop
  requestAnimationFrame( this.draw.bind(this) );
};

BunnyDemo.prototype.updateAttributesAndUniforms = function() {

  var gl = this.gl;
  
  // Set the uniforms
  gl.uniformMatrix4fv(this.locations.projection, false, this.transforms.projection);
  gl.uniformMatrix4fv(this.locations.view, false, this.transforms.view);
  gl.uniformMatrix4fv(this.locations.model, false, this.transforms.model);
  gl.uniform4fv(this.locations.color, this.color);
  
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