/*
  It's time to define an actual lighting model. Arguably the simplest representation of
  a lit surface is based off of Lambert's cosine law. This law states that the brightness
  of a surface is determined by the size of the angle between the light source, and the
  surface normal. Luckily, we now have a surface normal we can work with and just need
  the light source.

  To start we'll need a normalized vector (a vector of length 1) to define another vector
  that points at our light source. This type of light simulates something like the sun
  where the light is coming in from a single direction.

  For instance we can make a light coming from different directions. Think in terms
  of starting at the origin, and creating a vector that points at the light.
*/

var lightFromAbove = [0, 1, 0];
var lightFromRight = [1, 0, 0];
var lightFromBelow = [0, -1, 0];

/*
  For convenience we can define a vector of any length greater than 0 and then normalize
  it to be of length one. There isn't a normalize function built in to JavaScript so
  we will use the MDN.normalize() function. Luckily there is one built into to GLSL (the
  shader code language.)
*/

//Define a light coming in from the top left

var lightFromTopRight = MDN.normalize([1, 1, 0]);

console.log("lightFromTopRight", lightFromTopRight) // [0.7071067811865475, 0.7071067811865475, 0]

var lightFromBottomRight = MDN.normalize([-1, 1, 0]);

console.log("lightFromBottomRight", lightFromBottomRight) // [-0.7071067811865475, 0.7071067811865475, 0]

/*
  Now all that is left is to determine the angle between the surface normal and
  the light. The easiest way to find the angle between two vectors of length
  1 is to take their dot product. Again, the dot() function already existsin GLSL,
  but we must define it in JavaScript.

  Now take a look at what types of values are returned by the dot product using
  our "lights" from above. We'll also define a ground normal that points straight
  up.
*/

function dotProduct( vectorA, vectorB ) {
  
  return (
    (vectorA[0] * vectorB[0]) +
    (vectorA[1] * vectorB[1]) +
    (vectorA[2] * vectorB[2])
  )
}

var groundNormal = [0,1,0];

console.log("cross:", dotProduct(groundNormal, lightFromAbove));
// 1

console.log("cross:", dotProduct(groundNormal, lightFromTopRight));
// 0.7071067811865475

console.log("cross:", dotProduct(groundNormal, lightFromRight));
// 0

console.log("cross:", dotProduct(groundNormal, lightFromBottomRight));
// -0.7071067811865475

console.log("cross:", dotProduct(groundNormal, lightFromBelow));
// -1

/*
  This shows that when the angle of the surface normal and light are the same,
  the value of the light is 1. As the tilt of the light moves away it reduces
  the amount of light. For the light at the top right this value is about 0.7. The light
  then moves further down to be at a right angle to our surface normal. The value
  here is 0, so no light.

  Here's where this model gets a little funky. The light from below has negative value.
  This doesn't make sense from a lighting perspective, so if the light value is negative
  it gets set to 0 in our shader.

  The rest of the bunny code should look pretty much the same, but in the fragment shader
  the light calculation ends up looking like this.

      float lightDotProduct = dot( normalize(vNormal), light );
      float surfaceBrightness = max( 0.0, lightDotProduct );
      gl_FragColor = vec4(color.xyz * surfaceBrightness, color.w);

  To break this down. First the normal passed into the fragment shader is re-normalized
  because the interpolation process between vertices can make the vector a different length.

  Next the dot product is calculated, and then set to be greater or equal to 0.

  Finally the light amount is multiplied against the RGB values of the color, and the
  gl_FragColor is set.


  Exercises:
    
    * Play around with the GUI interface to change the light direction.

    * Add variables to adjust the brightness and color of the light.

    * Advanced: This example's light value is calculated per-fragment. For a less precise
      but cheaper lighting model it's possible to calculate the surface brightness in the
      vertex shader. This value is then passed down from the vertices as a varying value
      and smoothed between the fragments. There are usually far fewer vertices than pixels
      on the screen, and so less work will need to be done.
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
    model          : gl.getUniformLocation(this.webglProgram, "model"),
    view           : gl.getUniformLocation(this.webglProgram, "view"),
    projection     : gl.getUniformLocation(this.webglProgram, "projection"),
    normalMatrix   : gl.getUniformLocation(this.webglProgram, "normalMatrix"),
    color          : gl.getUniformLocation(this.webglProgram, "color"),
    light          : gl.getUniformLocation(this.webglProgram, "light"),
    
    // Save the attribute location
    position       : gl.getAttribLocation(this.webglProgram, "position"),
    normal         : gl.getAttribLocation(this.webglProgram, "normal")
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

BunnyDemo.prototype.computeNormalMatrix = function() {
  
  //Combine the view and the model together
  var modelView = MDN.multiplyMatrices(this.transforms.view, this.transforms.model);
  
  // Run the function from the shared/matrices.js that takes
  // the inverse and then transpose of the provided matrix
  // and returns a 3x3 matrix.
  this.transforms.normalMatrix = MDN.normalMatrix(modelView)
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
  gl.uniform3fv(this.locations.light, this.light);
  
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
};

//Run the code
var bunnyDemo = new BunnyDemo();
bunnyDemo.draw();