"use client"

import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sphere, Html, Line } from '@react-three/drei'
import * as THREE from 'three'

interface KnowledgeGraphProps {
  highlightedNode: string | null;
}

// 🧠 Dummy Data for the Demo Graph
// We are mapping the IDs from your Sidebar directly to these nodes
const nodes = [
  { id: 'dbms', position: [0, 0, 0], type: 'master', label: 'DBMS CORE' },
  { id: 'normalization', position: [-2, 1.5, -1], type: 'user', label: 'Normalization' },
  { id: 'bcnf', position: [-3.5, 2.5, -0.5], type: 'confusion', label: 'BCNF' },
  { id: 'indexing', position: [2.5, -1, 1], type: 'master', label: 'Indexing & B-Trees' },
  { id: 'acid', position: [0, -2, 2], type: 'user', label: 'ACID Properties' },
  { id: 'os', position: [4, 2, -3], type: 'master', label: 'OS CORE' },
]

// 🌌 Individual Node Component (Handles the floating & glowing logic)
function GraphNode({ node, isHighlighted }: { node: any, isHighlighted: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 2 + node.position[0]) * 0.002
      
      // If clicked in sidebar, make it pulse!
      if (isHighlighted) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.15
        meshRef.current.scale.set(scale, scale, scale)
      } else {
        // Return to normal size if not highlighted
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1)
      }
    }
  })

  // Assign colors based on the legend
  let color = node.type === 'master' ? '#22d3ee' : node.type === 'user' ? '#10b981' : '#ef4444'
  if (isHighlighted) color = '#ffffff' // Override to white/bright cyan when clicked

  return (
    <group position={node.position as [number, number, number]}>
      <Sphere ref={meshRef} args={[isHighlighted ? 0.5 : 0.35, 32, 32]}>
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={isHighlighted ? 2.5 : 0.8}
          toneMapped={false} 
        />
      </Sphere>
      
      {/* HTML Label floating under the 3D node */}
      <Html distanceFactor={12} position={[0, -0.7, 0]} center>
        <div className={`text-[10px] font-bold tracking-wider uppercase whitespace-nowrap transition-all duration-300 ${
            isHighlighted 
                ? 'text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.9)] scale-110' 
                : 'text-white/40'
        }`}>
          {node.label}
        </div>
      </Html>
    </group>
  )
}

// 🚀 The Main Graph Component
export default function KnowledgeGraph({ highlightedNode }: KnowledgeGraphProps) {
  return (
    <div className="w-full h-full bg-[#050508] rounded-2xl border border-white/10 overflow-hidden relative shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
      
      {/* ── LEGEND ── */}
      <div className="absolute top-5 left-5 z-10 flex flex-col gap-2 bg-black/40 p-3 rounded-lg backdrop-blur-sm border border-white/5 pointer-events-none">
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></div>
            <span className="text-xs text-white/70">Master Node</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
            <span className="text-xs text-white/70">Your Node</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"></div>
            <span className="text-xs text-white/70">High Confusion Zone</span>
        </div>
      </div>

      {/* ── 3D CANVAS ── */}
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#22d3ee" />
        
        {/* Render all the nodes */}
        {nodes.map(node => (
          <GraphNode 
            key={node.id} 
            node={node} 
            isHighlighted={highlightedNode === node.id} 
          />
        ))}

        {/* Lines connecting the nodes to show "relationships" */}
        <Line points={[[0, 0, 0], [-2, 1.5, -1]]} color="rgba(255,255,255,0.1)" lineWidth={1} />
        <Line points={[[-2, 1.5, -1], [-3.5, 2.5, -0.5]]} color="rgba(255,255,255,0.1)" lineWidth={1} />
        <Line points={[[0, 0, 0], [2.5, -1, 1]]} color="rgba(255,255,255,0.1)" lineWidth={1} />
        <Line points={[[0, 0, 0], [0, -2, 2]]} color="rgba(255,255,255,0.1)" lineWidth={1} />

        {/* Allows you to drag, rotate, and zoom the graph with your mouse! */}
        <OrbitControls 
            enableZoom={true} 
            enablePan={true} 
            autoRotate={!highlightedNode} // Stop rotating if they click a specific node
            autoRotateSpeed={0.5} 
            maxDistance={15}
            minDistance={3}
        />
      </Canvas>
    </div>
  )
}