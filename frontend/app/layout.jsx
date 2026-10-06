import './globals.css';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'Pharmacy ERP',
  description: 'Pharmacy Management System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 min-h-screen">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}