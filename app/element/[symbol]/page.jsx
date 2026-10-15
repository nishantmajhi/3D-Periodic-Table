import CanvasStackLazy from '@/components/CanvasStackLazy';

export const metadata = {
  title: '3D Periodic Table',
};

export default function ElementPage({ params }) {
  return <CanvasStackLazy initialTarget={{ symbol: params.symbol }} />;
}
