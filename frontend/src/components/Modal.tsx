import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const backdrop: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalStyle: React.CSSProperties = {
  position: 'relative',
  background: '#fff',
  borderRadius: 8,
  width: '90%',
  maxWidth: 800,
  maxHeight: '80%',
  overflow: 'auto',
  padding: 24,
  boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modalStyle} onClick={(e)=>e.stopPropagation()}>
        {title && <h3 style={{ marginTop:0 }}>{title}</h3>}
        <button onClick={onClose} style={{ position:'absolute', right:16, top:16, background:'transparent', border:'none', fontSize:24, cursor:'pointer' }}>×</button>
        <div style={{ marginTop:16 }}>{children}</div>
      </div>
    </div>
  );
};

export default Modal; 