import React from 'react';

const NOTES = [
  {
    icon: '📋',
    title: 'Supported Formats',
    desc: 'JPG / PNG / WebP, up to 10 MB per file',
  },
  {
    icon: '🔒',
    title: 'Privacy First',
    desc: 'Images are processed in-memory only. Nothing is uploaded to our servers.',
  },
  {
    icon: '💡',
    title: 'Three Ways to Upload',
    desc: 'Drag & drop, paste from clipboard, or click to browse',
  },
  {
    icon: '🎯',
    title: 'AI-Powered Precision',
    desc: 'Powered by remove.bg engine for clean, natural cutouts',
  },
];

const NotesCard: React.FC = () => (
  <div className="notes-card">
    {NOTES.map((note) => (
      <div key={note.title} className="notes-item">
        <span className="notes-item-icon">{note.icon}</span>
        <span>
          <strong>{note.title}</strong>
          {note.desc}
        </span>
      </div>
    ))}
  </div>
);

export default NotesCard;
