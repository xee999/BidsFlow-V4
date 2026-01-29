
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { authService } from '../services/authService.ts';

interface LoginProps {
    onLoginSuccess: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Starry animation with antigravity float effect
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        interface Particle {
            x: number;
            y: number;
            size: number;
            speedY: number;
            oscillationSpeed: number;
            oscillationDistance: number;
            initialX: number;
            opacity: number;
            opacitySpeed: number;
        }

        let particles: Particle[] = [];
        let animationFrameId: number;

        const createParticle = (): Particle => {
            const x = Math.random() * canvas.width;
            return {
                x: x,
                y: Math.random() * canvas.height,
                initialX: x,
                size: Math.random() * 2 + 0.5, // Star size
                speedY: Math.random() * 0.3 + 0.1, // Slow upward float
                oscillationSpeed: Math.random() * 0.02 + 0.005,
                oscillationDistance: Math.random() * 20 + 5,
                opacity: Math.random() * 0.5 + 0.1,
                opacitySpeed: (Math.random() - 0.5) * 0.01
            };
        };

        const initParticles = () => {
            particles = [];
            // Calculate particle count based on screen size for consistent density
            const numberOfParticles = Math.floor((canvas.width * canvas.height) / 8000);
            for (let i = 0; i < numberOfParticles; i++) {
                particles.push(createParticle());
            }
        };

        const updateParticle = (particle: Particle) => {
            // Antigravity movement (upwards)
            particle.y -= particle.speedY;

            // Gentle horizontal oscillation
            particle.x = particle.initialX + Math.sin(particle.y * particle.oscillationSpeed) * particle.oscillationDistance;

            // Twinkle effect
            particle.opacity += particle.opacitySpeed;
            if (particle.opacity > 0.8 || particle.opacity < 0.1) {
                particle.opacitySpeed *= -1;
            }

            // Reset if out of view (top)
            if (particle.y < -10) {
                particle.y = canvas.height + 10;
                particle.initialX = Math.random() * canvas.width;
                particle.x = particle.initialX;
            }
        };

        const drawParticle = (particle: Particle) => {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, particle.opacity)})`;
            ctx.fill();
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(particle => {
                updateParticle(particle);
                drawParticle(particle);
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const data = await authService.login(email, password);
            onLoginSuccess(data.user);
        } catch (err: any) {
            setError(err.message || 'Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #2D5F7C 0%, #4a1942 50%, #b71c1c 100%)' }}>
            {/* Animated Canvas Background - Starry Sky with Antigravity Float */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* Login Card */}
            <div className="w-full max-w-md relative z-10">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                    <div className="p-10 md:p-12">
                        {/* Logo */}
                        <div className="text-center mb-10">
                            <h1 className="text-4xl font-black tracking-tight text-slate-900">
                                Bids<span className="text-[#D32F2F]">Flow</span>
                            </h1>
                            <p className="text-slate-400 text-sm font-medium mt-2">Enterprise Bid Management</p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Email Field */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] focus:bg-white outline-none transition-all text-slate-900 font-medium placeholder:text-slate-300"
                                    placeholder="you@company.com"
                                />
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] focus:bg-white outline-none transition-all text-slate-900 font-medium placeholder:text-slate-300"
                                    placeholder="••••••••"
                                />
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <p className="text-sm font-medium">{error}</p>
                                </div>
                            )}

                            {/* Submit Button with Brand Gradient */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={clsx(
                                    "w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] shadow-lg",
                                    isLoading
                                        ? "bg-slate-400 cursor-not-allowed"
                                        : "hover:shadow-xl hover:-translate-y-0.5"
                                )}
                                style={!isLoading ? { background: 'linear-gradient(90deg, #1E3A5F 0%, #D32F2F 100%)' } : {}}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        LOGIN
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-50 border-t border-slate-100 p-6 text-center">
                        <p className="text-sm font-black text-[#1E3A5F] uppercase tracking-widest">Jazz Business Studio</p>
                        <p className="text-xs text-slate-400 mt-1">© 2026 BidsFlow Enterprise AI</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

