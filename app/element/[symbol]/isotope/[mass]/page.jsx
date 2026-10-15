import CanvasStackLazy from '@/components/CanvasStackLazy';

export const metadata = {
  title: '3D Periodic Table',
};

export default function IsotopePage({ params }) {
  const mass = parseInt(params.mass, 10);
  return (
    <CanvasStackLazy
      initialTarget={{ symbol: params.symbol, mass: Number.isFinite(mass) ? mass : null }}
    />
  );
}
