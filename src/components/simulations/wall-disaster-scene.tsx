"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type WallDisasterSceneProps = {
  rain: number;
  drainage: number;
  quake: number;
  stress: number;
  failureLevel: number;
  playing: boolean;
  viewMode: "perspective" | "front" | "side";
  zoomCommand: number;
};

type BasketState = {
  group: THREE.Group;
  baseX: number;
  baseY: number;
  baseZ: number;
  layer: number;
  run: number;
  depth: number;
};

type Disposable = {
  dispose: () => void;
};

const METER = 0.35;
const wallLength = 30 * METER;
const layerHeight = 1 * METER * 0.94;
const baseTop = 0.16;
const buriedLayerDrop = 0.68 * METER;
const wallInclination = THREE.MathUtils.degToRad(-6);
const backZ = -1.5 * METER;
const frontZ = backZ + 3 * METER;
const finishedGradeY = baseTop + buriedLayerDrop;
const wallBaseY = baseTop - buriedLayerDrop;
// PVC-coated green gabion wire — realistic dark green
const WIRE_GREEN = 0x3a6432;
const WIRE_GREEN_ACCENT = 0x4a7a42;
const layerSpecs = [
  { layer: 0, depthM: 3, color: WIRE_GREEN, accent: WIRE_GREEN, buried: true },
  { layer: 1, depthM: 3, color: WIRE_GREEN, accent: WIRE_GREEN_ACCENT, buried: false },
  { layer: 2, depthM: 2, color: WIRE_GREEN, accent: WIRE_GREEN, buried: false },
  { layer: 3, depthM: 2, color: WIRE_GREEN, accent: WIRE_GREEN, buried: false },
  { layer: 4, depthM: 1, color: WIRE_GREEN, accent: WIRE_GREEN, buried: false },
];

export function WallDisasterScene({
  rain,
  drainage,
  quake,
  stress,
  failureLevel,
  playing,
  viewMode,
  zoomCommand,
}: WallDisasterSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const latestRef = useRef({ rain, drainage, quake, stress, failureLevel, playing, viewMode, zoomCommand });
  const viewModeRef = useRef(viewMode);
  const zoomCommandRef = useRef(zoomCommand);

  useEffect(() => {
    latestRef.current = { rain, drainage, quake, stress, failureLevel, playing, viewMode, zoomCommand };
  }, [drainage, failureLevel, playing, quake, rain, stress, viewMode, zoomCommand]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const disposables: Disposable[] = [];
    const scene = new THREE.Scene();
    const clearSkyColor = new THREE.Color(0x92c8e8);
    const stormSkyColor = new THREE.Color(0x5f7488);
    const typhoonSkyColor = new THREE.Color(0x435467);
    const currentSkyColor = clearSkyColor.clone();
    scene.background = currentSkyColor;
    const stormFog = new THREE.Fog(currentSkyColor, 14, 34);
    scene.fog = stormFog;

    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 80);
    camera.position.set(7.4, 3.1, 7.0);
    camera.lookAt(0, 0.8, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.8, 0);
    controls.minDistance = 3.6;
    controls.maxDistance = 16;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.update();

    // ── Lighting: warm natural sunlight ──────────────────────────────────────
    const hemiLight = new THREE.HemisphereLight(0xfff4e0, 0x6b8a4e, 1.8);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff8e7, 2.6);
    keyLight.position.set(8, 10, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -12;
    keyLight.shadow.camera.right = 12;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xc8e0ff, 0.6);
    fillLight.position.set(-6, 3, -4);
    scene.add(fillLight);

    const stormLight = new THREE.PointLight(0x7dd3fc, 1.1, 18);
    stormLight.position.set(-4.8, 4.5, 3.6);
    scene.add(stormLight);

    const cloudMaterial = new THREE.MeshBasicMaterial({
      color: 0x1f2937,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const cloudGeometry = new THREE.PlaneGeometry(28, 14);
    const stormClouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    stormClouds.rotation.x = -Math.PI / 2;
    stormClouds.position.set(0, 5.0, -0.6);
    scene.add(stormClouds);
    disposables.push(cloudMaterial, cloudGeometry);

    const root = new THREE.Group();
    scene.add(root);
    const matrix = new THREE.Matrix4();

    // ── Materials ─────────────────────────────────────────────────────────────
    const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.92 });
    const topsoilMaterial = new THREE.MeshStandardMaterial({ color: 0x5c4020, roughness: 0.96 });
    const aggregateMaterial = new THREE.MeshStandardMaterial({ color: 0x8c8878, roughness: 0.95 });
    const backfillMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8c2cc,
      roughness: 0.90,
      transparent: true,
      opacity: 0.50,
      depthWrite: false,
    });
    const geotextileMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a1e2e,
      transparent: true,
      opacity: 0.50,
      side: THREE.DoubleSide,
    });
    const waterMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.34,
      roughness: 0.12,
      transmission: 0.12,
    });
    // Orange HDPE corrugated drain pipe
    const pipeMaterial = new THREE.MeshStandardMaterial({ color: 0xb85818, roughness: 0.58, metalness: 0 });
    const pipeFlowMaterial = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x0e7490,
      emissiveIntensity: 0.35,
      roughness: 0.25,
    });
    const concreteFailMaterial = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.82,
      transparent: true,
      opacity: 0.82,
    });
    disposables.push(
      grassMaterial, topsoilMaterial, aggregateMaterial,
      backfillMaterial, geotextileMaterial, waterMaterial,
      pipeMaterial, pipeFlowMaterial, concreteFailMaterial,
    );

    // ── Ground terrain ────────────────────────────────────────────────────────
    // Wide grass surface
    const groundGeom = new THREE.PlaneGeometry(24, 18);
    const ground = new THREE.Mesh(groundGeom, grassMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0.5, -0.005, 1.5);
    ground.receiveShadow = true;
    scene.add(ground);
    disposables.push(groundGeom);

    // Topsoil layer visible at the cut (excavation area)
    const toeSoilGeom = new THREE.BoxGeometry(wallLength + 1.4, 0.32, 3.2);
    const toeSoil = new THREE.Mesh(toeSoilGeom, topsoilMaterial);
    toeSoil.position.set(0, -0.16, 0.9);
    toeSoil.receiveShadow = true;
    scene.add(toeSoil);
    disposables.push(toeSoilGeom);

    // Compacted aggregate base course
    const baseGeometry = new THREE.BoxGeometry(wallLength + 0.55, baseTop, 1.5);
    const aggregateBase = new THREE.Mesh(baseGeometry, aggregateMaterial);
    aggregateBase.position.set(0, wallBaseY - baseTop / 2, 0);
    aggregateBase.receiveShadow = true;
    root.add(aggregateBase);
    disposables.push(baseGeometry);

    // Excavation zone showing embedded layer
    const excavationMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b4820,
      roughness: 0.96,
      transparent: true,
      opacity: 0.50,
      depthWrite: false,
    });
    const excavationGeometry = new THREE.BoxGeometry(wallLength + 0.9, buriedLayerDrop, 1.72);
    const excavation = new THREE.Mesh(excavationGeometry, excavationMaterial);
    excavation.position.set(0, finishedGradeY - buriedLayerDrop / 2, 0.03);
    excavation.receiveShadow = true;
    scene.add(excavation);
    disposables.push(excavationGeometry, excavationMaterial);

    // ── Free-draining granular backfill (stepped per layer) ───────────────────
    const backfillRearZ = backZ - 0.55;
    layerSpecs.forEach((spec) => {
      if (spec.buried) return;
      const layerBackZ = frontZ - spec.depthM * METER;
      const fillDepth = layerBackZ - backfillRearZ;
      const fillGeometry = new THREE.BoxGeometry(wallLength + 0.2, layerHeight + 0.03, fillDepth);
      const fill = new THREE.Mesh(fillGeometry, backfillMaterial);
      fill.position.set(0, finishedGradeY + (spec.layer - 0.5) * METER, (layerBackZ + backfillRearZ) / 2);
      fill.receiveShadow = true;
      fill.renderOrder = 1;
      scene.add(fill);
      disposables.push(fillGeometry);
    });

    // ── Undisturbed native soil (retained earth) ──────────────────────────────
    const elevatedSoilMaterial = new THREE.MeshStandardMaterial({
      color: 0x7c5828,
      roughness: 0.94,
      transparent: true,
      opacity: 0.70,
      depthWrite: false,
    });
    const soilHeight = finishedGradeY + 4 * METER + 0.15;
    const elevatedSoilGeometry = new THREE.BoxGeometry(wallLength + 0.8, soilHeight, 1.8);
    const elevatedSoil = new THREE.Mesh(elevatedSoilGeometry, elevatedSoilMaterial);
    elevatedSoil.position.set(0, soilHeight / 2, backfillRearZ - 0.9);
    elevatedSoil.receiveShadow = true;
    elevatedSoil.renderOrder = 1;
    scene.add(elevatedSoil);
    disposables.push(elevatedSoilGeometry, elevatedSoilMaterial);

    // Soil strata and loose clods make the retained earth read as excavated ground.
    const soilStrataMaterial = new THREE.LineBasicMaterial({
      color: 0x3f2b16,
      transparent: true,
      opacity: 0.42,
    });
    for (let i = 0; i < 9; i += 1) {
      const y = 0.16 + i * (soilHeight / 10) + Math.sin(i) * 0.025;
      const z = backfillRearZ + 0.02;
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-wallLength / 2 - 0.25, y, z),
        new THREE.Vector3(-wallLength / 4, y + 0.035, z),
        new THREE.Vector3(0, y - 0.015, z),
        new THREE.Vector3(wallLength / 4, y + 0.025, z),
        new THREE.Vector3(wallLength / 2 + 0.25, y - 0.02, z),
      ]);
      const line = new THREE.Line(lineGeometry, soilStrataMaterial);
      scene.add(line);
      disposables.push(lineGeometry);
    }
    disposables.push(soilStrataMaterial);

    const soilClodGeometry = new THREE.IcosahedronGeometry(0.055, 0);
    const soilClodMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.98 });
    const soilClodCount = 220;
    const soilClods = new THREE.InstancedMesh(soilClodGeometry, soilClodMaterial, soilClodCount);
    soilClods.castShadow = true;
    for (let i = 0; i < soilClodCount; i += 1) {
      const sx = -wallLength / 2 + Math.random() * wallLength;
      const nearCut = i % 3 !== 0;
      const sy = nearCut ? 0.02 + Math.random() * 0.18 : finishedGradeY + Math.random() * (soilHeight * 0.72);
      const sz = nearCut
        ? backfillRearZ - 0.05 - Math.random() * 0.35
        : backfillRearZ - 0.02 - Math.random() * 0.08;
      matrix.compose(
        new THREE.Vector3(sx, sy, sz),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random(), Math.random(), Math.random())),
        new THREE.Vector3(0.6 + Math.random() * 1.1, 0.45 + Math.random() * 0.8, 0.55 + Math.random() * 1.0),
      );
      soilClods.setMatrixAt(i, matrix);
    }
    scene.add(soilClods);
    disposables.push(soilClodGeometry, soilClodMaterial);

    // ── Geotextile filter cloth ───────────────────────────────────────────────
    const geotextileGeometry = new THREE.PlaneGeometry(wallLength + 0.2, 1.55);
    const geotextile = new THREE.Mesh(geotextileGeometry, geotextileMaterial);
    geotextile.position.set(0, finishedGradeY + 0.7, backZ - 0.04);
    geotextile.rotation.x = -0.06;
    scene.add(geotextile);
    disposables.push(geotextileGeometry);

    // ── Concrete wall comparison (appears at high rain load) ──────────────────
    const concreteComparison = new THREE.Group();
    concreteComparison.position.set(wallLength / 2 + 0.62, 0.78, 0.28);
    scene.add(concreteComparison);

    const concretePanels: THREE.Mesh[] = [];
    const concretePanelGeometry = new THREE.BoxGeometry(0.18, 1.35, 0.95);
    const concreteCrackMaterial = new THREE.LineBasicMaterial({
      color: 0x4b5563,
      transparent: true,
      opacity: 0.86,
    });
    for (let i = 0; i < 3; i += 1) {
      const panel = new THREE.Mesh(concretePanelGeometry, concreteFailMaterial);
      panel.position.set(0, i * 0.44, 0);
      panel.castShadow = true;
      panel.receiveShadow = true;
      concreteComparison.add(panel);
      concretePanels.push(panel);

      for (let c = 0; c < 3; c += 1) {
        const startY = -0.46 + c * 0.32 + Math.random() * 0.08;
        const crackGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-0.093, startY, -0.28 + Math.random() * 0.28),
          new THREE.Vector3(-0.104, startY + 0.16, -0.08 + Math.random() * 0.24),
          new THREE.Vector3(-0.096, startY + 0.34, 0.12 + Math.random() * 0.24),
        ]);
        const crack = new THREE.Line(crackGeometry, concreteCrackMaterial);
        panel.add(crack);
        disposables.push(crackGeometry);
      }
    }
    disposables.push(concretePanelGeometry, concreteCrackMaterial);

    const concreteFragmentGeometry = new THREE.BoxGeometry(0.16, 0.08, 0.18);
    const concreteFragmentMaterial = new THREE.MeshStandardMaterial({ color: 0x8f969c, roughness: 0.9 });
    const concreteFragments = new THREE.InstancedMesh(concreteFragmentGeometry, concreteFragmentMaterial, 42);
    concreteFragments.castShadow = true;
    const concreteFragmentSeeds = Array.from({ length: 42 }, (_, index) => ({
      x: wallLength / 2 + 0.2 + (index % 7) * 0.16 + Math.random() * 0.09,
      y: 0.04 + Math.random() * 0.12,
      z: 0.25 + Math.floor(index / 7) * 0.18 + Math.random() * 0.1,
      roll: Math.random() * Math.PI,
      scale: 0.45 + Math.random() * 1.2,
    }));
    root.add(concreteFragments);
    disposables.push(concreteFragmentGeometry, concreteFragmentMaterial);

    // ── Gabion baskets ────────────────────────────────────────────────────────
    const baskets: BasketState[] = [];
    const basketGroup = new THREE.Group();
    basketGroup.rotation.x = wallInclination;
    root.add(basketGroup);

    // Multi-color stone fill using per-instance color
    const stoneGeometry = new THREE.IcosahedronGeometry(0.055, 0);
    const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96 });
    const stones = new THREE.InstancedMesh(stoneGeometry, stoneMaterial, 2200);
    stones.castShadow = true;
    stones.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(2200 * 3), 3);
    // Natural stone color palette: granite gray, brown sandstone, tan limestone, dark basalt, medium gray, brown granite
    const stoneColors = [
      new THREE.Color(0x7a7470),
      new THREE.Color(0x8c7858),
      new THREE.Color(0xb4a47c),
      new THREE.Color(0x625e5a),
      new THREE.Color(0x989080),
      new THREE.Color(0x786850),
    ];
    let stoneIndex = 0;
    disposables.push(stoneGeometry, stoneMaterial);

    function addBasket({
      x,
      y,
      z,
      length,
      height,
      depth,
      color,
      layer,
      run,
    }: {
      x: number;
      y: number;
      z: number;
      length: number;
      height: number;
      depth: number;
      color: number;
      layer: number;
      run: number;
    }) {
      const group = new THREE.Group();
      group.position.set(x, y, z);

      // Wire cage face (PVC-coated green — realistic gabion appearance)
      const basketMaterial = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.46,
        metalness: 0.20,
        transparent: true,
        opacity: 0.72,
      });
      const basketGeometry = new THREE.BoxGeometry(length, height, depth);
      const basket = new THREE.Mesh(basketGeometry, basketMaterial);
      basket.castShadow = true;
      basket.receiveShadow = true;
      group.add(basket);

      // Wire mesh edges (dark green steel wire)
      const edgeGeometry = new THREE.EdgesGeometry(basketGeometry);
      const meshLines = new THREE.LineSegments(
        edgeGeometry,
        new THREE.LineBasicMaterial({ color: 0x1a2e18, transparent: true, opacity: 0.75 }),
      );
      group.add(meshLines);

      // Horizontal wires on front face
      for (let i = 0; i < 11; i += 1) {
        const railGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-length / 2, -height / 2 + (i / 10) * height, depth / 2 + 0.006),
          new THREE.Vector3(length / 2, -height / 2 + (i / 10) * height, depth / 2 + 0.006),
        ]);
        const rail = new THREE.Line(
          railGeometry,
          new THREE.LineBasicMaterial({ color: 0x1a2e18, transparent: true, opacity: 0.38 }),
        );
        group.add(rail);
        disposables.push(railGeometry);
      }

      // Diagonal bracing wires on front face
      for (let i = 0; i < 8; i += 1) {
        const crossGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-length / 2 + (i / 7) * length, -height / 2, depth / 2 + 0.008),
          new THREE.Vector3(-length / 2 + ((i + 0.7) / 7) * length, height / 2, depth / 2 + 0.008),
        ]);
        const cross = new THREE.Line(
          crossGeometry,
          new THREE.LineBasicMaterial({ color: 0x1a2e18, transparent: true, opacity: 0.30 }),
        );
        group.add(cross);
        disposables.push(crossGeometry);
      }

      // Stone fill with natural color variety
      const stoneCount = Math.min(34, 2200 - stoneIndex);
      for (let i = 0; i < stoneCount; i += 1) {
        const sx = x + (Math.random() - 0.5) * length * 0.78;
        const sy = y + (Math.random() - 0.5) * height * 0.66;
        const frontBand = i % 3 !== 0;
        const sideBand = run === 0 || run === 13;
        const sz = frontBand
          ? z + depth / 2 + 0.02 + Math.random() * 0.08
          : z + (Math.random() - 0.5) * depth * 0.72;
        const sideOffset = sideBand && i % 4 === 0 ? (run === 0 ? -length * 0.42 : length * 0.42) : 0;
        const scale = 0.55 + Math.random() * 0.7;
        matrix.compose(
          new THREE.Vector3(sx + sideOffset, sy, sz),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random(), Math.random(), Math.random())),
          new THREE.Vector3(scale, scale * (0.7 + Math.random() * 0.5), scale),
        );
        stones.setMatrixAt(stoneIndex, matrix);
        // Per-instance natural stone color
        stones.setColorAt(stoneIndex, stoneColors[Math.floor(Math.random() * stoneColors.length)]);
        stoneIndex += 1;
      }

      // Side panel wire details for end modules
      if (run === 0 || run === 13) {
        const sideX = run === 0 ? -length / 2 - 0.006 : length / 2 + 0.006;
        for (let i = 0; i < 7; i += 1) {
          const yLine = -height / 2 + (i / 6) * height;
          const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(sideX, yLine, -depth / 2),
            new THREE.Vector3(sideX, yLine, depth / 2),
          ]);
          const line = new THREE.Line(
            lineGeometry,
            new THREE.LineBasicMaterial({ color: 0x1a2e18, transparent: true, opacity: 0.40 }),
          );
          group.add(line);
          disposables.push(lineGeometry);
        }

        for (let i = 0; i < 5; i += 1) {
          const zLine = -depth / 2 + (i / 4) * depth;
          const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(sideX, -height / 2, zLine),
            new THREE.Vector3(sideX, height / 2, zLine),
          ]);
          const line = new THREE.Line(
            lineGeometry,
            new THREE.LineBasicMaterial({ color: 0x1a2e18, transparent: true, opacity: 0.34 }),
          );
          group.add(line);
          disposables.push(lineGeometry);
        }
      }

      basketGroup.add(group);
      baskets.push({ group, baseX: x, baseY: y, baseZ: z, layer, run, depth });
      disposables.push(basketGeometry, basketMaterial, edgeGeometry);
    }

    // Build all gabion courses
    layerSpecs.forEach((spec) => {
      const depth = spec.depthM * METER;
      const height = layerHeight;
      const y = spec.buried
        ? wallBaseY + 0.5 * METER
        : finishedGradeY + (spec.layer - 0.5) * METER;
      const z = frontZ - depth / 2;
      const moduleCount = 14;
      const moduleLength = wallLength / moduleCount;

      for (let run = 0; run < moduleCount; run += 1) {
        const x = -wallLength / 2 + moduleLength / 2 + run * moduleLength;
        const isAccent = spec.buried || (spec.layer === 1 && run % 3 === 0);
        addBasket({
          x,
          y,
          z,
          length: moduleLength * 0.96,
          height,
          depth,
          color: isAccent ? spec.accent : spec.color,
          layer: spec.layer,
          run,
        });
      }
    });

    stones.count = stoneIndex;
    stones.instanceMatrix.needsUpdate = true;
    if (stones.instanceColor) stones.instanceColor.needsUpdate = true;
    basketGroup.add(stones);

    // ── Spill and falling stones (failure animation) ───────────────────────────
    const spillCount = 520;
    const spillGeometry = new THREE.IcosahedronGeometry(0.075, 0);
    const spillMaterial = new THREE.MeshStandardMaterial({ color: 0x7a7060, roughness: 0.96 });
    const spillStones = new THREE.InstancedMesh(spillGeometry, spillMaterial, spillCount);
    spillStones.castShadow = true;
    const spillSeeds = Array.from({ length: spillCount }, (_, index) => ({
      x: -wallLength / 2 + 0.25 + (index % 72) * (wallLength / 76) + Math.random() * 0.08,
      z: frontZ + 0.15 + Math.floor(index / 72) * 0.17 + Math.random() * 0.14,
      y: 0.035 + Math.random() * 0.1,
      roll: Math.random() * Math.PI,
      scale: 0.45 + Math.random() * 0.9,
      heap: Math.sin((index % 72) / 72 * Math.PI) * (0.06 + Math.random() * 0.08),
    }));
    root.add(spillStones);
    disposables.push(spillGeometry, spillMaterial);

    const fallingCount = 260;
    const fallingGeometry = new THREE.IcosahedronGeometry(0.065, 0);
    const fallingMaterial = new THREE.MeshStandardMaterial({ color: 0x6a6050, roughness: 0.96 });
    const fallingStones = new THREE.InstancedMesh(fallingGeometry, fallingMaterial, fallingCount);
    fallingStones.castShadow = true;
    const fallingSeeds = Array.from({ length: fallingCount }, (_, index) => ({
      x: -wallLength / 2 + 0.7 + (index % 54) * (wallLength / 62) + Math.random() * 0.1,
      y: finishedGradeY + 0.75 + Math.random() * 1.2,
      z: frontZ - 0.18 + Math.random() * 0.34,
      drift: 0.32 + Math.random() * 1.15,
      delay: Math.random(),
      roll: Math.random() * Math.PI,
      scale: 0.48 + Math.random() * 0.9,
    }));
    root.add(fallingStones);
    disposables.push(fallingGeometry, fallingMaterial);

    // Torn wire strands (failure animation)
    const tornWireMaterial = new THREE.LineBasicMaterial({
      color: 0x1a2e18,
      transparent: true,
      opacity: 0,
    });
    const tornWireGroup = new THREE.Group();
    root.add(tornWireGroup);
    for (let i = 0; i < 18; i += 1) {
      const x = -wallLength / 2 + 1.0 + (i % 9) * 0.38;
      const y = finishedGradeY + 0.75 + Math.floor(i / 9) * 0.42;
      const tearGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, y, frontZ + 0.09),
        new THREE.Vector3(x + 0.24 + Math.random() * 0.18, y - 0.12 - Math.random() * 0.12, frontZ + 0.42 + Math.random() * 0.12),
      ]);
      const tear = new THREE.Line(tearGeometry, tornWireMaterial);
      tornWireGroup.add(tear);
      disposables.push(tearGeometry);
    }
    disposables.push(tornWireMaterial);

    // ── Drainage system ────────────────────────────────────────────────────────
    const pipeSlope = 0.012;
    const pipeY = wallBaseY + 0.08;
    const pipeZ = backZ - 0.08;
    const outletX = wallLength / 2 + 0.35;

    // Gravel drainage bed around the perforated pipe
    const drainGravelMaterial = new THREE.MeshStandardMaterial({ color: 0xb4bcc8, roughness: 0.94 });
    const drainGravelGeom = new THREE.BoxGeometry(wallLength + 0.8, 0.22, 0.54);
    const drainGravel = new THREE.Mesh(drainGravelGeom, drainGravelMaterial);
    drainGravel.position.set(0, wallBaseY + 0.04, pipeZ);
    drainGravel.receiveShadow = true;
    root.add(drainGravel);
    disposables.push(drainGravelMaterial, drainGravelGeom);

    // Perforated HDPE corrugated pipe (orange)
    const pipeGeometry = new THREE.CylinderGeometry(0.05, 0.05, wallLength + 0.7, 24, 1, true);
    const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
    pipe.rotation.z = Math.PI / 2 + pipeSlope;
    pipe.position.set(0, pipeY, pipeZ);
    pipe.castShadow = true;
    root.add(pipe);

    // Corrugation rings on the pipe
    const corrugationMaterial = new THREE.MeshStandardMaterial({ color: 0x9a4410, roughness: 0.65 });
    const corrugCount = 20;
    for (let i = 0; i < corrugCount; i += 1) {
      const ringGeom = new THREE.TorusGeometry(0.056, 0.008, 8, 16);
      const ring = new THREE.Mesh(ringGeom, corrugationMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(
        -wallLength / 2 + (i + 0.5) * ((wallLength + 0.7) / corrugCount),
        pipeY,
        pipeZ,
      );
      root.add(ring);
      disposables.push(ringGeom);
    }
    disposables.push(corrugationMaterial);

    const flowGeometry = new THREE.CylinderGeometry(0.025, 0.025, wallLength + 0.75, 16);
    const pipeFlow = new THREE.Mesh(flowGeometry, pipeFlowMaterial);
    pipeFlow.rotation.z = Math.PI / 2 + pipeSlope;
    pipeFlow.position.copy(pipe.position);
    root.add(pipeFlow);
    disposables.push(pipeGeometry, flowGeometry);

    // Drainage channels, trenches, and catch basin
    const drainageGroup = new THREE.Group();
    root.add(drainageGroup);

    const channelMaterial = new THREE.MeshStandardMaterial({ color: 0x7a8490, roughness: 0.82 });
    const gratingMaterial = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.65, metalness: 0.22 });
    disposables.push(channelMaterial, gratingMaterial);
    const damagedDrainageParts: Array<{
      mesh: THREE.Mesh;
      basePosition: THREE.Vector3;
      baseRotation: THREE.Euler;
      drift: THREE.Vector3;
    }> = [];
    const channelWaters: Array<{
      mesh: THREE.Mesh;
      axis: "x" | "z";
      span: number;
      baseY: number;
    }> = [];

    const trenchH = 0.18;
    const trenchInner = 0.18;
    const trenchWall = 0.04;

    function addTrench(axis: "x" | "z", span: number, center: THREE.Vector3) {
      const lateral = trenchInner + trenchWall * 2;
      const sized = (along: number, width: number, height: number): [number, number, number] =>
        axis === "x" ? [along, height, width] : [width, height, along];
      const group = new THREE.Group();
      group.position.copy(center);

      const floorGeom = new THREE.BoxGeometry(...sized(span, lateral, 0.04));
      const floor = new THREE.Mesh(floorGeom, channelMaterial);
      floor.position.y = -trenchH / 2;
      floor.receiveShadow = true;
      group.add(floor);
      disposables.push(floorGeom);

      const sideGeom = new THREE.BoxGeometry(...sized(span, trenchWall, trenchH));
      const off = trenchInner / 2 + trenchWall / 2;
      const sideA = new THREE.Mesh(sideGeom, channelMaterial);
      const sideB = new THREE.Mesh(sideGeom, channelMaterial);
      if (axis === "x") {
        sideA.position.z = -off;
        sideB.position.z = off;
      } else {
        sideA.position.x = -off;
        sideB.position.x = off;
      }
      group.add(sideA, sideB);
      [sideA, sideB].forEach((mesh, index) => {
        damagedDrainageParts.push({
          mesh,
          basePosition: mesh.position.clone(),
          baseRotation: mesh.rotation.clone(),
          drift: axis === "x"
            ? new THREE.Vector3(0, -0.035, (index === 0 ? -1 : 1) * 0.11)
            : new THREE.Vector3((index === 0 ? -1 : 1) * 0.11, -0.035, 0),
        });
      });
      disposables.push(sideGeom);

      const waterGeom = new THREE.BoxGeometry(...sized(span - 0.05, trenchInner * 0.82, 0.05));
      const water = new THREE.Mesh(waterGeom, pipeFlowMaterial);
      water.position.y = -trenchH / 2 + 0.055;
      group.add(water);
      channelWaters.push({ mesh: water, axis, span, baseY: water.position.y });
      disposables.push(waterGeom);

      const slatCount = Math.max(3, Math.round(span / 0.4));
      for (let i = 0; i < slatCount; i += 1) {
        const t = -span / 2 + (i + 0.5) * (span / slatCount);
        const slatGeom = new THREE.BoxGeometry(...sized(0.05, lateral, 0.03));
        const slat = new THREE.Mesh(slatGeom, gratingMaterial);
        slat.position.y = trenchH / 2 - 0.015;
        if (axis === "x") slat.position.x = t;
        else slat.position.z = t;
        group.add(slat);
        damagedDrainageParts.push({
          mesh: slat,
          basePosition: slat.position.clone(),
          baseRotation: slat.rotation.clone(),
          drift: new THREE.Vector3(
            axis === "x" ? 0 : (i % 2 === 0 ? -0.08 : 0.08),
            0.02 + (i % 3) * 0.008,
            axis === "x" ? (i % 2 === 0 ? -0.08 : 0.08) : 0,
          ),
        });
        disposables.push(slatGeom);
      }

      drainageGroup.add(group);
    }

    // Rerouted drainage along wall toe (parallel)
    addTrench("x", wallLength + 1.4, new THREE.Vector3(0, 0.09, frontZ + 0.55));
    const basinZ = frontZ + 0.55;
    // Existing drainage running perpendicular at the discharge end
    addTrench("z", 2.6, new THREE.Vector3(outletX, 0.09, basinZ + 1.2));

    // Outlet elbow connecting pipe to catch basin
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), pipeMaterial);
    elbow.position.set(outletX, pipeY, pipeZ);
    drainageGroup.add(elbow);

    const outletRunLength = basinZ - pipeZ;
    const outletRunGeom = new THREE.CylinderGeometry(0.05, 0.05, outletRunLength, 18);
    const outletRun = new THREE.Mesh(outletRunGeom, pipeMaterial);
    outletRun.rotation.x = Math.PI / 2;
    outletRun.position.set(outletX, pipeY, (pipeZ + basinZ) / 2);
    drainageGroup.add(outletRun);

    const dropGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.32, 18);
    const drop = new THREE.Mesh(dropGeom, pipeMaterial);
    drop.position.set(outletX, pipeY - 0.16, basinZ);
    drainageGroup.add(drop);
    disposables.push(outletRunGeom, dropGeom);

    // Catch basin / junction chamber
    const basinInner = 0.36;
    const basinWall = 0.05;
    const basinTop = 0.19;
    const basinBottom = -0.34;
    const basinMidY = (basinTop + basinBottom) / 2;
    const basinHeight = basinTop - basinBottom;
    const basinLateral = basinInner + basinWall * 2;
    const wOff = basinInner / 2 + basinWall / 2;
    const basin = new THREE.Group();
    basin.position.set(outletX, 0, basinZ);

    const basinFloorGeom = new THREE.BoxGeometry(basinLateral, 0.05, basinLateral);
    const basinFloor = new THREE.Mesh(basinFloorGeom, channelMaterial);
    basinFloor.position.y = basinBottom + 0.025;
    basin.add(basinFloor);
    disposables.push(basinFloorGeom);

    const basinWallNS = new THREE.BoxGeometry(basinLateral, basinHeight, basinWall);
    const basinWallEW = new THREE.BoxGeometry(basinWall, basinHeight, basinInner);
    const basinWallA = new THREE.Mesh(basinWallNS, channelMaterial);
    const basinWallB = new THREE.Mesh(basinWallNS, channelMaterial);
    const basinWallC = new THREE.Mesh(basinWallEW, channelMaterial);
    const basinWallD = new THREE.Mesh(basinWallEW, channelMaterial);
    basinWallA.position.set(0, basinMidY, -wOff);
    basinWallB.position.set(0, basinMidY, wOff);
    basinWallC.position.set(wOff, basinMidY, 0);
    basinWallD.position.set(-wOff, basinMidY, 0);
    basin.add(basinWallA, basinWallB, basinWallC, basinWallD);
    disposables.push(basinWallNS, basinWallEW);

    const basinWaterGeom = new THREE.BoxGeometry(basinInner, 0.06, basinInner);
    const basinWater = new THREE.Mesh(basinWaterGeom, pipeFlowMaterial);
    basinWater.position.y = basinBottom + 0.16;
    basin.add(basinWater);
    disposables.push(basinWaterGeom);

    drainageGroup.add(basin);

    [basinWallA, basinWallB, basinWallC, basinWallD].forEach((mesh, index) => {
      damagedDrainageParts.push({
        mesh,
        basePosition: mesh.position.clone(),
        baseRotation: mesh.rotation.clone(),
        drift: new THREE.Vector3(
          index < 2 ? 0 : (index === 2 ? 0.12 : -0.12),
          -0.045,
          index < 2 ? (index === 0 ? -0.12 : 0.12) : 0,
        ),
      });
    });

    // Drainage flood surface (failure animation)
    const drainageFloodMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      roughness: 0.08,
      transmission: 0.08,
      depthWrite: false,
    });
    const drainageFloodGeometry = new THREE.BoxGeometry(wallLength + 1.8, 0.08, 2.15);
    const drainageFlood = new THREE.Mesh(drainageFloodGeometry, drainageFloodMaterial);
    drainageFlood.position.set(0.35, 0.035, frontZ + 0.85);
    drainageFlood.renderOrder = 0;
    root.add(drainageFlood);
    disposables.push(drainageFloodMaterial, drainageFloodGeometry);

    // Moving water highlights: streaks show flow direction, rings show turbulent pooling.
    const flowStreakMaterial = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const flowStreaks: Array<{
      mesh: THREE.Mesh;
      axis: "x" | "z";
      start: number;
      span: number;
      speed: number;
      base: THREE.Vector3;
    }> = [];
    const streakGeometryX = new THREE.BoxGeometry(0.36, 0.012, 0.018);
    const streakGeometryZ = new THREE.BoxGeometry(0.018, 0.012, 0.36);

    for (let i = 0; i < 34; i += 1) {
      const span = wallLength + 1.15;
      const start = (i / 34) * span;
      const mesh = new THREE.Mesh(streakGeometryX, flowStreakMaterial);
      const base = new THREE.Vector3(-span / 2 + start, 0.19, frontZ + 0.55);
      mesh.position.copy(base);
      root.add(mesh);
      flowStreaks.push({ mesh, axis: "x", start, span, speed: 0.75 + Math.random() * 0.75, base });
    }

    for (let i = 0; i < 12; i += 1) {
      const span = 2.35;
      const start = (i / 12) * span;
      const mesh = new THREE.Mesh(streakGeometryZ, flowStreakMaterial);
      const base = new THREE.Vector3(outletX, 0.19, basinZ + start);
      mesh.position.copy(base);
      root.add(mesh);
      flowStreaks.push({ mesh, axis: "z", start, span, speed: 0.65 + Math.random() * 0.65, base });
    }

    const rippleMaterial = new THREE.MeshBasicMaterial({
      color: 0xe0f7ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const rippleGeometry = new THREE.TorusGeometry(0.16, 0.006, 8, 42);
    const floodRipples = Array.from({ length: 16 }, (_, index) => {
      const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
      ripple.rotation.x = Math.PI / 2;
      ripple.position.set(
        -wallLength / 2 + 0.9 + (index % 8) * (wallLength / 8),
        0.12,
        frontZ + 0.55 + Math.floor(index / 8) * 0.58,
      );
      root.add(ripple);
      return {
        mesh: ripple,
        phase: Math.random(),
        baseScale: 0.6 + Math.random() * 0.8,
      };
    });
    disposables.push(flowStreakMaterial, streakGeometryX, streakGeometryZ, rippleMaterial, rippleGeometry);

    // Breach surge from retained side to front face when the gabion opens.
    const breachWaterMaterial = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const breachFoamMaterial = new THREE.MeshBasicMaterial({
      color: 0xecfeff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const breachRibbonGeometry = new THREE.BoxGeometry(0.08, 0.018, 0.72);
    const breachFoamGeometry = new THREE.TorusGeometry(0.12, 0.005, 8, 28);
    const breachStreams = Array.from({ length: 22 }, (_, index) => {
      const stream = new THREE.Mesh(breachRibbonGeometry, breachWaterMaterial);
      const row = Math.floor(index / 11);
      const x = -wallLength * 0.36 + (index % 11) * (wallLength * 0.72 / 10);
      stream.position.set(x, finishedGradeY + 0.08 + row * 0.12, backZ - 0.42);
      stream.rotation.x = 0.18;
      root.add(stream);
      return {
        mesh: stream,
        x,
        row,
        phase: Math.random(),
        speed: 0.42 + Math.random() * 0.55,
      };
    });

    const breachFoams = Array.from({ length: 18 }, (_, index) => {
      const foam = new THREE.Mesh(breachFoamGeometry, breachFoamMaterial);
      foam.rotation.x = Math.PI / 2;
      foam.position.set(
        -wallLength * 0.36 + (index % 9) * (wallLength * 0.72 / 8),
        finishedGradeY + 0.08,
        backZ,
      );
      root.add(foam);
      return {
        mesh: foam,
        phase: Math.random(),
        xDrift: (Math.random() - 0.5) * 0.18,
      };
    });

    const surgeRockCount = 180;
    const surgeRockGeometry = new THREE.IcosahedronGeometry(0.055, 0);
    const surgeRockMaterial = new THREE.MeshStandardMaterial({ color: 0x80715d, roughness: 0.96 });
    const surgeRocks = new THREE.InstancedMesh(surgeRockGeometry, surgeRockMaterial, surgeRockCount);
    surgeRocks.castShadow = true;
    const surgeRockSeeds = Array.from({ length: surgeRockCount }, (_, index) => ({
      x: -wallLength * 0.35 + (index % 30) * (wallLength * 0.7 / 29) + (Math.random() - 0.5) * 0.12,
      z: backZ - 0.45 + Math.random() * 0.2,
      y: finishedGradeY + 0.03 + Math.random() * 0.45,
      delay: Math.random(),
      drift: 0.15 + Math.random() * 0.55,
      roll: Math.random() * Math.PI,
      scale: 0.55 + Math.random() * 0.95,
    }));
    root.add(surgeRocks);
    disposables.push(
      breachWaterMaterial, breachFoamMaterial, breachRibbonGeometry,
      breachFoamGeometry, surgeRockGeometry, surgeRockMaterial,
    );

    // Broken pipe segments (failure animation)
    const brokenPipeMaterial = new THREE.MeshStandardMaterial({ color: 0xa04010, roughness: 0.62 });
    const brokenPipeGeometry = new THREE.CylinderGeometry(0.052, 0.052, 0.9, 18, 1, true);
    const brokenPipeA = new THREE.Mesh(brokenPipeGeometry, brokenPipeMaterial);
    const brokenPipeB = new THREE.Mesh(brokenPipeGeometry, brokenPipeMaterial);
    brokenPipeA.rotation.z = Math.PI / 2 + pipeSlope;
    brokenPipeB.rotation.z = Math.PI / 2 + pipeSlope;
    brokenPipeA.position.set(outletX - 0.52, pipeY, pipeZ);
    brokenPipeB.position.set(outletX - 0.05, pipeY, pipeZ);
    root.add(brokenPipeA, brokenPipeB);
    brokenPipeA.visible = false;
    brokenPipeB.visible = false;
    disposables.push(brokenPipeMaterial, brokenPipeGeometry);

    // ── Side profile cross-section panel ─────────────────────────────────────
    const sideProfile = new THREE.Group();
    sideProfile.position.x = -wallLength / 2 - 0.22;
    sideProfile.visible = false;
    root.add(sideProfile);

    layerSpecs.forEach((spec) => {
      if (spec.buried) return;

      const height = layerHeight;
      const depth = spec.depthM * METER;
      const y = finishedGradeY + (spec.layer - 0.5) * METER;
      const z = frontZ - depth / 2;
      const profileGeometry = new THREE.BoxGeometry(0.18, height, depth);
      const profileMaterial = new THREE.MeshStandardMaterial({
        color: spec.layer === 1 ? spec.accent : spec.color,
        roughness: 0.48,
        metalness: 0.18,
        transparent: true,
        opacity: 0.80,
      });
      const profile = new THREE.Mesh(profileGeometry, profileMaterial);
      profile.position.set(0, y, z);
      profile.castShadow = true;
      profile.receiveShadow = true;
      sideProfile.add(profile);

      const edgeGeometry = new THREE.EdgesGeometry(profileGeometry);
      const edges = new THREE.LineSegments(
        edgeGeometry,
        new THREE.LineBasicMaterial({ color: 0x1a2e18, transparent: true, opacity: 0.72 }),
      );
      edges.position.copy(profile.position);
      sideProfile.add(edges);
      disposables.push(profileGeometry, profileMaterial, edgeGeometry);
    });

    const profilePipeGeometry = new THREE.TorusGeometry(0.08, 0.02, 10, 24);
    const profilePipe = new THREE.Mesh(profilePipeGeometry, pipeMaterial);
    profilePipe.position.set(0, 0.1, backZ - 0.08);
    profilePipe.rotation.y = Math.PI / 2;
    sideProfile.add(profilePipe);
    disposables.push(profilePipeGeometry);

    // ── Component annotation labels ───────────────────────────────────────────
    function makeLabel(text: string, subtext?: string): THREE.Sprite {
      const w = 370;
      const h = subtext ? 82 : 54;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      // Pill background
      const r = 10;
      ctx.beginPath();
      ctx.moveTo(r, 2); ctx.lineTo(w - r, 2);
      ctx.quadraticCurveTo(w - 2, 2, w - 2, r);
      ctx.lineTo(w - 2, h - r);
      ctx.quadraticCurveTo(w - 2, h - 2, w - r, h - 2);
      ctx.lineTo(r, h - 2);
      ctx.quadraticCurveTo(2, h - 2, 2, h - r);
      ctx.lineTo(2, r);
      ctx.quadraticCurveTo(2, 2, r, 2);
      ctx.closePath();
      ctx.fillStyle = "rgba(15,23,42,0.88)";
      ctx.fill();
      ctx.strokeStyle = "rgba(148,163,184,0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Main text
      ctx.fillStyle = "#f1f5f9";
      ctx.font = `bold 21px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, w / 2, subtext ? 25 : h / 2);
      // Subtext
      if (subtext) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = `15px system-ui, -apple-system, sans-serif`;
        ctx.fillText(subtext, w / 2, 55);
      }
      const texture = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set((w / h) * 0.38, 0.38, 1);
      disposables.push(texture, mat);
      return sprite;
    }

    // Gabion wall label (above the wall top)
    const labelWall = makeLabel("Gabion Retaining Wall", "PVC-coated wire mesh · stone fill");
    labelWall.position.set(0, finishedGradeY + 4.6 * METER + 0.32, frontZ);
    scene.add(labelWall);

    // Granular backfill label
    const labelBackfill = makeLabel("Free-Draining Granular Backfill");
    labelBackfill.position.set(0.6, finishedGradeY + 2.4 * METER, backZ - 0.85);
    scene.add(labelBackfill);

    // Drain pipe label
    const labelPipe = makeLabel("150 mm Perforated Drain Pipe", "HDPE corrugated · at heel");
    labelPipe.position.set(-wallLength / 2 - 0.55, pipeY + 0.45, pipeZ);
    scene.add(labelPipe);

    // Native soil label
    const labelSoil = makeLabel("Undisturbed Native Soil");
    labelSoil.position.set(0, finishedGradeY + 2 * METER, backfillRearZ - 1.65);
    scene.add(labelSoil);

    // Geotextile label
    const labelGeo = makeLabel("Geotextile Filter Cloth");
    labelGeo.position.set(-wallLength / 2 - 0.48, finishedGradeY + 1.15, backZ - 0.12);
    scene.add(labelGeo);

    // ── Seepage water behind wall ─────────────────────────────────────────────
    const waterGeometry = new THREE.BoxGeometry(wallLength + 0.4, 0.7, 1.1);
    const trappedWater = new THREE.Mesh(waterGeometry, waterMaterial);
    trappedWater.position.set(0, finishedGradeY, backZ - 0.6);
    trappedWater.renderOrder = 0;
    scene.add(trappedWater);
    disposables.push(waterGeometry);

    // ── Rain particle system ──────────────────────────────────────────────────
    const rainCount = 1100;
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i += 1) {
      rainPositions[i * 3] = Math.random() * 12 - 6;
      rainPositions[i * 3 + 1] = Math.random() * 7 + 1.2;
      rainPositions[i * 3 + 2] = Math.random() * 6 - 3;
    }
    const rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
    const rainMaterial = new THREE.PointsMaterial({
      color: 0x7dd3fc,
      size: 0.042,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const rainPoints = new THREE.Points(rainGeometry, rainMaterial);
    scene.add(rainPoints);
    disposables.push(rainGeometry, rainMaterial);

    // ── Hydrostatic pressure visualiser ──────────────────────────────────────
    const pressureMaterial = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const pressureGeometry = new THREE.PlaneGeometry(wallLength, 1.4);
    const pressurePlane = new THREE.Mesh(pressureGeometry, pressureMaterial);
    pressurePlane.position.set(0, finishedGradeY + 0.7, backZ - 0.05);
    pressurePlane.rotation.x = -0.06;
    scene.add(pressurePlane);
    disposables.push(pressureGeometry, pressureMaterial);

    // ── Sliding force arrow ───────────────────────────────────────────────────
    const slideArrowMaterial = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0x7c2d12,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.75,
    });
    const slideArrow = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.25, 16), slideArrowMaterial);
    shaft.rotation.z = Math.PI / 2;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.38, 20), slideArrowMaterial);
    cone.rotation.z = -Math.PI / 2;
    cone.position.x = 0.78;
    slideArrow.add(shaft, cone);
    slideArrow.position.set(0, finishedGradeY + 0.22, 0.95);
    scene.add(slideArrow);
    disposables.push(slideArrowMaterial);

    // ── Timer, resize, view, animation ────────────────────────────────────────
    const timer = new THREE.Timer();
    timer.connect(document);
    let frameId = 0;

    function resize(target: HTMLDivElement) {
      const width = target.clientWidth;
      const height = target.clientHeight;

      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }

    const handleResize = () => resize(container);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    function applyView(nextView: WallDisasterSceneProps["viewMode"]) {
      const views = {
        perspective: {
          position: new THREE.Vector3(7.4, 3.1, 7.0),
          target: new THREE.Vector3(0, finishedGradeY + 0.75, 0),
        },
        front: {
          position: new THREE.Vector3(0, finishedGradeY + 1.35, 9.2),
          target: new THREE.Vector3(0, finishedGradeY + 0.72, 0),
        },
        side: {
          position: new THREE.Vector3(-6.0, 2.2, 5.8),
          target: new THREE.Vector3(-0.6, finishedGradeY + 0.72, 0),
        },
      } satisfies Record<WallDisasterSceneProps["viewMode"], { position: THREE.Vector3; target: THREE.Vector3 }>;

      camera.position.copy(views[nextView].position);
      controls.target.copy(views[nextView].target);
      controls.update();
    }

    function applyZoom(direction: number) {
      const target = controls.target.clone();
      const offset = camera.position.clone().sub(target);
      const currentDistance = offset.length();
      const nextDistance = THREE.MathUtils.clamp(
        currentDistance * (direction > 0 ? 0.82 : 1.22),
        controls.minDistance,
        controls.maxDistance,
      );

      offset.setLength(nextDistance);
      camera.position.copy(target.add(offset));
      controls.update();
    }

    applyView(viewModeRef.current);

    function animate(timestamp?: number) {
      timer.update(timestamp);
      const elapsed = timer.getElapsed();
      const values = latestRef.current;
      const rainPower = values.rain / 100;
      const drainageBlockage = values.drainage / 100;
      const quakePower = Math.max(0, values.quake - 1) / 7.5;
      const stressPower = values.stress / 100;
      const failurePower = Math.min(1, Math.max(0, values.failureLevel));
      const hydroPressure = rainPower * (0.35 + drainageBlockage * 0.9);
      const active = values.playing;
      const stormFactor = THREE.MathUtils.smoothstep(rainPower, 0.58, 0.92);
      const typhoonFactor = THREE.MathUtils.smoothstep(rainPower + failurePower * 0.35, 0.92, 1.32);
      const targetSkyColor = clearSkyColor.clone().lerp(stormSkyColor, stormFactor).lerp(typhoonSkyColor, typhoonFactor);
      currentSkyColor.lerp(targetSkyColor, 0.045);
      scene.background = currentSkyColor;
      stormFog.color.copy(currentSkyColor);
      stormFog.near = THREE.MathUtils.lerp(14, 8.5, stormFactor);
      stormFog.far = THREE.MathUtils.lerp(34, 25, stormFactor);
      hemiLight.intensity = THREE.MathUtils.lerp(1.8, 1.08, stormFactor);
      keyLight.intensity = THREE.MathUtils.lerp(2.6, 1.15, stormFactor);
      fillLight.intensity = THREE.MathUtils.lerp(0.6, 0.46, stormFactor);
      stormLight.intensity = 0.85 + rainPower * 1.75 + typhoonFactor * 0.95;
      cloudMaterial.opacity = THREE.MathUtils.lerp(cloudMaterial.opacity, stormFactor * 0.28 + typhoonFactor * 0.08, 0.05);
      stormClouds.position.x = active ? Math.sin(elapsed * 0.12) * 0.8 : stormClouds.position.x;
      stormClouds.position.z = -0.8 + Math.cos(elapsed * 0.09) * 0.45;

      if (values.viewMode !== viewModeRef.current) {
        viewModeRef.current = values.viewMode;
        applyView(values.viewMode);
      }

      if (values.zoomCommand !== zoomCommandRef.current) {
        applyZoom(values.zoomCommand > zoomCommandRef.current ? 1 : -1);
        zoomCommandRef.current = values.zoomCommand;
      }

      if (active) {
        root.position.x = Math.sin(elapsed * (7 + quakePower * 17)) * quakePower * 0.1;
        root.position.z = Math.cos(elapsed * (6 + quakePower * 12)) * quakePower * 0.045;
        root.rotation.z = Math.sin(elapsed * (3 + quakePower * 9)) * quakePower * 0.012;
      } else {
        root.position.set(0, 0, 0);
        root.rotation.set(0, 0, 0);
      }

      trappedWater.scale.y = THREE.MathUtils.lerp(trappedWater.scale.y, 0.1 + hydroPressure * 1.7, 0.06);
      trappedWater.position.y = finishedGradeY + trappedWater.scale.y * 0.35 * 0.7;
      trappedWater.material.opacity = 0.12 + hydroPressure * 0.33;
      trappedWater.rotation.z = active ? Math.sin(elapsed * 1.7) * rainPower * 0.006 : 0;

      pressureMaterial.opacity = Math.max(0.03, hydroPressure * 0.38 + stressPower * 0.08);
      pressurePlane.scale.y = 0.5 + hydroPressure * 0.5;
      pressurePlane.position.y = 0.55 + hydroPressure * 0.35;

      pipeFlow.scale.x = 1 + Math.sin(elapsed * 5) * 0.015;
      pipeFlow.visible = rainPower > 0.14;
      pipeFlow.material.opacity = Math.max(0.08, rainPower * (1 - drainageBlockage * 0.8) * (1 - failurePower * 0.85));
      pipeFlow.scale.setScalar(0.65 + rainPower * (1 - drainageBlockage * 0.72) * (1 - failurePower * 0.65));

      const drainVelocity = Math.max(0.12, rainPower * (1 - drainageBlockage * 0.64));
      channelWaters.forEach((water, index) => {
        const pulse = active ? Math.sin(elapsed * (4.2 + drainVelocity * 3) + index * 1.7) : 0;
        water.mesh.position.y = water.baseY + pulse * 0.008 + failurePower * 0.018;
        water.mesh.scale.y = 1 + rainPower * 0.25 + failurePower * 0.7;
        water.mesh.scale.x = water.axis === "x" ? 1 + pulse * 0.025 : 1;
        water.mesh.scale.z = water.axis === "z" ? 1 + pulse * 0.025 : 1;
        water.mesh.visible = rainPower > 0.1 || failurePower > 0.02;
      });

      flowStreaks.forEach((streak, index) => {
        const cycle = active
          ? (streak.start + elapsed * streak.speed * (0.55 + drainVelocity * 1.8)) % streak.span
          : streak.start % streak.span;
        const flowStrength = Math.min(1, rainPower * (1 - drainageBlockage * 0.45) + failurePower * 0.95);
        if (streak.axis === "x") {
          streak.mesh.position.x = -streak.span / 2 + cycle;
          streak.mesh.position.z = streak.base.z + Math.sin(elapsed * 2.5 + index) * 0.018;
        } else {
          streak.mesh.position.z = basinZ + cycle;
          streak.mesh.position.x = streak.base.x + Math.sin(elapsed * 2.8 + index) * 0.014;
        }
        streak.mesh.position.y = streak.base.y + Math.sin(elapsed * 6 + index) * 0.006 + failurePower * 0.035;
        streak.mesh.scale.setScalar(0.62 + flowStrength * 0.7);
        streak.mesh.visible = flowStrength > 0.16;
        flowStreakMaterial.opacity = 0.22 + flowStrength * 0.58;
      });

      drainageFlood.scale.x = THREE.MathUtils.lerp(drainageFlood.scale.x, 1 + failurePower * 0.22, 0.08);
      drainageFlood.scale.y = THREE.MathUtils.lerp(drainageFlood.scale.y, 0.35 + failurePower * 5.4, 0.08);
      drainageFlood.scale.z = THREE.MathUtils.lerp(drainageFlood.scale.z, 0.45 + failurePower * 1.75, 0.08);
      drainageFlood.position.y = 0.025 + failurePower * 0.075 + Math.sin(elapsed * 1.6) * failurePower * 0.008;
      drainageFlood.material.opacity = Math.min(0.58, failurePower * 0.66);
      drainageFlood.visible = failurePower > 0.02;

      floodRipples.forEach((ripple, index) => {
        const cycle = active ? (elapsed * 0.5 + ripple.phase) % 1 : ripple.phase;
        const scale = ripple.baseScale + cycle * (2.2 + failurePower * 2.2);
        ripple.mesh.scale.set(scale, scale, scale);
        ripple.mesh.position.y = drainageFlood.position.y + 0.048 + Math.sin(elapsed * 1.4 + index) * 0.005;
        ripple.mesh.visible = failurePower > 0.08;
        (ripple.mesh.material as THREE.MeshBasicMaterial).opacity = failurePower * (1 - cycle) * 0.42;
      });

      const breachPower = THREE.MathUtils.smoothstep(failurePower, 0.22, 0.95);
      const breachStartZ = backZ - 0.52;
      const breachEndZ = frontZ + 1.35;
      const breachSpan = breachEndZ - breachStartZ;
      breachStreams.forEach((stream, index) => {
        const cycle = active
          ? (stream.phase + elapsed * stream.speed * (0.45 + breachPower * 1.7)) % 1
          : stream.phase;
        const streamZ = breachStartZ + cycle * breachSpan;
        const wave = Math.sin(elapsed * 8 + index) * 0.025;
        stream.mesh.position.set(
          stream.x + Math.sin(elapsed * 2.2 + index) * 0.035,
          finishedGradeY + 0.08 + stream.row * 0.12 - cycle * 0.1 + wave,
          streamZ,
        );
        stream.mesh.rotation.y = Math.sin(elapsed * 3 + index) * 0.08;
        stream.mesh.scale.set(0.55 + breachPower * 1.15, 1, 0.65 + breachPower * 1.8);
        stream.mesh.visible = breachPower > 0.04;
      });
      breachWaterMaterial.opacity = breachPower * (0.18 + rainPower * 0.42);

      breachFoams.forEach((foam, index) => {
        const cycle = active ? (foam.phase + elapsed * (0.38 + breachPower * 0.9)) % 1 : foam.phase;
        const scale = 0.45 + cycle * (1.8 + breachPower * 2.2);
        foam.mesh.position.set(
          -wallLength * 0.36 + (index % 9) * (wallLength * 0.72 / 8) + foam.xDrift,
          finishedGradeY + 0.06 - cycle * 0.05 + Math.sin(elapsed * 2 + index) * 0.01,
          breachStartZ + cycle * breachSpan,
        );
        foam.mesh.scale.set(scale, scale, scale);
        foam.mesh.visible = breachPower > 0.08;
        (foam.mesh.material as THREE.MeshBasicMaterial).opacity = breachPower * (1 - cycle) * 0.56;
      });

      surgeRockSeeds.forEach((seed, index) => {
        const cycle = active ? (seed.delay + elapsed * (0.18 + breachPower * 0.62)) % 1 : seed.delay;
        const frontSettle = THREE.MathUtils.smoothstep(cycle, 0.66, 1);
        const ride = breachPower * THREE.MathUtils.smoothstep(cycle, 0.05, 0.68);
        const z = seed.z + ride * (1.1 + seed.drift) + frontSettle * 0.65;
        const y = seed.y - ride * 0.22 - frontSettle * (0.28 + seed.y * 0.45) + Math.sin(elapsed * 6 + seed.roll) * breachPower * 0.018;
        matrix.compose(
          new THREE.Vector3(
            seed.x + Math.sin(seed.roll + elapsed * 1.4) * breachPower * 0.06,
            Math.max(0.055, y),
            z,
          ),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(seed.roll + elapsed * breachPower, seed.roll * 0.6, seed.roll + cycle * Math.PI)),
          new THREE.Vector3(seed.scale * breachPower, seed.scale * breachPower, seed.scale * breachPower),
        );
        surgeRocks.setMatrixAt(index, matrix);
      });
      surgeRocks.visible = breachPower > 0.03;
      surgeRocks.instanceMatrix.needsUpdate = true;

      damagedDrainageParts.forEach((part, index) => {
        const jitter = active ? Math.sin(elapsed * 5.5 + index) * 0.01 * failurePower : 0;
        part.mesh.position.copy(part.basePosition).addScaledVector(part.drift, failurePower);
        part.mesh.position.y += jitter;
        part.mesh.rotation.copy(part.baseRotation);
        part.mesh.rotation.x += failurePower * (0.08 + (index % 3) * 0.03);
        part.mesh.rotation.z += failurePower * (index % 2 === 0 ? 0.11 : -0.11);
      });

      brokenPipeA.visible = failurePower > 0.05;
      brokenPipeB.visible = failurePower > 0.05;
      pipe.visible = failurePower < 0.92;
      brokenPipeA.position.set(outletX - 0.58 - failurePower * 0.06, pipeY - failurePower * 0.035, pipeZ + failurePower * 0.04);
      brokenPipeB.position.set(outletX - 0.04 + failurePower * 0.12, pipeY - failurePower * 0.08, pipeZ + failurePower * 0.18);
      brokenPipeA.rotation.z = Math.PI / 2 + pipeSlope - failurePower * 0.12;
      brokenPipeB.rotation.z = Math.PI / 2 + pipeSlope + failurePower * 0.42;
      outletRun.rotation.x = Math.PI / 2 + failurePower * 0.32;
      outletRun.position.y = pipeY - failurePower * 0.08;
      drop.rotation.z = failurePower * 0.26;
      drop.position.y = pipeY - 0.16 - failurePower * 0.08;
      basinWater.scale.y = 1 + failurePower * 2.4;
      basinWater.position.y = basinBottom + 0.16 + failurePower * 0.1;

      const positions = rainGeometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < rainCount; i += 1) {
        const xIndex = i * 3;
        const yIndex = i * 3 + 1;
        const zIndex = i * 3 + 2;
        if (active) {
          rainPositions[yIndex] -= 0.05 + rainPower * 0.31;
          rainPositions[xIndex] += 0.008 + stressPower * 0.022;
        }
        if (rainPositions[yIndex] < -0.2 || rainPositions[xIndex] > 6.2) {
          rainPositions[xIndex] = Math.random() * 12 - 6;
          rainPositions[yIndex] = Math.random() * 4 + 4.3;
          rainPositions[zIndex] = Math.random() * 6 - 3;
        }
      }
      positions.needsUpdate = true;
      rainMaterial.opacity = 0.1 + rainPower * 0.72;

      baskets.forEach((basket) => {
        const layerFactor = basket.layer / 4;
        const runFactor = basket.run / 13;
        const lateral = hydroPressure * layerFactor * 0.2;
        const bulge = Math.max(0, stressPower - 0.55) * layerFactor * Math.sin((runFactor + elapsed * 0.08) * Math.PI) * 0.1;
        const seismic = active ? Math.sin(elapsed * 10 + basket.layer + basket.run * 0.22) * quakePower * layerFactor * 0.025 : 0;
        const settlement = Math.max(0, stressPower - 0.8) * (basket.layer === 1 ? 0.06 : 0.018) * (0.4 + runFactor);
        const centerRupture = runFactor > 0.08 && runFactor < 0.82;
        const toeRupture = runFactor > 0.18 && runFactor < 0.72;
        const upperFailure = basket.layer >= 3 && centerRupture;
        const midFailure = basket.layer === 2 && centerRupture;
        const lowerFailure = basket.layer === 1 && toeRupture && failurePower > 0.72;
        const failureZone = upperFailure || midFailure || lowerFailure;
        const fullCollapse = failurePower > 0.82 && basket.layer >= 2 && centerRupture;
        const stagger = Math.sin(runFactor * Math.PI * 4.5) * 0.14;
        const failureSlide = failureZone ? failurePower * (0.58 + layerFactor * 1.28 + stagger) : failurePower * 0.08;
        const failureDrop = failureZone ? failurePower * (0.2 + layerFactor * 0.58 + runFactor * 0.16) : failurePower * 0.025;
        const failureRotation = failureZone ? failurePower * (0.45 + layerFactor * 1.05) : failurePower * 0.04;
        const failureSideShift = failureZone ? failurePower * (runFactor - 0.42) * 0.72 : 0;
        const topple = fullCollapse ? (failurePower - 0.82) / 0.18 : 0;

        basket.group.position.x = basket.baseX + seismic + failureSideShift;
        basket.group.position.y = basket.baseY - settlement - failureDrop - topple * (0.22 + layerFactor * 0.22);
        basket.group.position.z = basket.baseZ + lateral + bulge + failureSlide + topple * 0.65;
        basket.group.rotation.x = -hydroPressure * layerFactor * 0.025 - failureRotation - topple * (0.65 + layerFactor * 0.32);
        basket.group.rotation.y = failureZone ? failurePower * (runFactor - 0.35) * 0.54 : 0;
        basket.group.rotation.z = seismic * 0.06 + failurePower * (runFactor - 0.5) * 0.36 + topple * (runFactor - 0.45) * 0.55;
      });

      spillSeeds.forEach((seed, index) => {
        const tumble = active ? Math.sin(elapsed * 1.8 + seed.roll) * 0.03 : 0;
        const spread = failurePower * failurePower;
        const floodLift = Math.max(0, drainageFlood.material.opacity - 0.25) * 0.08;
        matrix.compose(
          new THREE.Vector3(
            seed.x + spread * Math.sin(index * 0.7) * 0.16,
            seed.y + spread * (seed.heap + 0.07) + tumble + floodLift,
            seed.z + spread * (0.65 + Math.floor(index / 72) * 0.2),
          ),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(seed.roll + elapsed * failurePower * 0.35, seed.roll * 0.5, seed.roll)),
          new THREE.Vector3(seed.scale * failurePower, seed.scale * failurePower, seed.scale * failurePower),
        );
        spillStones.setMatrixAt(index, matrix);
      });
      spillStones.instanceMatrix.needsUpdate = true;

      fallingSeeds.forEach((seed, index) => {
        const cycle = active ? (elapsed * 0.58 + seed.delay) % 1 : seed.delay;
        const fallEase = failurePower > 0 ? Math.min(1, cycle * (0.85 + failurePower * 1.8)) : 0;
        const sideways = Math.sin(seed.roll + elapsed * 1.2) * 0.14;
        const settled = fallEase > 0.96;
        const visibleScale = seed.scale * failurePower * (settled ? 0.55 : 1);
        matrix.compose(
          new THREE.Vector3(
            seed.x + failurePower * (seed.drift + sideways),
            settled ? 0.08 + (index % 5) * 0.018 : seed.y - fallEase * (1.05 + seed.delay * 0.9),
            seed.z + failurePower * (0.55 + seed.drift * 1.2),
          ),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(seed.roll + elapsed * 1.6, seed.roll * 0.4 + elapsed, seed.roll)),
          new THREE.Vector3(visibleScale, visibleScale, visibleScale),
        );
        fallingStones.setMatrixAt(index, matrix);
      });
      fallingStones.instanceMatrix.needsUpdate = true;

      tornWireGroup.visible = failurePower > 0.04;
      tornWireMaterial.opacity = Math.min(0.8, failurePower * 1.45);
      tornWireGroup.children.forEach((child, index) => {
        child.rotation.z = failurePower * (0.18 + index * 0.006);
        child.position.z = failurePower * (0.12 + (index % 4) * 0.035);
      });

      concretePanels.forEach((panel, index) => {
        const collapse = Math.min(1, Math.max(0, (rainPower - 0.82) * 5 + drainageBlockage * 0.25));
        panel.rotation.x = collapse * (0.62 + index * 0.26);
        panel.rotation.y = collapse * (index % 2 === 0 ? -0.18 : 0.12);
        panel.rotation.z = collapse * (0.16 + index * 0.09);
        panel.position.z = collapse * (0.42 + index * 0.22);
        panel.position.x = collapse * (index - 1) * 0.08;
        panel.position.y = index * 0.44 - collapse * (0.06 + index * 0.16);
        panel.visible = rainPower > 0.72;
      });

      concreteFragmentSeeds.forEach((seed, index) => {
        const collapse = Math.min(1, Math.max(0, (rainPower - 0.82) * 5 + drainageBlockage * 0.25));
        const scatter = collapse * collapse;
        matrix.compose(
          new THREE.Vector3(
            seed.x + scatter * (index % 5) * 0.08,
            seed.y + scatter * 0.04,
            seed.z + scatter * (0.2 + Math.floor(index / 8) * 0.11),
          ),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(seed.roll + collapse * 1.2, seed.roll * 0.4, seed.roll * 0.8)),
          new THREE.Vector3(seed.scale * collapse, seed.scale * collapse * 0.7, seed.scale * collapse),
        );
        concreteFragments.setMatrixAt(index, matrix);
      });
      concreteFragments.instanceMatrix.needsUpdate = true;

      slideArrow.visible = stressPower > 0.42;
      slideArrow.position.x = -4.7 + ((elapsed * (0.4 + stressPower * 1.8)) % 9.4);
      slideArrow.scale.setScalar(0.75 + stressPower * 0.75);
      slideArrowMaterial.opacity = 0.25 + stressPower * 0.55;

      controls.update();

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      timer.dispose();
      controls.dispose();
      resizeObserver.disconnect();
      container.removeChild(renderer.domElement);
      renderer.dispose();
      disposables.forEach((item) => item.dispose());
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-[560px] min-h-[420px] w-full overflow-hidden rounded-lg bg-slate-200 [&>canvas]:h-full [&>canvas]:w-full"
      aria-label="Interactive 3D gabion retaining wall disaster visualization"
    />
  );
}
