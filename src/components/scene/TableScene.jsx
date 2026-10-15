'use client';
import { useMemo } from 'react';
import { tableLayout, CATEGORY_COLORS } from '@/data/elements';
import Tile from './Tile';
import Pillar from './Pillar';
import CategoryKey from './CategoryKey';
import RevealSync from './RevealSync';

export default function TableScene() {
  const tiles = useMemo(() => tableLayout(), []);

  return (
    <>
      <fog attach="fog" args={[0x090c11, 18, 42]} />
      <RevealSync />

      {tiles.map((t) => (
        <group key={t.key}>
          <Tile el={t.el} isMarker={t.marker} position={t.position} />
          {t.pillarSymbols && (
            <Pillar
              originPosition={{ x: t.position[0], z: t.position[2] }}
              symbols={t.pillarSymbols}
              color={CATEGORY_COLORS[t.el.category]}
            />
          )}
        </group>
      ))}

      <CategoryKey />
    </>
  );
}
