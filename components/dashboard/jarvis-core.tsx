'use client';

import { useId } from 'react';
import type { JarvisStatus } from '@/lib/dashboard-types';

const statusLabels: Record<JarvisStatus, string> = {
  nicht_verbunden: 'NICHT VERBUNDEN',
  bereit: 'BEREIT',
  hoert_zu: 'HÖRT ZU',
  verarbeitet: 'VERARBEITET',
  spricht: 'SPRICHT',
  gestoppt: 'GESTOPPT',
  fehler: 'FEHLER',
};

const particles = Array.from({ length: 34 }, (_, index) => {
  const angle = (index / 34) * Math.PI * 2 + (index % 3) * 0.11;
  const radius = 104 + ((index * 17) % 49);
  return {
    cx: 180 + Math.cos(angle) * radius,
    cy: 180 + Math.sin(angle) * radius * 0.78,
    radius: 0.65 + (index % 4) * 0.35,
    delay: `${-(index % 9) * 0.41}s`,
  };
});

const spokes = Array.from({ length: 24 }, (_, index) => {
  const angle = (index / 24) * Math.PI * 2;
  const inner = 111 + (index % 3) * 3;
  const outer = 139 + (index % 4) * 5;
  return {
    x1: 180 + Math.cos(angle) * inner,
    y1: 180 + Math.sin(angle) * inner,
    x2: 180 + Math.cos(angle) * outer,
    y2: 180 + Math.sin(angle) * outer,
  };
});

const fragments = [
  'M105 137l14-8 11 5 14-13 18 4 11-12',
  'M91 158l21 3 9-9 17 5 13-12 18 4',
  'M94 184l18-7 16 8 14-10 20 5 15-12',
  'M102 211l17-10 12 7 18-13 16 7 13-8',
  'M119 235l12-14 18 5 12-12 18 4',
  'M187 116l15 9 13-6 12 13 17-3 13 12',
  'M199 145l17-7 11 12 17-3 12 13 14-2',
  'M195 177l18 8 13-10 14 10 20-5',
  'M197 209l16-7 11 11 18-5 13 12',
  'M188 238l15-14 14 5 13-10 14 4',
] as const;

export function JarvisCore({ status }: { status: JarvisStatus }) {
  const prefix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (name: string) => `${prefix}-${name}`;
  const label = statusLabels[status];

  return (
    <div className={`jarvis-hud is-${status}`}>
      <div className="hud-glow" aria-hidden="true" />
      <div className="hud-energy-haze" aria-hidden="true" />
      <div className="hud-floor-glow" aria-hidden="true" />
      <svg
        className="hud-reactor"
        viewBox="0 0 360 360"
        aria-labelledby={id('title')}
      >
        <title id={id('title')}>{`JARVIS Energiekern: ${label}`}</title>
        <defs>
          <radialGradient id={id('field')} cx="47%" cy="43%" r="58%">
            <stop offset="0" stopColor="#eaffff" stopOpacity=".94" />
            <stop offset=".08" stopColor="#88f7ff" stopOpacity=".82" />
            <stop offset=".27" stopColor="#13d7f4" stopOpacity=".48" />
            <stop offset=".55" stopColor="#087cac" stopOpacity=".2" />
            <stop offset=".82" stopColor="#05243d" stopOpacity=".36" />
            <stop offset="1" stopColor="#010712" stopOpacity=".94" />
          </radialGradient>
          <radialGradient id={id('core')} cx="42%" cy="36%" r="64%">
            <stop offset="0" stopColor="#fff" />
            <stop offset=".18" stopColor="#bafcff" />
            <stop offset=".48" stopColor="#35e6ff" stopOpacity=".9" />
            <stop offset="1" stopColor="#0477ba" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id('sheen')} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#f3ffff" stopOpacity=".8" />
            <stop offset=".3" stopColor="#62eeff" stopOpacity=".18" />
            <stop offset=".68" stopColor="#627dff" stopOpacity=".05" />
            <stop offset="1" stopColor="#051526" stopOpacity="0" />
          </linearGradient>
          <clipPath id={id('sphere-clip')}>
            <circle cx="180" cy="180" r="91" />
          </clipPath>
          <filter
            id={id('glow')}
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter
            id={id('core-glow')}
            x="-160%"
            y="-160%"
            width="420%"
            height="420%"
          >
            <feGaussianBlur stdDeviation="10" result="wide" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="near" />
            <feMerge>
              <feMergeNode in="wide" />
              <feMergeNode in="near" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter
            id={id('plasma')}
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency=".025 .052"
              numOctaves="3"
              seed="8"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="17"
              xChannelSelector="R"
              yChannelSelector="B"
            />
            <feGaussianBlur stdDeviation=".45" />
          </filter>
        </defs>

        <circle className="hud-field" cx="180" cy="180" r="168" />
        <g className="hud-outer-halo">
          <circle cx="180" cy="180" r="158" pathLength="100" />
          <circle cx="180" cy="180" r="151" pathLength="100" />
        </g>
        <g className="hud-ring hud-ring-outer">
          <circle cx="180" cy="180" r="145" pathLength="100" />
          <circle cx="180" cy="180" r="137" pathLength="100" />
          {spokes.map((spoke, index) => (
            <line {...spoke} key={index} />
          ))}
        </g>
        <g className="hud-ring hud-ring-data">
          <circle cx="180" cy="180" r="128" pathLength="100" />
          <circle cx="180" cy="180" r="120" pathLength="100" />
          {particles.map((particle, index) => (
            <circle
              className={`hud-data-point point-${index % 4}`}
              cx={particle.cx}
              cy={particle.cy}
              r={particle.radius}
              style={{ animationDelay: particle.delay }}
              key={index}
            />
          ))}
        </g>
        <g className="hud-orbit-plane hud-orbit-plane-one">
          <ellipse cx="180" cy="180" rx="129" ry="47" pathLength="100" />
          <circle className="hud-orbit-node" cx="51" cy="180" r="3.2" />
          <circle
            className="hud-orbit-node secondary"
            cx="309"
            cy="180"
            r="1.8"
          />
        </g>
        <g className="hud-orbit-plane hud-orbit-plane-two">
          <ellipse cx="180" cy="180" rx="124" ry="39" pathLength="100" />
          <circle className="hud-orbit-node" cx="304" cy="180" r="2.5" />
        </g>
        <g className="hud-orbit-plane hud-orbit-plane-three">
          <ellipse cx="180" cy="180" rx="112" ry="28" pathLength="100" />
          <circle
            className="hud-orbit-node secondary"
            cx="68"
            cy="180"
            r="2.2"
          />
        </g>
        <g className="hud-corona" filter={`url(#${id('glow')})`}>
          <circle cx="180" cy="180" r="108" pathLength="100" />
          <circle cx="180" cy="180" r="101" pathLength="100" />
          <path d="M180 66v13m0 202v13M66 180h13m202 0h13M99 99l9 9m144 144 9 9M261 99l-9 9M108 252l-9 9" />
        </g>

        <g className="hud-sphere">
          <circle
            className="hud-sphere-shell"
            cx="180"
            cy="180"
            r="91"
            fill={`url(#${id('field')})`}
          />
          <g clipPath={`url(#${id('sphere-clip')})`}>
            <g className="hud-back-grid">
              <ellipse cx="180" cy="180" rx="86" ry="25" />
              <ellipse cx="180" cy="180" rx="86" ry="53" />
              <ellipse cx="180" cy="180" rx="29" ry="88" />
              <ellipse cx="180" cy="180" rx="59" ry="88" />
            </g>
            <g className="hud-plasma-field" filter={`url(#${id('plasma')})`}>
              <circle
                className="hud-plasma hud-plasma-main"
                cx="180"
                cy="180"
                r="76"
                fill={`url(#${id('core')})`}
              />
              <ellipse
                className="hud-plasma-cloud cloud-one"
                cx="148"
                cy="153"
                rx="45"
                ry="72"
              />
              <ellipse
                className="hud-plasma-cloud cloud-two"
                cx="213"
                cy="197"
                rx="55"
                ry="37"
              />
            </g>
            <g className="hud-fragment-cloud">
              {fragments.map((path) => (
                <path d={path} key={path} />
              ))}
              {particles.slice(0, 20).map((particle, index) => (
                <circle
                  cx={128 + ((index * 31) % 105)}
                  cy={119 + ((index * 47) % 122)}
                  r={0.8 + (index % 3) * 0.45}
                  key={index}
                />
              ))}
            </g>
            <g className="hud-globe-grid">
              <ellipse cx="180" cy="180" rx="87" ry="28" />
              <ellipse cx="180" cy="180" rx="87" ry="58" />
              <ellipse cx="180" cy="180" rx="32" ry="89" />
              <ellipse cx="180" cy="180" rx="62" ry="89" />
              <path d="M96 158c46 13 122 13 168 0M96 202c46-13 122-13 168 0" />
            </g>
            <g className="hud-energy-threads" filter={`url(#${id('glow')})`}>
              <path d="M96 194c24-6 34-47 61-45 31 3 27 53 63 53 22 0 35-14 47-32" />
              <path d="M116 126c23 25 44 27 65 11 25-18 49 5 60 31 7 17 7 38-2 57" />
              <path d="M109 217c31-35 54-18 73 2 22 24 48 17 69-13" />
            </g>
            <path
              className="hud-sphere-highlight"
              d="M109 174c8-44 39-76 82-83 21-3 41 2 56 13-58-7-94 22-113 76-6 17-8 32-6 48-17-14-24-33-19-54z"
              fill={`url(#${id('sheen')})`}
            />
            <path className="hud-scan-line" d="M91 180h178" />
          </g>
          <circle
            className="hud-sphere-rim"
            cx="180"
            cy="180"
            r="91"
            pathLength="100"
          />
          <ellipse
            className="hud-sphere-equator"
            cx="180"
            cy="180"
            rx="99"
            ry="31"
            pathLength="100"
          />
        </g>
        <g className="hud-energy-core" filter={`url(#${id('core-glow')})`}>
          <circle cx="180" cy="180" r="34" fill={`url(#${id('core')})`} />
          <circle className="hud-energy-core-inner" cx="180" cy="180" r="9" />
        </g>
        <g className="hud-core-arcs" filter={`url(#${id('glow')})`}>
          <circle cx="180" cy="180" r="40" pathLength="100" />
          <circle cx="180" cy="180" r="48" pathLength="100" />
        </g>
        <g className="hud-ring hud-ring-inner" filter={`url(#${id('glow')})`}>
          <circle cx="180" cy="180" r="56" pathLength="100" />
          <path d="M180 117l7 10-7 8-7-8zM243 180l-10 7-8-7 8-7zM180 243l-7-10 7-8 7 8zM117 180l10-7 8 7-8 7z" />
        </g>
        <g className="hud-core-label">
          <path d="M120 153h120l7 7v42l-7 7H120l-7-7v-42z" />
          <text className="hud-wordmark" x="180" y="177" textAnchor="middle">
            J.A.R.V.I.S
          </text>
          <text className="hud-submark" x="180" y="193" textAnchor="middle">
            DEIN ASSISTENT
          </text>
        </g>
      </svg>
      <div className="hud-status" aria-live="polite">
        <span />
        {label}
      </div>
    </div>
  );
}
