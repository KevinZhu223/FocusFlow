/**
 * FocusFlow - 3D Holographic Badge
 * Phase 4: Three.js card with tilt effect and shimmer
 */

import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, Text, Environment } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Holographic Card with Tilt
 */
function HoloCard({ color, icon, name, isHovered }) {
    const meshRef = useRef();
    const shimmerRef = useRef();

    useFrame((state) => {
        if (meshRef.current) {
            // Smooth rotation based on mouse
            const targetX = isHovered ? state.mouse.y * 0.3 : 0;
            const targetY = isHovered ? state.mouse.x * 0.3 : state.clock.elapsedTime * 0.5;

            meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetX, 0.1);
            meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetY, 0.1);
        }

        // Shimmer effect
        if (shimmerRef.current) {
            shimmerRef.current.position.x = Math.sin(state.clock.elapsedTime * 2) * 0.5;
        }
    });

    return (
        <group ref={meshRef}>
            {/* Main Card */}
            <RoundedBox args={[2, 2.4, 0.1]} radius={0.15} smoothness={4}>
                <meshPhysicalMaterial
                    color={color}
                    metalness={0.9}
                    roughness={0.1}
                    clearcoat={1}
                    clearcoatRoughness={0.1}
                    envMapIntensity={1}
                />
            </RoundedBox>

            {/* Holographic Shimmer Overlay */}
            <mesh ref={shimmerRef} position={[0, 0, 0.06]}>
                <planeGeometry args={[2, 2.4]} />
                <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.1}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            {/* Icon Circle */}
            <mesh position={[0, 0.3, 0.06]}>
                <circleGeometry args={[0.5, 32]} />
                <meshStandardMaterial color="#ffffff" metalness={0.5} roughness={0.3} />
            </mesh>

            {/* Badge Name */}
            <Text
                position={[0, -0.7, 0.06]}
                fontSize={0.2}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                font="/fonts/Inter-Bold.woff"
            >
                {name || 'Badge'}
            </Text>
        </group>
    );
}

/**
 * Badge3D Wrapper Component
 */
export default function Badge3D({
    name = 'Achievement',
    color = '#6366f1',
    icon = '⭐',
    size = 'md'
}) {
    const [isHovered, setIsHovered] = useState(false);

    const sizeClasses = {
        sm: 'w-20 h-24',
        md: 'w-28 h-32',
        lg: 'w-36 h-40'
    };

    return (
        <div
            className={`${sizeClasses[size]} cursor-pointer`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[5, 5, 5]} intensity={1} />
                <pointLight position={[-5, -5, 5]} intensity={0.5} color={color} />
                <HoloCard
                    color={color}
                    icon={icon}
                    name={name}
                    isHovered={isHovered}
                />
                <Environment preset="sunset" />
            </Canvas>
        </div>
    );
}
