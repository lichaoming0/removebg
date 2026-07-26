import React from 'react';

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = 'Image Background Remover' }) => (
  <header className="header">
    <span className="header-logo">🎨</span>
    <h1 className="header-title">{title}</h1>
  </header>
);

export default Header;
