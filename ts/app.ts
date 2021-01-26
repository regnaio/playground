// How filters work: https://github.com/schteppe/cannon.js/blob/master/demos/collisionFilter.html
// How to use filters in Ammo in Babylon: https://github.com/BabylonJS/Babylon.js/pull/8028
enum CollisionFilterGroup {
  Ground = 4,
  Rock = 8
}

enum CollisionFilterMask {
  Ground = CollisionFilterGroup.Rock,
  Rock = CollisionFilterGroup.Ground
}

const createEngine = function () {
  return new BABYLON.Engine(document.getElementById('renderCanvas') as HTMLCanvasElement);
};

async function initPhysics(scene: BABYLON.Scene): Promise<void> {
  // @ts-ignore
  if (typeof Ammo === 'function') {
    // @ts-ignore
    await Ammo();
  }

  const physEngine = new BABYLON.AmmoJSPlugin();
  scene.enablePhysics(new BABYLON.Vector3(0, -9.8, 0), physEngine);

  const ground = BABYLON.MeshBuilder.CreateBox('', { width: 50, height: 1, depth: 50 }, scene);
  const groundMaterial = new BABYLON.StandardMaterial('', scene);
  groundMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
  ground.material = groundMaterial;
  ground.position.y -= 0.5;

  ground.physicsImpostor = new BABYLON.PhysicsImpostor(
    ground,
    BABYLON.PhysicsImpostor.BoxImpostor,
    {
      mass: 0,
      friction: 1,
      restitution: 0.5,
      // @ts-ignore
      group: CollisionFilterGroup.Ground,
      mask: CollisionFilterMask.Ground
    },
    scene
  );

  const rock = BABYLON.MeshBuilder.CreateBox('', { width: 1, height: 5, depth: 2 }, scene);
  const rockMaterial = new BABYLON.StandardMaterial('', scene);
  rockMaterial.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
  rock.material = rockMaterial;
  rock.position.y += 25;
  rock.rotation.x += 0.25;

  rock.physicsImpostor = new BABYLON.PhysicsImpostor(
    rock,
    BABYLON.PhysicsImpostor.BoxImpostor,
    {
      mass: 1,
      friction: 1,
      restitution: 0.5,
      // @ts-ignore
      group: CollisionFilterGroup.Rock,
      mask: CollisionFilterMask.Rock
    },
    scene
  );

  ground.physicsImpostor.registerOnPhysicsCollide(rock.physicsImpostor, () => {
    console.log('%c Ground registerOnPhysicsCollide Rock', 'color: #ff0000');
  });

  ground.physicsImpostor.onCollide = e => {
    console.log('%c Ground onCollide', 'color: #0000ff');
  };

  ground.physicsImpostor.onCollideEvent = (collider, collidedWith) => {
    console.log('%c Ground onCollideEvent', 'color: #ffff00');
  };

  rock.physicsImpostor.registerOnPhysicsCollide(ground.physicsImpostor, () => {
    console.log('%c Rock registerOnPhysicsCollide Ground', 'color: #00ff00');
  });

  rock.physicsImpostor.onCollide = e => {
    console.log('%c Rock onCollide', 'color: #ff8800');
  };

  rock.physicsImpostor.onCollideEvent = (collider, collidedWith) => {
    console.log('%c Rock onCollideEvent', 'color: #ff00ff');
  };
}

class Playground {
  public static CreateScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): BABYLON.Scene {
    const scene = new BABYLON.Scene(engine);
    initPhysics(scene);

    setupCamera(scene, canvas);

    loadAxes(scene);

    const light = new BABYLON.HemisphericLight('', new BABYLON.Vector3(0, 1, 0), scene);

    return scene;
  }
}

function setupCamera(scene: BABYLON.Scene, canvas: HTMLCanvasElement): void {
  const camera = new BABYLON.ArcRotateCamera('', 0, Math.PI / 4, 100, new BABYLON.Vector3(), scene);
  camera.keysUp = [];
  camera.keysLeft = [];
  camera.keysDown = [];
  camera.keysRight = [];
  camera.attachControl(canvas, false);
  camera.setTarget(new BABYLON.Vector3(0, 5, 0));
}

function loadAxes(scene: BABYLON.Scene): void {
  const size = 100;

  const axisX = BABYLON.Mesh.CreateLines(
    'axisX',
    [
      new BABYLON.Vector3(),
      new BABYLON.Vector3(size, 0, 0),
      new BABYLON.Vector3(size * 0.95, 0.05 * size, 0),
      new BABYLON.Vector3(size, 0, 0),
      new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
    ],
    scene
  );
  axisX.isPickable = false;
  axisX.color = new BABYLON.Color3(1, 0, 0);

  const axisY = BABYLON.Mesh.CreateLines(
    'axisY',
    [
      new BABYLON.Vector3(),
      new BABYLON.Vector3(0, size, 0),
      new BABYLON.Vector3(-0.05 * size, size * 0.95, 0),
      new BABYLON.Vector3(0, size, 0),
      new BABYLON.Vector3(0.05 * size, size * 0.95, 0)
    ],
    scene
  );
  axisY.isPickable = false;
  axisY.color = new BABYLON.Color3(0, 1, 0);

  const axisZ = BABYLON.Mesh.CreateLines(
    'axisZ',
    [
      new BABYLON.Vector3(),
      new BABYLON.Vector3(0, 0, size),
      new BABYLON.Vector3(0, -0.05 * size, size * 0.95),
      new BABYLON.Vector3(0, 0, size),
      new BABYLON.Vector3(0, 0.05 * size, size * 0.95)
    ],
    scene
  );
  axisZ.isPickable = false;
  axisZ.color = new BABYLON.Color3(0, 0, 1);
}
