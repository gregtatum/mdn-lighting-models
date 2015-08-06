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
  
  this.cameraPosition    = [0, 5, 10];
  this.color             = [0.1, 0.4, 0.7, 1.0];
  this.specularColor     = [1.0, 1.0, 1.0, 1.0];
  this.specularAmount    = 0.5;
  this.specularShininess = 50;
  
  this.light = MDN.normalize([-0.5, 1.0, 1.0]);
  
  //These matrices don't change and only need to be computed once
  this.computeProjectionMatrix();
  this.computeViewMatrix();
  //the model matrix gets re-computed every draw call
  
  this.addDatGui();
  
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
    model             : gl.getUniformLocation(this.webglProgram, "model"),
    view              : gl.getUniformLocation(this.webglProgram, "view"),
    projection        : gl.getUniformLocation(this.webglProgram, "projection"),
    normalMatrix      : gl.getUniformLocation(this.webglProgram, "normalMatrix"),
    color             : gl.getUniformLocation(this.webglProgram, "color"),
    specularColor     : gl.getUniformLocation(this.webglProgram, "specularColor"),
    light             : gl.getUniformLocation(this.webglProgram, "light"),
    cameraPosition    : gl.getUniformLocation(this.webglProgram, "cameraPosition"),
    ambientLight      : gl.getUniformLocation(this.webglProgram, "ambientLight"),
    specularAmount    : gl.getUniformLocation(this.webglProgram, "specularAmount"),
    specularShininess : gl.getUniformLocation(this.webglProgram, "specularShininess"),
    
    // Save the attribute location
    position          : gl.getAttribLocation(this.webglProgram, "position"),
    normal            : gl.getAttribLocation(this.webglProgram, "normal")
  }
  
  return locations;
};

BunnyDemo.prototype.computeViewMatrix = function() {
  
  // Move the camera so that the bunny is in view
  var view = MDN.translateMatrix(
	  this.cameraPosition[0],
	  this.cameraPosition[1],
	  this.cameraPosition[2]
  );
  
  var inverse = MDN.invertMatrix(view);
  
  //Save as a typed array so that it can be sent to the GPU
  this.transforms.view = new Float32Array(inverse);
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

BunnyDemo.prototype.computeNormalMatrix = function() {
  
  //Combine the view and the model together
  var modelView = MDN.multiplyMatrices(this.transforms.view, this.transforms.model);
  
  // Run the function from the shared/matrices.js that takes
  // the inverse and then transpose of the provided matrix
  // and returns a 3x3 matrix.
  this.transforms.normalMatrix = MDN.normalMatrix(this.transforms.model)
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
  gl.uniformMatrix3fv(this.locations.normalMatrix, false, this.transforms.normalMatrix);
  gl.uniform4fv(this.locations.color, this.color);
  gl.uniform4fv(this.locations.specularColor, this.specularColor);
  gl.uniform3fv(this.locations.light, this.light);
  gl.uniform3fv(this.locations.cameraPosition, this.cameraPosition);
  gl.uniform1f(this.locations.specularAmount, this.specularAmount);
  gl.uniform1f(this.locations.specularShininess, this.specularShininess);
  
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

BunnyDemo.prototype.addDatGui = function() {
  
  // For the demo, add an interface to live-tweak the values

  var light = {
    lightDirectionX : this.light[0],
    lightDirectionY : this.light[1],
    lightDirectionZ : this.light[2]
  };
  
  var syncWithUniforms = function() {
    
    if( light.lightDirectionX === 0 && light.lightDirectionY === 0 && light.lightDirectionZ === 0 ) {
      light.lightDirectionY = -1;
    }
    this.light = MDN.normalize([
      light.lightDirectionX,
      light.lightDirectionY,
      light.lightDirectionZ
    ]);
    light.lightDirectionX = this.light[0];
    light.lightDirectionY = this.light[1];
    light.lightDirectionZ = this.light[2];
    
  }.bind(this);
  
  var gui = new dat.GUI();
  
  gui.add(light, "lightDirectionX").min(-1).max(1).onChange(syncWithUniforms);
  gui.add(light, "lightDirectionY").min(-1).max(1).onChange(syncWithUniforms);
  gui.add(light, "lightDirectionZ").min(-1).max(1).onChange(syncWithUniforms);

  // Dat.gui expects colors to be 0-255
  function to255(c) {
    return [c[0]*255, c[1]*255, c[2]*255, c[3]*255];
  }
  
  function from255(c) {
    return [c[0]/255, c[1]/255, c[2]/255, c[3]/255];
  }
  
  var colors = {
    diffuseColor : to255(this.color),
    specularColor : to255(this.specularColor)
  }

  gui.addColor(colors, "diffuseColor").onChange(function() {
    this.color = from255(colors.diffuseColor);
  }.bind(this))
  
  gui.addColor(colors, "specularColor").onChange(function() {
    this.specularColor = from255(colors.specularColor);
  }.bind(this))
    
  gui.add(this, "specularAmount").min(0).max(10);
  gui.add(this, "specularShininess").min(1).max(100);
  
};

//Run the code
var bunnyDemo = new BunnyDemo();
bunnyDemo.draw();