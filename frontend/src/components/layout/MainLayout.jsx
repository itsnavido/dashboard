import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function MainLayout({ children, onShortcutsClick }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
        onShortcutsClick={onShortcutsClick}
      />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="container mx-auto p-4 lg:p-6 animate-in fade-in duration-300">
          {children}
        </div>
      </main>
    </div>
  );
}

