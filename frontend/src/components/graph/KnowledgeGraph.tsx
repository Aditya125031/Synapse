"use client"

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { MessageCircleQuestion } from 'lucide-react'

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false })

export default function KnowledgeGraph({ nodes = [], links = [] }: { nodes?: any[], links?: any[] }) {
  const [isDoubtModalOpen, setIsDoubtModalOpen] = useState(false)
  const [doubtText, setDoubtText] = useState("")

  const graphData = useMemo(() => ({
    nodes: nodes.length > 0 ? nodes : [{ id: 'Empty', name: 'Start Contributing', val: 5, color: '#333' }],
    links: links
  }), [nodes, links])

  const handleSubmitDoubt = () => {
    // Send to FastAPI /ask-doubt endpoint
    console.log("Submitting doubt to AI Judge:", doubtText)
    setIsDoubtModalOpen(false)
    setDoubtText("")
  }

  return (
    <div className="w-full h-full flex flex-col relative bg-black/20 rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm">
      
      {/* Legend & Controls Overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2 text-xs text-white/60"><span className="w-2 h-2 rounded-full bg-[#06b6d4]"></span> Master Node</div>
        <div className="flex items-center gap-2 text-xs text-white/60"><span className="w-2 h-2 rounded-full bg-[#ef4444]"></span> Doubts</div>
      </div>

      {/* Floating Doubt Button on the right bar */}
      <button 
        onClick={() => setIsDoubtModalOpen(true)}
        className="absolute bottom-6 right-6 z-20 flex items-center gap-2 bg-red-500/20 text-red-400 border border-red-500/50 px-4 py-2 rounded-full hover:bg-red-500/30 transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
      >
        <MessageCircleQuestion className="w-4 h-4" /> Ask Doubt
      </button>

      {/* The 3D Canvas */}
      <div className="flex-1 w-full h-full">
         <ForceGraph3D
            graphData={graphData}
            backgroundColor="rgba(0,0,0,0)"
            nodeLabel="name"
            nodeColor="color"
            nodeRelSize={6}
            linkColor={() => 'rgba(255,255,255,0.2)'}
            linkWidth={1.5}
         />
      </div>

      {/* Embedded Doubt Modal */}
      {isDoubtModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
              <div className="w-full max-w-md bg-[#0a0a0f] border border-red-500/30 p-5 rounded-xl shadow-2xl">
                  <h3 className="text-lg font-bold text-red-400 mb-2">Submit a Doubt</h3>
                  <p className="text-xs text-white/50 mb-4">
                     AI Check: Irrelevant doubts cost a strike. 2 Strikes = 48-hour ban.
                  </p>
                  <textarea 
                      className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-red-500 outline-none resize-none mb-3"
                      placeholder="e.g., Why does BCNF prevent update anomalies compared to 3NF?"
                      value={doubtText}
                      onChange={(e) => setDoubtText(e.target.value)}
                  />
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setIsDoubtModalOpen(false)} className="text-white/40 hover:text-white text-sm">Cancel</button>
                      <button onClick={handleSubmitDoubt} className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-600">Analyze & Submit</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}