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
                // mesh.rotation.copyFrom(this._meshRotation);
                mesh.rotationQuaternion = this._meshRotation.toQuaternion();
                mesh.scaling.copyFrom(this._meshScaling);
                mesh.material = this._materials[materialIndex];
                // (mesh as BABYLON.Mesh).convertToUnIndexedMesh();
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
                // mesh.rotation.copyFrom(this._meshRotation);
                mesh.rotationQuaternion = this._meshRotation.toQuaternion();
                mesh.scaling.copyFrom(this._meshScaling);
                mesh.material = this._materials[materialIndex];
                // (mesh as BABYLON.Mesh).convertToUnIndexedMesh();
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
    get rotationQuaternion() {
        return this.meshes[0].rotationQuaternion;
    }
    set scaling(scaling) {
        this.meshes[0].scaling.copyFrom(scaling);
    }
    set rotationQuaternion(rotationQuaternion) {
        this.meshes[0].rotationQuaternion = rotationQuaternion;
    }
    setAbsolutePosition(absolutePosition) {
        this.meshes[0].setAbsolutePosition(absolutePosition);
    }
    show() {
        this.meshes.forEach(mesh => mesh.isVisible = true);
    }
    hide() {
        this.meshes.forEach(mesh => mesh.isVisible = false);
    }
    // setParent(parent: BABYLON.Mesh, positionOffset: BABYLON.Vector3, rotationOffset: BABYLON.Vector3, scaling: BABYLON.Vector3): void {
    setParent(parent, positionOffset, rotationOffset) {
        this.meshes.forEach(mesh => {
            mesh.position.copyFrom(parent.position);
            mesh.position.addInPlace(positionOffset);
            // mesh.rotation.addInPlace(rotationOffset);
            mesh.rotationQuaternion = BABYLON.Quaternion.FromEulerVector(rotationOffset);
            // mesh.scaling.copyFrom(scaling);
            mesh.setParent(parent);
        });
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
    return new BABYLON.Engine(document.getElementById('renderCanvas'), true, {
        deterministicLockstep: true,
        lockstepMaxSteps: 4
    }, false);
};
class Playground {
    static CreateScene(engine, canvas) {
        const scene = new BABYLON.Scene(engine, {
            useGeometryUniqueIdsMap: true,
            useMaterialMeshMap: true,
            useClonedMeshMap: true
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
        const light = new BABYLON.HemisphericLight('', new BABYLON.Vector3(0, 100, 0), scene);
        // const light = new BABYLON.PointLight('', new BABYLON.Vector3(0, 100, 0), scene);
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
        const oldgui = document.querySelector("#datGUI");
        if (oldgui != null) {
            oldgui.remove();
        }
        // @ts-ignore
        const gui = new dat.GUI();
        gui.domElement.style.marginTop = "75px";
        gui.domElement.id = "datGUI";
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
        skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture('https://playground.babylonjs.com/textures/skybox', scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.disableLighting = true;
        skybox.material = skyboxMaterial;
        // "Global" variables for ease of use in Playground
        let ybotTop;
        let ybotBottom;
        let ak47Collider;
        let crossbowCollider;
        let karambitCollider;
        let marksmanCollider;
        let pistolCollider;
        let revolverCollider;
        let rpgCollider;
        let shotgunCollider;
        let smgCollider;
        let sniperCollider;
        const weapons = new Array();
        const weaponPhysicsImposters = new Array();
        const bullets = new Map();
        const grenadeLifetime = 1000;
        const grenades = new Map();
        // Obstacles include pillars, slide, and ground
        const obstacles = new Set();
        const obstaclePhysicsImposters = new Array();
        const offsetPosition = new BABYLON.Vector3(0.12, -0.14, 0.1);
        const offsetRotation = new BABYLON.Vector3(2.29, 1.82, 1.78);
        const scaling = new BABYLON.Vector3(1, 1, 1);
        const gl = new BABYLON.GlowLayer('', scene, {
            blurKernelSize: 16
        });
        gl.neutralColor.a = 0;
        const maxdPosition = 2;
        const positionStep = 1e-2;
        const maxdRotation = Math.PI;
        const rotationStep = 1e-2;
        const maxScaling = 2;
        gui.add(offsetPosition, 'x', -maxdPosition, maxdPosition).name('position.x').step(positionStep).listen();
        gui.add(offsetPosition, 'y', -maxdPosition, maxdPosition).name('position.y').step(positionStep).listen();
        gui.add(offsetPosition, 'z', -maxdPosition, maxdPosition).name('position.z').step(positionStep).listen();
        gui.add(offsetRotation, 'x', -maxdRotation, maxdRotation).name('rotation.x').step(rotationStep).listen();
        gui.add(offsetRotation, 'y', -maxdRotation, maxdRotation).name('rotation.y').step(rotationStep).listen();
        gui.add(offsetRotation, 'z', -maxdRotation, maxdRotation).name('rotation.z').step(rotationStep).listen();
        gui.add(scaling, 'x', 0, maxScaling).name('scale.x').step(positionStep).listen();
        gui.add(scaling, 'y', 0, maxScaling).name('scale.y').step(positionStep).listen();
        gui.add(scaling, 'z', 0, maxScaling).name('scale.z').step(positionStep).listen();
        const players = new Array();
        let spineBone;
        // Loads all Assets in parallel
        const loadAssets = (scene) => __awaiter(this, void 0, void 0, function* () {
            const ak47URL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/ak47/ak47lpsa.babylon';
            const ak47TextureURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/ak47/weapon_2.png';
            const crossbowURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/crossbow/crossbowlpsa.babylon';
            const crossbowTextureURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/crossbow/weapon_14.png';
            const karambitURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/karambit/karambitlpsa.babylon';
            const karambitTextureURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/karambit/melee_3_7.png';
            const marksmanURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/marksman/marksmanlpsa.babylon';
            const marksmanTextureURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/marksman/weapon_8.png';
            const pistolURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/pistol/pistollpsa.babylon';
            const pistolTextureURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/pistol/weapon_3.png';
            const revolverURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/revolver/revolverlpsa.babylon';
            const revolverTextureURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/revolver/weapon_5.png';
            const rpgURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/rpg/rpglpsa.babylon';
            const rpgTextureURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/rpg/weapon_9.png';
            const shotgunURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/shotgun/shotgunlpsa.babylon';
            const shotgunTextureURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/shotgun/weapon_6_38.png';
            const smgURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/smg/smglpsa.babylon';
            const smgTextureURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/smg/weapon_4.png';
            const sniperURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/sniper/sniperlpsa.babylon';
            const sniperTextureURL = 'https://raw.githubusercontent.com/regnaio/pg/master/krunker/sniper/weapon_1.png';
            const ybotTopURL = 'https://raw.githubusercontent.com/regnaio/pg/master/200621/topaimpunchidlelp3.babylon';
            const ybotBottomURL = 'https://raw.githubusercontent.com/regnaio/pg/master/200621/botrun8jump3crouch8idlelp3.babylon';
            const ak47Material = new BABYLON.StandardMaterial('', scene);
            ak47Material.diffuseTexture = new BABYLON.Texture(ak47TextureURL, scene);
            ak47Material.freeze();
            const ak47Asset = new Asset(ak47URL, new BABYLON.Vector3(), new BABYLON.Vector3(), new BABYLON.Vector3(1, 1, 1), [ak47Material], scene);
            const crossbowMaterial = new BABYLON.StandardMaterial('', scene);
            crossbowMaterial.diffuseTexture = new BABYLON.Texture(crossbowTextureURL, scene);
            crossbowMaterial.freeze();
            const crossbowAsset = new Asset(crossbowURL, new BABYLON.Vector3(), new BABYLON.Vector3(), new BABYLON.Vector3(1, 1, 1), [crossbowMaterial], scene);
            const karambitMaterial = new BABYLON.StandardMaterial('', scene);
            karambitMaterial.diffuseTexture = new BABYLON.Texture(karambitTextureURL, scene);
            karambitMaterial.freeze();
            const karambitAsset = new Asset(karambitURL, new BABYLON.Vector3(), new BABYLON.Vector3(), new BABYLON.Vector3(10, 10, 10), [karambitMaterial], scene);
            const marksmanMaterial = new BABYLON.StandardMaterial('', scene);
            marksmanMaterial.diffuseTexture = new BABYLON.Texture(marksmanTextureURL, scene);
            marksmanMaterial.freeze();
            const marksmanAsset = new Asset(marksmanURL, new BABYLON.Vector3(), new BABYLON.Vector3(), new BABYLON.Vector3(1, 1, 1), [marksmanMaterial], scene);
            const pistolMaterial = new BABYLON.StandardMaterial('', scene);
            pistolMaterial.diffuseTexture = new BABYLON.Texture(pistolTextureURL, scene);
            pistolMaterial.freeze();
            const pistolAsset = new Asset(pistolURL, new BABYLON.Vector3(), new BABYLON.Vector3(), new BABYLON.Vector3(1, 1, 1), [pistolMaterial], scene);
            const revolverMaterial = new BABYLON.StandardMaterial('', scene);
            revolverMaterial.diffuseTexture = new BABYLON.Texture(revolverTextureURL, scene);
            revolverMaterial.freeze();
            const revolverAsset = new Asset(revolverURL, new BABYLON.Vector3(), new BABYLON.Vector3(), new BABYLON.Vector3(1, 1, 1), [revolverMaterial], scene);
            const rpgMaterial = new BABYLON.StandardMaterial('', scene);
            rpgMaterial.diffuseTexture = new BABYLON.Texture(rpgTextureURL, scene);
            rpgMaterial.freeze();
            const rpgAsset = new Asset(rpgURL, new BABYLON.Vector3(), new BABYLON.Vector3(), new BABYLON.Vector3(1, 1, 1), [rpgMaterial], scene);
            const shotgunMaterial = new BABYLON.StandardMaterial('', scene);
            shotgunMaterial.diffuseTexture = new BABYLON.Texture(shotgunTextureURL, scene);
            shotgunMaterial.freeze();
            const shotgunAsset = new Asset(shotgunURL, new BABYLON.Vector3(), new BABYLON.Vector3(), new BABYLON.Vector3(1, 1, 1), [shotgunMaterial], scene);
            const smgMaterial = new BABYLON.StandardMaterial('', scene);
            smgMaterial.diffuseTexture = new BABYLON.Texture(smgTextureURL, scene);
            smgMaterial.freeze();
            const smgAsset = new Asset(smgURL, new BABYLON.Vector3(), new BABYLON.Vector3(), new BABYLON.Vector3(1, 1, 1), [smgMaterial], scene);
            const sniperMaterial = new BABYLON.StandardMaterial('', scene);
            sniperMaterial.diffuseTexture = new BABYLON.Texture(sniperTextureURL, scene);
            sniperMaterial.freeze();
            const sniperAsset = new Asset(sniperURL, new BABYLON.Vector3(), new BABYLON.Vector3(), new BABYLON.Vector3(1, 1, 1), [sniperMaterial], scene);
            const ybotSurfaceMaterial = new BABYLON.StandardMaterial('', scene);
            ybotSurfaceMaterial.diffuseColor = new BABYLON.Color3(0.25, 0.65, 0.65);
            const ybotJointMaterial = new BABYLON.StandardMaterial('', scene);
            ybotJointMaterial.diffuseColor = new BABYLON.Color3(0.25, 0.25, 0.25);
            ybotSurfaceMaterial.freeze();
            ybotJointMaterial.freeze();
            const topNames = ['Idle', 'RifleAim', 'PistolAim', 'PunchLeft', 'PunchRight'];
            const botNames = ['Idle', 'RunForward', 'RunBackward', 'RunLeft', 'RunRight',
                'RunForwardLeft', 'RunForwardRight', 'RunBackwardLeft', 'RunBackwardRight',
                'JumpUp', 'JumpAir', 'JumpDown',
                'CrouchForward', 'CrouchBackward', 'CrouchLeft', 'CrouchRight',
                'CrouchForwardLeft', 'CrouchForwardRight', 'CrouchBackwardLeft', 'CrouchBackwardRight'];
            const ybotTopAnimatedAsset = new AnimatedAsset(ybotTopURL, new BABYLON.Vector3(), new BABYLON.Vector3(0, Math.PI * 0.6, 0), new BABYLON.Vector3(1, 1, 1).scale(0.011), [ybotJointMaterial, ybotJointMaterial, ybotSurfaceMaterial], topNames, scene);
            const ybotBottomAnimatedAsset = new AnimatedAsset(ybotBottomURL, new BABYLON.Vector3(), new BABYLON.Vector3(0, Math.PI / 2, 0), new BABYLON.Vector3(1, 1, 1).scale(0.011), [ybotJointMaterial, ybotSurfaceMaterial], botNames, scene);
            // Load all Assets in parallel
            yield Promise.all([
                ak47Asset.promise,
                crossbowAsset.promise,
                karambitAsset.promise,
                marksmanAsset.promise,
                pistolAsset.promise,
                revolverAsset.promise,
                rpgAsset.promise,
                shotgunAsset.promise,
                smgAsset.promise,
                sniperAsset.promise,
                ybotTopAnimatedAsset.promise,
                ybotBottomAnimatedAsset.promise
            ]);
            ak47Asset.removeAllFromScene();
            crossbowAsset.removeAllFromScene();
            karambitAsset.removeAllFromScene();
            marksmanAsset.removeAllFromScene();
            pistolAsset.removeAllFromScene();
            revolverAsset.removeAllFromScene();
            rpgAsset.removeAllFromScene();
            shotgunAsset.removeAllFromScene();
            smgAsset.removeAllFromScene();
            sniperAsset.removeAllFromScene();
            ybotTopAnimatedAsset.removeAllFromScene();
            ybotBottomAnimatedAsset.removeAllFromScene();
            ybotTop = new AnimatedAssetClone(ybotTopAnimatedAsset, scene);
            ybotTop.setParent(compoundBody, new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 0, 0));
            spineBone = ybotTop.skeleton.bones[1];
            ybotBottom = new AnimatedAssetClone(ybotBottomAnimatedAsset, scene);
            ybotBottom.setParent(compoundBody, new BABYLON.Vector3(0, -1, 0), new BABYLON.Vector3(0, 0, 0));
            const ak47 = new AssetClone(ak47Asset, scene);
            // ak47.position.copyFrom(new BABYLON.Vector3(9, 11, 9));
            // ak47.rotation.copyFrom(new BABYLON.Vector3(0.8, 1.2, -1.8));
            const crossbow = new AssetClone(crossbowAsset, scene);
            // crossbow.meshes[0].renderingGroupId = 1;
            const marksman = new AssetClone(marksmanAsset, scene);
            const karambit = new AssetClone(karambitAsset, scene);
            // karambit.position.copyFrom(new BABYLON.Vector3(-5, -1, -4));
            // karambit.rotation.copyFrom(new BABYLON.Vector3(-1.5, -1.5, 0));
            const pistol = new AssetClone(pistolAsset, scene);
            // pistol.position.copyFrom(new BABYLON.Vector3(-4, 3, 9));
            // pistol.rotation.copyFrom(new BABYLON.Vector3(0.8, 1.2, -1.6));
            const revolver = new AssetClone(revolverAsset, scene);
            const rpg = new AssetClone(rpgAsset, scene);
            const shotgun = new AssetClone(shotgunAsset, scene);
            const smg = new AssetClone(smgAsset, scene);
            const sniper = new AssetClone(sniperAsset, scene);
            ybotTop.meshes[0].setParent(ybotTop.meshes[2]);
            ybotTop.meshes[1].setParent(ybotTop.meshes[2]);
            ybotTop.animate('RifleAim');
            ybotBottom.animate('Idle');
            ak47Collider = BABYLON.MeshBuilder.CreateBox('ak47', { width: 1.2, height: 0.4, depth: 0.2 }, scene);
            const weaponColliderMaterial = new BABYLON.StandardMaterial('', scene);
            weaponColliderMaterial.diffuseColor = new BABYLON.Color3(0, 1, 1);
            weaponColliderMaterial.wireframe = true;
            ak47Collider.material = weaponColliderMaterial;
            ak47.setParent(ak47Collider, new BABYLON.Vector3(), new BABYLON.Vector3());
            ak47.show();
            ak47Collider.physicsImpostor = new BABYLON.PhysicsImpostor(ak47Collider, BABYLON.PhysicsImpostor.BoxImpostor, {
                mass: 1,
                restitution: 0,
                nativeOptions: {
                    collisionFilterGroup: 32,
                    collisionFilterMask: 1 | 2 | 4
                }
            }, scene);
            // ak47Collider.position.x += 2.5;
            // ak47Collider.position.y += 20;
            // ak47Collider.position.z += 8;
            // ak47Collider.rotationQuaternion = new BABYLON.Vector3(0, 0, 0.5).toQuaternion();
            weapons.push(ak47Collider);
            weaponPhysicsImposters.push(ak47Collider.physicsImpostor);
            crossbowCollider = BABYLON.MeshBuilder.CreateBox('crossbow', { width: 1, height: 0.3, depth: 0.75 }, scene);
            crossbowCollider.material = weaponColliderMaterial;
            crossbow.setParent(crossbowCollider, new BABYLON.Vector3(-0.22, 0.05, 0), new BABYLON.Vector3());
            crossbow.show();
            crossbowCollider.physicsImpostor = new BABYLON.PhysicsImpostor(crossbowCollider, BABYLON.PhysicsImpostor.BoxImpostor, {
                mass: 1,
                restitution: 0,
                nativeOptions: {
                    collisionFilterGroup: 32,
                    collisionFilterMask: 1 | 2 | 4
                }
            }, scene);
            crossbowCollider.position.x += 2.5;
            crossbowCollider.position.y += 25;
            crossbowCollider.position.z += 8;
            crossbowCollider.rotationQuaternion = new BABYLON.Vector3(0, 0, 0.5).toQuaternion();
            weapons.push(crossbowCollider);
            weaponPhysicsImposters.push(crossbowCollider.physicsImpostor);
            // Environment: 1 / 2 | 4 | 16 | 32
            // Team Players: 2 / 1 | 16
            // Enemy Players: 4 / 1 | 16
            // Fast Projectiles: 8 / none
            // Slow Projectiles: 16 / 1 | 2 | 4 | 16
            // Weapons: 32 / 1
            // Nothing: 64
            // Other players
            let z = -30;
            z = -4;
            let y = 5;
            for (let i = 0; i < 1; i++) {
                // Other players' physics capsule (orange wireframe)
                const wireframeMaterial2 = new BABYLON.StandardMaterial('', scene);
                wireframeMaterial2.wireframe = true;
                wireframeMaterial2.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
                wireframeMaterial2.alpha = 0.1;
                const bottom2 = BABYLON.MeshBuilder.CreateSphere('bottom2', { diameter: 0.7, segments: 4 }, scene);
                // bottom2.isPickable = false;
                bottom2.material = wireframeMaterial2;
                bottom2.position.y -= 0.65;
                const middle2 = BABYLON.MeshBuilder.CreateCylinder('middle2', { diameter: 0.7, height: 1.3 }, scene);
                // middle2.isPickable = false;
                middle2.material = wireframeMaterial2;
                // middle2.position.y += 1;
                const top2 = BABYLON.MeshBuilder.CreateSphere('top2', { diameter: 0.7, segments: 4 }, scene);
                // top2.isPickable = false;
                top2.position.y += 0.65;
                top2.material = wireframeMaterial2;
                compoundBody2 = new BABYLON.Mesh('compoundBody2', scene);
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
                        collisionFilterGroup: 4,
                        collisionFilterMask: 1 | 16
                    }
                }, scene);
                compoundBody2.physicsImpostor.physicsBody.angularDamping = 1;
                // Other players' imported models
                const ybotTop = new AnimatedAssetClone(ybotTopAnimatedAsset, scene);
                ybotTop.setParent(compoundBody2, new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 0, 0));
                const ybotBottom = new AnimatedAssetClone(ybotBottomAnimatedAsset, scene);
                ybotBottom.setParent(compoundBody2, new BABYLON.Vector3(0, -1, 0), new BABYLON.Vector3(0, 0, 0));
                const ak47 = new AssetClone(ak47Asset, scene);
                // ak47.position.copyFrom(new BABYLON.Vector3(9, 11, 9));
                // ak47.rotation.copyFrom(new BABYLON.Vector3(0.8, 1.2, -1.8));
                const ak47Collider = BABYLON.MeshBuilder.CreateBox('ak47', { width: 1.2, height: 0.4, depth: 0.2 }, scene);
                const weaponColliderMaterial = new BABYLON.StandardMaterial('', scene);
                weaponColliderMaterial.diffuseColor = new BABYLON.Color3(0, 1, 1);
                weaponColliderMaterial.wireframe = true;
                ak47Collider.material = weaponColliderMaterial;
                // If prepare is not called, weapon will stay at spawn position until skeleton is in view
                ybotTop.skeleton.prepare();
                ak47.setParent(ak47Collider, new BABYLON.Vector3(), new BABYLON.Vector3());
                ak47.show();
                ak47Collider.physicsImpostor = new BABYLON.PhysicsImpostor(ak47Collider, BABYLON.PhysicsImpostor.BoxImpostor, {
                    mass: 1,
                    restitution: 0,
                    nativeOptions: {
                        collisionFilterGroup: 32,
                        collisionFilterMask: 1 | 2 | 4
                    }
                }, scene);
                const pistol = new AssetClone(pistolAsset, scene);
                // pistol.position.copyFrom(new BABYLON.Vector3(-4, 3, 9));
                // pistol.rotation.copyFrom(new BABYLON.Vector3(0.8, 1.2, -1.6));
                const knife = new AssetClone(karambitAsset, scene);
                // knife.position.copyFrom(new BABYLON.Vector3(-5, -1, -4));
                // knife.rotation.copyFrom(new BABYLON.Vector3(-1.5, -1.5, 0));
                const crossbow = new AssetClone(crossbowAsset, scene);
                const crossbowCollider = BABYLON.MeshBuilder.CreateBox('crossbow', { width: 1, height: 0.3, depth: 0.75 }, scene);
                crossbowCollider.material = weaponColliderMaterial;
                crossbow.setParent(crossbowCollider, new BABYLON.Vector3(-0.22, 0.05, 0), new BABYLON.Vector3());
                crossbow.show();
                crossbowCollider.physicsImpostor = new BABYLON.PhysicsImpostor(crossbowCollider, BABYLON.PhysicsImpostor.BoxImpostor, {
                    mass: 1,
                    restitution: 0,
                    nativeOptions: {
                        collisionFilterGroup: 32,
                        collisionFilterMask: 1 | 2 | 4
                    }
                }, scene);
                // crossbowCollider.position.x += 2.5;
                // crossbowCollider.position.y += 25;
                // crossbowCollider.position.z += 8;
                // crossbowCollider.rotationQuaternion = new BABYLON.Vector3(0, 0, 0.5).toQuaternion();
                weapons.push(crossbowCollider);
                weaponPhysicsImposters.push(crossbowCollider.physicsImpostor);
                ybotTop.meshes[0].setParent(ybotTop.meshes[2]);
                ybotTop.meshes[1].setParent(ybotTop.meshes[2]);
                ybotTop.animate('RifleAim');
                ybotBottom.animate('Idle');
                // ybotTop.attachToBone(pistol.meshes[0], 37);
                // pistol.show();
                // ybotTop.attachToBone(knife.meshes[0], 37);
                // knife.show();
                // const fireStart = BABYLON.MeshBuilder.CreateBox('', { size: 0.1 }, scene);
                // fireStart.isPickable = false;
                // fireStart.setParent(compoundBody2);
                // fireStart.position = new BABYLON.Vector3(-0.4, 0.65, 0.2);
                // const throwStart = BABYLON.MeshBuilder.CreateBox('', { size: 0.1 }, scene);
                // throwStart.isPickable = false;
                // throwStart.setParent(compoundBody2);
                // throwStart.position = new BABYLON.Vector3(-0.4, 0.65, -0.2);
                players.push({
                    ybotTop,
                    ybotBottom,
                    ak47Collider,
                    crossbowCollider
                });
            }
        });
        // Your player's physics capsule (blue wireframe)
        const wireframeMaterial = new BABYLON.StandardMaterial('', scene);
        wireframeMaterial.wireframe = true;
        wireframeMaterial.diffuseColor = new BABYLON.Color3(0, 0, 1);
        wireframeMaterial.alpha = 0.1;
        const bottom = BABYLON.MeshBuilder.CreateSphere('bottom', { diameter: 0.7, segments: 4 }, scene);
        bottom.isPickable = false;
        bottom.material = wireframeMaterial;
        bottom.position.y -= 0.65;
        const middle = BABYLON.MeshBuilder.CreateCylinder('middle', { diameter: 0.7, height: 1.3 }, scene);
        // middle.isPickable = false;
        middle.material = wireframeMaterial;
        middle.setParent(bottom);
        const top = BABYLON.MeshBuilder.CreateSphere('top', { diameter: 0.7, segments: 4 }, scene);
        // top.isPickable = false;
        top.position.y += 0.65;
        top.material = wireframeMaterial;
        const compoundBody = new BABYLON.Mesh('compoundBody', scene);
        compoundBody.addChild(bottom);
        compoundBody.addChild(middle);
        compoundBody.addChild(top);
        compoundBody.position.y += 1;
        compoundBody.position.z += 2;
        // gui.add(compoundBody.absolutePosition, 'x').name('x').step(positionStep).listen();
        // gui.add(compoundBody.absolutePosition, 'y').name('y').step(positionStep).listen();
        // gui.add(compoundBody.absolutePosition, 'z').name('z').step(positionStep).listen();
        let compoundBody2;
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
            // restitution: 0,
            nativeOptions: {
                collisionFilterGroup: 2,
                collisionFilterMask: 1 | 16
            }
        }, scene);
        compoundBody.physicsImpostor.physicsBody.angularDamping = 1;
        // compoundBody.physicsImpostor.physicsBody.collisionResponse = 0;
        // compoundBody.physicsImpostor.onCollideEvent = (self, other) => {
        //     console.log('onCollideEvent');
        // }
        // compoundBody.physicsImpostor.registerOnPhysicsCollide(weaponPhysicsImposters, (self, other) => {
        //     console.log('registerOnPhysicsCollide');
        // });
        // const muzzle = new BABYLON.TransformNode('muzzle', scene);
        // const muzzle = new BABYLON.Mesh('muzzle', scene);
        const fireStart = BABYLON.MeshBuilder.CreateBox('', { size: 0.1 }, scene);
        fireStart.isPickable = false;
        fireStart.setParent(compoundBody);
        fireStart.position = new BABYLON.Vector3(-0.5, 0.65, 0.2);
        const throwStart = BABYLON.MeshBuilder.CreateBox('', { size: 0.1 }, scene);
        throwStart.isPickable = false;
        throwStart.setParent(compoundBody);
        throwStart.position = new BABYLON.Vector3(-0.5, 0.65, -0.2);
        // Camera target mesh (invisible) for third-person camera
        const cameraTargetMesh = BABYLON.MeshBuilder.CreateBox('cameraTargetMesh', { size: 0.1 }, scene);
        const cameraTargetMaterial = new BABYLON.StandardMaterial('', scene);
        cameraTargetMaterial.diffuseColor = new BABYLON.Color3(0, 0, 1);
        cameraTargetMaterial.alpha = 0.25;
        cameraTargetMesh.material = cameraTargetMaterial;
        cameraTargetMesh.visibility = 0;
        cameraTargetMesh.isPickable = false;
        cameraTargetMesh.setParent(compoundBody);
        cameraTargetMesh.position = new BABYLON.Vector3(0, 0.65, 1);
        camera.lockedTarget = cameraTargetMesh;
        // Camera target mesh (invisible) for third-person camera
        const cameraMesh = BABYLON.MeshBuilder.CreateBox('cameraMesh', { size: 0.1 }, scene);
        const cameraMaterial = new BABYLON.StandardMaterial('', scene);
        cameraMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
        cameraMaterial.alpha = 0.25;
        cameraMesh.material = cameraMaterial;
        cameraMesh.visibility = 0;
        cameraMesh.isPickable = false;
        // cameraMesh.setParent(compoundBody);
        // cameraMesh.setParent(cameraTargetMesh);
        // cameraMesh.position = new BABYLON.Vector3(0, 0.65, 1);
        // Slide (red)
        const slide = BABYLON.MeshBuilder.CreateBox('slide', { width: 3, height: 20 }, scene);
        const slideMaterial = new BABYLON.StandardMaterial('', scene);
        slideMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
        // slideMaterial.alpha = 0.5;
        slide.material = slideMaterial;
        slide.position.x += 2.5;
        slide.position.y += 0;
        slide.rotation.x += Math.PI / 3;
        // slide.checkCollisions = true;
        obstacles.add(slide);
        slide.physicsImpostor = new BABYLON.PhysicsImpostor(slide, BABYLON.PhysicsImpostor.BoxImpostor, {
            mass: 0,
            // friction: 0,
            // restitution: 0.5,
            nativeOptions: {
                collisionFilterGroup: 1,
                collisionFilterMask: 2 | 4 | 16 | 32
            }
        }, scene);
        slide.physicsImpostor.sleep();
        obstaclePhysicsImposters.push(slide.physicsImpostor);
        // Ground (white)
        // const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 100, height: 100 }, scene);
        const ground = BABYLON.MeshBuilder.CreateBox('ground', { width: 20, height: 1, depth: 200 }, scene);
        const groundMaterial = new BABYLON.StandardMaterial('', scene);
        groundMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        // groundMaterial.alpha = 0.5;
        ground.material = groundMaterial;
        // ground.checkCollisions = true;
        ground.position.y -= 0.5;
        obstacles.add(ground);
        ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, {
            mass: 0,
            // friction: 0,
            // restitution: 0.5,
            nativeOptions: {
                collisionFilterGroup: 1,
                collisionFilterMask: 2 | 4 | 16 | 32
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
        z = 0;
        for (let i = 0; i < 1; i++) {
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
                // restitution: 0.5,
                nativeOptions: {
                    collisionFilterGroup: 1,
                    collisionFilterMask: 2 | 4 | 16 | 32
                }
            }, scene);
            pillar.physicsImpostor.sleep();
            // pillar.physicsImpostor.physicsBody.sleep();
            // pillar.physicsImpostor.physicsBody.linearDamping = 1;
            obstaclePhysicsImposters.push(pillar.physicsImpostor);
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
            fireKeyDown: false,
            pickupKeyDown: false,
            throwGrenadeDown: false
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
                        case 'e':
                        case 'E':
                            command.pickupKeyDown = true;
                            break;
                        case 'q':
                        case 'Q':
                            command.throwGrenadeDown = true;
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
                        case 'e':
                        case 'E':
                            command.pickupKeyDown = false;
                            break;
                        case 'q':
                        case 'Q':
                            command.throwGrenadeDown = false;
                            break;
                    }
                    break;
            }
        });
        let otherBeta = 0;
        otherBeta = Math.PI / 2;
        // otherBeta = Math.PI;
        let dBeta = 1e-2;
        dBeta = 0;
        // Physics steps
        scene.onBeforeStepObservable.add(() => {
            // Player move
            command.frameTime = Date.now();
            command.cameraAlpha = camera.alpha;
            command.cameraBeta = camera.beta;
            move(command);
            for (const [uniqueID, item] of bullets) {
                const { bullet, ray, rayHelper } = item;
                // bullet.computeWorldMatrix(true);
                bullet.physicsImpostor.applyForce(new BABYLON.Vector3(0, 9.8 * 1e-10, 0), bullet.getAbsolutePosition());
                let hit = false;
                obstacles.forEach(obstacle => {
                    const pick = ray.intersectsMesh(obstacle, false);
                    if (pick.hit) {
                        hit = true;
                    }
                });
                if (hit) {
                    // console.log(`%cRay hit: ${pick.pickedMesh.name}`, 'color: red; font-weight: bold;');
                    // console.log(`Ray length: ${ray.length}`);
                    // console.log('Ray origin: ', ray.origin.clone());
                    // console.log('Ray direction: ', ray.direction.clone());
                    // console.log('Ray: ', ray);
                    bullet.physicsImpostor.sleep();
                    bullets.delete(bullet.uniqueId);
                    bullet.physicsImpostor.dispose();
                    bullet.dispose();
                    rayHelper.dispose();
                }
            }
            for (const [uniqueID, item] of grenades) {
                const { grenade, bounceTime } = item;
                // console.log('for ', bounceTime);
                if (Date.now() - bounceTime > grenadeLifetime) {
                    const position = grenade.getAbsolutePosition();
                    smoke(position);
                    flame(position);
                    grenades.delete(grenade.uniqueId);
                    grenade.physicsImpostor.dispose();
                    grenade.dispose();
                }
            }
            players.forEach(player => {
                const { ybotTop, ybotBottom, ak47Collider } = player;
                if (ybotTop !== undefined) { }
            });
            if (ybotTop !== undefined) { }
        });
        // scene.onAfterStepObservable.add(() => {});
        scene.registerBeforeRender(() => {
            players.forEach(player => {
                const { ybotTop, ybotBottom, ak47Collider, crossbowCollider } = player;
                if (ybotTop !== undefined) {
                    ybotBottom.meshes[0].computeWorldMatrix(true);
                    ybotTop.meshes[2].setAbsolutePosition(ybotBottom.skeleton.bones[0].getAbsolutePosition(ybotBottom.meshes[0]).subtract(new BABYLON.Vector3(0, 1.1, 0)));
                    ybotTop.meshes[2].computeWorldMatrix(true);
                    // const weaponCollider = ak47Collider;
                    const weaponCollider = crossbowCollider;
                    if (weaponCollider !== undefined) {
                        const scale = new BABYLON.Vector3();
                        const rotation = new BABYLON.Quaternion();
                        const position = new BABYLON.Vector3();
                        const matrix = ybotTop.skeleton.bones[37].getWorldMatrix();
                        const matrix2 = ybotTop.meshes[2].getWorldMatrix();
                        // const matrix2 = compoundBody2.getWorldMatrix();
                        const matrix3 = matrix.multiply(matrix2);
                        matrix3.decompose(scale, rotation, position);
                        weaponCollider.setAbsolutePosition(position);
                        const rotationMatrix = new BABYLON.Matrix();
                        rotation.toRotationMatrix(rotationMatrix);
                        const translation = BABYLON.Vector3.TransformCoordinates(offsetPosition, rotationMatrix);
                        weaponCollider.position.addInPlace(translation);
                        weaponCollider.rotationQuaternion = rotation;
                        weaponCollider.rotationQuaternion.multiplyInPlace(offsetRotation.toQuaternion());
                        weaponCollider.scaling = scaling;
                    }
                    const otherSpineBone = ybotTop.skeleton.bones[1];
                    const otherSpineBone1 = ybotTop.skeleton.bones[2];
                    // const otherSpineBone2 = ybotTop.skeleton.bones[3];
                    const viewAngleX = (Math.PI * 0.8 - otherBeta) * 0.1;
                    otherBeta += dBeta;
                    if (otherBeta > Math.PI || otherBeta < 0)
                        dBeta *= -1;
                    otherSpineBone.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(viewAngleX, 0, -viewAngleX);
                    otherSpineBone1.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(viewAngleX, 0, -viewAngleX);
                    // otherSpineBone2.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(viewAngleX, 0, -viewAngleX);
                }
            });
            if (ybotTop !== undefined) {
                ybotBottom.meshes[0].computeWorldMatrix(true);
                ybotTop.meshes[2].setAbsolutePosition(ybotBottom.skeleton.bones[0].getAbsolutePosition(ybotBottom.meshes[0]).subtract(new BABYLON.Vector3(0, 1.1, 0)));
                ybotTop.meshes[2].computeWorldMatrix(true);
                // const weaponCollider = ak47Collider;
                const weaponCollider = crossbowCollider;
                if (weaponCollider !== undefined) {
                    const scale = new BABYLON.Vector3();
                    const rotation = new BABYLON.Quaternion();
                    const position = new BABYLON.Vector3();
                    // ybotTop.skeleton.bones[37].computeWorldMatrix(true);
                    const matrix = ybotTop.skeleton.bones[37].getWorldMatrix();
                    const matrix2 = ybotTop.meshes[2].getWorldMatrix();
                    const matrix3 = matrix.multiply(matrix2);
                    matrix3.decompose(scale, rotation, position);
                    weaponCollider.setAbsolutePosition(position);
                    // ak47.setAbsolutePosition(ybotTop.skeleton.bones[37].getAbsolutePosition(ybotTop.meshes[2]));
                    const rotationMatrix = new BABYLON.Matrix();
                    rotation.toRotationMatrix(rotationMatrix);
                    const translation = BABYLON.Vector3.TransformCoordinates(offsetPosition, rotationMatrix);
                    weaponCollider.position.addInPlace(translation);
                    weaponCollider.rotationQuaternion = rotation;
                    weaponCollider.rotationQuaternion.multiplyInPlace(offsetRotation.toQuaternion());
                    // ak47.rotationQuaternion.multiplyInPlace(compoundBody.rotationQuaternion);
                    weaponCollider.scaling = scaling;
                }
                const otherSpineBone = ybotTop.skeleton.bones[1];
                const otherSpineBone1 = ybotTop.skeleton.bones[2];
                // const otherSpineBone2 = ybotTop.skeleton.bones[3];
                const viewAngleX = (Math.PI * 0.8 - command.cameraBeta) * 0.1;
                otherSpineBone.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(viewAngleX, 0, -viewAngleX);
                otherSpineBone1.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(viewAngleX, 0, -viewAngleX);
                // otherSpineBone2.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(viewAngleX, 0, -viewAngleX);
            }
        });
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
        let prevFireTime = 0;
        const betweenFireTime = 10;
        let numBulletsFired = 0;
        const bulletMesh = BABYLON.MeshBuilder.CreateBox('bullet', { width: 1000, height: 0.05, depth: 0.05 }, scene);
        bulletMesh.isPickable = false;
        const bulletMat = new BABYLON.StandardMaterial('', scene);
        bulletMat.diffuseColor = new BABYLON.Color3(1, 1, 0);
        // bulletMat.emissiveColor = new BABYLON.Color3(1, 1, 0);
        bulletMesh.material = bulletMat;
        bulletMesh.setEnabled(false);
        gl.addIncludedOnlyMesh(bulletMesh);
        // const fire = (clientFrameTime: number, position: BABYLON.Vector3, rotation: BABYLON.Vector3): void => {
        const fire = (clientFrameTime) => {
            if (clientFrameTime - prevFireTime > betweenFireTime) {
                console.log(numBulletsFired);
                numBulletsFired++;
                cameraMesh.computeWorldMatrix(true);
                const forward = new BABYLON.Vector3(1, 0, 0);
                const transform = cameraMesh.getWorldMatrix();
                const forwardWorld = BABYLON.Vector3.TransformNormal(forward, transform);
                const direction = BABYLON.Vector3.Normalize(forwardWorld);
                console.log('direction: ', direction);
                const bullet = bulletMesh.createInstance('');
                bullet.isPickable = false;
                bullet.physicsImpostor = new BABYLON.PhysicsImpostor(bullet, BABYLON.PhysicsImpostor.NoImpostor, {
                    mass: 1e-10,
                    nativeOptions: {
                        collisionFilterGroup: 8,
                        collisionFilterMask: 64
                    }
                }, scene);
                // bullet.physicsImpostor.physicsBody.collisionResponse = 0;
                // const muzzle = compoundBody.position.add(new BABYLON.Vector3());
                // const dir = camera.getForwardRay(1).direction;
                // console.log('dir: ', dir);
                const dir = direction;
                // const origin = camera.position.add(dir.scale(3));
                const origin = cameraMesh.getAbsolutePosition();
                const view = new BABYLON.Ray(origin, dir, 1000);
                const pick = scene.pickWithRay(view);
                fireStart.computeWorldMatrix(true);
                const fireStartPos = fireStart.getAbsolutePosition();
                const finalDir = pick.pickedPoint.subtract(fireStartPos).normalize();
                // bullet.position.copyFrom(fireStartPos);
                bullet.setAbsolutePosition(fireStartPos);
                const { x: dx, y: dy, z: dz } = pick.pickedPoint.subtract(fireStartPos);
                const v1 = new BABYLON.Vector3(1, 0, 0);
                const v2 = new BABYLON.Vector3(dx, dy, dz);
                const c = v1.cross(v2);
                const q = new BABYLON.Quaternion();
                q.x = c.x;
                q.y = c.y;
                q.z = c.z;
                q.w = Math.sqrt(Math.pow(v1.length(), 2) * Math.pow(v2.length(), 2)) + BABYLON.Vector3.Dot(v1, v2);
                q.normalize();
                bullet.rotationQuaternion = q;
                // // @ts-ignore
                // const ray = new BABYLON.Ray();
                const ray = new BABYLON.Ray(new BABYLON.Vector3(), new BABYLON.Vector3(1, 0, 0), 1);
                const rayHelper = new BABYLON.RayHelper(ray);
                // bullet.computeWorldMatrix(true);
                rayHelper.attachToMesh(bullet, new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(0, 0, 0), 2);
                // rayHelper.show(scene, new BABYLON.Color3(1, 0, 0));
                bullet.physicsImpostor.setLinearVelocity(finalDir.scale(100));
                bullets.set(bullet.uniqueId, {
                    bullet,
                    ray,
                    rayHelper
                });
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
        const pickup = () => {
            weapons.forEach(weapon => {
                const dist = compoundBody.position.subtract(weapon.position).length();
                console.log(dist);
                if (dist < 1) {
                    console.log('yay');
                }
            });
        };
        let prevThrowTime = 0;
        const betweenThrowTime = 100;
        // let numBulletsFired = 0;
        const grenadeMesh = BABYLON.MeshBuilder.CreateSphere('grenade', { diameter: 0.25, segments: 4 }, scene);
        // const grenadeMesh = BABYLON.MeshBuilder.CreateBox('grenade', { width: 0.25, height: 0.25, depth: 0.25 }, scene);
        grenadeMesh.isPickable = false;
        const grenadeMat = new BABYLON.StandardMaterial('', scene);
        grenadeMat.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
        grenadeMat.emissiveColor = new BABYLON.Color3(1, 0.5, 0);
        grenadeMesh.material = grenadeMat;
        grenadeMesh.setEnabled(false);
        // gl.addIncludedOnlyMesh(grenadeMesh);
        const throwGrenade = (clientFrameTime) => {
            if (clientFrameTime - prevThrowTime > betweenThrowTime) {
                const grenade = grenadeMesh.createInstance('');
                grenade.isPickable = false;
                const dir = camera.getForwardRay(1).direction;
                const origin = camera.position.add(dir.scale(3));
                const view = new BABYLON.Ray(origin, dir, 1000);
                const pick = scene.pickWithRay(view);
                const throwStartPos = throwStart.getAbsolutePosition();
                const finalDir = pick.pickedPoint.subtract(throwStartPos).normalize();
                grenade.position.copyFrom(throwStartPos);
                const { x: dx, y: dy, z: dz } = pick.pickedPoint.subtract(throwStartPos);
                const v1 = new BABYLON.Vector3(1, 0, 0);
                const v2 = new BABYLON.Vector3(dx, dy, dz);
                const c = v1.cross(v2);
                const q = new BABYLON.Quaternion();
                q.x = c.x;
                q.y = c.y;
                q.z = c.z;
                q.w = Math.sqrt(Math.pow(v1.length(), 2) * Math.pow(v2.length(), 2)) + BABYLON.Vector3.Dot(v1, v2);
                q.normalize();
                grenade.rotationQuaternion = q;
                grenade.physicsImpostor = new BABYLON.PhysicsImpostor(grenade, BABYLON.PhysicsImpostor.BoxImpostor, {
                    mass: 1e-10,
                    restitution: 0.5,
                    nativeOptions: {
                        collisionFilterGroup: 16,
                        collisionFilterMask: 1 | 2 | 4 | 16
                    }
                }, scene);
                grenade.physicsImpostor.physicsBody.angularDamping = 0.999;
                // bullet.physicsImpostor.physicsBody.collisionResponse = 0;
                let bounceTime;
                const obj = {
                    grenade,
                    bounceTime
                };
                grenades.set(grenade.uniqueId, obj);
                grenade.physicsImpostor.onCollideEvent = (self, other) => {
                    // console.log('onCollideEvent');
                    // @ts-ignore
                    console.log(other.object.name);
                    // self.sleep();
                    if (obj.bounceTime === undefined) {
                        obj.bounceTime = Date.now();
                        // console.log('bounce ', bounceTime);
                    }
                };
                // // @ts-ignore
                // const ray = new BABYLON.Ray();
                // const ray = new BABYLON.Ray(new BABYLON.Vector3(), new BABYLON.Vector3(1, 0, 0), 1);
                // const rayHelper = new BABYLON.RayHelper(ray);
                // grenade.computeWorldMatrix(true);
                // rayHelper.attachToMesh(grenade, new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(0, 0, 0), 2);
                // rayHelper.show(scene, new BABYLON.Color3(1, 0, 0));
                grenade.physicsImpostor.setLinearVelocity(finalDir.scale(15));
                // grenade.physicsImpostor.sleep();
                prevThrowTime = clientFrameTime;
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
            // if (spineBone) {
            //     const viewAngleX = (Math.PI / 2 - command.cameraBeta) * 1;
            //     spineBone.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(viewAngleX, 0, -viewAngleX);
            // }
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
            // console.log(command.cameraAlpha)
            const viewAngleY = -command.cameraAlpha;
            compoundBody.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, viewAngleY, 0);
            direction.x = Number(command.moveBackwardKeyDown) - Number(command.moveForwardKeyDown);
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
            // cameraTargetMesh.computeWorldMatrix(true);
            const cameraTargetPosition = cameraTargetMesh.getAbsolutePosition();
            const cameraRotation = new BABYLON.Vector3(0, Math.PI - command.cameraAlpha, command.cameraBeta - Math.PI / 2);
            // const cameraRotation = new BABYLON.Vector3(0, 0, -command.cameraBeta - Math.PI / 2);
            cameraMesh.rotationQuaternion = cameraRotation.toQuaternion();
            cameraMesh.setAbsolutePosition(cameraTargetPosition);
            // const scale = new BABYLON.Vector3();
            // const rotation = new BABYLON.Quaternion();
            // const position = new BABYLON.Vector3();
            // const matrix = cameraTargetMesh.getWorldMatrix();
            // matrix.decompose(scale, rotation, position);
            // cameraMesh.setAbsolutePosition(position);
            // cameraMesh.rotationQuaternion = rotation;
            if (command.fireKeyDown) {
                // fire(command.frameTime, cameraPosition, cameraRotation);
                fire(command.frameTime);
            }
            if (command.pickupKeyDown) {
                pickup();
            }
            if (command.throwGrenadeDown) {
                // ybotTop.animate('Throw');
                throwGrenade(command.frameTime);
            }
            prevFrameTime = command.frameTime;
        };
        const flameTexture = new BABYLON.Texture('https://assets.babylonjs.com/particles/textures/explosion/FlameBlastSpriteSheet.png', scene, true, false);
        const flameTexture2 = new BABYLON.Texture('https://static.packt-cdn.com/products/9781785883910/graphics/4bfc14e9-f288-4e14-85bb-f46f71cf5192.png', scene, true, false);
        const smokeTexture = new BABYLON.Texture('https://assets.babylonjs.com/particles/textures/explosion/Smoke_SpriteSheet_8x8.png', scene, true, false);
        const smoke = (position) => {
            const ps = new BABYLON.ParticleSystem('', 20, scene);
            ps.emitter = position;
            ps.createCylinderEmitter(1, 0.5);
            // ps.particleTexture = smokeTexture.clone();
            ps.particleTexture = flameTexture2.clone();
            ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_MULTIPLYADD;
            // ps.color1 = new BABYLON.Color4(0.75, 0.5, 0.5, 1.0);
            // ps.color2 = new BABYLON.Color4(0.5, 0.25, 0.25, 1.0);
            // ps.colorDead = new BABYLON.Color4(0, 0, 0, 1.0);
            ps.emitRate = 100;
            ps.minEmitPower = 1;
            ps.maxEmitPower = 2;
            ps.minSize = 0.1;
            ps.maxSize = 1;
            ps.minLifeTime = 1;
            ps.maxLifeTime = 1;
            ps.addVelocityGradient(0, 1);
            ps.addVelocityGradient(0.25, 0.5);
            ps.addVelocityGradient(1, 0.1);
            ps.isAnimationSheetEnabled = true;
            // ps.startSpriteCellID = 0;
            // ps.endSpriteCellID = 63;
            // ps.spriteCellHeight = 128;
            // ps.spriteCellWidth = 128;
            ps.startSpriteCellID = 0;
            ps.endSpriteCellID = 31;
            ps.spriteCellHeight = 150;
            ps.spriteCellWidth = 150;
            ps.start();
            ps.targetStopDuration = 1;
            ps.disposeOnStop = true;
        };
        const flame = (position) => {
            const ps = new BABYLON.ParticleSystem('', 20, scene);
            ps.emitter = position;
            ps.createConeEmitter(0.5, 0);
            ps.particleTexture = flameTexture2.clone();
            ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_MULTIPLYADD;
            ps.color1 = new BABYLON.Color4(1, 1, 0.75, 1.0);
            ps.color2 = new BABYLON.Color4(1, 0, 0, 1.0);
            ps.colorDead = new BABYLON.Color4(0, 0, 0, 1.0);
            ps.emitRate = 100;
            ps.minEmitPower = 0.5;
            ps.maxEmitPower = 2;
            ps.minSize = 0.1;
            ps.maxSize = 1.5;
            ps.minLifeTime = 1;
            ps.maxLifeTime = 1;
            // ps.useRampGradients = true;
            // ps.addRampGradient(0, new BABYLON.Color3(1, 1, 1));
            // ps.addRampGradient(0.1, new BABYLON.Color3(0.75, 0.75, 0));
            // ps.addRampGradient(0.3, new BABYLON.Color3(1, 0, 0));
            // ps.addRampGradient(0.5, new BABYLON.Color3(0.75, 0, 0));
            // ps.addRampGradient(1, new BABYLON.Color3(0, 0, 0));
            // ps.particleTexture = new BABYLON.Texture("textures/player.png", scene, true,
            //     false, BABYLON.Texture.TRILINEAR_SAMPLINGMODE);
            ps.isAnimationSheetEnabled = true;
            // ps.startSpriteCellID = 0;
            // ps.endSpriteCellID = 15;
            // ps.spriteCellHeight = 256;
            // ps.spriteCellWidth = 256;
            ps.startSpriteCellID = 0;
            ps.endSpriteCellID = 31;
            ps.spriteCellHeight = 150;
            ps.spriteCellWidth = 150;
            ps.start();
            ps.targetStopDuration = 1;
            ps.disposeOnStop = true;
        };
        loadAssets(scene);
        return scene;
    }
}
