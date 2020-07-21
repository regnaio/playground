// @ts-ignore
// import * as BABYLON from './babylon';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Allows us to load an asset from a file once, then we can clone it many times using AssetClone
class Asset {
    constructor(_url, _meshPosition, _meshRotation, _meshScaling, _materials, _scene) {
        this._url = _url;
        this._meshPosition = _meshPosition;
        this._meshRotation = _meshRotation;
        this._meshScaling = _meshScaling;
        this._materials = _materials;
        this._scene = _scene;
        if (!_materials)
            throw 'Materials list is empty!';
        this._assetContainer = new BABYLON.AssetContainer(_scene);
    }
    get meshes() {
        return this._assetContainer.meshes;
    }
    get promise() {
        return BABYLON.SceneLoader.ImportMeshAsync('', '', this._url, this._scene).then(result => {
            let materialIndex = 0;
            result.meshes.forEach(mesh => {
                mesh.isPickable = false;
                mesh.position.copyFrom(this._meshPosition);
                mesh.rotation.copyFrom(this._meshRotation);
                mesh.scaling.copyFrom(this._meshScaling);
                mesh.material = this._materials[materialIndex];
                mesh.convertToUnIndexedMesh();
                this._assetContainer.meshes.push(mesh);
                if (materialIndex !== this._materials.length)
                    materialIndex++;
            });
        });
    }
    removeAllFromScene() {
        this._assetContainer.removeAllFromScene();
    }
}
// Allows us to load an animated asset from a file once, then we can clone it many times using AnimatedAssetClone
class AnimatedAsset extends Asset {
    constructor(url, meshPosition, meshRotation, meshScaling, materials, _animationNames, scene) {
        super(url, meshPosition, meshRotation, meshScaling, materials, scene);
        this._animationNames = _animationNames;
        this._animationRanges = new Map();
        if (!this._animationNames)
            throw 'Animation names list is empty!';
    }
    get animationRanges() {
        return this._animationRanges;
    }
    get skeleton() {
        return this._assetContainer.skeletons[0];
    }
    get promise() {
        return BABYLON.SceneLoader.ImportMeshAsync('', '', this._url, this._scene).then(result => {
            const skeleton = result.skeletons[0];
            this._assetContainer.skeletons.push(skeleton);
            skeleton.enableBlending(0.1);
            this._animationNames.forEach(animationName => {
                const animationRange = skeleton.getAnimationRange(animationName);
                if (animationRange !== null) {
                    this._animationRanges.set(animationName, animationRange);
                }
                else {
                    console.log(`Animation ${animationName} does not exist in ${this._url}`);
                }
            });
            let materialIndex = 0;
            result.meshes.forEach(mesh => {
                mesh.isPickable = false;
                mesh.position.copyFrom(this._meshPosition);
                mesh.rotation.copyFrom(this._meshRotation);
                mesh.scaling.copyFrom(this._meshScaling);
                mesh.material = this._materials[materialIndex];
                mesh.convertToUnIndexedMesh();
                this._assetContainer.meshes.push(mesh);
                if (materialIndex !== this._materials.length)
                    materialIndex++;
            });
        });
    }
}
// Allows us to clone an Asset without loading it from a file again
class AssetClone {
    constructor(asset, _scene, isPickable = false) {
        this._scene = _scene;
        this._assetContainer = new BABYLON.AssetContainer(_scene);
        if (this instanceof AnimatedAssetClone)
            return;
        asset.meshes.forEach(mesh => {
            // const meshClone = (mesh as BABYLON.Mesh).createInstance('');
            const meshClone = mesh.clone('', null);
            if (meshClone !== null) {
                meshClone.isVisible = false;
                meshClone.isPickable = isPickable;
                this._assetContainer.meshes.push(meshClone);
            }
        });
    }
    get meshes() {
        return this._assetContainer.meshes;
    }
    get position() {
        return this.meshes[0].position;
    }
    get rotation() {
        return this.meshes[0].rotation;
    }
    set rotationQuaternion(rotationQuaternion) {
        this.meshes[0].rotationQuaternion = rotationQuaternion;
    }
    show() {
        this.meshes.forEach(mesh => mesh.isVisible = true);
    }
    hide() {
        this.meshes.forEach(mesh => mesh.isVisible = false);
    }
}
// Allows us to clone an AnimatedAsset without loading it from a file again
class AnimatedAssetClone extends AssetClone {
    constructor(animatedAsset, scene, isPickable = false) {
        super(animatedAsset, scene);
        this._animationRanges = new Map();
        this._animationRanges = animatedAsset.animationRanges;
        const skeletonClone = animatedAsset.skeleton.clone('clone');
        this._assetContainer.skeletons.push(skeletonClone);
        animatedAsset.meshes.forEach(mesh => {
            const meshClone = mesh.clone('clone', null);
            if (meshClone !== null) {
                meshClone.isPickable = isPickable;
                meshClone.skeleton = skeletonClone;
                this._assetContainer.meshes.push(meshClone);
            }
        });
        // const skeletonViewer = new BABYLON.Debug.SkeletonViewer(this.skeleton, this.meshes[0], this._scene);
        // skeletonViewer.isEnabled = true;
        // skeletonViewer.color = BABYLON.Color3.Green();
    }
    get skeleton() {
        return this._assetContainer.skeletons[0];
    }
    attachToBone(mesh, boneIndex) {
        mesh.detachFromBone();
        this.skeleton.prepare();
        mesh.attachToBone(this.skeleton.bones[boneIndex], this.meshes[0]);
    }
    animate(animationName, loop = true, callback) {
        const animationRange = this._animationRanges.get(animationName);
        if (animationRange)
            this._scene.beginAnimation(this.skeleton, animationRange.from, animationRange.to, loop, 1, callback);
    }
    setParent(parent, positionOffset, rotationOffset) {
        this.meshes.forEach(mesh => {
            mesh.position.copyFrom(parent.position);
            mesh.position.addInPlace(positionOffset);
            mesh.rotation.addInPlace(rotationOffset);
            mesh.setParent(parent);
        });
    }
}
const createEngine = function () {
    return new BABYLON.Engine(document.getElementById("renderCanvas"), true, {
        deterministicLockstep: true,
        lockstepMaxSteps: 4
    }, false);
};
class Playground {
    static CreateScene(engine, canvas) {
        const scene = new BABYLON.Scene(engine, {
            useGeometryUniqueIdsMap: true,
            useMaterialMeshMap: true
        });
        scene.autoClearDepthAndStencil = false;
        scene.blockMaterialDirtyMechanism = true;
        scene.enablePhysics(new BABYLON.Vector3(0, -9.8, 0), new BABYLON.CannonJSPlugin());
        const physEngine = scene.getPhysicsEngine();
        physEngine.setSubTimeStep(1000 / 60);
        const options = new BABYLON.SceneOptimizerOptions(60);
        options.addOptimization(new BABYLON.ShadowsOptimization(0));
        options.addOptimization(new BABYLON.LensFlaresOptimization(0));
        options.addOptimization(new BABYLON.PostProcessesOptimization(1));
        options.addOptimization(new BABYLON.ParticlesOptimization(1));
        options.addOptimization(new BABYLON.TextureOptimization(2, 256));
        options.addOptimization(new BABYLON.RenderTargetsOptimization(3));
        const optimizer = new BABYLON.SceneOptimizer(scene, options);
        // optimizer.onFailureObservable.add(() => {
        //     console.log('no');
        //     optimizer.start();
        // });
        // optimizer.onNewOptimizationAppliedObservable.add(() => {
        //     console.log('new');
        // })
        // optimizer.onSuccessObservable.add(() => {
        //     console.log('yes');
        //     optimizer.start();
        // });
        optimizer.start();
        const camera = new BABYLON.ArcRotateCamera('', 0, Math.PI / 2, 5, new BABYLON.Vector3(), scene);
        camera.lowerRadiusLimit = 5;
        camera.upperRadiusLimit = 5;
        camera.angularSensibilityX = 500;
        camera.angularSensibilityY = 500;
        camera.inertia = 0;
        camera.attachControl(canvas, false);
        const light = new BABYLON.HemisphericLight('', new BABYLON.Vector3(0, 1, 0), scene);
        // Pointer lock
        let isLocked = false;
        scene.onPointerDown = evt => {
            if (!isLocked) {
                canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
                if (canvas.requestPointerLock) {
                    canvas.requestPointerLock();
                    return;
                }
            }
            if (evt.button === 0) {
                command.fireKeyDown = true;
            }
        };
        scene.onPointerUp = evt => {
            if (!isLocked) {
                canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
                if (canvas.requestPointerLock) {
                    canvas.requestPointerLock();
                    return;
                }
            }
            if (evt.button === 0) {
                command.fireKeyDown = false;
            }
        };
        const pointerlockchange = () => {
            // @ts-ignore
            const controlEnabled = document.mozPointerLockElement || document.webkitPointerLockElement || document.msPointerLockElement || document.pointerLockElement || null;
            if (!controlEnabled) {
                isLocked = false;
            }
            else {
                isLocked = true;
            }
        };
        document.addEventListener('pointerlockchange', pointerlockchange, false);
        document.addEventListener('mspointerlockchange', pointerlockchange, false);
        document.addEventListener('mozpointerlockchange', pointerlockchange, false);
        document.addEventListener('webkitpointerlockchange', pointerlockchange, false);
        // Crosshair
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const crosshair = new BABYLON.GUI.Ellipse();
        crosshair.width = '15px';
        crosshair.height = '15px';
        crosshair.color = "Orange";
        crosshair.thickness = 2;
        advancedTexture.addControl(crosshair);
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
        // Skybox
        const skybox = BABYLON.MeshBuilder.CreateBox('skybox', { size: 1000.0 }, scene);
        const skyboxMaterial = new BABYLON.StandardMaterial('', scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture('textures/skybox', scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.disableLighting = true;
        skybox.material = skyboxMaterial;
        // "Global" variables for ease of use in Playground
        let ybotTop;
        let ybotBottom;
        const players = new Array();
        let spineBone;
        // Loads all Assets in parallel
        const loadAssets = (scene) => __awaiter(this, void 0, void 0, function* () {
            const ak47URL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/ak47/ak47lp.babylon';
            const ak47TextureURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/ak47/weapon_2.png';
            const pistolURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/pistol/pistollp.babylon';
            const pistolTextureURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/pistol/weapon_3.png';
            const knifeURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/karambit/karambit.babylon';
            const knifeTextureURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/karambit/melee_3_7.png';
            const ybotTopURL = 'https://raw.githubusercontent.com/regnaio/pg/master/200621/topaimpunchidlelp3.babylon';
            const ybotBottomURL = 'https://raw.githubusercontent.com/regnaio/pg/master/200621/botrun8jump3crouch8idlelp3.babylon';
            const ak47Material = new BABYLON.StandardMaterial('', scene);
            ak47Material.diffuseTexture = new BABYLON.Texture(ak47TextureURL, scene);
            const ak47Asset = new Asset(ak47URL, new BABYLON.Vector3(), new BABYLON.Vector3(), new BABYLON.Vector3(1, 1, 1), [ak47Material], scene);
            const pistolMaterial = new BABYLON.StandardMaterial('', scene);
            pistolMaterial.diffuseTexture = new BABYLON.Texture(pistolTextureURL, scene);
            const pistolAsset = new Asset(pistolURL, new BABYLON.Vector3(), new BABYLON.Vector3(), new BABYLON.Vector3(0.3, 0.3, 0.3), [pistolMaterial], scene);
            const knifeMaterial = new BABYLON.StandardMaterial('', scene);
            knifeMaterial.diffuseTexture = new BABYLON.Texture(knifeTextureURL, scene);
            const knifeAsset = new Asset(knifeURL, new BABYLON.Vector3(), new BABYLON.Vector3(), new BABYLON.Vector3(10, 10, 10), [knifeMaterial], scene);
            const ybotSurfaceMaterial = new BABYLON.StandardMaterial('', scene);
            ybotSurfaceMaterial.diffuseColor = new BABYLON.Color3(0.25, 0.65, 0.65);
            const ybotJointMaterial = new BABYLON.StandardMaterial('', scene);
            ybotJointMaterial.diffuseColor = new BABYLON.Color3(0.25, 0.25, 0.25);
            const topNames = ['Idle', 'RifleAim', 'PistolAim', 'PunchLeft', 'PunchRight'];
            const botNames = ['Idle', 'RunForward', 'RunBackward', 'RunLeft', 'RunRight',
                'RunForwardLeft', 'RunForwardRight', 'RunBackwardLeft', 'RunBackwardRight',
                'JumpUp', 'JumpAir', 'JumpDown',
                'CrouchForward', 'CrouchBackward', 'CrouchLeft', 'CrouchRight',
                'CrouchForwardLeft', 'CrouchForwardRight', 'CrouchBackwardLeft', 'CrouchBackwardRight'];
            const ybotTopAnimatedAsset = new AnimatedAsset(ybotTopURL, new BABYLON.Vector3(), new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0.011, 0.011, 0.011), [ybotJointMaterial, ybotJointMaterial, ybotSurfaceMaterial], topNames, scene);
            const ybotBottomAnimatedAsset = new AnimatedAsset(ybotBottomURL, new BABYLON.Vector3(), new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0.011, 0.011, 0.011), [ybotJointMaterial, ybotSurfaceMaterial], botNames, scene);
            // Load all Assets in parallel
            yield Promise.all([ak47Asset.promise, pistolAsset.promise, knifeAsset.promise, ybotTopAnimatedAsset.promise, ybotBottomAnimatedAsset.promise]);
            ak47Asset.removeAllFromScene();
            pistolAsset.removeAllFromScene();
            knifeAsset.removeAllFromScene();
            ybotTopAnimatedAsset.removeAllFromScene();
            ybotBottomAnimatedAsset.removeAllFromScene();
            ybotTop = new AnimatedAssetClone(ybotTopAnimatedAsset, scene);
            ybotTop.setParent(compoundBody, new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, Math.PI / 2, 0));
            spineBone = ybotTop.skeleton.bones[1];
            ybotBottom = new AnimatedAssetClone(ybotBottomAnimatedAsset, scene);
            ybotBottom.setParent(compoundBody, new BABYLON.Vector3(0, -1, 0), new BABYLON.Vector3(0, Math.PI / 2, 0));
            const ak47 = new AssetClone(ak47Asset, scene);
            ak47.position.copyFrom(new BABYLON.Vector3(9, 11, 9));
            ak47.rotation.copyFrom(new BABYLON.Vector3(0.8, 1.2, -1.8));
            const pistol = new AssetClone(pistolAsset, scene);
            pistol.position.copyFrom(new BABYLON.Vector3(-4, 3, 9));
            pistol.rotation.copyFrom(new BABYLON.Vector3(0.8, 1.2, -1.6));
            const knife = new AssetClone(knifeAsset, scene);
            knife.position.copyFrom(new BABYLON.Vector3(-5, -1, -4));
            knife.rotation.copyFrom(new BABYLON.Vector3(-1.5, -1.5, 0));
            ybotTop.meshes[0].setParent(ybotTop.meshes[2]);
            ybotTop.meshes[1].setParent(ybotTop.meshes[2]);
            ybotTop.animate('RifleAim');
            ybotBottom.animate('Idle');
            ybotTop.attachToBone(ak47.meshes[0], 37);
            ak47.show();
            players.push({
                ybotTop,
                ybotBottom
            });
            // Other players
            let z = -30;
            let y = 5;
            for (let i = 0; i < 30; i++) {
                // Other players' physics capsule (orange wireframe)
                const wireframeMaterial2 = new BABYLON.StandardMaterial('', scene);
                wireframeMaterial2.wireframe = true;
                wireframeMaterial2.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
                wireframeMaterial2.alpha = 0.1;
                const bottom2 = BABYLON.MeshBuilder.CreateSphere('bottom2', { diameter: 1, segments: 4 }, scene);
                // bottom2.isPickable = false;
                bottom2.material = wireframeMaterial2;
                bottom2.position.y -= 0.5;
                const middle2 = BABYLON.MeshBuilder.CreateCylinder('middle2', { diameter: 1, height: 1 }, scene);
                // middle2.isPickable = false;
                middle2.material = wireframeMaterial2;
                // middle2.position.y += 1;
                const top2 = BABYLON.MeshBuilder.CreateSphere('top2', { diameter: 1, segments: 4 }, scene);
                // top2.isPickable = false;
                top2.position.y += 0.5;
                top2.material = wireframeMaterial2;
                const compoundBody2 = new BABYLON.Mesh('', scene);
                compoundBody2.addChild(bottom2);
                compoundBody2.addChild(middle2);
                compoundBody2.addChild(top2);
                compoundBody2.position.y += y;
                // y += 5;
                // compoundBody2.rotation.z += 0.5;
                compoundBody2.position.z = z;
                z += 2;
                bottom2.physicsImpostor = new BABYLON.PhysicsImpostor(bottom2, BABYLON.PhysicsImpostor.SphereImpostor, {
                    mass: 0,
                }, scene);
                middle2.physicsImpostor = new BABYLON.PhysicsImpostor(middle2, BABYLON.PhysicsImpostor.CylinderImpostor, {
                    mass: 0,
                }, scene);
                top2.physicsImpostor = new BABYLON.PhysicsImpostor(top2, BABYLON.PhysicsImpostor.SphereImpostor, {
                    mass: 0,
                }, scene);
                compoundBody2.physicsImpostor = new BABYLON.PhysicsImpostor(compoundBody2, BABYLON.PhysicsImpostor.NoImpostor, {
                    mass: 1,
                    // friction: 0,
                    restitution: 0,
                    nativeOptions: {
                        collisionFilterGroup: 1,
                        collisionFilterMask: 1 | 2
                    }
                }, scene);
                compoundBody2.physicsImpostor.physicsBody.angularDamping = 1;
                // Other players' imported models
                const ybotTop = new AnimatedAssetClone(ybotTopAnimatedAsset, scene);
                ybotTop.setParent(compoundBody2, new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, Math.PI / 2, 0));
                const ybotBottom = new AnimatedAssetClone(ybotBottomAnimatedAsset, scene);
                ybotBottom.setParent(compoundBody2, new BABYLON.Vector3(0, -1, 0), new BABYLON.Vector3(0, Math.PI / 2, 0));
                const ak47 = new AssetClone(ak47Asset, scene);
                ak47.position.copyFrom(new BABYLON.Vector3(9, 11, 9));
                ak47.rotation.copyFrom(new BABYLON.Vector3(0.8, 1.2, -1.8));
                const pistol = new AssetClone(pistolAsset, scene);
                pistol.position.copyFrom(new BABYLON.Vector3(-4, 3, 9));
                pistol.rotation.copyFrom(new BABYLON.Vector3(0.8, 1.2, -1.6));
                const knife = new AssetClone(knifeAsset, scene);
                knife.position.copyFrom(new BABYLON.Vector3(-5, -1, -4));
                knife.rotation.copyFrom(new BABYLON.Vector3(-1.5, -1.5, 0));
                ybotTop.meshes[0].setParent(ybotTop.meshes[2]);
                ybotTop.meshes[1].setParent(ybotTop.meshes[2]);
                ybotTop.animate('RifleAim');
                ybotBottom.animate('Idle');
                ybotTop.attachToBone(ak47.meshes[0], 37);
                ak47.show();
                // ybotTop.attachToBone(pistol.meshes[0], 37);
                // pistol.show();
                // ybotTop.attachToBone(knife.meshes[0], 37);
                // knife.show();
                players.push({
                    ybotTop,
                    ybotBottom
                });
            }
        });
        // Your player's physics capsule (blue wireframe)
        const wireframeMaterial = new BABYLON.StandardMaterial('', scene);
        wireframeMaterial.wireframe = true;
        wireframeMaterial.diffuseColor = new BABYLON.Color3(0, 0, 1);
        wireframeMaterial.alpha = 0.1;
        const bottom = BABYLON.MeshBuilder.CreateSphere('bottom', { diameter: 1, segments: 4 }, scene);
        bottom.isPickable = false;
        bottom.material = wireframeMaterial;
        bottom.position.y -= 0.5;
        const middle = BABYLON.MeshBuilder.CreateCylinder('middle', { diameter: 1, height: 1 }, scene);
        // middle.isPickable = false;
        middle.material = wireframeMaterial;
        middle.setParent(bottom);
        const top = BABYLON.MeshBuilder.CreateSphere('top', { diameter: 1, segments: 4 }, scene);
        // top.isPickable = false;
        top.position.y += 0.5;
        top.material = wireframeMaterial;
        const compoundBody = new BABYLON.Mesh('', scene);
        compoundBody.addChild(bottom);
        compoundBody.addChild(middle);
        compoundBody.addChild(top);
        compoundBody.position.y += 1;
        bottom.physicsImpostor = new BABYLON.PhysicsImpostor(bottom, BABYLON.PhysicsImpostor.SphereImpostor, {
            mass: 0,
        }, scene);
        middle.physicsImpostor = new BABYLON.PhysicsImpostor(middle, BABYLON.PhysicsImpostor.CylinderImpostor, {
            mass: 0,
        }, scene);
        top.physicsImpostor = new BABYLON.PhysicsImpostor(top, BABYLON.PhysicsImpostor.SphereImpostor, {
            mass: 0,
        }, scene);
        compoundBody.physicsImpostor = new BABYLON.PhysicsImpostor(compoundBody, BABYLON.PhysicsImpostor.NoImpostor, {
            mass: 1,
            friction: 0,
            restitution: 0,
            nativeOptions: {
                collisionFilterGroup: 1,
                collisionFilterMask: 1 | 2
            }
        }, scene);
        compoundBody.physicsImpostor.physicsBody.angularDamping = 1;
        // const muzzle = new BABYLON.TransformNode('muzzle', scene);
        const muzzle = new BABYLON.Mesh('muzzle', scene);
        // const muzzle = BABYLON.MeshBuilder.CreateBox('', { height: 2 }, scene);
        muzzle.setParent(compoundBody);
        muzzle.position = new BABYLON.Vector3(-2, 0.5, 0.25);
        // Camera target mesh (invisible) for third-person camera
        const cameraTargetMesh = BABYLON.MeshBuilder.CreateBox('cameraTargetMesh', { height: 2 }, scene);
        cameraTargetMesh.visibility = 0;
        cameraTargetMesh.isPickable = false;
        cameraTargetMesh.setParent(compoundBody);
        cameraTargetMesh.position = new BABYLON.Vector3(0, 0.5, 1);
        camera.lockedTarget = cameraTargetMesh;
        // Obstacles include pillars, slide, and ground
        // const obstacles = new Array<BABYLON.Mesh>();
        const obstacles = new Set();
        // const obstacles = new Array<BABYLON.InstancedMesh>();
        // Slide (red)
        const slide = BABYLON.MeshBuilder.CreateBox('slide', { width: 3, height: 20 }, scene);
        const slideMaterial = new BABYLON.StandardMaterial('', scene);
        slideMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
        // slideMaterial.alpha = 0.5;
        slide.material = slideMaterial;
        slide.position.x += 2;
        slide.position.y += 0;
        slide.rotation.x += Math.PI / 3;
        slide.checkCollisions = true;
        obstacles.add(slide);
        slide.physicsImpostor = new BABYLON.PhysicsImpostor(slide, BABYLON.PhysicsImpostor.BoxImpostor, {
            mass: 0,
            // friction: 0,
            restitution: 0,
            nativeOptions: {
                collisionFilterGroup: 1,
                collisionFilterMask: 1 | 2
            }
        }, scene);
        slide.physicsImpostor.sleep();
        // Ground (white)
        const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 100, height: 100 }, scene);
        const groundMaterial = new BABYLON.StandardMaterial('', scene);
        groundMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        ground.material = groundMaterial;
        ground.checkCollisions = true;
        obstacles.add(ground);
        ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, {
            mass: 0,
            // friction: 0,
            restitution: 0,
            nativeOptions: {
                collisionFilterGroup: 1,
                collisionFilterMask: 1 | 2
            }
        }, scene);
        ground.physicsImpostor.sleep();
        // Pillars (green)
        const pillarMesh = BABYLON.MeshBuilder.CreateBox('pillar', { width: 4, height: 2 }, scene);
        const pillarMaterial = new BABYLON.StandardMaterial('', scene);
        pillarMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0);
        // pillarMaterial.alpha = 0.5;
        pillarMesh.material = pillarMaterial;
        // pillarMesh.setEnabled(false);
        let z = -100;
        for (let i = 0; i < 100; i++) {
            // const pillar = pillarMesh.createInstance('');
            const pillar = pillarMesh.clone('pillar');
            pillar.position.x -= 3;
            pillar.position.y += 1;
            pillar.position.z += z;
            z += 2;
            // pillar.checkCollisions = true;
            pillar.freezeWorldMatrix();
            obstacles.add(pillar);
            pillar.physicsImpostor = new BABYLON.PhysicsImpostor(pillar, BABYLON.PhysicsImpostor.BoxImpostor, {
                mass: 0,
                // friction: 0,
                restitution: 0,
                nativeOptions: {
                    collisionFilterGroup: 1,
                    collisionFilterMask: 1 | 2
                }
            }, scene);
            pillar.physicsImpostor.sleep();
        }
        pillarMesh.dispose();
        const command = {
            frameTime: 0,
            moveForwardKeyDown: false,
            moveBackwardKeyDown: false,
            moveLeftKeyDown: false,
            moveRightKeyDown: false,
            jumpKeyDown: false,
            cameraAlpha: 0,
            cameraBeta: 0,
            fireKeyDown: false
        };
        scene.onKeyboardObservable.add(kbInfo => {
            switch (kbInfo.type) {
                case BABYLON.KeyboardEventTypes.KEYDOWN:
                    switch (kbInfo.event.key) {
                        case 'w':
                        case 'W':
                            command.moveForwardKeyDown = true;
                            break;
                        case 'a':
                        case 'A':
                            command.moveLeftKeyDown = true;
                            break;
                        case 's':
                        case 'S':
                            command.moveBackwardKeyDown = true;
                            break;
                        case 'd':
                        case 'D':
                            command.moveRightKeyDown = true;
                            break;
                        case ' ':
                            command.jumpKeyDown = true;
                            break;
                    }
                    break;
                case BABYLON.KeyboardEventTypes.KEYUP:
                    switch (kbInfo.event.key) {
                        case 'w':
                        case 'W':
                            command.moveForwardKeyDown = false;
                            break;
                        case 'a':
                        case 'A':
                            command.moveLeftKeyDown = false;
                            break;
                        case 's':
                        case 'S':
                            command.moveBackwardKeyDown = false;
                            break;
                        case 'd':
                        case 'D':
                            command.moveRightKeyDown = false;
                            break;
                        case ' ':
                            command.jumpKeyDown = false;
                            break;
                    }
                    break;
            }
        });
        // Physics steps
        scene.onBeforeStepObservable.add(() => {
            // Player move
            command.frameTime = Date.now();
            command.cameraAlpha = camera.alpha;
            command.cameraBeta = camera.beta;
            move(command);
            for (const [uniqueID, item] of bullets) {
                const { bullet, ray, rayHelper } = item;
                bullet.computeWorldMatrix(true);
                bullet.physicsImpostor.applyForce(new BABYLON.Vector3(0, 9.8 * 1e-10, 0), bullet.getAbsolutePosition());
                const pick = scene.pickWithRay(ray);
                // const pick = scene.pickWithRay(ray, mesh => {
                //     obstacles.has(mesh as BABYLON.Mesh)
                // });
                if (pick.hit) {
                    console.log('hit');
                    console.log(bullet.position);
                    console.log(ray);
                    console.log(pick.pickedMesh.name);
                    console.log(pick.pickedMesh.getAbsolutePosition());
                    // bullet.physicsImpostor.sleep();
                    // bullets.delete(bullet.uniqueId);
                    // bullet.physicsImpostor.dispose();
                    // bullet.dispose();
                    // rayHelper.dispose();
                }
            }
            players.forEach(player => {
                const { ybotTop, ybotBottom } = player;
                if (ybotTop !== undefined) {
                    ybotBottom.meshes.forEach(mesh => {
                        mesh.computeWorldMatrix(true);
                    });
                    ybotTop.meshes[2].setAbsolutePosition(ybotBottom.skeleton.bones[0].getAbsolutePosition(ybotBottom.meshes[0]).subtract(new BABYLON.Vector3(0, 1.1, 0)));
                }
            });
        });
        // scene.onAfterStepObservable.add(() => {});
        // scene.registerBeforeRender(() => {});
        let prevFrameTime;
        const direction = new BABYLON.Vector3();
        const velocity = new BABYLON.Vector3();
        // @ts-ignore
        const ray = new BABYLON.Ray();
        const rayHelper = new BABYLON.RayHelper(ray);
        rayHelper.attachToMesh(compoundBody, new BABYLON.Vector3(0, -1, 0), new BABYLON.Vector3(0, -0.95, 0), 0.15);
        rayHelper.show(scene, new BABYLON.Color3(1, 0, 0));
        let onObject = false;
        const jump = () => {
            compoundBody.physicsImpostor.wakeUp();
            compoundBody.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(0, 7, 0));
            onObject = false;
            currentAnim = 'JumpUp';
            ybotBottom.animate('JumpUp', false, () => {
                currentAnim = 'JumpAir';
                ybotBottom.animate('JumpAir');
                setTimeout(() => {
                    currentAnim = 'JumpDown';
                    ybotBottom.animate('JumpDown', false, () => {
                        currentAnim = '';
                    });
                }, 200);
            });
        };
        const bullets = new Map();
        let prevFireTime = 0;
        const betweenFireTime = 100;
        let numBulletsFired = 0;
        const bulletMesh = BABYLON.MeshBuilder.CreateBox('bullet', { width: 0.5, height: 0.05, depth: 0.05 }, scene);
        bulletMesh.isPickable = false;
        const bulletMat = new BABYLON.StandardMaterial('', scene);
        bulletMat.diffuseColor = new BABYLON.Color3(1, 1, 0);
        bulletMat.emissiveColor = new BABYLON.Color3(1, 1, 0);
        bulletMesh.material = bulletMat;
        bulletMesh.setEnabled(false);
        const gl = new BABYLON.GlowLayer('', scene, {
            blurKernelSize: 16
        });
        gl.neutralColor.a = 0;
        gl.addIncludedOnlyMesh(bulletMesh);
        const fire = (clientFrameTime) => {
            if (clientFrameTime - prevFireTime > betweenFireTime) {
                console.log(numBulletsFired);
                numBulletsFired++;
                const bullet = bulletMesh.createInstance('');
                bullet.isPickable = false;
                bullet.physicsImpostor = new BABYLON.PhysicsImpostor(bullet, BABYLON.PhysicsImpostor.NoImpostor, {
                    mass: 1e-10,
                    nativeOptions: {
                        collisionFilterGroup: 4,
                        collisionFilterMask: 8
                    }
                }, scene);
                bullet.physicsImpostor.physicsBody.collisionResponse = 0;
                // const muzzle = compoundBody.position.add(new BABYLON.Vector3());
                const dir = camera.getForwardRay(1).direction;
                const origin = camera.position.add(dir.scale(3));
                const view = new BABYLON.Ray(origin, dir, 1000);
                const pick = scene.pickWithRay(view);
                const muzzlePos = muzzle.getAbsolutePosition();
                const finalDir = pick.pickedPoint.subtract(muzzlePos).normalize();
                bullet.position.copyFrom(muzzlePos);
                const { x: dx, y: dy, z: dz } = pick.pickedPoint.subtract(muzzlePos);
                const v1 = new BABYLON.Vector3(1, 0, 0);
                const v2 = new BABYLON.Vector3(dx, dy, dz);
                const c = v1.cross(v2);
                const q = new BABYLON.Quaternion();
                q.x = c.x;
                q.y = c.y;
                q.z = c.z;
                q.w = Math.sqrt(Math.pow(v1.length(), 2) * Math.pow(v2.length(), 2)) + BABYLON.Vector3.Dot(v1, v2);
                bullet.rotationQuaternion = q;
                // bullet.computeWorldMatrix(true);
                // // @ts-ignore
                // const ray = new BABYLON.Ray();
                const ray = new BABYLON.Ray(new BABYLON.Vector3(), new BABYLON.Vector3(1, 0, 0), 1);
                const rayHelper = new BABYLON.RayHelper(ray);
                rayHelper.attachToMesh(bullet, new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(0, 0, 0), 2);
                // rayHelper.show(scene, new BABYLON.Color3(1, 0, 0));
                // bullet.physicsImpostor.setLinearVelocity(finalDir.scale(1));
                bullets.set(bullet.uniqueId, {
                    bullet,
                    ray,
                    rayHelper
                });
                // const particleSystem = new BABYLON.ParticleSystem('', 10, scene);
                // particleSystem.particleTexture = new BABYLON.Texture("/textures/flare.png", scene);
                // particleSystem.emitter = bullet;
                // particleSystem.color1 = new BABYLON.Color4(0.7, 0.8, 1.0, 1.0);
                // particleSystem.color2 = new BABYLON.Color4(0.2, 0.5, 1.0, 1.0);
                // particleSystem.minSize = 0.1;
                // particleSystem.maxSize = 0.1;
                // particleSystem.minLifeTime = 1.5;
                // particleSystem.maxLifeTime = 1.5;
                // particleSystem.emitRate = 2000;
                // const pointEmitter = particleSystem.createPointEmitter(new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(1, 0, 0));
                // particleSystem.start();
                // bullet.physicsImpostor.onCollide = e => {
                //     bullet.physicsImpostor.dispose();
                //     bullet.dispose();
                // };
                // bullet.physicsImpostor.onCollideEvent = () => {
                //     bullet.physicsImpostor.dispose();
                //     bullet.dispose();
                // }
                // bullet.physicsImpostor.registerOnPhysicsCollide(physicsImposters, (main, collided) => {
                //     bullet.physicsImpostor.dispose();
                //     bullet.dispose();
                // });
                prevFireTime = clientFrameTime;
            }
        };
        let currentAnim = 'Idle';
        const jumpSet = new Set(['JumpUp', 'JumpAir', 'JumpDown']);
        const move = (command) => {
            if (prevFrameTime === undefined) {
                prevFrameTime = command.frameTime;
                return;
            }
            const delta = command.frameTime - prevFrameTime;
            if (command.fireKeyDown) {
                // const radiusVector = new BABYLON.Vector3(camera.radius, 0, 0);
                // const rotationAxisZ = BABYLON.Matrix.RotationAxis(BABYLON.Axis.Z, command.cameraBeta - Math.PI / 2);
                // const rotationAxisY = BABYLON.Matrix.RotationAxis(BABYLON.Axis.Y, Math.PI - command.cameraAlpha);
                // const rotatedRadiusVectorZ = BABYLON.Vector3.TransformCoordinates(radiusVector, rotationAxisZ);
                // const rotatedRadiusVectorYZ = BABYLON.Vector3.TransformCoordinates(rotatedRadiusVectorZ, rotationAxisY);
                // const cameraTargetPosition = cameraTargetMesh.absolutePosition;
                // const cameraPosition = cameraTargetPosition.subtract(rotatedRadiusVectorYZ);
                // const cameraRotation = new BABYLON.Vector3(0, Math.PI - command.cameraAlpha, command.cameraBeta - Math.PI / 2);
                fire(command.frameTime);
            }
            if (spineBone) {
                const viewAngleX = (Math.PI / 2 - command.cameraBeta) * 0.5;
                spineBone.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(viewAngleX, 0, -viewAngleX);
            }
            // const pick = scene.pickWithRay(ray);
            // if (pick) onObject = pick.hit;
            onObject = false;
            obstacles.forEach(obstacle => {
                const pick = ray.intersectsMesh(obstacle, false);
                if (pick.hit) {
                    // console.log(pick);
                    onObject = true;
                }
            });
            // console.log(onObject);
            // console.log(ray.origin);
            const viewAngleY = 2 * Math.PI - command.cameraAlpha;
            compoundBody.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, viewAngleY, 0);
            direction.x = -(Number(command.moveForwardKeyDown) - Number(command.moveBackwardKeyDown));
            direction.z = Number(command.moveRightKeyDown) - Number(command.moveLeftKeyDown);
            direction.normalize();
            velocity.x = 0;
            velocity.z = 0;
            if (command.moveRightKeyDown || command.moveLeftKeyDown)
                velocity.z = direction.z * delta / 300;
            if (command.moveForwardKeyDown || command.moveBackwardKeyDown)
                velocity.x = direction.x * delta / 300;
            if (ybotBottom !== undefined) {
                if (velocity.x < 0) {
                    if (velocity.z < 0) {
                        if (currentAnim !== 'RunForwardLeft' && !jumpSet.has(currentAnim)) {
                            ybotBottom.animate('RunForwardLeft');
                            currentAnim = 'RunForwardLeft';
                        }
                    }
                    else if (velocity.z > 0) {
                        if (currentAnim !== 'RunForwardRight' && !jumpSet.has(currentAnim)) {
                            ybotBottom.animate('RunForwardRight');
                            currentAnim = 'RunForwardRight';
                        }
                    }
                    else {
                        if (currentAnim !== 'RunForward' && !jumpSet.has(currentAnim)) {
                            ybotBottom.animate('RunForward');
                            currentAnim = 'RunForward';
                        }
                    }
                }
                else if (velocity.x > 0) {
                    if (velocity.z < 0) {
                        if (currentAnim !== 'RunBackwardLeft' && !jumpSet.has(currentAnim)) {
                            ybotBottom.animate('RunBackwardLeft');
                            currentAnim = 'RunBackwardLeft';
                        }
                    }
                    else if (velocity.z > 0) {
                        if (currentAnim !== 'RunBackwardRight' && !jumpSet.has(currentAnim)) {
                            ybotBottom.animate('RunBackwardRight');
                            currentAnim = 'RunBackwardRight';
                        }
                    }
                    else {
                        if (currentAnim !== 'RunBackward' && !jumpSet.has(currentAnim)) {
                            ybotBottom.animate('RunBackward');
                            currentAnim = 'RunBackward';
                        }
                    }
                }
                else {
                    if (velocity.z < 0) {
                        if (currentAnim !== 'RunLeft' && !jumpSet.has(currentAnim)) {
                            ybotBottom.animate('RunLeft');
                            currentAnim = 'RunLeft';
                        }
                    }
                    else if (velocity.z > 0) {
                        if (currentAnim !== 'RunRight' && !jumpSet.has(currentAnim)) {
                            ybotBottom.animate('RunRight');
                            currentAnim = 'RunRight';
                        }
                    }
                    else {
                        if (currentAnim !== 'Idle' && !jumpSet.has(currentAnim)) {
                            ybotBottom.animate('Idle');
                            currentAnim = 'Idle';
                        }
                    }
                }
            }
            if (command.jumpKeyDown && onObject)
                jump();
            const rotationAxis = BABYLON.Matrix.RotationAxis(BABYLON.Axis.Y, viewAngleY);
            const rotatedVelocity = BABYLON.Vector3.TransformCoordinates(velocity.multiplyByFloats(1, delta / 10, 1), rotationAxis);
            // compoundBody.physicsImpostor.setAngularVelocity(new BABYLON.Vector3());
            if (velocity.z !== 0 || velocity.x !== 0) {
                compoundBody.physicsImpostor.wakeUp();
                const old = compoundBody.physicsImpostor.getLinearVelocity();
                old.x = 0;
                old.z = 0;
                const add = onObject ?
                    old.add(rotatedVelocity.scale(50)) : old.add(rotatedVelocity.scale(50));
                compoundBody.physicsImpostor.setLinearVelocity(add);
            }
            else {
                if (onObject)
                    compoundBody.physicsImpostor.sleep();
                const old = compoundBody.physicsImpostor.getLinearVelocity();
                old.x = 0;
                old.z = 0;
                compoundBody.physicsImpostor.setLinearVelocity(old);
            }
            prevFrameTime = command.frameTime;
        };
        loadAssets(scene);
        return scene;
    }
}
