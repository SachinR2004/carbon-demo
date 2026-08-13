import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { Leaf, Map, TrendingUp } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex justify-between items-center p-6 bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="text-2xl font-bold text-primary flex items-center gap-2">
          <Leaf className="text-eco" />
          GoGreen
        </div>
        <div className="flex gap-4">
          <Link to="/login"><Button variant="ghost">Login</Button></Link>
          <Link to="/register"><Button variant="primary">Register</Button></Link>
        </div>
      </nav>
      
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 bg-gradient-to-b from-primary/5 to-sky/5">
        <h1 className="text-5xl md:text-6xl font-extrabold text-neutral-textMain mb-6">
          Carbon-Aware <span className="text-primary">Route Optimization</span>
        </h1>
        <p className="text-xl text-neutral-textMuted max-w-2xl mb-10">
          Empowering multi-vehicle fleets to reduce their carbon footprint through AI-driven, eco-friendly route predictions.
        </p>
        <div className="flex gap-4">
          <Link to="/register"><Button variant="primary" className="text-lg px-8 py-3">Get Started</Button></Link>
          <Link to="/about"><Button variant="outline" className="text-lg px-8 py-3">Learn More</Button></Link>
        </div>
      </main>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Map className="text-primary w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Smart Routing</h3>
            <p className="text-neutral-textMuted">Compare alternative routes to find the most fuel and carbon-efficient paths.</p>
          </Card>
          <Card className="text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-eco/10 flex items-center justify-center mb-4">
              <Leaf className="text-eco w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">AI Eco-Scores</h3>
            <p className="text-neutral-textMuted">Predictive models score every trip for its environmental impact.</p>
          </Card>
          <Card className="text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-sky/10 flex items-center justify-center mb-4">
              <TrendingUp className="text-sky w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Fleet Analytics</h3>
            <p className="text-neutral-textMuted">Monitor fleet sustainability and enforce carbon budgets dynamically.</p>
          </Card>
        </div>
      </section>
    </div>
  );
}
