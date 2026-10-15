import './globals.css';

export const metadata = {
  title: '3D Periodic Table',
  description: 'An interactive 3D periodic table — click any element to explore its isotopes.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
