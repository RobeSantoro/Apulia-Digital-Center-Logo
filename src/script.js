import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Base camera
const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 100)
camera.position.z = 10
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.dampingFactor = 0.25
controls.autoRotate = true
controls.autoRotateSpeed = 2

// Stats
const stats = new Stats()
stats.showPanel(0)
document.body.appendChild(stats.dom)

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: true
})

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputEncoding = THREE.sRGBEncoding
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1
renderer.setClearColor(0x101010, 0)

const group = new THREE.Group()
scene.add(group)

const sparkles = []
window.sparkles = sparkles

const sparklesGeometry = new THREE.BufferGeometry()
const sparklesMaterial = new THREE.ShaderMaterial({
  uniforms: {
    pointTexture: {
      value: new THREE.TextureLoader().load('./assets/textures/particle.png')
    }
  },
  vertexShader: document.getElementById("vertexshader").textContent,
  fragmentShader: document.getElementById("fragmentshader").textContent,
  depthTest: true,
  depthWrite: true,
  blending: THREE.AdditiveBlending
})

const points = new THREE.Points(sparklesGeometry, sparklesMaterial)
group.add(points)

const p1 = new THREE.Vector3()
let sampler = null
const lines = []
let linesColors = [new THREE.Color(0xFAAD80).multiplyScalar(0.5),
                  new THREE.Color(0xFF6767).multiplyScalar(0.5),
                  new THREE.Color(0xFF3D68).multiplyScalar(0.5),
                  new THREE.Color(0xA73489).multiplyScalar(0.5)]


function initLines() {
  sampler = new MeshSurfaceSampler(logoFaces).build()

  for (let i = 0; i < 6; i++) {
    sampler.sample(p1)
    const linesMesh = {
      colorIndex: i % 4,
      previous: p1.clone()
    }
    lines.push(linesMesh)
  }

  renderer.setAnimationLoop(render)
}

let logoFaces = null
let logoSides = null

new GLTFLoader().load(
  "./assets/LogoMergedClean.glb",
  (gltf) => {
    logoFaces = gltf.scene.children[0].children[1]
    logoSides = gltf.scene.children[0].children[0]
    initLines()
    scene.add(logoSides)
  },
  (xhr) => //console.log((xhr.loaded / xhr.total) * 100 + "% loaded")
    null,
  (err) => console.error(err)
)

const tempSparklesArrayColors = []
function findNextVector(line) {
  let ok = false
  while (!ok) {
    sampler.sample(p1)

    if (p1.distanceTo(line.previous) < 2) {
      line.previous = p1.clone()

      const spark = new Sparkle()
      spark.setup(line.previous)
      sparkles.push(spark)

      tempSparklesArrayColors.push(linesColors[line.colorIndex].r, linesColors[line.colorIndex].g, linesColors[line.colorIndex].b)
      sparklesGeometry.setAttribute("color", new THREE.Float32BufferAttribute(tempSparklesArrayColors, 3))

      ok = true
    }
  }
}

class Sparkle extends THREE.Vector3 {
  setup(origin) {
    this.add(origin).multiplyScalar(2)
    this.dest = origin

    this._size = Math.random() * 5 + 0.5
    this.size = 1
    this.scaleSpeed = Math.random() * 0.03 + 0.03
    this.stop = false
  }
  update() {
    this.x += (this.dest.x - this.x) * 0.01
    this.y += (this.dest.y - this.y) * 0.01
    this.z += (this.dest.z - this.z) * 0.01
    if (this.size < this._size) {
      this.size += this.scaleSpeed
    } else {
      /* if (this.distanceTo(this.dest) < 0.1) {
        this.stop = true
      } */
    }
  }
}

let tempSparklesArray = []
let tempSparklesArraySizes = []

// Render
function render(a) {

  if (sparkles.length < 30000) {
    lines.forEach(l => {
      findNextVector(l)
      findNextVector(l)
      findNextVector(l)
    })
  }

  sparkles.forEach((s, i) => {
    if (!s.stop) {
      s.update()
    }
    tempSparklesArray[(i * 3)] = s.x
    tempSparklesArray[(i * 3) + 1] = s.y
    tempSparklesArray[(i * 3) + 2] = s.z
    tempSparklesArraySizes[i] = s.size
  })
  sparklesGeometry.setAttribute("position", new THREE.Float32BufferAttribute(tempSparklesArray, 3))
  sparklesGeometry.setAttribute("size", new THREE.Float32BufferAttribute(tempSparklesArraySizes, 1))

  // Render
  renderer.render(scene, camera)
  // Stats
  stats.update()
}

window.addEventListener('resize', () => {
  // Update sizes
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  // Update camera
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()

  // Update renderer
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})