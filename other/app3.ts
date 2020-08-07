// Create custom engine with deterministic lockstep
// https://doc.babylonjs.com/babylon101/animations#deterministic-lockstep
const createEngine = function () {
  return new BABYLON.Engine(
    document.getElementById('renderCanvas') as HTMLCanvasElement,
    true,
    {
      deterministicLockstep: true,
      lockstepMaxSteps: 4
    },
    false);
}

// https://doc.babylonjs.com/snippets/world_axes
const showWorldAxes = function (scene: BABYLON.Scene) {
  // World axes
  const size = 100;
  const axisX = BABYLON.Mesh.CreateLines('axisX', [
    new BABYLON.Vector3(), new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0),
    new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
  ], scene);
  axisX.isPickable = false;
  axisX.color = new BABYLON.Color3(1, 0, 0);
  const axisY = BABYLON.Mesh.CreateLines('axisY', [
    new BABYLON.Vector3(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(-0.05 * size, size * 0.95, 0),
    new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(0.05 * size, size * 0.95, 0)
  ], scene);
  axisY.isPickable = false;
  axisY.color = new BABYLON.Color3(0, 1, 0);
  const axisZ = BABYLON.Mesh.CreateLines('axisZ', [
    new BABYLON.Vector3(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3(0, -0.05 * size, size * 0.95),
    new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3(0, 0.05 * size, size * 0.95)
  ], scene);
  axisZ.isPickable = false;
  axisZ.color = new BABYLON.Color3(0, 0, 1);
}

class Playground {
  public static CreateScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): BABYLON.Scene {
    const scene = new BABYLON.Scene(engine);

    showWorldAxes(scene);

    // Physics
    const physEngine = new BABYLON.CannonJSPlugin();
    scene.enablePhysics(new BABYLON.Vector3(0, -9.8, 0), new BABYLON.CannonJSPlugin());
    physEngine.setTimeStep(1/60);

    const camera = new BABYLON.ArcRotateCamera('', 0, Math.PI / 3, 5, new BABYLON.Vector3(), scene);
    camera.attachControl(canvas, false);

    const light = new BABYLON.HemisphericLight('', new BABYLON.Vector3(0, 10, 0), scene);
    light.intensity = 0.8;

    // Ground (white)
    const ground = BABYLON.MeshBuilder.CreateBox('', { width: 6, height: 1, depth: 10 }, scene);
    ground.position.y -= 0.5;

    ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground,
      BABYLON.PhysicsImpostor.BoxImpostor, {
      mass: 0
    }, scene);

    // Wall (green or red)
    const wall = BABYLON.MeshBuilder.CreateBox('', { width: 0.1, height: 2, depth: 10 }, scene);
    wall.position.x -= 3;
    wall.position.y += 1;
    // Green if not hit by bullet
    const wallMaterial = new BABYLON.StandardMaterial('', scene);
    wallMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0);
    wallMaterial.alpha = 0.5;
    // Red if hit by bullet
    const wallMaterialHit = new BABYLON.StandardMaterial('', scene);
    wallMaterialHit.diffuseColor = new BABYLON.Color3(1, 0, 0);
    wallMaterialHit.alpha = 0.5;
    wall.material = wallMaterial;

    // Player (orange)
    const player = BABYLON.MeshBuilder.CreateBox('', { width: 0.1, height: 1, depth: 0.1 }, scene);
    player.position.y += 0.5;
    const playerMaterial = new BABYLON.StandardMaterial('', scene);
    playerMaterial.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
    playerMaterial.alpha = 0.5;
    player.material = playerMaterial;

    // Gun muzzle where bullets are generated (red)
    const gunMuzzle = BABYLON.MeshBuilder.CreateBox('', { size: 0.1 }, scene);
    const gunMuzzleMaterial = new BABYLON.StandardMaterial('', scene);
    gunMuzzleMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
    gunMuzzleMaterial.alpha = 0.5;
    gunMuzzle.material = gunMuzzleMaterial;

    gunMuzzle.setParent(player);
    gunMuzzle.position.y += 1;

    // Camera target for ArcRotateCamera (purple)
    const cameraTarget = BABYLON.MeshBuilder.CreateBox('', { size: 0.1 }, scene);
    const cameraTargetMaterial = new BABYLON.StandardMaterial('', scene);
    cameraTargetMaterial.diffuseColor = new BABYLON.Color3(0.5, 0, 0.5);
    cameraTargetMaterial.alpha = 0.25;
    cameraTarget.material = cameraTargetMaterial;
    cameraTarget.isPickable = false;
    cameraTarget.setParent(player);
    cameraTarget.position = new BABYLON.Vector3(0, 0.5, 1);

    camera.lockedTarget = cameraTarget;

    // All bullets
    const bullets = new Array<{
      bullet: BABYLON.InstancedMesh,
      ray: BABYLON.Ray
    }>();
    
    // Bullet mesh to create instances from
    const bulletMesh = BABYLON.MeshBuilder.CreateBox('', { width: 2, height: 0.05, depth: 0.05 }, scene);
    const bulletMaterial = new BABYLON.StandardMaterial('', scene);
    bulletMaterial.diffuseColor = new BABYLON.Color3(0, 1, 1);
    bulletMesh.material = bulletMaterial;
    bulletMesh.setEnabled(false);

    let prevFireTime = 0;
    const betweenFireTime = 1000; // rate of fire
    const fire = (): void => {
      const currTime = Date.now();
      if (currTime - prevFireTime > betweenFireTime) {
        const bullet = bulletMesh.createInstance('');

        bullet.physicsImpostor = new BABYLON.PhysicsImpostor(bullet,
          BABYLON.PhysicsImpostor.NoImpostor, {
          mass: 1
        }, scene);
        // bullet.physicsImpostor.physicsBody.angularDamping = 1;

        bullet.setAbsolutePosition(gunMuzzle.getAbsolutePosition());

        const forwardDir = new BABYLON.Vector3(-1, 0, 0);

        const ray = new BABYLON.Ray(new BABYLON.Vector3(), new BABYLON.Vector3(1, 0, 0), 1);
        const rayHelper = new BABYLON.RayHelper(ray);
        rayHelper.attachToMesh(bullet, forwardDir, BABYLON.Vector3.Zero(), 1);
  
        bullet.physicsImpostor.setLinearVelocity(forwardDir.scale(75));

        bullets.push({ bullet, ray });
        
        prevFireTime = currTime;
      }
    }

    const handleBullets = (): void => {
      let isWallHit = false;
      bullets.forEach(item => {
        const { bullet, ray } = item;

        // offset by gravity to make bullet go straight
        bullet.physicsImpostor.applyForce(new BABYLON.Vector3(0, 9.8, 0),
          bullet.getAbsolutePosition());

        const pick = ray.intersectsMesh(wall, false);
        if (pick.hit) {
          isWallHit = true;
          console.log('Wall hit');
        }
      });

      if (isWallHit) {
        wall.material = wallMaterial;
      } else {
        wall.material = wallMaterialHit;
      }
    }

    const lowerFPS = (): void => {
      const junk = BABYLON.MeshBuilder.CreateBox('', { size: 1 }, scene);
      junk.position.y += 1;
      junk.position.z -= 1;
    }

    setInterval(() => {
      lowerFPS();
    }, 10);

    scene.onAfterStepObservable.add(() => {
      handleBullets();
      fire();
    });

    scene.onAfterPhysicsObservable.add(() => {
      // moveAndShoot();
    });

    scene.registerBeforeRender(() => {
      // moveAndShoot();
    });

    return scene;
  }
}