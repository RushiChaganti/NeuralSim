"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, Play, Pause, RotateCcw, Settings, Brain, Activity, TrendingUp } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// Types for our neural network
interface NetworkNode {
  id: string
  layer: number
  position: number
  activation: number
  bias: number
  input?: number
  output?: number
}

interface NetworkConnection {
  from: string
  to: string
  weight: number
  active: boolean
}

interface TrainingMetrics {
  epoch: number
  loss: number
  accuracy: number
  learningRate: number
}

// Activation functions
const activationFunctions = {
  sigmoid: (x: number) => 1 / (1 + Math.exp(-x)),
  relu: (x: number) => Math.max(0, x),
  tanh: (x: number) => Math.tanh(x),
  leaky_relu: (x: number) => (x > 0 ? x : 0.01 * x),
  linear: (x: number) => x,
}

export default function ANNSimulation() {
  // Network architecture settings
  const [networkType, setNetworkType] = useState<"perceptron" | "multilayer">("multilayer")
  const [hiddenLayers, setHiddenLayers] = useState(2)
  const [nodesPerLayer, setNodesPerLayer] = useState(4)
  const [inputNodes, setInputNodes] = useState(3)
  const [outputNodes, setOutputNodes] = useState(2)
  const [activationFunction, setActivationFunction] = useState<keyof typeof activationFunctions>("sigmoid")

  // Simulation state
  const [isTraining, setIsTraining] = useState(false)
  const [currentEpoch, setCurrentEpoch] = useState(0)
  const [maxEpochs, setMaxEpochs] = useState(100)
  const [learningRate, setLearningRate] = useState(0.01)
  const [trainingSpeed, setTrainingSpeed] = useState(200)

  // Neuron info state
  const [selectedNeuron, setSelectedNeuron] = useState<NetworkNode | null>(null)
  const [neuronInfo, setNeuronInfo] = useState<{
    title: string
    details: { label: string; value: string }[]
  } | null>(null)

  // Network data
  const [nodes, setNodes] = useState<NetworkNode[]>([])
  const [connections, setConnections] = useState<NetworkConnection[]>([])
  const [metrics, setMetrics] = useState<TrainingMetrics[]>([])

  // Generate network architecture array
  const getNetworkArchitecture = useCallback(() => {
    if (networkType === "perceptron") {
      return [inputNodes, outputNodes]
    } else {
      return [inputNodes, ...Array(hiddenLayers).fill(nodesPerLayer), outputNodes]
    }
  }, [networkType, hiddenLayers, nodesPerLayer, inputNodes, outputNodes])

  // Initialize network
  const initializeNetwork = useCallback(() => {
    const architecture = getNetworkArchitecture()
    const newNodes: NetworkNode[] = []
    const newConnections: NetworkConnection[] = []

    // Create nodes for each layer
    architecture.forEach((layerSize, layerIndex) => {
      for (let i = 0; i < layerSize; i++) {
        const node: NetworkNode = {
          id: `${layerIndex}-${i}`,
          layer: layerIndex,
          position: i,
          activation: layerIndex === 0 ? Math.random() : 0,
          bias: layerIndex === 0 ? 0 : (Math.random() - 0.5) * 2,
        }

        if (layerIndex === 0) {
          node.input = Math.random()
        }

        newNodes.push(node)
      }
    })

    // Create connections between adjacent layers
    for (let layer = 0; layer < architecture.length - 1; layer++) {
      const currentLayerSize = architecture[layer]
      const nextLayerSize = architecture[layer + 1]

      for (let from = 0; from < currentLayerSize; from++) {
        for (let to = 0; to < nextLayerSize; to++) {
          newConnections.push({
            from: `${layer}-${from}`,
            to: `${layer + 1}-${to}`,
            weight: (Math.random() - 0.5) * 2,
            active: false,
          })
        }
      }
    }

    setNodes(newNodes)
    setConnections(newConnections)
    setCurrentEpoch(0)
    setMetrics([])
    setSelectedNeuron(null)
    setNeuronInfo(null)
  }, [getNetworkArchitecture])

  // Forward pass simulation
  const performForwardPass = useCallback(() => {
    const architecture = getNetworkArchitecture()

    setNodes((prevNodes) => {
      const newNodes = [...prevNodes]

      // Set input values
      newNodes
        .filter((n) => n.layer === 0)
        .forEach((node) => {
          node.activation = node.input || Math.random()
        })

      // Process each layer
      for (let layer = 1; layer < architecture.length; layer++) {
        const currentLayerNodes = newNodes.filter((n) => n.layer === layer)

        currentLayerNodes.forEach((node) => {
          let sum = node.bias

          // Sum weighted inputs from previous layer
          connections.forEach((conn) => {
            if (conn.to === node.id) {
              const fromNode = newNodes.find((n) => n.id === conn.from)
              if (fromNode) {
                sum += fromNode.activation * conn.weight
              }
            }
          })

          // Apply activation function
          node.activation = activationFunctions[activationFunction](sum)
        })
      }

      return newNodes
    })

    // Activate connections randomly for visual effect
    setConnections((prev) =>
      prev.map((conn) => ({
        ...conn,
        active: Math.random() > 0.6,
      })),
    )
  }, [connections, activationFunction, getNetworkArchitecture])

  // Training simulation
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isTraining && currentEpoch < maxEpochs) {
      interval = setInterval(() => {
        performForwardPass()

        // Simulate backpropagation with weight updates
        setConnections((prev) =>
          prev.map((conn) => ({
            ...conn,
            weight: conn.weight + (Math.random() - 0.5) * learningRate * 0.1,
            active: Math.random() > 0.5,
          })),
        )

        // Update metrics
        const progress = currentEpoch / maxEpochs
        const newLoss = Math.max(0.01, 2 * Math.exp(-currentEpoch * 0.05) + Math.random() * 0.1)
        const newAccuracy = Math.min(0.99, progress * 0.8 + 0.2 + Math.random() * 0.05)

        setMetrics((prev) => [
          ...prev,
          {
            epoch: currentEpoch + 1,
            loss: newLoss,
            accuracy: newAccuracy,
            learningRate: learningRate,
          },
        ])

        setCurrentEpoch((prev) => prev + 1)
      }, trainingSpeed)
    }

    return () => clearInterval(interval)
  }, [isTraining, currentEpoch, maxEpochs, learningRate, trainingSpeed, performForwardPass])

  // Initialize network on mount and architecture change
  useEffect(() => {
    initializeNetwork()
  }, [initializeNetwork])

  // Stop training when max epochs reached
  useEffect(() => {
    if (currentEpoch >= maxEpochs) {
      setIsTraining(false)
    }
  }, [currentEpoch, maxEpochs])

  const toggleTraining = () => {
    setIsTraining(!isTraining)
  }

  const resetSimulation = () => {
    setIsTraining(false)
    initializeNetwork()
  }

  const handleNeuronClick = (node: NetworkNode) => {
    setSelectedNeuron(node)

    let title = ""
    if (node.layer === 0) {
      title = `Input Neuron ${node.position}`
    } else if (node.layer === getNetworkArchitecture().length - 1) {
      title = `Output Neuron ${node.position}`
    } else {
      title = `Hidden Neuron ${node.layer}-${node.position}`
    }

    const details = [
      { label: "Layer", value: node.layer.toString() },
      { label: "Position", value: node.position.toString() },
      { label: "Activation", value: node.activation.toFixed(4) },
      { label: "Bias", value: node.bias.toFixed(4) },
      { label: "Node ID", value: node.id },
    ]

    if (node.input !== undefined) {
      details.splice(3, 0, { label: "Input Value", value: node.input.toFixed(4) })
    }

    setNeuronInfo({ title, details })
  }

  const currentMetrics = metrics[metrics.length - 1]
  const architecture = getNetworkArchitecture()

  // Calculate positions for nodes
  const getNodePosition = (layer: number, position: number, totalNodes: number) => {
    const safeArchitecture = architecture.length > 0 ? architecture : [1, 1]
    const safeTotalNodes = Math.max(1, totalNodes)

    const layerWidth = 800
    const layerSpacing = layerWidth / (safeArchitecture.length + 1)
    const x = layerSpacing * (layer + 1)

    const nodeSpacing = 300 / (safeTotalNodes + 1)
    const y = 50 + nodeSpacing * (position + 1)

    // Ensure we never return NaN values
    const safeX = isNaN(x) ? 100 : x
    const safeY = isNaN(y) ? 100 : y

    return { x: safeX, y: safeY }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-700 bg-gray-800/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-400" />
              <h1 className="text-xl font-semibold text-white">Neural Network Simulator</h1>
              <div className="ml-2 px-2 py-1 text-xs bg-blue-900 text-blue-200 rounded">
                {networkType === "perceptron" ? "Perceptron" : `${architecture.join("-")} Network`} •{" "}
                {activationFunction.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-4 text-sm text-gray-300">
              <span className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full ${isTraining ? "bg-green-400 animate-pulse" : "bg-gray-500"}`} />
                {isTraining ? "Training" : "Idle"}
              </span>
              <span>
                Epoch {currentEpoch}/{maxEpochs}
              </span>
              <span>Loss {currentMetrics?.loss.toFixed(3) || "0.500"}</span>
              <span>Accuracy {currentMetrics ? (currentMetrics.accuracy * 100).toFixed(1) : "75.0"}%</span>
            </div>
            <button
              onClick={toggleTraining}
              disabled={currentEpoch >= maxEpochs}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600"
            >
              {isTraining ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isTraining ? "Pause" : "Train"}
            </button>
            <button
              onClick={resetSimulation}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>
      </header>

      <div className="container px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Network Type */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
                <Settings className="h-5 w-5" />
                Network Type
              </h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="networkType"
                    value="perceptron"
                    checked={networkType === "perceptron"}
                    onChange={(e) => setNetworkType(e.target.value as "perceptron")}
                    disabled={isTraining}
                    className="mr-2"
                  />
                  <span className="text-gray-300">Single Layer Perceptron</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="networkType"
                    value="multilayer"
                    checked={networkType === "multilayer"}
                    onChange={(e) => setNetworkType(e.target.value as "multilayer")}
                    disabled={isTraining}
                    className="mr-2"
                  />
                  <span className="text-gray-300">Multi-Layer Network</span>
                </label>
              </div>
            </div>

            {/* Architecture Controls */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Architecture</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Input Nodes: {inputNodes}</label>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    value={inputNodes}
                    onChange={(e) => setInputNodes(Number(e.target.value))}
                    disabled={isTraining}
                    className="w-full accent-blue-500"
                  />
                </div>

                {networkType === "multilayer" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Hidden Layers: {hiddenLayers}
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={4}
                        value={hiddenLayers}
                        onChange={(e) => setHiddenLayers(Number(e.target.value))}
                        disabled={isTraining}
                        className="w-full accent-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Nodes per Hidden Layer: {nodesPerLayer}
                      </label>
                      <input
                        type="range"
                        min={2}
                        max={8}
                        value={nodesPerLayer}
                        onChange={(e) => setNodesPerLayer(Number(e.target.value))}
                        disabled={isTraining}
                        className="w-full accent-blue-500"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Output Nodes: {outputNodes}</label>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    value={outputNodes}
                    onChange={(e) => setOutputNodes(Number(e.target.value))}
                    disabled={isTraining}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Activation Function */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
                <Activity className="h-5 w-5" />
                Activation Function
              </h3>
              <select
                value={activationFunction}
                onChange={(e) => setActivationFunction(e.target.value as keyof typeof activationFunctions)}
                disabled={isTraining}
                className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white"
              >
                <option value="sigmoid">Sigmoid</option>
                <option value="relu">ReLU</option>
                <option value="tanh">Tanh</option>
                <option value="leaky_relu">Leaky ReLU</option>
                <option value="linear">Linear</option>
              </select>
            </div>

            {/* Training Controls */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Training</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Learning Rate: {learningRate.toFixed(3)}
                  </label>
                  <input
                    type="range"
                    min={0.001}
                    max={0.1}
                    step={0.001}
                    value={learningRate}
                    onChange={(e) => setLearningRate(Number(e.target.value))}
                    disabled={isTraining}
                    className="w-full accent-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Max Epochs: {maxEpochs}</label>
                  <input
                    type="range"
                    min={10}
                    max={500}
                    step={10}
                    value={maxEpochs}
                    onChange={(e) => setMaxEpochs(Number(e.target.value))}
                    disabled={isTraining}
                    className="w-full accent-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Training Speed: {trainingSpeed}ms
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={1000}
                    step={50}
                    value={trainingSpeed}
                    onChange={(e) => setTrainingSpeed(Number(e.target.value))}
                    disabled={isTraining}
                    className="w-full accent-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Neuron Information Panel */}
            {neuronInfo && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <h3 className="text-lg font-semibold text-white mb-4">{neuronInfo.title}</h3>
                <div className="space-y-2">
                  {neuronInfo.details.map((detail, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-400">{detail.label}:</span>
                      <span className="text-white font-mono">{detail.value}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setSelectedNeuron(null)
                    setNeuronInfo(null)
                  }}
                  className="mt-3 text-xs text-blue-400 hover:text-blue-300"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>

          {/* Main Visualization Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className={`h-2 w-2 rounded-full ${isTraining ? "bg-yellow-400 animate-pulse" : "bg-gray-500"}`} />
                <h2 className="text-xl font-semibold text-white">
                  {networkType === "perceptron" ? "Single Layer Perceptron" : "Multi-Layer Neural Network"}
                </h2>
                <div className="ml-2 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                  {architecture.join("-")} • {activationFunction.toUpperCase()}
                </div>
              </div>

              <div className="relative h-96 bg-gray-900 rounded-lg overflow-hidden p-4">
                <svg className="w-full h-full" viewBox="0 0 800 350">
                  {/* Layer Labels */}
                  {architecture.map((_, layerIndex) => {
                    const { x } = getNodePosition(layerIndex, 0, 1)
                    const labelY = 20
                    let label = ""

                    if (layerIndex === 0) label = "Input Layer"
                    else if (layerIndex === architecture.length - 1) label = "Output Layer"
                    else label = `Hidden Layer ${layerIndex}`

                    return (
                      <text
                        key={layerIndex}
                        x={x}
                        y={labelY}
                        textAnchor="middle"
                        className="text-sm font-medium fill-gray-300"
                      >
                        {label}
                      </text>
                    )
                  })}

                  {/* Connections */}
                  {connections.map((conn, index) => {
                    const fromNode = nodes.find((n) => n.id === conn.from)
                    const toNode = nodes.find((n) => n.id === conn.to)

                    if (!fromNode || !toNode) return null

                    const fromPos = getNodePosition(
                      fromNode.layer,
                      fromNode.position,
                      architecture[fromNode.layer] || 1,
                    )
                    const toPos = getNodePosition(toNode.layer, toNode.position, architecture[toNode.layer] || 1)

                    if (isNaN(fromPos.x) || isNaN(fromPos.y) || isNaN(toPos.x) || isNaN(toPos.y)) {
                      return null
                    }

                    const strokeColor = conn.weight > 0 ? "#10b981" : "#ef4444"
                    const strokeWidth = Math.abs(conn.weight) * 2 + 0.5

                    return (
                      <g key={index}>
                        {conn.active && (
                          <line
                            x1={fromPos.x + 20}
                            y1={fromPos.y}
                            x2={toPos.x - 20}
                            y2={toPos.y}
                            stroke={strokeColor}
                            strokeWidth={strokeWidth + 1}
                            opacity={0.8}
                            filter="blur(1px)"
                          />
                        )}
                        <line
                          x1={fromPos.x + 20}
                          y1={fromPos.y}
                          x2={toPos.x - 20}
                          y2={toPos.y}
                          stroke={conn.active ? strokeColor : "#64748b"}
                          strokeWidth={conn.active ? strokeWidth : 1}
                          opacity={conn.active ? 0.9 : 0.3}
                        />
                        {conn.active && (
                          <circle r={2} fill={strokeColor} opacity={0.9}>
                            <animateMotion
                              dur="1s"
                              repeatCount="indefinite"
                              path={`M${fromPos.x + 20},${fromPos.y} L${toPos.x - 20},${toPos.y}`}
                            />
                          </circle>
                        )}
                      </g>
                    )
                  })}

                  {/* Nodes */}
                  {nodes.map((node) => {
                    const { x, y } = getNodePosition(node.layer, node.position, architecture[node.layer] || 1)

                    if (isNaN(x) || isNaN(y)) {
                      return null
                    }

                    let nodeColor = "#06b6d4" // Default cyan for hidden
                    if (node.layer === 0)
                      nodeColor = "#10b981" // Input - green
                    else if (node.layer === architecture.length - 1) nodeColor = "#84cc16" // Output - lime

                    const intensity = Math.abs(node.activation)
                    const isSelected = selectedNeuron?.id === node.id

                    return (
                      <g key={node.id}>
                        {/* Selection highlight for selected neuron */}
                        {isSelected && (
                          <circle cx={x} cy={y} r={28} fill="none" stroke="#fbbf24" strokeWidth={3} opacity={0.8} />
                        )}
                        <circle
                          cx={x}
                          cy={y}
                          r={22}
                          fill={nodeColor}
                          opacity={0.1 + intensity * 0.3}
                          filter="blur(2px)"
                        />
                        <circle
                          cx={x}
                          cy={y}
                          r={18}
                          fill={nodeColor}
                          opacity={0.2 + intensity * 0.6}
                          stroke={isSelected ? "#fbbf24" : nodeColor}
                          strokeWidth={isSelected ? 3 : 2}
                          style={{ cursor: "pointer" }}
                          onClick={() => handleNeuronClick(node)}
                        />
                        <text
                          x={x}
                          y={y + 3}
                          textAnchor="middle"
                          className="text-xs font-bold fill-white pointer-events-none"
                        >
                          {node.activation.toFixed(2)}
                        </text>
                        <text
                          x={x}
                          y={y + 35}
                          textAnchor="middle"
                          className="text-xs fill-gray-400 pointer-events-none"
                        >
                          {node.layer === 0
                            ? `i${node.position}`
                            : node.layer === architecture.length - 1
                              ? `o${node.position}`
                              : `h${node.layer}-${node.position}`}
                        </text>
                        {node.layer > 0 && (
                          <text
                            x={x}
                            y={y - 25}
                            textAnchor="middle"
                            className="text-xs fill-gray-500 pointer-events-none"
                          >
                            b: {node.bias.toFixed(2)}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </svg>
              </div>

              {/* Metrics Display */}
              {currentMetrics && (
                <div className="mt-4 grid grid-cols-4 gap-4 text-center">
                  <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                    <div className="text-sm text-blue-400">Epoch</div>
                    <div className="text-lg font-semibold text-blue-300">{currentMetrics.epoch}</div>
                  </div>
                  <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                    <div className="text-sm text-red-400">Loss</div>
                    <div className="text-lg font-semibold text-red-300">{currentMetrics.loss.toFixed(3)}</div>
                  </div>
                  <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                    <div className="text-sm text-green-400">Accuracy</div>
                    <div className="text-lg font-semibold text-green-300">
                      {(currentMetrics.accuracy * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-3">
                    <div className="text-sm text-purple-400">Learn Rate</div>
                    <div className="text-lg font-semibold text-purple-300">
                      {currentMetrics.learningRate.toFixed(3)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Activation Function Graph - Now prominently displayed */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="flex items-center gap-2 text-xl font-semibold text-white mb-4">
                <TrendingUp className="h-6 w-6" />
                Activation Function: {activationFunction.toUpperCase()}
              </h3>
              <div className="relative h-80 bg-gray-900 rounded border border-gray-600">
                <svg className="w-full h-full" viewBox="0 0 400 320">
                  {/* Enhanced Grid */}
                  <defs>
                    <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="0.5" opacity="0.3" />
                    </pattern>
                    <pattern id="largeGrid" width="100" height="100" patternUnits="userSpaceOnUse">
                      <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#4B5563" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="400" height="320" fill="url(#smallGrid)" />
                  <rect width="400" height="320" fill="url(#largeGrid)" />

                  {/* Axes */}
                  <line x1="200" y1="20" x2="200" y2="300" stroke="#9CA3AF" strokeWidth="2" />
                  <line x1="40" y1="160" x2="360" y2="160" stroke="#9CA3AF" strokeWidth="2" />

                  {/* Axis labels and ticks */}
                  <text x="370" y="165" className="text-sm fill-gray-300 font-medium">
                    x
                  </text>
                  <text x="205" y="35" className="text-sm fill-gray-300 font-medium">
                    y
                  </text>
                  <text x="190" y="175" className="text-sm fill-gray-400">
                    0
                  </text>

                  {/* X-axis ticks and labels */}
                  {[-3, -2, -1, 1, 2, 3].map((val) => (
                    <g key={val}>
                      <line
                        x1={200 + val * 40}
                        y1={155}
                        x2={200 + val * 40}
                        y2={165}
                        stroke="#9CA3AF"
                        strokeWidth="1"
                      />
                      <text x={200 + val * 40} y={180} textAnchor="middle" className="text-xs fill-gray-400">
                        {val}
                      </text>
                    </g>
                  ))}

                  {/* Y-axis ticks and labels */}
                  {(() => {
                    if (activationFunction === "sigmoid") {
                      return [0.2, 0.4, 0.6, 0.8, 1.0].map((val) => (
                        <g key={val}>
                          <line
                            x1={195}
                            y1={160 - val * 120}
                            x2={205}
                            y2={160 - val * 120}
                            stroke="#9CA3AF"
                            strokeWidth="1"
                          />
                          <text x={185} y={165 - val * 120} textAnchor="middle" className="text-xs fill-gray-400">
                            {val.toFixed(1)}
                          </text>
                        </g>
                      ))
                    } else if (activationFunction === "tanh") {
                      return [-1, -0.5, 0.5, 1].map((val) => (
                        <g key={val}>
                          <line
                            x1={195}
                            y1={160 - val * 60}
                            x2={205}
                            y2={160 - val * 60}
                            stroke="#9CA3AF"
                            strokeWidth="1"
                          />
                          <text x={185} y={165 - val * 60} textAnchor="middle" className="text-xs fill-gray-400">
                            {val}
                          </text>
                        </g>
                      ))
                    } else {
                      return [-2, -1, 1, 2].map((val) => (
                        <g key={val}>
                          <line
                            x1={195}
                            y1={160 - val * 40}
                            x2={205}
                            y2={160 - val * 40}
                            stroke="#9CA3AF"
                            strokeWidth="1"
                          />
                          <text x={185} y={165 - val * 40} textAnchor="middle" className="text-xs fill-gray-400">
                            {val}
                          </text>
                        </g>
                      ))
                    }
                  })()}

                  {/* Function curve with enhanced styling */}
                  <path
                    d={(() => {
                      const points = []
                      for (let i = 0; i <= 320; i += 1) {
                        const x = (i - 160) / 40 // Map to -4 to 4 range
                        let y

                        switch (activationFunction) {
                          case "sigmoid":
                            y = 1 / (1 + Math.exp(-x))
                            break
                          case "relu":
                            y = Math.max(0, x)
                            break
                          case "tanh":
                            y = Math.tanh(x)
                            break
                          case "leaky_relu":
                            y = x > 0 ? x : 0.01 * x
                            break
                          case "linear":
                            y = x
                            break
                          default:
                            y = 0
                        }

                        // Normalize y to fit in graph
                        let plotY
                        if (activationFunction === "sigmoid") {
                          plotY = 280 - y * 240 // 0-1 range
                        } else if (activationFunction === "tanh") {
                          plotY = 160 - y * 120 // -1 to 1 range
                        } else {
                          plotY = 160 - Math.max(-3, Math.min(3, y)) * 40 // Clamp to -3,3 range
                        }

                        points.push(`${i + 40},${plotY}`)
                      }
                      return `M ${points.join(" L ")}`
                    })()}
                    stroke="#3B82F6"
                    strokeWidth="3"
                    fill="none"
                    style={{ filter: "drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))" }}
                  />

                  {/* Function info */}
                  <rect x="50" y="40" width="140" height="60" rx="8" fill="#1F2937" stroke="#374151" strokeWidth="1" />
                  <text x="60" y="60" className="text-lg fill-blue-400 font-bold">
                    {activationFunction.replace("_", " ")}
                  </text>
                  <text x="60" y="80" className="text-sm fill-gray-300">
                    {activationFunction === "sigmoid"
                      ? "f(x) = 1/(1+e^(-x))"
                      : activationFunction === "tanh"
                        ? "f(x) = tanh(x)"
                        : activationFunction === "relu"
                          ? "f(x) = max(0,x)"
                          : activationFunction === "leaky_relu"
                            ? "f(x) = max(0.01x,x)"
                            : "f(x) = x"}
                  </text>
                  <text x="60" y="95" className="text-xs fill-gray-400">
                    {activationFunction === "sigmoid"
                      ? "Range: (0,1)"
                      : activationFunction === "tanh"
                        ? "Range: (-1,1)"
                        : activationFunction === "relu"
                          ? "Range: [0,∞)"
                          : activationFunction === "leaky_relu"
                            ? "Range: (-∞,∞)"
                            : "Range: (-∞,∞)"}
                  </text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
