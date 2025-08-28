"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { ArrowLeft, Play, Pause, RotateCcw, TrendingUp, GitBranch, Layers, Settings, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

// Types for ML algorithms
interface DataPoint {
  x: number
  y: number
  label?: number
  predicted?: number
}

interface LinearRegressionState {
  slope: number
  intercept: number
  cost: number
  iteration: number
  previousCost: number
}

interface BackpropStep {
  layer: number
  type: "forward" | "backward"
  values: number[]
  gradients?: number[]
  weights?: number[][]
}

interface DecisionNode {
  id: string
  feature: string
  threshold: number
  left?: DecisionNode
  right?: DecisionNode
  prediction?: number
  samples: number
  depth: number
}

interface CNNLayer {
  id: string
  type: "conv" | "pool" | "fc"
  name: string
  inputShape: number[]
  outputShape: number[]
  filters?: number
  kernelSize?: number
  activation: number[][]
}

// --- START: New Digit Recognition Logic ---

/**
 * Recognizes a digit from a 28x28 grid of pixel data using feature extraction.
 * @param {number[][]} data - The 28x28 drawing grid.
 * @returns {number[]} - A 10-element array of probabilities for digits 0-9.
 */
const recognizeDigit = (data: number[][]): number[] => {
  const scores = Array(10).fill(0)
  const totalIntensity = data.flat().reduce((sum, val) => sum + val, 0)

  // If the canvas is nearly empty, return neutral probabilities.
  if (totalIntensity < 5) {
    return Array(10).fill(0.1)
  }

  // --- Feature Extraction Helpers ---

  // 1. Count enclosed loops (for 0, 6, 8, 9)
  const countLoops = (grid: number[][]): number => {
    const visited = Array(28).fill(0).map(() => Array(28).fill(false))
    let loops = 0

    const floodFill = (x: number, y: number) => {
      if (x < 0 || x >= 28 || y < 0 || y >= 28 || visited[y][x] || grid[y][x] > 0.1) {
        return
      }
      visited[y][x] = true
      floodFill(x + 1, y)
      floodFill(x - 1, y)
      floodFill(x, y + 1)
      floodFill(x, y - 1)
    }

    // Fill background from the outside
    floodFill(0, 0)

    // Any remaining unvisited empty areas are loops
    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 28; x++) {
        if (!visited[y][x] && grid[y][x] < 0.1) {
          loops++
          floodFill(x, y)
        }
      }
    }
    return loops
  }

  // 2. Calculate vertical and horizontal symmetry
  const getSymmetry = (grid: number[][]): { v: number; h: number } => {
    let vSymmetry = 0
    let hSymmetry = 0
    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 14; x++) {
        vSymmetry += 1 - Math.abs(grid[y][x] - grid[y][27 - x])
        hSymmetry += 1 - Math.abs(grid[x][y] - grid[27 - x][y])
      }
    }
    return { v: vSymmetry / (28 * 14), h: hSymmetry / (28 * 14) }
  }

  // 3. Get the aspect ratio of the bounding box
  const getAspectRatio = (grid: number[][]): number => {
    let minX = 28, maxX = 0, minY = 28, maxY = 0
    for(let y=0; y<28; y++) {
        for(let x=0; x<28; x++) {
            if(grid[y][x] > 0.1) {
                minX = Math.min(minX, x)
                maxX = Math.max(maxX, x)
                minY = Math.min(minY, y)
                maxY = Math.max(maxY, y)
            }
        }
    }
    const width = maxX - minX + 1
    const height = maxY - minY + 1
    return height / (width || 1)
  }

  // --- Run Feature Extraction ---
  const loops = countLoops(data)
  const symmetry = getSymmetry(data)
  const aspectRatio = getAspectRatio(data)

  // --- Scoring Based on Features (Heuristics) ---
  scores[8] += loops === 2 ? 10 : -5
  scores[0] += loops === 1 && symmetry.v > 0.9 && symmetry.h > 0.8 ? 8 : 0
  scores[6] += loops === 1 && symmetry.h < 0.75 ? 7 : 0
  scores[9] += loops === 1 && symmetry.h < 0.75 ? 7 : 0
  scores[1] += loops === 0 && aspectRatio > 2.0 && symmetry.v > 0.9 ? 10 : -2
  scores[7] += loops === 0 && aspectRatio < 1.5 ? 5 : 0
  scores[2] += loops === 0 && symmetry.v < 0.8 && symmetry.h < 0.8 ? 5 : 0
  scores[3] += loops === 0 && symmetry.h > 0.8 ? 6 : 0
  scores[5] += loops === 0 ? 3 : 0
  scores[4] += loops === 0 ? 4 : 0

  // Bonus for strong symmetry on symmetrical numbers
  scores[0] += symmetry.v * 3 + symmetry.h * 3
  scores[1] += symmetry.v * 4
  scores[8] += symmetry.v * 2 + symmetry.h * 2
  
  // --- Softmax to convert scores to probabilities ---
  const maxScore = Math.max(...scores)
  const exps = scores.map(score => Math.exp(score - maxScore))
  const sumExps = exps.reduce((a, b) => a + b, 0)
  const probabilities = exps.map(exp => exp / sumExps)

  return probabilities
}

// --- END: New Digit Recognition Logic ---

// SEEDED RANDOM GENERATOR to ensure consistent values between server and client
let seedValue = 12345;

function seededRandom() {
  const x = Math.sin(seedValue++) * 10000;
  return x - Math.floor(x);
}

function resetSeed() {
  seedValue = 12345;
}

export default function MLAlgorithms() {
  // Add client-side hydration flag
  const [isClient, setIsClient] = useState(false)

  // Simulation state
  const [isRunning, setIsRunning] = useState(false)
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<"linear" | "backprop" | "forest" | "cnn">("linear")
  const [learningRate, setLearningRate] = useState(0.01)
  const [iterations, setIterations] = useState(0)
  const [maxIterations, setMaxIterations] = useState(100)

  // Algorithm-specific states
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([])
  const [linearRegression, setLinearRegression] = useState<LinearRegressionState>({
    slope: 0,
    intercept: 0,
    cost: 0,
    iteration: 0,
    previousCost: 0,
  })
  const [backpropSteps, setBackpropSteps] = useState<BackpropStep[]>([])
  const [currentBackpropStep, setCurrentBackpropStep] = useState(0)
  const [decisionTree, setDecisionTree] = useState<DecisionNode | null>(null)
  const [cnnLayers, setCnnLayers] = useState<CNNLayer[]>([])

  // Canvas for CNN
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingData, setDrawingData] = useState<number[][]>(
    Array(28).fill(0).map(() => Array(28).fill(0))
  )

  // Initialize client-side hydration flag
  useEffect(() => {
    setIsClient(true)
    // Initialize with seeded random values on client side only
    resetSeed()
    setLinearRegression({
      slope: seededRandom() - 0.5,
      intercept: seededRandom() - 0.5,
      cost: 0,
      iteration: 0,
      previousCost: 0,
    })
  }, [])

  // Generate sample data with better distribution
  const generateData = useCallback(() => {
    if (!isClient) return // Don't generate data on server side
    
    resetSeed() // Reset seed for consistent data generation
    const points: DataPoint[] = []

    switch (selectedAlgorithm) {
      case "linear":
        // Generate linear regression data with clear trend
        const trueSlope = 2 + seededRandom()
        const trueIntercept = 1 + seededRandom() * 2
        for (let i = 0; i < 50; i++) {
          const x = seededRandom() * 10
          const y = trueSlope * x + trueIntercept + (seededRandom() - 0.5) * 2
          points.push({ x, y })
        }
        break

      case "backprop":
        // Generate XOR-like classification data
        for (let i = 0; i < 100; i++) {
          const x = seededRandom() * 10
          const y = seededRandom() * 10
          const label = (x > 5) !== (y > 5) ? 1 : 0 // XOR pattern
          points.push({ x, y, label })
        }
        break

      case "forest":
        // Generate three distinct clusters
        const clusters = [
          { centerX: 2, centerY: 2, label: 0 },
          { centerX: 8, centerY: 2, label: 1 },
          { centerX: 5, centerY: 8, label: 2 }
        ]
        
        clusters.forEach(cluster => {
          for (let i = 0; i < 40; i++) {
            const angle = seededRandom() * 2 * Math.PI
            const radius = seededRandom() * 2
            const x = cluster.centerX + Math.cos(angle) * radius
            const y = cluster.centerY + Math.sin(angle) * radius
            points.push({ 
              x: Math.max(0, Math.min(10, x)), 
              y: Math.max(0, Math.min(10, y)), 
              label: cluster.label 
            })
          }
        })
        break

      case "cnn":
        // Initialize CNN layers
        setCnnLayers([
          {
            id: "input",
            type: "conv",
            name: "Input (28×28)",
            inputShape: [28, 28, 1],
            outputShape: [28, 28, 1],
            activation: Array(28).fill(0).map(() => Array(28).fill(0)),
          },
          {
            id: "conv1",
            type: "conv",
            name: "Conv2D (32 filters)",
            inputShape: [28, 28, 1],
            outputShape: [26, 26, 32],
            filters: 32,
            kernelSize: 3,
            activation: Array(26).fill(0).map(() => Array(26).fill(0)),
          },
          {
            id: "pool1",
            type: "pool",
            name: "MaxPool2D",
            inputShape: [26, 26, 32],
            outputShape: [13, 13, 32],
            activation: Array(13).fill(0).map(() => Array(13).fill(0)),
          },
          {
            id: "fc",
            type: "fc",
            name: "Dense (10 classes)",
            inputShape: [13 * 13 * 32],
            outputShape: [10],
            activation: [Array(10).fill(0)],
          },
        ])
        break
    }

    setDataPoints(points)
  }, [selectedAlgorithm, isClient])

  // Improved decision tree building
  const buildDecisionTree = useCallback((data: DataPoint[], depth = 0, maxDepth = 3): DecisionNode => {
    if (depth >= maxDepth || data.length < 5) {
      const labels = data.map(d => d.label || 0)
      const labelCounts = labels.reduce((acc, label) => {
        acc[label] = (acc[label] || 0) + 1
        return acc
      }, {} as Record<number, number>)
      const prediction = parseInt(Object.keys(labelCounts).reduce((a, b) => 
        labelCounts[parseInt(a)] > labelCounts[parseInt(b)] ? a : b
      , "0"))
      
      return {
        id: `leaf-${depth}-${data.length}`,
        feature: "leaf",
        threshold: 0,
        prediction,
        samples: data.length,
        depth,
      }
    }

    let bestSplit = { feature: "x", threshold: 5, gain: 0 }
    
    // Find best split
    for (const feature of ["x", "y"]) {
      for (let i = 1; i <= 9; i++) {
        const threshold = i
        const leftData = data.filter(d => d[feature as keyof DataPoint] as number < threshold)
        const rightData = data.filter(d => d[feature as keyof DataPoint] as number >= threshold)
        
        if (leftData.length > 0 && rightData.length > 0) {
          // Simple information gain calculation (deterministic)
          const gain = Math.abs(leftData.length - rightData.length) / data.length
          if (gain > bestSplit.gain) {
            bestSplit = { feature, threshold, gain }
          }
        }
      }
    }

    const leftData = data.filter(d => d[bestSplit.feature as keyof DataPoint] as number < bestSplit.threshold)
    const rightData = data.filter(d => d[bestSplit.feature as keyof DataPoint] as number >= bestSplit.threshold)

    if (leftData.length === 0 || rightData.length === 0) {
      const labels = data.map(d => d.label || 0)
      const labelCounts = labels.reduce((acc, label) => {
        acc[label] = (acc[label] || 0) + 1
        return acc
      }, {} as Record<number, number>)
      const prediction = parseInt(Object.keys(labelCounts).reduce((a, b) => 
        labelCounts[parseInt(a)] > labelCounts[parseInt(b)] ? a : b
      , "0"))
      
      return {
        id: `leaf-${depth}-${data.length}`,
        feature: "leaf",
        threshold: 0,
        prediction,
        samples: data.length,
        depth,
      }
    }

    return {
      id: `node-${depth}-${bestSplit.feature}-${bestSplit.threshold}`,
      feature: bestSplit.feature,
      threshold: bestSplit.threshold,
      left: buildDecisionTree(leftData, depth + 1, maxDepth),
      right: buildDecisionTree(rightData, depth + 1, maxDepth),
      samples: data.length,
      depth,
    }
  }, [])

  // Enhanced algorithm simulation
  const runAlgorithmStep = useCallback(() => {
    if (!isRunning || iterations >= maxIterations) return

    switch (selectedAlgorithm) {
      case "linear":
        if (dataPoints.length > 0) {
          const { slope, intercept } = linearRegression
          let slopeGradient = 0
          let interceptGradient = 0
          let totalCost = 0

          dataPoints.forEach(point => {
            const predicted = slope * point.x + intercept
            const error = predicted - point.y
            slopeGradient += error * point.x
            interceptGradient += error
            totalCost += error * error
          })

          const n = dataPoints.length
          slopeGradient = (2 / n) * slopeGradient
          interceptGradient = (2 / n) * interceptGradient
          totalCost = totalCost / n

          setLinearRegression(prev => ({
            slope: slope - learningRate * slopeGradient,
            intercept: intercept - learningRate * interceptGradient,
            cost: totalCost,
            iteration: iterations + 1,
            previousCost: prev.cost,
          }))
        }
        break

      case "backprop":
        // Enhanced backpropagation simulation
        const networkLayers = [2, 4, 4, 1]
        const newSteps: BackpropStep[] = []

        // Use deterministic values based on iteration count
        const iterationSeed = iterations + 1

        // Forward pass with realistic activations
        networkLayers.forEach((layerSize, layerIndex) => {
          const values = Array(layerSize).fill(0).map((_, idx) => {
            if (layerIndex === 0) {
              return 0.1 + (Math.sin(iterationSeed + idx) + 1) * 0.4 // Input layer
            } else {
              return Math.max(0, (Math.sin(iterationSeed + idx + layerIndex) + 1) * 0.5 - 0.3) // ReLU-like activation
            }
          })
          
          newSteps.push({
            layer: layerIndex,
            type: "forward",
            values,
            weights: layerIndex < networkLayers.length - 1 ? 
              Array(layerSize).fill(0).map((_, i) => 
                Array(networkLayers[layerIndex + 1]).fill(0).map((_, j) => 
                  Math.sin(i + j + layerIndex) * 0.25
                )
              ) : undefined
          })
        })

        // Backward pass with gradients
        for (let i = networkLayers.length - 1; i >= 0; i--) {
          const gradients = Array(networkLayers[i]).fill(0).map((_, idx) => 
            Math.sin(iterationSeed + idx + i) * 0.1
          )
          
          const existingStep = newSteps.find(s => s.layer === i && s.type === "forward")
          newSteps.push({
            layer: i,
            type: "backward",
            values: existingStep?.values || [],
            gradients,
          })
        }

        setBackpropSteps(newSteps)
        setCurrentBackpropStep((currentBackpropStep + 1) % (networkLayers.length * 2))
        break

      case "forest":
        if (dataPoints.length > 0) {
          const tree = buildDecisionTree(dataPoints)
          setDecisionTree(tree)
        }
        break

      case "cnn":
        // Update CNN with current drawing
        updateCNNLayers(drawingData)
        break
    }

    setIterations(prev => prev + 1)
  }, [isRunning, iterations, maxIterations, selectedAlgorithm, dataPoints, linearRegression, learningRate, buildDecisionTree, currentBackpropStep, drawingData])

  // CNN processing function
  const updateCNNLayers = (inputData: number[][]) => {
    // Simulate convolution and pooling operations for visualization
    const conv1Activation = Array(26).fill(0).map((_, i) =>
      Array(26).fill(0).map((_, j) => {
        let sum = 0
        for (let ki = 0; ki < 3; ki++) {
          for (let kj = 0; kj < 3; kj++) {
            if (i + ki < 28 && j + kj < 28) {
              sum += inputData[i + ki][j + kj] * (Math.sin(i + j + ki + kj) * 0.5) // Deterministic filter
            }
          }
        }
        return Math.max(0, sum) // ReLU activation
      })
    )

    const poolActivation = Array(13).fill(0).map((_, i) =>
      Array(13).fill(0).map((_, j) => {
        let max = 0
        for (let ki = 0; ki < 2; ki++) {
          for (let kj = 0; kj < 2; kj++) {
            max = Math.max(max, conv1Activation[i * 2 + ki][j * 2 + kj] || 0)
          }
        }
        return max
      })
    )

    // Use the new recognition logic
    const normalizedPredictions = recognizeDigit(inputData)

    setCnnLayers([
      {
        id: "input",
        type: "conv",
        name: "Input (28×28)",
        inputShape: [28, 28, 1],
        outputShape: [28, 28, 1],
        activation: inputData,
      },
      {
        id: "conv1",
        type: "conv",
        name: "Conv2D (32 filters)",
        inputShape: [28, 28, 1],
        outputShape: [26, 26, 32],
        filters: 32,
        kernelSize: 3,
        activation: conv1Activation,
      },
      {
        id: "pool1",
        type: "pool",
        name: "MaxPool2D",
        inputShape: [26, 26, 32],
        outputShape: [13, 13, 32],
        activation: poolActivation,
      },
      {
        id: "fc",
        type: "fc",
        name: "Dense (10 classes)",
        inputShape: [13 * 13 * 32],
        outputShape: [10],
        activation: [normalizedPredictions],
      },
    ])
  }

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    draw(e)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * 28)
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * 28)

    if (x >= 0 && x < 28 && y >= 0 && y < 28) {
      const newData = drawingData.map(row => [...row])
      
      // Draw with a larger, smoother brush effect
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && nx < 28 && ny >= 0 && ny < 28) {
            const distance = Math.sqrt(dx * dx + dy * dy)
            if(distance < 2.2) {
              const intensity = 1 - (distance / 2.2)
              newData[ny][nx] = Math.min(1, (newData[ny][nx] || 0) + intensity * 0.8)
            }
          }
        }
      }
      
      setDrawingData(newData)
      updateCNNLayers(newData)
      drawCanvas(newData)
    }
  }

  const drawCanvas = (data: number[][]) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const pixelSize = canvas.width / 28
    
    data.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value > 0) {
          const intensity = Math.floor(255 * value)
          ctx.fillStyle = `rgb(${intensity}, ${intensity}, ${intensity})`
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize)
        }
      })
    })
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const emptyData = Array(28).fill(0).map(() => Array(28).fill(0))
    setDrawingData(emptyData)
    updateCNNLayers(emptyData)
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
  }

  // Main simulation loop
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isRunning && isClient) {
      interval = setInterval(runAlgorithmStep, selectedAlgorithm === "backprop" ? 300 : 200)
    }

    return () => clearInterval(interval)
  }, [isRunning, runAlgorithmStep, selectedAlgorithm, isClient])

  // Initialize data when algorithm changes (only on client side)
  useEffect(() => {
    if (isClient) {
      generateData()
      setIterations(0)
      setCurrentBackpropStep(0)
      resetSeed()
      setLinearRegression({
        slope: seededRandom() - 0.5,
        intercept: seededRandom() - 0.5,
        cost: 0,
        iteration: 0,
        previousCost: 0,
      })
      clearCanvas()
    }
  }, [selectedAlgorithm, generateData, isClient])

  // Stop when max iterations reached
  useEffect(() => {
    if (iterations >= maxIterations) {
      setIsRunning(false)
    }
  }, [iterations, maxIterations])

  // Initialize canvas
  useEffect(() => {
    if (selectedAlgorithm === "cnn" && canvasRef.current && isClient) {
      drawCanvas(drawingData)
    }
  }, [selectedAlgorithm, drawingData, isClient])

  const toggleSimulation = () => {
    setIsRunning(!isRunning)
  }

  const resetSimulation = () => {
    setIsRunning(false)
    setIterations(0)
    setCurrentBackpropStep(0)
    generateData()
    resetSeed()
    setLinearRegression({
      slope: seededRandom() - 0.5,
      intercept: seededRandom() - 0.5,
      cost: 0,
      iteration: 0,
      previousCost: 0,
    })
    setBackpropSteps([])
    setDecisionTree(null)
    clearCanvas()
  }

  // Color schemes for different classes
  const getClassColor = (label: number) => {
    const colors = [
      "hsl(220, 70%, 60%)", // Blue
      "hsl(10, 80%, 60%)",  // Red
      "hsl(120, 70%, 50%)", // Green
    ]
    return colors[label] || colors[0]
  }

  // Show loading state on server side or until client hydrated
  if (!isClient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading ML Visualizations...</p>
        </div>
      </div>
    )
  }

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
              <h1 className="text-xl font-semibold">ML Algorithm Visualizations</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={isRunning ? "default" : "secondary"}>
              {isRunning ? "Running" : "Paused"}
            </Badge>
            <Badge variant="outline">
              {iterations}/{maxIterations}
            </Badge>
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
                  Algorithm Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button 
                    onClick={toggleSimulation} 
                    className="flex-1" 
                    disabled={iterations >= maxIterations}
                  >
                    {isRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    {isRunning ? "Pause" : "Start"}
                  </Button>
                  <Button onClick={resetSimulation} variant="outline">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>


                <div className="space-y-2">
                  <label className="text-sm font-medium">Learning Rate: {learningRate}</label>
                  <Slider
                    value={[learningRate]}
                    onValueChange={(value) => setLearningRate(value[0])}
                    min={0.001}
                    max={0.1}
                    step={0.001}
                    disabled={isRunning}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Iterations: {maxIterations}</label>
                  <Slider
                    value={[maxIterations]}
                    onValueChange={(value) => setMaxIterations(value[0])}
                    min={10}
                    max={500}
                    step={10}
                    disabled={isRunning}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Metrics Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedAlgorithm === "linear" && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Slope (m)</span>
                      <span className="font-mono">{linearRegression.slope.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Intercept (b)</span>
                      <span className="font-mono">{linearRegression.intercept.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cost (MSE)</span>
                      <span className="font-mono">{linearRegression.cost.toFixed(4)}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Convergence</span>
                        <span className="font-mono">
                          {((1 - Math.min(linearRegression.cost / 10, 1)) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={(1 - Math.min(linearRegression.cost / 10, 1)) * 100} 
                        className="h-2" 
                      />
                    </div>
                  </>
                )}

                {selectedAlgorithm === "backprop" && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Current Step</span>
                      <span className="font-mono">{currentBackpropStep + 1}/8</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Phase</span>
                      <span className="font-mono">
                        {currentBackpropStep < 4 ? "Forward" : "Backward"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Network</span>
                      <span className="font-mono">2-4-4-1</span>
                    </div>
                  </>
                )}

                {selectedAlgorithm === "forest" && decisionTree && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Max Depth</span>
                      <span className="font-mono">3</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Samples</span>
                      <span className="font-mono">{decisionTree.samples}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Classes</span>
                      <span className="font-mono">3</span>
                    </div>
                  </>
                )}

                {selectedAlgorithm === "cnn" && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Layers</span>
                      <span className="font-mono">{cnnLayers.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Input Size</span>
                      <span className="font-mono">28×28</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Classes</span>
                      <span className="font-mono">10</span>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-mono">{((iterations / maxIterations) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(iterations / maxIterations) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Visualization Area */}
          <div className="lg:col-span-3">
            <Tabs 
                value={selectedAlgorithm} 
                onValueChange={(value: unknown) => !isRunning && setSelectedAlgorithm(value as "linear" | "backprop" | "forest" | "cnn")} 
                className="w-full mb-4"
              >
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="linear" disabled={isRunning}>Linear Regression</TabsTrigger>
                  <TabsTrigger value="backprop" disabled={isRunning}>Backpropagation</TabsTrigger>
                  <TabsTrigger value="forest" disabled={isRunning}>Decision Tree</TabsTrigger>
                  <TabsTrigger value="cnn" disabled={isRunning}>CNN</TabsTrigger>
                </TabsList>
              </Tabs>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {selectedAlgorithm === "linear" && (
                    <>
                      <TrendingUp className="h-5 w-5" />
                      Linear Regression - Gradient Descent
                    </>
                  )}
                  {selectedAlgorithm === "backprop" && (
                    <>
                      <GitBranch className="h-5 w-5" />
                      Neural Network - Backpropagation
                    </>
                  )}
                  {selectedAlgorithm === "forest" && (
                    <>
                      <GitBranch className="h-5 w-5" />
                      Decision Tree Classification
                    </>
                  )}
                  {selectedAlgorithm === "cnn" && (
                    <>
                      <Layers className="h-5 w-5" />
                      Convolutional Neural Network
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedAlgorithm === "linear" &&
                    "Watch gradient descent optimize the line to minimize cost function"}
                  {selectedAlgorithm === "backprop" &&
                    "Animated forward and backward passes through neural network layers"}
                  {selectedAlgorithm === "forest" &&
                    "Interactive decision tree with colored class predictions"}
                  {selectedAlgorithm === "cnn" &&
                    "Draw digits and see real-time CNN feature extraction"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* LINEAR REGRESSION VISUALIZATION */}
                {selectedAlgorithm === "linear" && (
                  <div className="h-96 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 rounded-lg p-6">
                    <svg className="w-full h-full" viewBox="0 0 600 400">
                      {/* Enhanced grid */}
                      {Array.from({ length: 11 }, (_, i) => (
                        <g key={i}>
                          <line
                            x1={60}
                            y1={40 + i * 32}
                            x2={540}
                            y2={40 + i * 32}
                            stroke="currentColor"
                            strokeWidth={0.5}
                            opacity={0.2}
                            className="text-muted-foreground"
                          />
                          <line
                            x1={60 + i * 48}
                            y1={40}
                            x2={60 + i * 48}
                            y2={360}
                            stroke="currentColor"
                            strokeWidth={0.5}
                            opacity={0.2}
                            className="text-muted-foreground"
                          />
                        </g>
                      ))}

                      {/* Axes */}
                      <line x1={60} y1={40} x2={60} y2={360} stroke="currentColor" strokeWidth={2} className="text-foreground" />
                      <line x1={60} y1={360} x2={540} y2={360} stroke="currentColor" strokeWidth={2} className="text-foreground" />

                      {/* Axis labels */}
                      {Array.from({ length: 11 }, (_, i) => (
                        <g key={i}>
                          {i % 2 === 0 && (
                            <>
                              <text
                                x={50}
                                y={365 - i * 32}
                                className="text-xs fill-muted-foreground font-medium"
                                textAnchor="end"
                              >
                                {i}
                              </text>
                              <text
                                x={60 + i * 48}
                                y={380}
                                className="text-xs fill-muted-foreground font-medium"
                                textAnchor="middle"
                              >
                                {i}
                              </text>
                            </>
                          )}
                        </g>
                      ))}

                      {/* Data points with glow effect */}
                      {dataPoints.map((point, index) => (
                        <g key={index}>
                          <circle
                            cx={60 + point.x * 48}
                            cy={360 - point.y * 32}
                            r={8}
                            fill="hsl(220, 70%, 50%)"
                            opacity={0.1}
                            className="animate-pulse"
                          />
                          <circle
                            cx={60 + point.x * 48}
                            cy={360 - point.y * 32}
                            r={4}
                            fill="hsl(220, 70%, 50%)"
                            stroke="white"
                            strokeWidth={2}
                            className="drop-shadow-lg"
                          />
                        </g>
                      ))}

                      {/* Predicted points on regression line */}
                      {dataPoints.map((point, index) => {
                        const predictedY = linearRegression.slope * point.x + linearRegression.intercept
                        return (
                          <g key={`pred-${index}`}>
                            <line
                              x1={60 + point.x * 48}
                              y1={360 - point.y * 32}
                              x2={60 + point.x * 48}
                              y2={360 - predictedY * 32}
                              stroke="hsl(10, 70%, 50%)"
                              strokeWidth={1}
                              opacity={0.4}
                              strokeDasharray="2,2"
                            />
                            <circle
                              cx={60 + point.x * 48}
                              cy={360 - predictedY * 32}
                              r={2}
                              fill="hsl(10, 70%, 50%)"
                              opacity={0.6}
                            />
                          </g>
                        )
                      })}

                      {/* Regression line with animation */}
                      <line
                        x1={60}
                        y1={360 - linearRegression.intercept * 32}
                        x2={540}
                        y2={360 - (linearRegression.slope * 10 + linearRegression.intercept) * 32}
                        stroke="hsl(10, 80%, 50%)"
                        strokeWidth={3}
                        className="drop-shadow-lg"
                        style={{
                          filter: isRunning ? "drop-shadow(0 0 8px hsl(10, 80%, 50%))" : "none"
                        }}
                      />
                      
                      {/* Equation display */}
                      <text x={300} y={390} className="text-lg font-bold fill-foreground" textAnchor="middle">
                        y = {linearRegression.slope.toFixed(3)}x + {linearRegression.intercept.toFixed(3)}
                      </text>
                    </svg>
                  </div>
                )}

              {/* BACKPROPAGATION VISUALIZATION WITH METRICS */}
              {selectedAlgorithm === "backprop" && (
                <div className="space-y-4">
                  {/* Metrics Dashboard */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Loss Metric */}
                    <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 p-4 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-red-700 dark:text-red-300">Loss</p>
                          <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                            {(() => {
                              const step = backpropSteps.find(s => s.layer === 3 && s.type === "forward");
                              const output = step?.values[0] || 0;
                              const target = 0.8; // Example target
                              const loss = Math.pow(output - target, 2);
                              return loss.toFixed(4);
                            })()}
                          </p>
                        </div>
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">L</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="w-full bg-red-200 dark:bg-red-800 rounded-full h-2">
                          <div 
                            className="bg-red-600 dark:bg-red-400 h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min(100, (((() => {
                                const step = backpropSteps.find(s => s.layer === 3 && s.type === "forward");
                                const output = step?.values[0] || 0;
                                const target = 0.8;
                                return Math.pow(output - target, 2);
                              })()) * 100))}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Learning Rate Metric */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Learning Rate</p>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">0.001</p>
                        </div>
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">α</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                          <div className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full w-1/4"></div>
                        </div>
                      </div>
                    </div>

                    {/* Gradient Norm Metric */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Gradient Norm</p>
                          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                            {(() => {
                              let totalGradientSquared = 0;
                              backpropSteps.filter(s => s.type === "backward").forEach(step => {
                                step.gradients?.forEach(grad => {
                                  totalGradientSquared += grad * grad;
                                });
                              });
                              return Math.sqrt(totalGradientSquared).toFixed(4);
                            })()}
                          </p>
                        </div>
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">∇</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2">
                          <div 
                            className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min(100, (((() => {
                                let totalGradientSquared = 0;
                                backpropSteps.filter(s => s.type === "backward").forEach(step => {
                                  step.gradients?.forEach(grad => {
                                    totalGradientSquared += grad * grad;
                                  });
                                });
                                return Math.sqrt(totalGradientSquared);
                              })()) * 20))}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Weight Updates Metric */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-700 dark:text-green-300">Weight Updates</p>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                            {(() => {
                              const learningRate = 0.001;
                              let totalWeightUpdate = 0;
                              backpropSteps.filter(s => s.type === "backward").forEach(step => {
                                step.gradients?.forEach(grad => {
                                  totalWeightUpdate += Math.abs(learningRate * grad);
                                });
                              });
                              return totalWeightUpdate.toFixed(4);
                            })()}
                          </p>
                        </div>
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">Δw</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2">
                          <div 
                            className="bg-green-600 dark:bg-green-400 h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min(100, (((() => {
                                const learningRate = 0.001;
                                let totalWeightUpdate = 0;
                                backpropSteps.filter(s => s.type === "backward").forEach(step => {
                                  step.gradients?.forEach(grad => {
                                    totalWeightUpdate += Math.abs(learningRate * grad);
                                  });
                                });
                                return totalWeightUpdate;
                              })()) * 1000))}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Neural Network Visualization */}
                  <div className="h-96 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 rounded-lg p-6">
                    <svg className="w-full h-full" viewBox="0 0 800 300">
                      
                      {/* Network architecture */}
                      {[2, 4, 4, 1].map((layerSize, layerIndex) => (
                        <g key={layerIndex}>
                          {/* Layer background */}
                          <rect
                            x={(layerIndex + 1) * 150 - 30}
                            y={30}
                            width={60}
                            height={240}
                            fill="rgba(59, 130, 246, 0.05)" // softer layer highlight
                            rx={10}
                            stroke="hsl(220, 60%, 45%)"
                            strokeWidth={1}
                            strokeDasharray="5,5"
                            opacity={0.4}
                          />
                          
                          {/* Nodes */}
                          {Array.from({ length: layerSize }, (_, nodeIndex) => {
                            const x = (layerIndex + 1) * 150
                            const y = 60 + nodeIndex * (180 / Math.max(1, layerSize - 1))
                            const step = backpropSteps.find(s => s.layer === layerIndex && s.type === "forward")
                            const backStep = backpropSteps.find(s => s.layer === layerIndex && s.type === "backward")
                            const value = step?.values[nodeIndex] || 0
                            const gradient = backStep?.gradients?.[nodeIndex] || 0
                            
                            const isCurrentForward = currentBackpropStep === layerIndex
                            const isCurrentBackward = currentBackpropStep === (7 - layerIndex)

                            return (
                              <g key={nodeIndex}>
                                {/* Node glow effect for current step */}
                                {(isCurrentForward || isCurrentBackward) && isRunning && (
                                  <circle
                                    cx={x}
                                    cy={y}
                                    r={25}
                                    fill="none"
                                    stroke={isCurrentForward ? "hsl(190, 80%, 55%)" : "hsl(25, 85%, 55%)"} // cyan vs orange
                                    strokeWidth={3}
                                    opacity={0.7}
                                    className="animate-pulse"
                                  />
                                )}

                                {/* Main node */}
                                <circle
                                  cx={x}
                                  cy={y}
                                  r={18}
                                  fill={
                                    isCurrentForward 
                                      ? "hsla(30, 91%, 45%, 1.00)"   // forward → orange
                                      : isCurrentBackward 
                                        ? "hsla(109, 76%, 50%, 1.00)"  // backward → green
                                        : "hsla(207, 6%, 62%, 1.00)" // default soft blue-gray
                                  }
                                  stroke="hsl(220, 40%, 40%)" // dark navy stroke
                                  strokeWidth={2}
                                  className="drop-shadow-md"
                                />

                                {/* Activation value */}
                                <text
                                  x={x}
                                  y={y + 3}
                                  textAnchor="middle"
                                  className="text-xs font-mono font-bold fill-gray-900 dark:fill-white"
                                >
                                  {value.toFixed(2)}
                                </text>
                                
                                {/* Gradient display during backward pass */}
                                {isCurrentBackward && gradient !== 0 && (
                                  <text
                                    x={x}
                                    y={y - 25}
                                    textAnchor="middle"
                                    className="text-xs font-mono font-bold fill-red-600 dark:fill-red-400"
                                  >
                                    ∇{gradient.toFixed(3)}
                                  </text>
                                )}

                                {/* Weight update indicator */}
                                {isCurrentBackward && gradient !== 0 && (
                                  <text
                                    x={x + 35}
                                    y={y + 3}
                                    textAnchor="start"
                                    className="text-xs font-mono font-bold fill-green-600 dark:fill-green-400"
                                  >
                                    Δw:{(0.001 * gradient).toFixed(4)}
                                  </text>
                                )}
                              </g>
                            )
                          })}

                          {/* Layer labels */}
                          <text
                            x={(layerIndex + 1) * 150}
                            y={20}
                            textAnchor="middle"
                            className="text-sm font-semibold fill-gray-900 dark:fill-white"
                          >
                            {layerIndex === 0 ? "Input" : layerIndex === 3 ? "Output" : `Hidden ${layerIndex}`}
                          </text>
                        </g>
                      ))}

                      {/* Connections with weight visualization */}
                      {[2, 4, 4, 1].slice(0, -1).map((layerSize, layerIndex) => (
                        <g key={`connections-${layerIndex}`}>
                          {Array.from({ length: layerSize }, (_, fromNode) =>
                            Array.from({ length: [2, 4, 4, 1][layerIndex + 1] }, (_, toNode) => {
                              const fromX = (layerIndex + 1) * 150
                              const fromY = 60 + fromNode * (180 / Math.max(1, layerSize - 1))
                              const toX = (layerIndex + 2) * 150
                              const toY = 60 + toNode * (180 / Math.max(1, [2, 4, 4, 1][layerIndex + 1] - 1))
                              
                              const isActive = isRunning && (
                                currentBackpropStep === layerIndex || 
                                currentBackpropStep === (7 - layerIndex - 1)
                              )

                              // Simulate weight value for visualization
                              const weight = Math.sin(fromNode + toNode + layerIndex) * 0.5

                              return (
                                <g key={`${fromNode}-${toNode}`}>
                                  <line
                                    x1={fromX + 18}
                                    y1={fromY}
                                    x2={toX - 18}
                                    y2={toY}
                                    stroke={isActive ? "hsl(220, 80%, 55%)" : (weight > 0 ? "hsl(120, 50%, 50%)" : "hsl(0, 50%, 50%)")}
                                    strokeWidth={isActive ? 3 : Math.abs(weight) * 2 + 1}
                                    opacity={isActive ? 0.9 : 0.5}
                                    className={isActive ? "animate-pulse" : ""}
                                  />
                                  
                                  {/* Weight value display during backward pass */}
                                  {isActive && currentBackpropStep > 3 && (
                                    <text
                                      x={(fromX + toX) / 2}
                                      y={(fromY + toY) / 2 - 8}
                                      textAnchor="middle"
                                      className="text-xs font-mono font-bold fill-blue-600 dark:fill-blue-400"
                                    >
                                      w:{weight.toFixed(2)}
                                    </text>
                                  )}
                                </g>
                              )
                            })
                          )}
                        </g>
                      ))}

                      {/* Algorithm phase indicator with enhanced metrics */}
                      <g transform="translate(50, 260)">
                        <rect
                          width={700}
                          height={30}
                          fill="hsl(220, 25%, 15%)"
                          stroke="hsl(220, 70%, 50%)"
                          strokeWidth={1}
                          rx={5}
                        />
                        <text x={20} y={20} className="text-sm font-semibold fill-white">
                          Step {currentBackpropStep + 1}/8: {
                            currentBackpropStep < 4 
                              ? `Forward Pass - Layer ${currentBackpropStep + 1}` 
                              : `Backward Pass - Layer ${8 - currentBackpropStep} (Computing Gradients)`
                          }
                        </text>
                        
                        {/* Progress indicator */}
                        <rect
                          x={350}
                          y={8}
                          width={300}
                          height={14}
                          fill="hsl(220, 10%, 30%)"
                          rx={7}
                        />
                        <rect
                          x={350}
                          y={8}
                          width={(currentBackpropStep + 1) * 300 / 8}
                          height={14}
                          fill="hsl(190, 80%, 55%)"
                          rx={7}
                          className="transition-all duration-300"
                        />
                      </g>
                    </svg>
                  </div>

                  {/* Additional Metrics Panel */}
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Training Metrics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Current Phase: </span>
                        <span className="font-mono text-blue-600 dark:text-blue-400">
                          {currentBackpropStep < 4 ? "Forward Propagation" : "Backward Propagation"}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Error Signal: </span>
                        <span className="font-mono text-red-600 dark:text-red-400">
                          {(() => {
                            const step = backpropSteps.find(s => s.layer === 3 && s.type === "forward");
                            const output = step?.values[0] || 0;
                            const target = 0.8;
                            return (output - target).toFixed(4);
                          })()}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Convergence: </span>
                        <span className="font-mono text-green-600 dark:text-green-400">
                          {(() => {
                            const step = backpropSteps.find(s => s.layer === 3 && s.type === "forward");
                            const output = step?.values[0] || 0;
                            const target = 0.8;
                            const loss = Math.pow(output - target, 2);
                            return loss < 0.01 ? "Good" : loss < 0.1 ? "Fair" : "Poor";
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

             

                {/* DECISION TREE VISUALIZATION */}
                {selectedAlgorithm === "forest" && (
                  <div className="h-96 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 h-full">
                      {/* Data visualization with colored classes */}
                      <div className="border-2 border-emerald-200 dark:border-emerald-800 rounded-lg p-4 bg-white/50 dark:bg-black/50">
                        <h4 className="text-sm font-semibold mb-3 text-center">Training Data (3 Classes)</h4>
                        <svg className="w-full h-full" viewBox="0 0 250 250">
                          {/* Grid */}
                          {Array.from({ length: 6 }, (_, i) => (
                            <g key={i}>
                              <line
                                x1={i * 50}
                                y1={0}
                                x2={i * 50}
                                y2={250}
                                stroke="currentColor"
                                strokeWidth={0.5}
                                opacity={0.2}
                                className="text-muted-foreground"
                              />
                              <line
                                x1={0}
                                y1={i * 50}
                                x2={250}
                                y2={i * 50}
                                stroke="currentColor"
                                strokeWidth={0.5}
                                opacity={0.2}
                                className="text-muted-foreground"
                              />
                            </g>
                          ))}

                          {/* Decision boundaries (simplified) */}
                          {decisionTree && (
                            <>
                              <line
                                x1={decisionTree.threshold * 25}
                                y1={0}
                                x2={decisionTree.threshold * 25}
                                y2={250}
                                stroke="hsl(280, 70%, 50%)"
                                strokeWidth={2}
                                strokeDasharray="5,5"
                                opacity={0.7}
                              />
                              <text
                                x={decisionTree.threshold * 25 + 5}
                                y={20}
                                className="text-xs font-bold fill-purple-600"
                              >
                                {decisionTree.feature} = {decisionTree.threshold}
                              </text>
                            </>
                          )}

                          {/* Data points with class colors */}
                          {dataPoints.map((point, index) => (
                            <circle
                              key={index}
                              cx={point.x * 25}
                              cy={250 - point.y * 25}
                              r={6}
                              fill={getClassColor(point.label || 0)}
                              stroke="white"
                              strokeWidth={2}
                              opacity={0.9}
                              className="drop-shadow-sm"
                            />
                          ))}

                          {/* Legend */}
                          <g transform="translate(1, 10)">
                            <rect
                              width={80}
                              height={45}
                              fill="rgba(127, 127, 127, 0.95)"
                              stroke="hsl(220, 70%, 50%)"
                              strokeWidth={1}
                              rx={4}
                            />
                            {[0, 1, 2].map((classLabel, idx) => (
                              <g key={classLabel} transform={`translate(0, ${idx * 12})`}>
                                <circle cx={15} cy={15} r={4} fill={getClassColor(classLabel)} />
                                <text x={25} y={18} className="text-xs fill-foreground font-medium">
                                  Class {classLabel}
                                </text>
                              </g>
                            ))}
                          </g>
                        </svg>
                      </div>

                      {/* Decision tree structure */}
                      <div className="border-2 border-emerald-200 dark:border-emerald-800 rounded-lg p-4 bg-white/50 dark:bg-black/50">
                        <h4 className="text-sm font-semibold mb-3 text-center">Decision Tree Structure</h4>
                        {decisionTree ? (
                          <div className="space-y-3 text-xs overflow-auto h-full">
                            {/* Root node */}
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-lg border-2 border-purple-300 dark:border-purple-700">
                              <div className="font-bold text-purple-700 dark:text-purple-300 mb-1">🌳 Root Node</div>
                              <div className="space-y-1">
                                <div>Split: <span className="font-mono font-bold">{decisionTree.feature} ≤ {decisionTree.threshold}</span></div>
                                <div>Samples: <span className="font-mono">{decisionTree.samples}</span></div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {/* Left branch */}
                              {decisionTree.left && (
                                <div className="flex-1 p-2 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-700">
                                  <div className="font-semibold text-blue-600 dark:text-blue-400 mb-1">← Left Branch</div>
                                  <div className="space-y-1">
                                    <div>Prediction: <span className="font-mono font-bold" style={{color: getClassColor(decisionTree.left.prediction || 0)}}>Class {decisionTree.left.prediction}</span></div>
                                    <div>Samples: <span className="font-mono">{decisionTree.left.samples}</span></div>
                                  </div>
                                </div>
                              )}

                              {/* Right branch */}
                              {decisionTree.right && (
                                <div className="flex-1 p-2 bg-red-50 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-700">
                                  <div className="font-semibold text-red-600 dark:text-red-400 mb-1">Right Branch →</div>
                                  <div className="space-y-1">
                                    <div>Prediction: <span className="font-mono font-bold" style={{color: getClassColor(decisionTree.right.prediction || 0)}}>Class {decisionTree.right.prediction}</span></div>
                                    <div>Samples: <span className="font-mono">{decisionTree.right.samples}</span></div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Algorithm info */}
                            <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                              <div className="font-medium mb-1">How it works:</div>
                              <div>• Finds best feature splits to separate classes</div>
                              <div>• Maximizes information gain at each node</div>
                              <div>• Creates decision boundaries for classification</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <div className="text-center">
                              <GitBranch className="h-8 w-8 mx-auto mb-2" />
                              <p>Start simulation to build tree</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* CNN VISUALIZATION */}
                {selectedAlgorithm === "cnn" && (
                  <div className="h-[450px] bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-900/20 dark:to-slate-900/20 rounded-lg p-4 grid grid-cols-3 gap-4">
                    {/* Drawing canvas and predictions */}
                    <div className="col-span-1 flex flex-col items-center gap-4">
                      <h4 className="text-sm font-semibold text-center">Draw a Digit (0-9)</h4>
                      <canvas
                        ref={canvasRef}
                        width={280}
                        height={280}
                        className="bg-black rounded-lg cursor-crosshair border-2 border-slate-300 dark:border-slate-700"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                      />
                      <Button onClick={clearCanvas} variant="outline" size="sm">
                        Clear Canvas
                      </Button>
                    </div>

                    {/* Layers visualization */}
                    <div className="col-span-2 flex flex-col gap-3">
                      <div className="flex-1 flex flex-col gap-2">
                        <h4 className="text-sm font-semibold">Network Layers</h4>
                        {cnnLayers.map(layer => (
                          <div key={layer.id} className="p-2 bg-white/50 dark:bg-black/20 rounded-md border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                            <div className="w-1/3 font-medium text-xs">{layer.name}</div>
                            <div className="w-1/3 text-xs text-muted-foreground">{layer.outputShape.join(' × ')}</div>
                            <div className="w-1/3">
                              <Progress value={layer.activation.flat().reduce((a, b) => a + b, 0)} className="h-2"/>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Predictions */}
                      <div className="flex-1 flex flex-col gap-2">
                        <h4 className="text-sm font-semibold">Predictions</h4>
                        <div className="p-3 bg-white/50 dark:bg-black/20 rounded-md border border-slate-200 dark:border-slate-800 space-y-2">
                          {cnnLayers.find(l => l.type === 'fc')?.activation[0]?.map((prob, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <span className="w-4 font-bold text-sm">{index}</span>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                                <div
                                  className="bg-blue-500 h-4 rounded-full text-right pr-2 text-white text-xs leading-4 transition-all duration-300"
                                  style={{ width: `${prob * 100}%` }}
                                >
                                  {(prob * 100) > 10 ? `${(prob * 100).toFixed(0)}%` : ''}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
  
}
export const dynamic = "force-static";
