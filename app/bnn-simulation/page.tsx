"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, Play, Pause, RotateCcw, Activity, Settings, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"

// Types for biological neural network
interface BiologicalNeuron {
  id: string
  x: number
  y: number
  type: "pyramidal" | "interneuron" | "motor"
  restingPotential: number
  currentPotential: number
  threshold: number
  isActive: boolean
  lastSpikeTime: number
  dendrites: Dendrite[]
  axon: Axon
}

interface Dendrite {
  id: string
  points: { x: number; y: number }[]
  activity: number
}

interface Axon {
  id: string
  points: { x: number; y: number }[]
  terminals: { x: number; y: number; targetNeuronId: string }[]
  signalPosition: number
  isTransmitting: boolean
}

interface ActionPotential {
  neuronId: string
  startTime: number
  position: number
  amplitude: number
}

interface Synapse {
  id: string
  preNeuronId: string
  postNeuronId: string
  x: number
  y: number
  strength: number
  neurotransmitter: "glutamate" | "gaba" | "dopamine"
  isActive: boolean
  lastActivation: number
}

export default function BNNSimulation() {
  // Simulation state
  const [isRunning, setIsRunning] = useState(false)
  const [simulationSpeed, setSimulationSpeed] = useState(1)
  const [stimulationIntensity, setStimulationIntensity] = useState(50)
  const [selectedNeuronType, setSelectedNeuronType] = useState<"all" | "pyramidal" | "interneuron" | "motor">("all")
  const [showElectricalActivity, setShowElectricalActivity] = useState(true)
  const [showSynapses, setShowSynapses] = useState(true)

  // Network data
  const [neurons, setNeurons] = useState<BiologicalNeuron[]>([])
  const [actionPotentials, setActionPotentials] = useState<ActionPotential[]>([])
  const [synapses, setSynapses] = useState<Synapse[]>([])
  const [currentTime, setCurrentTime] = useState(0)

  // Signal analysis state
  const [signalHistory, setSignalHistory] = useState<{ [key: string]: number[] }>({})
  const [selectedNeuron, setSelectedNeuron] = useState<string | null>(null)

  // Initialize biological neural network
  const initializeNetwork = useCallback(() => {
    const newNeurons: BiologicalNeuron[] = []
    const newSynapses: Synapse[] = []

    const neuronTypes: ("pyramidal" | "interneuron" | "motor")[] = ["pyramidal", "interneuron", "motor"]
    const cellWidth = 180
    const cellHeight = 120
    const startX = 80
    const startY = 80

    for (let i = 0; i < 12; i++) {
      const type = neuronTypes[i % 3]
      const col = i % 4
      const row = Math.floor(i / 4)
      const x = startX + col * cellWidth
      const y = startY + row * cellHeight

      // Create dendrites with better positioning
      const dendrites: Dendrite[] = []
      const numDendrites = type === "pyramidal" ? 6 : 4

      for (let d = 0; d < numDendrites; d++) {
        const angle = (d / numDendrites) * Math.PI * 2
        const length = 25 + Math.random() * 15 // Reduced length to prevent overlap
        const points = []

        for (let p = 0; p < 3; p++) {
          // Reduced points for cleaner look
          const segmentLength = length / 3
          const segmentAngle = angle + (Math.random() - 0.5) * 0.2
          points.push({
            x: x + Math.cos(segmentAngle) * segmentLength * (p + 1),
            y: y + Math.sin(segmentAngle) * segmentLength * (p + 1),
          })
        }

        dendrites.push({
          id: `${i}-dendrite-${d}`,
          points,
          activity: 0,
        })
      }

      // Create axon with better positioning
      const axonLength = 40 + Math.random() * 20 // Reduced length
      const axonAngle = Math.random() * Math.PI * 2
      const axonPoints = []
      const terminals = []

      for (let p = 0; p < 5; p++) {
        // Reduced points
        axonPoints.push({
          x: x + Math.cos(axonAngle) * (axonLength / 5) * (p + 1),
          y: y + Math.sin(axonAngle) * (axonLength / 5) * (p + 1),
        })
      }

      // Add terminals with better positioning
      const numTerminals = 2
      for (let t = 0; t < numTerminals; t++) {
        const terminalAngle = axonAngle + (t - 0.5) * 0.5
        const terminalLength = 15
        terminals.push({
          x: axonPoints[axonPoints.length - 1].x + Math.cos(terminalAngle) * terminalLength,
          y: axonPoints[axonPoints.length - 1].y + Math.sin(terminalAngle) * terminalLength,
          targetNeuronId: `neuron-${(i + 1 + t) % 12}`,
        })
      }

      newNeurons.push({
        id: `neuron-${i}`,
        x,
        y,
        type,
        restingPotential: -70,
        currentPotential: -70,
        threshold: -55,
        isActive: false,
        lastSpikeTime: 0,
        dendrites,
        axon: {
          id: `${i}-axon`,
          points: axonPoints,
          terminals,
          signalPosition: 0,
          isTransmitting: false,
        },
      })
    }

    // Create synapses
    newNeurons.forEach((neuron) => {
      neuron.axon.terminals.forEach((terminal, terminalIndex) => {
        const targetNeuron = newNeurons.find((n) => n.id === terminal.targetNeuronId)
        if (targetNeuron) {
          newSynapses.push({
            id: `${neuron.id}-synapse-${terminalIndex}`,
            preNeuronId: neuron.id,
            postNeuronId: targetNeuron.id,
            x: terminal.x,
            y: terminal.y,
            strength: 0.3 + Math.random() * 0.7,
            neurotransmitter: neuron.type === "interneuron" ? "gaba" : "glutamate",
            isActive: false,
            lastActivation: 0,
          })
        }
      })
    })

    setNeurons(newNeurons)
    setSynapses(newSynapses)
    setActionPotentials([])
    setCurrentTime(0)
    setSignalHistory({})
    setSelectedNeuron(null)
  }, [])

  // Simulation loop
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isRunning) {
      interval = setInterval(() => {
        setCurrentTime((prev) => prev + simulationSpeed)

        setNeurons((prev) =>
          prev.map((neuron) => {
            let newPotential = neuron.currentPotential

            // Decay towards resting potential
            newPotential += (neuron.restingPotential - newPotential) * 0.1

            // Random background activity
            newPotential += (Math.random() - 0.5) * 2

            // External stimulation
            if (Math.random() < stimulationIntensity / 1000) {
              newPotential += 20
            }

            // Check for action potential
            let isActive = false
            let lastSpikeTime = neuron.lastSpikeTime

            if (newPotential > neuron.threshold && currentTime - neuron.lastSpikeTime > 50) {
              isActive = true
              lastSpikeTime = currentTime
              newPotential = 40 // Peak of action potential

              // Create action potential
              setActionPotentials((prevAPs) => [
                ...prevAPs,
                {
                  neuronId: neuron.id,
                  startTime: currentTime,
                  position: 0,
                  amplitude: 40,
                },
              ])
            }

            // Update signal history for tracking
            setSignalHistory((prev) => {
              const history = prev[neuron.id] || []
              const newHistory = [...history, newPotential]
              // Keep last 100 data points
              if (newHistory.length > 100) {
                newHistory.shift()
              }
              return { ...prev, [neuron.id]: newHistory }
            })

            return {
              ...neuron,
              currentPotential: newPotential,
              isActive,
              lastSpikeTime,
            }
          }),
        )

        // Update action potentials
        setActionPotentials((prev) =>
          prev
            .map((ap) => ({
              ...ap,
              position: (currentTime - ap.startTime) / 100,
            }))
            .filter((ap) => ap.position < 1),
        )

        // Update synapses
        setSynapses((prev) =>
          prev.map((synapse) => {
            const relevantAP = actionPotentials.find(
              (ap) =>
                ap.neuronId === synapse.preNeuronId && ap.position > 0.8 && currentTime - synapse.lastActivation > 30,
            )

            if (relevantAP) {
              return {
                ...synapse,
                isActive: true,
                lastActivation: currentTime,
              }
            }

            return {
              ...synapse,
              isActive: currentTime - synapse.lastActivation < 20,
            }
          }),
        )
      }, 50)
    }

    return () => clearInterval(interval)
  }, [isRunning, simulationSpeed, stimulationIntensity, currentTime, actionPotentials])

  // Initialize network on mount
  useEffect(() => {
    initializeNetwork()
  }, [initializeNetwork])

  const toggleSimulation = () => {
    setIsRunning(!isRunning)
  }

  const resetSimulation = () => {
    setIsRunning(false)
    initializeNetwork()
  }

  const neuronTypeOptions = [
    { value: "all", label: "All Types" },
    { value: "pyramidal", label: "Pyramidal" },
    { value: "interneuron", label: "Interneuron" },
    { value: "motor", label: "Motor" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
              <h1 className="text-xl font-semibold">BNN Simulation Engine</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Badge variant={isRunning ? "default" : "secondary"}>{isRunning ? "Running" : "Paused"}</Badge>
            <Badge variant="outline">{neurons.filter((n) => n.isActive).length} Active Neurons</Badge>
          </div>
        </div>
      </header>

      <div className="container px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Simulation Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={toggleSimulation} className="flex-1">
                    {isRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    {isRunning ? "Pause" : "Start"}
                  </Button>
                  <Button onClick={resetSimulation} variant="outline">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Simulation Speed: {simulationSpeed}x</label>
                  <Slider
                    value={[simulationSpeed]}
                    onValueChange={(value) => setSimulationSpeed(value[0])}
                    min={0.1}
                    max={3}
                    step={0.1}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Stimulation Intensity: {stimulationIntensity}%</label>
                  <Slider
                    value={[stimulationIntensity]}
                    onValueChange={(value) => setStimulationIntensity(value[0])}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Neuron Type Filter</label>
                  <Select value={selectedNeuronType} onValueChange={(value) => setSelectedNeuronType(value as "all" | "pyramidal" | "interneuron" | "motor")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {neuronTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Electrical Activity</label>
                    <Switch checked={showElectricalActivity} onCheckedChange={setShowElectricalActivity} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Synapses</label>
                    <Switch checked={showSynapses} onCheckedChange={setShowSynapses} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Network Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Network Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Active Neurons</span>
                  <span className="font-mono">
                    {neurons.filter((n) => n.isActive).length}/{neurons.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Action Potentials</span>
                  <span className="font-mono">{actionPotentials.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Active Synapses</span>
                  <span className="font-mono">
                    {synapses.filter((s) => s.isActive).length}/{synapses.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Simulation Time</span>
                  <span className="font-mono">{Math.floor(currentTime / 100)}s</span>
                </div>
                {selectedNeuron && (
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span>Selected Neuron</span>
                    <span className="font-mono text-blue-600">{selectedNeuron}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Visualization Area */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="neuron" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="neuron">Single Neuron</TabsTrigger>
                <TabsTrigger value="network">Neural Network</TabsTrigger>
              </TabsList>

              <TabsContent value="neuron">
                <Card>
                  <CardHeader>
                    <CardTitle>Biological Neuron Structure</CardTitle>
                    <CardDescription>
                      Electric spike transmission from dendrites through axon to outputs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative h-96 bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden p-8">
                      <svg className="w-full h-full" viewBox="0 0 800 400">
                        {/* Input label */}
                        <rect
                          x={20}
                          y={20}
                          width={80}
                          height={30}
                          fill="#e5f3f0"
                          stroke="#10b981"
                          strokeWidth={2}
                          rx={4}
                        />
                        <text x={60} y={40} textAnchor="middle" className="text-sm font-semibold fill-green-700">
                          Inputs
                        </text>

                        {/* Output label */}
                        <rect
                          x={700}
                          y={20}
                          width={80}
                          height={30}
                          fill="#fef2f2"
                          stroke="#ef4444"
                          strokeWidth={2}
                          rx={4}
                        />
                        <text x={740} y={40} textAnchor="middle" className="text-sm font-semibold fill-red-700">
                          Outputs
                        </text>

                        {/* Main neuron structure */}
                        <g transform="translate(400, 200)">
                          {/* Cell Body */}
                          <circle
                            cx={0}
                            cy={0}
                            r={45}
                            fill="#f8b4cb"
                            stroke="#e91e63"
                            strokeWidth={3}
                            className="drop-shadow-lg"
                          />

                          {/* Nucleus */}
                          <circle cx={0} cy={0} r={20} fill="#ad1457" opacity={0.8} />
                          <text x={0} y={5} textAnchor="middle" className="text-xs font-bold fill-white">
                            Nucleus
                          </text>
                          <text x={0} y={65} textAnchor="middle" className="text-sm font-bold fill-gray-700">
                            Cell Body
                          </text>

                          {/* Dendrites (Inputs) */}
                          {Array.from({ length: 8 }, (_, i) => {
                            const angle = (i / 8) * Math.PI * 2 - Math.PI
                            const length = 80 + Math.random() * 40
                            const branches = 3 + Math.floor(Math.random() * 3)

                            return (
                              <g key={`dendrite-${i}`}>
                                {/* Main dendrite branch */}
                                <line
                                  x1={Math.cos(angle) * 45}
                                  y1={Math.sin(angle) * 45}
                                  x2={Math.cos(angle) * length}
                                  y2={Math.sin(angle) * length}
                                  stroke="#e91e63"
                                  strokeWidth={4}
                                  className="drop-shadow-sm"
                                />

                                {/* Dendrite sub-branches */}
                                {Array.from({ length: branches }, (_, j) => {
                                  const branchAngle = angle + (Math.random() - 0.5) * 0.8
                                  const branchLength = 20 + Math.random() * 25
                                  const startX = Math.cos(angle) * (length * 0.7)
                                  const startY = Math.sin(angle) * (length * 0.7)

                                  return (
                                    <line
                                      key={j}
                                      x1={startX}
                                      y1={startY}
                                      x2={startX + Math.cos(branchAngle) * branchLength}
                                      y2={startY + Math.sin(branchAngle) * branchLength}
                                      stroke="#e91e63"
                                      strokeWidth={2}
                                      opacity={0.8}
                                    />
                                  )
                                })}

                                {/* Electric impulse animation - sonic blue */}
                                {isRunning && (
                                  <circle r={4} fill="#0ea5e9" className="drop-shadow-lg">
                                    <animate
                                      attributeName="opacity"
                                      values="0;1;0"
                                      dur="2s"
                                      repeatCount="indefinite"
                                      begin={`${i * 0.3}s`}
                                    />
                                    <animateMotion
                                      dur="2s"
                                      repeatCount="indefinite"
                                      begin={`${i * 0.3}s`}
                                      path={`M${Math.cos(angle) * length},${Math.sin(angle) * length} L${Math.cos(angle) * 45},${Math.sin(angle) * 45}`}
                                    />
                                  </circle>
                                )}
                              </g>
                            )
                          })}

                          {/* Axon */}
                          <line
                            x1={45}
                            y1={0}
                            x2={200}
                            y2={0}
                            stroke="#ff9800"
                            strokeWidth={8}
                            className="drop-shadow-md"
                          />
                          <text x={122} y={-20} textAnchor="middle" className="text-sm font-bold fill-orange-700">
                            Axon
                          </text>

                          {/* Myelin sheaths */}
                          {Array.from({ length: 5 }, (_, i) => (
                            <ellipse
                              key={i}
                              cx={60 + i * 28}
                              cy={0}
                              rx={12}
                              ry={6}
                              fill="#ffc107"
                              opacity={0.8}
                              className="drop-shadow-sm"
                            />
                          ))}

                          {/* Axon terminals (Outputs) */}
                          {Array.from({ length: 5 }, (_, i) => {
                            const terminalY = (i - 2) * 25
                            const terminalX = 200

                            return (
                              <g key={`terminal-${i}`}>
                                <line
                                  x1={200}
                                  y1={0}
                                  x2={terminalX + 40}
                                  y2={terminalY}
                                  stroke="#ff9800"
                                  strokeWidth={4}
                                />
                                <circle
                                  cx={terminalX + 40}
                                  cy={terminalY}
                                  r={8}
                                  fill="#f44336"
                                  stroke="#d32f2f"
                                  strokeWidth={2}
                                  className="drop-shadow-md"
                                />

                                {/* Electric impulse along axon - sonic blue */}
                                {isRunning && (
                                  <circle r={6} fill="#0ea5e9" className="drop-shadow-lg">
                                    <animate
                                      attributeName="opacity"
                                      values="0;1;1;0"
                                      dur="3s"
                                      repeatCount="indefinite"
                                      begin={`${1 + i * 0.2}s`}
                                    />
                                    <animateMotion
                                      dur="3s"
                                      repeatCount="indefinite"
                                      begin={`${1 + i * 0.2}s`}
                                      path={`M45,0 L${terminalX + 40},${terminalY}`}
                                    />
                                  </circle>
                                )}
                              </g>
                            )
                          })}

                          {/* Main axon impulse - sonic blue */}
                          {isRunning && (
                            <circle r={8} fill="#0ea5e9" opacity={0.9} className="drop-shadow-xl">
                              <animate attributeName="opacity" values="0;1;1;0" dur="3s" repeatCount="indefinite" />
                              <animateMotion dur="3s" repeatCount="indefinite" path="M45,0 L200,0" />
                            </circle>
                          )}
                        </g>

                        {/* Labels */}
                        <text x={150} y={120} textAnchor="middle" className="text-sm font-bold fill-pink-700">
                          Dendrites
                        </text>
                        <text x={650} y={120} textAnchor="middle" className="text-sm font-bold fill-red-700">
                          Outputs
                        </text>

                        {/* Electric impulse legend */}
                        <g transform="translate(50, 380)">
                          <circle cx={0} cy={0} r={6} fill="#0ea5e9" />
                          <text x={15} y={5} className="text-sm font-medium fill-blue-600">
                            Electric Impulse (Action Potential)
                          </text>
                        </g>

                        {/* Direction arrows */}
                        <defs>
                          <marker
                            id="arrowhead-blue"
                            markerWidth="10"
                            markerHeight="7"
                            refX="9"
                            refY="3.5"
                            orient="auto"
                          >
                            <polygon points="0 0, 10 3.5, 0 7" fill="#0ea5e9" />
                          </marker>
                        </defs>

                        <path
                          d="M 100 330 Q 400 320 700 330"
                          stroke="#0ea5e9"
                          strokeWidth={3}
                          fill="none"
                          markerEnd="url(#arrowhead-blue)"
                          strokeDasharray="8,4"
                        />
                        <text x={400} y={360} textAnchor="middle" className="text-sm font-bold fill-blue-600">
                          Signal Flow Direction
                        </text>
                      </svg>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="network">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Biological Neural Network
                    </CardTitle>
                    <CardDescription>
                      Interactive neural network visualization - click neurons to analyze their activity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative h-96 bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden p-4">
                      <svg className="w-full h-full" viewBox="0 0 800 400">
                        {/* Synaptic connections */}
                        {synapses.map((synapse) => {
                          const preNeuron = neurons.find((n) => n.id === synapse.preNeuronId)
                          const postNeuron = neurons.find((n) => n.id === synapse.postNeuronId)

                          if (!preNeuron || !postNeuron) return null

                          return (
                            <line
                              key={synapse.id}
                              x1={preNeuron.x}
                              y1={preNeuron.y}
                              x2={postNeuron.x}
                              y2={postNeuron.y}
                              stroke={synapse.isActive ? "#0ea5e9" : "#64748b"}
                              strokeWidth={synapse.isActive ? 3 : 1}
                              strokeDasharray="6,6"
                              opacity={synapse.isActive ? 0.9 : 0.3}
                              className={synapse.isActive ? "animate-pulse" : ""}
                            />
                          )
                        })}

                        {/* Neurons */}
                        {neurons.map((neuron) => (
                          <g key={neuron.id} transform={`translate(${neuron.x}, ${neuron.y})`}>
                            {/* Dendrites */}
                            {neuron.dendrites.map((dendrite) => (
                              <g key={dendrite.id}>
                                {dendrite.points.map((point, pointIndex) => {
                                  if (pointIndex === 0) return null
                                  const prevPoint = pointIndex === 0 ? { x: 0, y: 0 } : dendrite.points[pointIndex - 1]
                                  return (
                                    <line
                                      key={pointIndex}
                                      x1={prevPoint.x}
                                      y1={prevPoint.y}
                                      x2={point.x}
                                      y2={point.y}
                                      stroke="#e91e63"
                                      strokeWidth={2}
                                      strokeDasharray="3,3"
                                      opacity={0.8}
                                    />
                                  )
                                })}
                              </g>
                            ))}

                            {/* Axon */}
                            {neuron.axon.points.map((point, pointIndex) => {
                              if (pointIndex === 0) return null
                              const prevPoint = pointIndex === 0 ? { x: 20, y: 0 } : neuron.axon.points[pointIndex - 1]
                              return (
                                <line
                                  key={pointIndex}
                                  x1={prevPoint.x}
                                  y1={prevPoint.y}
                                  x2={point.x}
                                  y2={point.y}
                                  stroke="#ff9800"
                                  strokeWidth={4}
                                  opacity={neuron.isActive ? 1 : 0.7}
                                  className={neuron.isActive ? "animate-pulse" : ""}
                                />
                              )
                            })}

                            {/* Axon terminals */}
                            {neuron.axon.terminals.map((terminal, index) => (
                              <circle
                                key={index}
                                cx={terminal.x}
                                cy={terminal.y}
                                r={5}
                                fill="#f44336"
                                stroke="#d32f2f"
                                strokeWidth={2}
                                opacity={neuron.isActive ? 1 : 0.7}
                                className={neuron.isActive ? "animate-pulse" : ""}
                              />
                            ))}

                            {/* Cell Body */}
                            <circle
                              cx={0}
                              cy={0}
                              r={22}
                              fill={neuron.isActive ? "#f8b4cb" : "#f1c2cc"}
                              stroke={selectedNeuron === neuron.id ? "#3b82f6" : "#e91e63"}
                              strokeWidth={selectedNeuron === neuron.id ? 4 : neuron.isActive ? 4 : 2}
                              opacity={neuron.isActive ? 1 : 0.8}
                              className={`drop-shadow-lg cursor-pointer ${neuron.isActive ? "animate-pulse" : ""}`}
                              onClick={() => setSelectedNeuron(selectedNeuron === neuron.id ? null : neuron.id)}
                            />

                            {/* Nucleus */}
                            <circle
                              cx={0}
                              cy={0}
                              r={10}
                              fill="#ad1457"
                              opacity={0.9}
                              className={`${neuron.isActive ? "animate-pulse" : ""} cursor-pointer`}
                              onClick={() => setSelectedNeuron(selectedNeuron === neuron.id ? null : neuron.id)}
                            />

                            {/* Electric impulse animation */}
                            {neuron.isActive && (
                              <>
                                {/* Central electric burst */}
                                <circle r={8} fill="#0ea5e9" opacity={0.9} className="drop-shadow-xl">
                                  <animate attributeName="opacity" values="0;1;0" dur="0.8s" repeatCount="2" />
                                  <animate attributeName="r" values="4;12;4" dur="0.8s" repeatCount="2" />
                                </circle>

                                {/* Radiating electric waves */}
                                {Array.from({ length: 3 }, (_, i) => (
                                  <circle
                                    key={i}
                                    r={20 + i * 10}
                                    fill="none"
                                    stroke="#0ea5e9"
                                    strokeWidth={2}
                                    opacity={0}
                                  >
                                    <animate
                                      attributeName="opacity"
                                      values="0;0.6;0"
                                      dur="1.5s"
                                      begin={`${i * 0.3}s`}
                                      repeatCount="1"
                                    />
                                    <animate
                                      attributeName="r"
                                      values={`${20 + i * 10};${40 + i * 15};${60 + i * 20}`}
                                      dur="1.5s"
                                      begin={`${i * 0.3}s`}
                                      repeatCount="1"
                                    />
                                  </circle>
                                ))}
                              </>
                            )}

                            {/* Neuron type label */}
                            <text
                              x={0}
                              y={25}
                              textAnchor="middle"
                              className="text-sm font-bold cursor-pointer"
                              fill="#374151"
                              style={{ fill: "var(--foreground, #374151)" }}
                              onClick={() => setSelectedNeuron(selectedNeuron === neuron.id ? null : neuron.id)}
                            >
                              {neuron.type}
                            </text>

                            {/* Activity indicator */}
                            {neuron.isActive && (
                              <text x={0} y={-35} textAnchor="middle" className="text-xs font-bold fill-blue-600">
                                FIRING!
                              </text>
                            )}

                            {/* Selected indicator */}
                            {selectedNeuron === neuron.id && (
                              <text x={0} y={-25} textAnchor="middle" className="text-xs font-bold fill-blue-600">
                                SELECTED
                              </text>
                            )}
                          </g>
                        ))}

                        {/* Legend */}
                        <g transform="translate(20, 350)">
                          <circle cx={0} cy={0} r={8} fill="#0ea5e9" />
                          <text x={15} y={5} className="text-sm font-medium fill-blue-600">
                            Electric Impulse (Action Potential)
                          </text>

                          <line
                            x1={200}
                            y1={0}
                            x2={250}
                            y2={0}
                            stroke="#0ea5e9"
                            strokeWidth={3}
                            strokeDasharray="6,6"
                          />
                          <text x={260} y={5} className="text-sm font-medium fill-blue-600">
                            Active Synapse
                          </text>
                        </g>

                        {/* Network activity indicator */}
                        <g transform="translate(650, 30)">
                          <rect
                            x={0}
                            y={0}
                            width={120}
                            height={40}
                            fill="rgba(59, 130, 246, 0.1)"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            rx={8}
                          />
                          <text x={60} y={15} textAnchor="middle" className="text-xs font-semibold fill-blue-600">
                            Active Neurons
                          </text>
                          <text x={60} y={30} textAnchor="middle" className="text-lg font-bold fill-blue-600">
                            {neurons.filter((n) => n.isActive).length}/{neurons.length}
                          </text>
                        </g>
                      </svg>
                    </div>

                    {/* Signal Analysis Panel */}
                    <div className="mt-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">Signal Analysis</h3>
                        {selectedNeuron ? (
                          <span className="text-sm text-muted-foreground">
                            Click another neuron to analyze or click the same neuron to deselect
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Click on any neuron to analyze its electrical activity
                          </span>
                        )}
                      </div>

                      {selectedNeuron ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Real-time Signal Trace */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">
                                Membrane Potential - {neurons.find((n) => n.id === selectedNeuron)?.type} Neuron
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="h-48 bg-muted/20 rounded-lg p-4">
                                <svg className="w-full h-full" viewBox="0 0 400 150">
                                  {/* Grid */}
                                  {Array.from({ length: 8 }, (_, i) => (
                                    <g key={i}>
                                      <line
                                        x1={0}
                                        y1={i * 21.4}
                                        x2={400}
                                        y2={i * 21.4}
                                        stroke="hsl(var(--border))"
                                        strokeWidth={1}
                                        opacity={0.3}
                                      />
                                      <line
                                        x1={i * 57.1}
                                        y1={0}
                                        x2={i * 57.1}
                                        y2={150}
                                        stroke="hsl(var(--border))"
                                        strokeWidth={1}
                                        opacity={0.3}
                                      />
                                    </g>
                                  ))}

                                  {/* Y-axis labels */}
                                  <text x={5} y={15} className="text-xs fill-foreground">
                                    +40mV
                                  </text>
                                  <text x={5} y={60} className="text-xs fill-foreground">
                                    0mV
                                  </text>
                                  <text x={5} y={90} className="text-xs fill-foreground">
                                    -55mV
                                  </text>
                                  <text x={5} y={135} className="text-xs fill-foreground">
                                    -70mV
                                  </text>

                                  {/* Threshold line */}
                                  <line
                                    x1={0}
                                    y1={90}
                                    x2={400}
                                    y2={90}
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    strokeDasharray="4,4"
                                    opacity={0.7}
                                  />

                                  {/* Resting potential line */}
                                  <line
                                    x1={0}
                                    y1={135}
                                    x2={400}
                                    y2={135}
                                    stroke="#64748b"
                                    strokeWidth={1}
                                    strokeDasharray="2,2"
                                    opacity={0.5}
                                  />

                                  {/* Signal trace */}
                                  {signalHistory[selectedNeuron] && (
                                    <polyline
                                      fill="none"
                                      stroke="#0ea5e9"
                                      strokeWidth={2}
                                      points={signalHistory[selectedNeuron]
                                        .map((potential, index) => {
                                          const x = (index / (signalHistory[selectedNeuron].length - 1)) * 400
                                          const normalizedPotential = ((potential + 70) / 110) * 150
                                          const y = 150 - normalizedPotential
                                          return `${x},${y}`
                                        })
                                        .join(" ")}
                                    />
                                  )}

                                  {/* Current potential marker */}
                                  {(() => {
                                    const neuron = neurons.find((n) => n.id === selectedNeuron)
                                    if (!neuron) return null
                                    const normalizedPotential = ((neuron.currentPotential + 70) / 110) * 150
                                    const y = 150 - normalizedPotential
                                    return (
                                      <circle
                                        cx={390}
                                        cy={y}
                                        r={4}
                                        fill={neuron.isActive ? "#ef4444" : "#0ea5e9"}
                                        className={neuron.isActive ? "animate-pulse" : ""}
                                      />
                                    )
                                  })()}
                                </svg>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Neuron Statistics */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Neuron Statistics & Function</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {(() => {
                                const neuron = neurons.find((n) => n.id === selectedNeuron)
                                if (!neuron) return null

                                const spikesInHistory =
                                  signalHistory[selectedNeuron]?.filter((p) => p > neuron.threshold).length || 0
                                const avgPotential = signalHistory[selectedNeuron]
                                  ? signalHistory[selectedNeuron].reduce((a, b) => a + b, 0) /
                                    signalHistory[selectedNeuron].length
                                  : neuron.currentPotential

                                // Function descriptions for each neuron type
                                const neuronFunctions = {
                                  pyramidal: {
                                    title: "Pyramidal Neuron",
                                    location: "Cerebral Cortex, Hippocampus",
                                    function:
                                      "Primary excitatory neurons that process and transmit information. They form the backbone of cognitive functions including memory formation, decision-making, and sensory processing.",
                                    characteristics: [
                                      "Large triangular cell body",
                                      "Extensive dendritic tree",
                                      "Long axon projections",
                                      "Glutamate neurotransmitter",
                                    ],
                                    roles: [
                                      "Memory consolidation",
                                      "Pattern recognition",
                                      "Spatial navigation",
                                      "Learning and adaptation",
                                    ],
                                    icon: "🧠",
                                    color: "text-purple-600",
                                  },
                                  interneuron: {
                                    title: "Interneuron",
                                    location: "Throughout CNS",
                                    function:
                                      "Local inhibitory neurons that regulate and balance neural activity. They act as 'brakes' in the neural network, preventing overexcitation and maintaining stable neural rhythms.",
                                    characteristics: [
                                      "Smaller cell body",
                                      "Local connections",
                                      "Fast synaptic transmission",
                                      "GABA neurotransmitter",
                                    ],
                                    roles: [
                                      "Neural rhythm generation",
                                      "Preventing seizures",
                                      "Signal filtering",
                                      "Attention regulation",
                                    ],
                                    icon: "⚖️",
                                    color: "text-green-600",
                                  },
                                  motor: {
                                    title: "Motor Neuron",
                                    location: "Spinal Cord, Brainstem",
                                    function:
                                      "Control muscle contraction and movement. They are the final common pathway from the nervous system to muscles, translating neural commands into physical actions.",
                                    characteristics: [
                                      "Large cell body",
                                      "Long axon to muscles",
                                      "High metabolic activity",
                                      "Acetylcholine at NMJ",
                                    ],
                                    roles: [
                                      "Voluntary movement",
                                      "Reflex responses",
                                      "Posture maintenance",
                                      "Fine motor control",
                                    ],
                                    icon: "💪",
                                    color: "text-red-600",
                                  },
                                }

                                const neuronInfo = neuronFunctions[neuron.type]

                                return (
                                  <div className="space-y-4">
                                    {/* Neuron Function Card */}
                                    <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-blue-500">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-2xl">{neuronInfo.icon}</span>
                                        <h4 className={`font-bold ${neuronInfo.color}`}>{neuronInfo.title}</h4>
                                      </div>
                                      <div className="text-sm space-y-2">
                                        <div>
                                          <span className="font-medium text-muted-foreground">Location:</span>
                                          <span className="ml-2">{neuronInfo.location}</span>
                                        </div>
                                        <div>
                                          <span className="font-medium text-muted-foreground">Function:</span>
                                          <p className="mt-1 text-foreground/90 leading-relaxed">
                                            {neuronInfo.function}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Current Statistics */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Current State:</span>
                                        <div
                                          className={`font-semibold ${neuron.isActive ? "text-red-600" : "text-blue-600"}`}
                                        >
                                          {neuron.isActive ? "FIRING" : "Resting"}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Membrane Potential:</span>
                                        <div className="font-mono font-semibold">
                                          {neuron.currentPotential.toFixed(1)}mV
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Threshold:</span>
                                        <div className="font-mono font-semibold text-red-600">{neuron.threshold}mV</div>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Avg Potential:</span>
                                        <div className="font-mono font-semibold">{avgPotential.toFixed(1)}mV</div>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Spikes Detected:</span>
                                        <div className="font-semibold text-red-600">{spikesInHistory}</div>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Last Spike:</span>
                                        <div className="font-mono font-semibold">
                                          {neuron.lastSpikeTime > 0
                                            ? `${Math.floor((currentTime - neuron.lastSpikeTime) / 100)}s ago`
                                            : "None"}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Biological Characteristics */}
                                    <div className="pt-4 border-t">
                                      <span className="text-sm font-medium text-muted-foreground">
                                        Biological Characteristics:
                                      </span>
                                      <div className="mt-2 grid grid-cols-1 gap-1">
                                        {neuronInfo.characteristics.map((char, index) => (
                                          <div key={index} className="text-sm flex items-center gap-2">
                                            <span className="text-blue-500">•</span>
                                            <span>{char}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Key Roles */}
                                    <div className="pt-4 border-t">
                                      <span className="text-sm font-medium text-muted-foreground">
                                        Key Roles in Brain:
                                      </span>
                                      <div className="mt-2 grid grid-cols-1 gap-1">
                                        {neuronInfo.roles.map((role, index) => (
                                          <div key={index} className="text-sm flex items-center gap-2">
                                            <span className={neuronInfo.color}>•</span>
                                            <span>{role}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Connection Statistics */}
                                    <div className="pt-4 border-t">
                                      <span className="text-muted-foreground text-sm font-medium">
                                        Network Connections:
                                      </span>
                                      <div className="mt-2 space-y-1">
                                        <div className="text-sm">
                                          <span className="font-medium">Dendrites:</span> {neuron.dendrites.length}
                                        </div>
                                        <div className="text-sm">
                                          <span className="font-medium">Axon Terminals:</span>{" "}
                                          {neuron.axon.terminals.length}
                                        </div>
                                        <div className="text-sm">
                                          <span className="font-medium">Outgoing Synapses:</span>{" "}
                                          {synapses.filter((s) => s.preNeuronId === neuron.id).length}
                                        </div>
                                        <div className="text-sm">
                                          <span className="font-medium">Incoming Synapses:</span>{" "}
                                          {synapses.filter((s) => s.postNeuronId === neuron.id).length}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Clinical Relevance */}
                                    <div className="pt-4 border-t bg-amber-50 dark:bg-amber-950/30 -mx-4 -mb-4 p-4 rounded-b-lg">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span>🏥</span>
                                        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                          Clinical Relevance
                                        </span>
                                      </div>
                                      <div className="text-sm text-amber-800 dark:text-amber-200">
                                        {neuron.type === "pyramidal" &&
                                          "Dysfunction linked to Alzheimer's disease, schizophrenia, and epilepsy. Critical for memory and cognition."}
                                        {neuron.type === "interneuron" &&
                                          "Impairment associated with epilepsy, autism spectrum disorders, and schizophrenia. Essential for neural balance."}
                                        {neuron.type === "motor" &&
                                          "Damage causes ALS, spinal muscular atrophy, and paralysis. Vital for all voluntary movement."}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })()}
                            </CardContent>
                          </Card>
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-center text-muted-foreground">
                              <div className="text-4xl mb-4">🧠</div>
                              <p>
                                Select a neuron from the network above to analyze its electrical activity and view
                                detailed statistics.
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
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
