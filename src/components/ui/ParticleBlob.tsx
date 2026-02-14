import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { GlowFilter } from "@pixi/filter-glow";
import clsx from "clsx";

type BlobProps = {
    x: number
    y: number
    rotation?: number
    scale?: number
    isSpeaking: boolean
}

// Smooth envelope for amplitude variation
function smoothEnvelope(x: number, seed: number): number {
    const scale = 200;
    const x0 = Math.floor(x / scale);
    const x1 = x0 + 1;

    const t = (x % scale) / scale;
    const smoothT = t * t * (3 - 2 * t);

    const r0 = Math.sin(x0 * 91.7 + seed) * 0.5 + 0.5;
    const r1 = Math.sin(x1 * 91.7 + seed) * 0.5 + 0.5;

    return r0 + (r1 - r0) * smoothT;
}

export default function ParticleBlob({
    x,
    y,
    rotation = 0,
    scale = 1,
    isSpeaking,
}: BlobProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const blobRef = useRef<HTMLDivElement | null>(null);

    // Track blob state
    const [blobState, setBlobState] = useState({
        x: x,
        y: y,
        rotation: rotation,
        scale: scale,
        vx: 0,
        vy: 0,
    });

    useEffect(() => {
        if (!containerRef.current) return;
        let destroyed = false;

        // --- PIXI Initialization ---
        const initPixi = async () => {
            if (!containerRef.current) return;
            const parent = containerRef.current;
            const { width, height } = parent.getBoundingClientRect();

            const app = new PIXI.Application();
            await app.init({
                width,
                height,
                backgroundAlpha: 0,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
            });

            if (destroyed) {
                app.destroy();
                return;
            }

            parent.appendChild(app.canvas);
            appRef.current = app;

            const waveConfig = {
                waveCount: 4,
                points: 1000,
                baseAmplitude: height * 0.08,
                variableAmplitude: height * 0.25,
                frequency: 1.5 * Math.PI / 140,
                pulseSpeed: 0.005,
                lineWidth: 0,
                color: 0xffffff,
                particlesPerWave: 300,
                neonColors: [
                    [0x00ffff, 0x0088ff, 0x00ff88],
                    [0xff00ff, 0xff8800, 0xff44ff],
                    [0xffff00, 0xffaa00, 0xffff88],
                    [0x00ff88, 0x00ffff, 0x44ffbb],
                ],
            };

            const centerY = height / 2;
            const seed = Math.random() * 1000;

            // --- Waves ---
            type WaveData = {
                wave: PIXI.Graphics;
                points: { current: number; target: number }[];
                phaseOffset: number;
                pulseSpeed: number;
                frequency: number;
            };
            const waves: WaveData[] = [];
            for (let w = 0; w < waveConfig.waveCount; w++) {
                const wave = new PIXI.Graphics();
                app.stage.addChild(wave);
                const phaseOffset = Math.random() * 2 * Math.PI;
                const pointsArr: { current: number; target: number }[] = [];
                for (let i = 0; i <= waveConfig.points; i++) {
                    const x = (i / waveConfig.points) * width;
                    const envelope = smoothEnvelope(x, seed + w * 10);
                    const amp = waveConfig.baseAmplitude + envelope * waveConfig.variableAmplitude * (0.5 + Math.random() * 0.5);
                    pointsArr.push({ current: amp, target: amp });
                }
                waves.push({
                    wave,
                    points: pointsArr,
                    phaseOffset,
                    pulseSpeed: waveConfig.pulseSpeed * (0.5 + Math.random()),
                    frequency: waveConfig.frequency * (0.8 + Math.random() * 0.4),
                });
            }

            // --- Particles ---
            type Particle = {
                sprite: PIXI.Graphics;
                baseX: number;
                followWave: boolean;
                waveIndex: number;
                vy: number;
                alphaSpeed: number;
                alphaBase: number;
            };
            const particles: Particle[] = [];
            for (let w = 0; w < waveConfig.waveCount; w++) {
                const waveData = waves[w];
                const colors = waveConfig.neonColors[w % waveConfig.neonColors.length];
                for (let i = 0; i < waveConfig.particlesPerWave; i++) {
                    const px = Math.random() * width;
                    const index = Math.floor((px / width) * waveConfig.points);
                    const waveY = centerY + Math.sin(px * waveData.frequency + waveData.phaseOffset) * waveData.points[index].current;
                    const py = centerY + Math.random() * (waveY - centerY);
                    const followWave = Math.random() < 0.6;

                    const sprite = new PIXI.Graphics();
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    const size = 0.1 + Math.random() * 1.2;
                    sprite.beginFill(color, 0.9);
                    sprite.drawCircle(0, 0, size);
                    sprite.endFill();
                    sprite.x = px;
                    sprite.y = py;
                    sprite.filters = [
                        new GlowFilter({ distance: 4, outerStrength: 1, innerStrength: 0, color, quality: 0.5 }) as unknown as PIXI.Filter,
                    ];
                    app.stage.addChild(sprite);

                    const vy = (Math.random() - 0.5) * 0.15;
                    const alphaSpeed = 0.005 + Math.random() * 0.01;
                    const alphaBase = 0.5 + Math.random() * 0.5;

                    particles.push({ sprite, baseX: px, followWave, waveIndex: w, vy, alphaSpeed, alphaBase });
                }
            }

            let frameCount = 0;
            app.ticker.add(() => {
                frameCount++;
                // Update waves
                waves.forEach(({ wave, points, phaseOffset, pulseSpeed, frequency }) => {
                    wave.clear();
                    wave.lineStyle(waveConfig.lineWidth, waveConfig.color, 1);
                    wave.moveTo(0, centerY);
                    for (let i = 0; i <= waveConfig.points; i++) {
                        const p = points[i];
                        p.current += (p.target - p.current) * pulseSpeed;
                        if (frameCount % 120 === 0) {
                            const x = (i / waveConfig.points) * width;
                            const envelope = smoothEnvelope(x, seed + frameCount + phaseOffset);
                            p.target = waveConfig.baseAmplitude + envelope * waveConfig.variableAmplitude * (0.5 + Math.random() * 0.5);
                        }
                        const x = (i / waveConfig.points) * width;
                        const y = centerY + Math.sin(x * frequency + phaseOffset) * p.current;
                        wave.lineTo(x, y);
                    }
                    // wave.stroke();
                });

                // Update particles
                particles.forEach((p) => {
                    const waveData = waves[p.waveIndex];
                    const wavePoints = waveData.points;
                    const freq = waveData.frequency;
                    const phase = waveData.phaseOffset;
                    const index = Math.floor((p.baseX / width) * waveConfig.points);
                    const waveY = centerY + Math.sin(p.baseX * freq + phase) * wavePoints[index].current;
                    const minY = Math.min(centerY, waveY);
                    const maxY = Math.max(centerY, waveY);

                    // vertical motion
                    p.sprite.y += p.vy;
                    if (p.sprite.y > maxY) {
                        p.sprite.y = maxY;
                        p.vy *= -1;
                    }
                    if (p.sprite.y < minY) {
                        p.sprite.y = minY;
                        p.vy *= -1;
                    }

                    // horizontal jitter
                    p.sprite.x = p.baseX + Math.sin(frameCount * 0.005 + p.sprite.y) * 0.5;

                    // alpha flicker
                    p.sprite.alpha = p.alphaBase + Math.sin(frameCount * 0.01 + p.baseX) * 0.3;
                });
            });
        };

        initPixi();


        // --- Blob movement with state tracking ---
        let frame = 0;
        const moveBlob = () => {
            frame++;
            if (!blobRef.current || !containerRef.current?.parentElement) {
                requestAnimationFrame(moveBlob);
                return;
            }

            const parent = containerRef.current.parentElement;
            const { width: pw, height: ph } = parent.getBoundingClientRect();
            const maxX = pw - 60;
            const maxY = ph - 60;

            // Position and rotation
            const x = (Math.sin(frame * 0.02) * 0.5 + 0.5) * maxX;
            const y = (Math.cos(frame * 0.015) * 0.5 + 0.5) * maxY;
            const rotation = Math.sin(frame * 0.01) * 0.5; // radians
            const scale = 0.8 + 0.2 * Math.sin(frame * 0.03);

            blobRef.current.style.left = `${x}px`;
            blobRef.current.style.top = `${y}px`;
            blobRef.current.style.transform = `rotate(${rotation}rad) scale(${scale})`;

            // Update state (you can send this to backend if needed)
            setBlobState({ x, y, rotation, scale, vx: x - blobState.x, vy: y - blobState.y });

            requestAnimationFrame(moveBlob);
        };

        // requestAnimationFrame(moveBlob);

        return () => {
            destroyed = true;
            if (appRef.current) {
                appRef.current.destroy(true, { children: true, texture: true });
                appRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!blobRef.current) return;

        let animationFrame: number;
        let destroyed = false;

        const parent = blobRef.current.parentElement!;
        const parentRect = parent.getBoundingClientRect();
        const blobRect = blobRef.current.getBoundingClientRect();

        const parentWidth = parentRect.width;
        const parentHeight = parentRect.height;

        const blobWidth = blobRect.width;
        const blobHeight = blobRect.height;

        // Safe movement area (prevents clipping)
        const maxX = parentWidth - blobWidth;
        const maxY = parentHeight - blobHeight;

        // 0–100 mapped to safe area
        const targetX = (x / 100) * maxX;
        const targetY = (y / 100) * maxY;

        const animate = () => {
            if (!blobRef.current || destroyed) return;

            const currentX = parseFloat(blobRef.current.style.left || "0");
            const currentY = parseFloat(blobRef.current.style.top || "0");

            const lerp = (a: number, b: number, t: number) =>
                a + (b - a) * t;

            const newX = lerp(currentX, targetX, 0.15);
            const newY = lerp(currentY, targetY, 0.15);

            blobRef.current.style.left = `${newX}px`;
            blobRef.current.style.top = `${newY}px`;

            animationFrame = requestAnimationFrame(animate);
        };

        animationFrame = requestAnimationFrame(animate);

        return () => {
            destroyed = true;
            cancelAnimationFrame(animationFrame);
        };
    }, [x, y]);

    return (
        <div
            ref={blobRef}
            className="absolute w-40 h-40"
            style={{ left: 0, top: 0 }}
        >
            {/* Neon glow background */}
            <div className="absolute inset-0 rounded-full animate-neon opacity-50 z-0" />

            {/* Ring / particles container */}
            <div
                className={clsx(
                    `relative z-10 w-full h-full pointer-events-none rounded-full ${isSpeaking ? "ring-speaking" : "ring-idle"}`
                )}
            >
                {/* PIXI Canvas */}
                <div ref={containerRef} className="w-full h-full" />
            </div>
        </div>
    );
}
