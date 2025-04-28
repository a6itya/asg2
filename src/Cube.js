class Cube {

    constructor() {
        this.type = "cube";
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
    }

    render() {
        // set color & model matrix
        gl.uniform4f(u_FragColor,
          this.color[0], this.color[1],
          this.color[2], this.color[3]
        );
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
      
        // FRONT (Z=0)
        drawTriangle3D([0,0,0,  1,1,0,  1,0,0]);
        drawTriangle3D([0,0,0,  0,1,0,  1,1,0]);
      
        // BACK  (Z=1)
        drawTriangle3D([0,0,1,  1,0,1,  1,1,1]);
        drawTriangle3D([0,0,1,  1,1,1,  0,1,1]);
      
        // RIGHT (X=1)
        drawTriangle3D([1,0,0,  1,1,0,  1,1,1]);
        drawTriangle3D([1,0,0,  1,1,1,  1,0,1]);
      
        // LEFT  (X=0)
        drawTriangle3D([0,0,0,  0,0,1,  0,1,1]);
        drawTriangle3D([0,0,0,  0,1,1,  0,1,0]);
      
        // TOP   (Y=1)
        drawTriangle3D([0,1,0,  0,1,1,  1,1,1]);
        drawTriangle3D([0,1,0,  1,1,1,  1,1,0]);
      
        // BOTTOM(Y=0)
        drawTriangle3D([0,0,0,  1,0,1,  1,0,0]);
        drawTriangle3D([0,0,0,  0,0,1,  1,0,1]);
      }
    }