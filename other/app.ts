
const mesh = BABYLON.MeshBuilder.CreateBox('', { size: 0.1 });
const ray = new BABYLON.Ray(new BABYLON.Vector3(), new BABYLON.Vector3(1, 0, 0), 1);
ray.intersectsMesh(mesh, false);