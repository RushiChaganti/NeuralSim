"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { ArrowLeft, Play, Pause, RotateCcw, Eye, Volume2, Zap, Brain, Settings, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

// ---------------------- Types ----------------------
interface BrainRegion {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  activity: number // 0..1
  baseline?: number // resting activity 0..0.2
  function: string
  color: string // CSS color
}

interface VisualStimulus {
  id: string
  type: "edge" | "pattern" | "object" | "motion"
  x: number
  y: number
  intensity: number // 0..1
  processed: boolean
  startTime: number
}

interface AudioStimulus {
  id: string
  frequency: number
  amplitude: number // 0..1
  duration: number
  startTime: number
  processed: boolean
}

interface MotorCommand {
  id: string
  action: string
  intensity: number // 0..1
  duration: number
  startTime: number
  executed: boolean
}

interface CognitiveTask {
  id: string
  type: "memory" | "attention" | "decision"
  stimulus: string
  response: string
  accuracy: number // 0..1
  reactionTime: number
}

// Spike particle traveling between regions
interface SpikeParticle {
  id: string
  from: string // region id
  to: string // region id
  t: number // 0..1 progress
  speed: number // 0.002..0.01
  color: string
}

// ---------------------- Component ----------------------
export default function BrainFunctions() {
  // Simulation state
  const [isRunning, setIsRunning] = useState(false)
  const [selectedFunction, setSelectedFunction] = useState<"visual" | "auditory" | "motor" | "cognitive">("visual")
  const [processingSpeed, setProcessingSpeed] = useState(1)
  const [stimulusIntensity, setStimulusIntensity] = useState(50)

  // Brain regions
  const [brainRegions, setBrainRegions] = useState<BrainRegion[]>([])
  const [visualStimuli, setVisualStimuli] = useState<VisualStimulus[]>([])
  const [audioStimuli, setAudioStimuli] = useState<AudioStimulus[]>([])
  const [motorCommands, setMotorCommands] = useState<MotorCommand[]>([])
  const [cognitiveTask, setCognitiveTask] = useState<CognitiveTask | null>(null)

  const [currentTime, setCurrentTime] = useState(0)
  const [processingStats, setProcessingStats] = useState({
    visualProcessed: 0,
    audioProcessed: 0,
    motorExecuted: 0,
    cognitiveAccuracy: 0,
  })

  // Visual candy: spikes travelling between active regions
  const [spikes, setSpikes] = useState<SpikeParticle[]>([])

  // Tooltip state
  const [hoverInfo, setHoverInfo] = useState<null | { x: number; y: number; title: string; lines: string[] }>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  // ---------------------- Init Regions ----------------------
  const initializeBrainRegions = useCallback(() => {
    const regions: BrainRegion[] = [
      { id: "v1", name: "Primary Visual (V1)", x: 80, y: 210, width: 84, height: 60, activity: 0, baseline: 0.02, function: "Edge Detection", color: "hsl(var(--chart-1))" },
      { id: "v2", name: "Secondary Visual (V2)", x: 190, y: 190, width: 76, height: 52, activity: 0, baseline: 0.02, function: "Pattern Recognition", color: "hsl(var(--chart-1))" },
      { id: "v4", name: "Visual Area V4", x: 290, y: 170, width: 70, height: 48, activity: 0, baseline: 0.02, function: "Object Recognition", color: "hsl(var(--chart-1))" },

      { id: "a1", name: "Primary Auditory (A1)", x: 90, y: 110, width: 70, height: 50, activity: 0, baseline: 0.02, function: "Frequency Analysis", color: "hsl(var(--chart-2))" },
      { id: "a2", name: "Secondary Auditory", x: 185, y: 90, width: 64, height: 42, activity: 0, baseline: 0.02, function: "Sound Pattern", color: "hsl(var(--chart-2))" },
      { id: "wernicke", name: "Wernicke's Area", x: 265, y: 100, width: 92, height: 48, activity: 0, baseline: 0.02, function: "Speech Processing", color: "hsl(var(--chart-2))" },

      { id: "m1", name: "Primary Motor (M1)", x: 360, y: 60, width: 96, height: 64, activity: 0, baseline: 0.02, function: "Movement Control", color: "hsl(var(--chart-3))" },
      { id: "premotor", name: "Premotor Cortex", x: 255, y: 40, width: 86, height: 54, activity: 0, baseline: 0.02, function: "Movement Planning", color: "hsl(var(--chart-3))" },
      { id: "cerebellum", name: "Cerebellum", x: 430, y: 220, width: 80, height: 84, activity: 0, baseline: 0.02, function: "Motor Coordination", color: "hsl(var(--chart-3))" },

      { id: "pfc", name: "Prefrontal Cortex", x: 130, y: 30, width: 110, height: 74, activity: 0, baseline: 0.02, function: "Executive Control", color: "hsl(var(--chart-4))" },
      { id: "hippocampus", name: "Hippocampus", x: 295, y: 260, width: 90, height: 46, activity: 0, baseline: 0.02, function: "Memory Formation", color: "hsl(var(--chart-4))" },
      { id: "acc", name: "Anterior Cingulate", x: 215, y: 130, width: 76, height: 38, activity: 0, baseline: 0.02, function: "Attention Control", color: "hsl(var(--chart-4))" },
    ]
    setBrainRegions(regions)
  }, [])

  useEffect(() => {
    initializeBrainRegions()
  }, [initializeBrainRegions])

  // Helper: region center (for spike routing)
  const regionCenter = useCallback((r: BrainRegion) => ({ cx: r.x + r.width / 2, cy: r.y + r.height / 2 }), [])

  // ---------------------- Stimulus Generation ----------------------
  const generateStimulus = useCallback(() => {
    if (!isRunning) return
    const now = currentTime

    switch (selectedFunction) {
      case "visual": {
        if (Math.random() < stimulusIntensity / 220) {
          const types: VisualStimulus["type"][] = ["edge", "pattern", "object", "motion"]
          setVisualStimuli((prev) => [
            ...prev,
            {
              id: `visual-${now}-${Math.random()}`,
              type: types[Math.floor(Math.random() * types.length)],
              x: Math.random() * 420,
              y: Math.random() * 300,
              intensity: 0.5 + Math.random() * 0.5,
              processed: false,
              startTime: now,
            },
          ])
        }
        break
      }
      case "auditory": {
        if (Math.random() < stimulusIntensity / 320) {
          setAudioStimuli((prev) => [
            ...prev,
            {
              id: `audio-${now}-${Math.random()}`,
              frequency: 200 + Math.random() * 2000,
              amplitude: 0.3 + Math.random() * 0.7,
              duration: 120 + Math.random() * 500,
              startTime: now,
              processed: false,
            },
          ])
        }
        break
      }
      case "motor": {
        if (Math.random() < stimulusIntensity / 420) {
          const actions = ["reach", "grasp", "walk", "turn", "point"]
          setMotorCommands((prev) => [
            ...prev,
            {
              id: `motor-${now}-${Math.random()}`,
              action: actions[Math.floor(Math.random() * actions.length)],
              intensity: 0.4 + Math.random() * 0.6,
              duration: 220 + Math.random() * 800,
              startTime: now,
              executed: false,
            },
          ])
        }
        break
      }
      case "cognitive": {
        if (Math.random() < stimulusIntensity / 520 && !cognitiveTask) {
          const tasks = ["memory", "attention", "decision"] as const
          const taskType = tasks[Math.floor(Math.random() * tasks.length)]
          setCognitiveTask({
            id: `cognitive-${now}-${Math.random()}`,
            type: taskType,
            stimulus: `${taskType} task`,
            response: "",
            accuracy: 0.7 + Math.random() * 0.3,
            reactionTime: 300 + Math.random() * 700,
          })
        }
        break
      }
    }
  }, [isRunning, selectedFunction, stimulusIntensity, currentTime, cognitiveTask])

  // ---------------------- Processing Logic ----------------------
  const pushSpike = useCallback((fromId: string, toId: string, color: string) => {
    setSpikes((prev) => [
      ...prev,
      {
        id: `${fromId}-${toId}-${Date.now()}-${Math.random()}`,
        from: fromId,
        to: toId,
        t: 0,
        speed: 0.006 + Math.random() * 0.006,
        color,
      },
    ])
  }, [])

  const processStimuli = useCallback(() => {
    // Visual
    setVisualStimuli((prev) =>
      prev.map((s) => {
        if (!s.processed) {
          setBrainRegions((regions) =>
            regions.map((r) => {
              if (r.id === "v1" && s.type === "edge") {
                pushSpike("v1", "v2", r.color)
                return { ...r, activity: Math.min(1, r.activity + s.intensity * 0.35) }
              }
              if (r.id === "v2" && s.type === "pattern") {
                pushSpike("v2", "v4", r.color)
                return { ...r, activity: Math.min(1, r.activity + s.intensity * 0.3) }
              }
              if (r.id === "v4" && s.type === "object") {
                pushSpike("v4", "pfc", r.color)
                return { ...r, activity: Math.min(1, r.activity + s.intensity * 0.3) }
              }
              return r
            })
          )
          setProcessingStats((p) => ({ ...p, visualProcessed: p.visualProcessed + 1 }))
          return { ...s, processed: true }
        }
        return s
      })
    )

    // Auditory
    setAudioStimuli((prev) =>
      prev.map((s) => {
        if (!s.processed && currentTime - s.startTime > 60) {
          setBrainRegions((regions) =>
            regions.map((r) => {
              if (r.id === "a1") {
                pushSpike("a1", "a2", r.color)
                return { ...r, activity: Math.min(1, r.activity + s.amplitude * 0.4) }
              }
              if (r.id === "a2" && s.frequency > 1000) {
                pushSpike("a2", "wernicke", r.color)
                return { ...r, activity: Math.min(1, r.activity + s.amplitude * 0.28) }
              }
              if (r.id === "wernicke") {
                return { ...r, activity: Math.min(1, r.activity + s.amplitude * 0.2) }
              }
              return r
            })
          )
          setProcessingStats((p) => ({ ...p, audioProcessed: p.audioProcessed + 1 }))
          return { ...s, processed: true }
        }
        return s
      })
    )

    // Motor
    setMotorCommands((prev) =>
      prev.map((m) => {
        if (!m.executed && currentTime - m.startTime > 120) {
          setBrainRegions((regions) =>
            regions.map((r) => {
              if (r.id === "premotor") {
                pushSpike("premotor", "m1", r.color)
                return { ...r, activity: Math.min(1, r.activity + m.intensity * 0.35) }
              }
              if (r.id === "m1") {
                pushSpike("m1", "cerebellum", r.color)
                return { ...r, activity: Math.min(1, r.activity + m.intensity * 0.45) }
              }
              if (r.id === "cerebellum") {
                return { ...r, activity: Math.min(1, r.activity + m.intensity * 0.3) }
              }
              return r
            })
          )
          setProcessingStats((p) => ({ ...p, motorExecuted: p.motorExecuted + 1 }))
          return { ...m, executed: true }
        }
        return m
      })
    )

    // Cognitive
    if (cognitiveTask && currentTime % 1000 < 50) {
      setBrainRegions((regions) =>
        regions.map((r) => {
          if (r.id === "pfc" && cognitiveTask.type === "decision") {
            pushSpike("pfc", "acc", r.color)
            return { ...r, activity: Math.min(1, r.activity + 0.42) }
          }
          if (r.id === "hippocampus" && cognitiveTask.type === "memory") {
            pushSpike("hippocampus", "pfc", r.color)
            return { ...r, activity: Math.min(1, r.activity + 0.42) }
          }
          if (r.id === "acc" && cognitiveTask.type === "attention") {
            pushSpike("acc", "pfc", r.color)
            return { ...r, activity: Math.min(1, r.activity + 0.42) }
          }
          return r
        })
      )

      setProcessingStats((p) => ({ ...p, cognitiveAccuracy: cognitiveTask.accuracy }))
      // auto-complete task after 2s
      setTimeout(() => setCognitiveTask(null), 2000)
    }

    // Decay to baseline
    setBrainRegions((prev) =>
      prev.map((r) => ({
        ...r,
        activity: Math.max(r.baseline ?? 0, r.activity - 0.06),
      }))
    )
  }, [currentTime, cognitiveTask, pushSpike])

  // ---------------------- Spike animation loop ----------------------
  useEffect(() => {
    if (!isRunning) return
    let raf: number
    const step = () => {
      setSpikes((prev) => prev
        .map((s) => ({ ...s, t: s.t + s.speed * processingSpeed }))
        .filter((s) => s.t < 1)
      )
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [isRunning, processingSpeed])

  // ---------------------- Main simulation clock ----------------------
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      setCurrentTime((p) => p + Math.max(1, processingSpeed * 10))
      generateStimulus()
      processStimuli()
    }, 100)
    return () => clearInterval(id)
  }, [isRunning, processingSpeed, generateStimulus, processStimuli])

  // Cleanup old items
  useEffect(() => {
    setVisualStimuli((prev) => prev.filter((s) => currentTime - s.startTime < 5000))
    setAudioStimuli((prev) => prev.filter((s) => currentTime - s.startTime < 5000))
    setMotorCommands((prev) => prev.filter((s) => currentTime - s.startTime < 5000))
  }, [currentTime])

  const toggleSimulation = () => setIsRunning((v) => !v)
  const resetSimulation = () => {
    setIsRunning(false)
    initializeBrainRegions()
    setVisualStimuli([])
    setAudioStimuli([])
    setMotorCommands([])
    setCognitiveTask(null)
    setSpikes([])
    setCurrentTime(0)
    setProcessingStats({ visualProcessed: 0, audioProcessed: 0, motorExecuted: 0, cognitiveAccuracy: 0 })
  }

  // Quick lookup by id
  const regionMap = useMemo(() => Object.fromEntries(brainRegions.map((r) => [r.id, r])), [brainRegions])

  // ---------------------- Render ----------------------
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isRunning ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
              <h1 className="text-xl font-semibold">Brain Function Modules</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={isRunning ? "default" : "secondary"}>{isRunning ? "Processing" : "Paused"}</Badge>
            <Badge variant="outline">{brainRegions.filter((r) => r.activity > (r.baseline ?? 0) + 0.1).length} Active Regions</Badge>
          </div>
        </div>
      </header>

      <div className="container px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5"/> Function Controls</CardTitle>
                <CardDescription>Run the simulation and tune speed & intensity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={toggleSimulation} className="flex-1">
                    {isRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />} {isRunning ? "Pause" : "Start"}
                  </Button>
                  <Button onClick={resetSimulation} variant="outline" title="Reset">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Brain Function</label>
                  <Select value={selectedFunction} onValueChange={(v: any) => setSelectedFunction(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visual">Visual Processing</SelectItem>
                      <SelectItem value="auditory">Auditory Processing</SelectItem>
                      <SelectItem value="motor">Motor Functions</SelectItem>
                      <SelectItem value="cognitive">Cognitive Functions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Processing Speed: {processingSpeed.toFixed(1)}x</label>
                  <Slider value={[processingSpeed]} onValueChange={(v) => setProcessingSpeed(Number(v[0]))} min={0.1} max={3} step={0.1} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Stimulus Intensity: {stimulusIntensity}%</label>
                  <Slider value={[stimulusIntensity]} onValueChange={(v) => setStimulusIntensity(Number(v[0]))} min={0} max={100} step={5} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5"/> Processing Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span>Visual Processed</span><span className="font-mono">{processingStats.visualProcessed}</span></div>
                  <Progress value={Math.min(100, processingStats.visualProcessed * 2)} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span>Audio Processed</span><span className="font-mono">{processingStats.audioProcessed}</span></div>
                  <Progress value={Math.min(100, processingStats.audioProcessed * 3)} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span>Motor Executed</span><span className="font-mono">{processingStats.motorExecuted}</span></div>
                  <Progress value={Math.min(100, processingStats.motorExecuted * 4)} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span>Cognitive Accuracy</span><span className="font-mono">{(processingStats.cognitiveAccuracy * 100).toFixed(1)}%</span></div>
                  <Progress value={processingStats.cognitiveAccuracy * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Info className="h-4 w-4"/> Tips</CardTitle>
                <CardDescription>Hover regions to see details. Spikes show information flow.</CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Visualization */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="brain-map" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="brain-map">Brain Map</TabsTrigger>
                <TabsTrigger value="visual">Visual</TabsTrigger>
                <TabsTrigger value="auditory">Auditory</TabsTrigger>
                <TabsTrigger value="motor">Motor</TabsTrigger>
              </TabsList>

              <TabsContent value="brain-map">
                <Card>
                  <CardHeader>
                    <CardTitle>3D-like Brain Activity Map</CardTitle>
                    <CardDescription>Clean, layered SVG with animated spikes & tooltips.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative h-[480px] rounded-xl overflow-hidden bg-muted/10">
                      <svg ref={svgRef} className="w-full h-full" viewBox="0 0 640 400" onMouseLeave={() => setHoverInfo(null)}>
                        <defs>
                          <radialGradient id="brainGrad" cx="50%" cy="30%" r="75%">
                            <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.08" />
                            <stop offset="100%" stopColor="hsl(var(--border))" stopOpacity="0.28" />
                          </radialGradient>
                          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.25" />
                          </filter>
                          <linearGradient id="pulse" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Brain silhouette */}
                        <ellipse cx={220} cy={185} rx={140} ry={90} fill="url(#brainGrad)" stroke="hsl(var(--border))" strokeWidth={2} filter="url(#shadow)" />
                        <ellipse cx={250} cy={170} rx={140} ry={90} fill="url(#brainGrad)" stroke="hsl(var(--border))" strokeWidth={2} opacity={0.85} filter="url(#shadow)" />
                        <ellipse cx={410} cy={235} rx={46} ry={34} fill="url(#brainGrad)" stroke="hsl(var(--border))" strokeWidth={2} filter="url(#shadow)" />
                        <rect x={330} y={255} width={20} height={44} rx={10} fill="url(#brainGrad)" stroke="hsl(var(--border))" strokeWidth={2} filter="url(#shadow)" />

                        {/* Region connections (subtle) */}
                        {(
                          [
                            ["v1","v2"], ["v2","v4"], ["v4","pfc"],
                            ["a1","a2"], ["a2","wernicke"], ["wernicke","pfc"],
                            ["premotor","m1"], ["m1","cerebellum"],
                            ["hippocampus","pfc"], ["acc","pfc"],
                          ] as [string,string][]
                        ).map(([a,b], idx) => {
                          const ra = regionMap[a]; const rb = regionMap[b]
                          if (!ra || !rb) return null
                          const { cx: x1, cy: y1 } = regionCenter(ra)
                          const { cx: x2, cy: y2 } = regionCenter(rb)
                          return (
                            <line key={idx} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--border))" strokeOpacity={0.2} strokeWidth={2} />
                          )
                        })}

                        {/* Regions */}
                        {brainRegions.map((r) => {
                          const { cx, cy } = regionCenter(r)
                          const opacity = 0.35 + r.activity * 0.65
                          return (
                            <g key={r.id}
                               onMouseMove={(e) => {
                                 const pt = svgRef.current?.createSVGPoint();
                                 if (pt && svgRef.current) {
                                   pt.x = e.clientX; pt.y = e.clientY
                                   const ctm = svgRef.current.getScreenCTM();
                                   const ip = ctm ? pt.matrixTransform(ctm.inverse()) : { x: cx, y: cy }
                                   setHoverInfo({ x: ip.x, y: ip.y - 12, title: r.name, lines: [r.function, `Activity: ${(r.activity*100).toFixed(0)}%`] })
                                 }
                               }}
                               onMouseLeave={() => setHoverInfo(null)}>
                              {/* Glow */}
                              <motion.rect x={r.x - 6} y={r.y - 6} width={r.width + 12} height={r.height + 12} rx={14}
                                initial={{ opacity: 0 }} animate={{ opacity: r.activity > (r.baseline ?? 0) + 0.2 ? 0.25 : 0 }} transition={{ duration: 0.3 }}
                                fill={r.color} />

                              {/* Main */}
                              <motion.rect x={r.x} y={r.y} width={r.width} height={r.height} rx={10}
                                fill={r.color} opacity={opacity} stroke={r.color} strokeWidth={3} filter="url(#shadow)"
                                animate={{ scale: 1 + r.activity * 0.03 }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />

                              {/* Label */}
                              <text x={cx} y={cy - 4} textAnchor="middle" className="text-[10px] font-bold fill-foreground" style={{ paintOrder: 'stroke', stroke: 'black', strokeWidth: 0.6 }}>{r.name}</text>
                              <text x={cx} y={cy + 10} textAnchor="middle" className="text-[9px] fill-muted-foreground">{r.function}</text>
                              <text x={cx} y={r.y - 8} textAnchor="middle" className="text-xs font-bold fill-primary">{(r.activity*100).toFixed(0)}%</text>
                            </g>
                          )
                        })}

                        {/* Spikes */}
                        {spikes.map((s) => {
                          const a = regionMap[s.from]; const b = regionMap[s.to]
                          if (!a || !b) return null
                          const ac = regionCenter(a); const bc = regionCenter(b)
                          const x = ac.cx + (bc.cx - ac.cx) * s.t
                          const y = ac.cy + (bc.cy - ac.cy) * s.t
                          return (
                            <g key={s.id}>
                              <circle cx={x} cy={y} r={3.8} fill={s.color} opacity={0.95} />
                              <circle cx={x} cy={y} r={9} fill="none" stroke={s.color} strokeOpacity={0.4} />
                            </g>
                          )
                        })}

                        {/* Legend */}
                        <g transform="translate(470, 70)">
                          <rect width="150" height="210" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={1} rx={8} opacity={0.9} />
                          <text x={12} y={20} className="text-xs font-bold fill-foreground">Brain Regions</text>
                          <circle cx={20} cy={40} r={6} fill="hsl(var(--chart-1))" /><text x={35} y={44} className="text-[10px] fill-foreground">Visual Cortex</text>
                          <circle cx={20} cy={60} r={6} fill="hsl(var(--chart-2))" /><text x={35} y={64} className="text-[10px] fill-foreground">Auditory Cortex</text>
                          <circle cx={20} cy={80} r={6} fill="hsl(var(--chart-3))" /><text x={35} y={84} className="text-[10px] fill-foreground">Motor Cortex</text>
                          <circle cx={20} cy={100} r={6} fill="hsl(var(--chart-4))" /><text x={35} y={104} className="text-[10px] fill-foreground">Cognitive Areas</text>
                          <text x={12} y={128} className="text-[10px] font-medium fill-foreground">Activity Level</text>
                          <rect x={12} y={138} width={22} height={8} fill="hsl(var(--primary))" opacity={0.3} />
                          <text x={38} y={145} className="text-[10px] fill-muted-foreground">Low</text>
                          <rect x={12} y={154} width={22} height={8} fill="hsl(var(--primary))" opacity={0.7} />
                          <text x={38} y={161} className="text-[10px] fill-muted-foreground">Medium</text>
                          <rect x={12} y={170} width={22} height={8} fill="hsl(var(--primary))" opacity={1} />
                          <text x={38} y={177} className="text-[10px] fill-muted-foreground">High</text>
                        </g>
                      </svg>

                      {/* Tooltip */}
                      <AnimatePresence>
                        {hoverInfo && (
                          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                            className="pointer-events-none absolute rounded-md border border-border bg-popover px-2 py-1 text-xs shadow-md"
                            style={{ left: hoverInfo.x, top: hoverInfo.y }}>
                            <div className="font-semibold mb-0.5">{hoverInfo.title}</div>
                            {hoverInfo.lines.map((l, i) => (<div key={i} className="text-muted-foreground">{l}</div>))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Visual Tab */}
              <TabsContent value="visual">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5"/> Visual Processing</CardTitle>
                    <CardDescription>From edges (V1) to patterns (V2) to objects (V4).</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96 bg-muted/10 rounded-lg p-4">
                      <div className="grid grid-cols-3 gap-4 h-full">
                        <div className="border border-border rounded p-2">
                          <h4 className="text-sm font-medium mb-2">Visual Input</h4>
                          <div className="relative h-full bg-background rounded overflow-hidden">
                            {visualStimuli.slice(-12).map((s) => (
                              <div key={s.id}
                                   className={`absolute w-3.5 h-3.5 rounded-full transition-all duration-500 ${
                                     s.type === "edge" ? "bg-red-500" : s.type === "pattern" ? "bg-blue-500" : s.type === "object" ? "bg-green-500" : "bg-yellow-500"
                                   }`}
                                   style={{ left: `${(s.x / 420) * 100}%`, top: `${(s.y / 300) * 100}%`, opacity: s.processed ? 0.3 : s.intensity }} />
                            ))}
                          </div>
                        </div>

                        <div className="border border-border rounded p-2">
                          <h4 className="text-sm font-medium mb-2">Processing Stages</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-red-500 rounded" />
                              <span className="text-xs">Edge Detection (V1)</span>
                              <Progress value={(regionMap["v1"]?.activity || 0) * 100} className="flex-1 h-2" />
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-500 rounded" />
                              <span className="text-xs">Pattern Recognition (V2)</span>
                              <Progress value={(regionMap["v2"]?.activity || 0) * 100} className="flex-1 h-2" />
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-500 rounded" />
                              <span className="text-xs">Object Recognition (V4)</span>
                              <Progress value={(regionMap["v4"]?.activity || 0) * 100} className="flex-1 h-2" />
                            </div>
                          </div>
                        </div>

                        <div className="border border-border rounded p-2">
                          <h4 className="text-sm font-medium mb-2">Recognition Output</h4>
                          <div className="space-y-1 text-xs">
                            <div>Processed: {processingStats.visualProcessed}</div>
                            <div>Active Regions: {brainRegions.filter((r) => r.id.startsWith("v") && r.activity > (r.baseline ?? 0) + 0.1).length}</div>
                            <div>Rate: {(processingStats.visualProcessed / Math.max(1, currentTime / 1000)).toFixed(1)}/s</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Auditory Tab */}
              <TabsContent value="auditory">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Volume2 className="h-5 w-5"/> Auditory Processing</CardTitle>
                    <CardDescription>Frequency analysis (A1) → patterns (A2) → speech (Wernicke).</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96 bg-muted/10 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4 h-full">
                        <div className="border border-border rounded p-2">
                          <h4 className="text-sm font-medium mb-2">Frequency Spectrum</h4>
                          <svg className="w-full h-full" viewBox="0 0 220 150">
                            {audioStimuli.slice(-24).map((s) => {
                              const x = (s.frequency / 2200) * 220
                              const h = s.amplitude * 110
                              return <rect key={s.id} x={x} y={140 - h} width={3} height={h} fill="hsl(var(--chart-2))" opacity={s.processed ? 0.3 : 0.8} />
                            })}
                            <text x={8} y={18} className="text-[10px] fill-foreground">2kHz</text>
                            <text x={8} y={142} className="text-[10px] fill-foreground">0Hz</text>
                          </svg>
                        </div>
                        <div className="border border-border rounded p-2">
                          <h4 className="text-sm font-medium mb-2">Auditory Regions</h4>
                          <div className="space-y-3">
                            {(["a1","a2","wernicke"] as const).map((id) => (
                              <div key={id} className="space-y-1">
                                <div className="flex justify-between text-xs"><span>{regionMap[id]?.name || id}</span><span>{((regionMap[id]?.activity || 0) * 100).toFixed(0)}%</span></div>
                                <Progress value={(regionMap[id]?.activity || 0) * 100} className="h-2" />
                              </div>
                            ))}
                            <div className="mt-2 text-xs space-y-1">
                              <div>Sounds Processed: {processingStats.audioProcessed}</div>
                              <div>Current Stimuli: {audioStimuli.filter((s) => !s.processed).length}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Motor Tab */}
              <TabsContent value="motor">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5"/> Motor Control</CardTitle>
                    <CardDescription>Planning (Premotor) → Execution (M1) → Coordination (Cerebellum).</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96 bg-muted/10 rounded-lg p-4">
                      <div className="grid grid-cols-3 gap-4 h-full">
                        <div className="border border-border rounded p-2">
                          <h4 className="text-sm font-medium mb-2">Motor Planning</h4>
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs"><span>Premotor</span><span>{((regionMap["premotor"]?.activity || 0) * 100).toFixed(0)}%</span></div>
                              <Progress value={(regionMap["premotor"]?.activity || 0) * 100} className="h-2" />
                            </div>
                            <div className="text-xs space-y-1">
                              <div>Planned Actions:</div>
                              {motorCommands.slice(-6).map((m) => (
                                <div key={m.id} className="flex justify-between"><span>{m.action}</span><span className={m.executed ? "text-green-500" : "text-yellow-500"}>{m.executed ? "Done" : "Planning"}</span></div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="border border-border rounded p-2">
                          <h4 className="text-sm font-medium mb-2">Motor Execution</h4>
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs"><span>M1</span><span>{((regionMap["m1"]?.activity || 0) * 100).toFixed(0)}%</span></div>
                              <Progress value={(regionMap["m1"]?.activity || 0) * 100} className="h-2" />
                            </div>
                            <div className="text-xs">
                              <div>Executed: {processingStats.motorExecuted}</div>
                              <div>Active Commands: {motorCommands.filter((c) => !c.executed).length}</div>
                            </div>
                          </div>
                        </div>
                        <div className="border border-border rounded p-2">
                          <h4 className="text-sm font-medium mb-2">Coordination</h4>
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs"><span>Cerebellum</span><span>{((regionMap["cerebellum"]?.activity || 0) * 100).toFixed(0)}%</span></div>
                              <Progress value={(regionMap["cerebellum"]?.activity || 0) * 100} className="h-2" />
                            </div>
                            <div className="text-xs">
                              <div>Coordination Active</div>
                              <div>Balance: OK</div>
                              <div>Precision: High</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
