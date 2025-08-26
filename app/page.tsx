import { Brain, Network, Cpu, Eye, Volume2, Zap, Settings, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold text-foreground">NeuralSim</h1>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/ann-simulation">
              <Button variant="ghost" className="text-sm font-medium">
                <Network className="h-4 w-4 mr-2" />
                Simulations
              </Button>
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Advanced Neural Network & Brain Function Simulations
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
            Explore the fascinating world of artificial and biological neural networks through interactive, real-time
            simulations designed for students and researchers in neuroscience and AI.
          </p>
        </section>

        {/* Simulation Categories */}
        <section className="mb-12">
          <h3 className="text-2xl font-semibold text-foreground mb-6">Simulation Categories</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* ANN Simulations */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Network className="h-8 w-8 text-primary" />
                  <Badge variant="secondary">Interactive</Badge>
                </div>
                <CardTitle className="text-foreground">Artificial Neural Networks</CardTitle>
                <CardDescription>
                  Explore ANN architectures, training processes, and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li>• Epoch progression visualization</li>
                  <li>• Hidden layer dynamics</li>
                  <li>• Activation function demos</li>
                  <li>• Performance metrics</li>
                </ul>
                <Link href="/ann-simulation">
                  <Button className="w-full">Launch ANN Simulator</Button>
                </Link>
              </CardContent>
            </Card>

            {/* BNN Simulations */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Brain className="h-8 w-8 text-primary" />
                  <Badge variant="secondary">Real-time</Badge>
                </div>
                <CardTitle className="text-foreground">Biological Neural Networks</CardTitle>
                <CardDescription>Simulate biological neurons and signal transmission patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li>• Electric signal spikes</li>
                  <li>• Neuron signal transmission</li>
                  <li>• Synaptic connections</li>
                  <li>• Dendrite interactions</li>
                </ul>
                <Link href="/bnn-simulation">
                  <Button className="w-full">Launch BNN Simulator</Button>
                </Link>
              </CardContent>
            </Card>


            {/* ML Algorithms */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Zap className="h-8 w-8 text-primary" />
                  <Badge variant="secondary">Algorithms</Badge>
                </div>
                <CardTitle className="text-foreground">ML Algorithm Visualizations</CardTitle>
                <CardDescription>Interactive visualizations of machine learning algorithms</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li>• Backpropagation</li>
                  <li>• Random Forest</li>
                  <li>• CNN architectures</li>
                  <li>• Linear regression</li>
                </ul>
                <Link href="/ml-algorithms">
                  <Button className="w-full">Launch ML Algorithms</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 Neural Network Simulator. Built for educational purposes.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
